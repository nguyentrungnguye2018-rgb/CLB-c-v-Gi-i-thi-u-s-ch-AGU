import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';
import { SAMPLE_USERS, INITIAL_TERM_HISTORY, INITIAL_RECRUITMENT_QUESTIONS, S5T_CRITERIA_LIST } from './src/data/mockData';
import {
  approveUserIntoDepartment,
  rejectUserDepartmentRequest,
  appointSubDepartmentLeaders,
  assignSingleMemberSubDeptRole,
  appointClubTermLeaders
} from './src/utils/governance';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const FS_COLLECTION = 'club_database';

// 1. Khởi tạo Firebase Admin SDK kết nối Firestore
let firestore: FirebaseFirestore.Firestore | null = null;
try {
  if (!admin.apps.length) {
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountEnv) {
      const serviceAccount = JSON.parse(serviceAccountEnv);
      if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('[Firebase] Admin SDK initialized successfully with Service Account.');
    } else {
      admin.initializeApp();
      console.log('[Firebase] Admin SDK initialized with default credentials.');
    }
  }
  firestore = admin.firestore();
} catch (fbErr) {
  console.error('[Firebase] Failed to initialize Firebase Admin:', fbErr);
}

// Cấu trúc cơ sở dữ liệu CLB
interface ClubDatabase {
  userList: any[];
  posts: any[];
  locketMoments: any[];
  criteria: any[];
  proofs: any[];
  reports: any[];
  transactions: any[];
  plans: any[];
  tasks: any[];
  decrees: any[];
  questions: any[];
  applications: any[];
  hallOfFame: any[];
  memberEvaluations: any[];
  termHistory: any[];
  emergencyNotices: any[];
  annualTheme?: any;
  deletedUserIds?: string[];
  deletedItemIds?: string[];
  cleanLaunchVersion?: number;
  lastUpdated: number;
}

const LEGACY_MOCK_USER_IDS = [
  'bcn-lead-1', 'bcn-lead-2', 'bcn-lead-3',
  'user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8',
  'user-pending-1', 'user-pending-2'
];

function getInitialDatabase(): ClubDatabase {
  return {
    userList: SAMPLE_USERS,
    posts: [],
    locketMoments: [],
    criteria: S5T_CRITERIA_LIST,
    proofs: [],
    reports: [],
    transactions: [],
    plans: [],
    tasks: [],
    decrees: [],
    questions: INITIAL_RECRUITMENT_QUESTIONS,
    applications: [],
    hallOfFame: [],
    memberEvaluations: [],
    termHistory: INITIAL_TERM_HISTORY,
    emergencyNotices: [],
    deletedUserIds: [...LEGACY_MOCK_USER_IDS],
    deletedItemIds: [],
    cleanLaunchVersion: 4,
    lastUpdated: Date.now()
  };
}

let dbState: ClubDatabase = getInitialDatabase();
let isDbInitialized = false;
let dbInitPromise: Promise<void> | null = null;

// Hàm an toàn gộp danh sách theo ID
function mergeById<T extends { id: string }>(primary: T[], fallback: T[], deletedIds: string[] = []): T[] {
  const deletedSet = new Set(deletedIds || []);
  const map = new Map<string, T>();
  for (const item of primary || []) {
    if (item && item.id && !deletedSet.has(item.id)) {
      map.set(item.id, item);
    }
  }
  for (const item of fallback || []) {
    if (item && item.id && !deletedSet.has(item.id) && !map.has(item.id)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

// 2. Tải dữ liệu từ Firestore vào bộ nhớ server
async function loadDatabase(): Promise<void> {
  if (!firestore) {
    console.warn('[Database] Firestore offline, running in-memory mock mode.');
    return;
  }
  try {
    const colRef = firestore.collection(FS_COLLECTION);
    const [usersDoc, contentDoc, opsDoc, govDoc, sysDoc] = await Promise.all([
      colRef.doc('users').get(),
      colRef.doc('content').get(),
      colRef.doc('operations').get(),
      colRef.doc('governance').get(),
      colRef.doc('system').get(),
    ]);

    if (!usersDoc.exists && !contentDoc.exists && !sysDoc.exists) {
      console.log('[Database] Firestore clean setup detected. Seeding initial club data...');
      await persistAllToFirestore();
      return;
    }

    const uData = usersDoc.data() || {};
    const cData = contentDoc.data() || {};
    const oData = opsDoc.data() || {};
    const gData = govDoc.data() || {};
    const sData = sysDoc.data() || {};

    const deletedUsers = Array.from(new Set([...(uData.deletedUserIds || []), ...LEGACY_MOCK_USER_IDS]));
    const deletedItems = sData.deletedItemIds || [];

    const mergedUsers = mergeById(uData.userList || [], SAMPLE_USERS, deletedUsers);
    const loadedQuestions = Array.isArray(sData.questions) && sData.questions.length > 0
      ? sData.questions
      : INITIAL_RECRUITMENT_QUESTIONS;

    const loadedCriteria = S5T_CRITERIA_LIST.map((official) => {
      const existing = (sData.criteria || []).find((c: any) => c && c.id === official.id);
      if (!existing) return official;
      return {
        ...official,
        completedCount: existing.completedCount ?? official.completedCount,
        status: existing.status ?? official.status
      };
    });

    dbState = {
      ...getInitialDatabase(),
      userList: mergedUsers,
      posts: cData.posts || [],
      locketMoments: cData.locketMoments || [],
      proofs: cData.proofs || [],
      criteria: loadedCriteria,
      reports: oData.reports || [],
      transactions: oData.transactions || [],
      plans: (oData.plans || []).filter((p: any) => p && !deletedItems.includes(p.id)),
      tasks: oData.tasks || [],
      decrees: gData.decrees || [],
      questions: loadedQuestions,
      applications: oData.applications || [],
      hallOfFame: gData.hallOfFame || [],
      memberEvaluations: (gData.memberEvaluations || []).filter((e: any) => e && !deletedItems.includes(e.id)),
      termHistory: gData.termHistory && gData.termHistory.length > 0 ? gData.termHistory : INITIAL_TERM_HISTORY,
      emergencyNotices: gData.emergencyNotices || [],
      annualTheme: gData.annualTheme || null,
      deletedUserIds: deletedUsers,
      deletedItemIds: deletedItems,
      cleanLaunchVersion: 4,
      lastUpdated: sData.lastUpdated || Date.now()
    };
    console.log('[Database] Synchronized state successfully from Firestore.');
  } catch (err) {
    console.error('[Database] Error synchronizing from Firestore:', err);
  }
}

// 3. Lưu trữ trực tiếp lên Firestore theo từng phân vùng
async function persistDb(section: 'users' | 'content' | 'operations' | 'governance' | 'system' | 'all' = 'all'): Promise<void> {
  dbState.lastUpdated = Date.now();
  if (!firestore) return;

  try {
    const colRef = firestore.collection(FS_COLLECTION);
    const tasks: Promise<any>[] = [];

    if (section === 'users' || section === 'all') {
      tasks.push(colRef.doc('users').set({
        userList: dbState.userList || [],
        deletedUserIds: dbState.deletedUserIds || []
      }, { merge: true }));
    }

    if (section === 'content' || section === 'all') {
      tasks.push(colRef.doc('content').set({
        posts: dbState.posts || [],
        locketMoments: dbState.locketMoments || [],
        proofs: dbState.proofs || []
      }, { merge: true }));
    }

    if (section === 'operations' || section === 'all') {
      tasks.push(colRef.doc('operations').set({
        reports: dbState.reports || [],
        transactions: dbState.transactions || [],
        plans: dbState.plans || [],
        tasks: dbState.tasks || [],
        applications: dbState.applications || []
      }, { merge: true }));
    }

    if (section === 'governance' || section === 'all') {
      tasks.push(colRef.doc('governance').set({
        decrees: dbState.decrees || [],
        hallOfFame: dbState.hallOfFame || [],
        memberEvaluations: dbState.memberEvaluations || [],
        termHistory: dbState.termHistory || [],
        emergencyNotices: dbState.emergencyNotices || [],
        annualTheme: dbState.annualTheme || null
      }, { merge: true }));
    }

    if (section === 'system' || section === 'all') {
      tasks.push(colRef.doc('system').set({
        criteria: dbState.criteria || [],
        questions: dbState.questions || [],
        deletedItemIds: dbState.deletedItemIds || [],
        cleanLaunchVersion: dbState.cleanLaunchVersion || 4,
        lastUpdated: dbState.lastUpdated
      }, { merge: true }));
    }

    await Promise.all(tasks);
  } catch (err) {
    console.error(`[Database] Error persisting section ${section} to Firestore:`, err);
  }
}

async function persistAllToFirestore(): Promise<void> {
  await persistDb('all');
}

async function ensureDbLoaded(): Promise<void> {
  if (isDbInitialized) return;
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      await loadDatabase();
      isDbInitialized = true;
    })();
  }
  await dbInitPromise;
}

async function startServer() {
  const app = express();
  (globalThis as any).__expressApp = app;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Middleware bảo đảm dữ liệu Firestore đã sẵn sàng trước khi xử lý request
  app.use(async (req, res, next) => {
    await ensureDbLoaded();
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      connectedClients: 'multi-device',
      lastUpdated: dbState.lastUpdated,
      totalUsers: dbState.userList.length,
      serverTime: Date.now(),
      storage: 'Firebase Firestore',
      aiConfigured: Boolean(process.env.GEMINI_API_KEY)
    });
  });

  // GET complete synchronized state
  app.get('/api/state', (req, res) => {
    res.json(dbState);
  });

  // POST sync key
  app.post('/api/sync', async (req, res) => {
    const { key, data } = req.body;
    if (!key || data === undefined) {
      res.status(400).json({ error: 'Missing key or data' });
      return;
    }

    if (key in dbState && key !== 'lastUpdated') {
      if (Array.isArray(data) && Array.isArray((dbState as any)[key]) && key !== 'questions') {
        const deletedIds = key === 'userList'
          ? (dbState.deletedUserIds || [])
          : (dbState.deletedItemIds || []);
        (dbState as any)[key] = mergeById(data, (dbState as any)[key], deletedIds);
      } else {
        (dbState as any)[key] = data;
      }
      await persistDb('all');
      res.json({ success: true, key, lastUpdated: dbState.lastUpdated, state: dbState });
    } else {
      res.status(400).json({ error: `Invalid key: ${key}` });
    }
  });

  // POST batch sync
  app.post('/api/sync-batch', async (req, res) => {
    const { updates } = req.body;
    if (!updates || typeof updates !== 'object') {
      res.status(400).json({ error: 'Invalid updates object' });
      return;
    }

    for (const [key, value] of Object.entries(updates)) {
      if (key in dbState && key !== 'lastUpdated') {
        if (Array.isArray(value) && Array.isArray((dbState as any)[key]) && key !== 'questions') {
          const deletedIds = key === 'userList' ? (dbState.deletedUserIds || []) : [];
          (dbState as any)[key] = mergeById(value as any[], (dbState as any)[key], deletedIds);
        } else {
          (dbState as any)[key] = value;
        }
      }
    }
    await persistDb('all');
    res.json({ success: true, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // Reports
  app.post('/api/reports', async (req, res) => {
    const report = req.body;
    if (!report || !report.id || !report.title) {
      res.status(400).json({ error: 'Invalid report payload' });
      return;
    }

    const index = dbState.reports.findIndex((r: any) => r.id === report.id);
    if (index >= 0) {
      dbState.reports[index] = report;
    } else {
      dbState.reports.unshift(report);
    }
    await persistDb('operations');
    res.json({ success: true, reports: dbState.reports, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  app.post('/api/reports/response', async (req, res) => {
    const { reportId, response } = req.body;
    if (!reportId || !response) {
      res.status(400).json({ error: 'Missing reportId or response' });
      return;
    }
    const rIndex = dbState.reports.findIndex((r: any) => r.id === reportId);
    if (rIndex >= 0) {
      dbState.reports[rIndex] = {
        ...dbState.reports[rIndex],
        bcnResponse: response,
        status: 'resolved'
      };
      await persistDb('operations');
      res.json({ success: true, reports: dbState.reports, lastUpdated: dbState.lastUpdated, state: dbState });
    } else {
      res.status(404).json({ error: 'Report not found' });
    }
  });

  // Posts
  app.post('/api/posts', async (req, res) => {
    const post = req.body;
    if (!post || !post.id || !post.title) {
      res.status(400).json({ error: 'Invalid post payload' });
      return;
    }

    const index = dbState.posts.findIndex((p: any) => p.id === post.id);
    if (index >= 0) {
      dbState.posts[index] = post;
    } else {
      dbState.posts.unshift(post);
    }
    await persistDb('content');
    res.json({ success: true, posts: dbState.posts, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  app.post('/api/posts/like', async (req, res) => {
    const { postId } = req.body;
    if (!postId) {
      res.status(400).json({ error: 'Missing postId' });
      return;
    }
    const index = dbState.posts.findIndex((p: any) => p.id === postId);
    if (index >= 0) {
      const p = dbState.posts[index];
      const nextLiked = !p.userLiked;
      dbState.posts[index] = {
        ...p,
        userLiked: nextLiked,
        likes: nextLiked ? (p.likes || 0) + 1 : Math.max(0, (p.likes || 1) - 1)
      };
      await persistDb('content');
      res.json({ success: true, post: dbState.posts[index], lastUpdated: dbState.lastUpdated, state: dbState });
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  });

  app.post('/api/posts/comment', async (req, res) => {
    const { postId, comment } = req.body;
    if (!postId || !comment || !comment.text) {
      res.status(400).json({ error: 'Missing postId or comment' });
      return;
    }
    const index = dbState.posts.findIndex((p: any) => p.id === postId);
    if (index >= 0) {
      const p = dbState.posts[index];
      const existingComments = p.commentsList || [];
      const updatedComments = [...existingComments, comment];
      dbState.posts[index] = {
        ...p,
        commentsList: updatedComments,
        commentsCount: updatedComments.length
      };
      await persistDb('content');
      res.json({ success: true, post: dbState.posts[index], lastUpdated: dbState.lastUpdated, state: dbState });
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  });

  // Lockets
  app.post('/api/lockets', async (req, res) => {
    const moment = req.body;
    if (!moment || !moment.id) {
      res.status(400).json({ error: 'Invalid locket payload' });
      return;
    }

    const index = dbState.locketMoments.findIndex((m: any) => m.id === moment.id);
    if (index >= 0) {
      dbState.locketMoments[index] = moment;
    } else {
      dbState.locketMoments.unshift(moment);
    }
    await persistDb('content');
    res.json({ success: true, locketMoments: dbState.locketMoments, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  app.post('/api/lockets/react', async (req, res) => {
    const { locketId } = req.body;
    if (!locketId) {
      res.status(400).json({ error: 'Missing locketId' });
      return;
    }
    const index = dbState.locketMoments.findIndex((m: any) => m.id === locketId);
    if (index >= 0) {
      const m = dbState.locketMoments[index];
      const nextReact = !m.userReacted;
      dbState.locketMoments[index] = {
        ...m,
        userReacted: nextReact,
        reactions: nextReact ? (m.reactions || 0) + 1 : Math.max(0, (m.reactions || 1) - 1)
      };
      await persistDb('content');
      res.json({ success: true, locket: dbState.locketMoments[index], lastUpdated: dbState.lastUpdated, state: dbState });
    } else {
      res.status(404).json({ error: 'Locket moment not found' });
    }
  });

  // Login
  app.post('/api/login', (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      res.status(400).json({ error: 'Vui lòng nhập Email, MSSV hoặc Họ tên và Mật khẩu' });
      return;
    }
    const cleanId = identifier.trim().toLowerCase();
    const user = dbState.userList.find((u: any) => 
      (u.studentId && u.studentId.toLowerCase() === cleanId) ||
      (u.email && u.email.toLowerCase() === cleanId) ||
      (u.name && u.name.toLowerCase() === cleanId)
    );

    if (!user) {
      res.status(404).json({ error: 'Không tìm thấy tài khoản với Email, MSSV hoặc Họ tên này!' });
      return;
    }

    const correctPassword = user.password || (user.id === 'bcn-root' ? 'AGU2026' : '');
    if (!correctPassword || password.trim() !== correctPassword) {
      res.status(401).json({ error: 'Mật khẩu không chính xác! Vui lòng thử lại.' });
      return;
    }

    res.json({
      success: true,
      user,
      isBcn: user.role === 'bcn_admin',
      lastUpdated: dbState.lastUpdated,
      state: dbState
    });
  });

  // Register
  app.post('/api/register', async (req, res) => {
    const newUser = req.body;
    if (!newUser || !newUser.name || !newUser.studentId) {
      res.status(400).json({ error: 'Thiếu thông tin bắt buộc (Họ tên, MSSV)' });
      return;
    }

    if (!newUser.password) {
      newUser.password = '123456';
    }

    if (dbState.deletedUserIds && newUser.id) {
      dbState.deletedUserIds = dbState.deletedUserIds.filter(id => id !== newUser.id);
    }

    const existingIndex = dbState.userList.findIndex(u => 
      (newUser.id && u.id === newUser.id) ||
      (u.studentId && newUser.studentId && u.studentId.toLowerCase() === newUser.studentId.toLowerCase()) ||
      (newUser.email && u.email && u.email.toLowerCase() === newUser.email.toLowerCase())
    );

    let savedUser = newUser;
    if (existingIndex >= 0) {
      savedUser = { ...dbState.userList[existingIndex], ...newUser };
      dbState.userList[existingIndex] = savedUser;
    } else {
      dbState.userList.unshift(newUser);
    }
    await persistDb('users');
    res.json({ success: true, user: savedUser, totalUsers: dbState.userList.length, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // Ensure Batch Users
  app.post('/api/users/ensure-batch', async (req, res) => {
    const { users } = req.body;
    if (!Array.isArray(users)) {
      res.status(400).json({ error: 'Invalid users array' });
      return;
    }

    const deletedSet = new Set(dbState.deletedUserIds || []);
    let changed = false;

    for (const localUser of users) {
      if (!localUser || !localUser.id || !localUser.name || deletedSet.has(localUser.id)) continue;
      const exists = dbState.userList.some(u =>
        u.id === localUser.id ||
        (u.studentId && localUser.studentId && u.studentId.toLowerCase() === localUser.studentId.toLowerCase())
      );
      if (!exists) {
        if (!localUser.password) localUser.password = '123456';
        dbState.userList.unshift(localUser);
        changed = true;
      }
    }

    if (changed) {
      await persistDb('users');
    }

    res.json({ success: true, changed, state: dbState, lastUpdated: dbState.lastUpdated });
  });

  // Update Profile
  app.post('/api/users/update-profile', async (req, res) => {
    const { userId, avatar, nickname, favoriteBook, newPassword, readingStreak, enewsStreak, hasCheckedInToday, lastCheckInDate, s5tProgress, meritPoints } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'Missing userId' });
      return;
    }
    const idx = dbState.userList.findIndex((u: any) => u.id === userId);
    if (idx < 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const current = dbState.userList[idx];
    dbState.userList[idx] = {
      ...current,
      avatar: avatar || current.avatar,
      nickname: nickname !== undefined ? nickname : current.nickname,
      favoriteBook: favoriteBook !== undefined ? favoriteBook : current.favoriteBook,
      password: newPassword || current.password,
      readingStreak: readingStreak !== undefined ? readingStreak : current.readingStreak,
      enewsStreak: enewsStreak !== undefined ? enewsStreak : current.enewsStreak,
      hasCheckedInToday: hasCheckedInToday !== undefined ? hasCheckedInToday : current.hasCheckedInToday,
      lastCheckInDate: lastCheckInDate !== undefined ? lastCheckInDate : current.lastCheckInDate,
      s5tProgress: s5tProgress !== undefined ? s5tProgress : current.s5tProgress,
      meritPoints: meritPoints !== undefined ? meritPoints : current.meritPoints
    };
    await persistDb('users');
    res.json({ success: true, user: dbState.userList[idx], lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // Governance roles
  app.post('/api/users/assign-role', async (req, res) => {
    const { targetUserId, department, roleTitle, departmentRole, roleType } = req.body;
    if (!targetUserId) {
      res.status(400).json({ error: 'Missing targetUserId' });
      return;
    }
    const target = dbState.userList.find((u: any) => u.id === targetUserId);
    if (!target) {
      res.status(404).json({ error: 'Không tìm thấy thành viên cần phân quyền' });
      return;
    }
    if (target.id === 'bcn-root' || target.adminType === 'master_root') {
      res.status(403).json({ error: 'Không thể thay đổi chức danh Tài khoản Gốc Tối Cao!' });
      return;
    }

    dbState.userList = assignSingleMemberSubDeptRole(dbState.userList, {
      targetUserId,
      department: department || target.department,
      departmentRole: departmentRole || target.departmentRole || 'member',
      roleTitle: roleTitle || target.position,
      roleType: roleType || target.role
    });
    await persistDb('users');
    const updatedUser = dbState.userList.find((u: any) => u.id === targetUserId);
    res.json({ success: true, user: updatedUser, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  app.post('/api/users/approve-department', async (req, res) => {
    const { targetUserId, department, status, note } = req.body;
    if (!targetUserId) {
      res.status(400).json({ error: 'Thiếu targetUserId' });
      return;
    }
    if (status === 'rejected') {
      dbState.userList = rejectUserDepartmentRequest(dbState.userList, targetUserId, note);
    } else {
      dbState.userList = approveUserIntoDepartment(
        dbState.userList,
        targetUserId,
        department,
        note,
        new Date().toLocaleDateString('vi-VN')
      );
    }
    await persistDb('users');
    res.json({ success: true, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  app.post('/api/departments/appoint-leaders', async (req, res) => {
    const { department, leaderId, viceLeaderIds, appointedByName } = req.body;
    const result = appointSubDepartmentLeaders(dbState.userList, {
      department,
      leaderId,
      viceLeaderIds: Array.isArray(viceLeaderIds) ? viceLeaderIds : [],
      appointedByName
    });
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    dbState.userList = result.updatedUsers;
    await persistDb('users');
    res.json({ success: true, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  app.post('/api/terms/appoint-bcn', async (req, res) => {
    const { termName, termYears, presidentId, vicePresidentIds, vicePositions, legacyContributions, legacyQuote } = req.body;
    const result = appointClubTermLeaders(
      dbState.userList,
      dbState.hallOfFame || [],
      dbState.termHistory || [],
      {
        termName,
        termYears,
        presidentId,
        vicePresidentIds: Array.isArray(vicePresidentIds) ? vicePresidentIds : [],
        vicePositions: Array.isArray(vicePositions) ? vicePositions : [],
        legacyContributions,
        legacyQuote,
        appointedAt: new Date().toLocaleDateString('vi-VN')
      }
    );
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    dbState.userList = result.updatedUsers;
    dbState.hallOfFame = result.updatedHallOfFame;
    dbState.termHistory = result.updatedTermHistory;
    await persistDb('all');
    res.json({ success: true, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // Transactions & Plans
  app.post('/api/transactions', async (req, res) => {
    const transaction = req.body;
    if (!transaction || !transaction.id || !transaction.title) {
      res.status(400).json({ error: 'Invalid transaction payload' });
      return;
    }
    if (dbState.deletedItemIds) {
      dbState.deletedItemIds = dbState.deletedItemIds.filter(id => id !== transaction.id);
    }
    dbState.transactions.unshift(transaction);
    await persistDb('operations');
    res.json({ success: true, transactions: dbState.transactions, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  app.post('/api/plans', async (req, res) => {
    const plan = req.body;
    if (!plan || !plan.id || !plan.title) {
      res.status(400).json({ error: 'Invalid plan payload' });
      return;
    }
    if (dbState.deletedItemIds) {
      dbState.deletedItemIds = dbState.deletedItemIds.filter(id => id !== plan.id);
    }
    const idx = dbState.plans.findIndex((p: any) => p.id === plan.id);
    if (idx >= 0) {
      dbState.plans[idx] = plan;
    } else {
      dbState.plans.unshift(plan);
    }
    await persistDb('operations');
    res.json({ success: true, plans: dbState.plans, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // Delete item
  app.post('/api/items/delete', async (req, res) => {
    const { key, itemId } = req.body;
    if (!key || !itemId || !(key in dbState)) {
      res.status(400).json({ error: 'Missing or invalid key / itemId' });
      return;
    }
    if (!Array.isArray((dbState as any)[key])) {
      res.status(400).json({ error: `Collection ${key} is not an array` });
      return;
    }
    if (!dbState.deletedItemIds) dbState.deletedItemIds = [];
    if (!dbState.deletedItemIds.includes(itemId)) {
      dbState.deletedItemIds.push(itemId);
    }
    (dbState as any)[key] = (dbState as any)[key].filter((item: any) => item && item.id !== itemId);
    await persistDb('all');
    res.json({ success: true, key, deletedItemId: itemId, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // Theme & Notices
  app.post('/api/theme', async (req, res) => {
    const { theme, year, setBy, setAt } = req.body;
    if (!theme || !year) {
      res.status(400).json({ error: 'Missing theme or year' });
      return;
    }
    dbState.annualTheme = {
      theme: theme.trim(),
      year: year.trim(),
      setBy: setBy || 'Chủ nhiệm CLB',
      setAt: setAt || new Date().toLocaleDateString('vi-VN')
    };
    await persistDb('governance');
    res.json({ success: true, annualTheme: dbState.annualTheme, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  app.post('/api/emergency-notices', async (req, res) => {
    const notice = req.body;
    if (!notice || !notice.title) {
      res.status(400).json({ error: 'Missing notice title' });
      return;
    }
    const newNotice = {
      ...notice,
      id: notice.id || `em-${Date.now()}`,
      issuedAt: notice.issuedAt || new Date().toLocaleDateString('vi-VN'),
      isActive: true
    };
    if (!Array.isArray(dbState.emergencyNotices)) {
      dbState.emergencyNotices = [];
    }
    dbState.emergencyNotices.unshift(newNotice);
    await persistDb('governance');
    res.json({ success: true, emergencyNotices: dbState.emergencyNotices, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  app.post('/api/emergency-notices/dismiss', async (req, res) => {
    const { noticeId } = req.body;
    if (!noticeId) {
      res.status(400).json({ error: 'Missing noticeId' });
      return;
    }
    if (Array.isArray(dbState.emergencyNotices)) {
      dbState.emergencyNotices = dbState.emergencyNotices.filter((n: any) => n.id !== noticeId);
    }
    await persistDb('governance');
    res.json({ success: true, noticeId, emergencyNotices: dbState.emergencyNotices, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // Delete user
  app.post('/api/users/delete', async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'Missing userId' });
      return;
    }

    const targetUser = dbState.userList.find((u: any) => u.id === userId);
    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (targetUser.id === 'bcn-root' || targetUser.adminType === 'master_root') {
      res.status(403).json({ error: 'Không thể xóa Tài khoản Gốc Vĩnh Viễn của CLB!' });
      return;
    }

    if (!dbState.deletedUserIds) dbState.deletedUserIds = [];
    if (!dbState.deletedUserIds.includes(userId)) {
      dbState.deletedUserIds.push(userId);
    }

    dbState.userList = dbState.userList.filter((u: any) => u.id !== userId);
    await persistDb('users');
    res.json({ success: true, deletedUserId: userId, userList: dbState.userList, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // Succession
  app.post('/api/succession', async (req, res) => {
    const { outgoingLeaderId, incomingMemberId, newLeader, hallOfFameRecord, positionTitle } = req.body;

    if (hallOfFameRecord) {
      dbState.hallOfFame.unshift(hallOfFameRecord);
    }

    if (outgoingLeaderId) {
      const outIdx = dbState.userList.findIndex(u => u.id === outgoingLeaderId);
      if (outIdx >= 0) {
        const outU = dbState.userList[outIdx];
        const isVice = (outU.position || '').toLowerCase().includes('phó');
        const emeritusPosition = isVice 
          ? 'Cựu Phó Chủ nhiệm CLB (Tiền bối danh dự)' 
          : 'Cựu Chủ nhiệm CLB (Tiền bối danh dự)';
        const badges = (outU.badges || []).includes('Cựu BCN Tiền Nhiệm 🎖️')
          ? outU.badges
          : [...(outU.badges || []).filter((b: string) => !b.includes('Chủ Nhiệm Nhiệm Kỳ')), 'Cựu BCN Tiền Nhiệm 🎖️'];
        dbState.userList[outIdx] = {
          ...outU,
          role: 'member',
          adminType: 'member',
          position: emeritusPosition,
          badges
        };
      }
    }

    if (newLeader) {
      dbState.userList.unshift(newLeader);
    } else if (incomingMemberId) {
      const inIdx = dbState.userList.findIndex(u => u.id === incomingMemberId);
      if (inIdx >= 0) {
        const inU = dbState.userList[inIdx];
        const badges = (inU.badges || []).includes('Tân BCN Đương Nhiệm 👑')
          ? inU.badges
          : [...(inU.badges || []), 'Tân BCN Đương Nhiệm 👑'];
        dbState.userList[inIdx] = {
          ...inU,
          role: 'bcn_admin',
          adminType: 'bcn_elected',
          department: 'BQT',
          position: positionTitle || 'Chủ nhiệm CLB (Sinh viên)',
          term: 'Nhiệm kỳ mới (2026-2027)',
          badges
        };
      }
    }

    await persistDb('all');
    res.json({ success: true, state: dbState, lastUpdated: dbState.lastUpdated });
  });

  // Backup & Restore
  app.get('/api/backup/download', (req, res) => {
    res.setHeader('Content-Type', 'application/json

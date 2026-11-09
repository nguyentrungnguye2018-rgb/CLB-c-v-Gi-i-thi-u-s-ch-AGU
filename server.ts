import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
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
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'club_db.json');
const SEED_FILE = path.join(DATA_DIR, 'seed.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Global server in-memory state
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

// Load persistent data from disk if exists
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed) {
      const seed = getInitialDatabase();
      const deletedUsers = Array.from(new Set([...(parsed.deletedUserIds || []), ...LEGACY_MOCK_USER_IDS]));
      const deletedItems = parsed.deletedItemIds || [];
      const mergedUsers = mergeById(
        parsed.userList || [],
        SAMPLE_USERS,
        deletedUsers
      );
      const loadedQuestions = Array.isArray(parsed.questions) && parsed.questions.length > 0
        ? parsed.questions
        : INITIAL_RECRUITMENT_QUESTIONS;
      const loadedCriteria = S5T_CRITERIA_LIST.map((official) => {
        const existing = (parsed.criteria || []).find((c: any) => c && c.id === official.id);
        if (!existing) return official;
        return {
          ...official,
          completedCount: existing.completedCount ?? official.completedCount,
          status: existing.status ?? official.status
        };
      });
      dbState = {
        ...seed,
        ...parsed,
        userList: mergedUsers,
        criteria: loadedCriteria,
        questions: loadedQuestions,
        plans: (parsed.plans || []).filter((p: any) => p && !deletedItems.includes(p.id)),
        memberEvaluations: (parsed.memberEvaluations || []).filter((e: any) => e && !deletedItems.includes(e.id)),
        deletedUserIds: deletedUsers,
        deletedItemIds: deletedItems,
        cleanLaunchVersion: 4,
        lastUpdated: parsed.lastUpdated || Date.now()
      };
      console.log('[Database] Loaded persistent database from disk:', DB_FILE);
    }
  } else {
    const content = JSON.stringify(dbState, null, 2);
    fs.writeFileSync(DB_FILE, content, 'utf-8');
    try {
      fs.writeFileSync(SEED_FILE, content, 'utf-8');
    } catch {
      // ignore
    }
    console.log('[Database] Initialized new clean database file:', DB_FILE);
  }
} catch (err) {
  console.error('[Database] Error loading db file, using clean defaults:', err);
}

// Helper to save state to disk (both DB_FILE and SEED_FILE to guarantee survival across updates)
let saveTimeout: NodeJS.Timeout | null = null;
function persistDb() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      dbState.lastUpdated = Date.now();
      const content = JSON.stringify(dbState, null, 2);
      fs.writeFileSync(DB_FILE, content, 'utf-8');
      try {
        fs.writeFileSync(SEED_FILE, content, 'utf-8');
      } catch (seedErr) {
        // Ignore if SEED_FILE is read-only
      }
    } catch (err) {
      console.error('[Database] Failed to write db to disk:', err);
    }
  }, 100);
}

// Helper to safely merge arrays by ID (never drops existing items unless in deletedIds)
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

async function startServer() {
  const app = express();

  // Allow JSON request bodies (up to 50mb for image uploads)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // CORS headers so any client / iframe can sync smoothly
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

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      connectedClients: 'multi-device',
      lastUpdated: dbState.lastUpdated,
      totalUsers: dbState.userList.length,
      serverTime: Date.now()
    });
  });

  // GET complete synchronized state
  app.get('/api/state', (req, res) => {
    res.json(dbState);
  });

  // POST sync key: safely merges collections so no device ever overwrites another device's new accounts or posts
  app.post('/api/sync', (req, res) => {
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
      dbState.lastUpdated = Date.now();
      persistDb();
      res.json({ success: true, key, lastUpdated: dbState.lastUpdated, state: dbState });
    } else {
      res.status(400).json({ error: `Invalid key: ${key}` });
    }
  });

  // POST batch sync: updates multiple keys at once with safe merge
  app.post('/api/sync-batch', (req, res) => {
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
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // Direct endpoint to post a confidential report (Tố cáo / phản ánh)
  app.post('/api/reports', (req, res) => {
    const report = req.body;
    if (!report || !report.id || !report.title) {
      res.status(400).json({ error: 'Invalid report payload' });
      return;
    }

    // Check if report exists, update or unshift
    const index = dbState.reports.findIndex((r: any) => r.id === report.id);
    if (index >= 0) {
      dbState.reports[index] = report;
    } else {
      dbState.reports.unshift(report);
    }
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, reports: dbState.reports, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // Endpoint for BCN to respond to a report
  app.post('/api/reports/response', (req, res) => {
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
      dbState.lastUpdated = Date.now();
      persistDb();
      res.json({ success: true, reports: dbState.reports, lastUpdated: dbState.lastUpdated, state: dbState });
    } else {
      res.status(404).json({ error: 'Report not found' });
    }
  });

  // Direct endpoint to post a status post / tản văn / E-News
  app.post('/api/posts', (req, res) => {
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
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, posts: dbState.posts, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // Toggle like on a post
  app.post('/api/posts/like', (req, res) => {
    const { postId, userId } = req.body;
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
      dbState.lastUpdated = Date.now();
      persistDb();
      res.json({ success: true, post: dbState.posts[index], lastUpdated: dbState.lastUpdated, state: dbState });
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  });

  // Add comment to a post
  app.post('/api/posts/comment', (req, res) => {
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
      dbState.lastUpdated = Date.now();
      persistDb();
      res.json({ success: true, post: dbState.posts[index], lastUpdated: dbState.lastUpdated, state: dbState });
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  });

  // Direct endpoint to post a Locket memory
  app.post('/api/lockets', (req, res) => {
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
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, locketMoments: dbState.locketMoments, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // React to locket moment
  app.post('/api/lockets/react', (req, res) => {
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
      dbState.lastUpdated = Date.now();
      persistDb();
      res.json({ success: true, locket: dbState.locketMoments[index], lastUpdated: dbState.lastUpdated, state: dbState });
    } else {
      res.status(404).json({ error: 'Locket moment not found' });
    }
  });

  // POST Login authentication with password (matches MSSV, Email, or Full Name)
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

  // POST direct register member with password & permanent persistence
  app.post('/api/register', (req, res) => {
    const newUser = req.body;
    if (!newUser || !newUser.name || !newUser.studentId) {
      res.status(400).json({ error: 'Thiếu thông tin bắt buộc (Họ tên, MSSV)' });
      return;
    }

    // Default password if not provided
    if (!newUser.password) {
      newUser.password = '123456';
    }

    // If re-registering, remove from deletedUserIds
    if (dbState.deletedUserIds && newUser.id) {
      dbState.deletedUserIds = dbState.deletedUserIds.filter(id => id !== newUser.id);
    }

    // Check if user already exists by id, studentId, or email
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
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, user: savedUser, totalUsers: dbState.userList.length, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // POST ensure local accounts exist on server (Auto-Recovery so no user account is ever lost)
  app.post('/api/users/ensure-batch', (req, res) => {
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
      dbState.lastUpdated = Date.now();
      persistDb();
    }

    res.json({ success: true, changed, state: dbState, lastUpdated: dbState.lastUpdated });
  });

  // POST update member profile (Avatar, Nickname, Favorite Book, Password, Streak, Points)
  app.post('/api/users/update-profile', (req, res) => {
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
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, user: dbState.userList[idx], lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // POST Assign / Appoint single member role in 4-Department (prevents duplicate Trưởng Ban)
  app.post('/api/users/assign-role', (req, res) => {
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
    dbState.lastUpdated = Date.now();
    persistDb();
    const updatedUser = dbState.userList.find((u: any) => u.id === targetUserId);
    res.json({ success: true, user: updatedUser, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // POST Approve or Reject Member into a Department (Exclusive to Account Chính bcn-root)
  app.post('/api/users/approve-department', (req, res) => {
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
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // POST Select Trưởng Ban & Phó Ban for one of the 4 sub-departments (By Trưởng CLB or Account Chính)
  app.post('/api/departments/appoint-leaders', (req, res) => {
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
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // POST Appoint Term-based Trưởng CLB & Phó CLB (Exclusive to Account Chính bcn-root)
  app.post('/api/terms/appoint-bcn', (req, res) => {
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
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // POST Add transaction with receipt image support
  app.post('/api/transactions', (req, res) => {
    const transaction = req.body;
    if (!transaction || !transaction.id || !transaction.title) {
      res.status(400).json({ error: 'Invalid transaction payload' });
      return;
    }
    if (dbState.deletedItemIds) {
      dbState.deletedItemIds = dbState.deletedItemIds.filter(id => id !== transaction.id);
    }
    dbState.transactions.unshift(transaction);
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, transactions: dbState.transactions, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // POST Add or update plan (including archived plans with PDF/Image attachments)
  app.post('/api/plans', (req, res) => {
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
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, plans: dbState.plans, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // POST Delete any item (plan, task, post, locketMoment, proof, report, transaction, decree, hallOfFame) permanently across all devices
  app.post('/api/items/delete', (req, res) => {
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
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, key, deletedItemId: itemId, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // POST Update Official Annual Theme (Chủ đề năm do Chủ nhiệm & Phó Chủ nhiệm đặt)
  app.post('/api/theme', (req, res) => {
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
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, annualTheme: dbState.annualTheme, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // POST Add Emergency Notice
  app.post('/api/emergency-notices', (req, res) => {
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
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, emergencyNotices: dbState.emergencyNotices, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // POST Dismiss / Deactivate Emergency Notice (Người phát hoặc BCN gỡ bỏ)
  app.post('/api/emergency-notices/dismiss', (req, res) => {
    const { noticeId } = req.body;
    if (!noticeId) {
      res.status(400).json({ error: 'Missing noticeId' });
      return;
    }
    if (Array.isArray(dbState.emergencyNotices)) {
      dbState.emergencyNotices = dbState.emergencyNotices.map((n: any) =>
        n.id === noticeId ? { ...n, isActive: false } : n
      ).filter((n: any) => n.id !== noticeId); // Gỡ bỏ hoàn toàn khỏi thanh khẩn cấp
    }
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, noticeId, emergencyNotices: dbState.emergencyNotices, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // POST Admin Delete Account
  app.post('/api/users/delete', (req, res) => {
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

    // Protect permanent root account
    if (targetUser.id === 'bcn-root' || targetUser.adminType === 'master_root') {
      res.status(403).json({ error: 'Không thể xóa Tài khoản Gốc Vĩnh Viễn của CLB!' });
      return;
    }

    // Track deleted user ID so stale clients do not re-insert it
    if (!dbState.deletedUserIds) dbState.deletedUserIds = [];
    if (!dbState.deletedUserIds.includes(userId)) {
      dbState.deletedUserIds.push(userId);
    }

    // Remove user
    dbState.userList = dbState.userList.filter((u: any) => u.id !== userId);
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, deletedUserId: userId, userList: dbState.userList, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // Succession Transfer endpoint
  app.post('/api/succession', (req, res) => {
    const { outgoingLeaderId, incomingMemberId, newLeader, hallOfFameRecord, positionTitle } = req.body;

    // 1. Add Hall of Fame record
    if (hallOfFameRecord) {
      dbState.hallOfFame.unshift(hallOfFameRecord);
    }

    // 2. Outgoing leader becomes emeritus
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

    // 3. New leader or elevated incoming member
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

    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, state: dbState, lastUpdated: dbState.lastUpdated });
  });

  // Download complete JSON backup
  app.get('/api/backup/download', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=agu_club_backup_${Date.now()}.json`);
    res.send(JSON.stringify(dbState, null, 2));
  });

  // Restore database from JSON backup file
  app.post('/api/backup/restore', (req, res) => {
    const { backupData, passcode } = req.body;
    if (passcode !== 'AGU2026') {
      res.status(403).json({ error: 'Mã xác thực bảo mật câu lạc bộ không chính xác!' });
      return;
    }
    if (!backupData || typeof backupData !== 'object') {
      res.status(400).json({ error: 'Dữ liệu file backup JSON không hợp lệ!' });
      return;
    }

    dbState = {
      ...getInitialDatabase(),
      ...backupData,
      lastUpdated: Date.now()
    };
    persistDb();
    res.json({ success: true, message: 'Đã phục hồi cơ sở dữ liệu thành công!', state: dbState, lastUpdated: dbState.lastUpdated });
  });

  // Direct endpoint to submit a recruitment application (works both logged-in and via public recruitment link)
  app.post('/api/applications', (req, res) => {
    const appData = req.body;
    if (!appData || !appData.fullName || !appData.studentId) {
      res.status(400).json({ error: 'Vui lòng nhập đầy đủ Họ tên và Mã số sinh viên!' });
      return;
    }
    const newApp = {
      ...appData,
      id: appData.id || `app-${Date.now().toString().slice(-4)}`,
      status: appData.status || 'pending',
      submittedAt: appData.submittedAt || new Date().toLocaleDateString('vi-VN')
    };
    if (!Array.isArray(dbState.applications)) {
      dbState.applications = [];
    }
    const existingIdx = dbState.applications.findIndex((a: any) => a.id === newApp.id);
    if (existingIdx >= 0) {
      dbState.applications[existingIdx] = newApp;
    } else {
      dbState.applications.unshift(newApp);
    }
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, application: newApp, applications: dbState.applications, lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // Google Search Grounding endpoint for Book & Author lookup (gemini-3.8-flash with googleSearch tool)
  app.post('/api/books/search-grounding', async (req, res) => {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ error: 'Vui lòng nhập tên sách hoặc tác giả cần tra cứu!' });
      return;
    }
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Hãy tra cứu thông tin chính xác, cập nhật về cuốn sách, tác giả hoặc chủ đề văn học sau cho Câu lạc bộ Đọc và Giới thiệu sách Trường Đại học An Giang (AGU): "${query.trim()}". Trình bày ngắn gọn, súc tích bằng tiếng Việt gồm: 1) Giới thiệu tác phẩm/tác giả, 2) Thông điệp & giá trị cốt lõi, 3) Gợi ý thảo luận cho buổi sinh hoạt CLB.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = groundingChunks
        .map((chunk: any) => chunk.web ? { title: chunk.web.title || chunk.web.uri, uri: chunk.web.uri } : null)
        .filter(Boolean);

      res.json({
        success: true,
        text: response.text || 'Không tìm thấy kết quả phù hợp.',
        sources
      });
    } catch (err: any) {
      console.error('[BookSearch] Gemini Google Search Grounding error:', err);
      res.status(500).json({
        error: err?.message || 'Không thể tra cứu thông tin sách lúc này.'
      });
    }
  });

  // Reset database back to default seed (BCN master only)
  app.post('/api/reset-db', (req, res) => {
    const { passcode } = req.body;
    if (passcode !== 'AGU2026') {
      res.status(403).json({ error: 'Invalid master passcode' });
      return;
    }

    dbState = getInitialDatabase();
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, message: 'Database reset to initial club seed', lastUpdated: dbState.lastUpdated, state: dbState });
  });

  // Mount Vite middleware in development mode
  const distPath = path.join(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' || __filename.endsWith('server.js');
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        watch: {
          ignored: ['**/data/**', '**/dist/**', '**/server.js']
        }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distPath)) {
    // Serve production static build
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Full-Stack Server] CLB Đọc Sách is running at http://0.0.0.0:${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Failed to start:', err);
});

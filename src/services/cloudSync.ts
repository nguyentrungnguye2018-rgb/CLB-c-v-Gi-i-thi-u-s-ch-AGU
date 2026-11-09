/**
 * Multi-device Cloud Synchronization Service
 * Đồng Bộ Hóa Đa Thiết Bị Trực Tiếp Cho CLB Đọc Sách
 */

import { 
  UserProfile, 
  Post, 
  LocketMoment, 
  S5TCriterion, 
  S5TProof, 
  ConfidentialReport, 
  Transaction, 
  ClubPlan, 
  ClubTask, 
  ClubDecree, 
  HallOfFameItem, 
  RecruitmentQuestion, 
  RecruitmentApplication,
  EmergencyNotice,
  DepartmentType,
  AnnualTheme,
  MemberEvaluation
} from '../types';

export interface GlobalSyncState {
  userList: UserProfile[];
  posts: Post[];
  locketMoments: LocketMoment[];
  criteria: S5TCriterion[];
  proofs: S5TProof[];
  reports: ConfidentialReport[];
  transactions: Transaction[];
  plans: ClubPlan[];
  tasks: ClubTask[];
  decrees: ClubDecree[];
  questions: RecruitmentQuestion[];
  applications: RecruitmentApplication[];
  hallOfFame: HallOfFameItem[];
  memberEvaluations?: MemberEvaluation[];
  emergencyNotices?: EmergencyNotice[];
  annualTheme?: AnnualTheme;
  termHistory?: any[];
  deletedUserIds?: string[];
  deletedItemIds?: string[];
  lastUpdated: number;
}

// Check server connectivity
export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health');
    return res.ok;
  } catch (err) {
    return false;
  }
}

// Fetch complete global state from server
export async function fetchCloudState(): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/state');
    if (!res.ok) return null;
    const data = await res.json();
    return data as GlobalSyncState;
  } catch (err) {
    console.warn('[CloudSync] Could not reach sync server, using local fallback:', err);
    return null;
  }
}

// Synchronize a specific data collection to the server and return updated state if available
export async function pushCloudSync(key: keyof Omit<GlobalSyncState, 'lastUpdated'>, data: any): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, data })
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn(`[CloudSync] Failed to push key ${key} to server:`, err);
    return null;
  }
}

// Direct report submission
export async function sendReportToCloud(report: ConfidentialReport): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report)
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn('[CloudSync] Failed to send report to cloud:', err);
    return null;
  }
}

// Direct post submission
export async function sendPostToCloud(post: Post): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post)
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn('[CloudSync] Failed to send post to cloud:', err);
    return null;
  }
}

// Direct locket moment submission
export async function sendLocketToCloud(moment: LocketMoment): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/lockets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(moment)
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn('[CloudSync] Failed to send locket to cloud:', err);
    return null;
  }
}

// Register a new user across all devices directly
export async function registerUserToCloud(user: UserProfile): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn('[CloudSync] Failed to register user to cloud:', err);
    return null;
  }
}

// BCN response to confidential report
export async function sendReportResponseToCloud(reportId: string, response: string): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/reports/response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, response })
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn('[CloudSync] Failed to send report response to cloud:', err);
    return null;
  }
}

// Toggle like for post on cloud
export async function sendPostLikeToCloud(postId: string, userId?: string): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/posts/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, userId })
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn('[CloudSync] Failed to send post like to cloud:', err);
    return null;
  }
}

// Add comment to post on cloud
export async function sendPostCommentToCloud(postId: string, comment: { author: string; avatar: string; text: string; time: string }): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/posts/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, comment })
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn('[CloudSync] Failed to send post comment to cloud:', err);
    return null;
  }
}

// React to locket moment on cloud
export async function sendLocketReactToCloud(locketId: string): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/lockets/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locketId })
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn('[CloudSync] Failed to send locket react to cloud:', err);
    return null;
  }
}

// Delete user from cloud (Admin permission requested by user)
export async function deleteUserFromCloud(userId: string): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/users/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn('[CloudSync] Failed to delete user from cloud:', err);
    return null;
  }
}

// Transfer succession on cloud
export async function transferSuccessionToCloud(payload: {
  outgoingLeaderId?: string;
  incomingMemberId?: string;
  newLeader?: any;
  hallOfFameRecord?: any;
  positionTitle?: string;
}): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/succession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn('[CloudSync] Failed to transfer succession to cloud:', err);
    return null;
  }
}

// Restore database from JSON backup file
export async function restoreCloudBackup(backupData: any, passcode: string): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/backup/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backupData, passcode })
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || 'Khôi phục không thành công');
    }
    const body = await res.json();
    return body.state || null;
  } catch (err: any) {
    console.warn('[CloudSync] Failed to restore database backup:', err);
    throw err;
  }
}

// Login authentication on cloud
export async function loginToCloud(identifier: string, password: string): Promise<{ success: boolean; user?: UserProfile; isBcn?: boolean; error?: string; state?: GlobalSyncState }> {
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    const body = await res.json();
    if (!res.ok) {
      return { success: false, error: body.error || 'Đăng nhập thất bại' };
    }
    return { success: true, user: body.user, isBcn: body.isBcn, state: body.state };
  } catch (err: any) {
    console.warn('[CloudSync] Login failed to reach server:', err);
    return { success: false, error: 'Không thể kết nối đến máy chủ xác thực' };
  }
}

// Ensure local device accounts exist on cloud server (Auto-Recovery)
export async function ensureLocalUsersOnCloud(users: UserProfile[]): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/users/ensure-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users })
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn('[CloudSync] Failed to ensure local users on cloud:', err);
    return null;
  }
}

// Update user profile on cloud (Avatar, Nickname, Favorite Book, Password, Streak, Points)
export async function updateProfileOnCloud(payload: {
  userId: string;
  avatar?: string;
  nickname?: string;
  favoriteBook?: string;
  newPassword?: string;
  readingStreak?: number;
  enewsStreak?: number;
  hasCheckedInToday?: boolean;
  lastCheckInDate?: string;
  s5tProgress?: number;
  meritPoints?: number;
}): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/users/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn('[CloudSync] Failed to update profile on cloud:', err);
    return null;
  }
}

// Assign role & position by Official Club Account (Master Root)
export async function assignRoleOnCloud(payload: {
  targetUserId: string;
  department: string;
  roleTitle: string;
  departmentRole: 'leader' | 'vice_leader' | 'member';
  roleType: 'member' | 'lead' | 'bcn_admin';
}): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/users/assign-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn('[CloudSync] Failed to assign role on cloud:', err);
    return null;
  }
}

// Add transaction with receipt image to cloud
export async function addTransactionToCloud(transaction: Transaction): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction)
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn('[CloudSync] Failed to add transaction to cloud:', err);
    return null;
  }
}

// Add or update plan to cloud
export async function addPlanToCloud(plan: ClubPlan): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan)
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn('[CloudSync] Failed to add plan to cloud:', err);
    return null;
  }
}

// Permanently delete an item (plan, task, post, locketMoments, proofs, reports, transactions, decrees, hallOfFame, memberEvaluations) across all devices
export async function deleteItemFromCloud(
  key: 'plans' | 'tasks' | 'posts' | 'locketMoments' | 'proofs' | 'reports' | 'transactions' | 'decrees' | 'hallOfFame' | 'applications' | 'memberEvaluations',
  itemId: string
): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/items/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, itemId })
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn(`[CloudSync] Failed to delete item ${itemId} from ${key}:`, err);
    return null;
  }
}

// Approve or reject member into a department (Account Chính only)
export async function approveDepartmentOnCloud(payload: {
  targetUserId: string;
  department?: DepartmentType;
  status: 'approved' | 'rejected';
  note?: string;
}): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/users/approve-department', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn('[CloudSync] Failed to approve department on cloud:', err);
    return null;
  }
}

// Appoint Trưởng Ban & Phó Ban for one of the 4 sub-departments (Trưởng CLB or Account Chính)
export async function appointSubDeptLeadersOnCloud(payload: {
  department: DepartmentType;
  leaderId: string;
  viceLeaderIds: string[];
  appointedByName?: string;
}): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/departments/appoint-leaders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn('[CloudSync] Failed to appoint sub-department leaders on cloud:', err);
    return null;
  }
}

// Appoint Term-based Trưởng CLB & Phó CLB (Account Chính only)
export async function appointTermBcnOnCloud(payload: {
  termName: string;
  termYears: string;
  presidentId: string;
  vicePresidentIds: string[];
  vicePositions?: string[];
  legacyContributions?: string;
  legacyQuote?: string;
}): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/terms/appoint-bcn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn('[CloudSync] Failed to appoint term BCN on cloud:', err);
    return null;
  }
}

// Update official Annual Theme on Cloud
export async function updateAnnualThemeOnCloud(themeData: AnnualTheme): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(themeData)
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn('[CloudSync] Failed to update annual theme on cloud:', err);
    return null;
  }
}

// Dismiss / Deactivate Emergency Notice on Cloud
export async function dismissEmergencyNoticeOnCloud(noticeId: string): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/emergency-notices/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noticeId })
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn('[CloudSync] Failed to dismiss emergency notice on cloud:', err);
    return null;
  }
}

// Submit recruitment application directly to cloud
export async function submitApplicationToCloud(application: RecruitmentApplication): Promise<GlobalSyncState | null> {
  try {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(application)
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.state || null;
  } catch (err) {
    console.warn('[CloudSync] Failed to submit application to cloud:', err);
    return null;
  }
}

// Search books & authors using Gemini Google Search Grounding
export async function searchBooksWithGoogleGrounding(query: string): Promise<{
  success: boolean;
  text?: string;
  sources?: { title: string; uri: string }[];
  error?: string;
}> {
  try {
    const res = await fetch('/api/books/search-grounding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const body = await res.json();
    if (!res.ok) {
      return { success: false, error: body.error || 'Tra cứu thất bại' };
    }
    return {
      success: true,
      text: body.text,
      sources: body.sources || []
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'Không thể kết nối máy chủ tra cứu sách.'
    };
  }
}

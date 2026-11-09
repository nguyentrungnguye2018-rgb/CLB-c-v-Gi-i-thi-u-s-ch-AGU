import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocFromServer, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { UserProfile } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

/**
 * Truncate and sanitize UserProfile payload to strictly satisfy firebase-blueprint.json & firestore.rules
 */
export function buildValidFirestoreUserPayload(uid: string, profile: UserProfile, emailOverride?: string) {
  const validDepartments = [
    'Truyền thông',
    'Nội dung',
    'Nhân sự & Kế hoạch',
    'Hậu cần',
    'Ban Chủ Nhiệm',
  ];
  const dept = validDepartments.includes(profile.department) ? profile.department : 'Nhân sự & Kế hoạch';
  const safeAvatar =
    profile.avatar && profile.avatar.length <= 2048
      ? profile.avatar
      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

  return {
    uid: uid.slice(0, 128),
    name: (profile.name || 'Thành Viên AGU').slice(0, 120),
    nickname: (profile.nickname || 'Độc Giả AGU 📖').slice(0, 80),
    email: (emailOverride || profile.email || 'member@agu.edu.vn').slice(0, 160),
    studentId: (profile.studentId || 'AGU2026').slice(0, 32),
    department: dept,
    avatar: safeAvatar,
    favoriteBook: (profile.favoriteBook || 'Dế Mèn Phiêu Lưu Ký').slice(0, 200),
    readingStreak: Math.max(0, Math.min(10000, Math.floor(profile.readingStreak || 0))),
    meritPoints: Math.max(0, Math.min(1000000, Math.floor(profile.meritPoints || 0))),
  };
}

/**
 * Sign in with Google Popup via Firebase Auth and sync/fetch user profile from Firestore
 */
export async function signInWithGoogleFirebase(): Promise<{ userProfile: UserProfile; isAdmin: boolean }> {
  const credential = await signInWithPopup(auth, googleProvider);
  const fbUser = credential.user;
  const uid = fbUser.uid;
  const email = (fbUser.email || 'member@agu.edu.vn').toLowerCase();
  const displayName = fbUser.displayName || email.split('@')[0] || 'Thành Viên AGU';
  const photoURL =
    fbUser.photoURL ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
  const isBootstrappedAdmin = email === 'nguyentrungnguye2018@gmail.com';

  const userDocPath = `users/${uid}`;
  const userDocRef = doc(db, 'users', uid);

  let existingData: Record<string, any> | null = null;
  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      existingData = snap.data();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userDocPath);
  }

  const baseProfile: UserProfile = {
    id: uid,
    name: (existingData?.name as string) || displayName,
    nickname: (existingData?.nickname as string) || `${displayName.split(' ').slice(-1)[0]} Sách 📖`,
    studentId: (existingData?.studentId as string) || (isBootstrappedAdmin ? 'BCN-AGU' : `AGU${uid.slice(0, 5).toUpperCase()}`),
    email,
    faculty: 'Trường Đại học An Giang (AGU)',
    avatar: (existingData?.avatar as string) || photoURL,
    role: isBootstrappedAdmin ? 'bcn_admin' : 'member',
    adminType: isBootstrappedAdmin ? 'master_root' : 'member',
    department: ((existingData?.department as any) || (isBootstrappedAdmin ? 'Ban Chủ Nhiệm' : 'Nhân sự & Kế hoạch')),
    requestedDepartment: 'Nhân sự & Kế hoạch',
    departmentStatus: isBootstrappedAdmin ? 'approved' : 'pending_approval',
    departmentRole: isBootstrappedAdmin ? 'leader' : 'member',
    position: isBootstrappedAdmin ? 'Ban Chủ Nhiệm CLB (Google Auth)' : 'Thành viên CLB (Google Auth)',
    readingStreak: typeof existingData?.readingStreak === 'number' ? existingData.readingStreak : 0,
    enewsStreak: 0,
    hasCheckedInToday: false,
    s5tProgress: 0,
    favoriteBook: (existingData?.favoriteBook as string) || 'Dế Mèn Phiêu Lưu Ký',
    joinDate: 'Tháng 10/2026',
    meritPoints: typeof existingData?.meritPoints === 'number' ? existingData.meritPoints : 0,
    badges: isBootstrappedAdmin
      ? ['Ban Chủ Nhiệm 👑', 'Xác Thực Google ✓']
      : ['Thành Viên Google Auth ✨'],
  };

  if (!existingData) {
    const payload = buildValidFirestoreUserPayload(
      uid,
      { ...baseProfile, readingStreak: 0, meritPoints: 0 },
      email
    );
    try {
      await setDoc(userDocRef, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, userDocPath);
    }
  }

  return {
    userProfile: baseProfile,
    isAdmin: isBootstrappedAdmin,
  };
}

export async function syncCurrentUserToFirestore(profile: UserProfile): Promise<void> {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  const userDocPath = `users/${uid}`;
  const payload = buildValidFirestoreUserPayload(uid, profile, auth.currentUser.email || profile.email);
  try {
    await setDoc(doc(db, 'users', uid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userDocPath);
  }
}

export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // ignore sign-out errors
  }
}

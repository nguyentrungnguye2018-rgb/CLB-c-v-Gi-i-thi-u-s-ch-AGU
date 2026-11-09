import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isMasterRootUser,
  isClubPresidentUser,
  isClubVicePresidentUser,
  canApproveDepartmentEntry,
  canSelectSubDeptLeaders,
  canAssignTermClubLeaders,
  approveUserIntoDepartment,
  appointSubDepartmentLeaders,
  appointClubTermLeaders
} from './governance';
import { SAMPLE_USERS, HALL_OF_FAME_DATA } from '../data/mockData';
import { UserProfile } from '../types';

const TEST_USERS: UserProfile[] = [
  SAMPLE_USERS[0],
  {
    id: 'bcn-lead-1',
    name: 'Nguyễn Minh Quân',
    studentId: 'DTH210001',
    faculty: 'Khoa CNTT',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    role: 'bcn_admin',
    adminType: 'bcn_elected',
    clubRole: 'president',
    term: 'Nhiệm kỳ VI (2026 - 2027)',
    department: 'BQT',
    departmentStatus: 'approved',
    position: 'Chủ nhiệm CLB',
    readingStreak: 0,
    enewsStreak: 0,
    hasCheckedInToday: false,
    s5tProgress: 0,
    meritPoints: 100,
    favoriteBook: 'Nhà Giả Kim',
    joinDate: '10/2026',
    badges: []
  },
  {
    id: 'bcn-lead-2',
    name: 'Lê Thảo Vy',
    studentId: 'DTH210002',
    faculty: 'Khoa Sư phạm',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    role: 'bcn_admin',
    adminType: 'bcn_elected',
    clubRole: 'vice_president',
    term: 'Nhiệm kỳ VI (2026 - 2027)',
    department: 'BQT',
    departmentStatus: 'approved',
    position: 'Phó Chủ nhiệm CLB',
    readingStreak: 0,
    enewsStreak: 0,
    hasCheckedInToday: false,
    s5tProgress: 0,
    meritPoints: 95,
    favoriteBook: 'Hoàng Tử Bé',
    joinDate: '10/2026',
    badges: []
  },
  {
    id: 'user-1',
    name: 'Trần Quốc Bảo',
    studentId: 'DTH220001',
    faculty: 'Khoa Sư phạm',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    role: 'lead',
    adminType: 'member',
    department: 'Truyền thông',
    departmentStatus: 'approved',
    departmentRole: 'leader',
    position: 'Trưởng Ban Truyền thông',
    readingStreak: 0,
    enewsStreak: 0,
    hasCheckedInToday: false,
    s5tProgress: 0,
    meritPoints: 80,
    favoriteBook: 'Dế Mèn Phiêu Lưu Ký',
    joinDate: '10/2026',
    badges: []
  },
  {
    id: 'user-2',
    name: 'Phạm Ngọc Hân',
    studentId: 'DTH220002',
    faculty: 'Khoa Ngoại ngữ',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150',
    role: 'member',
    adminType: 'member',
    department: 'Truyền thông',
    departmentStatus: 'approved',
    departmentRole: 'member',
    position: 'Thành viên Ban Truyền thông',
    readingStreak: 0,
    enewsStreak: 0,
    hasCheckedInToday: false,
    s5tProgress: 0,
    meritPoints: 70,
    favoriteBook: 'Cây Cam Ngọt Của Tôi',
    joinDate: '10/2026',
    badges: []
  },
  {
    id: 'user-3',
    name: 'Đỗ Gia Huy',
    studentId: 'DTH220003',
    faculty: 'Khoa Kinh tế',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    role: 'member',
    adminType: 'member',
    department: 'Nội dung',
    departmentStatus: 'approved',
    departmentRole: 'member',
    position: 'Thành viên Ban Nội dung',
    readingStreak: 0,
    enewsStreak: 0,
    hasCheckedInToday: false,
    s5tProgress: 0,
    meritPoints: 65,
    favoriteBook: 'Suối Nguồn',
    joinDate: '10/2026',
    badges: []
  }
];

test('Permission checks strictly enforce Account Chính vs Trưởng CLB vs Member', () => {
  const rootAcc = TEST_USERS.find(u => u.id === 'bcn-root')!;
  const clubPresident = TEST_USERS.find(u => u.id === 'bcn-lead-1')!;
  const clubVice = TEST_USERS.find(u => u.id === 'bcn-lead-2')!;
  const regularLead = TEST_USERS.find(u => u.id === 'user-1')!;

  assert.equal(isMasterRootUser(rootAcc), true);
  assert.equal(canApproveDepartmentEntry(rootAcc), true);
  assert.equal(canSelectSubDeptLeaders(rootAcc), true);
  assert.equal(canAssignTermClubLeaders(rootAcc), true);

  assert.equal(isClubPresidentUser(clubPresident), true);
  assert.equal(canSelectSubDeptLeaders(clubPresident), true);
  assert.equal(canApproveDepartmentEntry(clubPresident), true);
  assert.equal(canAssignTermClubLeaders(clubPresident), true);

  assert.equal(isClubVicePresidentUser(clubVice), true);
  assert.equal(canApproveDepartmentEntry(clubVice), true);
  assert.equal(canAssignTermClubLeaders(clubVice), false);
  assert.equal(canApproveDepartmentEntry(regularLead, 'Truyền thông'), true);
  assert.equal(canApproveDepartmentEntry(regularLead, 'Hậu cần'), false);
});

test('approveUserIntoDepartment transitions pending member to approved in target department', () => {
  const pendingUser: UserProfile = {
    ...TEST_USERS[4],
    id: 'pending-test-1',
    department: 'Truyền thông',
    requestedDepartment: 'Nội dung',
    departmentStatus: 'pending_approval',
    position: 'Chờ duyệt vào Ban Nội dung',
    badges: ['Chờ Duyệt Ban ⏳']
  };
  const list = [pendingUser, ...TEST_USERS];
  const updated = approveUserIntoDepartment(list, 'pending-test-1', 'Nội dung', 'Đồng ý duyệt vào ban', 'BCN', '27/10/2026');
  const approved = updated.find(u => u.id === 'pending-test-1')!;

  assert.equal(approved.departmentStatus, 'approved');
  assert.equal(approved.department, 'Nội dung');
  assert.equal(approved.requestedDepartment, undefined);
  assert.equal(approved.approvedByRootAt, '27/10/2026');
});

test('appointSubDepartmentLeaders selects Trưởng ban & Phó ban and demotes previous Trưởng ban without duplicates', () => {
  const resSamePerson = appointSubDepartmentLeaders(TEST_USERS, {
    department: 'Truyền thông',
    leaderId: 'user-1',
    viceLeaderIds: ['user-1']
  });
  assert.ok(resSamePerson.error, 'Should reject when Trưởng ban and Phó ban are the same person');

  const resValid = appointSubDepartmentLeaders(TEST_USERS, {
    department: 'Truyền thông',
    leaderId: 'user-2',
    viceLeaderIds: ['user-3']
  });
  assert.equal(resValid.error, undefined);

  const oldLeader = resValid.updatedUsers.find(u => u.id === 'user-1')!;
  const newLeader = resValid.updatedUsers.find(u => u.id === 'user-2')!;
  const newVice = resValid.updatedUsers.find(u => u.id === 'user-3')!;

  assert.equal(oldLeader.departmentRole, 'member');
  assert.equal(newLeader.department, 'Truyền thông');
  assert.equal(newLeader.departmentRole, 'leader');
  assert.ok(newLeader.position.includes('Trưởng Ban Truyền thông'));
  assert.equal(newVice.departmentRole, 'vice_leader');
  assert.ok(newVice.position.includes('Phó Ban Truyền thông'));
});

test('appointClubTermLeaders enforces distinct Trưởng CLB & Phó CLB per term and preserves outgoing leaders', () => {
  const missingTermResult = appointClubTermLeaders(TEST_USERS, HALL_OF_FAME_DATA, [], {
    termName: '',
    termYears: '2027 - 2028',
    presidentId: 'user-1',
    vicePresidentIds: ['user-2']
  });
  assert.ok(missingTermResult.error, 'Must reject if termName is empty');

  const validResult = appointClubTermLeaders(TEST_USERS, HALL_OF_FAME_DATA, [], {
    termName: 'Nhiệm kỳ VII (2027 - 2028)',
    termYears: '2027 - 2028',
    presidentId: 'user-1',
    vicePresidentIds: ['user-2', 'user-3'],
    legacyContributions: 'Hoàn thành xuất sắc Nhiệm kỳ VI'
  });

  assert.equal(validResult.error, undefined);
  const newPres = validResult.updatedUsers.find(u => u.id === 'user-1')!;
  const newVice1 = validResult.updatedUsers.find(u => u.id === 'user-2')!;
  const oldPres = validResult.updatedUsers.find(u => u.id === 'bcn-lead-1')!;

  assert.equal(newPres.adminType, 'bcn_elected');
  assert.equal(newPres.clubRole, 'president');
  assert.equal(newPres.term, 'Nhiệm kỳ VII (2027 - 2028)');

  assert.equal(newVice1.adminType, 'bcn_elected');
  assert.equal(newVice1.clubRole, 'vice_president');
  assert.equal(newVice1.term, 'Nhiệm kỳ VII (2027 - 2028)');

  assert.equal(oldPres.adminType, 'member');
  assert.equal(oldPres.clubRole, 'former_bcn');
  assert.ok(oldPres.position.toLowerCase().includes('cựu'));
  assert.equal(validResult.updatedTermHistory.length, 1);
  assert.equal(validResult.updatedTermHistory[0].president.id, 'user-1');
  assert.equal(validResult.updatedTermHistory[0].vicePresidents.length, 2);
});

test('Member Competency Evaluation permissions and scoring logic work accurately for BCN and Trưởng/Phó ban', async () => {
  const {
    getManagedDepartmentsForEvaluator,
    canEvaluateDepartmentMembers,
    computeEvaluationResult
  } = await import('./governance');

  const rootAcc = TEST_USERS.find(u => u.id === 'bcn-root')!;
  const mediaLead = TEST_USERS.find(u => u.id === 'user-1')!;
  const regularMember = TEST_USERS.find(u => u.id === 'user-2')!;

  // BCN manages all 4 departments
  assert.equal(getManagedDepartmentsForEvaluator(rootAcc).length, 4);
  assert.equal(canEvaluateDepartmentMembers(rootAcc, 'Nội dung'), true);

  // Trưởng Ban Truyền thông manages 'Truyền thông' only (unless concurrent)
  assert.deepEqual(getManagedDepartmentsForEvaluator(mediaLead), ['Truyền thông']);
  assert.equal(canEvaluateDepartmentMembers(mediaLead, 'Truyền thông'), true);
  assert.equal(canEvaluateDepartmentMembers(mediaLead, 'Hậu cần'), false);

  // Regular member cannot submit evaluations
  assert.equal(canEvaluateDepartmentMembers(regularMember), false);

  // Scoring calculation
  const resExcellent = computeEvaluationResult({
    responsibility: 9,
    quality: 9,
    teamwork: 8.5,
    initiative: 9.5
  });
  assert.equal(resExcellent.overallScore, 9);
  assert.equal(resExcellent.rating, 'Xuất sắc');

  const resGood = computeEvaluationResult({
    responsibility: 8,
    quality: 7,
    teamwork: 7.5,
    initiative: 7.5
  });
  assert.equal(resGood.overallScore, 7.5);
  assert.equal(resGood.rating, 'Tốt');
});


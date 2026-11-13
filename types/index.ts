/**
 * Data types for AGU Book Club Web Application
 * Câu lạc bộ Đọc và Giới thiệu sách
 */

export type RoleType = 'member' | 'lead' | 'bcn_admin';

export type AdminAccountType = 'master_root' | 'bcn_elected' | 'member';

export type DepartmentType = 'BQT' | 'Truyền thông' | 'Nội dung' | 'Nhân sự & Kế hoạch' | 'Hậu cần';

export type ClubRoleType =
  | 'root'
  | 'president'
  | 'vice_president'
  | 'former_bcn'
  | 'alumni_viewer'
  | 'member'
  | 'club_president'
  | 'club_vice_president';

export interface ConcurrentDeptAssignment {
  department: DepartmentType;
  departmentRole: 'leader' | 'vice_leader' | 'member';
  title: string;
}

export interface UserProfile {
  id: string;
  name: string;
  nickname?: string;
  studentId: string;
  faculty: string;
  avatar: string;
  role: RoleType;
  adminType?: AdminAccountType;
  clubRole?: ClubRoleType;
  department: DepartmentType;
  position: string;
  departmentRole?: 'leader' | 'vice_leader' | 'member';
  concurrentRoles?: ConcurrentDeptAssignment[];
  departmentStatus?: 'approved' | 'pending_approval' | 'rejected' | 'pending_transfer';
  requestedDepartment?: DepartmentType;
  transferFromDept?: DepartmentType;
  transferReason?: string;
  transferRequestedBy?: string;
  departmentApprovalNote?: string;
  approvedByRootAt?: string;
  term?: string;
  email?: string;
  password?: string;
  readingStreak: number;
  enewsStreak: number;
  hasCheckedInToday: boolean;
  lastCheckInDate?: string;
  s5tProgress: number;
  favoriteBook: string;
  joinDate: string;
  meritPoints: number;
  badges: string[];
  isGraduated?: boolean;
  graduatedAt?: string;
  formerTitle?: string;
  canComment?: boolean;
}

export interface AnnualTheme {
  theme: string;
  year: string;
  setBy: string;
  setAt: string;
}

export interface EmergencyNotice {
  id: string;
  title: string;
  content: string;
  severity: 'urgent' | 'critical' | 'alert';
  issuedBy: string;
  issuedByRole: string;
  issuedAt: string;
  isActive: boolean;
  pinned: boolean;
}

export interface ClubTermMemberSummary {
  id: string;
  name: string;
  nickname?: string;
  studentId: string;
  faculty: string;
  avatar: string;
  position: string;
  roleType: 'president' | 'vice_president';
}

export interface ClubTermRecord {
  id: string;
  termName: string;
  termYears: string;
  isCurrent: boolean;
  president: ClubTermMemberSummary;
  vicePresidents: ClubTermMemberSummary[];
  appointedBy: string;
  appointedAt: string;
  highlights?: string;
}

export interface PostComment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  time: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorNickname?: string;
  authorAvatar: string;
  authorRole: string;
  authorDept: DepartmentType;
  title: string;
  bookTitle?: string;
  bookAuthor?: string;
  bookPagesRead?: string;
  bookTakeaway?: string;
  isBookReview?: boolean;
  category: 'E-News' | 'Tản văn' | 'Góc Sách AGU' | 'Điểm Tin Tuần' | 'Phóng Sự CLB' | 'Cảm Nhận Sách';
  content: string;
  excerpt: string;
  coverImage?: string;
  createdAt: string;
  likes: number;
  userLiked?: boolean;
  commentsCount: number;
  comments?: PostComment[];
  commentsList?: PostComment[];
  tags: string[];
  readingTimeMinutes: number;
}

export interface LocketMoment {
  id: string;
  authorId?: string;
  authorName: string;
  authorNickname?: string;
  authorAvatar: string;
  department: DepartmentType;
  imageUrl: string;
  caption: string;
  location: string;
  timestamp: string;
  reactions: number;
  userReacted?: boolean;
}

export interface S5TSubRequirement {
  id: string;
  type: 'mandatory' | 'elective';
  title: string;
  detail: string;
  category?: 'Chung' | 'Ngoại ngữ' | 'Kỹ năng' | 'Hội nhập';
}

export interface S5TCriterion {
  id: string;
  name: string;
  description: string;
  iconName: string;
  requiredCount: number;
  completedCount: number;
  status: 'completed' | 'in_progress' | 'pending_review';
  regulationArticle?: string;
  mandatorySummary?: string;
  electiveSummary?: string;
  electiveMinCount?: number;
  specialNote?: string;
  subRequirements?: S5TSubRequirement[];
}

export interface S5TProof {
  id: string;
  userId?: string;
  studentId: string;
  studentName: string;
  department: DepartmentType;
  criterionId: string;
  criterionName: string;
  activityTitle: string;
  activityDate: string;
  proofUrl: string;
  attachmentType?: 'image' | 'pdf' | 'link';
  attachmentName?: string;
  proofDescription: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedBy?: string;
  reviewComment?: string;
}

export interface ConfidentialReport {
  id: string;
  recipientType: 'truong_ban' | 'bcn_master';
  targetDepartment?: DepartmentType;
  category: 'Góp ý sinh hoạt' | 'Mâu thuẫn nội bộ' | 'Ý tưởng sự kiện' | 'Cơ sở vật chất Thư viện' | 'Khác';
  title: string;
  content: string;
  isEncrypted: boolean;
  encryptedCode: string;
  realSenderId?: string;
  realSenderName: string;
  realSenderNickname?: string;
  realSenderStudentId: string;
  realSenderDept: DepartmentType;
  createdAt: string;
  status: 'received' | 'processing' | 'resolved';
  bcnResponse?: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  title: string;
  amount: number;
  category: 'Quỹ hội phí' | 'Mua sách mới' | 'Tổ chức Talkshow' | 'In ấn & Quà tặng' | 'Tài trợ & Quyên góp' | 'Tiệc trà & Teabreak';
  date: string;
  performedBy: string;
  approvedBy: string;
  receiptCode: string;
  receiptImage?: string;
  note?: string;
}

export interface ClubDepartment {
  id: DepartmentType;
  name: string;
  lead: string;
  leadNickname?: string;
  leadTitle: string;
  leadAvatar: string;
  leadContact: string;
  memberCount: number;
  mission: string;
  color: string;
  badges: string[];
}

export interface PlanAnonymousFeedback {
  id: string;
  reason: string;
  category: 'Kinh phí chưa hợp lý' | 'Thời gian không khả thi' | 'Nội dung chưa phù hợp' | 'Thiếu nhân lực thực hiện' | 'Góp ý cải tiến khác';
  submittedAt: string;
}

export interface ClubPlan {
  id: string;
  title: string;
  proposedBy: string;
  proposedById?: string;
  submittedByRole?: string;
  department: DepartmentType;
  description: string;
  timeline: string;
  targetAudience: string;
  priority: 'high' | 'medium' | 'normal';
  status: 'under_discussion' | 'approved' | 'in_action' | 'completed';
  budgetEstimate: number;
  votesAgree: number;
  votesDisagree: number;
  userVoted?: 'agree' | 'disagree';
  assignedDept: DepartmentType;
  actionItems: string[];
  archivedAt?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: 'pdf' | 'image';
  createdAt?: string;
  anonymousDislikes?: PlanAnonymousFeedback[];
}

export interface ClubTask {
  id: string;
  planId?: string;
  title: string;
  assignedToDept: DepartmentType;
  assignedToMemberName: string;
  deadline: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  rewardPoints: number;
  description: string;
  feedback?: string;
}

export interface ClubDecree {
  id: string;
  title: string;
  content: string;
  issuedAt: string;
  issuedBy: string;
  type: 'urgent' | 'announcement' | 'award';
  pinToIsland: boolean;
}

export interface HallOfFameItem {
  id: string;
  name: string;
  nickname?: string;
  studentId: string;
  title: string;
  termYears: string;
  bestContributions: string;
  avatar: string;
  legacyQuote: string;
}

export interface RecruitmentQuestion {
  id: string;
  text: string;
  type: 'multiple_choice' | 'short_answer';
  options?: string[];
  required: boolean;
}

export interface RecruitmentApplication {
  id: string;
  fullName: string;
  nickname?: string;
  studentId: string;
  faculty: string;
  email: string;
  phone: string;
  desiredDept: DepartmentType;
  answers: Record<string, string>;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewNotes?: string;
}

export type EvaluationRatingType = 'Xuất sắc' | 'Tốt' | 'Đạt' | 'Cần cố gắng';

export type EvaluationRecommendationType =
  | 'Khen thưởng cuối kỳ'
  | 'Giữ nguyên vị trí'
  | 'Đề xuất luân chuyển ban'
  | 'Bồi dưỡng thêm';

export interface MemberEvaluation {
  id: string;
  memberId: string;
  memberName: string;
  memberNickname?: string;
  memberStudentId: string;
  memberAvatar: string;
  department: DepartmentType;
  period: string;
  criteriaScores: {
    responsibility: number;
    quality: number;
    teamwork: number;
    initiative: number;
  };
  overallScore: number;
  rating: EvaluationRatingType;
  strengths: string;
  improvements?: string;
  recommendation: EvaluationRecommendationType;
  suggestedTargetDept?: DepartmentType;
  suggestedRewardBadge?: string;
  suggestedBonusPoints?: number;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorRole: string;
  createdAt: string;
  appliedAction?: 'rewarded' | 'rotated';
  round?: 1 | 2;
  round1Completed?: boolean;
  round1EvaluatorName?: string;
  round1EvaluatorRole?: string;
  round1CompletedAt?: string;
  round2Status?: 'pending_president' | 'approved' | 'revised';
  round2PresidentName?: string;
  round2Score?: number;
  round2Comments?: string;
  round2Decision?: 'khen_thuong' | 'luan_chuyen' | 'giu_nguyen' | 'can_nhac_bcn';
  round2CompletedAt?: string;
}

export interface GroupAward {
  id: string;
  groupName: string;
  reason: string;
  period: string;
  agreedByLeader: string;
  agreedByViceLeader: string;
  certificateCode: string;
  awardedAt: string;
}

/**
 * Data types for AGU Book Club Web Application
 * Câu lạc bộ Đọc và Giới thiệu sách
 */

export type RoleType = 'member' | 'lead' | 'bcn_admin';

export type AdminAccountType = 'master_root' | 'bcn_elected' | 'member';

export type DepartmentType = 'BQT' | 'Truyền thông' | 'Nội dung' | 'Nhân sự & Kế hoạch' | 'Hậu cần';

export type ClubRoleType = 'root' | 'president' | 'vice_president' | 'former_bcn' | 'member' | 'club_president' | 'club_vice_president';

export interface ConcurrentDeptAssignment {
  department: DepartmentType;
  departmentRole: 'leader' | 'vice_leader' | 'member';
  title: string;
}

export interface UserProfile {
  id: string;
  name: string;
  nickname?: string; // Tên biệt danh vui nhộn e.g. "Mọt Sách AGU", "Vy Mộng Mơ"
  studentId: string; // e.g. DTH215842
  faculty: string; // e.g. Khoa Sư phạm, Khoa Du lịch & VHNT, Khoa CNTT
  avatar: string;
  role: RoleType;
  adminType?: AdminAccountType; // master_root = không bao giờ đổi thông tin; bcn_elected = account đổi theo nhiệm kỳ
  clubRole?: ClubRoleType; // root | president (Trưởng CLB) | vice_president (Phó CLB) | former_bcn
  department: DepartmentType;
  position: string; // Chủ Nhiệm, Phó Chủ Nhiệm, Trưởng Ban, Phó Ban, Thành viên...
  departmentRole?: 'leader' | 'vice_leader' | 'member'; // Trưởng ban, Phó ban, Thành viên của 4 ban
  concurrentRoles?: ConcurrentDeptAssignment[]; // Cho phép 1 người kiêm nhiệm nhiều ban / nhiều chức vụ cùng lúc
  departmentStatus?: 'approved' | 'pending_approval' | 'rejected' | 'pending_transfer'; // Phê duyệt hoặc chuyển nhóm
  requestedDepartment?: DepartmentType; // Ban / Nhóm nguyện vọng đang chờ duyệt
  transferFromDept?: DepartmentType; // Nhóm cũ chuyển đi
  transferReason?: string; // Lý do chuyển nhóm / sửa duyệt lộn
  transferRequestedBy?: string; // Tên người yêu cầu chuyển nhóm
  departmentApprovalNote?: string;
  approvedByRootAt?: string;
  term?: string; // e.g. "Vĩnh Cửu" hoặc "Nhiệm kỳ VI (2026-2027)"
  email?: string;
  password?: string; // Mật khẩu riêng của từng tài khoản để bảo mật
  readingStreak: number; // ngày
  enewsStreak: number; // ngày
  hasCheckedInToday: boolean;
  lastCheckInDate?: string; // Ngày điểm danh gần nhất (VD: 27/10/2026) để tự động mở khóa chuỗi mỗi ngày mới
  s5tProgress: number; // 0 - 100%
  favoriteBook: string;
  joinDate: string;
  meritPoints: number; // Điểm lửa cống hiến do BCN trao
  badges: string[]; // Huy hiệu danh dự BCN trao
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
  severity: 'urgent' | 'critical' | 'alert'; // Cực khẩn | Khẩn cấp | Thông báo quan trọng
  issuedBy: string; // Chủ nhiệm CLB / Phó Chủ nhiệm CLB
  issuedByRole: string; // "Chủ nhiệm CLB" hoặc "Phó Chủ nhiệm CLB"
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
  termName: string; // e.g. "Nhiệm kỳ VI (2026 - 2027)"
  termYears: string; // e.g. "2026 - 2027"
  isCurrent: boolean;
  president: ClubTermMemberSummary;
  vicePresidents: ClubTermMemberSummary[];
  appointedBy: string; // "Account Chính CLB Đọc và Giới thiệu sách"
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
  bookPagesRead?: string; // Ví dụ: "Đã đọc từ trang 45 đến trang 90"
  bookTakeaway?: string; // Bài học tâm đắc / đúc kết từ những trang sách này
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
  regulationArticle?: string; // Ví dụ: "Điều 5.2.1 QĐ 118/QĐ-HSV"
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
  amount: number; // VNĐ
  category: 'Quỹ hội phí' | 'Mua sách mới' | 'Tổ chức Talkshow' | 'In ấn & Quà tặng' | 'Tài trợ & Quyên góp' | 'Tiệc trà & Teabreak';
  date: string;
  performedBy: string;
  approvedBy: string;
  receiptCode: string;
  receiptImage?: string; // Chụp / tải ảnh biên lai hóa đơn chứng từ
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
  submittedByRole?: string; // e.g. "Trưởng Ban Nhân sự & Kế hoạch"
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
  archivedAt?: string; // Thời điểm lưu trữ chính thức khi kế hoạch đã được duyệt
  attachmentUrl?: string; // File PDF hoặc Hình ảnh kế hoạch nguyên bản (DataURL/URL)
  attachmentName?: string; // Tên file gốc (VD: Ke_Hoach_Hoi_Sach_AGU_2026.pdf)
  attachmentType?: 'pdf' | 'image'; // Loại file đính kèm
  createdAt?: string;
  anonymousDislikes?: PlanAnonymousFeedback[]; // Danh sách các ý kiến phản biện ẩn danh
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

// Hall of Fame / Gian Trưng Bày Thành Tựu Cố Nhân (Khi chuyển giao nhiệm kỳ)
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

// Tuyển Thành Viên: Bộ Câu Hỏi & Đơn Sơ Tuyển
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

// Đánh Giá Năng Lực Thành Viên Định Kỳ (Cho phép Trưởng/Phó ban và BCN nhận xét định kỳ để luân chuyển nhân sự & khen thưởng cuối kỳ minh bạch)
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
  period: string; // VD: "Định kỳ Tháng 10/2026", "Giữa Học Kỳ I (2026-2027)", "Tổng Kết Cuối Kỳ 2026-2027"
  criteriaScores: {
    responsibility: number; // Tinh thần trách nhiệm & kỷ luật (1-10)
    quality: number; // Chất lượng hoàn thành công việc (1-10)
    teamwork: number; // Phối hợp nhóm & gắn kết CLB (1-10)
    initiative: number; // Chủ động sáng tạo & đóng góp ý tưởng (1-10)
  };
  overallScore: number; // Điểm trung bình (0 - 10)
  rating: EvaluationRatingType;
  strengths: string; // Nhận xét điểm mạnh & đóng góp nổi bật
  improvements?: string; // Góp ý phát triển / cần khắc phục
  recommendation: EvaluationRecommendationType;
  suggestedTargetDept?: DepartmentType; // Ban đề xuất luân chuyển đến (nếu chọn Đề xuất luân chuyển ban)
  suggestedRewardBadge?: string; // Danh hiệu khen thưởng đề xuất (nếu chọn Khen thưởng cuối kỳ)
  suggestedBonusPoints?: number; // Điểm lửa đề xuất cộng thêm
  evaluatorId: string;
  evaluatorName: string;
  evaluatorRole: string;
  createdAt: string;
  appliedAction?: 'rewarded' | 'rotated';

  // Cơ chế đánh giá 2 vòng theo yêu cầu:
  // Vòng 1: Trưởng ban & Phó ban đánh giá thành viên trong ban mình
  // Vòng 2: Chủ nhiệm CLB đánh giá/phê chuẩn chung cuộc
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

// Khen thưởng cho một nhóm/tổ xuất sắc (Trưởng và Phó CLB cùng thống nhất)
export interface GroupAward {
  id: string;
  groupName: string;
  reason: string;
  period: string;
  agreedByLeader: string; // Trưởng CLB (Chủ nhiệm)
  agreedByViceLeader: string; // Phó CLB (Phó Chủ nhiệm)
  certificateCode: string;
  awardedAt: string;
}


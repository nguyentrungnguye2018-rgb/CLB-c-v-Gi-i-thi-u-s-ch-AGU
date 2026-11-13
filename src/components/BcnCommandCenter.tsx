import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Sparkles, 
  Flame, 
  Award, 
  CheckCircle2, 
  PlusCircle, 
  Layers, 
  Users2, 
  ThumbsUp, 
  ThumbsDown, 
  Zap, 
  ShieldCheck, 
  Gift, 
  Megaphone, 
  Check, 
  X,
  Lock,
  FileText,
  ChevronRight,
  Inbox,
  AlertTriangle,
  Compass,
  Trash2,
  Search,
  UserCog,
  Download,
  Upload,
  Database,
  HardDrive,
  RefreshCw,
  Archive,
  FolderArchive,
  BadgeCheck,
  Eye,
  FileUp,
  Image as ImageIcon,
  ClipboardCheck,
  MessageSquare,
  GraduationCap,
  ShieldAlert
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  UserProfile, 
  ClubPlan, 
  ClubTask, 
  ClubDecree, 
  DepartmentType,
  ConfidentialReport,
  Transaction,
  Post,
  MemberEvaluation
} from '../types';
import { restoreCloudBackup, assignRoleOnCloud } from '../services/cloudSync';
import { readFileAsDataUrl } from '../utils/fileUpload';
import { MemberEvaluationSection } from './MemberEvaluationSection';

interface BcnCommandCenterProps {
  currentUser: UserProfile;
  isBcnMode: boolean;
  isMasterRoot: boolean;
  plans?: ClubPlan[];
  tasks?: ClubTask[];
  decrees?: ClubDecree[];
  userList?: UserProfile[];
  memberEvaluations?: MemberEvaluation[];
  reports?: ConfidentialReport[];
  transactions?: Transaction[];
  posts?: Post[];
  onUpdateBcnResponse?: (reportId: string, response: string) => void;
  onAddPlan: (newPlan: Omit<ClubPlan, 'id' | 'votesAgree' | 'votesDisagree'>) => void;
  onVotePlan: (planId: string, vote: 'agree' | 'disagree', anonymousReason?: string, anonymousCategory?: string) => void;
  onUpdatePlanStatus: (planId: string, status: ClubPlan['status']) => void;
  onDeletePlan?: (planId: string) => void;
  onAddTask: (newTask: Omit<ClubTask, 'id'>) => void;
  onUpdateTaskStatus: (taskId: string, status: ClubTask['status']) => void;
  onDeleteTask?: (taskId: string) => void;
  onCompleteTaskAndReward: (taskId: string, memberName: string, points: number) => void;
  onAwardBadge: (userId: string, badgeName: string, points: number) => void;
  onRemoveBadge?: (userId: string, badgeName: string) => void;
  onIssueDecree: (newDecree: Omit<ClubDecree, 'id' | 'issuedAt'>) => void;
  onDeleteDecree?: (decreeId: string) => void;
  onAddEvaluation?: (newEval: Omit<MemberEvaluation, 'id' | 'createdAt'>) => void;
  onUpdateEvaluation?: (updated: MemberEvaluation) => void;
  onDeleteEvaluation?: (id: string) => void;
  onExecuteEvaluationAction?: (evaluation: MemberEvaluation, actionType: 'reward' | 'rotate') => void;
  onOpenAuthModal: () => void;
  onOpenRecruitment: () => void;
  onOpenSuccession: () => void;
  onOpenHallOfFame?: () => void;
  onOpenReports?: () => void;
  onDeleteUser?: (userId: string) => void;
  onStateRestored?: (newState: any) => void;
  onAssignRole?: (payload: { targetUserId: string; department: string; roleTitle: string; departmentRole: 'leader' | 'vice_leader' | 'member'; roleType: 'member' | 'lead' | 'bcn_admin' }) => void;
  onApproveDepartment?: (targetUserId: string, department: DepartmentType, note?: string) => void;
  onRejectDepartment?: (targetUserId: string, note?: string) => void;
}

type DeleteReasonCategory =
  | 'Đã tốt nghiệp'
  | 'Xin nghỉ sinh hoạt / Chuyển công tác'
  | 'Vi phạm nội quy / Không tham gia hoạt động'
  | 'Tài khoản ảo / Nhập trùng hồ sơ'
  | 'Lý do khác';

export const BcnCommandCenter: React.FC<BcnCommandCenterProps> = ({
  currentUser,
  isBcnMode,
  isMasterRoot,
  plans = [],
  tasks = [],
  decrees = [],
  userList = [],
  memberEvaluations = [],
  reports = [],
  transactions = [],
  posts = [],
  onAddPlan,
  onVotePlan,
  onUpdatePlanStatus,
  onDeletePlan,
  onAddTask,
  onUpdateTaskStatus,
  onDeleteTask,
  onCompleteTaskAndReward,
  onAwardBadge,
  onRemoveBadge,
  onIssueDecree,
  onDeleteDecree,
  onAddEvaluation,
  onUpdateEvaluation,
  onDeleteEvaluation,
  onExecuteEvaluationAction,
  onOpenRecruitment,
  onOpenSuccession,
  onOpenHallOfFame,
  onOpenReports,
  onDeleteUser,
  onStateRestored,
  onAssignRole,
  onApproveDepartment,
}) => {
  // Bảo vệ chống null/undefined khi mở trên điện thoại
  const safeUserList = Array.isArray(userList) ? userList : [];
  const safePlans = Array.isArray(plans) ? plans : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeDecrees = Array.isArray(decrees) ? decrees : [];
  const safeEvaluations = Array.isArray(memberEvaluations) ? memberEvaluations : [];
  const safeReports = Array.isArray(reports) ? reports : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safePosts = Array.isArray(posts) ? posts : [];

  const isRootAccount = isMasterRoot || currentUser?.id === 'bcn-root' || currentUser?.adminType === 'master_root';
  const isBcnAdmin = Boolean(
    isBcnMode ||
      currentUser?.role === 'bcn_admin' ||
      currentUser?.clubRole === 'president' ||
      currentUser?.clubRole === 'vice_president' ||
      isRootAccount
  );
  const canApproveDept = isBcnAdmin;
  const canAppointDeptRole = isBcnAdmin;

  const [activeTab, setActiveTab] = useState<'omnipotent' | 'evaluations' | 'members' | 'coplan' | 'tasks' | 'awards' | 'decrees' | 'backup'>(
    isBcnAdmin ? 'omnipotent' : 'coplan'
  );

  useEffect(() => {
    if (!isBcnAdmin && activeTab !== 'coplan' && activeTab !== 'tasks' && activeTab !== 'evaluations') {
      setActiveTab('coplan');
    }
  }, [isBcnAdmin, activeTab]);

  // Member Management & Deletion Approval states
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberFilterDept, setMemberFilterDept] = useState<string>('all');
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [deleteReasonCategory, setDeleteReasonCategory] = useState<DeleteReasonCategory>('Đã tốt nghiệp');
  const [deleteReasonDetail, setDeleteReasonDetail] = useState<string>('');
  const [deleteNotice, setDeleteNotice] = useState<string>('');

  // Quick Dispatch Form states
  const [dispatchDept, setDispatchDept] = useState<DepartmentType>('Nhân sự & Kế hoạch');
  const [dispatchAssignee, setDispatchAssignee] = useState<string>('Trưởng Ban Điều Phối');
  const [dispatchTitle, setDispatchTitle] = useState('');
  const [dispatchDesc, setDispatchDesc] = useState('');
  const [dispatchDeadline, setDispatchDeadline] = useState('24 Giờ Tới (Hỏa Tốc)');
  const [dispatchPoints, setDispatchPoints] = useState<number>(80);
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState(false);

  // Plan creation & PDF/Image upload modal states
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planTitle, setPlanTitle] = useState('');
  const [planDept, setPlanDept] = useState<DepartmentType>('Nhân sự & Kế hoạch');
  const [planDesc, setPlanDesc] = useState('');
  const [planTimeline, setPlanTimeline] = useState('Tháng 11/2026');
  const [planAudience, setPlanAudience] = useState('Toàn thể sinh viên CLB');
  const [planPriority] = useState<'high' | 'medium' | 'normal'>('high');
  const [planBudget, setPlanBudget] = useState(2500000);
  const [planActionItems] = useState('Ban Nội dung biên soạn, Ban Truyền thông thiết kế ấn phẩm, Ban Hậu cần chuẩn bị địa điểm');
  const [planAttachmentUrl, setPlanAttachmentUrl] = useState<string>('');
  const [planAttachmentName, setPlanAttachmentName] = useState<string>('');
  const [planAttachmentType, setPlanAttachmentType] = useState<'pdf' | 'image'>('pdf');
  const [planUploadError, setPlanUploadError] = useState<string>('');
  const [isUploadingPlanFile, setIsUploadingPlanFile] = useState<boolean>(false);
  const [previewPlanAttachment, setPreviewPlanAttachment] = useState<{
    title: string;
    url: string;
    name: string;
    type: 'pdf' | 'image';
  } | null>(null);

  // Anonymous Dislike Feedback States
  const [dislikingPlan, setDislikingPlan] = useState<ClubPlan | null>(null);
  const [dislikeCategory, setDislikeCategory] = useState<'Kinh phí chưa hợp lý' | 'Thời gian không khả thi' | 'Nội dung chưa phù hợp' | 'Thiếu nhân lực thực hiện' | 'Góp ý cải tiến khác'>('Nội dung chưa phù hợp');
  const [dislikeReason, setDislikeReason] = useState<string>('');
  const [viewingFeedbackPlan, setViewingFeedbackPlan] = useState<ClubPlan | null>(null);

  // Task creation modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDept, setTaskDept] = useState<DepartmentType>('Nội dung');
  const [taskAssignee, setTaskAssignee] = useState(safeUserList[1]?.name || 'Thành viên CLB');
  const [taskDeadline, setTaskDeadline] = useState('10/11/2026');
  const [taskPoints, setTaskPoints] = useState(50);
  const [taskDesc, setTaskDesc] = useState('');

  // Award medal states
  const [selectedUserToAward, setSelectedUserToAward] = useState<string>(safeUserList[0]?.id || '');
  const [selectedBadge, setSelectedBadge] = useState<string>('Chiến Binh Deadline ⚡');
  const [bonusPoints, setBonusPoints] = useState<number>(50);

  // Decree form
  const [decreeTitle, setDecreeTitle] = useState('');
  const [decreeContent, setDecreeContent] = useState('');
  const [decreeType, setDecreeType] = useState<'urgent' | 'announcement' | 'award'>('urgent');

  // Co-Planning Archive & Role Authorities
  const [coplanView, setCoplanView] = useState<'all' | 'active' | 'archived'>('active');
  const currentPosLower = (currentUser?.position || '').toLowerCase();
  const isPlanAuthority =
    isBcnAdmin ||
    currentUser?.role === 'lead' ||
    (currentUser?.department === 'Nhân sự & Kế hoạch' &&
      (currentUser?.departmentRole === 'leader' ||
        currentUser?.departmentRole === 'vice_leader' ||
        currentPosLower.includes('trưởng') ||
        currentPosLower.includes('phó')));

  // Official Club Role Assignment States
  const [assigningUser, setAssigningUser] = useState<UserProfile | null>(null);
  const [assignDept, setAssignDept] = useState<DepartmentType>('Nhân sự & Kế hoạch');
  const [assignRoleLevel, setAssignRoleLevel] = useState<'leader' | 'vice_leader' | 'member'>('leader');
  const [assignRoleTitle, setAssignRoleTitle] = useState('Trưởng Ban Nhân sự & Kế hoạch');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSuccessMsg, setAssignSuccessMsg] = useState('');

  // Backup & Restore states
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<any>(null);
  const [pendingFileName, setPendingFileName] = useState('');
  const [restorePasscode, setRestorePasscode] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);

  const handleOpenAssignModal = (user: UserProfile) => {
    setAssigningUser(user);
    const dept = (user.department as DepartmentType) || 'Nhân sự & Kế hoạch';
    setAssignDept(dept);
    setAssignRoleLevel('leader');
    setAssignRoleTitle(`Trưởng Ban ${dept}`);
    setAssignSuccessMsg('');
  };

  const handleConfirmRoleAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningUser) return;
    setAssignLoading(true);
    try {
      const roleType = assignRoleLevel === 'leader' || assignRoleLevel === 'vice_leader' ? 'lead' : 'member';
      if (onAssignRole) {
        onAssignRole({
          targetUserId: assigningUser.id,
          department: assignDept,
          roleTitle: assignRoleTitle.trim(),
          departmentRole: assignRoleLevel,
          roleType
        });
      } else {
        const state = await assignRoleOnCloud({
          targetUserId: assigningUser.id,
          department: assignDept,
          roleTitle: assignRoleTitle.trim(),
          departmentRole: assignRoleLevel,
          roleType
        });
        if (state && onStateRestored) onStateRestored(state);
      }
      setAssignSuccessMsg(`Đã bổ nhiệm thành công ${assigningUser.name} làm ${assignRoleTitle}!`);
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => {
        setAssigningUser(null);
        setAssignSuccessMsg('');
        setAssignLoading(false);
      }, 1200);
    } catch {
      setAssignLoading(false);
    }
  };

  // Xử lý xác nhận xóa thành viên có lý do & phân luồng Account Chính duyệt
  const handleConfirmMemberDeletion = async () => {
    if (!userToDelete) return;
    const fullReason =
      deleteReasonCategory === 'Lý do khác'
        ? deleteReasonDetail.trim() || 'Lý do khác'
        : deleteReasonDetail.trim()
        ? `${deleteReasonCategory} — ${deleteReasonDetail.trim()}`
        : deleteReasonCategory;

    const isGraduated = deleteReasonCategory === 'Đã tốt nghiệp';

    if (isGraduated || isRootAccount) {
      if (onDeleteUser) {
        onDeleteUser(userToDelete.id);
      }
      setDeleteNotice(
        isGraduated
          ? `Đã xóa vĩnh viễn thành viên "${userToDelete.name}" (${userToDelete.studentId}) theo diện Đã tốt nghiệp.`
          : `Tài khoản Chính CLB đã xóa vĩnh viễn "${userToDelete.name}" (${userToDelete.studentId}).`
      );
    } else {
      const nowStr = new Date().toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const updatedUsers = safeUserList.map((u: any) =>
        u.id === userToDelete.id
          ? {
              ...u,
              pendingDeletion: {
                status: 'pending_root_approval',
                reasonCategory: deleteReasonCategory,
                reasonDetail: fullReason,
                requestedById: currentUser.id,
                requestedByName: `${currentUser.name} (${currentUser.position || 'BCN'})`,
                requestedAt: nowStr
              }
            }
          : u
      );
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'users', data: updatedUsers })
        });
      } catch (err) {
        console.error('Lỗi gửi đề nghị xóa:', err);
      }
      setDeleteNotice(
        `Đã gửi đề nghị xóa "${userToDelete.name}" (Lý do: ${fullReason}) lên Tài khoản Chính CLB phê duyệt!`
      );
    }

    setUserToDelete(null);
    setDeleteReasonDetail('');
  };

  const handleDownloadBackup = () => {
    const link = document.createElement('a');
    link.href = '/api/backup/download';
    link.setAttribute('download', `agu_club_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
  };

  const handleSelectBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFileName(file.name);
    setRestoreError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Dữ liệu không phải JSON hợp lệ');
        }
        setPendingRestoreData(parsed);
        setIsRestoreModalOpen(true);
      } catch (err: any) {
        setRestoreError('File không hợp lệ: ' + (err.message || 'Lỗi đọc file JSON'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreData) return;
    setIsRestoring(true);
    setRestoreError(null);
    try {
      const newState = await restoreCloudBackup(pendingRestoreData, restorePasscode);
      if (newState && onStateRestored) {
        onStateRestored(newState);
      }
      setRestoreSuccess('Cơ sở dữ liệu CLB đã được khôi phục thành công!');
      setIsRestoreModalOpen(false);
      setPendingRestoreData(null);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#3B6E47', '#D4AF37', '#10B981', '#FAF6EB']
      });
      setTimeout(() => setRestoreSuccess(null), 6000);
    } catch (err: any) {
      setRestoreError(err.message || 'Khôi phục dữ liệu thất bại. Vui lòng kiểm tra lại mật mã.');
    } finally {
      setIsRestoring(false);
    }
  };

  const availableBadges = [
    { name: 'Chiến Binh Deadline ⚡', points: 60, desc: 'Hoàn thành nhiệm vụ trước thời hạn với chất lượng vượt mong đợi' },
    { name: 'Bậc Thầy Đọc Đêm 🦉', points: 50, desc: 'Giữ chuỗi đọc sách trên 20 ngày và chăm chỉ chia sẻ trên E-News' },
    { name: 'Cây Bút Vàng E-News 🖋️', points: 80, desc: 'Có bài tản văn hoặc phóng sự chạm đến trái tim bạn đọc' },
    { name: 'Đại Sứ Sách Sinh Viên 🌟', points: 100, desc: 'Lan tỏa văn hóa đọc tích cực đến các khoa và câu lạc bộ bạn' },
    { name: 'Vua Cần Cù Hậu Cần 📦', points: 50, desc: 'Trực nhật, xếp sách và chuẩn bị sự kiện không một chút phàn nàn' },
    { name: 'Thuyền Trưởng Gắn Kết ⚓', points: 75, desc: 'Luôn lắng nghe, gắn kết các thành viên mới trong ban' }
  ];

  const deptMembers = safeUserList.filter(u => u.department === dispatchDept);
  const pendingReports = safeReports.filter(r => r.status === 'received' || r.status === 'processing');
  const pendingPlans = safePlans.filter(p => p.status === 'under_discussion');
  const archivedPlans = safePlans.filter(p => p.status === 'approved' || Boolean(p.archivedAt));

  const handleQuickDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchTitle.trim()) return;

    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#D4AF37', '#10B981', '#34D399', '#FBBF24']
    });

    onAddTask({
      title: dispatchTitle,
      assignedToDept: dispatchDept,
      assignedToMemberName: dispatchAssignee,
      deadline: dispatchDeadline,
      rewardPoints: dispatchPoints,
      status: 'todo',
      description: dispatchDesc || `Chỉ đạo trực tiếp từ Ban Chủ Nhiệm gửi đến ${dispatchDept}.`
    });

    setDispatchTitle('');
    setDispatchDesc('');
    setDispatchSuccessMsg(true);
    setTimeout(() => setDispatchSuccessMsg(false), 3500);
  };

  const handlePlanFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPlanUploadError('');
    setIsUploadingPlanFile(true);
    try {
      const dataUrl = await readFileAsDataUrl(file, true);
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      setPlanAttachmentUrl(dataUrl);
      setPlanAttachmentName(file.name);
      setPlanAttachmentType(isPdf ? 'pdf' : 'image');
    } catch (err: any) {
      setPlanUploadError(err?.message || 'Không thể tải tệp kế hoạch lên.');
    } finally {
      setIsUploadingPlanFile(false);
      e.target.value = '';
    }
  };

  const [archiveDirectly, setArchiveDirectly] = useState(false);

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planTitle.trim()) return;

    confetti({ particleCount: 60, spread: 55, origin: { y: 0.6 } });

    const nowDateStr = new Date().toLocaleDateString('vi-VN');
    const shouldArchive = archiveDirectly && isBcnAdmin;

    onAddPlan({
      title: planTitle.trim(),
      proposedBy: currentUser.name,
      proposedById: currentUser.id,
      department: planDept,
      assignedDept: planDept,
      description: planDesc.trim(),
      timeline: planTimeline,
      targetAudience: planAudience,
      priority: planPriority,
      status: shouldArchive ? 'approved' : 'under_discussion',
      archivedAt: shouldArchive ? nowDateStr : undefined,
      createdAt: nowDateStr,
      budgetEstimate: planBudget,
      actionItems: planActionItems.split(',').map(s => s.trim()).filter(Boolean),
      attachmentUrl: planAttachmentUrl || undefined,
      attachmentName: planAttachmentName || undefined,
      attachmentType: planAttachmentUrl ? planAttachmentType : undefined
    });

    setIsPlanModalOpen(false);
    setPlanTitle('');
    setPlanDesc('');
    setPlanAttachmentUrl('');
    setPlanAttachmentName('');
    setArchiveDirectly(false);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    onAddTask({
      title: taskTitle,
      assignedToDept: taskDept,
      assignedToMemberName: taskAssignee,
      deadline: taskDeadline,
      rewardPoints: taskPoints,
      status: 'todo',
      description: taskDesc
    });

    setIsTaskModalOpen(false);
    setTaskTitle('');
    setTaskDesc('');
  };

  const handleAwardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = selectedUserToAward || safeUserList[0]?.id;
    const recipient = safeUserList.find(u => u.id === targetId);
    if (!recipient) return;

    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#F59E0B', '#10B981', '#EC4899', '#6366F1']
    });

    onAwardBadge(recipient.id, selectedBadge, bonusPoints);
  };

  const handleIssueDecreeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decreeTitle.trim() || !decreeContent.trim()) return;

    confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });

    onIssueDecree({
      title: decreeTitle,
      content: decreeContent,
      issuedBy: currentUser.name,
      type: decreeType,
      pinToIsland: true
    });

    setDecreeTitle('');
    setDecreeContent('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* PREMIER EXECUTIVE BANNER */}
      <div className="relative p-[2px] rounded-3xl bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-500 shadow-xl overflow-hidden group">
        <div className="relative bg-gradient-to-br from-[#122818] via-[#17301F] to-[#0E1F13] text-white p-5 sm:p-7 rounded-[22px]">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1

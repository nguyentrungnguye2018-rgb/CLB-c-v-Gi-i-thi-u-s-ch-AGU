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
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 text-stone-950 text-[11px] font-black uppercase tracking-wider shadow-md border border-amber-200">
                  <Crown className="w-3.5 h-3.5 fill-stone-950" />
                  {isBcnAdmin ? 'Kế Hoạch & Ban Chủ Nhiệm ★' : 'Kế Hoạch Hoạt Động & Bảng Việc 4 Ban'}
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/40">
                  <FolderArchive className="w-3 h-3 text-emerald-300" />
                  Kho Kế Hoạch Nguyên Bản (PDF / Ảnh)
                </span>

                {isRootAccount && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-300/50">
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    Tài Khoản Gốc Bất Biến
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-bold font-serif-vintage tracking-tight text-white flex items-center gap-2.5">
                  {isBcnAdmin ? 'Trung Tâm Kế Hoạch & Điều Hành Ban Chủ Nhiệm' : 'Kho Kế Hoạch CLB & Nhiệm Vụ 4 Ban'}
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed mt-1">
                  {isBcnAdmin
                    ? 'Quản trị kế hoạch nguyên bản (PDF/Ảnh), phê duyệt đề án, phân công nhiệm vụ hỏa tốc 4 ban và điều hành câu lạc bộ.'
                    : 'Xem các đề án hoạt động chính thức của CLB (kèm tệp PDF/hình ảnh nguyên bản), tham gia biểu quyết và theo dõi bảng việc 4 ban.'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-emerald-300 font-semibold flex items-center gap-1">
                    <Compass className="w-3 h-3" /> Tổng Kế Hoạch
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">{safePlans.length} đề án</div>
                </div>

                <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                    <FolderArchive className="w-3 h-3" /> Kho Lưu Trữ
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">{archivedPlans.length} đã duyệt</div>
                </div>

                <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-teal-300 font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Nhiệm Vụ 4 Ban
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">{safeTasks.length} đầu việc</div>
                </div>

                <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-rose-300 font-semibold flex items-center gap-1">
                    <Users2 className="w-3 h-3" /> Nhân Sự CLB
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">{safeUserList.length} thành viên</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 w-full lg:w-auto shrink-0">
              {isPlanAuthority && (
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  Tải Kế Hoạch Lên (PDF / Ảnh)
                </button>
              )}

              {isRootAccount && (
                <button
                  type="button"
                  onClick={onOpenRecruitment}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-amber-300 border border-amber-400/40 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Users2 className="w-3.5 h-3.5" />
                  Mở Cổng Tuyển Quân 4 Ban
                </button>
              )}

              {isBcnAdmin && (
                <button
                  type="button"
                  onClick={onOpenSuccession}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  Bàn Giao Nhiệm Kỳ BCN
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('evaluations')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-300/50 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-amber-300" />
                Đánh Giá Năng Lực Thành Viên
              </button>

              {onOpenHallOfFame && (
                <button
                  type="button"
                  onClick={onOpenHallOfFame}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-emerald-300" />
                  Bảo Tàng Thành Tựu
                </button>
              )}

              {isBcnAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('backup')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700/60 hover:bg-emerald-600/80 text-amber-300 border border-emerald-400/40 flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Database className="w-3.5 h-3.5 text-amber-300" />
                  Xuất/Nhập Dữ Liệu Dự Phòng
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EXECUTIVE NAVIGATION TABS BAR */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-[#DCD3C1]">
        {isBcnAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('omnipotent')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'omnipotent'
                ? 'bg-gradient-to-r from-[#17301F] to-[#20442B] text-amber-300 shadow-md border-b-2 border-amber-400'
                : 'bg-[#F2ECE1] text-[#4B6350] hover:bg-[#E7DFC] hover:text-[#1F3D26]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Kế Hoạch & Điều Hành BCN</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400 text-stone-900 font-extrabold ml-1">BCN</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('evaluations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'evaluations'
              ? 'bg-[#C8532B] text-white shadow-md border-b-2 border-[#382215]'
              : 'bg-[#F2ECE1] text-[#382215] hover:bg-[#EAD8B3] hover:text-[#8C3B1E]'
          }`}
        >
          <ClipboardCheck className={`w-3.5 h-3.5 ${activeTab === 'evaluations' ? 'text-[#FFE29A]' : 'text-[#C8532B]'}`} />
          <span>Đánh Giá Năng Lực Thành Viên ({safeEvaluations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('coplan')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'coplan'
              ? 'bg-[#23432B] text-white shadow-xs'
              : 'bg-[#F2ECE1] text-[#4B6350] hover:bg-[#E7DFC] hover:text-[#1F3D26]'
          }`}
        >
          <FolderArchive className="w-3.5 h-3.5 text-amber-400" />
          <span>Kho Lưu Trữ Kế Hoạch & Đề Án ({safePlans.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'tasks'
              ? 'bg-[#23432B] text-white shadow-xs'
              : 'bg-[#F2ECE1] text-[#4B6350] hover:bg-[#E7DFC] hover:text-[#1F3D26]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Bảng Việc 4 Ban ({safeTasks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('decrees')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'decrees'
              ? 'bg-[#C8532B] text-white shadow-xs'
              : 'bg-[#F2ECE1] text-[#8C3B1E] hover:bg-[#E7DFC] hover:text-[#382215]'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5 text-amber-300" />
          <span>Sắc Lệnh Thông Tri ({safeDecrees.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('awards')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'awards'
              ? 'bg-[#23432B] text-white shadow-xs'
              : 'bg-[#F2ECE1] text-[#4B6350] hover:bg-[#E7DFC] hover:text-[#1F3D26]'
          }`}
        >
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span>Khen Thưởng Huân Chương</span>
        </button>

        {isBcnAdmin && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'members'
                  ? 'bg-[#23432B] text-white shadow-xs'
                  : 'bg-[#F2ECE1] text-[#4B6350] hover:bg-[#E7DFC] hover:text-[#1F3D26]'
              }`}
            >
              <UserCog className="w-3.5 h-3.5 text-emerald-400" />
              <span>Quản Trị Nhân Sự ({safeUserList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('backup')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'backup'
                  ? 'bg-gradient-to-r from-[#17301F] to-[#20442B] text-amber-300 shadow-md border-b-2 border-amber-400'
                  : 'bg-[#F2ECE1] text-[#4B6350] hover:bg-[#E7DFC] hover:text-[#1F3D26]'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>Xuất/Nhập Dữ Liệu Dự Phòng</span>
            </button>
          </>
        )}
      </div>

      {/* TAB: ĐÁNH GIÁ NĂNG LỰC THÀNH VIÊN */}
      {activeTab === 'evaluations' && (
        <MemberEvaluationSection
          currentUser={currentUser}
          isBcnAdmin={isBcnAdmin}
          userList={safeUserList}
          evaluations={safeEvaluations}
          onAddEvaluation={(newEval) => {
            if (onAddEvaluation) onAddEvaluation(newEval);
          }}
          onUpdateEvaluation={onUpdateEvaluation}
          onDeleteEvaluation={onDeleteEvaluation}
          onRemoveBadge={onRemoveBadge}
          onExecuteEvaluationAction={onExecuteEvaluationAction}
        />
      )}

      {/* TAB 1: KẾ HOẠCH & BAN CHỦ NHIỆM */}
      {activeTab === 'omnipotent' && isBcnAdmin && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div className="relative p-[1.5px] rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 shadow-md">
                <div className="bg-[#FAF7F0] p-5 sm:p-6 rounded-[14.5px] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E3DAC7] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-[#1E3A24] font-serif-vintage">
                          Phân Công Công Việc Hỏa Tốc
                        </h3>
                        <p className="text-[11px] text-[#557058]">
                          Chỉ huy tối cao: giao chỉ đạo & cộng điểm Lửa cống hiến tức thì
                        </p>
                      </div>
                    </div>
                  </div>

                  {dispatchSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span><strong>Thành công:</strong> Nhiệm vụ đã được phân công và thông báo đến ban tiếp nhận!</span>
                    </div>
                  )}

                  <form onSubmit={handleQuickDispatch} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-[#2A4831] mb-1.5">
                        1. Chọn Ban Chuyên Môn Tiếp Nhận Chỉ Đạo:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(['Truyền thông', 'Nội dung', 'Nhân sự & Kế hoạch', 'Hậu cần'] as DepartmentType[]).map(dept => {
                          const isSel = dispatchDept === dept;
                          return (
                            <button
                              key={dept}
                              type="button"
                              onClick={() => {
                                setDispatchDept(dept);
                                const firstMember = safeUserList.find(u => u.department === dept);
                                setDispatchAssignee(firstMember ? firstMember.name : 'Trưởng Ban Điều Phối');
                              }}
                              className={`p-2 rounded-xl text-left border text-xs font-bold transition cursor-pointer flex flex-col justify-between ${
                                isSel
                                  ? 'bg-[#1E3A24] text-white border-[#1E3A24] shadow-xs ring-2 ring-emerald-400/50'
                                  : 'bg-white text-[#4A644F] border-[#DED4C1] hover:border-emerald-600'
                              }`}
                            >
                              <span className="truncate">{dept}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#2A4831] mb-1">
                          2. Người Phụ Trách / Trực Tiếp Thực Hiện:
                        </label>
                        <select
                          value={dispatchAssignee}
                          onChange={(e) => setDispatchAssignee(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#D5CBBC] text-xs font-medium text-stone-800"
                        >
                          <option value="Trưởng Ban & Toàn Thể Thành Viên">Toàn Ban Cùng Phối Hợp</option>
                          {deptMembers.map(m => (
                            <option key={m.id} value={m.name}>
                              {m.name} {m.nickname ? `(${m.nickname})` : ''} - MSSV {m.studentId}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2A4831] mb-1">
                          3. Thời Hạn Thực Hiện:
                        </label>
                        <input
                          type="text"
                          value={dispatchDeadline}
                          onChange={(e) => setDispatchDeadline(e.target.value)}
                          placeholder="24 Giờ Tới, 3 Ngày, Trong Tuần Này..."
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#D5CBBC] text-xs font-semibold text-stone-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#2A4831] mb-1">
                        4. Tên Nhiệm Vụ & Yêu Cầu Cốt Lõi:
                      </label>
                      <input
                        type="text"
                        value={dispatchTitle}
                        onChange={(e) => setDispatchTitle(e.target.value)}
                        placeholder="Ví dụ: Thiết kế poster Tọa đàm Sách Tháng 11..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#D5CBBC] text-xs font-semibold text-stone-900"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-[#2A4831] mb-1">
                          5. Chỉ Đạo Chi Tiết (Tùy chọn):
                        </label>
                        <input
                          type="text"
                          value={dispatchDesc}
                          onChange={(e) => setDispatchDesc(e.target.value)}
                          placeholder="Nhắc nhở kiểm tra tiến độ..."
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#D5CBBC] text-xs font-medium text-stone-800"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2A4831] mb-1">
                          Điểm Lửa Thưởng:
                        </label>
                        <select
                          value={dispatchPoints}
                          onChange={(e) => setDispatchPoints(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#D5CBBC] text-xs font-bold text-amber-700"
                        >
                          <option value={30}>+30 Điểm Lửa</option>
                          <option value={50}>+50 Điểm Lửa</option>
                          <option value={80}>+80 Điểm Lửa</option>
                          <option value={100}>+100 Điểm Lửa</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-[#17301F] via-[#20442B] to-[#17301F] text-amber-300 border border-amber-400/40 shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>BAN HÀNH CHỈ ĐẠO & PHÂN CÔNG HỎA TỐC</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="relative p-[1.5px] rounded-2xl bg-gradient-to-r from-amber-400 via-emerald-500 to-teal-500 shadow-md">
                <div className="bg-[#FAF7F0] p-5 sm:p-6 rounded-[14.5px] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E3DAC7] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-emerald-700 text-white flex items-center justify-center font-bold">
                        <FolderArchive className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-[#1E3A24] font-serif-vintage">
                          Kho Lưu Trữ Kế Hoạch & Đề Án
                        </h3>
                        <p className="text-[11px] text-[#557058]">
                          Tải lên bản gốc PDF / Hình ảnh & phê duyệt đề án
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPlanModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-[#1E3A24] text-amber-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <FileUp className="w-3 h-3" />
                      <span>Tải Lên</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div
                      onClick={() => { setActiveTab('coplan'); setCoplanView('active'); }}
                      className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 cursor-pointer"
                    >
                      <div className="text-[10px] font-bold text-amber-800 uppercase">Chờ Phê Duyệt</div>
                      <div className="text-sm font-extrabold text-stone-900 mt-0.5">{pendingPlans.length} đề án mới</div>
                    </div>
                    <div
                      onClick={() => { setActiveTab('coplan'); setCoplanView('archived'); }}
                      className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 cursor-pointer"
                    >
                      <div className="text-[10px] font-bold text-emerald-800 uppercase">Kho Đã Lưu Trữ</div>
                      <div className="text-sm font-extrabold text-stone-900 mt-0.5">{archivedPlans.length} bản gốc</div>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1">
                    {pendingPlans.length === 0 ? (
                      <div className="py-8 px-4 text-center rounded-xl bg-white border border-dashed border-[#DED4C1] space-y-1">
                        <Inbox className="w-7 h-7 text-stone-400 mx-auto" />
                        <div className="font-bold text-xs text-stone-800">
                          Hòm thư chờ duyệt kế hoạch hiện đang trống
                        </div>
                      </div>
                    ) : (
                      pendingPlans.map((p) => (
                        <div key={p.id} className="bg-white p-3 rounded-xl border border-[#DED4C1] space-y-2 shadow-2xs">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                                {p.department}
                              </span>
                              <h4 className="font-bold text-xs text-stone-900 mt-1 truncate">{p.title}</h4>
                              <p className="text-[10px] text-stone-500">Đề xuất: {p.proposedBy} • {p.timeline}</p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => onUpdatePlanStatus(p.id, 'approved')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Duyệt Lưu Kho
                              </button>
                              {onDeletePlan && (
                                <button
                                  type="button"
                                  onClick={() => onDeletePlan(p.id)}
                                  className="p-1 rounded-lg text-stone-400 hover:text-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('coplan')}
                    className="w-full py-2 px-3 rounded-xl bg-[#23432B] text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    <span>Mở Toàn Bộ Kho Lưu Trữ Kế Hoạch ({safePlans.length})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {onOpenReports && (
            <div className="p-4 rounded-2xl bg-white border border-[#DED4C1] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FAF5E8] border border-amber-300 text-amber-700 flex items-center justify-center font-bold">
                  🛡️
                </div>
                <div>
                  <span className="font-bold text-[#1E3A24]">Hòm Thư Báo Cáo Ẩn Danh Độc Lập:</span>
                  <span className="text-stone-600 ml-1">Hiện có {pendingReports.length} báo cáo đang chờ xử lý.</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenReports}
                className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Mở Tab Báo Cáo Ẩn Danh ({pendingReports.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB: QUẢN TRỊ NHÂN SỰ & TÀI KHOẢN */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-[#19321E] via-[#234529] to-[#1C3621] text-white p-5 rounded-2xl border border-[#3E6547] shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-amber-300" />
                <h3 className="text-lg font-bold font-serif-vintage text-white">
                  Quản Trị Nhân Sự & Quyền Quản Lý Tài Khoản CLB
                </h3>
              </div>
              <p className="text-xs text-emerald-100/80 leading-relaxed">
                Khi xóa nhân sự, hệ thống yêu cầu chọn lý do rõ ràng: diện <strong>Đã tốt nghiệp</strong> được xóa vĩnh viễn ngay, các trường hợp khác trình lên <strong>Tài khoản Chính CLB</strong> phê duyệt.
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenSuccession}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
            >
              <Crown className="w-4 h-4 text-stone-900" />
              <span>Bàn Giao Nhiệm Kỳ Đích Danh</span>
            </button>
          </div>

          {deleteNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{deleteNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteNotice('')}
                className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Search & Filter */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#DFD6C3] space-y-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Tìm kiếm tài khoản theo Họ tên, Nickname, MSSV, Khoa..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#C7BDB0] bg-[#FAF7F0] text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {[
                { id: 'all', label: `Tất cả (${safeUserList.length})` },
                { id: 'pending', label: `Chờ Duyệt Ban (${safeUserList.filter(u => u.departmentStatus === 'pending_approval').length})` },
                { id: 'bcn', label: 'BCN Đương Nhiệm 👑' },
                { id: 'Truyền thông', label: 'Ban Truyền thông' },
                { id: 'Nội dung', label: 'Ban Nội dung' },
                { id: 'Nhân sự & Kế hoạch', label: 'Ban Nhân sự & Kế hoạch' },
                { id: 'Hậu cần', label: 'Ban Hậu cần' }
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setMemberFilterDept(pill.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                    memberFilterDept === pill.id
                      ? 'bg-[#23432B] text-white'
                      : 'bg-[#FAF7F0] text-stone-600 border border-[#E3DAC8]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Member List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {safeUserList
              .filter((user) => {
                if (!user) return false;
                if (memberFilterDept === 'pending' && user.departmentStatus !== 'pending_approval') return false;
                if (memberFilterDept === 'bcn' && user.adminType !== 'bcn_elected' && user.adminType !== 'master_root') return false;
                if (
                  memberFilterDept !== 'all' &&
                  memberFilterDept !== 'pending' &&
                  memberFilterDept !== 'bcn' &&
                  user.department !== memberFilterDept
                ) {
                  return false;
                }

                if (!memberSearchQuery.trim()) return true;
                const q = memberSearchQuery.toLowerCase();
                return (
                  (user.name || '').toLowerCase().includes(q) ||
                  (user.nickname || '').toLowerCase().includes(q) ||
                  (user.studentId || '').toLowerCase().includes(q) ||
                  (user.faculty || '').toLowerCase().includes(q) ||
                  (user.position || '').toLowerCase().includes(q)
                );
              })
              .map((user) => {
                const isRoot = user.adminType === 'master_root' || user.id === 'bcn-root';
                const isPendingDept = user.departmentStatus === 'pending_approval';
                const userBadges = Array.isArray(user.badges) ? user.badges : [];

                return (
                  <div
                    key={user.id}
                    className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                      isRoot
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-white border-[#DFD6C3]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={user.avatar || '/assets/aistudio/TUYE__N_THA_NH_VIE_N_778c37b9.png'}
                        alt={user.name}
                        className="w-12 h-12 rounded-xl object-cover ring-2 ring-[#3B6E47]/30 shrink-0"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-xs sm:text-sm text-[#1E3A24] truncate">
                            {user.name}
                          </h4>
                          {isRoot && (
                            <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold shrink-0">
                              Gốc Vĩnh Viễn
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-stone-700 font-medium mt-0.5 truncate">
                          {user.position || `Ban ${user.department}`}
                        </div>

                        <div className="text-[10px] text-stone-500 mt-0.5 truncate">
                          MSSV: <span className="font-mono font-bold text-stone-700">{user.studentId}</span> • {user.faculty}
                        </div>
                      </div>
                    </div>

                    {userBadges.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {userBadges.map((badge, bIdx) => (
                          <span
                            key={`${user.id}-mgr-badge-${bIdx}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-950 border border-amber-300 text-[10px] font-bold"
                          >
                            <Award className="w-3 h-3 text-amber-700 shrink-0" />
                            <span>{badge}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-[10px]">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-700 font-bold flex items-center gap-0.5">
                          <Flame className="w-3 h-3 text-amber-600" />
                          {user.readingStreak || 0} ngày streak
                        </span>
                        <span>•</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          {user.meritPoints || 0} điểm lửa
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isPendingDept && canApproveDept && onApproveDepartment && (
                          <button
                            type="button"
                            onClick={() => {
                              const deptToApprove = user.requestedDepartment || user.department || 'Nội dung';
                              onApproveDepartment(user.id, deptToApprove, `Được duyệt vào Ban ${deptToApprove}`);
                              setDeleteNotice(`Đã duyệt "${user.name}" vào Ban ${deptToApprove} thành công!`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#1E3A24] text-amber-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3 text-emerald-300" />
                            <span>Duyệt Vào Ban</span>
                          </button>
                        )}

                        {canAppointDeptRole && !isRoot && (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(user)}
                            className="px-2.5 py-1 rounded-lg text-emerald-800 bg-emerald-50 border border-emerald-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Crown className="w-3 h-3 text-amber-600" />
                            <span>Chọn Trưởng/Phó Ban</span>
                          </button>
                        )}

                        {!isRoot && (
                          <button
                            type="button"
                            onClick={() => {
                              setUserToDelete(user);
                              setDeleteReasonCategory('Đã tốt nghiệp');
                              setDeleteReasonDetail('');
                            }}
                            className="px-2.5 py-1 rounded-lg text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 transition font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            title="Xóa thành viên (Bắt buộc chọn lý do)"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Xóa</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Delete Confirmation Modal with Reason Selection */}
          {userToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
              <div className="bg-[#FAF7F0] rounded-2xl border-2 border-rose-400 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="bg-rose-800 text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-300" />
                    <h4 className="font-bold text-sm">Xác Nhận Lý Do Xóa Thành Viên</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUserToDelete(null)}
                    className="text-white/80 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 space-y-3.5 text-xs text-stone-700">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#DFD6C3]">
                    <img
                      src={userToDelete.avatar || '/assets/aistudio/TUYE__N_THA_NH_VIE_N_778c37b9.png'}
                      alt={userToDelete.name}
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-[#1E3A24] truncate">{userToDelete.name}</div>
                      <div className="text-[11px] text-stone-500">
                        MSSV: <span className="font-mono font-bold">{userToDelete.studentId}</span> • {userToDelete.department}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#1E3A24] mb-1">1. Chọn lý do xóa thành viên *</label>
                    <select
                      value={deleteReasonCategory}
                      onChange={(e) => setDeleteReasonCategory(e.target.value as DeleteReasonCategory)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-bold text-xs"
                    >
                      <option value="Đã tốt nghiệp">🎓 Đã tốt nghiệp (Được xóa vĩnh viễn ngay)</option>
                      <option value="Xin nghỉ sinh hoạt / Chuyển công tác">📝 Xin nghỉ sinh hoạt / Chuyển công tác</option>
                      <option value="Vi phạm nội quy / Không tham gia hoạt động">⚠️ Vi phạm nội quy / Không tham gia hoạt động</option>
                      <option value="Tài khoản ảo / Nhập trùng hồ sơ">🔄 Tài khoản ảo / Nhập trùng hồ sơ</option>
                      <option value="Lý do khác">✍️ Lý do khác...</option>
                    </select>
                  </div>

                  {deleteReasonCategory === 'Đã tốt nghiệp' ? (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-[11px] flex items-start gap-2">
                      <GraduationCap className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>Diện <strong>Đã tốt nghiệp</strong> sẽ được xóa vĩnh viễn ngay khỏi danh sách CLB.</span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-[11px] flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <span>
                        {isRootAccount
                          ? 'Tài khoản Chính CLB có quyền duyệt xóa trực tiếp.'
                          : 'Với lý do này, hồ sơ sẽ trình lên Tài khoản Chính CLB (bcn-root) phê duyệt trước khi xóa.'}
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-[#1E3A24] mb-1">2. Ghi chú chi tiết (Tùy chọn)</label>
                    <input
                      type="text"
                      value={deleteReasonDetail}
                      onChange={(e) => setDeleteReasonDetail(e.target.value)}
                      placeholder="Nhập ghi chú thêm..."
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setUserToDelete(null)}
                      className="px-4 py-2 rounded-xl bg-stone-200 text-stone-700 font-semibold cursor-pointer"
                    >
                      Hủy Bỏ
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmMemberDeletion}
                      className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>
                        {deleteReasonCategory === 'Đã tốt nghiệp' || isRootAccount
                          ? 'Xác Nhận Xóa Vĩnh Viễn'
                          : 'Gửi Account Chính Duyệt'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Role Appointment Modal */}
          {assigningUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
              <div className="bg-[#FAF7F0] rounded-2xl border-2 border-emerald-600 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="bg-[#1C3621] text-white p-4.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Crown className="w-5 h-5 text-amber-300" />
                    <h4 className="font-bold text-sm sm:text-base font-serif-vintage">
                      Chọn Trưởng Ban / Phó Ban Chuyên Môn
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssigningUser(null)}
                    className="p-1 rounded-lg text-white/80 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleConfirmRoleAssignment} className="p-5 space-y-4 text-xs text-stone-700">
                  {assignSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{assignSuccessMsg}</span>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-[#1E3A24] mb-1.5">Chọn Ban Chuyên Môn Bổ Nhiệm:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Nhân sự & Kế hoạch', 'Nội dung', 'Truyền thông', 'Hậu cần'] as DepartmentType[]).map((dept) => (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => {
                            setAssignDept(dept);
                            setAssignRoleTitle(
                              assignRoleLevel === 'leader'
                                ? `Trưởng Ban ${dept}`
                                : assignRoleLevel === 'vice_leader'
                                ? `Phó Ban ${dept}`
                                : `Thành viên Ban ${dept}`
                            );
                          }}
                          className={`p-2.5 rounded-xl border text-left font-bold text-xs cursor-pointer ${
                            assignDept === dept
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-500'
                              : 'bg-white text-stone-700 border-stone-200'
                          }`}
                        >
                          {dept}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#1E3A24] mb-1.5">Cấp Bậc Bổ Nhiệm:</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAssignRoleLevel('leader');
                          setAssignRoleTitle(`Trưởng Ban ${assignDept}`);
                        }}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer ${
                          assignRoleLevel === 'leader'
                            ? 'bg-amber-100 text-amber-950 border-amber-500'
                            : 'bg-white text-stone-700 border-stone-200'
                        }`}
                      >
                        👑 Trưởng Ban
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAssignRoleLevel('vice_leader');
                          setAssignRoleTitle(`Phó Ban ${assignDept}`);
                        }}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer ${
                          assignRoleLevel === 'vice_leader'
                            ? 'bg-blue-100 text-blue-950 border-blue-500'
                            : 'bg-white text-stone-700 border-stone-200'
                        }`}
                      >
                        ⭐ Phó Ban
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAssignRoleLevel('member');
                          setAssignRoleTitle(`Thành viên Ban ${assignDept}`);
                        }}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer ${
                          assignRoleLevel === 'member'
                            ? 'bg-stone-200 text-stone-900 border-stone-400'
                            : 'bg-white text-stone-700 border-stone-200'
                        }`}
                      >
                        Thành Viên
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#1E3A24] mb-1">Danh Xưng Chức Vụ Hiển Thị:</label>
                    <input
                      type="text"
                      required
                      value={assignRoleTitle}
                      onChange={(e) => setAssignRoleTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-semibold text-xs"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={() => setAssigningUser(null)}
                      className="px-4 py-2 rounded-xl bg-stone-200 text-stone-700 font-semibold cursor-pointer"
                    >
                      Hủy Bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={assignLoading}
                      className="px-5 py-2 rounded-xl bg-[#17301F] text-amber-300 font-bold cursor-pointer"
                    >
                      {assignLoading ? 'Đang Ban Hành...' : 'Xác Nhận Bổ Nhiệm'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: KHO LƯU TRỮ KẾ HOẠCH */}
      {activeTab === 'coplan' && (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#17331D] via-[#24472B] to-[#1E3B24] text-white border border-[#3E6847] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base font-serif-vintage text-white">
                  Kho Lưu Trữ Kế Hoạch Đã Duyệt & Cổng Nộp Đề Án
                </h3>
              </div>
              <p className="text-xs text-emerald-100/80">
                Khu vực lưu trữ các đề án đã được thông qua chính thức và tiếp nhận đề án mới.
              </p>
            </div>

            {isPlanAuthority && (
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(true)}
                className="px-4 py-2 rounded-xl font-bold text-xs bg-amber-500 text-stone-900 flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Nộp Đề Án Kế Hoạch Mới</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 border-b border-[#DFD6C3] pb-2">
            <button
              type="button"
              onClick={() => setCoplanView('active')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                coplanView === 'active' ? 'bg-[#23432B] text-white' : 'bg-white text-stone-600 border border-stone-200'
              }`}
            >
              Đang Lấy Ý Kiến ({safePlans.filter(p => p.status !== 'approved').length})
            </button>

            <button
              type="button"
              onClick={() => setCoplanView('archived')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                coplanView === 'archived' ? 'bg-amber-700 text-white' : 'bg-white text-amber-900 border border-amber-300'
              }`}
            >
              Kho Đã Duyệt ({safePlans.filter(p => p.status === 'approved' || p.archivedAt).length})
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {safePlans
              .filter(p => (coplanView === 'archived' ? p.status === 'approved' || p.archivedAt : p.status !== 'approved'))
              .map((plan) => {
                const totalVotes = (plan.votesAgree || 0) + (plan.votesDisagree || 0);
                const agreePercent = totalVotes > 0 ? Math.round(((plan.votesAgree || 0) / totalVotes) * 100) : 100;

                return (
                  <div
                    key={plan.id}
                    className="p-5 rounded-2xl border bg-white border-[#DAD0BD] flex flex-col justify-between space-y-3.5"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E5F0E4] text-[#244A2B]">
                          {plan.department}
                        </span>
                        {onDeletePlan && isBcnAdmin && (
                          <button
                            type="button"
                            onClick={() => onDeletePlan(plan.id)}
                            className="p-1 text-stone-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <h4 className="font-bold text-base text-[#1E3A24] font-serif-vintage">{plan.title}</h4>
                      <p className="text-xs text-[#4F6854]">{plan.description}</p>

                      {plan.attachmentUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewPlanAttachment({
                              title: plan.title,
                              url: plan.attachmentUrl!,
                              name: plan.attachmentName || plan.title,
                              type: plan.attachmentType || 'pdf'
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-[#23432B] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-amber-300" />
                          <span>Xem Bản Gốc Đính Kèm</span>
                        </button>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#EDE5D6] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-bold text-stone-600">Đồng thuận ({agreePercent}%)</span>
                        <span className="text-[11px] text-stone-500">
                          {plan.votesAgree || 0} tán thành • {plan.votesDisagree || 0} ý kiến
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onVotePlan(plan.id, 'agree')}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-white hover:bg-stone-50 text-stone-700 border-stone-200 cursor-pointer flex items-center gap-1"
                          >
                            <ThumbsUp className="w-3 h-3 text-emerald-600" />
                            <span>Tán thành</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDislikingPlan(plan);
                              setDislikeReason('');
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-white hover:bg-stone-50 text-stone-700 border-stone-200 cursor-pointer flex items-center gap-1"
                          >
                            <ThumbsDown className="w-3 h-3 text-rose-600" />
                            <span>Góp ý ẩn danh</span>
                          </button>
                        </div>

                        {isPlanAuthority && (
                          <select
                            value={plan.status}
                            onChange={(e) => onUpdatePlanStatus(plan.id, e.target.value as ClubPlan['status'])}
                            className="px-2 py-1 rounded-lg bg-stone-100 border border-stone-300 text-[11px] font-bold"
                          >
                            <option value="under_discussion">Lấy ý kiến</option>
                            <option value="approved">Thông qua & Lưu trữ ★</option>
                            <option value="in_action">Thực hiện</option>
                            <option value="completed">Hoàn tất</option>
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 3: BẢNG NHIỆM VỤ 4 BAN */}
      {activeTab === 'tasks' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-[#DAD0BD]">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#1E3A24] font-serif-vintage">
                Bảng Phân Công Nhiệm Vụ 4 Ban Chuyên Môn
              </h3>
            </div>
            {isBcnAdmin && (
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-[#23432B] text-[#FAF6EB] flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Giao Việc Mới</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {safeTasks.map((task) => (
              <div key={task.id} className="bg-white p-4 rounded-2xl border border-[#DAD0BD] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FAF5E8] text-[#334E39]">
                    {task.assignedToDept}
                  </span>
                  {onDeleteTask && isBcnAdmin && (
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1 text-stone-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h4 className="font-bold text-sm text-[#1E3A24] font-serif-vintage">{task.title}</h4>
                <div className="text-[11px] text-stone-500">
                  Phụ trách: <strong>{task.assignedToMemberName}</strong> • Hạn: <strong>{task.deadline}</strong>
                </div>

                <div className="pt-2 border-t border-[#EAE3D4] flex items-center justify-between">
                  {task.status !== 'done' && isBcnAdmin ? (
                    <button
                      type="button"
                      onClick={() => onCompleteTaskAndReward(task.id, task.assignedToMemberName, task.rewardPoints)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Duyệt Xong & Thưởng
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-700 font-bold">
                      {task.status === 'done' ? '✓ Đã hoàn thành' : 'Đang thực hiện'}
                    </span>
                  )}

                  <select
                    value={task.status}
                    onChange={(e) => onUpdateTaskStatus(task.id, e.target.value as ClubTask['status'])}
                    className="text-[10px] font-semibold px-2 py-1 rounded bg-stone-100 border border-stone-300"
                  >
                    <option value="todo">Chờ làm</option>
                    <option value="in_progress">Đang làm</option>
                    <option value="review">Chờ BCN duyệt</option>
                    {isBcnAdmin && <option value="done">Hoàn thành</option>}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: KHEN THƯỞNG HUÂN CHƯƠNG */}
      {activeTab === 'awards' && (
        <div className="bg-white p-5 rounded-2xl border border-[#DAD0BD] space-y-4">
          <h3 className="font-bold text-base text-[#1E3A24] font-serif-vintage">
            Trao Tặng Huân Chương & Vinh Danh Sinh Viên Cống Hiến
          </h3>
          <form onSubmit={handleAwardSubmit} className="space-y-4 max-w-xl">
            <select
              value={selectedUserToAward}
              onChange={(e) => setSelectedUserToAward(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#FAF6EE] border border-[#D5CBBC] text-xs"
            >
              {safeUserList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} - {u.department} • MSSV: {u.studentId}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableBadges.map((b) => (
                <div
                  key={b.name}
                  onClick={() => {
                    setSelectedBadge(b.name);
                    setBonusPoints(b.points);
                  }}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer ${
                    selectedBadge === b.name ? 'border-amber-500 bg-amber-50' : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="font-bold text-stone-900">{b.name} (+{b.points}đ)</div>
                  <div className="text-[10px] text-stone-500 mt-1">{b.desc}</div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-500 text-stone-900 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Gift className="w-4 h-4" />
              <span>Trao Huân Chương & Khắc Tên Vinh Danh</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: SẮC LỆNH & THÔNG TRI */}
      {activeTab === 'decrees' && (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-[#DAD0BD] space-y-4">
            <h3 className="font-bold text-base text-[#1E3A24] font-serif-vintage">
              Ban Bố Sắc Lệnh & Thông Tri Đảo Sách
            </h3>
            <form onSubmit={handleIssueDecreeSubmit} className="space-y-3 max-w-xl">
              <input
                type="text"
                value={decreeTitle}
                onChange={(e) => setDecreeTitle(e.target.value)}
                placeholder="Tiêu đề thông tri..."
                className="w-full px-3 py-2 rounded-xl bg-[#FAF6EE] border border-[#D5CBBC] text-xs font-semibold"
                required
              />
              <textarea
                rows={3}
                value={decreeContent}
                onChange={(e) => setDecreeContent(e.target.value)}
                placeholder="Nội dung chi tiết..."
                className="w-full px-3 py-2 rounded-xl bg-[#FAF6EE] border border-[#D5CBBC] text-xs"
                required
              />
              <div className="flex items-center gap-2">
                {(['urgent', 'announcement', 'award'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDecreeType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                      decreeType === t ? 'bg-[#1E3A24] text-white' : 'bg-white text-stone-700'
                    }`}
                  >
                    {t === 'urgent' ? '⚡ Khẩn cấp' : t === 'announcement' ? '📢 Thông báo chung' : '🏆 Khen thưởng'}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-[#23432B] text-[#FAF6EB] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Megaphone className="w-4 h-4 text-amber-300" />
                <span>Ban Bố Lên Toàn Hệ Thống CLB</span>
              </button>
            </form>
          </div>

          <div className="space-y-2">
            {safeDecrees.map((d) => (
              <div key={d.id} className="p-3 bg-white rounded-xl border border-[#DAD0BD] text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1E3A24]">{d.title}</span>
                  {onDeleteDecree && isBcnAdmin && (
                    <button
                      type="button"
                      onClick={() => onDeleteDecree(d.id)}
                      className="p-1 text-stone-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-stone-600">{d.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: XUẤT / NHẬP DỮ LIỆU DỰ PHÒNG */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <div className="bg-[#17301F] text-white p-6 rounded-3xl space-y-3">
            <h3 className="text-xl font-bold font-serif-vintage">Xuất / Nhập Dữ Liệu Dự Phòng (JSON)</h3>
            <p className="text-xs text-emerald-100/90">
              Tổng cộng: {safeUserList.length} thành viên • {safePlans.length} kế hoạch • {safeTransactions.length} giao dịch • {safePosts.length} bài viết.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="px-4 py-2.5 rounded-xl bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Tải File JSON Dự Phòng</span>
              </button>
              <label className="px-4 py-2.5 rounded-xl bg-white/15 text-white font-bold text-xs flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Nạp File JSON Khôi Phục</span>
                <input type="file" accept=".json,application/json" onChange={handleSelectBackupFile} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FAF7F0] w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-[#DAD0BD] p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-[#1E3A24]">Đề Xuất Kế Hoạch Mới</h3>
              <button type="button" onClick={() => setIsPlanModalOpen(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePlan} className="space-y-3 text-xs">
              <input
                type="text"
                value={planTitle}
                onChange={(e) => setPlanTitle(e.target.value)}
                placeholder="Tên đề án..."
                className="w-full px-3 py-2 rounded-xl bg-white border"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={planDept}
                  onChange={(e) => setPlanDept(e.target.value as DepartmentType)}
                  className="px-3 py-2 rounded-xl bg-white border"
                >
                  <option value="Nhân sự & Kế hoạch">Nhân sự & Kế hoạch</option>
                  <option value="Nội dung">Nội dung</option>
                  <option value="Truyền thông">Truyền thông</option>
                  <option value="Hậu cần">Hậu cần</option>
                </select>
                <input
                  type="text"
                  value={planTimeline}
                  onChange={(e) => setPlanTimeline(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white border"
                />
              </div>
              <textarea
                rows={3}
                value={planDesc}
                onChange={(e) => setPlanDesc(e.target.value)}
                placeholder="Tóm tắt nội dung..."
                className="w-full px-3 py-2 rounded-xl bg-white border"
                required
              />
              <label className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-emerald-600/40 bg-emerald-50 text-emerald-900 font-bold flex items-center justify-center gap-2 cursor-pointer">
                <FileUp className="w-4 h-4" />
                <span>{isUploadingPlanFile ? 'Đang tải...' : planAttachmentName || 'Đính kèm PDF / Ảnh'}</span>
                <input type="file" accept="application/pdf,.pdf,image/*" onChange={handlePlanFileUpload} className="hidden" />
              </label>
              {planUploadError && <p className="text-rose-600">{planUploadError}</p>}
              {isBcnAdmin && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={archiveDirectly}
                    onChange={(e) => setArchiveDirectly(e.target.checked)}
                  />
                  <span>Lưu thẳng vào Kho Lưu Trữ Đã Duyệt</span>
                </label>
              )}
              <button type="submit" className="w-full py-2.5 rounded-xl font-bold bg-[#23432B] text-amber-300 cursor-pointer">
                Lưu Kế Hoạch
              </button>
            </form>
          </div>
        </div>
      )}

      {previewPlanAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div className="bg-[#FAF7F0] w-full max-w-4xl h-[85vh] rounded-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-[#17301F] text-white">
              <h3 className="font-bold text-sm truncate">{previewPlanAttachment.title}</h3>
              <button type="button" onClick={() => setPreviewPlanAttachment(null)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-stone-900 flex items-center justify-center p-2">
              {previewPlanAttachment.type === 'pdf' ? (
                <iframe src={previewPlanAttachment.url} title={previewPlanAttachment.title} className="w-full h-full bg-white" />
              ) : (
                <img src={previewPlanAttachment.url} alt={previewPlanAttachment.title} className="max-w-full max-h-full object-contain" />
              )}
            </div>
          </div>
        </div>
      )}

      {dislikingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65">
          <div className="bg-[#FAF3E3] w-full max-w-lg rounded-3xl border-3 border-[#382215] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base">Góp Ý Ẩn Danh: {dislikingPlan.title}</h3>
              <button type="button" onClick={() => setDislikingPlan(null)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onVotePlan(dislikingPlan.id, 'disagree', dislikeReason.trim(), dislikeCategory);
                setDislikingPlan(null);
              }}
              className="space-y-3 text-xs"
            >
              <textarea
                rows={3}
                required
                value={dislikeReason}
                onChange={(e) => setDislikeReason(e.target.value)}
                placeholder="Nhập ý kiến phản biện ẩn danh..."
                className="w-full px-3 py-2 rounded-xl border bg-white"
              />
              <button type="submit" className="w-full py-2 rounded-xl bg-[#C8532B] text-white font-bold cursor-pointer">
                Gửi Góp Ý Ẩn Danh
              </button>
            </form>
          </div>
        </div>
      )}

      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[#FAF7F0] w-full max-w-lg rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Giao Đầu Việc Mới</h3>
              <button type="button" onClick={() => setIsTaskModalOpen(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Tên nhiệm vụ..."
                className="w-full px-3 py-2 rounded-xl bg-white border"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={taskDept}
                  onChange={(e) => setTaskDept(e.target.value as DepartmentType)}
                  className="px-3 py-2 rounded-xl bg-white border"
                >
                  <option value="Truyền thông">Truyền thông</option>
                  <option value="Nội dung">Nội dung</option>
                  <option value="Nhân sự & Kế hoạch">Nhân sự & Kế hoạch</option>
                  <option value="Hậu cần">Hậu cần</option>
                </select>
                <input
                  type="text"
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white border"
                  required
                />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl font-bold bg-[#23432B] text-white cursor-pointer">
                Ban Hành Đầu Việc
              </button>
            </form>
          </div>
        </div>
      )}

      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FAF7F0] rounded-2xl max-w-md w-full p-5 space-y-4 text-xs">
            <h3 className="font-bold text-base">Khôi Phục Dữ Liệu Từ File JSON</h3>
            <input
              type="password"
              value={restorePasscode}
              onChange={(e) => setRestorePasscode(e.target.value)}
              placeholder="Nhập mã xác thực..."
              className="w-full px-3 py-2 rounded-xl bg-white border"
            />
            {restoreError && <div className="text-rose-700 font-bold">{restoreError}</div>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsRestoreModalOpen(false)} className="px-4 py-2 rounded-xl bg-stone-200">
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="px-4 py-2 rounded-xl bg-[#1E3A24] text-amber-300 font-bold"
              >
                {isRestoring ? 'Đang Nạp...' : 'Xác Nhận Khôi Phục'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

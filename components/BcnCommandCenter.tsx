import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Sparkles, 
  Flame, 
  Award, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  PlusCircle, 
  Layers, 
  Users2, 
  ThumbsUp, 
  ThumbsDown, 
  Zap, 
  Radio, 
  ListFilter, 
  ShieldCheck, 
  Gift, 
  FileCheck, 
  Megaphone, 
  Check, 
  X,
  Lock,
  Unlock,
  KeyRound,
  FileText,
  UserCheck,
  ChevronRight,
  TrendingUp,
  Inbox,
  AlertTriangle,
  Compass,
  Trash2,
  UserMinus,
  Search,
  HeartHandshake,
  History,
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
  MessageSquare
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
  plans: ClubPlan[];
  tasks: ClubTask[];
  decrees: ClubDecree[];
  userList: UserProfile[];
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

export const BcnCommandCenter: React.FC<BcnCommandCenterProps> = ({
  currentUser,
  isBcnMode,
  isMasterRoot,
  plans,
  tasks,
  decrees,
  userList,
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
  onOpenAuthModal,
  onOpenRecruitment,
  onOpenSuccession,
  onOpenHallOfFame,
  onOpenReports,
  onDeleteUser,
  onStateRestored,
  onAssignRole,
  onApproveDepartment,
  onRejectDepartment
}) => {
  const isBcnAdmin = isBcnMode || currentUser.role === 'bcn_admin' || isMasterRoot;
  const canApproveDept = isBcnAdmin;
  const canAppointDeptRole = isBcnAdmin;

  // Main tabs: BCN defaults to 'omnipotent' (or 'coplan'), normal members default to 'coplan'
  const [activeTab, setActiveTab] = useState<'omnipotent' | 'evaluations' | 'members' | 'coplan' | 'tasks' | 'awards' | 'decrees' | 'backup'>(
    isBcnAdmin ? 'omnipotent' : 'coplan'
  );

  // Ensure normal members are never stuck on a BCN-only sub-tab when switching accounts
  useEffect(() => {
    if (!isBcnAdmin && activeTab !== 'coplan' && activeTab !== 'tasks' && activeTab !== 'evaluations') {
      setActiveTab('coplan');
    }
  }, [isBcnAdmin, activeTab]);

  // Member Management states
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberFilterDept, setMemberFilterDept] = useState<string>('all');
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
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
  const [planPriority, setPlanPriority] = useState<'high' | 'medium' | 'normal'>('high');
  const [planBudget, setPlanBudget] = useState(2500000);
  const [planActionItems, setPlanActionItems] = useState('Ban Nội dung biên soạn, Ban Truyền thông thiết kế ấn phẩm, Ban Hậu cần chuẩn bị địa điểm');
  const [planInitialStatus, setPlanInitialStatus] = useState<'under_discussion' | 'approved'>('under_discussion');
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

  // Anonymous Dislike Feedback States for Projects/Plans
  const [dislikingPlan, setDislikingPlan] = useState<ClubPlan | null>(null);
  const [dislikeCategory, setDislikeCategory] = useState<'Kinh phí chưa hợp lý' | 'Thời gian không khả thi' | 'Nội dung chưa phù hợp' | 'Thiếu nhân lực thực hiện' | 'Góp ý cải tiến khác'>('Nội dung chưa phù hợp');
  const [dislikeReason, setDislikeReason] = useState<string>('');
  const [viewingFeedbackPlan, setViewingFeedbackPlan] = useState<ClubPlan | null>(null);

  // Task creation modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDept, setTaskDept] = useState<DepartmentType>('Nội dung');
  const [taskAssignee, setTaskAssignee] = useState(userList[1]?.name || 'Lê Thị Ái Vy');
  const [taskDeadline, setTaskDeadline] = useState('10/11/2026');
  const [taskPoints, setTaskPoints] = useState(50);
  const [taskDesc, setTaskDesc] = useState('');

  // Award medal states
  const [selectedUserToAward, setSelectedUserToAward] = useState<string>(userList[0]?.id || '');
  const [selectedBadge, setSelectedBadge] = useState<string>('Chiến Binh Deadline ⚡');
  const [bonusPoints, setBonusPoints] = useState<number>(50);

  // Decree form
  const [decreeTitle, setDecreeTitle] = useState('');
  const [decreeContent, setDecreeContent] = useState('');
  const [decreeType, setDecreeType] = useState<'urgent' | 'announcement' | 'award'>('urgent');

  // Co-Planning Archive & Role Authorities
  const [coplanView, setCoplanView] = useState<'all' | 'active' | 'archived'>('active');
  const isPlanAuthority = isBcnAdmin || 
    currentUser.role === 'lead' ||
    (currentUser.department === 'Nhân sự & Kế hoạch' && (currentUser.departmentRole === 'leader' || currentUser.departmentRole === 'vice_leader' || currentUser.position?.toLowerCase().includes('trưởng') || currentUser.position?.toLowerCase().includes('phó')));

  // Official Club Role Assignment States (Master Root only)
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
    } catch (err) {
      setAssignLoading(false);
    }
  };

  const handleDownloadBackup = () => {
    const link = document.createElement('a');
    link.href = '/api/backup/download';
    link.setAttribute('download', `agu_club_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });
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
      setRestoreSuccess('Cơ sở dữ liệu CLB đã được khôi phục thành công! Mọi thành viên, bài viết và kế hoạch đã cập nhật.');
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

  // Helper: Members of selected dispatch department
  const deptMembers = userList.filter(u => u.department === dispatchDept);

  // Helper: Unresolved confidential reports count (for independent tab badge)
  const pendingReports = reports.filter(r => r.status === 'received' || r.status === 'processing');
  const pendingPlans = plans.filter(p => p.status === 'under_discussion');
  const archivedPlans = plans.filter(p => p.status === 'approved' || Boolean(p.archivedAt));

  // Handler: Instant Dispatch from Omnipotent Dashboard
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

  // Handler: Upload original PDF or Image for Plan
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

  // Standard modal plan submit
  const [archiveDirectly, setArchiveDirectly] = useState(false);

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planTitle.trim()) return;

    confetti({
      particleCount: 60,
      spread: 55,
      origin: { y: 0.6 }
    });

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

  // Standard modal task submit
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

  // Submit award
  const handleAwardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const recipient = userList.find(u => u.id === selectedUserToAward);
    if (!recipient) return;

    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#F59E0B', '#10B981', '#EC4899', '#6366F1']
    });

    onAwardBadge(selectedUserToAward, selectedBadge, bonusPoints);
  };

  // Submit decree
  const handleIssueDecreeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decreeTitle.trim() || !decreeContent.trim()) return;

    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.6 }
    });

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
      {/* =========================================================================
          PREMIER EXECUTIVE BANNER (Vàng Kim + Ngọc Bích Viền Chuyển Màu)
         ========================================================================= */}
      <div className="relative p-[2px] rounded-3xl bg-gradient-to-r from-amber-400 via-emerald-400 via-amber-300 to-emerald-500 shadow-xl overflow-hidden group">
        {/* Ambient background glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-400/30 transition-all duration-700" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative bg-gradient-to-br from-[#122818] via-[#17301F] to-[#0E1F13] text-white p-5 sm:p-7 rounded-[22px] backdrop-blur-md">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            <div className="space-y-3 max-w-2xl">
              {/* Luxury Badges Header */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 text-stone-950 text-[11px] font-black uppercase tracking-wider shadow-md border border-amber-200">
                  <Crown className="w-3.5 h-3.5 fill-stone-950" />
                  {isBcnAdmin ? 'Kế Hoạch & Ban Chủ Nhiệm ★' : 'Kế Hoạch Hoạt Động & Bảng Việc 4 Ban'}
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/40 backdrop-blur-xs">
                  <FolderArchive className="w-3 h-3 text-emerald-300" />
                  Kho Kế Hoạch Nguyên Bản (PDF / Ảnh)
                </span>

                {isMasterRoot && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-300/50">
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    Tài Khoản Gốc Bất Biến
                  </span>
                )}
              </div>

              {/* Title */}
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

              {/* Quick Authority Stats Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                  <div className="text-[10px] text-emerald-300 font-semibold flex items-center gap-1">
                    <Compass className="w-3 h-3" /> Tổng Kế Hoạch
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">{plans.length} đề án</div>
                </div>

                <div className="p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                  <div className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                    <FolderArchive className="w-3 h-3" /> Kho Lưu Trữ
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">{archivedPlans.length} đã duyệt</div>
                </div>

                <div className="p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                  <div className="text-[10px] text-teal-300 font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Nhiệm Vụ 4 Ban
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">{tasks.length} đầu việc</div>
                </div>

                <div className="p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                  <div className="text-[10px] text-rose-300 font-semibold flex items-center gap-1">
                    <Users2 className="w-3 h-3" /> Nhân Sự CLB
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">{userList.length} thành viên</div>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel on the right */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 w-full lg:w-auto shrink-0">
              {isPlanAuthority && (
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition cursor-pointer"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  Tải Kế Hoạch Lên (PDF / Ảnh)
                </button>
              )}

              {isMasterRoot && (
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

              <button
                type="button"
                onClick={onOpenHallOfFame}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Award className="w-3.5 h-3.5 text-emerald-300" />
                Bảo Tàng Thành Tựu
              </button>

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

      {/* =========================================================================
          EXECUTIVE NAVIGATION TABS BAR
         ========================================================================= */}
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
          <span>Đánh Giá Năng Lực Thành Viên ({memberEvaluations.length})</span>
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
          <span>Kho Lưu Trữ Kế Hoạch & Đề Án ({plans.length})</span>
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
          <span>Bảng Việc 4 Ban ({tasks.length})</span>
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
          <span>Sắc Lệnh Thông Tri ({decrees.length})</span>
          <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-black uppercase">
            HOT
          </span>
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
              <span>Quản Trị Nhân Sự ({userList.length})</span>
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

      {/* =========================================================================
          TAB: ĐÁNH GIÁ NĂNG LỰC THÀNH VIÊN ĐỊNH KỲ (CHO TRƯỞNG/PHÓ BAN & BCN)
         ========================================================================= */}
      {activeTab === 'evaluations' && (
        <MemberEvaluationSection
          currentUser={currentUser}
          isBcnAdmin={isBcnAdmin}
          userList={userList}
          evaluations={memberEvaluations}
          onAddEvaluation={(newEval) => {
            if (onAddEvaluation) onAddEvaluation(newEval);
          }}
          onUpdateEvaluation={onUpdateEvaluation}
          onDeleteEvaluation={onDeleteEvaluation}
          onRemoveBadge={onRemoveBadge}
          onExecuteEvaluationAction={onExecuteEvaluationAction}
        />
      )}

      {/* =========================================================================
          TAB 1: KẾ HOẠCH & BAN CHỦ NHIỆM (OMNIPOTENT EXECUTIVE COCKPIT)
         ========================================================================= */}
      {activeTab === 'omnipotent' && isBcnAdmin && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: PHÂN CÔNG HỎA TỐC 4 BAN (7 COLS) */}
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

                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                      ⚡ Điều Phối Nhanh
                    </span>
                  </div>

                  {dispatchSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span><strong>Thành công:</strong> Nhiệm vụ đã được phân công và thông báo đến ban tiếp nhận!</span>
                    </div>
                  )}

                  <form onSubmit={handleQuickDispatch} className="space-y-3.5">
                    {/* Department selection with visual pills */}
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
                                const firstMember = userList.find(u => u.department === dept);
                                setDispatchAssignee(firstMember ? firstMember.name : 'Trưởng Ban Điều Phối');
                              }}
                              className={`p-2 rounded-xl text-left border text-xs font-bold transition cursor-pointer flex flex-col justify-between ${
                                isSel
                                  ? 'bg-[#1E3A24] text-white border-[#1E3A24] shadow-xs ring-2 ring-emerald-400/50'
                                  : 'bg-white text-[#4A644F] border-[#DED4C1] hover:border-emerald-600'
                              }`}
                            >
                              <span className="truncate">{dept}</span>
                              <span className={`text-[9px] mt-1 ${isSel ? 'text-emerald-300' : 'text-stone-400'}`}>
                                {dept === 'Nhân sự & Kế hoạch' ? '★ Trọng yếu' : 'Ban chuyên môn'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Assignee & Deadline */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#2A4831] mb-1">
                          2. Người Phụ Trách / Trực Tiếp Thực Hiện:
                        </label>
                        <select
                          value={dispatchAssignee}
                          onChange={(e) => setDispatchAssignee(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#D5CBBC] text-xs font-medium text-stone-800 focus:ring-1 focus:ring-emerald-700"
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

                    {/* Task Title */}
                    <div>
                      <label className="block text-xs font-bold text-[#2A4831] mb-1">
                        4. Tên Nhiệm Vụ & Yêu Cầu Cốt Lõi:
                      </label>
                      <input
                        type="text"
                        value={dispatchTitle}
                        onChange={(e) => setDispatchTitle(e.target.value)}
                        placeholder="Ví dụ: Thiết kế poster Tọa đàm Sách Tháng 11; Viết review sách đinh..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#D5CBBC] text-xs font-semibold text-stone-900 focus:ring-1 focus:ring-emerald-700 placeholder:text-stone-400"
                        required
                      />
                    </div>

                    {/* Instructions & Bonus Points */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-[#2A4831] mb-1">
                          5. Chỉ Đạo Chi Tiết (Tùy chọn):
                        </label>
                        <input
                          type="text"
                          value={dispatchDesc}
                          onChange={(e) => setDispatchDesc(e.target.value)}
                          placeholder="Nhắc nhở kiểm tra tiến độ, phối hợp hậu cần..."
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
                          <option value={80}>+80 Điểm Lửa (Khuyên dùng)</option>
                          <option value={100}>+100 Điểm Lửa (Hỏa tốc)</option>
                          <option value={150}>+150 Điểm Lửa (Đặc biệt)</option>
                        </select>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-[#17301F] via-[#20442B] to-[#17301F] hover:from-[#1D3B26] hover:to-[#122818] text-amber-300 border border-amber-400/40 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>BAN HÀNH CHỈ ĐẠO & PHÂN CÔNG HỎA TỐC</span>
                      <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: KHO LƯU TRỮ KẾ HOẠCH & PHÊ DUYỆT ĐỀ ÁN NGUYÊN BẢN (5 COLS) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="relative p-[1.5px] rounded-2xl bg-gradient-to-r from-amber-400 via-emerald-500 to-teal-500 shadow-md">
                <div className="bg-[#FAF7F0] p-5 sm:p-6 rounded-[14.5px] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E3DAC7] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-emerald-700 text-white flex items-center justify-center font-bold shadow-xs">
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
                      className="px-2.5 py-1 rounded-lg bg-[#1E3A24] hover:bg-[#2A5032] text-amber-300 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    >
                      <FileUp className="w-3 h-3" />
                      <span>Tải Kế Hoạch Lên</span>
                    </button>
                  </div>

                  {/* Quick Summary Badges */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div
                      onClick={() => { setActiveTab('coplan'); setCoplanView('active'); }}
                      className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 cursor-pointer hover:border-amber-400 transition"
                    >
                      <div className="text-[10px] font-bold text-amber-800 uppercase">Chờ Phê Duyệt</div>
                      <div className="text-sm font-extrabold text-stone-900 mt-0.5">{pendingPlans.length} đề án mới</div>
                    </div>
                    <div
                      onClick={() => { setActiveTab('coplan'); setCoplanView('archived'); }}
                      className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 cursor-pointer hover:border-emerald-400 transition"
                    >
                      <div className="text-[10px] font-bold text-emerald-800 uppercase">Kho Đã Lưu Trữ</div>
                      <div className="text-sm font-extrabold text-stone-900 mt-0.5">{archivedPlans.length} bản gốc</div>
                    </div>
                  </div>

                  {/* List of Pending Plans Only (Once approved, vanishes into Archive!) */}
                  <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1">
                    {pendingPlans.length === 0 ? (
                      <div className="py-8 px-4 text-center rounded-xl bg-white border border-dashed border-[#DED4C1] space-y-1">
                        <Inbox className="w-7 h-7 text-stone-400 mx-auto" />
                        <div className="font-bold text-xs text-stone-800">
                          Hòm thư chờ duyệt kế hoạch hiện đang trống
                        </div>
                        <p className="text-[11px] text-stone-500">
                          Tất cả đề án đã được duyệt và chuyển sang Kho lưu trữ gọn gàng.
                        </p>
                      </div>
                    ) : (
                      pendingPlans.map((p) => (
                        <div key={p.id} className="bg-white p-3 rounded-xl border border-[#DED4C1] space-y-2 shadow-2xs">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                                  {p.department}
                                </span>
                                {p.attachmentUrl && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-0.5">
                                    {p.attachmentType === 'pdf' ? <FileText className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
                                    {p.attachmentType === 'pdf' ? 'Bản gốc PDF' : 'Bản gốc Ảnh'}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-xs text-stone-900 mt-1 truncate">{p.title}</h4>
                              <p className="text-[10px] text-stone-500">Đề xuất: {p.proposedBy} • {p.timeline}</p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => onUpdatePlanStatus(p.id, 'approved')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold cursor-pointer transition"
                                title="Duyệt & Lưu vào Kho kế hoạch"
                              >
                                Duyệt Lưu Kho
                              </button>
                              {onDeletePlan && (
                                <button
                                  type="button"
                                  onClick={() => onDeletePlan(p.id)}
                                  className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  title="Xóa kế hoạch này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {p.attachmentUrl && (
                            <div className="flex items-center justify-between pt-1.5 border-t border-stone-100">
                              <span className="text-[10px] text-stone-600 truncate max-w-[180px]">
                                📎 {p.attachmentName || 'Văn_kiện_kế_hoạch'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setPreviewPlanAttachment({
                                  title: p.title,
                                  url: p.attachmentUrl!,
                                  name: p.attachmentName || p.title,
                                  type: p.attachmentType || 'pdf'
                                })}
                                className="text-[10px] font-bold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" /> Xem bản gốc
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('coplan')}
                    className="w-full py-2 px-3 rounded-xl bg-[#23432B] hover:bg-[#1B3522] text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    <span>Mở Toàn Bộ Kho Lưu Trữ Kế Hoạch ({plans.length})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* QUICK LINKS BANNER: INDEPENDENT ANONYMOUS REPORT TAB & PLAN ARCHIVE */}
          <div className="p-4 rounded-2xl bg-white border border-[#DED4C1] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FAF5E8] border border-amber-300 text-amber-700 flex items-center justify-center font-bold">
                🛡️
              </div>
              <div>
                <span className="font-bold text-[#1E3A24]">
                  Tách biệt độc lập 2 phân khu:
                </span>
                <span className="text-stone-600 ml-1">
                  <strong>Kế Hoạch & BCN</strong> chuyên biệt cho đề án & điều hành; còn <strong>Báo Cáo Ẩn Danh</strong> hoạt động tại tab riêng biệt bảo mật tuyệt đối ({pendingReports.length} báo cáo đang chờ).
                </span>
              </div>
            </div>

            {onOpenReports && (
              <button
                type="button"
                onClick={onOpenReports}
                className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold flex items-center gap-1 shrink-0 cursor-pointer transition"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Mở Tab Báo Cáo Ẩn Danh ({pendingReports.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* BẢNG VINH DANH HUÂN CHƯƠNG TẠI ĐIỀU HÀNH BAN CHỦ NHIỆM */}
          <div className="p-5 rounded-2xl bg-[#FAF7F0] border-2 border-[#382215]/30 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DFD6C3] pb-2.5">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                <div>
                  <h4 className="font-bold text-sm text-[#1E3A24] font-serif-vintage">
                    Bảng Khen Thưởng Huân Chương Tại Điều Hành Ban Chủ Nhiệm
                  </h4>
                  <p className="text-[11px] text-stone-600">
                    Đồng bộ trực tiếp với Bảng Quản Trị Nhân Sự và Đánh Giá Năng Lực Thành Viên
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('awards')}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Trao Huân Chương Mới</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {userList
                .filter(u => u.id !== 'bcn-root' && u.badges && u.badges.length > 0)
                .map(u => (
                  <div key={`bcn-medal-${u.id}`} className="p-3 rounded-xl bg-white border border-[#DED4C1] flex flex-col justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-lg object-cover border border-stone-300 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-[#1E3A24] truncate">{u.name}</div>
                        <div className="text-[10px] text-stone-500 truncate">{u.position || u.department}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-stone-100">
                      {u.badges.map((b, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-950 border border-amber-300 text-[10px] font-bold flex items-center gap-1">
                          <Award className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                          <span>{b}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* =========================================================================
              PERMANENT CLOUD DATABASE & JSON BACKUP / RESTORE CENTER
             ========================================================================= */}
          <div className="relative p-[1.5px] rounded-2xl bg-gradient-to-r from-emerald-600 via-amber-500 to-teal-500 shadow-md">
            <div className="bg-[#FAF7F0] p-5 sm:p-6 rounded-[14.5px] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E3DAC7] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-700 to-[#17301F] text-amber-300 flex items-center justify-center font-bold shadow-xs">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#1E3A24] font-serif-vintage flex items-center gap-2">
                      <span>Bảo Vệ Dữ Liệu Bất Biến & Sao Lưu JSON</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                        Dual Persistence Active
                      </span>
                    </h3>
                    <p className="text-[11px] text-[#557058]">
                      Lưu trữ vĩnh cửu trên đĩa máy chủ (data/club_db.json & data/seed.json). Không mất tài khoản, kế hoạch, ngân quỹ hay bài viết khi cập nhật code AI Studio.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                    <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                    Đã Đồng Bộ Ổ Đĩa
                  </span>
                </div>
              </div>

              {restoreSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Thành công:</strong> {restoreSuccess}</span>
                </div>
              )}

              {restoreError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span><strong>Lỗi:</strong> {restoreError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Download Backup Box */}
                <div className="p-4 rounded-xl bg-white border border-[#DDD3BF] space-y-3 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-emerald-700" />
                    <h4 className="font-bold text-xs sm:text-sm text-stone-900">
                      Tải Về File Dự Phòng (JSON)
                    </h4>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Xuất toàn bộ cơ sở dữ liệu hiện tại (danh sách thành viên, mật khẩu, bài viết, locket, kế hoạch, két quỹ, báo cáo) về máy tính/điện thoại thành file .json an toàn.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="w-full py-2 px-3.5 rounded-xl text-xs font-bold bg-[#1E3A24] hover:bg-[#284E31] text-amber-300 border border-emerald-600/50 shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải Về File JSON Dự Phòng Ngay</span>
                  </button>
                </div>

                {/* Restore Backup Box */}
                <div className="p-4 rounded-xl bg-white border border-[#DDD3BF] space-y-3 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-amber-700" />
                    <h4 className="font-bold text-xs sm:text-sm text-stone-900">
                      Nạp & Khôi Phục File Dự Phòng (JSON)
                    </h4>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Khôi phục lại toàn bộ dữ liệu câu lạc bộ từ một file sao lưu .json trước đó. Yêu cầu nhập mã xác thực bảo mật của câu lạc bộ.
                  </p>
                  <label className="w-full py-2 px-3.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-xs flex items-center justify-center gap-2 transition cursor-pointer">
                    <Upload className="w-4 h-4 text-amber-700" />
                    <span>Chọn File JSON Để Nạp Dữ Liệu</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleSelectBackupFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB: QUẢN TRỊ NHÂN SỰ & TÀI KHOẢN (MEMBER MANAGEMENT & ACCOUNT CONTROL)
         ========================================================================= */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Header Overview Card */}
          <div className="bg-gradient-to-r from-[#19321E] via-[#234529] to-[#1C3621] text-white p-5 rounded-2xl border border-[#3E6547] shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
                  <UserCog className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold font-serif-vintage tracking-wide text-white">
                  Quản Trị Nhân Sự & Quyền Quản Lý Tài Khoản CLB
                </h3>
                <span className="text-[10px] bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded font-bold border border-emerald-600/40">
                  Admin Control
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 leading-relaxed">
                Phân biệt minh bạch giữa <strong>BCN Đương Nhiệm</strong>, <strong>Cựu BCN Tiền Bối</strong> (được bảo tồn 100% dữ liệu) và thành viên 4 ban. Ban Quản Trị có quyền xóa tài khoản dọn dẹp hệ thống khi cần thiết.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenSuccession}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
              >
                <Crown className="w-4 h-4 text-stone-900" />
                <span>Bàn Giao Nhiệm Kỳ Đích Danh</span>
              </button>
            </div>
          </div>

          {/* Statistics summary chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-white border border-[#DED4C1] shadow-2xs">
              <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Tổng Tài Khoản</div>
              <div className="text-xl font-bold text-[#1E3A24] mt-0.5">{userList.length} tài khoản</div>
              <div className="text-[10px] text-emerald-700 mt-0.5">Đang liên kết đa thiết bị</div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 shadow-2xs">
              <div className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">BCN Đương Nhiệm</div>
              <div className="text-xl font-bold text-amber-950 mt-0.5">
                {userList.filter(u => u.adminType === 'bcn_elected' || u.adminType === 'master_root').length} nhân sự
              </div>
              <div className="text-[10px] text-amber-700 mt-0.5">Nắm quyền điều hành</div>
            </div>

            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 shadow-2xs">
              <div className="text-[10px] font-semibold text-purple-800 uppercase tracking-wider">Cựu BCN Tiền Bối</div>
              <div className="text-xl font-bold text-purple-950 mt-0.5">
                {userList.filter(u => u.position?.toLowerCase().includes('cựu')).length} tiền bối
              </div>
              <div className="text-[10px] text-purple-700 mt-0.5">Bảo tồn dữ liệu vĩnh viễn</div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 shadow-2xs">
              <div className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">Thành Viên 4 Ban</div>
              <div className="text-xl font-bold text-emerald-950 mt-0.5">
                {userList.filter(u => !u.position?.toLowerCase().includes('cựu') && u.adminType !== 'bcn_elected' && u.adminType !== 'master_root').length} thành viên
              </div>
              <div className="text-[10px] text-emerald-700 mt-0.5">Đang sinh hoạt tích cực</div>
            </div>
          </div>

          {/* Notice after delete or action */}
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

          {/* Search & Department Filters */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#DFD6C3] space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm tài khoản theo Họ tên, Nickname, MSSV, Khoa..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#C7BDB0] bg-[#FAF7F0] text-xs focus:ring-1 focus:ring-[#3B6E47]"
                />
              </div>

              {memberSearchQuery && (
                <button
                  type="button"
                  onClick={() => setMemberSearchQuery('')}
                  className="text-xs text-stone-500 hover:text-stone-800 px-2 py-1 cursor-pointer shrink-0"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {[
                { id: 'all', label: `Tất cả (${userList.length})` },
                { id: 'pending', label: `Chờ Account Chính Duyệt Vào Ban (${userList.filter(u => u.departmentStatus === 'pending_approval').length}) ⏳` },
                { id: 'bcn', label: 'BCN Đương Nhiệm 👑' },
                { id: 'former', label: 'Cựu BCN Tiền Bối 🎖️' },
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
                      ? 'bg-[#23432B] text-white shadow-xs'
                      : 'bg-[#FAF7F0] text-stone-600 hover:bg-[#EFE9DC] hover:text-[#1E3A24] border border-[#E3DAC8]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Member List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {userList
              .filter((user) => {
                // Filter by department / category
                if (memberFilterDept === 'pending') {
                  if (user.departmentStatus !== 'pending_approval') return false;
                } else if (memberFilterDept === 'bcn') {
                  if (user.adminType !== 'bcn_elected' && user.adminType !== 'master_root') return false;
                } else if (memberFilterDept === 'former') {
                  if (!user.position?.toLowerCase().includes('cựu')) return false;
                } else if (memberFilterDept !== 'all') {
                  if (user.department !== memberFilterDept) return false;
                }

                // Filter by search query
                if (!memberSearchQuery.trim()) return true;
                const q = memberSearchQuery.toLowerCase();
                return (
                  user.name.toLowerCase().includes(q) ||
                  (user.nickname && user.nickname.toLowerCase().includes(q)) ||
                  user.studentId.toLowerCase().includes(q) ||
                  user.faculty.toLowerCase().includes(q) ||
                  user.position.toLowerCase().includes(q)
                );
              })
              .map((user) => {
                const isRoot = user.adminType === 'master_root' || user.id === 'bcn-root';
                const isElectedBcn = user.adminType === 'bcn_elected';
                const isFormerLeader = user.position?.toLowerCase().includes('cựu');
                const isPendingDept = user.departmentStatus === 'pending_approval';

                return (
                  <div
                    key={user.id}
                    className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                      isRoot
                        ? 'bg-gradient-to-br from-amber-50 to-[#FDF8ED] border-amber-300 ring-1 ring-amber-300/60 shadow-xs'
                        : isPendingDept
                        ? 'bg-gradient-to-br from-amber-50/70 to-white border-amber-400 shadow-xs'
                        : isElectedBcn
                        ? 'bg-gradient-to-br from-[#F5FAF5] to-white border-emerald-300 shadow-xs'
                        : isFormerLeader
                        ? 'bg-gradient-to-br from-purple-50/50 to-white border-purple-200'
                        : 'bg-white border-[#DFD6C3] hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-12 h-12 rounded-xl object-cover ring-2 ring-[#3B6E47]/30"
                        />
                        {isRoot && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-stone-900 text-[10px] flex items-center justify-center font-bold shadow-xs">
                            ★
                          </span>
                        )}
                        {isElectedBcn && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold shadow-xs">
                            👑
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-xs sm:text-sm text-[#1E3A24] truncate">
                            {user.name}
                          </h4>
                          {isRoot ? (
                            <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold shrink-0">
                              Gốc Vĩnh Viễn
                            </span>
                          ) : isPendingDept ? (
                            <span className="text-[10px] bg-amber-200 text-amber-950 px-2 py-0.5 rounded font-bold shrink-0">
                              Chờ Duyệt Ban
                            </span>
                          ) : isElectedBcn ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold shrink-0">
                              BCN Đương Nhiệm
                            </span>
                          ) : isFormerLeader ? (
                            <span className="text-[10px] bg-purple-100 text-purple-900 px-2 py-0.5 rounded font-bold shrink-0">
                              Cựu Tiền Bối
                            </span>
                          ) : null}
                        </div>

                        {user.nickname && (
                          <p className="text-[11px] text-[#3B6E47] font-semibold italic truncate">
                            "{user.nickname}"
                          </p>
                        )}

                        <div className="text-[11px] text-stone-700 font-medium mt-0.5 truncate">
                          {user.position}
                        </div>

                        <div className="text-[10px] text-stone-500 mt-0.5 truncate">
                          MSSV: <span className="font-mono font-bold text-stone-700">{user.studentId}</span> • {user.faculty}
                        </div>
                      </div>
                    </div>

                    {/* Awarded Medals / Huân Chương trong Quản Trị Nhân Sự */}
                    {user.badges && user.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {user.badges.map((badge, bIdx) => (
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

                    {/* Stats & Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-[10px]">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-700 font-bold flex items-center gap-0.5">
                          <Flame className="w-3 h-3 text-amber-600" />
                          {user.readingStreak} ngày streak
                        </span>
                        <span>•</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          {user.meritPoints || 50} điểm lửa
                        </span>
                      </div>

                      {/* Actions: Department Approval (Account Chính), Role Appointment (Trưởng CLB / Account Chính), & Delete */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isPendingDept && canApproveDept && onApproveDepartment && (
                          <button
                            type="button"
                            onClick={() => {
                              const deptToApprove = user.requestedDepartment || user.department || 'Nội dung';
                              onApproveDepartment(user.id, deptToApprove, `Được Account Chính duyệt vào Ban ${deptToApprove}`);
                              setDeleteNotice(`Account Chính đã duyệt "${user.name}" vào Ban ${deptToApprove} thành công!`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#1E3A24] hover:bg-[#2B5233] text-amber-300 transition font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Quyền Account Chính: Duyệt thành viên này vào ban chuyên môn"
                          >
                            <Check className="w-3 h-3 text-emerald-300" />
                            <span>Duyệt Vào Ban</span>
                          </button>
                        )}

                        {canAppointDeptRole && !isRoot && (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(user)}
                            className="px-2.5 py-1 rounded-lg text-emerald-800 hover:text-white bg-emerald-50 hover:bg-emerald-700 border border-emerald-300 transition font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Bổ nhiệm Trưởng/Phó Ban (Quyền Hạn Trưởng CLB & Account Chính)"
                          >
                            <Crown className="w-3 h-3 text-amber-600" />
                            <span>Chọn Trưởng/Phó Ban</span>
                          </button>
                        )}

                        {isRoot ? (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-amber-600" />
                            Tài Khoản Gốc
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (onDeleteUser) {
                                onDeleteUser(user.id);
                                setDeleteNotice(`Đã xóa "${user.name}" (${user.studentId}) khỏi danh sách CLB.`);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 transition font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            title="Xóa người này khỏi CLB"
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

          {/* Delete Confirmation Modal */}
          {userToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="bg-[#FAF7F0] rounded-2xl border-2 border-rose-400 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="bg-rose-700 text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-300" />
                    <h4 className="font-bold text-sm">Xác Nhận Xóa Tài Khoản Thành Viên</h4>
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
                      src={userToDelete.avatar}
                      alt={userToDelete.name}
                      className="w-12 h-12 rounded-xl object-cover ring-1 ring-stone-300 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-[#1E3A24] truncate">
                        {userToDelete.name}
                      </div>
                      {userToDelete.nickname && (
                        <div className="text-[11px] text-emerald-800 italic truncate">
                          "{userToDelete.nickname}"
                        </div>
                      )}
                      <div className="text-[11px] text-stone-500">
                        MSSV: <span className="font-mono font-bold">{userToDelete.studentId}</span> • {userToDelete.department}
                      </div>
                    </div>
                  </div>

                  <p className="leading-relaxed text-stone-600 bg-rose-50 p-3 rounded-xl border border-rose-200 text-[11px]">
                    <strong>Cảnh báo hành động:</strong> Bạn đang thực hiện quyền Ban Quản Trị để xóa tài khoản này khỏi hệ thống. Tài khoản sẽ bị xóa trên tất cả thiết bị đồng bộ đám mây.
                  </p>

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
                      onClick={() => {
                        if (onDeleteUser) {
                          onDeleteUser(userToDelete.id);
                          setDeleteNotice(`Đã xóa vĩnh viễn tài khoản của bạn "${userToDelete.name}" (${userToDelete.studentId}) thành công.`);
                        }
                        setUserToDelete(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer flex items-center gap-1.5 shadow-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xác Nhận Xóa Vĩnh Viễn</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Role Appointment Modal: Trưởng CLB & Account Chính */}
          {assigningUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="bg-[#FAF7F0] rounded-2xl border-2 border-emerald-600 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="bg-[#1C3621] text-white p-4.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Crown className="w-5 h-5 text-amber-300" />
                    <div>
                      <h4 className="font-bold text-sm sm:text-base font-serif-vintage">
                        Chọn Trưởng Ban / Phó Ban Chuyên Môn Nhỏ
                      </h4>
                      <p className="text-[11px] text-emerald-200/80">
                        Quyền Hạn: Trưởng Câu Lạc Bộ & Tài Khoản Chính CLB
                      </p>
                    </div>
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

                  {/* Target Member Card */}
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-[#DDD3C0]">
                    <img
                      src={assigningUser.avatar}
                      alt={assigningUser.name}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-600/50 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-[#1E3A24] truncate">{assigningUser.name}</div>
                      <div className="text-[11px] text-stone-500">
                        MSSV: <span className="font-mono font-bold text-stone-700">{assigningUser.studentId}</span> • Khoa: {assigningUser.faculty}
                      </div>
                      <div className="text-[11px] text-emerald-800 font-medium">
                        Hiện tại: {assigningUser.position || assigningUser.department}
                      </div>
                    </div>
                  </div>

                  {/* Select Department */}
                  <div>
                    <label className="block font-bold text-[#1E3A24] mb-1.5">
                      Chọn Ban Chuyên Môn Bổ Nhiệm:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Nhân sự & Kế hoạch', 'Nội dung', 'Truyền thông', 'Hậu cần'] as DepartmentType[]).map((dept) => (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => {
                            setAssignDept(dept);
                            setAssignRoleTitle(
                              assignRoleLevel === 'leader' ? `Trưởng Ban ${dept}` :
                              assignRoleLevel === 'vice_leader' ? `Phó Ban ${dept}` : `Thành viên Ban ${dept}`
                            );
                          }}
                          className={`p-2.5 rounded-xl border text-left font-bold text-xs transition cursor-pointer ${
                            assignDept === dept
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-500 ring-1 ring-emerald-500'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          {dept}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Select Role Level */}
                  <div>
                    <label className="block font-bold text-[#1E3A24] mb-1.5">
                      Cấp Bậc Bổ Nhiệm:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAssignRoleLevel('leader');
                          setAssignRoleTitle(`Trưởng Ban ${assignDept}`);
                        }}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                          assignRoleLevel === 'leader'
                            ? 'bg-amber-100 text-amber-950 border-amber-500 ring-1 ring-amber-500'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
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
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                          assignRoleLevel === 'vice_leader'
                            ? 'bg-blue-100 text-blue-950 border-blue-500 ring-1 ring-blue-500'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
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
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                          assignRoleLevel === 'member'
                            ? 'bg-stone-200 text-stone-900 border-stone-400 ring-1 ring-stone-400'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        Thành Viên
                      </button>
                    </div>
                  </div>

                  {/* Custom Position Title Input */}
                  <div>
                    <label className="block font-bold text-[#1E3A24] mb-1">
                      Danh Xưng Chức Vụ Hiển Thị Chính Thức:
                    </label>
                    <input
                      type="text"
                      required
                      value={assignRoleTitle}
                      onChange={(e) => setAssignRoleTitle(e.target.value)}
                      placeholder="Ví dụ: Trưởng Ban Nhân sự & Kế hoạch"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-semibold text-xs focus:ring-2 focus:ring-emerald-600"
                    />
                    <p className="text-[10px] text-stone-500 mt-1">
                      * Quyền hạn này sẽ lập tức đồng bộ lên toàn bộ điện thoại và máy tính thành viên qua Cloud Sync.
                    </p>
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
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-700 to-[#17301F] text-amber-300 font-bold cursor-pointer flex items-center gap-1.5 shadow-md hover:brightness-110 disabled:opacity-50"
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-300" />
                      <span>{assignLoading ? 'Đang Ban Hành...' : 'Xác Nhận Bổ Nhiệm & Đồng Bộ'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: ĐỒNG THUẬN KẾ HOẠCH & KHO LƯU TRỮ ĐỀ ÁN (CO-PLANNING & ARCHIVE)
         ========================================================================= */}
      {activeTab === 'coplan' && (
        <div className="space-y-5">
          {/* Top Banner: Quyền Hạn Trưởng/Phó Ban Kế Hoạch & Ban Quản Lý */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#17331D] via-[#24472B] to-[#1E3B24] text-white border border-[#3E6847] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base font-serif-vintage tracking-wide text-white">
                  Kho Lưu Trữ Kế Hoạch Đã Duyệt & Cổng Nộp Đề Án
                </h3>
                <span className="text-[10px] bg-amber-400/20 text-amber-200 border border-amber-300/40 px-2 py-0.5 rounded font-bold">
                  Quyền Ban Kế Hoạch & BCN
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 leading-relaxed">
                Khu vực lưu trữ các đề án đã được thông qua chính thức và tiếp nhận đề án mới nộp từ <strong>Trưởng ban, Phó ban Nhân sự & Kế hoạch</strong> cùng Ban Quản lý / BCN.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isPlanAuthority ? (
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(true)}
                  className="px-4 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-900 flex items-center gap-1.5 transition cursor-pointer shadow-md"
                >
                  <PlusCircle className="w-4 h-4 text-stone-950" />
                  <span>Nộp Đề Án Kế Hoạch Mới</span>
                </button>
              ) : (
                <div className="px-3 py-1.5 rounded-xl bg-white/10 text-white/70 text-xs flex items-center gap-1.5 border border-white/10" title="Chỉ Trưởng/Phó ban Kế hoạch và BCN được nộp đề án">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Cổng Nộp Đề Án (Trưởng/Phó Ban)</span>
                </div>
              )}
            </div>
          </div>

          {/* Artistic 5-Step Project Lifecycle Banner (Lấy ý kiến dân chủ & Kho kế hoạch) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF3E3] border-2 border-[#382215]/20 shadow-[3px_3px_0px_#382215] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#C8532B]" />
                <h4 className="font-black text-xs sm:text-sm text-[#382215] font-serif-vintage uppercase tracking-wide">
                  Quy Trình 5 Bước Lấy Ý Kiến Dân Chủ & Phê Chuẩn Đề Án CLB
                </h4>
              </div>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#245351] text-[#FFE29A]">
                Mọi thành viên đều có quyền biểu quyết & Dislike ẩn danh
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-white border border-[#382215]/15 space-y-1">
                <div className="font-black text-[#C8532B] flex items-center gap-1">
                  <span>1. Khởi Xướng</span>
                </div>
                <p className="text-[#6E472B] leading-tight">
                  Ban Kế hoạch hoặc BCN đề xuất văn bản đề án (PDF/Ảnh).
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-[#382215]/15 space-y-1 ring-2 ring-[#C8532B]/30">
                <div className="font-black text-[#8C3B1E] flex items-center gap-1">
                  <span>2. Lấy Ý Kiến</span>
                  <span className="text-[9px] px-1 bg-rose-100 text-rose-800 rounded">Ẩn danh</span>
                </div>
                <p className="text-[#6E472B] leading-tight">
                  Biểu quyết Tán thành / Dislike kèm góp ý ẩn danh bảo mật.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-[#382215]/15 space-y-1">
                <div className="font-black text-[#245351] flex items-center gap-1">
                  <span>3. Phê Chuẩn</span>
                </div>
                <p className="text-[#6E472B] leading-tight">
                  BCN đối thoại ý kiến và biểu quyết thông qua nghị quyết.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-[#382215]/15 space-y-1">
                <div className="font-black text-[#4338CA] flex items-center gap-1">
                  <span>4. Phân Việc 4 Ban</span>
                </div>
                <p className="text-[#6E472B] leading-tight">
                  Giao đầu việc cụ thể theo timeline và deadline 4 ban.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-[#382215]/15 space-y-1">
                <div className="font-black text-[#E5A140] flex items-center gap-1">
                  <span>5. Lưu Trữ Vĩnh Viễn</span>
                </div>
                <p className="text-[#6E472B] leading-tight">
                  Đưa vào Kho Văn Kiện Lịch Sử làm tư liệu báo cáo cuối kỳ.
                </p>
              </div>
            </div>
          </div>

          {/* Sub-tabs: Active vs Archived */}
          <div className="flex items-center justify-between gap-2 border-b border-[#DFD6C3] pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCoplanView('active')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  coplanView === 'active'
                    ? 'bg-[#23432B] text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Đang Lấy Ý Kiến & Biểu Quyết ({plans.filter(p => p.status !== 'approved').length})</span>
              </button>

              <button
                type="button"
                onClick={() => setCoplanView('archived')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  coplanView === 'archived'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-white text-amber-900 border border-amber-300 hover:bg-amber-50'
                }`}
              >
                <Archive className="w-3.5 h-3.5 text-amber-500" />
                <span>Kho Lưu Trữ Kế Hoạch Đã Duyệt ({plans.filter(p => p.status === 'approved' || p.archivedAt).length})</span>
              </button>
            </div>

            <span className="text-[11px] text-stone-500 hidden sm:inline">
              {coplanView === 'archived' ? '★ Hồ sơ đề án lịch sử đã phê chuẩn' : 'Biểu quyết đồng thuận 4 ban'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans
              .filter(p => coplanView === 'archived' ? (p.status === 'approved' || p.archivedAt) : p.status !== 'approved')
              .map((plan) => {
              const totalVotes = plan.votesAgree + plan.votesDisagree;
              const agreePercent = totalVotes > 0 ? Math.round((plan.votesAgree / totalVotes) * 100) : 100;

              return (
                <div 
                  key={plan.id}
                  className={`p-5 rounded-2xl border shadow-2xs transition flex flex-col justify-between space-y-3.5 ${
                    plan.status === 'approved' 
                      ? 'bg-gradient-to-br from-[#FCFAF4] to-white border-amber-300/80 ring-1 ring-amber-300/40' 
                      : 'bg-white border-[#DAD0BD] hover:border-[#8BAE90]'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E5F0E4] text-[#244A2B] border border-[#BEDBC1]">
                          {plan.department}
                        </span>
                        {plan.archivedAt && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <Archive className="w-2.5 h-2.5" />
                            Đã Lưu Trữ
                          </span>
                        )}
                        {plan.attachmentUrl && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                            {plan.attachmentType === 'pdf' ? <FileText className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
                            {plan.attachmentType === 'pdf' ? 'Có File PDF Gốc' : 'Có Bản Chụp Kế Hoạch'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          plan.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          plan.status === 'in_action' ? 'bg-blue-100 text-blue-800' :
                          plan.status === 'completed' ? 'bg-stone-200 text-stone-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {plan.status === 'approved' ? '✓ Đã Phê Chuẩn Chính Thức' :
                           plan.status === 'in_action' ? 'Đang triển khai' :
                           plan.status === 'completed' ? 'Đã hoàn tất' : 'Đang lấy ý kiến'}
                        </span>

                        {onDeletePlan && (isBcnAdmin || isPlanAuthority || plan.proposedById === currentUser.id || plan.proposedBy === currentUser.name) && (
                          <button
                            type="button"
                            onClick={() => onDeletePlan(plan.id)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Xóa kế hoạch này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="font-bold text-base text-[#1E3A24] font-serif-vintage">
                      {plan.title}
                    </h4>

                    <p className="text-xs text-[#4F6854] leading-relaxed">
                      {plan.description}
                    </p>

                    {/* Original PDF / Image Attachment Box */}
                    {plan.attachmentUrl && (
                      <div className="p-3 rounded-xl bg-gradient-to-r from-[#F4EFE4] to-[#FAF7F0] border border-[#D8CEBA] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#23432B] text-amber-300 flex items-center justify-center shrink-0">
                            {plan.attachmentType === 'pdf' ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-[#1E3A24] truncate">
                              {plan.attachmentName || `${plan.title}.${plan.attachmentType === 'pdf' ? 'pdf' : 'jpg'}`}
                            </div>
                            <div className="text-[10px] text-stone-500">
                              Văn kiện kế hoạch nguyên bản ({plan.attachmentType === 'pdf' ? 'Tài liệu PDF' : 'Hình ảnh kế hoạch'})
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewPlanAttachment({
                              title: plan.title,
                              url: plan.attachmentUrl!,
                              name: plan.attachmentName || plan.title,
                              type: plan.attachmentType || 'pdf'
                            })}
                            className="px-2.5 py-1.5 rounded-lg bg-[#23432B] hover:bg-[#1B3522] text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-amber-300" />
                            <span>Xem Bản Gốc</span>
                          </button>
                          <a
                            href={plan.attachmentUrl}
                            download={plan.attachmentName || `${plan.title}.${plan.attachmentType === 'pdf' ? 'pdf' : 'png'}`}
                            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-[11px] font-bold flex items-center gap-1 transition"
                          >
                            <Download className="w-3 h-3" />
                            <span>Tải Về</span>
                          </a>
                        </div>
                      </div>
                    )}

                    <div className="text-[11px] text-stone-600 space-y-1 bg-[#FAF6EE] p-2.5 rounded-xl border border-[#EDE5D6]">
                      <div className="flex justify-between">
                        <span>Thời gian: <strong>{plan.timeline}</strong></span>
                        <span>Đối tượng: <strong>{plan.targetAudience}</strong></span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dự toán kinh phí: <strong>{plan.budgetEstimate?.toLocaleString('vi-VN')} đ</strong></span>
                        <span>Đề xuất: <strong>{plan.proposedBy}</strong></span>
                      </div>
                      {plan.archivedAt && (
                        <div className="pt-1 border-t border-[#EAE0D0] text-[10px] text-amber-800 font-semibold flex items-center gap-1">
                          <BadgeCheck className="w-3 h-3 text-amber-600" />
                          <span>Lưu trữ hồ sơ ngày: {plan.archivedAt}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Voting bar */}
                  <div className="pt-2 border-t border-[#EDE5D6] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] font-bold text-stone-600">
                        Độ đồng thuận CLB ({agreePercent}%)
                      </span>
                      <span className="text-[11px] text-stone-500">
                        {plan.votesAgree} tán thành • {plan.votesDisagree} ý kiến
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-stone-200 overflow-hidden flex">
                      <div className="bg-emerald-600 h-full transition-all" style={{ width: `${agreePercent}%` }} />
                      <div className="bg-rose-400 h-full transition-all" style={{ width: `${100 - agreePercent}%` }} />
                    </div>

                    <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onVotePlan(plan.id, 'agree')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1 ${
                            plan.userVoted === 'agree'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs'
                              : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3 text-emerald-600" />
                          <span>Tán thành ({plan.votesAgree})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDislikingPlan(plan);
                            setDislikeCategory('Nội dung chưa phù hợp');
                            setDislikeReason('');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1 ${
                            plan.userVoted === 'disagree'
                              ? 'bg-rose-100 text-rose-800 border-rose-300 shadow-2xs'
                              : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'
                          }`}
                          title="Không tán thành / Gửi ý kiến phản biện ẩn danh"
                        >
                          <ThumbsDown className="w-3 h-3 text-rose-600" />
                          <span>Góp ý / Dislike ({plan.votesDisagree})</span>
                        </button>

                        {plan.anonymousDislikes && plan.anonymousDislikes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setViewingFeedbackPlan(plan)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#FAF3E3] hover:bg-[#F2E5C9] text-[#8C3B1E] border border-[#382215]/25 flex items-center gap-1 cursor-pointer transition shadow-2xs"
                            title="Xem các ý kiến phản biện ẩn danh từ thành viên"
                          >
                            <MessageSquare className="w-3 h-3 text-[#C8532B]" />
                            <span>{plan.anonymousDislikes.length} Góp ý ẩn danh</span>
                          </button>
                        )}
                      </div>

                      {isPlanAuthority && (
                        <select
                          value={plan.status}
                          onChange={(e) => onUpdatePlanStatus(plan.id, e.target.value as ClubPlan['status'])}
                          className="px-2 py-1 rounded-lg bg-stone-100 border border-stone-300 text-[11px] font-bold text-stone-800 cursor-pointer"
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

            {plans.filter(p => coplanView === 'archived' ? (p.status === 'approved' || p.archivedAt) : p.status !== 'approved').length === 0 && (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-stone-200 p-6 space-y-2">
                <FolderArchive className="w-10 h-10 text-stone-300 mx-auto" />
                <h5 className="font-bold text-stone-700 text-sm">
                  {coplanView === 'archived' ? 'Kho đề án đã duyệt hiện chưa có kế hoạch' : 'Không có kế hoạch nào đang trong trạng thái bàn thảo'}
                </h5>
                <p className="text-xs text-stone-500">
                  {coplanView === 'archived' 
                    ? 'Khi kế hoạch được biểu quyết thông qua hoặc tải lên kho lưu trữ, kế hoạch sẽ hiển thị tại đây.' 
                    : 'Bấm nút "Nộp Đề Án Kế Hoạch Mới" để tải file PDF/hình ảnh đề án mới cho CLB.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: BẢNG NHIỆM VỤ 4 BAN (TASK MANAGEMENT)
         ========================================================================= */}
      {activeTab === 'tasks' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#DAD0BD]">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#1E3A24] font-serif-vintage">
                Bảng Phân Công Nhiệm Vụ 4 Ban Chuyên Môn
              </h3>
              <p className="text-xs text-[#526D57]">
                Theo dõi tiến độ, đôn đốc ban viên và ghi nhận điểm Lửa cống hiến
              </p>
            </div>

            {(isBcnAdmin || isPlanAuthority || currentUser.position === 'head' || currentUser.position === 'deputy') && (
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-[#23432B] hover:bg-[#1B3522] text-[#FAF6EB] flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Giao Việc Mới</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {tasks.map((task) => (
              <div 
                key={task.id}
                className="bg-white p-4 rounded-2xl border border-[#DAD0BD] shadow-2xs hover:border-[#8BAE90] transition flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FAF5E8] text-[#334E39] border border-[#DFD6C3]">
                      {task.assignedToDept}
                    </span>

                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        task.status === 'done' ? 'bg-emerald-100 text-emerald-800' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {task.status === 'done' ? 'Hoàn thành' :
                         task.status === 'in_progress' ? 'Đang làm' : 'Chờ làm'}
                      </span>

                      {onDeleteTask && (isBcnAdmin || isPlanAuthority) && (
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.id)}
                          className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Xóa đầu việc này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h4 className="font-bold text-sm text-[#1E3A24] font-serif-vintage">
                    {task.title}
                  </h4>

                  {task.description && (
                    <p className="text-xs text-stone-600 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="text-[11px] text-stone-500 pt-1 space-y-0.5">
                    <div>Người phụ trách: <strong>{task.assignedToMemberName}</strong></div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span>Hạn: <strong>{task.deadline}</strong></span>
                      <span className="text-amber-700 font-bold">+{task.rewardPoints} Điểm Lửa</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#EAE3D4] flex items-center justify-between">
                  {task.status !== 'done' ? (
                    isBcnAdmin || currentUser.position === 'head' || currentUser.position === 'deputy' ? (
                      <button
                        type="button"
                        onClick={() => onCompleteTaskAndReward(task.id, task.assignedToMemberName, task.rewardPoints)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>Duyệt Xong & Thưởng</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-stone-500">Cập nhật trạng thái 👉</span>
                    )
                  ) : (
                    <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Đã ghi nhận
                    </span>
                  )}

                  <select
                    value={task.status}
                    onChange={(e) => onUpdateTaskStatus(task.id, e.target.value as ClubTask['status'])}
                    className="text-[10px] font-semibold px-2 py-1 rounded bg-stone-100 border border-stone-300 text-stone-700"
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

      {/* =========================================================================
          TAB 4: KHEN THƯỞNG HUÂN CHƯƠNG (MERIT AWARDS)
         ========================================================================= */}
      {activeTab === 'awards' && (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-[#DAD0BD] shadow-2xs space-y-4">
            <div>
              <h3 className="font-bold text-base text-[#1E3A24] font-serif-vintage">
                Trao Tặng Huân Chương & Vinh Danh Sinh Viên Cống Hiến
              </h3>
              <p className="text-xs text-[#526D57]">
                Công nhận thành tích xuất sắc, cộng điểm Lửa vào hồ sơ Sinh Viên 5 Tốt của bạn
              </p>
            </div>

            <form onSubmit={handleAwardSubmit} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Chọn Thành Viên Vinh Danh:
                </label>
                <select
                  value={selectedUserToAward}
                  onChange={(e) => setSelectedUserToAward(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF6EE] border border-[#D5CBBC] text-xs font-medium text-stone-800"
                >
                  {userList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.nickname ? `(${u.nickname})` : ''} - {u.department} • MSSV: {u.studentId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Chọn Huân Chương Trao Tặng:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableBadges.map((b) => (
                    <div
                      key={b.name}
                      onClick={() => { setSelectedBadge(b.name); setBonusPoints(b.points); }}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex flex-col justify-between ${
                        selectedBadge === b.name
                          ? 'border-amber-500 bg-amber-50 shadow-2xs'
                          : 'border-stone-200 bg-white hover:border-amber-300'
                      }`}
                    >
                      <div className="font-bold text-stone-900 flex items-center justify-between">
                        <span>{b.name}</span>
                        <span className="text-[10px] text-amber-700 font-extrabold">+{b.points}đ</span>
                      </div>
                      <div className="text-[10px] text-stone-500 mt-1 line-clamp-2">{b.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-900 shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Gift className="w-4 h-4" />
                <span>Trao Huân Chương & Khắc Tên Vinh Danh</span>
              </button>
            </form>
          </div>

          {/* Danh Sách Thành Viên Đã Nhận Huân Chương */}
          <div className="bg-white p-5 rounded-2xl border border-[#DAD0BD] shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h4 className="font-bold text-sm text-[#1E3A24] font-serif-vintage">
                  Danh Sách Nhân Sự Đã Nhận Huân Chương Danh Dự
                </h4>
                <p className="text-xs text-stone-500">
                  Đồng bộ tự động tại Bảng Quản Trị Nhân Sự, Đánh Giá Năng Lực Thành Viên & Điều Hành BCN
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs">
                {userList.filter(u => u.id !== 'bcn-root' && u.badges && u.badges.length > 0).length} thành viên
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {userList
                .filter(u => u.id !== 'bcn-root' && u.badges && u.badges.length > 0)
                .map(u => (
                  <div key={`award-tab-${u.id}`} className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#DED4C1] space-y-2">
                    <div className="flex items-center gap-2.5">
                      <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-xl object-cover border border-stone-300 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-[#1E3A24] truncate">{u.name}</div>
                        <div className="text-[10px] text-stone-500 truncate">{u.position || u.department} • {u.studentId}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1.5 border-t border-stone-200/70">
                      {u.badges.map((badge, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-lg bg-amber-200/70 text-amber-950 border border-amber-400 text-[10px] font-bold flex items-center gap-1">
                          <Award className="w-3 h-3 text-amber-700 shrink-0" />
                          <span>{badge}</span>
                          {onRemoveBadge && isBcnAdmin && (
                            <button
                              type="button"
                              onClick={() => onRemoveBadge(u.id, badge)}
                              className="ml-1 text-rose-700 hover:text-rose-900 font-black cursor-pointer hover:scale-125 transition"
                              title="Xóa khen thưởng / huân chương bấm lộn này"
                            >
                              ✕
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: SẮC LỆNH & THÔNG TRI (CLUB DECREES)
         ========================================================================= */}
      {activeTab === 'decrees' && (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-[#DAD0BD] shadow-2xs space-y-4">
            <div>
              <h3 className="font-bold text-base text-[#1E3A24] font-serif-vintage">
                Ban Bố Sắc Lệnh & Thông Tri Đảo Sách
              </h3>
              <p className="text-xs text-[#526D57]">
                Thông tri sẽ được ghim trực tiếp lên Dynamic Book Island ở đỉnh màn hình cho toàn bộ thành viên
              </p>
            </div>

            <form onSubmit={handleIssueDecreeSubmit} className="space-y-3 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Tiêu Đề Thông Tri / Sắc Lệnh:
                </label>
                <input
                  type="text"
                  value={decreeTitle}
                  onChange={(e) => setDecreeTitle(e.target.value)}
                  placeholder="Ví dụ: Lệnh triệu tập họp Ban Nội Dung; Mở cổng tuyển CTV đợt 2..."
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF6EE] border border-[#D5CBBC] text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Nội Dung Chi Tiết:
                </label>
                <textarea
                  rows={3}
                  value={decreeContent}
                  onChange={(e) => setDecreeContent(e.target.value)}
                  placeholder="Nội dung truyền đạt cụ thể đến các ban viên..."
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF6EE] border border-[#D5CBBC] text-xs font-medium"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                {(['urgent', 'announcement', 'award'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDecreeType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      decreeType === t
                        ? 'bg-[#1E3A24] text-white border-[#1E3A24]'
                        : 'bg-white text-stone-700 border-stone-300'
                    }`}
                  >
                    {t === 'urgent' ? '⚡ Khẩn cấp' : t === 'announcement' ? '📢 Thông báo chung' : '🏆 Khen thưởng'}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-[#23432B] hover:bg-[#1B3522] text-[#FAF6EB] shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Megaphone className="w-4 h-4 text-amber-300" />
                <span>Ban Bố Lên Toàn Hệ Thống CLB</span>
              </button>
            </form>
          </div>

          {/* List of past decrees */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs text-[#2A4831] uppercase tracking-wider">
              Lịch Sử Sắc Lệnh Đã Ban Bố ({decrees.length})
            </h4>
            <div className="space-y-2">
              {decrees.map((d) => (
                <div key={d.id} className="p-3 bg-white rounded-xl border border-[#DAD0BD] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1E3A24]">{d.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-400">{d.issuedAt} • {d.issuedBy}</span>
                      {onDeleteDecree && isBcnAdmin && (
                        <button
                          type="button"
                          onClick={() => onDeleteDecree(d.id)}
                          className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Xóa sắc lệnh này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-stone-600">{d.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB: XUẤT / NHẬP DỮ LIỆU DỰ PHÒNG (JSON BACKUP & RESTORE)
         ========================================================================= */}
      {activeTab === 'backup' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Header Banner */}
          <div className="relative p-[1.5px] rounded-3xl bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-500 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-br from-[#122818] via-[#17301F] to-[#0E1F13] text-white p-5 sm:p-7 rounded-[22px] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-emerald-600 text-stone-950 flex items-center justify-center font-bold shadow-md">
                    <Database className="w-5 h-5 text-stone-950" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-400 text-stone-950 uppercase tracking-wider">
                        Quản Trị Tối Cao
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/40">
                        Bảo Toàn Bất Biến
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold font-serif-vintage tracking-tight text-white mt-1">
                      Xuất / Nhập Dữ Liệu Dự Phòng (JSON)
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 text-emerald-300 border border-emerald-400/30 text-xs font-semibold backdrop-blur-xs">
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    Lưu Trữ Kép Trên Máy Chủ
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-3xl">
                Công cụ xuất và nhập dữ liệu dự phòng toàn vẹn cho Ban Chủ Nhiệm. Bạn có thể tải file <code className="px-1.5 py-0.5 bg-black/40 rounded text-amber-300 font-mono text-[11px]">.json</code> chứa toàn bộ trạng thái app về máy và nạp lại bất cứ lúc nào để phục hồi mọi thông tin thành viên, kế hoạch, thu chi, bài viết và nhiệm vụ.
              </p>

              {/* Live Data Summary Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2 border-t border-white/10 text-xs">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-[10px] text-emerald-300 font-bold">Thành Viên</div>
                  <div className="text-base font-extrabold text-white mt-0.5">{userList.length}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-[10px] text-amber-300 font-bold">Kế Hoạch</div>
                  <div className="text-base font-extrabold text-white mt-0.5">{plans.length}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-[10px] text-teal-300 font-bold">Thu Chi Quỹ</div>
                  <div className="text-base font-extrabold text-white mt-0.5">{transactions.length}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-[10px] text-blue-300 font-bold">Bài Viết</div>
                  <div className="text-base font-extrabold text-white mt-0.5">{posts.length}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-[10px] text-purple-300 font-bold">Nhiệm Vụ</div>
                  <div className="text-base font-extrabold text-white mt-0.5">{tasks.length}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-[10px] text-rose-300 font-bold">Báo Cáo Mật</div>
                  <div className="text-base font-extrabold text-white mt-0.5">{reports.length}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-[10px] text-yellow-300 font-bold">Sắc Lệnh</div>
                  <div className="text-base font-extrabold text-white mt-0.5">{decrees.length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Alert toasts */}
          {restoreSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs sm:text-sm flex items-center gap-3 shadow-md animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span><strong>Khôi phục thành công:</strong> {restoreSuccess}</span>
            </div>
          )}

          {restoreError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 text-xs sm:text-sm flex items-center gap-3 shadow-md animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span><strong>Không thể khôi phục:</strong> {restoreError}</span>
            </div>
          )}

          {/* Operational Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CARD 1: XUẤT DỮ LIỆU DỰ PHÒNG */}
            <div className="p-[1.5px] rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-400 to-[#1E3A24] shadow-md">
              <div className="bg-[#FAF7F0] p-6 rounded-[14.5px] space-y-4 h-full flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 border-b border-[#E3DAC7] pb-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      <Download className="w-5 h-5 text-emerald-800" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-[#1E3A24] font-serif-vintage">
                        Xuất Tệp JSON Dự Phòng (Export)
                      </h4>
                      <p className="text-[11px] text-[#557058]">
                        Tải toàn bộ trạng thái app về máy an toàn
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-stone-700 leading-relaxed">
                    Tạo một bản sao lưu toàn diện chứa mọi dữ liệu của câu lạc bộ tại thời điểm hiện tại:
                  </p>

                  <ul className="text-xs text-stone-600 space-y-1.5 pl-1">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span><strong>{userList.length} tài khoản thành viên</strong> (thông tin cá nhân, ban chuyên môn, điểm Lửa cống hiến, huân chương).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span><strong>{plans.length} đề án kế hoạch</strong> (ngân sách, timeline, số phiếu đồng thuận BCN).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span><strong>{transactions.length} giao dịch thu chi</strong> két quỹ BCN và chứng từ.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span><strong>{posts.length} bài viết E-News, tản văn</strong>, hình ảnh và bình luận sinh viên.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span><strong>{tasks.length} nhiệm vụ 4 ban</strong>, các sắc lệnh thông tri và hồ sơ báo cáo mật.</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-[#E3DAC7] space-y-2">
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#17301F] via-[#20442B] to-[#17301F] hover:from-[#1D3B26] hover:to-[#122818] text-amber-300 border border-amber-400/40 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-amber-300" />
                    <span>Tải File JSON Chứa Toàn Bộ Trạng Thái Về Máy</span>
                  </button>
                  <p className="text-[10px] text-stone-500 text-center">
                    Tên file tự động: <code>agu_club_backup_{new Date().toISOString().slice(0, 10)}.json</code>
                  </p>
                </div>
              </div>
            </div>

            {/* CARD 2: NHẬP DỮ LIỆU DỰ PHÒNG */}
            <div className="p-[1.5px] rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-300 to-[#1E3A24] shadow-md">
              <div className="bg-[#FAF7F0] p-6 rounded-[14.5px] space-y-4 h-full flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 border-b border-[#E3DAC7] pb-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                      <Upload className="w-5 h-5 text-amber-800" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-[#1E3A24] font-serif-vintage">
                        Nạp Lại File JSON & Khôi Phục (Import)
                      </h4>
                      <p className="text-[11px] text-[#557058]">
                        Khôi phục mọi thông tin từ file dự phòng
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-stone-700 leading-relaxed">
                    Sử dụng file JSON đã tải về trước đó để khôi phục toàn bộ thông tin câu lạc bộ khi cần thiết:
                  </p>

                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5 text-amber-950">
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                      Quy trình khôi phục an toàn:
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      1. Chọn file <code>.json</code> từ máy của bạn.<br />
                      2. Hệ thống kiểm tra cấu trúc dữ liệu và hiển thị bảng tóm tắt.<br />
                      3. Nhập mã xác thực câu lạc bộ và xác nhận nạp.<br />
                      4. Mọi thành viên, kế hoạch, thu chi được cập nhật ngay lập tức.
                    </p>
                  </div>

                  <div className="text-[11px] text-stone-600 bg-white p-2.5 rounded-lg border border-[#DDD3BF]">
                    💡 <strong>Lưu ý:</strong> Sau khi nạp, toàn bộ thiết bị đang trực tuyến của các thành viên sẽ tự động nhận dữ liệu mới trong vòng vài giây.
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E3DAC7]">
                  <label className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-amber-200 text-stone-950 border border-amber-500/50 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <Upload className="w-4 h-4 text-stone-950" />
                    <span>Chọn File JSON Để Nạp Lại Dữ Liệu</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleSelectBackupFile}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-stone-500 text-center mt-2">
                    Chỉ hỗ trợ tệp định dạng .json hợp lệ do hệ thống xuất ra
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Server Dual Persistence Notice Box */}
          <div className="p-4 rounded-2xl bg-white border border-[#DDD3BF] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <HardDrive className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-stone-900 text-xs sm:text-sm flex items-center gap-2">
                  <span>Cơ Chế Lưu Trữ Đĩa Cứng Tự Động (Dual Persistent Database)</span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    Hoạt động 24/7
                  </span>
                </div>
                <p className="text-stone-600 text-[11px] leading-relaxed">
                  Mọi thay đổi từ bất kỳ thành viên nào đều được lưu song song vào <code>data/club_db.json</code> và <code>data/seed.json</code>. Dù AI Studio có cập nhật hay khởi động lại phiên làm việc, dữ liệu của bạn không bao giờ bị mất!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadBackup}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#FAF7F0] hover:bg-[#EFE9DC] text-[#1E3A24] border border-[#D5CBBC] flex items-center gap-1.5 shrink-0 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Tải Bản Sao Lưu Ngay
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS: NEW PLAN & NEW TASK
         ========================================================================= */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FAF7F0] w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-[#DAD0BD] shadow-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E3DAC7] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#1E3A24] font-serif-vintage">
                  Tải Lên & Đề Xuất Kế Hoạch Hoạt Động Mới
                </h3>
                <p className="text-[11px] text-[#557058]">
                  Hỗ trợ đính kèm văn kiện kế hoạch nguyên bản (.PDF hoặc Hình ảnh)
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsPlanModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-800 mb-1">Tên Đề Án / Kế Hoạch:</label>
                <input
                  type="text"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  placeholder="Ví dụ: Kế hoạch Ngày Hội Đọc Sách AGU 2026..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#D5CBBC] font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-stone-800 mb-1">Ban Đề Xuất:</label>
                  <select
                    value={planDept}
                    onChange={(e) => setPlanDept(e.target.value as DepartmentType)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D5CBBC]"
                  >
                    <option value="Nhân sự & Kế hoạch">Nhân sự & Kế hoạch</option>
                    <option value="Nội dung">Nội dung</option>
                    <option value="Truyền thông">Truyền thông</option>
                    <option value="Hậu cần">Hậu cần</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-800 mb-1">Thời Gian Dự Kiến:</label>
                  <input
                    type="text"
                    value={planTimeline}
                    onChange={(e) => setPlanTimeline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D5CBBC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-stone-800 mb-1">Dự Toán Kinh Phí (VNĐ):</label>
                  <input
                    type="number"
                    value={planBudget}
                    onChange={(e) => setPlanBudget(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D5CBBC] font-semibold text-emerald-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-800 mb-1">Đối Tượng Hướng Tới:</label>
                  <input
                    type="text"
                    value={planAudience}
                    onChange={(e) => setPlanAudience(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D5CBBC]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Mục Đích & Tóm Tắt Nội Dung:</label>
                <textarea
                  rows={3}
                  value={planDesc}
                  onChange={(e) => setPlanDesc(e.target.value)}
                  placeholder="Mô tả mục tiêu, ý nghĩa và phương thức triển khai..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#D5CBBC]"
                  required
                />
              </div>

              {/* Upload Original PDF or Image */}
              <div className="p-3.5 rounded-xl bg-white border border-[#D5CBBC] space-y-2.5">
                <label className="block font-bold text-[#1E3A24]">
                  Đính Kèm Bản Gốc Kế Hoạch (File PDF hoặc Hình Ảnh):
                </label>

                <label className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-emerald-600/40 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900 font-bold flex items-center justify-center gap-2 cursor-pointer transition">
                  <FileUp className="w-4 h-4 text-emerald-700" />
                  <span>{isUploadingPlanFile ? 'Đang xử lý tệp...' : 'Chọn File PDF (.pdf) hoặc Hình Ảnh từ thiết bị'}</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf,image/*"
                    onChange={handlePlanFileUpload}
                    className="hidden"
                  />
                </label>

                {planUploadError && (
                  <p className="text-[11px] text-rose-600 font-semibold">{planUploadError}</p>
                )}

                {planAttachmentUrl && (
                  <div className="p-2.5 rounded-lg bg-[#FAF6EE] border border-amber-300 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {planAttachmentType === 'pdf' ? (
                        <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      <span className="text-[11px] font-bold text-stone-800 truncate">
                        {planAttachmentName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPlanAttachmentUrl('');
                        setPlanAttachmentName('');
                      }}
                      className="text-[10px] font-bold text-rose-600 hover:underline shrink-0 cursor-pointer"
                    >
                      Gỡ tệp
                    </button>
                  </div>
                )}
              </div>

              {isBcnAdmin && (
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={archiveDirectly}
                    onChange={(e) => setArchiveDirectly(e.target.checked)}
                    className="rounded text-emerald-700"
                  />
                  <span className="text-[11px] font-bold text-amber-950">
                    Phê chuẩn chính thức & đưa thẳng vào Kho Lưu Trữ Kế Hoạch Đã Duyệt
                  </span>
                </label>
              )}

              <button
                type="submit"
                disabled={isUploadingPlanFile}
                className="w-full py-2.5 rounded-xl font-bold bg-[#23432B] text-amber-300 hover:bg-[#1B3522] transition cursor-pointer shadow-md"
              >
                {archiveDirectly && isBcnAdmin ? 'Lưu Trữ Vào Kho Kế Hoạch Chính Thức' : 'Nộp Đề Án Lên Ban Chủ Nhiệm Phê Duyệt'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: PREVIEW ORIGINAL PLAN ATTACHMENT (PDF OR IMAGE)
         ========================================================================= */}
      {previewPlanAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FAF7F0] w-full max-w-4xl h-[88vh] rounded-2xl border border-[#DAD0BD] shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#17301F] text-white">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-400 text-stone-950 text-[10px] font-black uppercase">
                    {previewPlanAttachment.type === 'pdf' ? 'Bản Gốc PDF' : 'Bản Gốc Hình Ảnh'}
                  </span>
                  <h3 className="font-bold text-sm sm:text-base truncate font-serif-vintage">
                    {previewPlanAttachment.title}
                  </h3>
                </div>
                <p className="text-[11px] text-emerald-200 truncate mt-0.5">
                  Tệp: {previewPlanAttachment.name}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewPlanAttachment.url}
                  download={previewPlanAttachment.name}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải Bản Gốc</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPlanAttachment(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-stone-900 overflow-auto flex items-center justify-center p-2">
              {previewPlanAttachment.type === 'pdf' ? (
                <iframe
                  src={previewPlanAttachment.url}
                  title={previewPlanAttachment.title}
                  className="w-full h-full rounded-xl bg-white border-0"
                />
              ) : (
                <img
                  src={previewPlanAttachment.url}
                  alt={previewPlanAttachment.title}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
      {/* =========================================================================
          MODAL: ANONYMOUS DISLIKE FEEDBACK FOR CLUB PLAN / PROJECT
         ========================================================================= */}
      {dislikingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FAF3E3] w-full max-w-lg rounded-3xl border-3 border-[#382215] shadow-2xl p-6 space-y-4 text-[#382215]">
            <div className="flex items-start justify-between border-b-2 border-[#382215]/20 pb-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                  <span>100% Ẩn Danh · Quyền Phản Biện Dân Chủ</span>
                </div>
                <h3 className="font-black text-lg text-[#382215] font-serif-vintage">
                  Đánh Giá Không Hợp & Góp Ý Kế Hoạch
                </h3>
                <p className="text-xs text-[#6E472B] font-medium">
                  Đề án: <strong>{dislikingPlan.title}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDislikingPlan(null)}
                className="p-1 rounded-lg hover:bg-[#EAE0D0] text-[#382215] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!dislikingPlan) return;
                onVotePlan(
                  dislikingPlan.id,
                  'disagree',
                  dislikeReason.trim() || 'Thành viên đóng góp ý kiến phản biện ẩn danh',
                  dislikeCategory
                );
                confetti({ particleCount: 45, spread: 60, origin: { y: 0.6 } });
                setDislikingPlan(null);
                setDislikeReason('');
              }}
              className="space-y-4 text-xs"
            >
              <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-300 text-xs text-[#5C432C] space-y-1">
                <p className="font-bold text-[#8C3B1E]">
                  🛡️ Bảo Vệ Quyền Lợi & Danh Tính Của Bạn:
                </p>
                <p>
                  Ý kiến đánh giá và lý do không hợp của bạn sẽ được chuyển đến BCN và Trưởng nhóm đề án một cách <strong>hoàn toàn ẩn danh</strong>. Hệ thống không lưu tên, MSSV hay tài khoản để đảm bảo mọi thành viên đều tự do lên tiếng chân thành.
                </p>
              </div>

              <div>
                <label className="block font-black text-[#382215] mb-1.5">
                  Chọn lý do chính bạn thấy kế hoạch chưa phù hợp *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    'Kinh phí chưa hợp lý',
                    'Thời gian không khả thi',
                    'Nội dung chưa phù hợp',
                    'Thiếu nhân lực thực hiện',
                    'Góp ý cải tiến khác'
                  ].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setDislikeCategory(cat as any)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold text-left border transition cursor-pointer flex items-center justify-between ${
                        dislikeCategory === cat
                          ? 'bg-[#C8532B] text-white border-[#382215] shadow-xs'
                          : 'bg-white text-[#382215] border-[#382215]/20 hover:bg-[#F2E5C9]'
                      }`}
                    >
                      <span>{cat}</span>
                      {dislikeCategory === cat && <Check className="w-3.5 h-3.5 text-[#FFE29A]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-black text-[#382215] mb-1">
                  Nêu chi tiết lý do và đề xuất cải tiến của bạn *
                </label>
                <textarea
                  rows={3}
                  required
                  value={dislikeReason}
                  onChange={(e) => setDislikeReason(e.target.value)}
                  placeholder="Ví dụ: Thời gian tổ chức trùng lịch thi cuối kỳ của sinh viên; hoặc dự toán kinh phí 2.5 triệu cho giải thưởng cần điều chỉnh để cân đối quỹ..."
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-[#382215]/30 bg-white text-xs focus:ring-2 focus:ring-[#C8532B]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#382215]/20">
                <button
                  type="button"
                  onClick={() => setDislikingPlan(null)}
                  className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C8532B] hover:bg-[#A63A16] text-white font-black border-2 border-[#382215] shadow-[2px_2px_0px_#382215] cursor-pointer flex items-center gap-1.5 transition"
                >
                  <ThumbsDown className="w-3.5 h-3.5 text-[#FFE29A]" />
                  <span>Xác Nhận Dislike & Gửi Ý Kiến Ẩn Danh</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: VIEW ALL ANONYMOUS FEEDBACKS FOR A PLAN
         ========================================================================= */}
      {viewingFeedbackPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FAF3E3] w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl border-3 border-[#382215] shadow-2xl overflow-hidden text-[#382215]">
            <div className="p-5 bg-[#382215] text-[#FAF3E3] flex items-center justify-between border-b-2 border-[#382215]">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 text-[#E5A140]" />
                <div>
                  <h3 className="font-black text-base font-serif-vintage">
                    Ý Kiến Đóng Góp & Phản Biện Ẩn Danh ({viewingFeedbackPlan.anonymousDislikes?.length || 0})
                  </h3>
                  <p className="text-[11px] text-[#FFE29A] font-semibold truncate max-w-md">
                    Kế hoạch: {viewingFeedbackPlan.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingFeedbackPlan(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-[#5C432C]">
                <strong>Ghi chú bảo mật:</strong> Mọi ý kiến đều được công khai nội dung cho tập thể CLB tham khảo và cải tiến đề án, đồng thời bảo mật danh tính tuyệt đối cho người đóng góp.
              </div>

              {(!viewingFeedbackPlan.anonymousDislikes || viewingFeedbackPlan.anonymousDislikes.length === 0) ? (
                <div className="py-8 text-center text-[#6E472B]">
                  Chưa có ý kiến phản biện nào được gửi cho kế hoạch này.
                </div>
              ) : (
                viewingFeedbackPlan.anonymousDislikes.map((fb, idx) => (
                  <div
                    key={fb.id || `fb-${idx}`}
                    className="p-4 rounded-2xl bg-white border-2 border-[#382215]/20 shadow-[2px_2px_0px_#382215] space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-300">
                        {fb.category}
                      </span>
                      <span className="text-[11px] text-[#6E472B] font-mono">
                        {fb.submittedAt}
                      </span>
                    </div>
                    <p className="text-xs text-[#382215] leading-relaxed font-serif-vintage italic">
                      "{fb.reason}"
                    </p>
                    <div className="text-[10px] text-emerald-800 font-bold flex items-center gap-1 pt-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Đóng góp bởi Thành viên ẩn danh</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-[#F2E5C9] border-t border-[#382215]/20 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingFeedbackPlan(null)}
                className="px-5 py-2 rounded-xl bg-[#382215] text-white text-xs font-bold hover:bg-[#5C432C] cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FAF7F0] w-full max-w-lg rounded-2xl border border-[#DAD0BD] shadow-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E3DAC7] pb-3">
              <h3 className="font-bold text-base text-[#1E3A24] font-serif-vintage">
                Giao Đầu Việc Cho Ban Chuyên Môn
              </h3>
              <button 
                type="button" 
                onClick={() => setIsTaskModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-800 mb-1">Tên Nhiệm Vụ:</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Ví dụ: Thiết kế banner bài viết Sách hay..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#D5CBBC] font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-800 mb-1">Ban Chịu Trách Nhiệm:</label>
                  <select
                    value={taskDept}
                    onChange={(e) => setTaskDept(e.target.value as DepartmentType)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D5CBBC]"
                  >
                    <option value="Truyền thông">Truyền thông</option>
                    <option value="Nội dung">Nội dung</option>
                    <option value="Nhân sự & Kế hoạch">Nhân sự & Kế hoạch</option>
                    <option value="Hậu cần">Hậu cần</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-800 mb-1">Người Thực Hiện:</label>
                  <input
                    type="text"
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D5CBBC]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-800 mb-1">Hạn Hoàn Thành:</label>
                  <input
                    type="text"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D5CBBC]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-800 mb-1">Điểm Lửa Thưởng (+):</label>
                  <input
                    type="number"
                    value={taskPoints}
                    onChange={(e) => setTaskPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D5CBBC] font-bold text-amber-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-bold bg-[#23432B] text-white hover:bg-[#1B3522] transition cursor-pointer"
              >
                Ban Hành Đầu Việc
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          RESTORE BACKUP CONFIRMATION MODAL
         ========================================================================= */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F0] border border-[#D5CBBC] rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E3DAC7] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1E3A24] font-serif-vintage">
                    Khôi Phục Dữ Liệu CLB Từ File JSON
                  </h3>
                  <p className="text-[11px] text-[#557058]">
                    File: <strong className="text-stone-800">{pendingFileName}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsRestoreModalOpen(false);
                  setPendingRestoreData(null);
                }}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content summary */}
            <div className="bg-white p-3.5 rounded-xl border border-[#DDD3BF] text-xs space-y-2">
              <span className="font-bold text-stone-700 block">Dữ liệu phát hiện trong file sao lưu:</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-stone-50 border border-stone-200">
                  👥 Thành viên: <strong>{pendingRestoreData?.userList?.length ?? 0} người</strong>
                </div>
                <div className="p-2 rounded bg-stone-50 border border-stone-200">
                  📰 Bài viết: <strong>{pendingRestoreData?.posts?.length ?? 0} bài</strong>
                </div>
                <div className="p-2 rounded bg-stone-50 border border-stone-200">
                  📸 Locket: <strong>{pendingRestoreData?.locketMoments?.length ?? 0} khoảnh khắc</strong>
                </div>
                <div className="p-2 rounded bg-stone-50 border border-stone-200">
                  📋 Kế hoạch: <strong>{pendingRestoreData?.plans?.length ?? 0} đề án</strong>
                </div>
                <div className="p-2 rounded bg-stone-50 border border-stone-200">
                  💰 Thu chi: <strong>{pendingRestoreData?.transactions?.length ?? 0} giao dịch</strong>
                </div>
                <div className="p-2 rounded bg-stone-50 border border-stone-200">
                  🔒 Báo cáo mật: <strong>{pendingRestoreData?.reports?.length ?? 0} hồ sơ</strong>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Lưu ý quan trọng:</strong> Quá trình khôi phục sẽ ghi đè trạng thái máy chủ thành dữ liệu từ file JSON này và đồng bộ tức thì đến tất cả thiết bị của thành viên.
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Mã Xác Thực BCN Tối Cao (Passcode):
              </label>
              <input
                type="password"
                value={restorePasscode}
                onChange={(e) => setRestorePasscode(e.target.value)}
                placeholder="Nhập mã xác thực câu lạc bộ..."
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#D5CBBC] font-mono text-xs focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            {restoreError && (
              <div className="p-2.5 rounded-lg bg-rose-100 text-rose-800 text-xs font-medium">
                {restoreError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRestoreModalOpen(false);
                  setPendingRestoreData(null);
                }}
                disabled={isRestoring}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-200 hover:bg-stone-300 text-stone-700 transition cursor-pointer"
              >
                Hủy Bỏ
              </button>

              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1E3A24] hover:bg-[#284E31] text-amber-300 border border-emerald-600/50 shadow-md flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                    <span>Đang Khôi Phục...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                    <span>Xác Nhận Nạp & Khôi Phục</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

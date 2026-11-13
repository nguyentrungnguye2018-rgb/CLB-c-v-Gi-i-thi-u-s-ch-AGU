import React, { useState } from 'react';
import { 
  Crown, 
  Search, 
  UserCheck, 
  CheckCircle2, 
  X, 
  Check, 
  Medal, 
  AlertCircle, 
  Trash2, 
  Inbox, 
  UserCog, 
  ArrowRightLeft, 
  ArrowRight, 
  Send,
  GraduationCap,
  ShieldAlert,
  Clock,
  UserPlus,
  Award,
  Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, DepartmentType, ClubTermRecord } from '../types';
import {
  isMasterRootUser,
  isClubPresidentUser,
  isClubVicePresidentUser,
  canApproveDepartmentEntry,
  canApproveGroupTransfer,
  isUserInDepartment,
  getUserConcurrentRoles
} from '../utils/governance';

interface OrgChartSectionProps {
  currentUser: UserProfile;
  isBcnMode: boolean;
  userList: UserProfile[];
  termHistory?: ClubTermRecord[];
  onApproveDepartment?: (targetUserId: string, department: DepartmentType, note?: string) => void;
  onRejectDepartment?: (targetUserId: string, note?: string) => void;
  onAppointSubDeptLeaders?: (payload: {
    department: DepartmentType;
    leaderId: string;
    viceLeaderIds: string[];
  }) => Promise<{ error?: string } | void>;
  onRequestGroupTransfer?: (targetUserId: string, newDept: DepartmentType, reason: string) => void;
  onDirectGroupTransfer?: (targetUserId: string, newDept: DepartmentType, reason?: string) => void;
  onOpenSuccessionModal?: () => void;
  onDeleteUser?: (userId: string) => void;
}

type DeleteReasonCategory =
  | 'Đã tốt nghiệp'
  | 'Xin nghỉ sinh hoạt / Chuyển công tác'
  | 'Vi phạm nội quy / Không tham gia hoạt động'
  | 'Tài khoản ảo / Nhập trùng hồ sơ'
  | 'Lý do khác';

const HONORARY_EMBLEM_AVATAR = '/assets/aistudio/TUYE__N_THA_NH_VIE_N_778c37b9.png';

export const OrgChartSection: React.FC<OrgChartSectionProps> = ({
  currentUser,
  isBcnMode,
  userList,
  onApproveDepartment,
  onRejectDepartment,
  onAppointSubDeptLeaders,
  onRequestGroupTransfer,
  onDirectGroupTransfer,
  onOpenSuccessionModal,
  onDeleteUser
}) => {
  const [selectedDeptId, setSelectedDeptId] = useState<DepartmentType | 'all'>('all');
  const [searchMember, setSearchMember] = useState('');

  const [editingDept, setEditingDept] = useState<DepartmentType | null>(null);
  const [chosenLeaderId, setChosenLeaderId] = useState<string>('');
  const [chosenVice1Id, setChosenVice1Id] = useState<string>('');
  const [chosenVice2Id, setChosenVice2Id] = useState<string>('');
  const [deptModalError, setDeptModalError] = useState<string | null>(null);
  const [deptActionBanner, setDeptActionBanner] = useState<string | null>(null);

  const [transferringMember, setTransferringMember] = useState<UserProfile | null>(null);
  const [targetTransferDept, setTargetTransferDept] = useState<DepartmentType>('Truyền thông');
  const [transferReason, setTransferReason] = useState<string>('Phân công kiêm nhiệm / Điều chỉnh nhóm');
  const [directTransferToggle, setDirectTransferToggle] = useState<boolean>(true);
  const [isConcurrentMode, setIsConcurrentMode] = useState<boolean>(true);
  const [approvalDeptMap, setApprovalDeptMap] = useState<Record<string, DepartmentType>>({});

  // State quản lý xóa / chuyển đổi tốt nghiệp
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserProfile | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<DeleteReasonCategory>('Đã tốt nghiệp');
  const [deleteCustomDetail, setDeleteCustomDetail] = useState<string>('');
  const [userOverrides, setUserOverrides] = useState<Record<string, any>>({});
  const [locallyRemovedUserIds, setLocallyRemovedUserIds] = useState<string[]>([]);
  const [locallyCreatedAlumni, setLocallyCreatedAlumni] = useState<UserProfile[]>([]);

  // Modal tạo tài khoản Cựu Chủ Nhiệm Danh Dự (Chỉ Tài khoản Chính CLB bcn-root)
  const [isCreateFormerBcnOpen, setIsCreateFormerBcnOpen] = useState(false);
  const [formerName, setFormerName] = useState('');
  const [formerStudentId, setFormerStudentId] = useState('');
  const [formerFaculty, setFormerFaculty] = useState('Trường Đại học An Giang');
  const [formerTitleInput, setFormerTitleInput] = useState('Cựu Chủ nhiệm CLB');
  const [formerTermInput, setFormerTermInput] = useState('Nhiệm kỳ trước');
  const [formerEmail, setFormerEmail] = useState('');
  const [formerPassword, setFormerPassword] = useState('AGU2026');

  const isRoot = isMasterRootUser(currentUser) || currentUser.id === 'bcn-root';
  const isPresident = isClubPresidentUser(currentUser);
  const isVicePresident = isClubVicePresidentUser(currentUser);
  const canModifyOrgChart = isRoot || isPresident || isVicePresident || isBcnMode;
  const canDeleteMembers = canModifyOrgChart;

  // Hợp nhất danh sách nhân sự
  const effectiveUserList: any[] = [...userList, ...locallyCreatedAlumni]
    .filter((u) => !locallyRemovedUserIds.includes(u.id))
    .map((u) => (userOverrides[u.id] !== undefined ? { ...u, ...userOverrides[u.id] } : u));

  // Danh sách Cựu Chủ nhiệm / Cựu Phó Chủ nhiệm (được xem & bình luận góp ý)
  const formerBcnAccounts = effectiveUserList.filter(
    (u) => u.id !== 'bcn-root' && (u.clubRole === 'former_bcn' || (u.position || '').toLowerCase().includes('cựu chủ nhiệm') || (u.position || '').toLowerCase().includes('cựu phó chủ nhiệm'))
  );

  // Danh sách Cựu Thành viên sinh viên thường đã tốt nghiệp (chỉ xem - Viewer, không quyền góp ý)
  const alumniViewerAccounts = effectiveUserList.filter(
    (u) => u.id !== 'bcn-root' && u.clubRole === 'alumni_viewer'
  );

  // Danh sách chờ Account Chính duyệt xóa (các lý do không phải tốt nghiệp)
  const pendingDeletionUsers = effectiveUserList.filter(
    (u) => u.id !== 'bcn-root' && u.pendingDeletion && u.pendingDeletion.status === 'pending_root_approval'
  );

  const syncUsersToServer = async (updatedUsers: any[]) => {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'users', data: updatedUsers })
      });
    } catch (err) {
      console.error('Lỗi đồng bộ danh sách nhân sự:', err);
    }
  };

  // Tài khoản Chính (bcn-root) tạo tài khoản Cựu Chủ nhiệm Danh dự (không có ảnh đại diện cá nhân, có quyền bình luận góp ý)
  const handleCreateFormerBcnAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRoot || !formerName.trim() || !formerStudentId.trim()) return;

    const newFormerBcn: UserProfile = {
      id: `former_bcn_${Date.now()}`,
      name: formerName.trim(),
      studentId: formerStudentId.trim().toUpperCase(),
      faculty: formerFaculty.trim() || 'Cựu Sinh Viên AGU',
      avatar: HONORARY_EMBLEM_AVATAR, // Không dùng ảnh cá nhân, dùng biểu trưng danh dự
      role: 'member',
      adminType: 'member',
      clubRole: 'former_bcn',
      department: 'BQT',
      departmentStatus: 'approved',
      position: `${formerTitleInput.trim()} (${formerTermInput.trim()})`,
      formerTitle: formerTitleInput.trim(),
      term: formerTermInput.trim(),
      email: formerEmail.trim() || `${formerStudentId.trim().toLowerCase()}@agu.edu.vn`,
      password: formerPassword.trim() || 'AGU2026',
      readingStreak: 0,
      enewsStreak: 0,
      hasCheckedInToday: false,
      s5tProgress: 100,
      favoriteBook: 'Cựu Ban Chủ Nhiệm CLB',
      joinDate: formerTermInput.trim(),
      meritPoints: 100,
      badges: ['Cựu Ban Chủ Nhiệm Danh Dự 🏛️'],
      isGraduated: true,
      graduatedAt: new Date().toLocaleDateString('vi-VN'),
      canComment: true
    };

    const nextUsers = [...effectiveUserList, newFormerBcn];
    setLocallyCreatedAlumni((prev) => [...prev, newFormerBcn]);
    await syncUsersToServer(nextUsers);

    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    setDeptActionBanner(
      `Tài khoản Chính CLB đã khởi tạo thành công tài khoản danh dự cho "${newFormerBcn.name}" (${newFormerBcn.position}) — Có quyền xem & bình luận góp ý!`
    );
    setIsCreateFormerBcnOpen(false);
    setFormerName('');
    setFormerStudentId('');
    setFormerEmail('');
    setTimeout(() => setDeptActionBanner(null), 6000);
  };

  const handleInitiateDeleteMember = (member: UserProfile) => {
    setDeleteTargetUser(member);
    setDeleteCategory('Đã tốt nghiệp');
    setDeleteCustomDetail('');
  };

  // Xử lý duyệt tốt nghiệp (Chuyển thành former_bcn hoặc alumni_viewer) vs các lý do khác
  const handleConfirmDeleteFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteTargetUser) return;

    const fullReason =
      deleteCategory === 'Lý do khác'
        ? deleteCustomDetail.trim() || 'Lý do khác'
        : deleteCustomDetail.trim()
        ? `${deleteCategory} — ${deleteCustomDetail.trim()}`
        : deleteCategory;

    const isGraduated = deleteCategory === 'Đã tốt nghiệp';
    const nowStr = new Date().toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // =========================================================================
    // LUỒNG 1: ĐÃ TỐT NGHIỆP -> Rút khỏi nhân sự đương nhiệm & Chuyển đổi loại tài khoản
    // - Chủ nhiệm / Phó Chủ nhiệm -> former_bcn (Gỡ ảnh cá nhân, được xem & bình luận góp ý)
    // - Sinh viên thông thường -> alumni_viewer (Chỉ xem Viewer, khóa bình luận góp ý)
    // =========================================================================
    if (isGraduated) {
      const posLower = (deleteTargetUser.position || '').toLowerCase();
      const wasLeader =
        deleteTargetUser.clubRole === 'president' ||
        deleteTargetUser.clubRole === 'vice_president' ||
        deleteTargetUser.adminType === 'bcn_elected' ||
        posLower.includes('chủ nhiệm');

      const confirmMsg = wasLeader
        ? `Xác nhận "${deleteTargetUser.name}" đã tốt nghiệp? Tài khoản sẽ rút khỏi Ban điều hành đương nhiệm và chuyển thành Tài khoản Cựu Ban Chủ Nhiệm (không ảnh cá nhân, được xem & bình luận góp ý).`
        : `Xác nhận "${deleteTargetUser.name}" đã tốt nghiệp? Tài khoản sẽ rút khỏi danh sách nhân sự 4 ban và chuyển thành Tài khoản Cựu Thành Viên Viewer (chỉ được xem, không có quyền bình luận góp ý).`;

      if (!window.confirm(confirmMsg)) return;

      const convertedPatch = wasLeader
        ? {
            role: 'member' as const,
            adminType: 'member' as const,
            clubRole: 'former_bcn' as const,
            department: 'BQT' as DepartmentType,
            departmentRole: 'member' as const,
            concurrentRoles: [],
            avatar: HONORARY_EMBLEM_AVATAR,
            formerTitle: deleteTargetUser.position || 'Cựu Ban Chủ Nhiệm CLB',
            position: `Cựu ${deleteTargetUser.position || 'Ban Chủ Nhiệm CLB'} (Đã tốt nghiệp)`,
            isGraduated: true,
            graduatedAt: nowStr,
            canComment: true,
            pendingDeletion: null
          }
        : {
            role: 'member' as const,
            adminType: 'member' as const,
            clubRole: 'alumni_viewer' as const,
            departmentRole: 'member' as const,
            concurrentRoles: [],
            position: `Cựu Thành Viên CLB (Đã tốt nghiệp - Chế độ Xem)`,
            isGraduated: true,
            graduatedAt: nowStr,
            canComment: false,
            pendingDeletion: null
          };

      setUserOverrides((prev) => ({
        ...prev,
        [deleteTargetUser.id]: convertedPatch
      }));

      const updatedUsers = effectiveUserList.map((u) =>
        u.id === deleteTargetUser.id ? { ...u, ...convertedPatch } : u
      );
      await syncUsersToServer(updatedUsers);

      setDeptActionBanner(
        wasLeader
          ? `Đã chuyển "${deleteTargetUser.name}" sang Tài khoản Cựu Ban Chủ Nhiệm (được xem & bình luận góp ý)!`
          : `Đã chuyển "${deleteTargetUser.name}" sang Tài khoản Cựu Thành Viên Viewer (chỉ xem, khóa quyền góp ý)!`
      );
      setDeleteTargetUser(null);
      setTimeout(() => setDeptActionBanner(null), 6000);
      return;
    }

    // =========================================================================
    // LUỒNG 2: CÁC LÝ DO KHÁC (Không phải tốt nghiệp)
    // =========================================================================
    if (isRoot) {
      if (
        !window.confirm(
          `Tài khoản Chính CLB xác nhận xóa vĩnh viễn "${deleteTargetUser.name}" (${deleteTargetUser.studentId}) với lý do: "${fullReason}"?`
        )
      ) {
        return;
      }
      setLocallyRemovedUserIds((prev) => [...prev, deleteTargetUser.id]);
      if (onDeleteUser) onDeleteUser(deleteTargetUser.id);
      setDeptActionBanner(`Tài khoản Chính CLB đã xóa vĩnh viễn "${deleteTargetUser.name}".`);
      setDeleteTargetUser(null);
      setTimeout(() => setDeptActionBanner(null), 5000);
      return;
    }

    const pendingInfo = {
      status: 'pending_root_approval',
      reasonCategory: deleteCategory,
      reasonDetail: fullReason,
      requestedById: currentUser.id,
      requestedByName: `${currentUser.name} (${currentUser.position || 'BCN'})`,
      requestedAt: nowStr
    };

    setUserOverrides((prev) => ({
      ...prev,
      [deleteTargetUser.id]: { pendingDeletion: pendingInfo }
    }));

    const updatedUsers = effectiveUserList.map((u) =>
      u.id === deleteTargetUser.id ? { ...u, pendingDeletion: pendingInfo } : u
    );
    await syncUsersToServer(updatedUsers);

    setDeptActionBanner(
      `Đã gửi đề nghị xóa "${deleteTargetUser.name}" (Lý do: ${fullReason}) lên Tài khoản Chính CLB phê duyệt!`
    );
    setDeleteTargetUser(null);
    setTimeout(() => setDeptActionBanner(null), 6000);
  };

  const handleRootApproveDeletion = async (member: any) => {
    if (
      !window.confirm(
        `Tài khoản Chính CLB xác nhận phê duyệt xóa vĩnh viễn "${member.name}" (${member.studentId})?`
      )
    ) {
      return;
    }
    setLocallyRemovedUserIds((prev) => [...prev, member.id]);
    if (onDeleteUser) onDeleteUser(member.id);
    setDeptActionBanner(`Tài khoản Chính CLB đã duyệt xóa vĩnh viễn "${member.name}".`);
    setTimeout(() => setDeptActionBanner(null), 5000);
  };

  const handleRootRejectDeletion = async (member: any) => {
    setUserOverrides((prev) => ({
      ...prev,
      [member.id]: { pendingDeletion: null }
    }));
    const updatedUsers = effectiveUserList.map((u) =>
      u.id === member.id ? { ...u, pendingDeletion: null } : u
    );
    await syncUsersToServer(updatedUsers);
    setDeptActionBanner(`Đã từ chối yêu cầu xóa và giữ lại thành viên "${member.name}".`);
    setTimeout(() => setDeptActionBanner(null), 5000);
  };

  // Ban Chủ Nhiệm đương nhiệm (loại trừ cựu thành viên đã tốt nghiệp)
  const electedBcnLeaders = effectiveUserList.filter(
    (u) =>
      u.id !== 'bcn-root' &&
      u.adminType !== 'master_root' &&
      !u.isGraduated &&
      u.clubRole !== 'former_bcn' &&
      u.clubRole !== 'alumni_viewer' &&
      (u.adminType === 'bcn_elected' ||
        u.clubRole === 'president' ||
        u.clubRole === 'vice_president' ||
        u.role === 'bcn_admin')
  );

  const pendingDeptMembers = effectiveUserList.filter((u) => u.departmentStatus === 'pending_approval');
  const pendingTransferMembers = effectiveUserList.filter((u) => u.departmentStatus === 'pending_transfer');

  const handleSaveSubDeptLeaders = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept || !onAppointSubDeptLeaders) return;
    setDeptModalError(null);

    const viceIds = [chosenVice1Id, chosenVice2Id].filter(Boolean);
    const uniqueVices = Array.from(new Set(viceIds));
    if (chosenLeaderId && uniqueVices.includes(chosenLeaderId)) {
      setDeptModalError('Trong cùng 1 ban, Trưởng nhóm và Phó nhóm phải là hai người khác nhau!');
      return;
    }

    const res = await onAppointSubDeptLeaders({
      department: editingDept,
      leaderId: chosenLeaderId,
      viceLeaderIds: uniqueVices
    });

    if (res && res.error) {
      setDeptModalError(res.error);
      return;
    }

    setEditingDept(null);
  };

  const handleApproveMemberClick = (member: UserProfile) => {
    if (!onApproveDepartment) return;
    const targetDept =
      approvalDeptMap[member.id] ||
      member.requestedDepartment ||
      (member.department !== 'BQT' ? member.department : 'Nội dung');

    onApproveDepartment(member.id, targetDept, `Đã được duyệt vào Ban ${targetDept}`);
    setDeptActionBanner(`Đã duyệt "${member.name}" vào Ban ${targetDept}.`);
    setTimeout(() => setDeptActionBanner(null), 4000);
  };

  const handleRejectMemberClick = (member: UserProfile) => {
    if (!onRejectDepartment) return;
    onRejectDepartment(member.id, 'Chưa phù hợp phân ban đợt này');
    setDeptActionBanner(`Đã từ chối hồ sơ phân ban của "${member.name}".`);
    setTimeout(() => setDeptActionBanner(null), 4000);
  };

  const handleOpenTransferModal = (member: UserProfile) => {
    setTransferringMember(member);
    const otherDepts: DepartmentType[] = (['Truyền thông', 'Nội dung', 'Nhân sự & Kế hoạch', 'Hậu cần'] as DepartmentType[]).filter(
      (d) => d !== member.department
    );
    setTargetTransferDept(otherDepts[0] || 'Truyền thông');
    setTransferReason('Kiêm nhiệm thêm ban chuyên môn / Điều chỉnh phân ban');
    setDirectTransferToggle(true);
    setIsConcurrentMode(true);
  };

  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringMember) return;

    const finalReason = isConcurrentMode ? `[KIEM_NHIEM] ${transferReason.trim()}` : transferReason.trim();

    if ((isPresident || isVicePresident || isRoot || directTransferToggle) && onDirectGroupTransfer) {
      onDirectGroupTransfer(transferringMember.id, targetTransferDept, finalReason);
    } else if (onRequestGroupTransfer) {
      onRequestGroupTransfer(transferringMember.id, targetTransferDept, transferReason.trim());
    }
    setTransferringMember(null);
  };

  // Danh sách thành viên đương nhiệm (loại bỏ Cựu BCN và Cựu Thành Viên Viewer khỏi đội hình 4 ban hiện tại)
  const filteredMembers = effectiveUserList.filter((user) => {
    if (user.id === 'bcn-root') return false;
    if (user.isGraduated || user.clubRole === 'former_bcn' || user.clubRole === 'alumni_viewer') return false;
    if (user.departmentStatus === 'pending_approval' || user.departmentStatus === 'rejected') return false;
    const matchesDept = selectedDeptId === 'all' || isUserInDepartment(user, selectedDeptId);
    const q = searchMember.toLowerCase().trim();
    const matchesSearch =
      !q ||
      user.name.toLowerCase().includes(q) ||
      (user.nickname && user.nickname.toLowerCase().includes(q)) ||
      user.studentId.toLowerCase().includes(q) ||
      user.faculty.toLowerCase().includes(q) ||
      (user.position && user.position.toLowerCase().includes(q));
    return matchesDept && matchesSearch;
  });

  const eligibleSubDeptPool = effectiveUserList.filter(
    (u) => !isMasterRootUser(u) && !u.isGraduated && u.departmentStatus === 'approved'
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="text-xs font-black uppercase tracking-widest text-[#8C3B1E]">
            Hội Sinh Viên Trường Đại Học An Giang
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#382215] font-serif-vintage tracking-tight">
            Nhân Sự Câu Lạc Bộ
          </h2>
          <p className="text-xs sm:text-sm text-[#4A3525] leading-relaxed">
            Cơ cấu gồm <strong>Ban Chủ Nhiệm Đương Nhiệm</strong>, đội ngũ thành viên 4 ban và khu vực lưu giữ <strong>Tài khoản Cựu Ban Chủ Nhiệm & Cựu Thành Viên</strong> đã tốt nghiệp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* CHỈ TÀI KHOẢN CHÍNH CLB (bcn-root) MỚI ĐƯỢC TẠO TÀI KHOẢN CỰU CHỦ NHIỆM DANH DỰ */}
          {isRoot && (
            <button
              type="button"
              onClick={() => setIsCreateFormerBcnOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#245351] hover:bg-[#193B39] text-[#FFE29A] font-black text-xs flex items-center gap-2 shadow-[3px_3px_0px_#382215] cursor-pointer border-2 border-[#382215]"
            >
              <UserPlus className="w-4 h-4 text-[#FFE29A]" />
              <span>Tạo Tài Khoản Cựu Chủ Nhiệm Danh Dự</span>
            </button>
          )}

          {canModifyOrgChart && onOpenSuccessionModal && (
            <button
              type="button"
              onClick={onOpenSuccessionModal}
              className="px-4 py-2.5 rounded-xl bg-[#C8532B] hover:bg-[#A63E1B] text-white font-bold text-xs flex items-center gap-2 shadow-[3px_3px_0px_#382215] cursor-pointer border-2 border-[#382215]"
            >
              <Crown className="w-4 h-4 text-[#FFE29A]" />
              <span>Phân Quyền Chủ Nhiệm & Phó Chủ Nhiệm</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {deptActionBanner && (
        <div className="p-4 rounded-xl bg-[#FAF3E3] border-2 border-[#486A39] text-[#2B1D14] text-xs sm:text-sm flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#486A39] shrink-0" />
            <span className="font-bold">{deptActionBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeptActionBanner(null)}
            className="text-[#6E472B] hover:text-[#382215] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KHU VỰC CHỜ TÀI KHOẢN CHÍNH DUYỆT XÓA (CÁC LÝ DO KHÁC TỐT NGHIỆP) */}
      {canModifyOrgChart && pendingDeletionUsers.length > 0 && (
        <div className="rounded-3xl p-5 sm:p-6 border-3 border-rose-800 bg-rose-50/90 shadow-[6px_6px_0px_#881337] space-y-4">
          <div className="flex items-center gap-2.5 pb-2.5 border-b-2 border-rose-800/20">
            <ShieldAlert className="w-5 h-5 text-rose-800 shrink-0" />
            <div>
              <h3 className="font-black text-base text-rose-950 font-serif-vintage">
                Hồ Sơ Đề Nghị Xóa Nhân Sự Chờ Tài Khoản Chính Phê Duyệt ({pendingDeletionUsers.length})
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pendingDeletionUsers.map((member) => (
              <div key={member.id} className="p-4 rounded-2xl bg-white border-2 border-rose-800/40 flex flex-col justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-black text-sm text-[#382215]">{member.name} ({member.studentId})</div>
                  <div className="text-xs font-bold text-rose-700">Lý do: {member.pendingDeletion?.reasonDetail}</div>
                  <div className="text-[11px] text-stone-500">Đề nghị bởi: {member.pendingDeletion?.requestedByName}</div>
                </div>

                <div className="pt-2 border-t border-rose-100 flex items-center justify-end gap-2">
                  {isRoot ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRootRejectDeletion(member)}
                        className="px-3 py-1.5 rounded-xl bg-stone-100 text-[#382215] border border-[#382215] font-bold text-xs cursor-pointer"
                      >
                        Giữ lại
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRootApproveDeletion(member)}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-700 text-white font-black text-xs cursor-pointer"
                      >
                        Account Chính Duyệt Xóa
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] font-black text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg">
                      Chờ Tài khoản Chính duyệt
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HÒM THƯ DUYỆT VÀO NHÓM */}
      {canModifyOrgChart && pendingDeptMembers.length > 0 && (
        <div className="glass-vintage p-5 sm:p-6 border-2 border-[#382215]/25 space-y-3">
          <h3 className="font-black text-base text-[#382215] font-serif-vintage flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#C8532B]" />
            <span>Hòm Thư Duyệt Thành Viên Vào 4 Nhóm ({pendingDeptMembers.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pendingDeptMembers.map((member) => {
              const desiredDept =
                approvalDeptMap[member.id] ||
                member.requestedDepartment ||
                (member.department !== 'BQT' ? member.department : 'Nội dung');
              const canCurrentApproveThis = canApproveDepartmentEntry(currentUser, desiredDept);

              return (
                <div key={member.id} className="bg-[#FFFDF7] p-4 rounded-xl border-2 border-[#382215]/20 flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-[#382215]">{member.name}</h4>
                      <div className="text-xs text-[#6E472B]">MSSV: {member.studentId} · {member.faculty}</div>
                    </div>
                    {canDeleteMembers && (
                      <button
                        type="button"
                        onClick={() => handleInitiateDeleteMember(member)}
                        className="p-1.5 rounded-lg text-[#8C3B1E] hover:bg-rose-100 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#382215]/10 flex items-center justify-between gap-2">
                    <select
                      value={desiredDept}
                      onChange={(e) =>
                        setApprovalDeptMap((prev) => ({
                          ...prev,
                          [member.id]: e.target.value as DepartmentType
                        }))
                      }
                      className="px-2.5 py-1 rounded-lg border border-[#382215]/30 bg-[#FAF3E3] font-bold text-xs"
                    >
                      <option value="Truyền thông">Ban Truyền thông</option>
                      <option value="Nội dung">Ban Nội dung</option>
                      <option value="Nhân sự & Kế hoạch">Ban Nhân sự & Kế hoạch</option>
                      <option value="Hậu cần">Ban Hậu cần</option>
                    </select>

                    {canCurrentApproveThis && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRejectMemberClick(member)}
                          className="px-3 py-1.5 rounded-lg bg-stone-200 text-[#382215] font-bold text-xs cursor-pointer"
                        >
                          Từ chối
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveMemberClick(member)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#486A39] text-white font-bold text-xs cursor-pointer"
                        >
                          Duyệt Vào Nhóm
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BAN CHỦ NHIỆM ĐƯƠNG NHIỆM */}
      <div className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#382215]/15">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#8C3B1E]">
              Ban Điều Hành Quản Lý Toàn Thể Câu Lạc Bộ
            </div>
            <h3 className="text-lg sm:text-xl font-black text-[#382215] font-serif-vintage">
              Chủ Nhiệm Câu Lạc Bộ & Phó Chủ Nhiệm Câu Lạc Bộ Đương Nhiệm
            </h3>
          </div>
        </div>

        {electedBcnLeaders.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-[#F2E5C9]/60 border border-dashed border-[#382215]/25 text-xs font-bold text-[#382215]">
            Hiện chưa bổ nhiệm Chủ nhiệm / Phó Chủ nhiệm cho nhiệm kỳ này.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {electedBcnLeaders.map((leader) => {
              const isPres =
                leader.clubRole === 'president' ||
                leader.departmentRole === 'leader' ||
                (leader.position?.toLowerCase().includes('chủ nhiệm') &&
                  !leader.position?.toLowerCase().includes('phó'));

              return (
                <div
                  key={leader.id}
                  className={`p-4 rounded-xl border-2 flex flex-col justify-between gap-3 ${
                    isPres
                      ? 'bg-[#F2E5C9] border-[#C8532B] shadow-[3px_3px_0px_#382215]'
                      : 'bg-[#FFFDF7] border-[#382215]/20 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={leader.avatar}
                        alt={leader.name}
                        className="w-12 h-12 rounded-xl object-cover border-2 border-[#382215]/30 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#C8532B]">
                          {isPres ? 'Chủ Nhiệm CLB' : 'Phó Chủ Nhiệm CLB'}
                        </div>
                        <div className="text-sm font-black text-[#382215] font-serif-vintage truncate">
                          {leader.name}
                        </div>
                        <div className="text-xs text-[#6E472B] truncate">
                          {leader.studentId} · {leader.term || 'Đương nhiệm'}
                        </div>
                      </div>
                    </div>

                    {canDeleteMembers && (
                      <button
                        type="button"
                        onClick={() => handleInitiateDeleteMember(leader)}
                        className="p-1.5 rounded-lg text-[#8C3B1E] hover:bg-rose-100 hover:text-rose-700 transition cursor-pointer shrink-0"
                        title="Xóa / Chuyển sang Cựu Ban Chủ Nhiệm khi tốt nghiệp"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DANH BẠ THÀNH VIÊN 4 BAN ĐƯƠNG NHIỆM */}
      <div className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#382215]/15">
          <div>
            <h3 className="font-black text-base sm:text-lg text-[#382215] font-serif-vintage">
              Danh Sách Nhân Sự Đương Nhiệm 4 Ban ({filteredMembers.length} thành viên)
            </h3>
            <p className="text-xs text-[#6E472B] font-medium">
              Khi thành viên tốt nghiệp, bấm <strong>Xóa ➔ Đã tốt nghiệp</strong> để tự động chuyển sang hồ sơ Cựu Thành Viên.
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E472B]" />
            <input 
              type="text"
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              placeholder="Tìm tên, MSSV, khoa..."
              className="pl-9 pr-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215] text-xs font-bold text-[#382215]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => {
            const memberConcurrent = getUserConcurrentRoles(member);
            const isLeader = member.departmentRole === 'leader' || memberConcurrent.some(r => r.departmentRole === 'leader');
            const isVice = member.departmentRole === 'vice_leader' || memberConcurrent.some(r => r.departmentRole === 'vice_leader');
            const isPendingDeletion = Boolean(member.pendingDeletion);

            return (
              <div
                key={member.id}
                className={`p-4.5 rounded-2xl border-2 flex flex-col justify-between gap-3 ${
                  isPendingDeletion ? 'bg-rose-50/70 border-rose-600' : 'bg-[#FFFDF8] border-[#382215] shadow-[3px_3px_0px_#382215]'
                }`}
              >
                {isPendingDeletion && (
                  <div className="px-2.5 py-1.5 rounded-xl bg-rose-100 border border-rose-400 text-[11px] font-black text-rose-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                    <span>Chờ Account Chính duyệt xóa ({member.pendingDeletion?.reasonCategory})</span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <img 
                      src={member.avatar} 
                      alt={member.name} 
                      className="w-12 h-12 rounded-xl object-cover border-2 border-[#382215] shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <h4 className="font-black text-sm text-[#382215] truncate">{member.name}</h4>
                      <div className="text-xs font-black text-[#C8532B] truncate">
                        {member.position || `${isLeader ? 'Trưởng nhóm' : isVice ? 'Phó nhóm' : 'Thành viên CLB'}`}
                      </div>
                      <div className="text-[11px] text-[#6E472B] truncate font-semibold">
                        {member.studentId} · {member.faculty}
                      </div>
                    </div>
                  </div>

                  {canDeleteMembers && !isPendingDeletion && (
                    <button
                      type="button"
                      onClick={() => handleInitiateDeleteMember(member)}
                      className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-600 text-rose-800 hover:text-white border border-rose-300 text-xs font-black flex items-center gap-1 transition cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa</span>
                    </button>
                  )}
                </div>

                <div className="pt-2.5 border-t border-[#382215]/10 flex items-center justify-between text-xs">
                  <span className="text-[#6E472B] text-[11px] font-semibold truncate">
                    Nhóm: {member.department}
                  </span>
                  {canModifyOrgChart && !isPendingDeletion && (
                    <button
                      type="button"
                      onClick={() => handleOpenTransferModal(member)}
                      className="px-3 py-1 rounded-xl bg-[#FAF3E3] text-[#245351] border-2 border-[#382215] font-black text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Kiêm Nhiệm / Chuyển Nhóm</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          KHU VỰC LƯU GIỮ TÀI KHOẢN CỰU CHỦ NHIỆM & CỰU THÀNH VIÊN ĐÃ TỐT NGHIỆP
         ========================================================================= */}
      {(formerBcnAccounts.length > 0 || alumniViewerAccounts.length > 0) && (
        <div className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#F2E5C9] shadow-[6px_6px_0px_#382215] space-y-5">
          <div className="border-b-2 border-[#382215]/15 pb-3">
            <div className="text-[11px] font-black uppercase tracking-widest text-[#245351]">
              Lưu Trữ Di Sản & Phân Quyền Sau Tốt Nghiệp
            </div>
            <h3 className="text-lg sm:text-xl font-black text-[#382215] font-serif-vintage">
              Cựu Ban Chủ Nhiệm & Cựu Thành Viên Đã Tốt Nghiệp
            </h3>
          </div>

          {/* 1. Tài khoản Cựu Ban Chủ Nhiệm (Không ảnh cá nhân, được xem & bình luận góp ý) */}
          {formerBcnAccounts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-[#8C3B1E] uppercase">
                <Award className="w-4 h-4 text-[#C8532B]" />
                <span>Tài Khoản Danh Dự Cựu Ban Chủ Nhiệm ({formerBcnAccounts.length}) — Quyền: Xem & Bình luận góp ý</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {formerBcnAccounts.map((former) => (
                  <div
                    key={former.id}
                    className="p-4 rounded-2xl bg-[#FFFDF8] border-2 border-[#C8532B] shadow-[3px_3px_0px_#382215] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#E5A140] text-[#382215] border border-[#382215] text-[10px] font-black">
                        Cựu Ban Chủ Nhiệm · Được góp ý
                      </span>
                      {isRoot && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Xóa hẳn tài khoản danh dự "${former.name}"?`)) {
                              setLocallyRemovedUserIds((prev) => [...prev, former.id]);
                              if (onDeleteUser) onDeleteUser(former.id);
                            }
                          }}
                          className="text-stone-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div>
                      <h4 className="font-black text-base text-[#382215] font-serif-vintage">{former.name}</h4>
                      <p className="text-xs font-bold text-[#C8532B]">{former.position}</p>
                      <p className="text-[11px] text-[#6E472B] mt-0.5">
                        MSSV: <strong>{former.studentId}</strong> · {former.faculty}
                      </p>
                      {former.term && (
                        <p className="text-[11px] text-[#245351] font-semibold">Nhiệm kỳ: {former.term}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Tài khoản Cựu Thành Viên Sinh Viên Thường (Chỉ xem - Viewer, khóa bình luận góp ý) */}
          {alumniViewerAccounts.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-black text-[#245351] uppercase">
                <Eye className="w-4 h-4 text-[#245351]" />
                <span>Cựu Thành Viên Sinh Viên Đã Tốt Nghiệp ({alumniViewerAccounts.length}) — Chế độ Viewer (Chỉ xem, không góp ý)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {alumniViewerAccounts.map((alum) => (
                  <div
                    key={alum.id}
                    className="p-3.5 rounded-2xl bg-[#FFFDF8]/90 border border-[#382215]/30 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-black text-[#382215] truncate">{alum.name}</div>
                      <div className="text-[11px] text-[#6E472B] truncate">
                        MSSV: {alum.studentId} · {alum.faculty}
                      </div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-stone-200 text-stone-700 text-[10px] font-bold">
                        Viewer · Chỉ xem hoạt động CLB
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: TẠO TÀI KHOẢN DANH DỰ CỰU CHỦ NHIỆM (CHỈ TÀI KHOẢN CHÍNH CLB bcn-root) */}
      {isCreateFormerBcnOpen && isRoot && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#FAF3E3] rounded-2xl border-3 border-[#382215] shadow-[6px_6px_0px_#382215] max-w-md w-full overflow-hidden">
            <div className="bg-[#245351] text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-[#382215]">
              <div className="flex items-center gap-2.5">
                <Crown className="w-5 h-5 text-[#FFE29A]" />
                <div>
                  <h4 className="font-black text-base font-serif-vintage">
                    Tạo Tài Khoản Cựu Chủ Nhiệm Danh Dự
                  </h4>
                  <p className="text-[11px] text-emerald-100">
                    Đặc quyền khởi tạo bởi Tài khoản Chính CLB (bcn-root)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateFormerBcnOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFormerBcnAccount} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-[#F2E5C9] border border-[#382215]/30 text-[#382215] leading-relaxed">
                Tài khoản Cựu Chủ nhiệm chỉ hiển thị thông tin cá nhân & nhiệm kỳ (<strong>không có ảnh đại diện cá nhân</strong>) và được cấp quyền <strong>xem + bình luận góp ý</strong> cho thế hệ sau.
              </div>

              <div>
                <label className="block font-bold text-[#382215] mb-1">Họ và Tên Cựu Chủ Nhiệm *</label>
                <input
                  type="text"
                  required
                  value={formerName}
                  onChange={(e) => setFormerName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A..."
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#382215]/30 bg-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#382215] mb-1">MSSV / Mã Định Danh *</label>
                  <input
                    type="text"
                    required
                    value={formerStudentId}
                    onChange={(e) => setFormerStudentId(e.target.value)}
                    placeholder="VD: DTH20..."
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#382215]/30 bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#382215] mb-1">Nhiệm Kỳ *</label>
                  <input
                    type="text"
                    required
                    value={formerTermInput}
                    onChange={(e) => setFormerTermInput(e.target.value)}
                    placeholder="VD: Nhiệm kỳ IV (2024-2025)"
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#382215]/30 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#382215] mb-1">Chức Vụ Cũ *</label>
                  <select
                    value={formerTitleInput}
                    onChange={(e) => setFormerTitleInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#382215]/30 bg-white font-bold"
                  >
                    <option value="Cựu Chủ nhiệm CLB">Cựu Chủ nhiệm CLB</option>
                    <option value="Cựu Phó Chủ nhiệm CLB">Cựu Phó Chủ nhiệm CLB</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#382215] mb-1">Khoa / Đơn Vị</label>
                  <input
                    type="text"
                    value={formerFaculty}
                    onChange={(e) => setFormerFaculty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#382215]/30 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#382215] mb-1">Email đăng nhập</label>
                  <input
                    type="text"
                    value={formerEmail}
                    onChange={(e) => setFormerEmail(e.target.value)}
                    placeholder="Tự động theo MSSV nếu trống"
                    className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#382215] mb-1">Mật khẩu cấp *</label>
                  <input
                    type="text"
                    required
                    value={formerPassword}
                    onChange={(e) => setFormerPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#382215]/15">
                <button
                  type="button"
                  onClick={() => setIsCreateFormerBcnOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white border-2 border-[#382215] font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#245351] text-[#FFE29A] font-black border-2 border-[#382215] shadow-[2px_2px_0px_#382215] cursor-pointer"
                >
                  Khởi Tạo Tài Khoản Danh Dự
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HỎI LÝ DO XÓA / CHUYỂN ĐỔI TỐT NGHIỆP */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#FAF3E3] rounded-2xl border-3 border-[#382215] shadow-[6px_6px_0px_#382215] max-w-md w-full overflow-hidden">
            <div className="bg-rose-800 text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-[#382215]">
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-5 h-5 text-amber-200" />
                <div>
                  <h4 className="font-black text-base font-serif-vintage">Xác Nhận Lý Do Xóa / Chuyển Đổi</h4>
                  <p className="text-xs text-rose-100">
                    Thành viên: <strong>{deleteTargetUser.name}</strong> ({deleteTargetUser.studentId})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDeleteFlow} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-black text-[#382215] mb-1.5">1. Chọn lý do *</label>
                <select
                  value={deleteCategory}
                  onChange={(e) => setDeleteCategory(e.target.value as DeleteReasonCategory)}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-[#382215] bg-white font-bold text-[#382215] text-xs"
                >
                  <option value="Đã tốt nghiệp">🎓 Đã tốt nghiệp (Chuyển thành tài khoản Cựu Thành Viên / Cựu BCN)</option>
                  <option value="Xin nghỉ sinh hoạt / Chuyển công tác">📝 Xin nghỉ sinh hoạt / Chuyển công tác</option>
                  <option value="Vi phạm nội quy / Không tham gia hoạt động">⚠️ Vi phạm nội quy / Không tham gia hoạt động</option>
                  <option value="Tài khoản ảo / Nhập trùng hồ sơ">🔄 Tài khoản ảo / Nhập trùng hồ sơ</option>
                  <option value="Lý do khác">✍️ Lý do khác...</option>
                </select>
              </div>

              {deleteCategory === 'Đã tốt nghiệp' ? (
                <div className="p-3 rounded-xl bg-emerald-50 border-2 border-emerald-700/40 text-emerald-950 flex items-start gap-2">
                  <GraduationCap className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-[11px]">
                    <p className="font-black">Cơ chế bảo tồn sau tốt nghiệp:</p>
                    <p>
                      • Nếu là <strong>Chủ nhiệm / Phó Chủ nhiệm</strong>: chuyển thành Tài khoản Cựu BCN (không ảnh cá nhân, được xem & bình luận góp ý).
                    </p>
                    <p>
                      • Nếu là <strong>Sinh viên thường</strong>: chuyển thành Tài khoản Viewer (chỉ xem hoạt động CLB, khóa quyền bình luận góp ý).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-100 border-2 border-amber-700/50 text-amber-950 flex items-start gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
                  <p className="text-[11px]">
                    {isRoot
                      ? 'Tài khoản Chính CLB có thể duyệt xóa vĩnh viễn trực tiếp.'
                      : 'Với lý do này, hồ sơ sẽ trình lên Tài khoản Chính CLB (bcn-root) xem xét phê duyệt.'}
                  </p>
                </div>
              )}

              <div>
                <label className="block font-bold text-[#382215] mb-1">2. Ghi chú chi tiết (Tùy chọn)</label>
                <textarea
                  rows={2}
                  value={deleteCustomDetail}
                  onChange={(e) => setDeleteCustomDetail(e.target.value)}
                  placeholder="Nhập khóa tốt nghiệp hoặc chi tiết..."
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#382215]/40 bg-white text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#382215]/15">
                <button
                  type="button"
                  onClick={() => setDeleteTargetUser(null)}
                  className="px-4 py-2 rounded-xl bg-white border-2 border-[#382215] font-bold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#245351] text-white font-black border-2 border-[#382215] shadow-[2px_2px_0px_#382215] cursor-pointer"
                >
                  {deleteCategory === 'Đã tốt nghiệp'
                    ? 'Xác Nhận Chuyển Sang Cựu Thành Viên'
                    : isRoot
                    ? 'Xóa Vĩnh Viễn Ngay'
                    : 'Trình Account Chính Duyệt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHUYỂN NHÓM */}
      {transferringMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#FAF3E3] rounded-2xl border-3 border-[#382215] w-full max-w-lg overflow-hidden">
            <div className="bg-[#382215] text-[#FAF3E3] p-4 flex items-center justify-between">
              <h4 className="font-bold text-base font-serif-vintage">Điều Chuyển / Kiêm Nhiệm Ban</h4>
              <button type="button" onClick={() => setTransferringMember(null)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmTransfer} className="p-5 space-y-4 text-xs">
              <select
                value={targetTransferDept}
                onChange={(e) => setTargetTransferDept(e.target.value as DepartmentType)}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-[#382215]/30 bg-white font-bold"
              >
                {(['Truyền thông', 'Nội dung', 'Nhân sự & Kế hoạch', 'Hậu cần'] as DepartmentType[])
                  .filter((d) => d !== transferringMember.department)
                  .map((d) => (
                    <option key={d} value={d}>
                      Ban {d}
                    </option>
                  ))}
              </select>
              <input
                type="text"
                required
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border bg-white"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setTransferringMember(null)} className="px-4 py-2 rounded-xl bg-stone-200 font-bold">
                  Hủy
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#245351] text-white font-bold">
                  Xác Nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHỌN TRƯỞNG/PHÓ BAN */}
      {editingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#FAF3E3] rounded-2xl border-2 border-[#382215] w-full max-w-xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-base">Chọn Trưởng & Phó Ban {editingDept}</h4>
              <button type="button" onClick={() => setEditingDept(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSubDeptLeaders} className="space-y-3">
              {deptModalError && <div className="text-rose-700 font-bold">{deptModalError}</div>}
              <select
                value={chosenLeaderId}
                onChange={(e) => setChosenLeaderId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-white font-bold"
              >
                <option value="">-- Chọn Trưởng Ban --</option>
                {eligibleSubDeptPool.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.studentId})
                  </option>
                ))}
              </select>
              <select
                value={chosenVice1Id}
                onChange={(e) => setChosenVice1Id(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-white"
              >
                <option value="">-- Chọn Phó Ban 1 --</option>
                {eligibleSubDeptPool
                  .filter((u) => u.id !== chosenLeaderId)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.studentId})
                    </option>
                  ))}
              </select>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingDept(null)} className="px-4 py-2 rounded-xl bg-stone-200">
                  Hủy
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#C8532B] text-white font-bold">
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

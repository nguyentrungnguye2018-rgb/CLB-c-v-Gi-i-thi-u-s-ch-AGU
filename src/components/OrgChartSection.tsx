import React, { useState } from 'react';
import { 
  Users2, 
  Crown, 
  Search, 
  ShieldCheck, 
  ChevronRight,
  Flame,
  Star,
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
  Bell,
  Send,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, DepartmentType, ClubTermRecord } from '../types';
import { DEPARTMENTS_DATA } from '../data/mockData';
import {
  isMasterRootUser,
  isClubPresidentUser,
  isClubVicePresidentUser,
  canApproveDepartmentEntry,
  canInitiateGroupTransfer,
  canApproveGroupTransfer,
  canSelectSubDeptLeaders,
  isUserInDepartment,
  getUserRoleInDepartment,
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

  // Sub-department leader appointment modal
  const [editingDept, setEditingDept] = useState<DepartmentType | null>(null);
  const [chosenLeaderId, setChosenLeaderId] = useState<string>('');
  const [chosenVice1Id, setChosenVice1Id] = useState<string>('');
  const [chosenVice2Id, setChosenVice2Id] = useState<string>('');
  const [deptModalError, setDeptModalError] = useState<string | null>(null);
  const [deptActionBanner, setDeptActionBanner] = useState<string | null>(null);

  // Group transfer / concurrent assignment modal state
  const [transferringMember, setTransferringMember] = useState<UserProfile | null>(null);
  const [targetTransferDept, setTargetTransferDept] = useState<DepartmentType>('Truyền thông');
  const [transferReason, setTransferReason] = useState<string>('Phân công kiêm nhiệm / Điều chuyển nhóm');
  const [directTransferToggle, setDirectTransferToggle] = useState<boolean>(true);
  const [isConcurrentMode, setIsConcurrentMode] = useState<boolean>(true);

  // Department choice map when approving a pending member
  const [approvalDeptMap, setApprovalDeptMap] = useState<Record<string, DepartmentType>>({});

  const departments = DEPARTMENTS_DATA;
  const isRoot = isMasterRootUser(currentUser);
  const isPresident = isClubPresidentUser(currentUser);
  const isVicePresident = isClubVicePresidentUser(currentUser);
  // Chỉ có Chủ nhiệm, Phó Chủ nhiệm và Account chính được quyền sửa đổi thông tin trong sơ đồ 4 ban
  const canModifyOrgChart = isRoot || isPresident || isVicePresident || isBcnMode;
  const canSelectDeptLeaders = canModifyOrgChart;
  const canDeleteMembers = canModifyOrgChart;

  // Dynamic BCN Leaders strictly from current userList
  const electedBcnLeaders = userList.filter(
    u =>
      u.id !== 'bcn-root' &&
      u.adminType !== 'master_root' &&
      (u.adminType === 'bcn_elected' ||
        u.clubRole === 'president' ||
        u.clubRole === 'vice_president' ||
        u.role === 'bcn_admin')
  );

  // 1. Pending department entry members
  const pendingDeptMembers = userList.filter(u => u.departmentStatus === 'pending_approval');

  // 2. Pending department transfer members (sửa duyệt lộn / chuyển nhóm)
  const pendingTransferMembers = userList.filter(u => u.departmentStatus === 'pending_transfer');

  // Open Sub-Department Leader Selection Modal
  const handleOpenDeptLeaderModal = (e: React.MouseEvent, deptId: DepartmentType) => {
    e.stopPropagation();
    setDeptModalError(null);
    setEditingDept(deptId);

    const deptMembers = userList.filter(u => !isMasterRootUser(u) && isUserInDepartment(u, deptId));
    const currentLeader = deptMembers.find(u => getUserRoleInDepartment(u, deptId) === 'leader');
    const currentVices = deptMembers.filter(
      u => u.id !== currentLeader?.id && getUserRoleInDepartment(u, deptId) === 'vice_leader'
    );

    setChosenLeaderId(currentLeader?.id || '');
    setChosenVice1Id(currentVices[0]?.id || '');
    setChosenVice2Id(currentVices[1]?.id || '');
  };

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

    const leaderObj = userList.find(u => u.id === chosenLeaderId);
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 }
    });
    setDeptActionBanner(
      `Đã cập nhật Ban điều hành ${editingDept}${leaderObj ? `: Trưởng ban ${leaderObj.name}` : ''} (Hỗ trợ kiêm nhiệm nhiều ban)!`
    );
    setEditingDept(null);
    setTimeout(() => setDeptActionBanner(null), 5000);
  };

  // Approve member entry into group
  const handleApproveMemberClick = (member: UserProfile) => {
    if (!onApproveDepartment) return;
    const targetDept =
      approvalDeptMap[member.id] ||
      member.requestedDepartment ||
      (member.department !== 'BQT' ? member.department : 'Nội dung');

    onApproveDepartment(
      member.id,
      targetDept,
      `Đã được duyệt vào Ban ${targetDept}`
    );
    setDeptActionBanner(
      `Đã duyệt "${member.name}" vào Ban ${targetDept}. Hồ sơ đã dọn sạch khỏi hòm thư!`
    );
    setTimeout(() => setDeptActionBanner(null), 4000);
  };

  const handleRejectMemberClick = (member: UserProfile) => {
    if (!onRejectDepartment) return;
    onRejectDepartment(member.id, 'Chưa phù hợp phân ban đợt này');
    setDeptActionBanner(`Đã từ chối hồ sơ phân ban của "${member.name}".`);
    setTimeout(() => setDeptActionBanner(null), 4000);
  };

  // Open group transfer / kiêm nhiệm modal for a member
  const handleOpenTransferModal = (member: UserProfile) => {
    setTransferringMember(member);
    const otherDepts: DepartmentType[] = (['Truyền thông', 'Nội dung', 'Nhân sự & Kế hoạch', 'Hậu cần'] as DepartmentType[])
      .filter(d => d !== member.department);
    setTargetTransferDept(otherDepts[0] || 'Truyền thông');
    setTransferReason('Kiêm nhiệm thêm ban chuyên môn / Điều chỉnh phân ban');
    setDirectTransferToggle(true);
    setIsConcurrentMode(true);
  };

  // Submit transfer or concurrent assignment action
  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringMember) return;

    const finalReason = isConcurrentMode
      ? `[KIEM_NHIEM] ${transferReason.trim()}`
      : transferReason.trim();

    if ((isPresident || isVicePresident || isRoot || directTransferToggle) && onDirectGroupTransfer) {
      onDirectGroupTransfer(
        transferringMember.id,
        targetTransferDept,
        finalReason
      );
      setDeptActionBanner(
        isConcurrentMode
          ? `Đã phân công bạn "${transferringMember.name}" kiêm nhiệm thêm Ban ${targetTransferDept} (giữ nguyên các chức vụ hiện tại)!`
          : `Đã chuyển thẳng bạn "${transferringMember.name}" sang Ban ${targetTransferDept} thành công!`
      );
    } else if (onRequestGroupTransfer) {
      onRequestGroupTransfer(
        transferringMember.id,
        targetTransferDept,
        transferReason.trim()
      );
      setDeptActionBanner(
        `Đã tạo yêu cầu chuyển bạn "${transferringMember.name}" sang Ban ${targetTransferDept}. Hệ thống đã gửi báo cáo tới Chủ nhiệm & Phó Chủ nhiệm CLB!`
      );
    }
    setTransferringMember(null);
    setTimeout(() => setDeptActionBanner(null), 5000);
  };

  // Filtered official members list (supports filtering by concurrent roles in any of the 4 departments)
  const filteredMembers = userList.filter((user) => {
    if (user.id === 'bcn-root') return false;
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

  // Eligible pool for sub-department leader selection (all approved non-root members)
  const eligibleSubDeptPool = userList.filter(
    u => !isMasterRootUser(u) && u.departmentStatus === 'approved'
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner: Nhân sự */}
      <div className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="text-xs font-black uppercase tracking-widest text-[#8C3B1E]">
            Hội Sinh Viên Trường Đại Học An Giang
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#382215] font-serif-vintage tracking-tight">
            Nhân Sự Câu Lạc Bộ
          </h2>
          <p className="text-xs sm:text-sm text-[#4A3525] leading-relaxed">
            Cơ cấu nhân sự tinh gọn gồm <strong>Ban Lãnh Đạo (Chủ nhiệm & Phó chủ nhiệm CLB)</strong> điều hành toàn thể câu lạc bộ cùng đội ngũ thành viên nòng cốt. Khi thành viên vào lộn ban, Trưởng nhóm bấm <strong>"Chuyển nhóm"</strong>, Trưởng nhóm bên kia chấp thuận tiếp nhận và hệ thống tự động báo cáo lên Chủ nhiệm nắm bắt.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {canModifyOrgChart && onOpenSuccessionModal && (
            <button
              type="button"
              onClick={onOpenSuccessionModal}
              className="px-4 py-2.5 rounded-xl bg-[#C8532B] hover:bg-[#A63E1B] text-white font-bold text-xs flex items-center gap-2 shadow-[3px_3px_0px_#382215] cursor-pointer border-2 border-[#382215]"
            >
              <Crown className="w-4 h-4 text-[#FFE29A]" />
              <span>Phân Quyền Chủ Nhiệm & Phó Chủ Nhiệm Nhiệm Kỳ</span>
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


      {/* =========================================================================
          HÒM THƯ DUYỆT VÀO NHÓM & YÊU CẦU CHUYỂN NHÓM (CHỈ CHỦ NHIỆM & PHÓ CHỦ NHIỆM)
         ========================================================================= */}
      {canModifyOrgChart && (
        <div className="glass-vintage p-5 sm:p-6 border-2 border-[#382215]/25 space-y-5">
          {/* Section A: Đơn đăng ký vào nhóm mới */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#382215]/15">
              <div>
                <h3 className="font-black text-base sm:text-lg text-[#382215] font-serif-vintage flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[#C8532B]" />
                  <span>Hòm Thư Duyệt Thành Viên Vào 4 Nhóm</span>
                </h3>
              <p className="text-xs text-[#6E472B] mt-0.5">
                Chủ nhiệm, Phó chủ nhiệm, Trưởng nhóm và Phó nhóm của nhóm đều có quyền duyệt thành viên vào nhóm mình. Duyệt xong biến mất ngay, giữ hòm thư sạch sẽ.
              </p>
            </div>
            <span className="text-xs font-bold text-[#8C3B1E]">
              {pendingDeptMembers.length} hồ sơ chờ duyệt
            </span>
          </div>

          {pendingDeptMembers.length === 0 ? (
            <div className="py-6 px-4 text-center rounded-xl bg-[#F2E5C9]/60 border border-dashed border-[#382215]/25 space-y-1">
              <Inbox className="w-7 h-7 text-[#6E472B]/60 mx-auto" />
              <div className="font-bold text-xs sm:text-sm text-[#382215]">
                Hòm thư chờ duyệt vào ban hiện đang trống (0)
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {pendingDeptMembers.map((member) => {
                const desiredDept =
                  approvalDeptMap[member.id] ||
                  member.requestedDepartment ||
                  (member.department !== 'BQT' ? member.department : 'Nội dung');
                const canCurrentApproveThis = canApproveDepartmentEntry(currentUser, desiredDept);

                return (
                  <div
                    key={member.id}
                    className="bg-[#FFFDF7] p-4 rounded-xl border-2 border-[#382215]/20 flex flex-col justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-11 h-11 rounded-xl object-cover border border-[#382215]/30 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-[#382215] truncate">{member.name}</h4>
                          <div className="text-xs text-[#6E472B] truncate">
                            MSSV: <span className="font-mono font-bold text-[#382215]">{member.studentId}</span> · {member.faculty}
                          </div>
                          <div className="text-xs font-bold text-[#C8532B] mt-1">
                            Nguyện vọng: Ban {member.requestedDepartment || member.department}
                          </div>
                        </div>
                      </div>

                      {canDeleteMembers && onDeleteUser && (
                        <button
                          type="button"
                          onClick={() => onDeleteUser(member.id)}
                          className="p-1.5 rounded-lg text-[#8C3B1E] hover:bg-rose-100 transition cursor-pointer shrink-0"
                          title="Xóa tài khoản này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-[#382215]/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[#6E472B] font-semibold">Xếp vào:</span>
                        <select
                          value={desiredDept}
                          onChange={(e) =>
                            setApprovalDeptMap(prev => ({
                              ...prev,
                              [member.id]: e.target.value as DepartmentType
                            }))
                          }
                          className="px-2.5 py-1 rounded-lg border border-[#382215]/30 bg-[#FAF3E3] font-bold text-[#382215] text-xs"
                        >
                          <option value="Truyền thông">Ban Truyền thông</option>
                          <option value="Nội dung">Ban Nội dung</option>
                          <option value="Nhân sự & Kế hoạch">Ban Nhân sự & Kế hoạch</option>
                          <option value="Hậu cần">Ban Hậu cần</option>
                        </select>
                      </div>

                      {canCurrentApproveThis ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRejectMemberClick(member)}
                            className="px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-[#382215] font-bold text-xs cursor-pointer transition"
                          >
                            Từ chối
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveMemberClick(member)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#486A39] hover:bg-[#38552B] text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow-2xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Duyệt Vào Nhóm</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-[#8C3B1E]">
                          Chờ Trưởng/Phó Ban {desiredDept} hoặc Chủ nhiệm duyệt
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section B: Yêu Cầu Chuyển Nhóm / Fix Lỗi Duyệt Lộn */}
        {pendingTransferMembers.length > 0 && (
          <div className="space-y-3 pt-4 border-t-2 border-[#382215]/15">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#245351]" />
                <h4 className="font-black text-sm sm:text-base text-[#382215] font-serif-vintage">
                  Yêu Cầu Chuyển Nhóm / Fix Lỗi Duyệt Lộn ({pendingTransferMembers.length} yêu cầu)
                </h4>
              </div>
              <span className="text-[11px] text-[#245351] font-bold">
                Trưởng/Phó nhóm mới duyệt tiếp nhận
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {pendingTransferMembers.map((member) => {
                const targetDept = member.requestedDepartment || 'Nội dung';
                const canApproveThisTransfer = canApproveGroupTransfer(currentUser, targetDept);

                return (
                  <div
                    key={member.id}
                    className="p-4 rounded-xl border-2 border-[#245351]/40 bg-[#FAF3E3] space-y-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-10 h-10 rounded-xl object-cover border border-[#382215]/30 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-sm text-[#382215]">{member.name}</div>
                          <div className="text-xs text-[#6E472B]">MSSV: {member.studentId}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-[#245351] text-white font-bold text-[10px]">
                        Chờ Duyệt Chuyển
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-[#382215]/20 text-xs space-y-1">
                      <div className="flex items-center gap-2 font-bold text-[#382215]">
                        <span className="text-[#8C3B1E]">Từ Ban {member.transferFromDept || member.department}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span className="text-[#245351]">Sang Ban {targetDept}</span>
                      </div>
                      <div className="text-[11px] text-stone-600">
                        Lý do: <em>{member.transferReason || 'Điều chỉnh nhóm phù hợp'}</em>
                      </div>
                      <div className="text-[10px] text-stone-500">
                        Yêu cầu bởi: {member.transferRequestedBy || 'Trưởng nhóm'}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#382215]/10">
                      {canApproveThisTransfer ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRejectMemberClick(member)}
                            className="px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-[#382215] font-bold text-xs cursor-pointer"
                          >
                            Từ Chối Chuyển
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveMemberClick(member)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#245351] hover:bg-[#1A3D3B] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Chấp Nhận Vào Ban {targetDept}</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-[#6E472B] font-semibold">
                          Chờ Trưởng/Phó Ban {targetDept} hoặc Chủ nhiệm duyệt tiếp nhận
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      )}

      {/* =========================================================================
          BAN CHỦ NHIỆM ĐƯƠNG NHIỆM (CHỦ NHIỆM & PHÓ CHỦ NHIỆM CLB)
         ========================================================================= */}
      <div className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#382215]/15">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#8C3B1E]">
              Ban Điều Hành Quản Lý Toàn Thể Câu Lạc Bộ
            </div>
            <h3 className="text-lg sm:text-xl font-black text-[#382215] font-serif-vintage">
              Chủ Nhiệm Câu Lạc Bộ & Phó Chủ Nhiệm Câu Lạc Bộ
            </h3>
          </div>

          {canModifyOrgChart && onOpenSuccessionModal && (
            <button
              type="button"
              onClick={onOpenSuccessionModal}
              className="px-3.5 py-2 rounded-xl bg-[#245351] hover:bg-[#1B403E] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shrink-0 shadow-[2px_2px_0px_#382215] border border-[#382215]"
            >
              <UserCog className="w-4 h-4 text-[#FFE29A]" />
              <span>Phân Quyền Chủ Nhiệm & Phó Chủ Nhiệm Khác Cho Nhiệm Kỳ</span>
            </button>
          )}
        </div>

        {electedBcnLeaders.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-[#F2E5C9]/60 border border-dashed border-[#382215]/25 space-y-2">
            <div className="font-bold text-sm text-[#382215]">
              Hiện chưa chọn Chủ nhiệm CLB / Phó Chủ nhiệm CLB cho nhiệm kỳ này
            </div>
            <p className="text-xs text-[#6E472B]">
              Bấm nút <strong>"Phân Quyền Chủ Nhiệm & Phó Chủ Nhiệm Khác Cho Nhiệm Kỳ"</strong> để chọn bất kỳ tài khoản nào.
            </p>
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

                    {canDeleteMembers && onDeleteUser && (
                      <button
                        type="button"
                        onClick={() => onDeleteUser(leader.id)}
                        className="p-1.5 rounded-lg text-[#8C3B1E] hover:bg-rose-100 hover:text-rose-700 transition cursor-pointer shrink-0"
                        title="Xóa người này khỏi CLB"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#382215]/10 flex items-center justify-between text-xs">
                    <span className="text-[#4A3525] font-medium truncate">
                      {leader.position}
                    </span>
                    {canModifyOrgChart && onOpenSuccessionModal && (
                      <button
                        type="button"
                        onClick={onOpenSuccessionModal}
                        className="text-xs font-bold text-[#C8532B] hover:underline shrink-0 cursor-pointer ml-2"
                      >
                        Đổi người
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          BẢNG VINH DANH HUÂN CHƯƠNG NHÂN SỰ CÂU LẠC BỘ
         ========================================================================= */}
      <div className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-[#382215]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E5A140] border-2 border-[#382215] shadow-[2px_2px_0px_#382215] flex items-center justify-center shrink-0">
              <Medal className="w-5 h-5 text-[#382215]" />
            </div>
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#C8532B]">
                Ghi Nhận Thành Tích & Khen Thưởng Nhân Sự
              </div>
              <h3 className="text-lg sm:text-xl font-black text-[#382215] font-serif-vintage">
                Bảng Vinh Danh Huân Chương Nhân Sự CLB
              </h3>
            </div>
          </div>
          <span className="px-3 py-1 rounded-xl bg-[#245351] text-[#FFE29A] text-xs font-black border-2 border-[#382215] shadow-[2px_2px_0px_#382215] self-start sm:self-auto">
            {userList.filter(u => u.id !== 'bcn-root' && u.badges && u.badges.length > 0).length} Cá nhân được trao Huân chương
          </span>
        </div>

        {userList.filter(u => u.id !== 'bcn-root' && u.badges && u.badges.length > 0).length === 0 ? (
          <div className="p-5 text-center rounded-2xl bg-[#FFFDF8] border-2 border-dashed border-[#382215]/30 text-xs text-[#6E472B] font-bold">
            Chưa có thành viên nào được cấp phát huân chương. Ban Chủ Nhiệm có thể trao huân chương tại mục Điều hành BCN hoặc Đánh giá năng lực.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {userList
              .filter(u => u.id !== 'bcn-root' && u.badges && u.badges.length > 0)
              .map(honoree => (
                <div
                  key={honoree.id}
                  className="p-4 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215] shadow-[3px_3px_0px_#382215] flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={honoree.avatar}
                      alt={honoree.name}
                      className="w-11 h-11 rounded-xl object-cover border-2 border-[#382215] shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-sm text-[#382215] truncate">
                        {honoree.name}
                      </div>
                      <div className="text-[11px] font-bold text-[#6E472B] truncate">
                        {honoree.position || 'Thành viên CLB'} • {honoree.meritPoints || 50} Điểm Lửa
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#382215]/10">
                    {honoree.badges.map((badge, bIdx) => (
                      <span
                        key={`${honoree.id}-medal-${bIdx}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#E5A140]/30 text-[#382215] border border-[#382215] text-[11px] font-black shadow-[1px_1px_0px_#382215]"
                      >
                        <Medal className="w-3 h-3 text-[#C8532B] shrink-0" />
                        <span>{badge}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* =========================================================================
          DANH BẠ THÀNH VIÊN CLB (NÚT CHUYỂN NHÓM & NÚT XÓA NGƯỜI KHÔNG THUỘC CLB)
         ========================================================================= */}
      <div className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#382215]/15">
          <div>
            <h3 className="font-black text-base sm:text-lg text-[#382215] font-serif-vintage">
              Danh Sách Nhân Sự CLB ({filteredMembers.length} thành viên)
            </h3>
            <p className="text-xs text-[#6E472B] font-medium">
              Hiển thị thông tin nhân sự, huân chương khen thưởng, nút <strong>"Điều chuyển thành viên"</strong> và quản trị danh sách.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedDeptId !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedDeptId('all')}
                className="text-xs font-black text-white bg-[#C8532B] px-3.5 py-1.5 rounded-xl border-2 border-[#382215] shadow-[2px_2px_0px_#382215] cursor-pointer"
              >
                Bỏ lọc: {selectedDeptId} ✕
              </button>
            )}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E472B]" />
              <input 
                type="text"
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                placeholder="Tìm tên, MSSV, huân chương..."
                className="pl-9 pr-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215] text-xs font-bold text-[#382215] focus:outline-none focus:border-[#C8532B] shadow-[2px_2px_0px_#382215]"
              />
            </div>
          </div>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#6E472B] font-bold">
            Không có thành viên nào trong danh sách lọc hiện tại.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member) => {
              const memberConcurrent = getUserConcurrentRoles(member);
              const isLeader = member.departmentRole === 'leader' || member.clubRole === 'president' || memberConcurrent.some(r => r.departmentRole === 'leader');
              const isVice = member.departmentRole === 'vice_leader' || member.clubRole === 'vice_president' || memberConcurrent.some(r => r.departmentRole === 'vice_leader');
              const canTransferThisMember = canModifyOrgChart;

              return (
                <div
                  key={member.id}
                  className="bg-[#FFFDF8] p-4.5 rounded-2xl border-2 border-[#382215] shadow-[3px_3px_0px_#382215] hover:shadow-[5px_5px_0px_#382215] hover:-translate-y-0.5 transition flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <img 
                        src={member.avatar} 
                        alt={member.name} 
                        className="w-12 h-12 rounded-xl object-cover border-2 border-[#382215] shadow-[2px_2px_0px_#382215] shrink-0"
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h4 className="font-black text-sm text-[#382215] truncate">
                          {member.name}
                        </h4>
                        <div className="text-xs font-black text-[#C8532B] truncate">
                          {member.position || `${isLeader ? 'Trưởng nhóm' : isVice ? 'Phó nhóm' : 'Thành viên CLB'}`}
                        </div>
                        <div className="text-[11px] text-[#6E472B] truncate font-semibold">
                          {member.studentId} · {member.faculty}
                        </div>
                      </div>
                    </div>

                    {canDeleteMembers && onDeleteUser && (
                      <button
                        type="button"
                        onClick={() => onDeleteUser(member.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-600 text-rose-800 hover:text-white border border-rose-300 text-xs font-black flex items-center gap-1 transition cursor-pointer shrink-0 shadow-2xs"
                        title="Xóa người này khỏi CLB"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    )}
                  </div>

                  {/* Awarded Medals / Huân Chương */}
                  {member.badges && member.badges.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {member.badges.map((badge, idx) => (
                        <span
                          key={`${member.id}-badge-${idx}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#E5A140]/35 text-[#382215] border border-[#382215] text-[10px] font-black"
                        >
                          <Medal className="w-3 h-3 text-[#C8532B] shrink-0" />
                          <span>{badge}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions: Điều chuyển thành viên */}
                  <div className="pt-2.5 border-t border-[#382215]/10 flex items-center justify-between text-xs">
                    <span className="text-[#6E472B] text-[11px] font-semibold truncate">
                      Nhóm: {member.department}
                    </span>
                    {canTransferThisMember && (
                      <button
                        type="button"
                        onClick={() => handleOpenTransferModal(member)}
                        className="px-3 py-1 rounded-xl bg-[#FAF3E3] hover:bg-[#F2E5C9] text-[#245351] border-2 border-[#382215] font-black text-[11px] flex items-center gap-1 cursor-pointer transition shadow-[2px_2px_0px_#382215] active:translate-x-[1px] active:translate-y-[1px]"
                        title="Thêm kiêm nhiệm ban khác hoặc chuyển nhóm"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 text-[#245351]" />
                        <span>Kiêm Nhiệm / Chuyển Nhóm</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL: CHUYỂN NHÓM THÀNH VIÊN / FIX DUYỆT LỘN NHÓM
         ========================================================================= */}
      {transferringMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FAF3E3] rounded-2xl border-3 border-[#382215] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="bg-[#382215] text-[#FAF3E3] p-4 sm:p-5 flex items-center justify-between shrink-0 border-b-2 border-[#C8532B]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#245351] text-white flex items-center justify-center font-bold">
                  <ArrowRightLeft className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h4 className="font-bold text-base font-serif-vintage">
                    Chuyển Nhóm Sinh Hoạt / Sửa Duyệt Lộn
                  </h4>
                  <p className="text-xs text-[#F2E5C9]/80">
                    Thành viên: <strong>{transferringMember.name}</strong> ({transferringMember.studentId})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTransferringMember(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmTransfer} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-[#FFFDF7] border-2 border-[#382215]/20 flex items-center justify-between">
                <div>
                  <span className="text-[#6E472B]">Nhóm hiện tại:</span>
                  <div className="font-bold text-sm text-[#C8532B]">
                    Ban {transferringMember.department}
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-[#382215]" />
                <div>
                  <span className="text-[#6E472B]">Nhóm chuyển tới:</span>
                  <div className="font-bold text-sm text-[#245351]">
                    Ban {targetTransferDept}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#382215] mb-1">
                  1. Chọn nhóm mới muốn chuyển sang *
                </label>
                <select
                  value={targetTransferDept}
                  onChange={(e) => setTargetTransferDept(e.target.value as DepartmentType)}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-[#382215]/30 bg-white font-bold text-[#382215] text-xs"
                >
                  {(['Truyền thông', 'Nội dung', 'Nhân sự & Kế hoạch', 'Hậu cần'] as DepartmentType[])
                    .filter(d => d !== transferringMember.department)
                    .map(d => (
                      <option key={d} value={d}>Ban {d}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#382215] mb-1">
                  2. Lý do chuyển nhóm (để báo cáo lên Chủ nhiệm & Phó Chủ nhiệm) *
                </label>
                <input
                  type="text"
                  required
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Ví dụ: Duyệt lộn nhóm / Bạn có nguyện vọng sang Media..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#382215]/30 bg-white font-medium text-xs text-[#382215]"
                />
              </div>

              {/* Chế độ Kiêm nhiệm hoặc Chuyển hẳn */}
              <div className="p-3.5 rounded-xl bg-[#F2E5C9] border-2 border-[#382215] space-y-2">
                <div className="font-black text-[#382215] text-xs">
                  Chế độ phân công (Hỗ trợ 1 người kiêm nhiệm nhiều ban):
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="transferMode"
                    checked={isConcurrentMode}
                    onChange={() => setIsConcurrentMode(true)}
                    className="mt-0.5 text-[#C8532B]"
                  />
                  <div>
                    <div className="font-bold text-[#382215]">
                      Kiêm nhiệm thêm Ban {targetTransferDept} (Giữ nguyên các chức vụ & ban hiện tại)
                    </div>
                    <div className="text-[10px] text-[#6E472B]">
                      Phù hợp khi CLB thiếu nhân sự: 1 thành viên có thể tham gia và giữ chức vụ ở nhiều ban cùng lúc.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-2 cursor-pointer pt-1">
                  <input
                    type="radio"
                    name="transferMode"
                    checked={!isConcurrentMode}
                    onChange={() => setIsConcurrentMode(false)}
                    className="mt-0.5 text-[#C8532B]"
                  />
                  <div>
                    <div className="font-bold text-[#382215]">
                      Chuyển hẳn sang Ban {targetTransferDept} (Rời ban cũ / Sửa duyệt lộn)
                    </div>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#382215]/15">
                <button
                  type="button"
                  onClick={() => setTransferringMember(null)}
                  className="px-4 py-2 rounded-xl bg-stone-200 text-[#382215] font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#245351] hover:bg-[#1A3D3B] text-white font-bold cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_#382215] border border-[#382215]"
                >
                  <Send className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isConcurrentMode ? 'Xác Nhận Kiêm Nhiệm' : 'Xác Nhận Chuyển Nhóm'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CHỌN TRƯỞNG NHÓM VÀ PHÓ NHÓM CHO CÁC BAN BỆ NHỎ
         ========================================================================= */}
      {editingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FAF3E3] rounded-2xl border-2 border-[#382215] shadow-2xl w-full max-w-xl max-h-[92vh] overflow-hidden flex flex-col">
            <div className="bg-[#382215] text-[#FAF3E3] p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C8532B] text-white flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base font-serif-vintage">
                    Chọn Trưởng Nhóm & Phó Nhóm: Ban {editingDept}
                  </h4>
                  <p className="text-xs text-[#E5A140]">
                    Hỗ trợ kiêm nhiệm nhiều chức ban cùng lúc • Người thực hiện: {currentUser.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDept(null)}
                className="p-1 rounded-lg text-[#FAF3E3]/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubDeptLeaders} className="p-5 overflow-y-auto space-y-4 text-xs">
              {deptModalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{deptModalError}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-[#F2E5C9] border border-[#382215]/30 text-[#382215] text-[11px] font-medium">
                <strong>💡 Chế độ Kiêm Nhiệm:</strong> Một thành viên có thể đồng thời giữ chức Trưởng nhóm / Phó nhóm ở nhiều Ban khác nhau (hoặc vừa là Chủ nhiệm/Phó chủ nhiệm vừa kiêm Trưởng/Phó ban) mà <strong>không bị mất chức vụ ở ban cũ</strong>.
              </div>

              {/* Select Trưởng Nhóm */}
              <div className="bg-[#FFFDF7] p-4 rounded-xl border-2 border-[#C8532B] space-y-2">
                <label className="block font-bold text-[#382215] text-xs sm:text-sm">
                  1. Chọn Trưởng Nhóm / Trưởng Ban {editingDept}
                </label>
                <select
                  value={chosenLeaderId}
                  onChange={(e) => setChosenLeaderId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-[#382215]/30 bg-[#FAF3E3] font-bold text-[#382215] text-xs"
                >
                  <option value="">-- Chưa chọn / Để trống --</option>
                  {eligibleSubDeptPool.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.studentId}) — Hiện giữ: {u.position || `Ban ${u.department}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Phó Nhóm 1 & Phó Nhóm 2 */}
              <div className="bg-[#FFFDF7] p-4 rounded-xl border-2 border-[#382215]/20 space-y-3">
                <label className="block font-bold text-[#382215] text-xs sm:text-sm">
                  2. Chọn Phó Nhóm / Phó Ban {editingDept} (Tối đa 2 Phó nhóm)
                </label>

                <div className="space-y-2.5">
                  <div>
                    <label className="block font-semibold text-[#6E472B] mb-1">
                      Phó Nhóm thứ nhất:
                    </label>
                    <select
                      value={chosenVice1Id}
                      onChange={(e) => setChosenVice1Id(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-[#FAF3E3] font-semibold text-[#382215] text-xs"
                    >
                      <option value="">-- Không chọn / Để trống --</option>
                      {eligibleSubDeptPool
                        .filter(u => u.id !== chosenLeaderId)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.studentId}) — Ban {u.department}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#6E472B] mb-1">
                      Phó Nhóm thứ hai (Tùy chọn):
                    </label>
                    <select
                      value={chosenVice2Id}
                      onChange={(e) => setChosenVice2Id(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-[#FAF3E3] font-semibold text-[#382215] text-xs"
                    >
                      <option value="">-- Không chọn / Để trống --</option>
                      {eligibleSubDeptPool
                        .filter(u => u.id !== chosenLeaderId && u.id !== chosenVice1Id)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.studentId}) — Ban {u.department}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#382215]/15">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="px-4 py-2 rounded-xl bg-stone-200 text-[#382215] font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#C8532B] hover:bg-[#A63E1B] text-white font-bold cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu Trưởng Nhóm & Phó Nhóm</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

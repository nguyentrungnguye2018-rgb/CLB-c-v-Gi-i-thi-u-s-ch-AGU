import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  ClipboardCheck,
  Crown,
  Flame,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  UserCheck,
  Users2,
  ArrowRightLeft,
  Check,
  X,
  Trophy,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  DepartmentType,
  EvaluationRecommendationType,
  MemberEvaluation,
  UserProfile,
  GroupAward
} from '../types';
import {
  SUB_DEPARTMENTS,
  computeEvaluationResult,
  getManagedDepartmentsForEvaluator,
  isUserInDepartment,
  isClubPresidentUser,
  isClubVicePresidentUser
} from '../utils/governance';

interface MemberEvaluationSectionProps {
  currentUser: UserProfile;
  isBcnAdmin: boolean;
  userList: UserProfile[];
  evaluations: MemberEvaluation[];
  onAddEvaluation: (newEval: Omit<MemberEvaluation, 'id' | 'createdAt'>) => void;
  onUpdateEvaluation?: (updated: MemberEvaluation) => void;
  onDeleteEvaluation?: (id: string) => void;
  onRemoveBadge?: (userId: string, badgeName: string) => void;
  onExecuteEvaluationAction?: (
    evaluation: MemberEvaluation,
    actionType: 'reward' | 'rotate'
  ) => void;
}

const PERIOD_PRESETS = [
  'Định kỳ Tháng 10/2026',
  'Định kỳ Tháng 11/2026',
  'Sơ kết Giữa Học Kỳ I (2026 - 2027)',
  'Tổng kết Cuối Kỳ (Xét Khen Thưởng & Luân Chuyển)'
];

export const MemberEvaluationSection: React.FC<MemberEvaluationSectionProps> = ({
  currentUser,
  isBcnAdmin,
  userList,
  evaluations,
  onAddEvaluation,
  onUpdateEvaluation,
  onDeleteEvaluation,
  onRemoveBadge,
  onExecuteEvaluationAction
}) => {
  const managedDepts = getManagedDepartmentsForEvaluator(currentUser, isBcnAdmin);
  const canEvaluate = managedDepts.length > 0;

  // Form states
  const [selectedDept, setSelectedDept] = useState<DepartmentType>(
    managedDepts[0] || 'Nội dung'
  );
  const [period, setPeriod] = useState<string>(PERIOD_PRESETS[0]);
  const [showAllClubMembers, setShowAllClubMembers] = useState<boolean>(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [customMemberName, setCustomMemberName] = useState<string>('');
  const [customMemberStudentId, setCustomMemberStudentId] = useState<string>('');

  // 4 Competency Scores (1 - 10)
  const [scoreResponsibility, setScoreResponsibility] = useState<number>(9);
  const [scoreQuality, setScoreQuality] = useState<number>(8.5);
  const [scoreTeamwork, setScoreTeamwork] = useState<number>(9);
  const [scoreInitiative, setScoreInitiative] = useState<number>(8.5);

  // Qualitative feedback & Recommendation
  const [strengths, setStrengths] = useState<string>('');
  const [improvements, setImprovements] = useState<string>('');
  const [recommendation, setRecommendation] =
    useState<EvaluationRecommendationType>('Khen thưởng cuối kỳ');
  const [suggestedTargetDept, setSuggestedTargetDept] =
    useState<DepartmentType>('Truyền thông');
  const [suggestedRewardBadge, setSuggestedRewardBadge] = useState<string>(
    'Thành Viên Xuất Sắc Cuối Kỳ 🏆'
  );
  const [suggestedBonusPoints, setSuggestedBonusPoints] = useState<number>(80);
  const [submitBannerMsg, setSubmitBannerMsg] = useState<string | null>(null);

  const isPresident = isClubPresidentUser(currentUser);
  const isVicePresident = isClubVicePresidentUser(currentUser);
  const canApproveRound2 = isPresident || isBcnAdmin;
  const canNominateGroupAward = isPresident || isVicePresident || isBcnAdmin;

  // Active Section Tab: Đánh giá 2 vòng cá nhân vs Khen thưởng nhóm xuất sắc
  const [activeSectionTab, setActiveSectionTab] = useState<'evaluations' | 'group_awards'>('evaluations');

  // Round 2 Modal state (Chủ nhiệm CLB đánh giá Vòng 2)
  const [reviewingRound2Eval, setReviewingRound2Eval] = useState<MemberEvaluation | null>(null);
  const [round2ScoreInput, setRound2ScoreInput] = useState<number>(9);
  const [round2CommentsInput, setRound2CommentsInput] = useState<string>('');
  const [round2DecisionInput, setRound2DecisionInput] = useState<'khen_thuong' | 'luan_chuyen' | 'giu_nguyen'>('khen_thuong');

  // Khen thưởng nhóm xuất sắc (Trưởng & Phó CLB cùng thống nhất)
  const [groupAwards, setGroupAwards] = useState<GroupAward[]>(() => {
    const saved = localStorage.getItem('agu_group_awards');
    return saved ? JSON.parse(saved) : [
      {
        id: 'grp-award-1',
        groupName: 'Nhóm Dự Án Sách Hay Tầng 3',
        reason: 'Đã tổ chức xuất sắc 12 buổi đọc sách chuyên đề và không gian kết nối văn hóa đọc tại thư viện AGU.',
        period: 'Học kỳ I (2026 - 2027)',
        agreedByLeader: 'Nguyễn Trung Nguyên (Chủ nhiệm CLB)',
        agreedByViceLeader: 'Trần Thị Ngọc Mai (Phó Chủ nhiệm CLB)',
        certificateCode: 'AGU-GROUP-AWARD-2026-001',
        awardedAt: '20/10/2026'
      }
    ];
  });

  // Group Award nomination form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupPeriod, setNewGroupPeriod] = useState(PERIOD_PRESETS[0]);
  const [newGroupReason, setNewGroupReason] = useState('');
  const [confirmLeaderSigned, setConfirmLeaderSigned] = useState(true);
  const [confirmViceLeaderSigned, setConfirmViceLeaderSigned] = useState(true);

  // Filter states for the public evaluation board
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterRec, setFilterRec] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Keep selectedDept valid when user changes
  useEffect(() => {
    if (managedDepts.length > 0 && !managedDepts.includes(selectedDept)) {
      setSelectedDept(managedDepts[0]);
    }
  }, [managedDepts, selectedDept]);

  // Members in selected department (or all club members if toggled or if dept has 0 members)
  const deptSpecificMembers = userList.filter(
    u => isUserInDepartment(u, selectedDept) || u.department === selectedDept
  );
  const selectableMembers =
    showAllClubMembers || deptSpecificMembers.length === 0
      ? userList
      : deptSpecificMembers;

  useEffect(() => {
    if (
      selectableMembers.length > 0 &&
      !selectableMembers.some(m => m.id === selectedMemberId) &&
      selectedMemberId !== 'custom_member'
    ) {
      setSelectedMemberId(selectableMembers[0].id);
    }
  }, [selectableMembers, selectedMemberId]);

  // Live computed overall score & rating
  const { overallScore, rating } = computeEvaluationResult({
    responsibility: scoreResponsibility,
    quality: scoreQuality,
    teamwork: scoreTeamwork,
    initiative: scoreInitiative
  });

  const handleSubmitEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEvaluate || !strengths.trim()) return;

    const chosenUser = userList.find(u => u.id === selectedMemberId);
    const finalMemberName =
      selectedMemberId === 'custom_member'
        ? customMemberName.trim()
        : chosenUser?.name || customMemberName.trim();

    if (!finalMemberName) return;

    const finalStudentId =
      selectedMemberId === 'custom_member'
        ? customMemberStudentId.trim() || 'AGU-MEMBER'
        : chosenUser?.studentId || 'AGU-MEMBER';

    const finalAvatar =
      chosenUser?.avatar ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';

    const evaluatorRoleLabel = isBcnAdmin
      ? currentUser.position || 'Ban Chủ Nhiệm CLB'
      : currentUser.position || `Trưởng/Phó Ban ${selectedDept}`;

    confetti({
      particleCount: 70,
      spread: 65,
      origin: { y: 0.6 },
      colors: ['#C8532B', '#E5A140', '#245351', '#FAF3E3']
    });

    onAddEvaluation({
      memberId: chosenUser?.id || `member-${Date.now()}`,
      memberName: finalMemberName,
      memberNickname: chosenUser?.nickname,
      memberStudentId: finalStudentId,
      memberAvatar: finalAvatar,
      department: selectedDept,
      period: period.trim() || PERIOD_PRESETS[0],
      criteriaScores: {
        responsibility: scoreResponsibility,
        quality: scoreQuality,
        teamwork: scoreTeamwork,
        initiative: scoreInitiative
      },
      overallScore,
      rating,
      strengths: strengths.trim(),
      improvements: improvements.trim() || undefined,
      recommendation,
      suggestedTargetDept:
        recommendation === 'Đề xuất luân chuyển ban'
          ? suggestedTargetDept
          : undefined,
      suggestedRewardBadge:
        recommendation === 'Khen thưởng cuối kỳ'
          ? suggestedRewardBadge
          : undefined,
      suggestedBonusPoints:
        recommendation === 'Khen thưởng cuối kỳ'
          ? suggestedBonusPoints
          : undefined,
      evaluatorId: currentUser.id,
      evaluatorName: currentUser.name,
      evaluatorRole: evaluatorRoleLabel,
      round: 1,
      round1Completed: true,
      round1EvaluatorName: currentUser.name,
      round1EvaluatorRole: evaluatorRoleLabel,
      round1CompletedAt: new Date().toLocaleDateString('vi-VN'),
      round2Status: 'pending_president'
    });

    setSubmitBannerMsg(
      `Đã hoàn thành Vòng 1 (Đánh giá cấp Ban) cho "${finalMemberName}" (${selectedDept})! Phiếu đã được chuyển lên Chủ nhiệm CLB để đánh giá & phê chuẩn Vòng 2.`
    );
    setStrengths('');
    setImprovements('');
    setCustomMemberName('');
    setCustomMemberStudentId('');
  };

  const handleSaveRound2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingRound2Eval) return;

    const updated: MemberEvaluation = {
      ...reviewingRound2Eval,
      round: 2,
      round2Status: 'approved',
      round2PresidentName: currentUser.name,
      round2Score: round2ScoreInput,
      round2Comments: round2CommentsInput.trim() || 'Chủ nhiệm CLB đã đánh giá và thống nhất kết quả.',
      round2Decision: round2DecisionInput,
      round2CompletedAt: new Date().toLocaleDateString('vi-VN')
    };

    if (onUpdateEvaluation) {
      onUpdateEvaluation(updated);
    }

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#D4AF37', '#10B981', '#C8532B', '#FAF3E3']
    });

    setSubmitBannerMsg(
      `Chủ nhiệm CLB đã phê chuẩn Vòng 2 cho "${updated.memberName}" thành công! Điểm chung cuộc: ${round2ScoreInput}/10.`
    );
    setReviewingRound2Eval(null);
  };

  const handleSaveGroupAward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupReason.trim()) return;

    const newAward: GroupAward = {
      id: `grp-award-${Date.now()}`,
      groupName: newGroupName.trim(),
      reason: newGroupReason.trim(),
      period: newGroupPeriod,
      agreedByLeader: `${currentUser.name} (Chủ nhiệm CLB)`,
      agreedByViceLeader: 'Phó Chủ nhiệm CLB (Đồng thuận)',
      certificateCode: `AGU-GROUP-AWARD-2026-${Math.floor(100 + Math.random() * 900)}`,
      awardedAt: new Date().toLocaleDateString('vi-VN')
    };

    const nextAwards = [newAward, ...groupAwards];
    setGroupAwards(nextAwards);
    localStorage.setItem('agu_group_awards', JSON.stringify(nextAwards));

    confetti({
      particleCount: 95,
      spread: 75,
      origin: { y: 0.5 },
      colors: ['#FFD700', '#C8532B', '#245351', '#FAF3E3']
    });

    setSubmitBannerMsg(`Đã thống nhất và trao khen thưởng tập thể xuất sắc cho "${newGroupName}" thành công!`);
    setNewGroupName('');
    setNewGroupReason('');
  };

  const handleDeleteGroupAward = (id: string) => {
    const nextAwards = groupAwards.filter(a => a.id !== id);
    setGroupAwards(nextAwards);
    try {
      localStorage.setItem('agu_group_awards', JSON.stringify(nextAwards));
    } catch {
      // ignore
    }
    setSubmitBannerMsg('Đã xóa thông tin khen thưởng nhóm tập thể bấm lộn thành công!');
  };

  // Filtered evaluations
  const filteredEvaluations = evaluations.filter(ev => {
    const matchDept = filterDept === 'all' || ev.department === filterDept;
    const matchRec = filterRec === 'all' || ev.recommendation === filterRec;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      ev.memberName.toLowerCase().includes(q) ||
      ev.memberStudentId.toLowerCase().includes(q) ||
      ev.evaluatorName.toLowerCase().includes(q) ||
      ev.period.toLowerCase().includes(q) ||
      ev.strengths.toLowerCase().includes(q);
    return matchDept && matchRec && matchSearch;
  });

  // Stats
  const rewardNomineesCount = evaluations.filter(
    e => e.recommendation === 'Khen thưởng cuối kỳ'
  ).length;
  const rotationProposalsCount = evaluations.filter(
    e => e.recommendation === 'Đề xuất luân chuyển ban'
  ).length;
  const avgClubScore =
    evaluations.length > 0
      ? (
          evaluations.reduce((sum, e) => sum + (e.overallScore || 0), 0) /
          evaluations.length
        ).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* =========================================================================
          HEADER BANNER: ĐÁNH GIÁ NĂNG LỰC THÀNH VIÊN (KHỐI CỨNG MỀM MẠI)
         ========================================================================= */}
      <div className="rounded-3xl bg-[#FAF3E3] border-3 border-[#382215] shadow-[6px_6px_0px_#382215] p-5 sm:p-7 space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5A140] text-[#382215] text-[11px] font-black uppercase tracking-wider border-2 border-[#382215] shadow-[2px_2px_0px_#382215]">
                <ClipboardCheck className="w-3.5 h-3.5 text-[#382215]" />
                Hệ Thống Đánh Giá Năng Lực Thành Viên Định Kỳ
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#245351] text-[#FFE29A] text-[10px] font-black border border-[#382215]">
                <ShieldCheck className="w-3 h-3 text-[#FFE29A]" />
                {isBcnAdmin
                  ? 'Quyền BCN: Đánh Giá & Phê Duyệt Toàn Bộ 4 Ban'
                  : canEvaluate
                  ? `Quyền Trưởng/Phó Ban: Quản Lý Ban ${managedDepts.join(', ')}`
                  : 'Chế Độ Xem Minh Bạch Toàn CLB'}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black font-serif-vintage text-[#382215] tracking-tight">
              Đánh Giá Hiệu Suất Định Kỳ • Minh Bạch Luân Chuyển & Khen Thưởng Cuối Kỳ
            </h3>

            <p className="text-xs sm:text-sm text-[#5C432C] font-medium leading-relaxed">
              Cho phép <strong>Trưởng ban, Phó ban</strong> và <strong>Ban Chủ Nhiệm</strong> nhận xét định kỳ về hiệu suất hoạt động của từng thành viên trong ban mình quản lý theo 4 tiêu chí cốt lõi, làm căn cứ công khai và minh bạch cho việc <strong>luân chuyển nhân sự</strong> hoặc <strong>khen thưởng cuối kỳ</strong>.
            </p>
          </div>

          {/* 4 Summary Stat Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5 w-full lg:w-80 shrink-0">
            <div className="p-3 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215] shadow-[3px_3px_0px_#382215]">
              <div className="text-[10px] font-extrabold text-[#6E472B] uppercase">
                Tổng Phiếu Đánh Giá
              </div>
              <div className="text-base font-black text-[#382215] mt-0.5">
                {evaluations.length} phiếu
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215] shadow-[3px_3px_0px_#382215]">
              <div className="text-[10px] font-extrabold text-[#C8532B] uppercase">
                Đề Xuất Khen Thưởng
              </div>
              <div className="text-base font-black text-[#C8532B] mt-0.5">
                {rewardNomineesCount} thành viên
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215] shadow-[3px_3px_0px_#382215]">
              <div className="text-[10px] font-extrabold text-[#245351] uppercase">
                Đề Xuất Luân Chuyển
              </div>
              <div className="text-base font-black text-[#245351] mt-0.5">
                {rotationProposalsCount} đề xuất
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215] shadow-[3px_3px_0px_#382215]">
              <div className="text-[10px] font-extrabold text-[#486A39] uppercase">
                Điểm Hiệu Suất TB
              </div>
              <div className="text-base font-black text-[#486A39] mt-0.5">
                {avgClubScore} / 10
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {submitBannerMsg && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215] shadow-[4px_4px_0px_#382215] text-xs font-black text-[#245351] animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#486A39] shrink-0" />
            <span>{submitBannerMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSubmitBannerMsg(null)}
            className="px-2 py-1 rounded-lg bg-[#F2E5C9] text-[#382215] text-[10px] font-black cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* BẢNG VINH DANH HUÂN CHƯƠNG CÁ NHÂN (ĐỒNG BỘ TẠI ĐÁNH GIÁ NĂNG LỰC THÀNH VIÊN) */}
      <div className="rounded-3xl bg-[#FAF3E3] border-3 border-[#382215] shadow-[5px_5px_0px_#382215] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#382215]/15 pb-2.5">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#C8532B]" />
            <div>
              <h4 className="font-black text-sm sm:text-base text-[#382215] font-serif-vintage">
                Bảng Vinh Danh Huân Chương Thành Viên CLB
              </h4>
              <p className="text-[11px] text-[#6E472B] font-semibold">
                Các cá nhân đã được trao tặng Huân chương danh dự (Đồng bộ cùng Bảng Quản Trị Nhân Sự & Điều Hành BCN)
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-xl bg-[#E5A140] text-[#382215] text-xs font-black border-2 border-[#382215]">
            {userList.filter(u => u.id !== 'bcn-root' && u.badges && u.badges.length > 0).length} Cá nhân nhận Huân chương
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {userList
            .filter(u => u.id !== 'bcn-root' && u.badges && u.badges.length > 0)
            .map(honoree => (
              <div
                key={`eval-medal-${honoree.id}`}
                className="p-3 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215] shadow-[2px_2px_0px_#382215] flex flex-col justify-between gap-2"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={honoree.avatar}
                    alt={honoree.name}
                    className="w-9 h-9 rounded-xl object-cover border border-[#382215] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-xs text-[#382215] truncate">{honoree.name}</div>
                    <div className="text-[10px] font-bold text-[#6E472B] truncate">
                      {honoree.position || `Ban ${honoree.department}`}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 pt-1 border-t border-[#382215]/10">
                  {honoree.badges.map((badge, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#E5A140]/35 text-[#382215] border border-[#382215] text-[10px] font-black"
                    >
                      <Award className="w-2.5 h-2.5 text-[#C8532B] shrink-0" />
                      <span>{badge}</span>
                      {onRemoveBadge && (isBcnAdmin || canEvaluate) && (
                        <button
                          type="button"
                          onClick={() => onRemoveBadge(honoree.id, badge)}
                          className="ml-1 text-rose-700 hover:text-rose-900 font-black cursor-pointer hover:scale-125 transition"
                          title="Xóa huân chương / khen thưởng bấm lộn này"
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

      {/* SECTION TABS: ĐÁNH GIÁ 2 VÒNG vs KHEN THƯỞNG NHÓM XUẤT SẮC */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#F2E5C9] rounded-2xl border-2 border-[#382215] shadow-[3px_3px_0px_#382215]">
        <button
          type="button"
          onClick={() => setActiveSectionTab('evaluations')}
          className={`flex-1 min-w-[210px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center justify-center gap-2 ${
            activeSectionTab === 'evaluations'
              ? 'bg-[#245351] text-[#FFE29A] border-2 border-[#382215] shadow-[2px_2px_0px_#382215]'
              : 'text-[#5C432C] hover:bg-[#EAD8B3]'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>Phiếu Đánh Giá Định Kỳ 2 Vòng (Cấp Ban & Chủ Nhiệm CLB)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSectionTab('group_awards')}
          className={`flex-1 min-w-[210px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center justify-center gap-2 ${
            activeSectionTab === 'group_awards'
              ? 'bg-[#C8532B] text-white border-2 border-[#382215] shadow-[2px_2px_0px_#382215]'
              : 'text-[#5C432C] hover:bg-[#EAD8B3]'
          }`}
        >
          <Trophy className="w-4 h-4 text-[#FFE29A]" />
          <span>Khen Thưởng Nhóm Xuất Sắc 🏆 (Trưởng & Phó CLB Thống Nhất)</span>
        </button>
      </div>

      {/* =========================================================================
          VIEW 2: KHEN THƯỞNG NHÓM XUẤT SẮC (TRƯỞNG & PHÓ CLB CÙNG THỐNG NHẤT)
         ========================================================================= */}
      {activeSectionTab === 'group_awards' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {canNominateGroupAward && (
            <div className="lg:col-span-5 bg-[#FAF3E3] p-5 sm:p-6 rounded-3xl border-3 border-[#382215] shadow-[6px_6px_0px_#382215] space-y-4">
              <div className="flex items-center gap-2.5 border-b-2 border-[#382215]/15 pb-3">
                <div className="w-9 h-9 rounded-xl bg-[#E5A140] text-[#382215] border-2 border-[#382215] flex items-center justify-center font-black shadow-[2px_2px_0px_#382215]">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-base text-[#382215] font-serif-vintage">
                    Thống Nhất Khen Thưởng Nhóm Xuất Sắc
                  </h4>
                  <p className="text-[11px] text-[#6E472B] font-semibold">
                    Trưởng CLB & Phó CLB ngồi lại thống nhất vinh danh tập thể
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveGroupAward} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-black text-[#382215] mb-1">
                    Tên Nhóm / Đội Dự Án Xuất Sắc:
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    placeholder="VD: Nhóm Tổ Chức Ngày Sách AGU, Nhóm Truyền Thông Sự Kiện..."
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215]/40 font-bold text-[#382215]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-black text-[#382215] mb-1">
                    Giai Đoạn / Đợt Xét Khen Thưởng:
                  </label>
                  <input
                    type="text"
                    value={newGroupPeriod}
                    onChange={e => setNewGroupPeriod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215]/40 font-bold text-[#382215]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-black text-[#382215] mb-1">
                    Thành Tích Nổi Bật & Lý Do Vinh Danh:
                  </label>
                  <textarea
                    rows={3}
                    value={newGroupReason}
                    onChange={e => setNewGroupReason(e.target.value)}
                    placeholder="Mô tả đóng góp xuất sắc của nhóm..."
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215]/40 font-medium text-[#382215]"
                    required
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#F2E5C9] border-2 border-[#382215] space-y-2">
                  <div className="font-black text-[#382215] text-[11px] uppercase">
                    Xác Nhận Đồng Thuận Của Trưởng & Phó CLB:
                  </div>
                  <label className="flex items-center gap-2 font-bold text-[#382215] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmLeaderSigned}
                      onChange={e => setConfirmLeaderSigned(e.target.checked)}
                      className="rounded border-[#382215]"
                    />
                    <span>Chủ nhiệm Câu lạc bộ (Trưởng CLB) đồng ý phê duyệt</span>
                  </label>
                  <label className="flex items-center gap-2 font-bold text-[#382215] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmViceLeaderSigned}
                      onChange={e => setConfirmViceLeaderSigned(e.target.checked)}
                      className="rounded border-[#382215]"
                    />
                    <span>Phó Chủ nhiệm Câu lạc bộ (Phó CLB) đồng ý thống nhất</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-2xl font-black text-xs bg-[#C8532B] hover:bg-[#A63E1B] text-white border-2 border-[#382215] shadow-[4px_4px_0px_#382215] transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trophy className="w-4 h-4 text-[#FFE29A]" />
                  <span>Ban Hành Quyết Định Khen Thưởng Nhóm</span>
                </button>
              </form>
            </div>
          )}

          <div className={`${canNominateGroupAward ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
            {groupAwards.map(award => (
              <div
                key={award.id}
                className="bg-[#FAF3E3] p-5 sm:p-6 rounded-3xl border-3 border-[#382215] shadow-[6px_6px_0px_#382215] space-y-3"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap border-b-2 border-[#382215]/15 pb-2.5">
                  <span className="px-3 py-1 rounded-xl bg-[#E5A140] text-[#382215] text-[11px] font-black border-2 border-[#382215] shadow-[2px_2px_0px_#382215] flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>BẰNG KHEN TẬP THỂ / NHÓM XUẤT SẮC</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-black text-[#6E472B]">
                      Mã số: {award.certificateCode} • {award.awardedAt}
                    </span>
                    {canNominateGroupAward && (
                      <button
                        type="button"
                        onClick={() => handleDeleteGroupAward(award.id)}
                        className="p-1.5 px-2.5 rounded-xl bg-[#FFFDF8] hover:bg-rose-600 text-[#C8532B] hover:text-white border-2 border-[#382215] transition cursor-pointer flex items-center gap-1 text-[11px] font-black shadow-[2px_2px_0px_#382215]"
                        title="Xóa khen thưởng nhóm này (nếu bấm lộn)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa khen thưởng lộn</span>
                      </button>
                    )}
                  </div>
                </div>

                <h4 className="text-lg sm:text-xl font-black text-[#382215] font-serif-vintage">
                  🏆 {award.groupName}
                </h4>
                <div className="text-xs font-bold text-[#245351]">
                  Kỳ khen thưởng: {award.period}
                </div>
                <p className="p-3.5 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215]/25 text-xs text-[#382215] leading-relaxed">
                  <strong>Thành tích:</strong> {award.reason}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-[#F2E5C9] border border-[#382215]/30 font-bold text-[#382215]">
                    ✓ Trưởng CLB: <span className="text-[#C8532B]">{award.agreedByLeader}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F2E5C9] border border-[#382215]/30 font-bold text-[#382215]">
                    ✓ Phó CLB: <span className="text-[#245351]">{award.agreedByViceLeader}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN CONTENT GRID: EVALUATION FORM (LEFT) + TRANSPARENT REGISTRY (RIGHT)
         ========================================================================= */}
      {activeSectionTab === 'evaluations' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: FORM NHẬN XÉT ĐỊNH KỲ (FOR TRƯỞNG/PHÓ BAN & BCN) */}
        {canEvaluate ? (
          <div className="lg:col-span-5 bg-[#FAF3E3] p-5 sm:p-6 rounded-3xl border-3 border-[#382215] shadow-[6px_6px_0px_#382215] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#382215]/15 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#C8532B] text-white border-2 border-[#382215] flex items-center justify-center font-black shadow-[2px_2px_0px_#382215]">
                  <ClipboardCheck className="w-4 h-4 text-[#FFE29A]" />
                </div>
                <div>
                  <h4 className="font-black text-base text-[#382215] font-serif-vintage">
                    Lập Phiếu Đánh Giá Năng Lực Định Kỳ
                  </h4>
                  <p className="text-[11px] text-[#6E472B] font-semibold">
                    Dành cho Trưởng/Phó ban & Ban Chủ Nhiệm
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitEvaluation} className="space-y-4 text-xs">
              {/* 1. Chọn Ban Quản Lý */}
              <div>
                <label className="block font-black text-[#382215] mb-1.5">
                  1. Chọn Ban Chuyên Môn Quản Lý:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {managedDepts.map(dept => {
                    const isSel = selectedDept === dept;
                    return (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => setSelectedDept(dept)}
                        className={`p-2.5 rounded-xl border-2 text-left font-black text-xs transition cursor-pointer ${
                          isSel
                            ? 'bg-[#245351] text-[#FFE29A] border-[#382215] shadow-[2px_2px_0px_#382215]'
                            : 'bg-[#FFFDF8] text-[#382215] border-[#382215]/30 hover:bg-[#EAD8B3]'
                        }`}
                      >
                        Ban {dept}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Kỳ đánh giá định kỳ */}
              <div className="space-y-1.5">
                <label className="block font-black text-[#382215]">
                  2. Kỳ Đánh Giá Định Kỳ:
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {PERIOD_PRESETS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPeriod(p)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-black border transition cursor-pointer shrink-0 ${
                        period === p
                          ? 'bg-[#E5A140] text-[#382215] border-[#382215]'
                          : 'bg-[#FFFDF8] text-[#6E472B] border-[#382215]/30 hover:bg-[#F2E5C9]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  placeholder="Nhập kỳ đánh giá (VD: Định kỳ Tháng 11/2026, Cuối kỳ I...)"
                  className="w-full px-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215]/40 font-bold text-[#382215]"
                  required
                />
              </div>

              {/* 3. Chọn Thành Viên Được Đánh Giá */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-black text-[#382215]">
                    3. Thành Viên Được Nhận Xét:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAllClubMembers(prev => !prev)}
                    className="text-[10px] font-extrabold text-[#C8532B] hover:underline cursor-pointer"
                  >
                    {showAllClubMembers
                      ? 'Chỉ hiện TV trong ban'
                      : 'Hiện toàn bộ TV CLB / Nhập tên'}
                  </button>
                </div>

                <select
                  value={selectedMemberId}
                  onChange={e => setSelectedMemberId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215]/40 font-bold text-[#382215]"
                >
                  {selectableMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.nickname ? `(${m.nickname})` : ''} — MSSV:{' '}
                      {m.studentId} ({m.position || m.department})
                    </option>
                  ))}
                  <option value="custom_member">
                    + Nhập trực tiếp Họ tên & MSSV thành viên mới...
                  </option>
                </select>

                {selectedMemberId === 'custom_member' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <input
                      type="text"
                      value={customMemberName}
                      onChange={e => setCustomMemberName(e.target.value)}
                      placeholder="Họ và tên thành viên..."
                      className="px-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215]/40 font-bold text-[#382215]"
                      required
                    />
                    <input
                      type="text"
                      value={customMemberStudentId}
                      onChange={e => setCustomMemberStudentId(e.target.value)}
                      placeholder="MSSV (VD: DTH230112)..."
                      className="px-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215]/40 font-bold text-[#382215]"
                    />
                  </div>
                )}
              </div>

              {/* 4. Chấm điểm 4 tiêu chí năng lực (1 - 10) */}
              <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215] shadow-[3px_3px_0px_#382215] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-[#382215]">
                    4. Chấm Điểm 4 Tiêu Chí Năng Lực (Thang 10):
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border border-[#382215] ${
                      rating === 'Xuất sắc'
                        ? 'bg-[#E5A140] text-[#382215]'
                        : rating === 'Tốt'
                        ? 'bg-[#486A39] text-white'
                        : rating === 'Đạt'
                        ? 'bg-[#245351] text-[#FFE29A]'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    TB: {overallScore}/10 • {rating}
                  </span>
                </div>

                {[
                  {
                    label: 'Tinh thần trách nhiệm & kỷ luật',
                    val: scoreResponsibility,
                    setter: setScoreResponsibility
                  },
                  {
                    label: 'Chất lượng & tiến độ công việc',
                    val: scoreQuality,
                    setter: setScoreQuality
                  },
                  {
                    label: 'Phối hợp nhóm & gắn kết CLB',
                    val: scoreTeamwork,
                    setter: setScoreTeamwork
                  },
                  {
                    label: 'Chủ động sáng tạo & ý tưởng',
                    val: scoreInitiative,
                    setter: setScoreInitiative
                  }
                ].map((crit, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#382215]">
                      <span>{crit.label}</span>
                      <span className="font-black text-[#C8532B]">
                        {crit.val} / 10
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={0.5}
                      value={crit.val}
                      onChange={e => crit.setter(Number(e.target.value))}
                      className="w-full accent-[#C8532B] cursor-pointer h-1.5 rounded-lg"
                    />
                  </div>
                ))}
              </div>

              {/* 5. Nhận xét chi tiết của Trưởng/Phó ban */}
              <div className="space-y-2">
                <div>
                  <label className="block font-black text-[#382215] mb-1">
                    5. Nhận Xét Điểm Mạnh & Đóng Góp Trong Kỳ:
                  </label>
                  <textarea
                    rows={3}
                    value={strengths}
                    onChange={e => setStrengths(e.target.value)}
                    placeholder="Ghi nhận cụ thể: Hoàn thành tốt các ấn phẩm truyền thông/bài viết, nhiệt tình hỗ trợ sự kiện CLB, chủ động giúp đỡ thành viên mới..."
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215]/40 font-medium text-[#382215] leading-relaxed"
                    required
                  />
                  <div className="flex items-center gap-1 overflow-x-auto pt-1">
                    <span className="text-[10px] font-bold text-[#6E472B] shrink-0">
                      Mẫu nhanh:
                    </span>
                    {[
                      'Hoàn thành xuất sắc mọi nhiệm vụ đúng hạn, tinh thần trách nhiệm rất cao và luôn hỗ trợ đồng đội trong ban.',
                      'Chủ động đề xuất nhiều ý tưởng sáng tạo cho sinh hoạt CLB, chất lượng chuyên môn ổn định.',
                      'Nhiệt tình tham gia hoạt động nhưng có nguyện vọng và năng lực phù hợp hơn với công việc của ban chuyên môn mới.'
                    ].map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setStrengths(tpl)}
                        className="px-2 py-0.5 rounded-lg bg-[#F2E5C9] hover:bg-[#EAD8B3] text-[#382215] text-[10px] font-bold border border-[#382215]/25 shrink-0 cursor-pointer"
                      >
                        Mẫu {i + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-black text-[#382215] mb-1">
                    6. Góp Ý Cải Thiện / Định Hướng Phát Triển (Tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={improvements}
                    onChange={e => setImprovements(e.target.value)}
                    placeholder="Ví dụ: Cần mạnh dạn phát biểu hơn trong các buổi họp ban..."
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215]/40 font-medium text-[#382215]"
                  />
                </div>
              </div>

              {/* 7. Đề xuất minh bạch (Khen thưởng cuối kỳ / Luân chuyển nhân sự / Giữ nguyên / Bồi dưỡng) */}
              <div className="space-y-2">
                <label className="block font-black text-[#382215]">
                  7. Đề Xuất Nhân Sự Minh Bạch Cuối Kỳ:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      {
                        val: 'Khen thưởng cuối kỳ',
                        label: '🏆 Khen thưởng cuối kỳ',
                        desc: 'Đề xuất BCN tuyên dương & cộng điểm Lửa'
                      },
                      {
                        val: 'Giữ nguyên vị trí',
                        label: '✅ Giữ nguyên vị trí',
                        desc: 'Tiếp tục phát huy tại ban hiện tại'
                      },
                      {
                        val: 'Đề xuất luân chuyển ban',
                        label: '🔄 Luân chuyển nhân sự',
                        desc: 'Đề xuất chuyển/kiêm nhiệm sang ban phù hợp hơn'
                      },
                      {
                        val: 'Bồi dưỡng thêm',
                        label: '🌱 Bồi dưỡng thêm',
                        desc: 'Cần Trưởng/Phó ban kèm cặp thêm kỹ năng'
                      }
                    ] as const
                  ).map(opt => {
                    const isSel = recommendation === opt.val;
                    return (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setRecommendation(opt.val)}
                        className={`p-2.5 rounded-xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                          isSel
                            ? 'bg-[#382215] text-[#FFE29A] border-[#382215] shadow-[2px_2px_0px_#C8532B]'
                            : 'bg-[#FFFDF8] text-[#382215] border-[#382215]/30 hover:bg-[#F2E5C9]'
                        }`}
                      >
                        <span className="font-black text-[11px]">
                          {opt.label}
                        </span>
                        <span
                          className={`text-[9px] mt-0.5 ${
                            isSel ? 'text-[#FAF3E3]/80' : 'text-[#6E472B]'
                          }`}
                        >
                          {opt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Extra options when Khen thưởng cuối kỳ is selected */}
                {recommendation === 'Khen thưởng cuối kỳ' && (
                  <div className="p-3 rounded-xl bg-[#E5A140]/20 border-2 border-[#382215] space-y-2">
                    <div className="text-[11px] font-black text-[#382215] flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-[#C8532B]" />
                      <span>Chi tiết đề xuất khen thưởng cuối kỳ:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={suggestedRewardBadge}
                        onChange={e => setSuggestedRewardBadge(e.target.value)}
                        placeholder="Danh hiệu khen thưởng..."
                        className="px-2.5 py-1.5 rounded-lg bg-[#FFFDF8] border border-[#382215]/40 text-xs font-bold text-[#382215]"
                      />
                      <select
                        value={suggestedBonusPoints}
                        onChange={e =>
                          setSuggestedBonusPoints(Number(e.target.value))
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-[#FFFDF8] border border-[#382215]/40 text-xs font-black text-[#C8532B]"
                      >
                        <option value={50}>+50 Điểm Lửa Cống Hiến</option>
                        <option value={80}>+80 Điểm Lửa Cống Hiến</option>
                        <option value={100}>+100 Điểm Lửa Xuất Sắc</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Extra options when Đề xuất luân chuyển ban is selected */}
                {recommendation === 'Đề xuất luân chuyển ban' && (
                  <div className="p-3 rounded-xl bg-[#245351]/15 border-2 border-[#382215] space-y-2">
                    <div className="text-[11px] font-black text-[#245351] flex items-center gap-1">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-[#245351]" />
                      <span>Chọn Ban chuyên môn đề xuất luân chuyển đến:</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {SUB_DEPARTMENTS.map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSuggestedTargetDept(d)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black border cursor-pointer ${
                            suggestedTargetDept === d
                              ? 'bg-[#245351] text-[#FFE29A] border-[#382215]'
                              : 'bg-[#FFFDF8] text-[#382215] border-[#382215]/30'
                          }`}
                        >
                          Sang Ban {d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-2xl font-black text-xs bg-[#C8532B] hover:bg-[#A63E1B] text-white border-2 border-[#382215] shadow-[4px_4px_0px_#382215] active:translate-x-[1px] active:translate-y-[1px] transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4 text-[#FFE29A]" />
                <span>Lưu Phiếu Đánh Giá & Công Khai Minh Bạch</span>
              </button>
            </form>
          </div>
        ) : null}

        {/* RIGHT COLUMN: BẢNG MINH BẠCH ĐÁNH GIÁ & ĐỀ XUẤT NHÂN SỰ */}
        <div
          className={`${
            canEvaluate ? 'lg:col-span-7' : 'lg:col-span-12'
          } space-y-4`}
        >
          {/* Filter Bar */}
          <div className="bg-[#FAF3E3] p-4 rounded-2xl border-2 border-[#382215] shadow-[4px_4px_0px_#382215] space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-[#382215]">
                <TrendingUp className="w-4 h-4 text-[#C8532B]" />
                <span>
                  Hồ Sơ Đánh Giá Năng Lực Định Kỳ ({filteredEvaluations.length})
                </span>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E472B]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm tên thành viên, MSSV, kỳ đánh giá..."
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-[#FFFDF8] border-2 border-[#382215]/30 text-xs font-bold text-[#382215] w-full sm:w-64"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#382215]/10">
              <select
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-[#FFFDF8] border border-[#382215]/40 text-[11px] font-black text-[#382215]"
              >
                <option value="all">Tất cả 4 Ban chuyên môn</option>
                {SUB_DEPARTMENTS.map(d => (
                  <option key={d} value={d}>
                    Ban {d}
                  </option>
                ))}
              </select>

              <select
                value={filterRec}
                onChange={e => setFilterRec(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-[#FFFDF8] border border-[#382215]/40 text-[11px] font-black text-[#382215]"
              >
                <option value="all">Tất cả đề xuất cuối kỳ</option>
                <option value="Khen thưởng cuối kỳ">
                  🏆 Đề xuất Khen thưởng cuối kỳ
                </option>
                <option value="Đề xuất luân chuyển ban">
                  🔄 Đề xuất Luân chuyển nhân sự
                </option>
                <option value="Giữ nguyên vị trí">✅ Giữ nguyên vị trí</option>
                <option value="Bồi dưỡng thêm">🌱 Bồi dưỡng thêm</option>
              </select>
            </div>
          </div>

          {/* Evaluations List */}
          {filteredEvaluations.length === 0 ? (
            <div className="p-8 text-center bg-[#FAF3E3] rounded-3xl border-3 border-dashed border-[#382215]/40 shadow-[4px_4px_0px_#382215] space-y-2">
              <ClipboardCheck className="w-10 h-10 text-[#8C3B1E] mx-auto" />
              <h5 className="font-black text-sm text-[#382215] font-serif-vintage">
                Chưa Có Phiếu Đánh Giá Năng Lực Nào Trong Danh Sách Này
              </h5>
              <p className="text-xs text-[#6E472B] max-w-md mx-auto">
                Trưởng/Phó các ban chuyên môn hoặc Ban Chủ Nhiệm có thể lập phiếu nhận xét định kỳ ở biểu mẫu bên cạnh để lưu trữ minh bạch kết quả hoạt động của từng thành viên.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvaluations.map(ev => {
                const canRemove =
                  isBcnAdmin || ev.evaluatorId === currentUser.id;
                return (
                  <div
                    key={ev.id}
                    className="bg-[#FAF3E3] p-5 rounded-3xl border-3 border-[#382215] shadow-[5px_5px_0px_#382215] space-y-3.5"
                  >
                    {/* Top Row: Period, Department & Rating Badge */}
                    <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#382215]/15 pb-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-lg bg-[#245351] text-[#FFE29A] text-[10px] font-black border border-[#382215]">
                          Ban {ev.department}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-[#FFFDF8] text-[#382215] text-[10px] font-black border border-[#382215]/40">
                          {ev.period}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border border-[#382215] ${
                            ev.recommendation === 'Khen thưởng cuối kỳ'
                              ? 'bg-[#E5A140] text-[#382215]'
                              : ev.recommendation === 'Đề xuất luân chuyển ban'
                              ? 'bg-[#C8532B] text-white'
                              : 'bg-[#F2E5C9] text-[#382215]'
                          }`}
                        >
                          {ev.recommendation === 'Khen thưởng cuối kỳ'
                            ? '🏆 Đề xuất Khen thưởng cuối kỳ'
                            : ev.recommendation === 'Đề xuất luân chuyển ban'
                            ? `🔄 Đề xuất luân chuyển sang Ban ${
                                ev.suggestedTargetDept || 'Mới'
                              }`
                            : ev.recommendation === 'Giữ nguyên vị trí'
                            ? '✅ Giữ nguyên vị trí'
                            : '🌱 Cần bồi dưỡng thêm'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-xl text-xs font-black border-2 border-[#382215] shadow-[2px_2px_0px_#382215] ${
                            ev.rating === 'Xuất sắc'
                              ? 'bg-[#E5A140] text-[#382215]'
                              : ev.rating === 'Tốt'
                              ? 'bg-[#486A39] text-white'
                              : ev.rating === 'Đạt'
                              ? 'bg-[#245351] text-[#FFE29A]'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          ★ {ev.overallScore}/10 — {ev.rating}
                        </span>

                        {canRemove && onDeleteEvaluation && (
                          <button
                            type="button"
                            onClick={() => onDeleteEvaluation(ev.id)}
                            className="px-2.5 py-1 rounded-xl bg-[#FFFDF8] hover:bg-rose-600 text-[#C8532B] hover:text-white border-2 border-[#382215] transition cursor-pointer flex items-center gap-1 text-[11px] font-black shadow-[2px_2px_0px_#382215]"
                            title="Xóa phiếu đánh giá / khen thưởng này nếu bấm lộn"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa phiếu (nếu bấm lộn)</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Member Info */}
                    <div className="flex items-center gap-3.5">
                      <img
                        src={ev.memberAvatar}
                        alt={ev.memberName}
                        className="w-13 h-13 rounded-2xl object-cover border-2 border-[#382215] shadow-[2px_2px_0px_#382215] shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-black text-base text-[#382215] font-serif-vintage">
                            {ev.memberName}
                          </h5>
                          {ev.memberNickname && (
                            <span className="text-xs font-bold text-[#C8532B] italic">
                              ({ev.memberNickname})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-bold text-[#6E472B]">
                          MSSV:{' '}
                          <span className="font-mono text-[#382215]">
                            {ev.memberStudentId}
                          </span>{' '}
                          • Trực thuộc: <strong>Ban {ev.department}</strong>
                        </div>
                      </div>
                    </div>

                    {/* 2-ROUND EVALUATION PIPELINE (VÒNG 1: TRƯỞNG/PHÓ BAN -> VÒNG 2: CHỦ NHIỆM CLB) */}
                    <div className="p-3 rounded-2xl bg-[#F2E5C9]/70 border-2 border-[#382215]/30 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-black text-[#382215] flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-[#245351]" />
                          <span>Vòng 1 (Trưởng/Phó Ban đánh giá):</span>
                          <span className="text-[#245351] font-bold">
                            {ev.round1EvaluatorName || ev.evaluatorName} ({ev.round1EvaluatorRole || ev.evaluatorRole})
                          </span>
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-[#245351] text-[#FFE29A] text-[10px] font-black border border-[#382215]">
                          ✓ Đã xong Vòng 1 ({ev.overallScore}/10)
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-[#382215]/15">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-[#382215] flex items-center gap-1">
                            <ShieldCheck className="w-4 h-4 text-[#C8532B]" />
                            <span>Vòng 2 (Chủ Nhiệm CLB xét duyệt):</span>
                          </span>
                          {ev.round2Status === 'approved' ? (
                            <span className="text-[#486A39] font-black">
                              ✓ {ev.round2PresidentName || 'Chủ nhiệm CLB'} đã phê chuẩn ({ev.round2Score || ev.overallScore}/10)
                            </span>
                          ) : (
                            <span className="text-[#C8532B] font-extrabold italic">
                              ⏳ Đang chờ Chủ nhiệm CLB đánh giá Vòng 2
                            </span>
                          )}
                        </div>

                        {ev.round2Status === 'approved' ? (
                          <span className="px-2 py-0.5 rounded-lg bg-[#486A39] text-[#FFFDF8] text-[10px] font-black border border-[#382215]">
                            Hoàn tất 2 Vòng
                          </span>
                        ) : canApproveRound2 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setReviewingRound2Eval(ev);
                              setRound2ScoreInput(ev.overallScore || 9);
                              setRound2CommentsInput('');
                              setRound2DecisionInput(
                                ev.recommendation === 'Khen thưởng cuối kỳ'
                                  ? 'khen_thuong'
                                  : ev.recommendation === 'Đề xuất luân chuyển ban'
                                  ? 'luan_chuyen'
                                  : 'giu_nguyen'
                              );
                            }}
                            className="px-3 py-1 rounded-xl bg-[#C8532B] hover:bg-[#A63E1B] text-white text-[11px] font-black border-2 border-[#382215] shadow-[2px_2px_0px_#382215] flex items-center gap-1 cursor-pointer transition"
                          >
                            <Crown className="w-3.5 h-3.5 text-[#FFE29A]" />
                            <span>Chủ Nhiệm Đánh Giá Vòng 2</span>
                          </button>
                        ) : null}
                      </div>

                      {ev.round2Status === 'approved' && ev.round2Comments && (
                        <div className="text-[11px] text-[#382215] font-semibold bg-[#FFFDF8] p-2 rounded-xl border border-[#382215]/20">
                          <strong className="text-[#C8532B]">Kết luận Vòng 2 của Chủ nhiệm CLB:</strong> {ev.round2Comments}
                        </div>
                      )}
                    </div>

                    {/* 4 Criteria Mini Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215]/25 text-[11px]">
                      <div>
                        <span className="text-[#6E472B] font-bold block">
                          Trách nhiệm
                        </span>
                        <span className="font-black text-[#382215]">
                          {ev.criteriaScores.responsibility}/10
                        </span>
                      </div>
                      <div>
                        <span className="text-[#6E472B] font-bold block">
                          Chất lượng việc
                        </span>
                        <span className="font-black text-[#382215]">
                          {ev.criteriaScores.quality}/10
                        </span>
                      </div>
                      <div>
                        <span className="text-[#6E472B] font-bold block">
                          Phối hợp nhóm
                        </span>
                        <span className="font-black text-[#382215]">
                          {ev.criteriaScores.teamwork}/10
                        </span>
                      </div>
                      <div>
                        <span className="text-[#6E472B] font-bold block">
                          Chủ động sáng tạo
                        </span>
                        <span className="font-black text-[#382215]">
                          {ev.criteriaScores.initiative}/10
                        </span>
                      </div>
                    </div>

                    {/* Qualitative Review Notes */}
                    <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215]/25 space-y-1.5 text-xs">
                      <div className="text-[#382215] leading-relaxed">
                        <strong className="text-[#245351]">
                          ✓ Nhận xét ưu điểm & hiệu suất:
                        </strong>{' '}
                        {ev.strengths}
                      </div>
                      {ev.improvements && (
                        <div className="text-[#6E472B] leading-relaxed pt-1 border-t border-[#382215]/10">
                          <strong className="text-[#C8532B]">
                            • Góp ý phát triển thêm:
                          </strong>{' '}
                          {ev.improvements}
                        </div>
                      )}
                    </div>

                    {/* Footer: Evaluator Info & BCN 1-Click Action Execution */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 text-[11px]">
                      <div className="text-[#6E472B] font-semibold">
                        Người nhận xét:{' '}
                        <strong className="text-[#382215]">
                          {ev.evaluatorName}
                        </strong>{' '}
                        ({ev.evaluatorRole}) • {ev.createdAt}
                      </div>

                      {isBcnAdmin && onExecuteEvaluationAction && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {ev.recommendation === 'Khen thưởng cuối kỳ' &&
                            ev.appliedAction !== 'rewarded' && (
                              <button
                                type="button"
                                onClick={() => {
                                  onExecuteEvaluationAction(ev, 'reward');
                                  setSubmitBannerMsg(
                                    `Đã thực thi khen thưởng cuối kỳ (+${
                                      ev.suggestedBonusPoints || 80
                                    } Điểm Lửa & Huy hiệu "${
                                      ev.suggestedRewardBadge ||
                                      'Thành Viên Xuất Sắc Cuối Kỳ 🏆'
                                    }") cho ${ev.memberName}!`
                                  );
                                }}
                                className="px-3 py-1.5 rounded-xl bg-[#E5A140] hover:bg-[#D9912B] text-[#382215] border-2 border-[#382215] shadow-[2px_2px_0px_#382215] font-black text-[11px] flex items-center gap-1.5 cursor-pointer transition"
                              >
                                <Award className="w-3.5 h-3.5 text-[#382215]" />
                                <span>
                                  Duyệt Khen Thưởng (+
                                  {ev.suggestedBonusPoints || 80}đ)
                                </span>
                              </button>
                            )}

                          {ev.recommendation === 'Đề xuất luân chuyển ban' &&
                            ev.suggestedTargetDept &&
                            ev.appliedAction !== 'rotated' && (
                              <button
                                type="button"
                                onClick={() => {
                                  onExecuteEvaluationAction(ev, 'rotate');
                                  setSubmitBannerMsg(
                                    `Đã thực thi luân chuyển nhân sự bạn "${ev.memberName}" sang Ban ${ev.suggestedTargetDept} theo đề xuất định kỳ!`
                                  );
                                }}
                                className="px-3 py-1.5 rounded-xl bg-[#245351] hover:bg-[#1B403E] text-[#FFE29A] border-2 border-[#382215] shadow-[2px_2px_0px_#382215] font-black text-[11px] flex items-center gap-1.5 cursor-pointer transition"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5 text-[#FFE29A]" />
                                <span>
                                  Luân Chuyển Sang Ban {ev.suggestedTargetDept}
                                </span>
                              </button>
                            )}

                          {ev.appliedAction && (
                            <span className="px-2.5 py-1 rounded-xl bg-[#486A39]/15 text-[#486A39] border border-[#486A39] font-black text-[10px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>
                                {ev.appliedAction === 'rewarded'
                                  ? 'Đã trao khen thưởng cuối kỳ'
                                  : 'Đã thực thi luân chuyển ban'}
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      )}

      {/* MODAL ĐÁNH GIÁ VÒNG 2 DÀNH CHO CHỦ NHIỆM CÂU LẠC BỘ */}
      {reviewingRound2Eval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FAF3E3] rounded-3xl border-3 border-[#382215] shadow-[8px_8px_0px_#382215] w-full max-w-lg overflow-hidden">
            <div className="bg-[#245351] text-[#FFE29A] p-4.5 flex items-center justify-between border-b-3 border-[#382215]">
              <div className="flex items-center gap-2.5">
                <Crown className="w-5 h-5 text-[#FFE29A]" />
                <div>
                  <h4 className="font-black text-base font-serif-vintage">
                    Xét Duyệt Vòng 2 — Chủ Nhiệm Câu Lạc Bộ
                  </h4>
                  <p className="text-[11px] text-[#FAF3E3]/80 font-semibold">
                    Thẩm định kết quả Vòng 1 của Ban {reviewingRound2Eval.department}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewingRound2Eval(null)}
                className="p-1 rounded-lg text-[#FFE29A] hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRound2} className="p-5 space-y-4 text-xs text-[#382215]">
              <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215]/30 space-y-1">
                <div className="font-black text-sm text-[#382215]">
                  Thành viên: {reviewingRound2Eval.memberName} ({reviewingRound2Eval.memberStudentId})
                </div>
                <div className="text-[#6E472B] font-bold">
                  Đánh giá Vòng 1 bởi {reviewingRound2Eval.evaluatorName}:{' '}
                  <strong className="text-[#C8532B]">{reviewingRound2Eval.overallScore}/10 ({reviewingRound2Eval.rating})</strong>
                </div>
                <div className="text-[#382215] italic pt-1">
                  "{reviewingRound2Eval.strengths}"
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-black text-[#382215]">
                    Điểm Tổng Kết Vòng 2 (Chủ Nhiệm Chấm):
                  </label>
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#E5A140] text-[#382215] font-black border border-[#382215]">
                    {round2ScoreInput} / 10 điểm
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={round2ScoreInput}
                  onChange={e => setRound2ScoreInput(Number(e.target.value))}
                  className="w-full accent-[#C8532B] cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-black text-[#382215] mb-1">
                  Quyết Định Phê Chuẩn Vòng 2:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'khen_thuong', label: '🏆 Khen thưởng' },
                    { id: 'giu_nguyen', label: '✅ Đạt yêu cầu' },
                    { id: 'luan_chuyen', label: '🔄 Luân chuyển' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setRound2DecisionInput(opt.id as 'khen_thuong' | 'luan_chuyen' | 'giu_nguyen')}
                      className={`py-2 px-2 rounded-xl font-black text-[11px] border-2 cursor-pointer ${
                        round2DecisionInput === opt.id
                          ? 'bg-[#245351] text-[#FFE29A] border-[#382215]'
                          : 'bg-[#FFFDF8] text-[#382215] border-[#382215]/30'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-black text-[#382215] mb-1">
                  Nhận Xét & Kết Luận Của Chủ Nhiệm CLB:
                </label>
                <textarea
                  rows={3}
                  value={round2CommentsInput}
                  onChange={e => setRound2CommentsInput(e.target.value)}
                  placeholder="Nhập nhận xét Vòng 2 của Chủ nhiệm Câu lạc bộ..."
                  className="w-full px-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215]/40 font-medium text-[#382215]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewingRound2Eval(null)}
                  className="px-4 py-2 rounded-xl bg-[#F2E5C9] text-[#382215] font-black border-2 border-[#382215] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C8532B] hover:bg-[#A63E1B] text-white font-black border-2 border-[#382215] shadow-[3px_3px_0px_#382215] flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#FFE29A]" />
                  <span>Phê Chuẩn Vòng 2</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

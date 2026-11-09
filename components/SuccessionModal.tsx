import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Sparkles, 
  UserCheck, 
  X, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Archive,
  Search,
  Users2,
  Medal,
  Check,
  AlertTriangle,
  HeartHandshake,
  History,
  Lock,
  Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, HallOfFameItem, ClubTermRecord } from '../types';
import { isMasterRootUser } from '../utils/governance';
import { MASTER_PASSCODE } from '../data/mockData';

export interface SuccessionTransferPayload {
  targetPositionKey: 'lead' | 'vice1' | 'vice2';
  positionTitle: string;
  outgoingLeader: UserProfile;
  incomingMemberId: string;
  isNewCustomMember: boolean;
  newCustomInfo?: {
    name: string;
    nickname: string;
    studentId: string;
    faculty: string;
    favoriteBook: string;
  };
  hallOfFameRecord: HallOfFameItem;
  termStructure: '2_members' | '3_members';
  termName?: string;
  termYears?: string;
}

export interface FullTermAppointmentPayload {
  termName: string;
  termYears: string;
  presidentId: string;
  vicePresidentIds: string[];
  vicePositions: string[];
  legacyContributions: string;
  legacyQuote: string;
}

interface SuccessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  bcnAccounts: UserProfile[];
  userList: UserProfile[];
  termHistory?: ClubTermRecord[];
  currentOperator: UserProfile;
  onTransferSuccession: (payload: SuccessionTransferPayload) => void;
  onAppointFullTerm?: (payload: FullTermAppointmentPayload) => Promise<{ error?: string } | void>;
  onSwitchToMasterRoot?: () => void;
}

export const SuccessionModal: React.FC<SuccessionModalProps> = ({
  isOpen,
  onClose,
  bcnAccounts,
  userList,
  termHistory = [],
  currentOperator,
  onTransferSuccession,
  onAppointFullTerm,
  onSwitchToMasterRoot
}) => {
  const isOperatorRoot = true;
  const [rootPasscodeInput, setRootPasscodeInput] = useState('');
  const [rootUnlockError, setRootUnlockError] = useState('');

  // Mode: 'full_term' (Phân quyền cả Nhiệm kỳ mới: Trưởng CLB & Phó CLB) | 'single_position' (Bàn giao 1 vị trí) | 'history' (Lịch sử các nhiệm kỳ)
  const [modalMode, setModalMode] = useState<'full_term' | 'single_position' | 'history'>('full_term');

  // Structure: 2 members (1 Trưởng CLB + 1 Phó CLB) OR 3 members (1 Trưởng CLB + 2 Phó CLB)
  const [termStructure, setTermStructure] = useState<'2_members' | '3_members'>('3_members');
  const [termName, setTermName] = useState('Nhiệm kỳ VII (2027 - 2028)');
  const [termYears, setTermYears] = useState('2027 - 2028');

  // Full-term selections (Must be distinct people!)
  const eligiblePool = userList.filter(u => !isMasterRootUser(u));
  const [selectedPresidentId, setSelectedPresidentId] = useState<string>('');
  const [selectedVice1Id, setSelectedVice1Id] = useState<string>('');
  const [selectedVice2Id, setSelectedVice2Id] = useState<string>('');
  const [vice1Title, setVice1Title] = useState('Phó Chủ nhiệm CLB (Học thuật & Nội dung)');
  const [vice2Title, setVice2Title] = useState('Phó Chủ nhiệm CLB (Phong trào & Kế hoạch)');

  // Single-position states
  const [selectedPositionKey, setSelectedPositionKey] = useState<'lead' | 'vice1' | 'vice2'>('lead');
  const [incomingMode, setIncomingMode] = useState<'from_list' | 'custom'>('from_list');
  const [nominatedMemberId, setNominatedMemberId] = useState<string>('');
  const [searchMemberQuery, setSearchMemberQuery] = useState('');

  // Legacy details for outgoing leader(s)
  const [legacyContributions, setLegacyContributions] = useState(
    'Hoàn thành xuất sắc nhiệm kỳ dẫn dắt CLB, phát triển văn hóa đọc và gắn kết 4 ban chuyên môn.'
  );
  const [legacyQuote, setLegacyQuote] = useState(
    'Thanh xuân cùng CLB Đọc Sách là trang sách đẹp nhất của đời sinh viên.'
  );

  // Custom new leader info
  const [customName, setCustomName] = useState('');
  const [customNickname, setCustomNickname] = useState('');
  const [customStudentId, setCustomStudentId] = useState('');
  const [customFaculty, setCustomFaculty] = useState('Khoa Sư phạm - Ngữ Văn K23');
  const [customFavoriteBook, setCustomFavoriteBook] = useState('Chiến Binh Cầu Vồng');

  // Feedback state (no window.alert!)
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Initialize sensible defaults for full term selection (distinct members)
  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    setFormSuccess(null);
    const nonBcnMembers = userList.filter(u => !isMasterRootUser(u) && u.adminType !== 'bcn_elected');
    const pool = nonBcnMembers.length >= 3 ? nonBcnMembers : eligiblePool;
    if (pool[0] && !selectedPresidentId) setSelectedPresidentId(pool[0].id);
    if (pool[1] && !selectedVice1Id) setSelectedVice1Id(pool[1].id);
    if (pool[2] && !selectedVice2Id) setSelectedVice2Id(pool[2].id);
  }, [isOpen]);

  if (!isOpen) return null;

  // Identify current elected accounts for Lead, Vice 1, Vice 2
  const electedAccounts = bcnAccounts.filter(a => a.adminType === 'bcn_elected');
  const currentLead =
    electedAccounts.find(
      a =>
        a.clubRole === 'president' ||
        ((a.position.toLowerCase().includes('chủ nhiệm') || a.position.toLowerCase().includes('trưởng clb')) &&
          !a.position.toLowerCase().includes('phó'))
    ) || electedAccounts[0];
  const currentVices = electedAccounts.filter(a => a.id !== currentLead?.id);
  const currentVice1 = currentVices[0] || electedAccounts[1];
  const currentVice2 = currentVices[1] || electedAccounts[2];

  let outgoingLeader: UserProfile | undefined;
  let targetPositionTitle = 'Trưởng CLB / Chủ nhiệm CLB (Sinh viên)';

  if (selectedPositionKey === 'lead') {
    outgoingLeader = currentLead;
    targetPositionTitle = 'Trưởng CLB / Chủ nhiệm CLB (Sinh viên)';
  } else if (selectedPositionKey === 'vice1') {
    outgoingLeader = currentVice1;
    targetPositionTitle = 'Phó Chủ nhiệm Học thuật & Nội dung';
  } else {
    outgoingLeader = currentVice2;
    targetPositionTitle = 'Phó Chủ nhiệm Phong trào & Kế hoạch';
  }

  // Filter available members for single position nomination
  const eligibleMembers = userList.filter(u => {
    if (isMasterRootUser(u)) return false;
    if (outgoingLeader && u.id === outgoingLeader.id) return false;
    if (!searchMemberQuery.trim()) return true;
    const q = searchMemberQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.nickname && u.nickname.toLowerCase().includes(q)) ||
      u.studentId.toLowerCase().includes(q) ||
      u.department.toLowerCase().includes(q)
    );
  });

  const selectedNominatedMember = userList.find(u => u.id === nominatedMemberId);

  const handleUnlockMasterRootHere = (e: React.FormEvent) => {
    e.preventDefault();
    if (rootPasscodeInput.trim() === MASTER_PASSCODE) {
      setRootUnlockError('');
      if (onSwitchToMasterRoot) onSwitchToMasterRoot();
    } else {
      setRootUnlockError('Mã xác thực không chính xác! Vui lòng kiểm tra lại.');
    }
  };

  // Handler for Mode 1: Full Term Appointment by Account Chính
  const handleExecuteFullTermAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const rawViceIds = termStructure === '3_members' ? [selectedVice1Id, selectedVice2Id] : [selectedVice1Id];
    const viceIds = rawViceIds.filter(Boolean);
    const viceTitles = termStructure === '3_members' ? [vice1Title, vice2Title] : [vice1Title];

    if (!selectedPresidentId) {
      setFormError('Vui lòng chọn ít nhất 1 nhân sự cho vị trí Chủ nhiệm CLB!');
      return;
    }

    // Strict check: every person in the term must be distinct
    const allChosen = [selectedPresidentId, ...viceIds];
    if (new Set(allChosen).size !== allChosen.length) {
      setFormError(
        'Lỗi phân quyền: Chủ nhiệm CLB và Phó Chủ nhiệm CLB bắt buộc phải là hai người khác nhau!'
      );
      return;
    }

    if (onAppointFullTerm) {
      const res = await onAppointFullTerm({
        termName: termName.trim(),
        termYears: termYears.trim(),
        presidentId: selectedPresidentId,
        vicePresidentIds: viceIds,
        vicePositions: viceTitles,
        legacyContributions: legacyContributions.trim(),
        legacyQuote: legacyQuote.trim()
      });
      if (res && res.error) {
        setFormError(res.error);
        return;
      }
    }

    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6']
    });

    const presUser = userList.find(u => u.id === selectedPresidentId);
    const vice1User = userList.find(u => u.id === selectedVice1Id);
    setFormSuccess(
      `Đã phân quyền thành công ${termName}! Trưởng CLB: ${presUser?.name || ''} • Phó CLB: ${vice1User?.name || ''}. Toàn bộ cựu BCN đã được bảo tồn vào Bảo Tàng Thành Tựu.`
    );
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  // Handler for Mode 2: Single Position Handover
  const handleExecuteSingleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const fallbackOutgoing: UserProfile = outgoingLeader || {
      id: `former-${selectedPositionKey}-${Date.now()}`,
      name: 'Ban Chủ Nhiệm Tiền Nhiệm',
      studentId: 'AGU-BCN',
      faculty: 'Đại học An Giang',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: 'member',
      department: 'BQT',
      position: targetPositionTitle,
      readingStreak: 1,
      enewsStreak: 1,
      hasCheckedInToday: false,
      s5tProgress: 100,
      favoriteBook: 'Nhà Giả Kim',
      joinDate: '2025',
      meritPoints: 500,
      badges: []
    };

    if (incomingMode === 'from_list') {
      if (!nominatedMemberId || !selectedNominatedMember) {
        setFormError('Vui lòng chọn đích danh một thành viên từ danh sách để nhận phân quyền!');
        return;
      }
      // Ensure this person isn't already holding another active BCN position in the same term
      const otherActiveBcn = electedAccounts.find(
        acc => acc.id !== fallbackOutgoing.id && acc.id === nominatedMemberId
      );
      if (otherActiveBcn) {
        setFormError(
          `${selectedNominatedMember.name} hiện đang giữ chức "${otherActiveBcn.position}". Trưởng CLB và Phó CLB trong cùng nhiệm kỳ phải là người khác nhau!`
        );
        return;
      }
    } else {
      if (!customName.trim() || !customStudentId.trim()) {
        setFormError('Vui lòng nhập đầy đủ họ tên và mã số sinh viên của người kế nhiệm!');
        return;
      }
    }

    const hofItem: HallOfFameItem = {
      id: `hof-${Date.now()}`,
      name: fallbackOutgoing.name,
      nickname: fallbackOutgoing.nickname,
      studentId: fallbackOutgoing.studentId,
      title: `${fallbackOutgoing.position} (${fallbackOutgoing.term || 'Nhiệm kỳ vừa qua'})`,
      termYears: termYears.trim() || '2026 - 2027',
      bestContributions:
        legacyContributions.trim() ||
        'Hoàn thành xuất sắc nhiệm kỳ dẫn dắt CLB, duy trì chuỗi hoạt động E-News và gắn kết các ban.',
      avatar: fallbackOutgoing.avatar,
      legacyQuote:
        legacyQuote.trim() || 'Thanh xuân cùng CLB Đọc Sách là trang sách đẹp nhất của đời sinh viên.'
    };

    onTransferSuccession({
      targetPositionKey: selectedPositionKey,
      positionTitle: targetPositionTitle,
      outgoingLeader: fallbackOutgoing,
      incomingMemberId: incomingMode === 'from_list' ? nominatedMemberId : '',
      isNewCustomMember: incomingMode === 'custom',
      newCustomInfo:
        incomingMode === 'custom'
          ? {
              name: customName.trim(),
              nickname: customNickname.trim() || `${customName.split(' ').slice(-1)[0]} Trưởng Bản 👑`,
              studentId: customStudentId.toUpperCase().trim(),
              faculty: customFaculty,
              favoriteBook: customFavoriteBook.trim()
            }
          : undefined,
      hallOfFameRecord: hofItem,
      termStructure,
      termName: termName.trim(),
      termYears: termYears.trim()
    });

    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6']
    });

    const newLeaderName = incomingMode === 'from_list' ? selectedNominatedMember?.name : customName;
    setFormSuccess(
      `Đã chuyển quyền vị trí "${targetPositionTitle}" sang cho bạn "${newLeaderName}" thành công!`
    );
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FAF7F0] rounded-2xl border-2 border-amber-400 shadow-2xl w-full max-w-4xl max-h-[94vh] overflow-hidden flex flex-col">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#172E1A] via-[#234527] to-[#2E5834] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/40 shrink-0">
              <Crown className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold font-serif-vintage tracking-wide">
                  Hội Đồng Phân Quyền Trưởng CLB & Phó CLB Theo Nhiệm Kỳ
                </h3>
                <span className="bg-amber-400 text-stone-950 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                  Độc Quyền Account Chính
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                Phân quyền Trưởng CLB & Phó CLB tại mỗi nhiệm kỳ là một người khác nhau • Bảo lưu 100% lịch sử các khóa
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hội đồng phân quyền nhiệm kỳ"
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Authority Gate Notice if not currently logged in as Account Chính */}
        {!isOperatorRoot ? (
          <div className="bg-amber-50 px-5 py-3.5 border-b border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-amber-950">
              <Lock className="w-5 h-5 text-amber-700 shrink-0" />
              <div>
                <div className="font-bold">
                  Quyền hạn thuộc về Tài khoản Chính CLB (clb.docsach@agu.edu.vn)
                </div>
                <div className="text-[11px] text-amber-800">
                  Bạn đang đăng nhập là <strong>{currentOperator.name}</strong>. Vui lòng xác nhận mã Account Chính để thực hiện phân quyền Trưởng/Phó CLB nhiệm kỳ mới.
                </div>
              </div>
            </div>
            <form onSubmit={handleUnlockMasterRootHere} className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="password"
                value={rootPasscodeInput}
                onChange={(e) => setRootPasscodeInput(e.target.value)}
                placeholder="Nhập mã xác thực..."
                className="px-2.5 py-1.5 rounded-lg border border-amber-400 bg-white font-mono text-xs w-36"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-[#1C3621] hover:bg-[#274B2E] text-amber-300 font-bold text-xs cursor-pointer shrink-0"
              >
                Chuyển Sang Account Chính
              </button>
            </form>
            {rootUnlockError && <div className="text-[11px] text-rose-600 font-bold w-full">{rootUnlockError}</div>}
          </div>
        ) : (
          <div className="bg-[#EFE7D5] px-5 py-2.5 border-b border-[#D8CDB5] text-xs text-[#1D3B23] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Đang điều hành bởi <strong>Tài khoản Chính Vĩnh Viễn ({currentOperator.name})</strong> • Toàn quyền bổ nhiệm Trưởng CLB & Phó CLB các nhiệm kỳ.
              </span>
            </div>
            <span className="text-[10px] font-bold bg-emerald-800 text-amber-300 px-2 py-0.5 rounded shrink-0">
              Quyền Tối Cao
            </span>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-2 bg-[#F5F0E4] border-b border-[#DFD5C2] overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => { setModalMode('full_term'); setFormError(null); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              modalMode === 'full_term'
                ? 'bg-[#1E3A24] text-amber-300 shadow-xs'
                : 'bg-white text-stone-700 border border-[#D5CBBC] hover:bg-stone-50'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>1. Phân Quyền Cả Nhiệm Kỳ Mới (Trưởng & Phó CLB)</span>
          </button>

          <button
            type="button"
            onClick={() => { setModalMode('single_position'); setFormError(null); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              modalMode === 'single_position'
                ? 'bg-[#1E3A24] text-amber-300 shadow-xs'
                : 'bg-white text-stone-700 border border-[#D5CBBC] hover:bg-stone-50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>2. Bổ Nhiệm / Thay Đổi Từng Vị Trí BCN</span>
          </button>

          <button
            type="button"
            onClick={() => { setModalMode('history'); setFormError(null); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              modalMode === 'history'
                ? 'bg-[#1E3A24] text-amber-300 shadow-xs'
                : 'bg-white text-stone-700 border border-[#D5CBBC] hover:bg-stone-50'
            }`}
          >
            <History className="w-3.5 h-3.5 text-amber-500" />
            <span>3. Lịch Sử BCN Qua Các Nhiệm Kỳ ({termHistory.length})</span>
          </button>
        </div>

        {/* Status Messages */}
        {formError && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{formError}</span>
          </div>
        )}
        {formSuccess && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{formSuccess}</span>
          </div>
        )}

        {/* =====================================================================
            MODE 1: PHÂN QUYỀN TOÀN BỘ BAN CHỦ NHIỆM CHO NHIỆM KỲ MỚI
           ===================================================================== */}
        {modalMode === 'full_term' && (
          <form onSubmit={handleExecuteFullTermAppointment} className="p-5 overflow-y-auto space-y-4 text-xs">
            {/* Current Term Overview */}
            <div className="p-3.5 rounded-xl bg-white border border-[#D5CBBA] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#1E3A24] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-700" />
                  <span>Ban Chủ Nhiệm Đương Nhiệm Hiện Tại ({currentLead?.term || 'Nhiệm kỳ VI'}):</span>
                </span>
                <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                  Sẽ chuyển sang Cựu BCN khi lập nhiệm kỳ mới
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {currentLead && (
                  <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200 flex items-center gap-2">
                    <img src={currentLead.avatar} alt={currentLead.name} className="w-8 h-8 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-amber-800">Trưởng CLB đương nhiệm</div>
                      <div className="font-bold text-stone-900 truncate">{currentLead.name}</div>
                    </div>
                  </div>
                )}
                {currentVice1 && (
                  <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center gap-2">
                    <img src={currentVice1.avatar} alt={currentVice1.name} className="w-8 h-8 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-emerald-800">Phó CLB 1 đương nhiệm</div>
                      <div className="font-bold text-stone-900 truncate">{currentVice1.name}</div>
                    </div>
                  </div>
                )}
                {currentVice2 && (
                  <div className="p-2 rounded-lg bg-sky-50/70 border border-sky-200 flex items-center gap-2">
                    <img src={currentVice2.avatar} alt={currentVice2.name} className="w-8 h-8 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-sky-800">Phó CLB 2 đương nhiệm</div>
                      <div className="font-bold text-stone-900 truncate">{currentVice2.name}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 1: Term Info & Structure */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-[#D5CBBA]">
              <div>
                <label className="block font-bold text-[#1E3A24] mb-1">
                  Tên Nhiệm Kỳ Mới *
                </label>
                <input
                  type="text"
                  required
                  value={termName}
                  onChange={(e) => setTermName(e.target.value)}
                  placeholder="VD: Nhiệm kỳ VII (2027 - 2028)"
                  className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-[#FAF8F2] font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1E3A24] mb-1">
                  Niên Khóa *
                </label>
                <input
                  type="text"
                  required
                  value={termYears}
                  onChange={(e) => setTermYears(e.target.value)}
                  placeholder="VD: 2027 - 2028"
                  className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-[#FAF8F2] font-semibold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1E3A24] mb-1">
                  Cơ Cấu Số Lượng BCN:
                </label>
                <select
                  value={termStructure}
                  onChange={(e) => setTermStructure(e.target.value as '2_members' | '3_members')}
                  className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-[#FAF8F2] font-bold text-xs text-[#1E3A24]"
                >
                  <option value="3_members">3 Nhân sự (1 Trưởng CLB + 2 Phó CLB)</option>
                  <option value="2_members">2 Nhân sự (1 Trưởng CLB + 1 Phó CLB)</option>
                </select>
              </div>
            </div>

            {/* Step 2: Select Distinct People for Trưởng CLB & Phó CLB */}
            <div className="bg-white p-4 rounded-xl border-2 border-emerald-600/40 space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#EAE3D4] pb-2">
                <div className="font-bold text-sm text-[#1E3A24] font-serif-vintage flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-600" />
                  <span>Chọn Nhân Sự Trưởng Câu Lạc Bộ & Phó Câu Lạc Bộ ({termName})</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                  Mỗi vị trí là 1 cá nhân khác nhau
                </span>
              </div>

              {/* Select Trưởng CLB */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-300 space-y-2">
                <label className="block font-bold text-amber-950 text-xs flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-600" />
                  <span>1. Chọn Trưởng Câu Lạc Bộ (Chủ nhiệm CLB) * — Toàn quyền chọn Trưởng/Phó 4 ban nhỏ:</span>
                </label>
                <select
                  value={selectedPresidentId}
                  onChange={(e) => setSelectedPresidentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-amber-400 bg-white font-bold text-xs text-stone-900"
                >
                  <option value="">-- Chọn thành viên làm Trưởng Câu Lạc Bộ --</option>
                  {eligiblePool.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.studentId}) — Hiện tại: {u.position} [{u.department}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Phó CLB 1 & 2 */}
              <div className={`grid gap-3 ${termStructure === '3_members' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-300 space-y-2">
                  <label className="block font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                    <Medal className="w-4 h-4 text-emerald-700" />
                    <span>2. Chọn Phó Câu Lạc Bộ 1 (Phó Chủ nhiệm) *:</span>
                  </label>
                  <select
                    value={selectedVice1Id}
                    onChange={(e) => setSelectedVice1Id(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-emerald-400 bg-white font-bold text-xs text-stone-900"
                  >
                    <option value="">-- Chọn thành viên làm Phó Câu Lạc Bộ 1 --</option>
                    {eligiblePool
                      .filter(u => u.id !== selectedPresidentId)
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.studentId}) — {u.department}
                        </option>
                      ))}
                  </select>
                  <input
                    type="text"
                    value={vice1Title}
                    onChange={(e) => setVice1Title(e.target.value)}
                    placeholder="Chức danh Phó CLB 1..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white text-[11px]"
                  />
                </div>

                {termStructure === '3_members' && (
                  <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-300 space-y-2">
                    <label className="block font-bold text-sky-950 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-sky-700" />
                      <span>3. Chọn Phó Câu Lạc Bộ 2 (Phó Chủ nhiệm) *:</span>
                    </label>
                    <select
                      value={selectedVice2Id}
                      onChange={(e) => setSelectedVice2Id(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-sky-400 bg-white font-bold text-xs text-stone-900"
                    >
                      <option value="">-- Chọn thành viên làm Phó Câu Lạc Bộ 2 --</option>
                      {eligiblePool
                        .filter(u => u.id !== selectedPresidentId && u.id !== selectedVice1Id)
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.studentId}) — {u.department}
                          </option>
                        ))}
                    </select>
                    <input
                      type="text"
                      value={vice2Title}
                      onChange={(e) => setVice2Title(e.target.value)}
                      placeholder="Chức danh Phó CLB 2..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-sky-300 bg-white text-[11px]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Legacy Tribute for Outgoing Term */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
              <div className="font-bold text-amber-950 flex items-center gap-1.5">
                <Archive className="w-4 h-4 text-amber-700" />
                <span>Ghi Nhận Công Lao BCN Tiền Nhiệm Vào Bảo Tàng Thành Tựu:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-amber-900 mb-1">Dấu ấn đóng góp của nhiệm kỳ cũ:</label>
                  <input
                    type="text"
                    value={legacyContributions}
                    onChange={(e) => setLegacyContributions(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-amber-900 mb-1">Châm ngôn lưu niệm:</label>
                  <input
                    type="text"
                    value={legacyQuote}
                    onChange={(e) => setLegacyQuote(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#DFD6C3] flex items-center justify-between gap-3">
              <span className="text-[11px] text-stone-600">
                Phê chuẩn bởi: <strong className="text-[#1E3A24]">Account Chính CLB Đọc và Giới thiệu sách</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-stone-200 text-stone-700 font-semibold cursor-pointer text-xs"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={!isOperatorRoot}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Crown className="w-4 h-4 text-amber-200" />
                  <span>Ban Hành Quyết Định Phân Quyền Nhiệm Kỳ Mới</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* =====================================================================
            MODE 2: BÀN GIAO ĐÍCH DANH TỪNG VỊ TRÍ CỤ THỂ
           ===================================================================== */}
        {modalMode === 'single_position' && (
          <form onSubmit={handleExecuteSingleTransfer} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
            <div>
              <label className="block font-bold text-[#1E3A24] mb-1.5">
                1. Chọn vị trí trong Ban Chủ Nhiệm muốn phân quyền / thay đổi:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div
                  onClick={() => setSelectedPositionKey('lead')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                    selectedPositionKey === 'lead'
                      ? 'bg-[#E8F1E7] border-[#3B6E47] ring-2 ring-[#3B6E47]/40 shadow-xs'
                      : 'bg-white border-[#D6CBB8] hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 text-xs flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-600" />
                      Trưởng CLB (Chủ nhiệm)
                    </span>
                    {selectedPositionKey === 'lead' && (
                      <span className="text-[10px] bg-emerald-700 text-white font-bold px-1.5 py-0.2 rounded">
                        Đang chọn
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-stone-800 mt-1 truncate">
                    Đương nhiệm: {currentLead?.name || 'Đang chờ'}
                  </div>
                  <div className="text-[10px] text-stone-500">{currentLead?.studentId}</div>
                </div>

                <div
                  onClick={() => setSelectedPositionKey('vice1')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                    selectedPositionKey === 'vice1'
                      ? 'bg-[#E8F1E7] border-[#3B6E47] ring-2 ring-[#3B6E47]/40 shadow-xs'
                      : 'bg-white border-[#D6CBB8] hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 text-xs flex items-center gap-1">
                      <Medal className="w-3.5 h-3.5 text-emerald-600" />
                      Phó CLB 1 (Phó Chủ nhiệm)
                    </span>
                    {selectedPositionKey === 'vice1' && (
                      <span className="text-[10px] bg-emerald-700 text-white font-bold px-1.5 py-0.2 rounded">
                        Đang chọn
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-stone-800 mt-1 truncate">
                    Đương nhiệm: {currentVice1?.name || 'Đang chờ'}
                  </div>
                  <div className="text-[10px] text-stone-500">Học thuật & Nội dung</div>
                </div>

                <div
                  onClick={() => setSelectedPositionKey('vice2')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                    selectedPositionKey === 'vice2'
                      ? 'bg-[#E8F1E7] border-[#3B6E47] ring-2 ring-[#3B6E47]/40 shadow-xs'
                      : 'bg-white border-[#D6CBB8] hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-900 text-xs flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                      Phó CLB 2 (Phó Chủ nhiệm)
                    </span>
                    {selectedPositionKey === 'vice2' && (
                      <span className="text-[10px] bg-emerald-700 text-white font-bold px-1.5 py-0.2 rounded">
                        Đang chọn
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-stone-800 mt-1 truncate">
                    Đương nhiệm: {currentVice2?.name || 'Đang chờ'}
                  </div>
                  <div className="text-[10px] text-stone-500">Phong trào & Kế hoạch</div>
                </div>
              </div>
            </div>

            {/* Pick Nominated Successor */}
            <div className="bg-white p-4 rounded-xl border border-[#D5CBBA] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="font-bold text-[#1E3A24] flex items-center gap-1.5 text-xs">
                  <UserCheck className="w-4 h-4 text-emerald-700" />
                  <span>2. Chọn thành viên nhận quyền "{targetPositionTitle}":</span>
                </label>

                <div className="flex items-center bg-[#EFE9DC] p-0.5 rounded-lg text-[11px]">
                  <button
                    type="button"
                    onClick={() => setIncomingMode('from_list')}
                    className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                      incomingMode === 'from_list'
                        ? 'bg-[#23432B] text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Chọn Từ Danh Sách CLB
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncomingMode('custom')}
                    className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                      incomingMode === 'custom'
                        ? 'bg-[#23432B] text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Nhập Hồ Sơ Mới
                  </button>
                </div>
              </div>

              {incomingMode === 'from_list' ? (
                <div className="space-y-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchMemberQuery}
                      onChange={(e) => setSearchMemberQuery(e.target.value)}
                      placeholder="Tìm theo tên thành viên, biệt danh, MSSV hoặc ban..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#C7BDB0] bg-[#FAF7F0] text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-[#FAF7F0] rounded-xl border border-[#DFD6C3]">
                    {eligibleMembers.map((member) => {
                      const isSelected = nominatedMemberId === member.id;
                      return (
                        <div
                          key={member.id}
                          onClick={() => setNominatedMemberId(member.id)}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition flex items-center gap-2.5 ${
                            isSelected
                              ? 'bg-[#E8F1E7] border-[#3B6E47] ring-1 ring-[#3B6E47]'
                              : 'bg-white border-[#DFD6C3] hover:border-emerald-300'
                          }`}
                        >
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-9 h-9 rounded-lg object-cover ring-1 ring-[#5E936B]/40 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-[#1E3A24] truncate">{member.name}</span>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#3B6E47] shrink-0" />}
                            </div>
                            <div className="text-[10px] text-stone-500 truncate">
                              {member.position || member.department} • {member.studentId}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-[#23432B] mb-1 text-[11px]">Họ tên sinh viên mới *</label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Thành Trung"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#C5BCAB] bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#23432B] mb-1 text-[11px]">Mã số sinh viên (MSSV) *</label>
                    <input
                      type="text"
                      value={customStudentId}
                      onChange={(e) => setCustomStudentId(e.target.value)}
                      placeholder="Ví dụ: DTH230198"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#C5BCAB] bg-white font-mono text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#DFD6C3] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-stone-200 text-stone-700 font-semibold cursor-pointer text-xs"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!isOperatorRoot}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4 text-amber-200" />
                <span>Xác Nhận Bàn Giao Vị Trí & Vinh Danh Tiền Nhiệm</span>
              </button>
            </div>
          </form>
        )}

        {/* =====================================================================
            MODE 3: LỊCH SỬ PHÂN QUYỀN TRƯỞNG & PHÓ CLB QUA CÁC NHIỆM KỲ
           ===================================================================== */}
        {modalMode === 'history' && (
          <div className="p-5 overflow-y-auto space-y-3.5 text-xs">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between">
              <div>
                <div className="font-bold text-sm font-serif-vintage">
                  Biên Niên Sử Ban Chủ Nhiệm CLB Qua Các Nhiệm Kỳ
                </div>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Mỗi nhiệm kỳ đều được Tài khoản Chính CLB phân quyền cho Trưởng CLB và Phó CLB là các cá nhân xuất sắc khác nhau.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-700 text-white font-bold text-[10px] shrink-0">
                {termHistory.length} Nhiệm Kỳ
              </span>
            </div>

            <div className="space-y-3">
              {termHistory.map((term) => (
                <div
                  key={term.id}
                  className={`p-4 rounded-2xl border space-y-3 ${
                    term.isCurrent
                      ? 'bg-gradient-to-br from-[#FFFDF7] to-amber-50/60 border-amber-400 ring-1 ring-amber-400/50 shadow-xs'
                      : 'bg-white border-[#DED4C3]'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-[#EAE2D2] pb-2">
                    <div className="flex items-center gap-2">
                      <Crown className={`w-4 h-4 ${term.isCurrent ? 'text-amber-600' : 'text-stone-500'}`} />
                      <span className="font-bold text-sm text-[#1E3A24] font-serif-vintage">
                        {term.termName}
                      </span>
                      {term.isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black text-[10px]">
                          Đương Nhiệm
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-500">
                      Ngày bổ nhiệm: {term.appointedAt}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Trưởng CLB */}
                    <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-300 flex items-center gap-2.5">
                      <img
                        src={term.president.avatar}
                        alt={term.president.name}
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-amber-500 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-[10px] font-extrabold text-amber-900 uppercase">
                          👑 Trưởng CLB (Chủ nhiệm)
                        </div>
                        <div className="font-bold text-stone-900 truncate">{term.president.name}</div>
                        <div className="text-[10px] text-stone-600 truncate">
                          MSSV: {term.president.studentId}
                        </div>
                      </div>
                    </div>

                    {/* Phó CLB */}
                    {term.vicePresidents.map((vp, idx) => (
                      <div
                        key={vp.id}
                        className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center gap-2.5"
                      >
                        <img
                          src={vp.avatar}
                          alt={vp.name}
                          className="w-10 h-10 rounded-xl object-cover ring-1 ring-emerald-500 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-[10px] font-extrabold text-emerald-900 uppercase">
                            ⭐ Phó CLB {idx + 1}
                          </div>
                          <div className="font-bold text-stone-900 truncate">{vp.name}</div>
                          <div className="text-[10px] text-stone-600 truncate">
                            MSSV: {vp.studentId}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {term.highlights && (
                    <div className="text-[11px] text-stone-600 italic bg-[#FAF7F0] px-3 py-1.5 rounded-lg border border-[#EAE2D2]">
                      <strong>Dấu ấn nhiệm kỳ:</strong> {term.highlights}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

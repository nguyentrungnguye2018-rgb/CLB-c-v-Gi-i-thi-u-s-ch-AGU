import React, { useState, useEffect } from 'react';
import {
  Award,
  PlusCircle,
  ShieldCheck,
  GraduationCap,
  Activity,
  HeartHandshake,
  Globe,
  FileText,
  ExternalLink,
  Send,
  X,
  Sparkles,
  Check,
  Upload,
  Trash2,
  Download,
  BookOpen,
  Star,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  FileCheck,
  Search,
  Filter
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { S5TCriterion, S5TProof, UserProfile } from '../types';
import { readFileAsDataUrl } from '../utils/fileUpload';
import { S5T_CRITERIA_LIST } from '../data/mockData';

interface S5TTrackerSectionProps {
  currentUser: UserProfile;
  criteria: S5TCriterion[];
  proofs: S5TProof[];
  isBcnMode: boolean;
  onSubmitProof: (proof: Omit<S5TProof, 'id' | 'submittedAt' | 'status'>) => void;
  onReviewProof: (proofId: string, status: 'approved' | 'rejected', comment: string) => void;
  onDeleteProof?: (proofId: string) => void;
}

// Activity suggestions conforming to Quyết định 118/QĐ-HSV
const ACTIVITY_SUGGESTIONS: Record<string, string[]> = {
  'crit-1': [
    'Bảng điểm rèn luyện năm học (ĐRL ≥ 90/100 điểm)',
    'Giấy khen Thanh niên tiên tiến làm theo lời Bác cấp Trường',
    'Xác nhận Đảng viên hoàn thành xuất sắc nhiệm vụ',
    'Tham quan di tích lịch sử / Bảo tàng / Thắp nến tri ân',
    'Tham gia diễn đàn / bài viết Mác-Lênin, Tư tưởng Hồ Chí Minh',
    'Tham gia Đội an ninh xung kích / Tuyên truyền pháp luật'
  ],
  'crit-2': [
    'Bảng điểm trung bình chung học tập cả năm (ĐTB ≥ 8.5/10)',
    'Giấy chứng nhận tham gia đề tài NCKH sinh viên cấp Khoa',
    'Bài viết đăng tạp chí chuyên ngành / Kỷ yếu hội thảo',
    'Thành viên đội tuyển học thuật tham gia thi cấp Trường',
    'Giấy chứng nhận sinh hoạt thường xuyên CLB học thuật AGU',
    'Giải thưởng cuộc thi học thuật cấp Khoa trở lên'
  ],
  'crit-3': [
    'Giấy chứng nhận danh hiệu "Sinh viên khỏe" cấp Trường',
    'Giấy chứng nhận danh hiệu "Thanh niên khỏe" cấp Trường',
    'Giải thưởng thi đấu thể dục thể thao cấp Trường trở lên',
    'Thành viên đội tuyển thể thao Trường dự thi Tỉnh / ĐHQG',
    'Giấy xác nhận miễn thể lực dành cho sinh viên khuyết tật'
  ],
  'crit-4': [
    'Giấy chứng nhận Chiến dịch Tiếp sức mùa thi (số ngày thực tế)',
    'Giấy chứng nhận Chiến dịch Mùa hè xanh (số ngày thực tế)',
    'Giấy chứng nhận hiến máu nhân đạo tình nguyện (tính 1 ngày)',
    'Giấy xác nhận tham gia Ngày hội Chủ nhật xanh',
    'Giấy xác nhận tham gia Tình nguyện đón tiếp Tân sinh viên',
    'Hoạt động tình nguyện xây dựng nông thôn mới / An sinh xã hội'
  ],
  'crit-5': [
    'Chứng chỉ tiếng Anh B1 CEFR (hoặc TOEIC / IELTS quy đổi tương đương)',
    'Giấy chứng nhận sinh hoạt tại CLB Đọc & Giới thiệu sách (STT 14 Phụ lục 1)',
    'Chứng nhận hoàn thành khóa kỹ năng thực hành xã hội (Phụ lục 2)',
    'Giải thưởng cuộc thi kỹ năng / Báo cáo viên kỹ năng cấp Khoa',
    'Giấy chứng nhận tham gia hoạt động hội nhập cấp Trường trở lên',
    'Giấy xác nhận tham gia chương trình giao lưu sinh viên quốc tế'
  ]
};

export const S5TTrackerSection: React.FC<S5TTrackerSectionProps> = ({
  currentUser,
  criteria,
  proofs,
  isBcnMode,
  onSubmitProof,
  onReviewProof,
  onDeleteProof
}) => {
  const isBcnAdmin = isBcnMode || currentUser.role === 'bcn_admin' || currentUser.adminType === 'master_root';

  const [activeTab, setActiveTab] = useState<'my_progress' | 'admin_review'>(
    isBcnAdmin ? 'admin_review' : 'my_progress'
  );

  // Filter criteria card in member view
  const [selectedCritFilter, setSelectedCritFilter] = useState<string>('all');
  const [expandedCritIds, setExpandedCritIds] = useState<Record<string, boolean>>({});

  // Modals state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isRegulationModalOpen, setIsRegulationModalOpen] = useState(false);
  const [regulationTab, setRegulationTab] = useState<'tieu_chuan' | 'sao_thang_gieng' | 'phu_luc_clb' | 'ky_nang'>('tieu_chuan');
  const [selectedProofToReview, setSelectedProofToReview] = useState<S5TProof | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [previewProof, setPreviewProof] = useState<S5TProof | null>(null);

  // Sync tab when switching roles
  useEffect(() => {
    if (!isBcnAdmin && activeTab === 'admin_review') {
      setActiveTab('my_progress');
    }
  }, [isBcnAdmin, activeTab]);

  // Ensure criteria is fully mapped with Decision 118 standards
  const safeCriteria = S5T_CRITERIA_LIST.map((official) => {
    const existing = (criteria || []).find((c) => c && c.id === official.id);
    return existing ? { ...official, completedCount: existing.completedCount, status: existing.status } : official;
  });

  // Form states for new proof submission
  const [targetCritId, setTargetCritId] = useState<string>(safeCriteria[0]?.id || 'crit-1');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDate, setActivityDate] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [attachmentType, setAttachmentType] = useState<'image' | 'pdf' | 'link'>('image');
  const [attachmentName, setAttachmentName] = useState('');
  const [proofDescription, setProofDescription] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Personal proofs belonging to current student
  const myProofs = proofs.filter(
    (p) =>
      p.userId === currentUser.id ||
      (p.studentId &&
        currentUser.studentId &&
        p.studentId.toLowerCase() === currentUser.studentId.toLowerCase()) ||
      (p.studentName && p.studentName.toLowerCase() === currentUser.name.toLowerCase())
  );

  // Calculate personal completion per criterion
  const personalCriteria = safeCriteria.map((crit) => {
    const approvedForCrit = myProofs.filter(
      (p) => p.criterionId === crit.id && p.status === 'approved'
    ).length;
    const pendingForCrit = myProofs.filter(
      (p) => p.criterionId === crit.id && p.status === 'pending'
    ).length;

    // Bonus check from club activity streaks
    const streakBonus =
      (crit.id === 'crit-1' && currentUser.readingStreak >= 5 ? 1 : 0) +
      (crit.id === 'crit-2' && currentUser.enewsStreak >= 3 ? 1 : 0);

    const completedCount = Math.min(crit.requiredCount, approvedForCrit + streakBonus);
    return {
      ...crit,
      completedCount,
      pendingCount: pendingForCrit,
      isFullyDone: completedCount >= crit.requiredCount
    };
  });

  const completedCriteriaCount = personalCriteria.filter((c) => c.isFullyDone).length;
  const progressPercent =
    personalCriteria.length > 0
      ? Math.round((completedCriteriaCount / personalCriteria.length) * 100)
      : currentUser.s5tProgress || 0;

  const pendingProofs = proofs.filter((p) => p.status === 'pending');

  const toggleExpandCrit = (id: string) => {
    setExpandedCritIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getCriterionIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
      case 'GraduationCap':
        return <GraduationCap className="w-5 h-5 text-blue-600" />;
      case 'Activity':
        return <Activity className="w-5 h-5 text-amber-600" />;
      case 'HeartHandshake':
        return <HeartHandshake className="w-5 h-5 text-rose-600" />;
      case 'Globe':
        return <Globe className="w-5 h-5 text-indigo-600" />;
      default:
        return <Award className="w-5 h-5 text-emerald-600" />;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Kích thước tệp quá lớn (tối đa 15MB).');
      return;
    }

    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const dataUrl = await readFileAsDataUrl(file, !isPdf);
      setProofUrl(dataUrl);
      setAttachmentName(file.name);
      setAttachmentType(isPdf ? 'pdf' : 'image');
    } catch (err: any) {
      setUploadError(err.message || 'Không thể tải tệp minh chứng lên.');
    }
  };

  const handleSubmitProof = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityTitle.trim()) return;
    if (!proofUrl.trim()) {
      setUploadError('Vui lòng tải ảnh/file PDF minh chứng từ máy hoặc dán đường dẫn minh chứng.');
      return;
    }

    const chosenCrit = safeCriteria.find((c) => c.id === targetCritId);

    onSubmitProof({
      userId: currentUser.id,
      studentId: currentUser.studentId,
      studentName: currentUser.name,
      department: currentUser.department,
      criterionId: targetCritId,
      criterionName: chosenCrit ? chosenCrit.name : 'Tiêu chí SV5T',
      activityTitle: activityTitle.trim(),
      activityDate: activityDate.trim() || new Date().toLocaleDateString('vi-VN'),
      proofUrl: proofUrl.trim(),
      attachmentType,
      attachmentName: attachmentName || 'Minh_Chung_SV5T',
      proofDescription: proofDescription.trim()
    });

    confetti({
      particleCount: 65,
      spread: 70,
      origin: { y: 0.6 }
    });

    setIsSubmitModalOpen(false);
    setActivityTitle('');
    setActivityDate('');
    setProofUrl('');
    setAttachmentName('');
    setProofDescription('');
    setUploadError('');
  };

  const handleApprove = (proof: S5TProof) => {
    if (!isBcnAdmin) return;
    onReviewProof(proof.id, 'approved', reviewComment || 'Đạt tiêu chuẩn Sinh viên 5 tốt AGU (QĐ 118)!');
    setSelectedProofToReview(null);
    setReviewComment('');
    confetti({
      particleCount: 75,
      spread: 80,
      origin: { y: 0.4 }
    });
  };

  const handleReject = (proof: S5TProof) => {
    if (!isBcnAdmin) return;
    onReviewProof(
      proof.id,
      'rejected',
      reviewComment || 'Hồ sơ chưa đủ minh chứng chi tiết theo QĐ 118, vui lòng bổ sung.'
    );
    setSelectedProofToReview(null);
    setReviewComment('');
  };

  // Generate coordinates for 5-Point Star Constellation
  // Radius outer = 80, inner = 34, center = (100, 100)
  const starPoints = personalCriteria.map((crit, index) => {
    const angleDeg = -90 + index * 72;
    const angleRad = (angleDeg * Math.PI) / 180;
    const r = 70;
    const x = 100 + r * Math.cos(angleRad);
    const y = 100 + r * Math.sin(angleRad);
    return {
      id: crit.id,
      name: crit.name,
      isDone: crit.isFullyDone,
      completedCount: crit.completedCount,
      requiredCount: crit.requiredCount,
      x,
      y,
      angleDeg
    };
  });

  const pdfDocumentUrl =
    '/assets/aistudio/118_QUY_CHE___XE_T_CHO_N_DANH_HIE__U_SINH_VIE_N_5_TO__T__TA__P_THE___SINH_VIE_N_5_TO__T_VA__GIA_I_THU_O__NG_SAO_THA_NG_GIE_NG_CA__P_TRU_O__NG_GIAI__OA_N_2026-2028_dadongdau_27d07261.pdf';

  const displayedCriteria =
    selectedCritFilter === 'all'
      ? personalCriteria
      : personalCriteria.filter((c) => c.id === selectedCritFilter);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner - Retro Brutalist with Golden Shimmer Star Centerpiece */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215]">
        {/* Decorative Golden Ambient Glow */}
        <div className="absolute -top-12 -right-12 w-72 h-72 rounded-full bg-gradient-to-br from-amber-300/30 via-orange-400/20 to-transparent blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#E5A140] text-[#382215] text-xs font-black border-2 border-[#382215] shadow-[2px_2px_0px_#382215]">
                <Star className="w-3.5 h-3.5 fill-[#382215] text-[#382215]" />
                <span>Quyết Định Số 118/QĐ-HSV (2026 - 2028)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsRegulationModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFDF8] hover:bg-[#F2E5C9] text-[#C8532B] text-xs font-extrabold border-2 border-[#382215] shadow-[2px_2px_0px_#382215] cursor-pointer transition"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#C8532B]" />
                <span>Tra cứu toàn văn Quy chế (Đã đóng dấu)</span>
              </button>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#382215] font-serif-vintage tracking-tight">
              Sao Năm Cánh · Sinh Viên 5 Tốt AGU
            </h2>

            <p className="text-xs sm:text-sm text-[#5C432C] leading-relaxed font-medium">
              Hệ thống theo dõi và minh chứng hóa đầy đủ 5 cánh sao theo đúng <strong>Quyết định số 118/QĐ-HSV</strong> ngày 23/6/2026 của Ban Thư ký Hội Sinh viên Trường Đại học An Giang:
              <br />
              <span className="font-bold text-[#382215]">
                1. Đạo đức tốt (ĐRL ≥ 90) · 2. Học tập tốt (ĐTB ≥ 8.5/10) · 3. Thể lực tốt (SV khỏe) · 4. Tình nguyện tốt (≥ 5 ngày) · 5. Hội nhập tốt (B1 + CLB Đọc sách STT 14)
              </span>
            </p>

            <div className="flex items-center gap-3 pt-1 flex-wrap">
              <a
                href={pdfDocumentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#245351] hover:underline"
              >
                <FileCheck className="w-4 h-4 text-[#245351]" />
                <span>Mở bản PDF gốc ký đóng dấu bởi Chủ tịch HSV</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Interactive 5-Point Star Constellation Graphic */}
          <div className="relative flex flex-col items-center justify-center p-5 rounded-2xl bg-[#245351] text-white border-2 border-[#382215] shadow-[4px_4px_0px_#382215] w-full sm:w-auto min-w-[280px]">
            <div className="flex items-center justify-between w-full mb-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#FFE29A]">
                <Sparkles className="w-4 h-4 text-[#FFE29A] animate-pulse" />
                <span>Ngũ Giác Sao Vàng</span>
              </div>
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-[#1A3D3C] text-[#FFE29A] border border-[#FFE29A]/30">
                {completedCriteriaCount}/5 Cánh sao
              </span>
            </div>

            {/* SVG Interactive Star Diagram */}
            <div className="relative w-48 h-48 my-1 flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible drop-shadow-md">
                {/* Connecting lines from center to outer tips */}
                {starPoints.map((pt) => (
                  <line
                    key={`line-${pt.id}`}
                    x1="100"
                    y1="100"
                    x2={pt.x}
                    y2={pt.y}
                    stroke={pt.isDone ? '#FFE29A' : 'rgba(255,255,255,0.2)'}
                    strokeWidth={pt.isDone ? '2.5' : '1.5'}
                    strokeDasharray={pt.isDone ? 'none' : '3 3'}
                    className="transition-all duration-500"
                  />
                ))}

                {/* Polygonal perimeter connecting the 5 tips */}
                <polygon
                  points={starPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill={completedCriteriaCount === 5 ? 'rgba(229, 161, 64, 0.25)' : 'rgba(255, 255, 255, 0.05)'}
                  stroke={completedCriteriaCount === 5 ? '#FFE29A' : 'rgba(255,255,255,0.25)'}
                  strokeWidth="2"
                  className="transition-all duration-700"
                />

                {/* Center Star Hub */}
                <circle
                  cx="100"
                  cy="100"
                  r="24"
                  fill="#1A3D3C"
                  stroke="#FFE29A"
                  strokeWidth="2"
                  className="filter drop-shadow-sm"
                />
                <text
                  x="100"
                  y="104"
                  textAnchor="middle"
                  fill="#FFE29A"
                  fontSize="12"
                  fontWeight="900"
                  className="font-sans"
                >
                  {progressPercent}%
                </text>

                {/* 5 Tip Markers */}
                {starPoints.map((pt, idx) => (
                  <g
                    key={`tip-${pt.id}`}
                    onClick={() => setSelectedCritFilter(selectedCritFilter === pt.id ? 'all' : pt.id)}
                    className="cursor-pointer group"
                  >
                    {/* Pulsing ring if completed */}
                    {pt.isDone && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="14"
                        fill="none"
                        stroke="#FFE29A"
                        strokeWidth="1.5"
                        opacity="0.75"
                        className="animate-ping"
                      />
                    )}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="10"
                      fill={pt.isDone ? '#E5A140' : '#1A3D3C'}
                      stroke={pt.isDone ? '#FFFDF8' : 'rgba(255,255,255,0.4)'}
                      strokeWidth="2"
                      className="transition-all duration-300 group-hover:r-[12]"
                    />
                    <text
                      x={pt.x}
                      y={pt.y + 3.5}
                      textAnchor="middle"
                      fill={pt.isDone ? '#382215' : '#FFFFFF'}
                      fontSize="9"
                      fontWeight="900"
                    >
                      {idx + 1}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            {/* Dynamic Status Readout */}
            <div className="w-full text-center space-y-1.5 pt-1">
              <div className="text-xs font-bold text-white/90">
                {completedCriteriaCount === 5 ? (
                  <span className="text-[#FFE29A] font-black flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Đạt đủ 5/5 tiêu chuẩn cấp Trường!
                  </span>
                ) : (
                  <span>
                    Còn <strong>{5 - completedCriteriaCount}</strong> cánh sao để hoàn thành danh hiệu
                  </span>
                )}
              </div>
              <div className="w-full bg-[#1A3D3C] rounded-full h-2.5 overflow-hidden border border-[#382215]/30">
                <div
                  className="bg-gradient-to-r from-[#E5A140] to-[#FFE29A] h-full rounded-full transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="text-[10px] text-white/70 italic">
                Bấm vào các đầu sao để lọc nhanh tiêu chuẩn tương ứng
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Switcher: Member View vs Admin Review */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b-2 border-[#382215]/15">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('my_progress')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer border-2 border-[#382215] ${
              activeTab === 'my_progress'
                ? 'bg-[#382215] text-[#FAF3E3] shadow-[2px_2px_0px_#382215]'
                : 'bg-[#FFFDF8] hover:bg-[#F2E5C9] text-[#382215]'
            }`}
          >
            <Star className="w-4 h-4 text-[#FFE29A]" />
            <span>Tiến Độ Của Tôi ({completedCriteriaCount}/5 Cánh Sao)</span>
          </button>

          {isBcnAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('admin_review')}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer border-2 border-[#382215] relative ${
                activeTab === 'admin_review'
                  ? 'bg-[#C8532B] text-white shadow-[2px_2px_0px_#382215]'
                  : 'bg-[#FFFDF8] hover:bg-[#F2E5C9] text-[#C8532B]'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#FFE29A]" />
              <span>Hội Đồng BCN Duyệt Hồ Sơ</span>
              {pendingProofs.length > 0 && (
                <span className="px-1.5 py-0.2 text-[9px] font-black bg-rose-600 text-white rounded-full">
                  {pendingProofs.length} chờ duyệt
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsRegulationModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#FAF3E3] hover:bg-[#F2E5C9] text-[#382215] text-xs font-bold border border-[#382215] cursor-pointer transition flex items-center gap-1"
          >
            <Info className="w-3.5 h-3.5 text-[#C8532B]" />
            <span>Quy chế 118</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsSubmitModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-[#245351] hover:bg-[#1A3D3C] text-white text-xs font-black flex items-center gap-1.5 border-2 border-[#382215] shadow-[3px_3px_0px_#382215] active:translate-x-[2px] active:translate-y-[2px] cursor-pointer transition"
        >
          <PlusCircle className="w-4 h-4 text-[#FFE29A]" />
          <span>Tải Lên Minh Chứng Mới</span>
        </button>
      </div>

      {/* TAB 1: Member View - 5 Criteria Cards & Interactive Details */}
      {activeTab === 'my_progress' && (
        <div className="space-y-6">
          {/* Quick Filter Bar by Criteria */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="font-bold text-[#6E472B] shrink-0 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Lọc cánh sao:
            </span>
            <button
              type="button"
              onClick={() => setSelectedCritFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold border transition cursor-pointer shrink-0 ${
                selectedCritFilter === 'all'
                  ? 'bg-[#382215] text-white border-[#382215]'
                  : 'bg-[#FFFDF8] text-[#382215] border-[#382215]/20 hover:bg-[#F2E5C9]'
              }`}
            >
              Tất cả (5 tiêu chuẩn)
            </button>
            {personalCriteria.map((c, i) => (
              <button
                key={`filter-${c.id}`}
                type="button"
                onClick={() => setSelectedCritFilter(c.id)}
                className={`px-3 py-1 rounded-lg font-bold border transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  selectedCritFilter === c.id
                    ? 'bg-[#C8532B] text-white border-[#382215]'
                    : 'bg-[#FFFDF8] text-[#382215] border-[#382215]/20 hover:bg-[#F2E5C9]'
                }`}
              >
                <span>{i + 1}. {c.name}</span>
                {c.isFullyDone && <span className="text-[10px]">✓</span>}
              </button>
            ))}
          </div>

          {/* Cards Grid: Detailed 5 Criteria Cards adhering to Decision 118 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {displayedCriteria.map((crit, idx) => {
              const isExpanded = Boolean(expandedCritIds[crit.id]);
              const suggestions = ACTIVITY_SUGGESTIONS[crit.id] || [];

              return (
                <div
                  key={crit.id}
                  className={`rounded-3xl border-3 border-[#382215] transition-all flex flex-col justify-between overflow-hidden ${
                    crit.isFullyDone
                      ? 'bg-gradient-to-br from-[#FFFDF8] via-[#FAF3E3] to-[#F2E5C9] shadow-[5px_5px_0px_#382215]'
                      : 'bg-[#FFFDF8] shadow-[4px_4px_0px_#382215] hover:shadow-[6px_6px_0px_#382215]'
                  }`}
                >
                  {/* Top Bar */}
                  <div className="p-5 pb-3 border-b border-[#382215]/15 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#FAF3E3] border-2 border-[#382215] flex items-center justify-center shadow-[2px_2px_0px_#382215] shrink-0">
                        {getCriterionIcon(crit.iconName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#245351] text-[#FFE29A] uppercase tracking-wide">
                            {crit.regulationArticle || `Tiêu chuẩn ${idx + 1}`}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full border border-[#382215] ${
                              crit.isFullyDone
                                ? 'bg-[#486A39] text-white'
                                : 'bg-[#E5A140] text-[#382215]'
                            }`}
                          >
                            {crit.isFullyDone ? '✓ Đạt chuẩn' : 'Đang tích lũy'}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-[#382215] font-serif-vintage mt-1">
                          {crit.name}
                        </h3>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-[#6E472B]">Tiến độ</div>
                      <div className="text-base font-black text-[#C8532B] font-mono">
                        {crit.completedCount}/{crit.requiredCount}
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3.5 text-xs">
                    {/* Mandatory Requirement Summary */}
                    {crit.mandatorySummary && (
                      <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-300/80 text-[#382215] space-y-1">
                        <div className="font-black text-[11px] text-[#8C3B1E] flex items-center gap-1.5 uppercase tracking-wide">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#C8532B]" />
                          <span>Tiêu chuẩn bắt buộc</span>
                        </div>
                        <p className="font-semibold leading-relaxed">
                          {crit.mandatorySummary}
                        </p>
                      </div>
                    )}

                    {/* Elective Summary */}
                    {crit.electiveSummary && (
                      <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-[#1E3A8A] space-y-1">
                        <div className="font-black text-[11px] text-blue-900 flex items-center gap-1.5 uppercase tracking-wide">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          <span>Tiêu chuẩn tự chọn thêm</span>
                        </div>
                        <p className="leading-relaxed">
                          {crit.electiveSummary}
                        </p>
                      </div>
                    )}

                    {/* Special Note (e.g., Khuyết tật, CLB Sách) */}
                    {crit.specialNote && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 font-medium text-[11px] flex items-start gap-1.5">
                        <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        <span>{crit.specialNote}</span>
                      </div>
                    )}

                    {/* Expandable Sub-Requirements Breakdown */}
                    {crit.subRequirements && crit.subRequirements.length > 0 && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => toggleExpandCrit(crit.id)}
                          className="w-full flex items-center justify-between text-xs font-bold text-[#6E472B] hover:text-[#382215] py-1 cursor-pointer"
                        >
                          <span>Xem chi tiết danh mục tiêu chí theo QĐ 118 ({crit.subRequirements.length} mục)</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 space-y-2 pt-2 border-t border-[#382215]/10 animate-in fade-in duration-200">
                            {crit.subRequirements.map((sub) => (
                              <div
                                key={sub.id}
                                className="p-2.5 rounded-xl bg-[#FAF3E3] border border-[#382215]/20 space-y-0.5"
                              >
                                <div className="flex items-center gap-1.5 font-bold text-[#382215]">
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                                      sub.type === 'mandatory'
                                        ? 'bg-[#C8532B] text-white'
                                        : 'bg-[#245351] text-[#FFE29A]'
                                    }`}
                                  >
                                    {sub.type === 'mandatory' ? 'Bắt buộc' : 'Tự chọn'}
                                  </span>
                                  {sub.category && (
                                    <span className="text-[10px] text-[#8C3B1E] font-extrabold">
                                      [{sub.category}]
                                    </span>
                                  )}
                                  <span>{sub.title}</span>
                                </div>
                                <p className="text-[11px] text-[#6E472B] leading-relaxed pl-1">
                                  {sub.detail}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-4 bg-[#FAF3E3]/60 border-t border-[#382215]/15 flex items-center justify-between gap-3 text-xs">
                    <span className="text-[#6E472B] font-medium">
                      Minh chứng của bạn: <strong>{myProofs.filter((p) => p.criterionId === crit.id).length}</strong> bản
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetCritId(crit.id);
                        setIsSubmitModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#C8532B] hover:bg-[#A63A16] text-white font-black border-2 border-[#382215] shadow-[2px_2px_0px_#382215] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer transition flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ Nộp minh chứng này</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Personal Submitted Proofs List */}
          <div className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#382215]/15 flex-wrap gap-2">
              <div>
                <h3 className="font-black text-base text-[#382215] font-serif-vintage">
                  Minh Chứng Sao Năm Cánh Đã Nộp Của Bạn ({myProofs.length})
                </h3>
                <p className="text-xs text-[#6E472B]">
                  Hồ sơ được bảo mật và lưu trữ chính thức phục vụ xét chọn danh hiệu cấp Trường giai đoạn 2026-2028
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#245351] hover:bg-[#1A3D3C] text-white text-xs font-black border-2 border-[#382215] shadow-[2px_2px_0px_#382215] cursor-pointer transition"
              >
                + Tải thêm minh chứng
              </button>
            </div>

            {myProofs.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#FFFDF8] border-2 border-dashed border-[#382215]/30 text-center space-y-2 shadow-xs">
                <Award className="w-10 h-10 text-[#C8532B]/60 mx-auto" />
                <h4 className="font-black text-sm text-[#382215]">
                  Bạn chưa nộp minh chứng Sinh Viên 5 Tốt nào
                </h4>
                <p className="text-xs text-[#6E472B] max-w-md mx-auto font-medium">
                  Hãy bấm nút <strong>"+ Nộp minh chứng"</strong> ở từng cánh sao phía trên để tải lên ảnh chụp bảng điểm (≥ 8.5), giấy chứng nhận tình nguyện, chứng chỉ ngoại ngữ B1 hoặc xác nhận sinh hoạt CLB!
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {myProofs.map((proof) => {
                  const isPdf = proof.attachmentType === 'pdf' || proof.proofUrl?.startsWith('data:application/pdf');
                  return (
                    <div
                      key={proof.id}
                      className="bg-[#FFFDF8] p-4.5 rounded-2xl border-2 border-[#382215] shadow-[3px_3px_0px_#382215] hover:shadow-[5px_5px_0px_#382215] transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          onClick={() => setPreviewProof(proof)}
                          className="w-14 h-14 rounded-xl bg-[#FAF3E3] overflow-hidden shrink-0 border-2 border-[#382215] shadow-[2px_2px_0px_#382215] flex items-center justify-center cursor-pointer hover:opacity-90"
                          title="Bấm để xem chi tiết minh chứng"
                        >
                          {isPdf ? (
                            <div className="text-center p-1">
                              <FileText className="w-6 h-6 text-[#C8532B] mx-auto" />
                              <span className="text-[9px] font-black text-[#C8532B]">PDF</span>
                            </div>
                          ) : (
                            <img src={proof.proofUrl} alt="proof" className="w-full h-full object-cover" />
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm text-[#382215]">
                              {proof.activityTitle}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-[#245351] text-[#FFE29A]">
                              {proof.criterionName}
                            </span>
                          </div>
                          <p className="text-[#6E472B] font-medium mt-0.5">
                            Ngày tham gia: {proof.activityDate} • Nộp ngày: {proof.submittedAt}
                          </p>
                          <p className="text-[#382215] mt-1 font-serif-vintage italic">
                            "{proof.proofDescription}"
                          </p>
                          {proof.reviewComment && (
                            <div className="mt-1.5 p-2.5 rounded-xl bg-[#F2E5C9] text-[#382215] border border-[#382215]/20 text-xs shadow-2xs">
                              <strong>Nhận xét từ BCN ({proof.reviewedBy}):</strong> {proof.reviewComment}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => setPreviewProof(proof)}
                          className="px-3 py-1.5 rounded-xl bg-[#FAF3E3] hover:bg-[#F2E5C9] text-[#382215] font-black text-xs border border-[#382215] shadow-[2px_2px_0px_#382215] cursor-pointer"
                        >
                          Xem file
                        </button>
                        <span
                          className={`px-3 py-1.5 rounded-xl font-black text-xs border-2 border-[#382215] shadow-[2px_2px_0px_#382215] ${
                            proof.status === 'approved'
                              ? 'bg-[#486A39] text-white'
                              : proof.status === 'rejected'
                              ? 'bg-[#C8532B] text-white'
                              : 'bg-[#E5A140] text-[#382215]'
                          }`}
                        >
                          {proof.status === 'approved' && '✓ Đã phê duyệt'}
                          {proof.status === 'rejected' && '✕ Cần bổ sung'}
                          {proof.status === 'pending' && '⏳ Chờ BCN duyệt'}
                        </span>
                        {onDeleteProof && (
                          <button
                            type="button"
                            onClick={() => onDeleteProof(proof.id)}
                            className="p-1.5 rounded-xl bg-rose-100 hover:bg-rose-600 text-rose-800 hover:text-white border-2 border-rose-600 transition cursor-pointer shadow-2xs"
                            title="Xóa minh chứng này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* TAB 2: Admin / BCN Approval Dashboard */}
      {activeTab === 'admin_review' && isBcnAdmin && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-[#FAF3E3] border-2 border-[#382215]/25 flex items-center justify-between text-xs text-[#382215]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#C8532B] shrink-0" />
              <span>
                <strong>Hội Đồng Xét Duyệt Hồ Sơ Sao Năm Cánh (QĐ 118):</strong> BCN kiểm tra kỹ minh chứng hình ảnh/PDF đối chiếu quy định trước khi phê duyệt. Hồ sơ duyệt xong sẽ tự động chuyển trạng thái ngay.
              </span>
            </div>
            <span className="font-bold text-[#8C3B1E] shrink-0 ml-2">
              {pendingProofs.length} chờ duyệt
            </span>
          </div>

          {pendingProofs.length === 0 ? (
            <div className="rounded-2xl p-12 text-center space-y-2 border-2 border-[#382215]/20 bg-[#FAF3E3]">
              <Award className="w-10 h-10 text-[#6E472B]/60 mx-auto" />
              <h4 className="font-black text-base text-[#382215] font-serif-vintage">
                Hòm thư chờ duyệt minh chứng SV5T hiện đang trống
              </h4>
              <p className="text-xs text-[#6E472B] max-w-md mx-auto">
                Tất cả hồ sơ minh chứng đã được duyệt gọn gàng. Khi sinh viên nộp minh chứng mới, hồ sơ sẽ hiển thị tại đây.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingProofs.map((proof) => {
                const isPdf = proof.attachmentType === 'pdf' || proof.proofUrl?.startsWith('data:application/pdf');
                return (
                  <div
                    key={proof.id}
                    className="bg-[#FAF3E3] rounded-2xl p-5 sm:p-6 border-2 border-[#382215]/25 space-y-4 shadow-[3px_3px_0px_#382215]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#382215] text-[#FAF3E3] flex items-center justify-center font-bold font-serif-vintage">
                          {proof.studentName.slice(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-[#382215]">
                              {proof.studentName}
                            </h4>
                            <span className="text-xs text-[#6E472B] font-mono">
                              ({proof.studentId})
                            </span>
                            <span className="text-xs font-bold text-[#C8532B]">
                              · Ban {proof.department}
                            </span>
                          </div>
                          <p className="text-xs text-[#6E472B] font-medium mt-0.5">
                            Cánh sao: <strong>{proof.criterionName}</strong> · Nộp ngày: {proof.submittedAt}
                          </p>
                        </div>
                      </div>

                      {onDeleteProof && (
                        <button
                          type="button"
                          onClick={() => onDeleteProof(proof.id)}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer flex items-center gap-1 text-xs font-bold self-end sm:self-center"
                          title="Xóa minh chứng này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      )}
                    </div>

                    {/* Proof content and photo/PDF */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#FFFDF7] p-4 rounded-xl border border-[#382215]/15">
                      <div className="md:col-span-2 space-y-2 text-xs">
                        <h5 className="font-bold text-sm text-[#382215]">
                          {proof.activityTitle}
                        </h5>
                        <p className="text-[#4A3525] leading-relaxed">
                          <strong>Mô tả chi tiết:</strong> {proof.proofDescription}
                        </p>
                        <p className="text-[#6E472B]">
                          <strong>Thời gian diễn ra:</strong> {proof.activityDate}
                        </p>
                      </div>

                      <div
                        onClick={() => setPreviewProof(proof)}
                        className="rounded-xl overflow-hidden aspect-video bg-stone-200 border border-stone-300 relative group cursor-pointer flex items-center justify-center"
                      >
                        {isPdf ? (
                          <div className="text-center p-4 space-y-1">
                            <FileText className="w-10 h-10 text-rose-600 mx-auto" />
                            <div className="text-xs font-bold text-stone-800">
                              {proof.attachmentName || 'Tài liệu PDF Minh chứng'}
                            </div>
                            <span className="text-[10px] text-rose-700 font-semibold">
                              Bấm để mở xem file PDF
                            </span>
                          </div>
                        ) : (
                          <img src={proof.proofUrl} alt="evidence" className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition text-xs font-bold gap-1">
                          <ExternalLink className="w-4 h-4" />
                          Xem minh chứng gốc
                        </div>
                      </div>
                    </div>

                    {/* Review Action Controls */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Nhận xét của Ban Chủ Nhiệm (VD: Đạt chuẩn ĐRL ≥ 90 theo Điều 5.2.1)..."
                          value={selectedProofToReview?.id === proof.id ? reviewComment : ''}
                          onChange={(e) => {
                            setSelectedProofToReview(proof);
                            setReviewComment(e.target.value);
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-[#FFFDF7] border border-[#382215]/30 text-xs"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleReject(proof)}
                          className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-[#382215] text-xs font-bold transition cursor-pointer"
                        >
                          Cần Bổ Sung
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(proof)}
                          className="px-5 py-2 rounded-xl bg-[#486A39] hover:bg-[#38552B] text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          Duyệt Đạt
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Submit S5T Proof with Template Suggestions */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FAF7F0] rounded-3xl border-3 border-[#382215] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-[#245351] text-white p-5 flex items-center justify-between border-b-2 border-[#382215]">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-[#FFE29A] fill-[#FFE29A]" />
                <h3 className="font-bold text-base font-serif-vintage">
                  Nộp Minh Chứng Sao Năm Cánh (QĐ 118)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProof} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-[#382215] mb-1">
                  Chọn cánh sao muốn tích lũy *
                </label>
                <select
                  value={targetCritId}
                  onChange={(e) => setTargetCritId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-white text-xs focus:ring-2 focus:ring-[#C8532B]"
                >
                  {safeCriteria.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.description.slice(0, 65)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* Smart Suggestion Chips */}
              {ACTIVITY_SUGGESTIONS[targetCritId] && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-[#6E472B]">
                    Gợi ý hoạt động chuẩn theo QĐ 118 (bấm để chọn nhanh):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ACTIVITY_SUGGESTIONS[targetCritId].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setActivityTitle(sug)}
                        className="px-2.5 py-1 rounded-lg bg-[#FAF3E3] hover:bg-[#F2E5C9] text-[#382215] border border-[#382215]/20 text-[11px] font-medium text-left transition cursor-pointer"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-[#382215] mb-1">
                  Tên hoạt động / Giấy chứng nhận / Bảng điểm *
                </label>
                <input
                  type="text"
                  required
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  placeholder="Ví dụ: Bảng điểm học kỳ đạt 8.6/10, Giấy chứng nhận Tiếp sức mùa thi..."
                  className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-white text-xs focus:ring-2 focus:ring-[#C8532B]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#382215] mb-1">
                  Thời gian diễn ra / Ngày cấp chứng nhận
                </label>
                <input
                  type="text"
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                  placeholder="Ví dụ: 25/10/2026 hoặc Học kỳ 1 (2026 - 2027)"
                  className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-white text-xs focus:ring-2 focus:ring-[#C8532B]"
                />
              </div>

              {/* Direct Image / PDF Upload */}
              <div className="space-y-2">
                <label className="block font-bold text-[#382215]">
                  Tải Ảnh chụp hoặc File PDF Minh chứng từ máy *
                </label>
                <label className="w-full py-3 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-2 border-dashed border-emerald-400 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition">
                  <Upload className="w-4 h-4 text-emerald-700" />
                  <span>Chọn Ảnh hoặc File PDF từ Thiết Bị (Tối đa 15MB)</span>
                  <input
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {proofUrl && (
                  <div className="p-3 rounded-xl bg-white border border-emerald-400 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {attachmentType === 'pdf' ? (
                        <FileText className="w-8 h-8 text-rose-600 shrink-0" />
                      ) : (
                        <img
                          src={proofUrl}
                          alt="Preview"
                          className="w-12 h-12 rounded-lg object-cover border border-stone-200 shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-emerald-950 truncate">
                          {attachmentName || 'Đã đính kèm tệp minh chứng'}
                        </div>
                        <div className="text-[10px] text-emerald-700">
                          {attachmentType === 'pdf' ? 'Tài liệu PDF gốc' : 'Hình ảnh giấy chứng nhận'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProofUrl('');
                        setAttachmentName('');
                      }}
                      className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="pt-1">
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Hoặc dán đường dẫn (URL) minh chứng nếu có:
                  </label>
                  <input
                    type="text"
                    value={proofUrl.startsWith('data:') ? '' : proofUrl}
                    onChange={(e) => {
                      setProofUrl(e.target.value);
                      setAttachmentType('link');
                      setAttachmentName('Liên kết minh chứng');
                    }}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-white text-xs"
                  />
                </div>

                {uploadError && (
                  <p className="text-xs text-rose-600 font-semibold">{uploadError}</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#382215] mb-1">
                  Mô tả quá trình tham gia & đóng góp *
                </label>
                <textarea
                  rows={3}
                  required
                  value={proofDescription}
                  onChange={(e) => setProofDescription(e.target.value)}
                  placeholder="Ghi rõ thông tin đối chiếu quy chế (VD: Điểm TB 8.6/10, hoàn thành 5 ngày tình nguyện Mùa hè xanh...)"
                  className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-white text-xs focus:ring-2 focus:ring-[#C8532B]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#382215]/15">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#245351] hover:bg-[#1A3D3C] text-white font-black shadow-md cursor-pointer flex items-center gap-2 border-2 border-[#382215]"
                >
                  <Send className="w-4 h-4 text-[#FFE29A]" />
                  <span>Gửi Minh Chứng</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Full Official Regulation Reference (QĐ 118/QĐ-HSV) */}
      {isRegulationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FAF7F0] rounded-3xl border-3 border-[#382215] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#382215] text-[#FAF3E3] p-5 flex items-center justify-between border-b-2 border-[#382215]">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-6 h-6 text-[#E5A140]" />
                <div>
                  <h3 className="font-black text-base sm:text-lg font-serif-vintage leading-tight">
                    Quy Chế Sinh Viên 5 Tốt & Sao Tháng Giêng AGU
                  </h3>
                  <p className="text-[11px] text-[#FFE29A] font-semibold">
                    Quyết định số 118/QĐ-HSV ngày 23/6/2026 · Ban Thư ký Hội Sinh viên Trường Đại học An Giang
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={pdfDocumentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-[#E5A140] hover:bg-[#d49132] text-[#382215] text-xs font-black flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải File PDF Đã Đóng Dấu</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsRegulationModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 p-3 bg-[#F2E5C9] border-b border-[#382215]/20 overflow-x-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => setRegulationTab('tieu_chuan')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                  regulationTab === 'tieu_chuan'
                    ? 'bg-[#382215] text-white shadow-xs'
                    : 'text-[#382215] hover:bg-[#FAF3E3]'
                }`}
              >
                5 Tiêu Chuẩn Cấp Trường (Điều 5)
              </button>
              <button
                type="button"
                onClick={() => setRegulationTab('sao_thang_gieng')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                  regulationTab === 'sao_thang_gieng'
                    ? 'bg-[#382215] text-white shadow-xs'
                    : 'text-[#382215] hover:bg-[#FAF3E3]'
                }`}
              >
                SV5T Tiêu Biểu & Sao Tháng Giêng (Điều 6-10)
              </button>
              <button
                type="button"
                onClick={() => setRegulationTab('phu_luc_clb')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                  regulationTab === 'phu_luc_clb'
                    ? 'bg-[#382215] text-white shadow-xs'
                    : 'text-[#382215] hover:bg-[#FAF3E3]'
                }`}
              >
                Phụ Lục 1: Danh Mục CLB (CLB Sách #14)
              </button>
              <button
                type="button"
                onClick={() => setRegulationTab('ky_nang')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                  regulationTab === 'ky_nang'
                    ? 'bg-[#382215] text-white shadow-xs'
                    : 'text-[#382215] hover:bg-[#FAF3E3]'
                }`}
              >
                Phụ Lục 2: Khung Kỹ Năng Xã Hội
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-[#382215]">
              {regulationTab === 'tieu_chuan' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300">
                    <strong className="text-[#8C3B1E]">Quy định chung (Điều 5.1):</strong> Sinh viên phải đạt đầy đủ các tiêu chuẩn danh hiệu "Sinh viên 5 tốt" cấp Khoa, được Liên Chi hội cấp Khoa công nhận và đề xuất Hội Sinh viên Trường tuyên dương cấp Trường. Thời gian xét thành tích: từ 01/8 năm trước tới 01/8 năm xét (Điều 11).
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215]/20 space-y-2">
                      <h4 className="font-black text-[#8C3B1E] flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>1. Tiêu chuẩn Đạo đức tốt (Điều 5.2.1)</span>
                      </h4>
                      <p className="font-semibold">
                        • <strong>Bắt buộc:</strong> Điểm rèn luyện trung bình chung cả năm học đạt từ <strong>90 điểm trở lên</strong> (thang điểm 100); Không vi phạm pháp luật và nội quy, quy chế nhà trường, cộng đồng.
                      </p>
                      <p>
                        • <strong>Đạt thêm ít nhất 01 trong 06 tiêu chí:</strong> Đảng viên hoàn thành xuất sắc nhiệm vụ; Thanh niên tiên tiến làm theo lời Bác từ cấp Trường trở lên; Hành động dũng cảm cứu người, giúp người nghèo hoạn nạn; Tham luận/đạt giải Mác-Lênin, Tư tưởng HCM, Lịch sử văn hóa; Hoạt động giáo dục truyền thống yêu nước (di tích, bảo tàng, tri ân); Hoạt động an ninh xung kích, phòng chống tệ nạn xã hội.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215]/20 space-y-2">
                      <h4 className="font-black text-[#1E3A8A] flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-blue-600" />
                        <span>2. Tiêu chuẩn Học tập tốt (Điều 5.2.2)</span>
                      </h4>
                      <p className="font-semibold">
                        • <strong>Bắt buộc:</strong> Điểm trung bình chung học tập cả năm đạt từ <strong>8.5/10 trở lên</strong> (áp dụng hệ điểm 10, không dùng thang 4 hay thang chữ); Thái độ học tập đúng đắn, không gian lận trong thi cử.
                      </p>
                      <p>
                        • <strong>Đạt thêm ít nhất 02 trong 06 tiêu chí:</strong> Tham gia sinh hoạt thường xuyên ít nhất 01 CLB học thuật (Phụ lục 1); Đề tài NCKH từ cấp Khoa trở lên; Bài viết đăng tạp chí chuyên ngành hoặc kỷ yếu hội thảo cấp Trường; Sản phẩm sáng tạo, sáng chế; Đội tuyển học thuật cấp Trường; Giải thưởng cuộc thi học thuật cấp Khoa trở lên.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215]/20 space-y-2">
                      <h4 className="font-black text-[#B45309] flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-amber-600" />
                        <span>3. Tiêu chuẩn Thể lực tốt (Điều 5.2.3)</span>
                      </h4>
                      <p>
                        • <strong>Đạt 01 trong 03 tiêu chí:</strong> Sát hạch đạt danh hiệu "Sinh viên khỏe" hoặc "Thanh niên khỏe" cấp Trường; hoặc Đạt giải thi đấu thể thao từ cấp Trường trở lên; hoặc Thành viên đội tuyển cấp Trường dự thi Tỉnh, ĐHQG, Khu vực...
                      </p>
                      <p className="text-[#486A39] font-bold text-xs italic">
                        * Ghi chú: Sinh viên khuyết tật không bắt buộc xét tiêu chuẩn thể lực (nộp kèm giấy xác nhận khuyết tật).
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215]/20 space-y-2">
                      <h4 className="font-black text-[#BE123C] flex items-center gap-1.5">
                        <HeartHandshake className="w-4 h-4 text-rose-600" />
                        <span>4. Tiêu chuẩn Tình nguyện tốt (Điều 5.2.4)</span>
                      </h4>
                      <p className="font-semibold">
                        • Tham gia <strong>ít nhất 05 ngày tình nguyện/năm học</strong> (tính theo số ngày thực tế cộng dồn: Tiếp sức mùa thi, Đón tân sinh viên, Hiến máu nhân đạo, Chủ nhật xanh, Tình nguyện xây dựng nông thôn mới...).
                      </p>
                      <p className="text-xs text-[#6E472B]">
                        * Lưu ý: Bắt buộc có giấy chứng nhận/xác nhận từ đơn vị tổ chức. Hoạt động chỉ quyên góp tiền/hiện vật không trực tiếp tham gia sẽ không được tính.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215]/20 space-y-2">
                      <h4 className="font-black text-[#4338CA] flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-indigo-600" />
                        <span>5. Tiêu chuẩn Hội nhập tốt (Điều 5.2.5)</span>
                      </h4>
                      <p>
                        • <strong>Về Ngoại ngữ:</strong> Đạt chứng chỉ tiếng Anh <strong>trình độ B1 CEFR</strong> (hoặc TOEIC, IELTS quy đổi tương đương theo thông tư Bộ GD&ĐT) hoặc ngoại ngữ 2 (với SV chuyên ngữ).
                      </p>
                      <p>
                        • <strong>Về Kỹ năng (đạt 02 tiêu chí):</strong> Khóa kỹ năng thực hành xã hội (Phụ lục 2); hoặc giải thưởng cuộc thi kỹ năng; hoặc báo cáo viên kỹ năng; hoặc <strong>tham gia sinh hoạt thường xuyên tại CLB Kỹ năng thuộc HSV Trường (CLB Đọc & Giới thiệu sách là STT 14 Phụ lục 1)</strong>.
                      </p>
                      <p>
                        • <strong>Về Hội nhập (đạt 01 tiêu chí):</strong> 01 hoạt động hội nhập cấp Trường trở lên; hoặc 01 hoạt động giao lưu quốc tế; hoặc đạt giải cuộc thi kiến thức hội nhập/ngoại ngữ từ cấp Khoa trở lên.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {regulationTab === 'sao_thang_gieng' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#FAF3E3] border-2 border-[#382215]/20 space-y-2">
                    <h4 className="font-black text-sm text-[#8C3B1E]">
                      Điều 6: Danh hiệu "Sinh viên 5 tốt" tiêu biểu cấp Trường
                    </h4>
                    <p>
                      Sinh viên phải đạt danh hiệu "Sinh viên 5 tốt" cấp Trường trong năm xét chọn. Xét theo thứ tự ưu tiên từ trên xuống dưới (đạt giải cấp Trung ương, Tỉnh, ĐHQG; được khen thưởng công tác Đoàn - Hội; biểu dương thành tích học tập).
                    </p>
                    <p className="font-bold text-[#C8532B]">
                      * Số lượng xét chọn không quá 15% tổng số sinh viên đạt danh hiệu "Sinh viên 5 tốt" trong năm.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#245351] text-white border-2 border-[#382215] space-y-2">
                    <h4 className="font-black text-sm text-[#FFE29A] flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#FFE29A]" />
                      <span>Chương III: Giải Thưởng "Sao Tháng Giêng" Cấp Trường (Điều 8, 9, 10)</span>
                    </h4>
                    <p className="text-white/90">
                      • <strong>Đối tượng xét:</strong> Bí thư Chi đoàn, Chi hội trưởng trở lên.
                    </p>
                    <p className="text-white/90">
                      • <strong>Học tập:</strong> Điểm trung bình chung học tập cả năm đạt từ <strong>8.7/10 trở lên</strong> (đối với sinh viên dân tộc thiểu số từ 8.5/10); hoặc đạt giải Olympic, giải NCKH cấp Trường.
                    </p>
                    <p className="text-white/90">
                      • <strong>Rèn luyện:</strong> Điểm rèn luyện đạt từ <strong>95 điểm trở lên</strong> (thang điểm 100); Có ít nhất <strong>02 năm làm cán bộ Đoàn - Hội</strong> giữ chức vụ từ Bí thư Chi đoàn, Chi hội trưởng trở lên; đóng góp xuất sắc được khen thưởng.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215]/20 space-y-2">
                    <h4 className="font-black text-sm text-[#382215]">
                      Điều 13: Quyền lợi người đạt danh hiệu
                    </h4>
                    <p>
                      Được tuyên dương trong Lễ kỷ niệm Ngày truyền thống HSSV (09/01); cấp Giấy chứng nhận và Kỷ niệm chương; đề xuất Giấy khen Hiệu trưởng Trường ĐH An Giang; ưu tiên theo dõi bồi dưỡng kết nạp Đảng; cộng điểm rèn luyện theo quy định; ưu tiên tham gia hành trình về nguồn.
                    </p>
                  </div>
                </div>
              )}

              {regulationTab === 'phu_luc_clb' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 font-medium">
                    <strong>Đặc quyền dành cho Thành viên CLB Đọc & Giới thiệu sách:</strong> Căn cứ Phụ lục 1 Quyết định 118, CLB Đọc & Giới thiệu sách được xếp ở <strong>STT 14</strong> trong danh mục CLB Kỹ năng trực thuộc Hội Sinh viên Trường ĐH An Giang. Việc tham gia sinh hoạt thường xuyên tại CLB trực tiếp giúp bạn hoàn thành <strong>01 tiêu chí Kỹ năng trong Tiêu chuẩn Hội nhập tốt (Điều 5.2.5.2)</strong>!
                  </div>

                  <div className="border border-[#382215]/20 rounded-2xl overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#382215] text-[#FAF3E3]">
                        <tr>
                          <th className="p-2.5 font-bold">TT</th>
                          <th className="p-2.5 font-bold">Tên Câu Lạc Bộ</th>
                          <th className="p-2.5 font-bold">Lĩnh Vực</th>
                          <th className="p-2.5 font-bold">Ghi Chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#382215]/10 font-medium text-[#382215]">
                        <tr className="bg-amber-50/50">
                          <td className="p-2 font-mono font-bold">1 - 6</td>
                          <td className="p-2">CLB Tiếng Anh, Văn thơ, Pháp lý & Lý luận chính trị, Sử học, Ngôi nhà Hóa học, Tiếng Anh AGU - Thanh niên với APEC 2027</td>
                          <td className="p-2 font-bold text-blue-700">Học thuật</td>
                          <td className="p-2 text-[11px]">Tính tiêu chí Học tập tốt (5.2.2.2)</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono">7 - 13</td>
                          <td className="p-2">CLB Du lịch, Bình đẳng giới, Vườn thuốc nam, Hành trình xanh, Kỹ năng và Công tác xã hội, Sinh viên 5 tốt, Bóng chuyền nữ</td>
                          <td className="p-2 font-bold text-emerald-700">Kỹ năng</td>
                          <td className="p-2 text-[11px]">Tính tiêu chí Hội nhập tốt (5.2.5.2)</td>
                        </tr>
                        <tr className="bg-emerald-100/70 border-2 border-emerald-500 font-bold">
                          <td className="p-2 font-mono text-emerald-900 text-sm">14</td>
                          <td className="p-2 text-emerald-950 font-black text-sm">
                            CLB Đọc & Giới thiệu sách 🌿
                          </td>
                          <td className="p-2 font-black text-emerald-800">Kỹ năng</td>
                          <td className="p-2 text-emerald-900 text-xs">
                            ★ CLB Hiện tại · Tính chuẩn Kỹ năng 5.2.5.2
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono">15 - 18</td>
                          <td className="p-2">CLB Nhà hàng - Khách sạn, Âm nhạc, Môi trường, Nhiếp ảnh trẻ</td>
                          <td className="p-2 font-bold text-emerald-700">Kỹ năng</td>
                          <td className="p-2 text-[11px]">Tính tiêu chí Hội nhập tốt (5.2.5.2)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {regulationTab === 'ky_nang' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950">
                    <strong>Khung Kỹ năng thực hành xã hội cho sinh viên (Phụ lục 2 QĐ 118):</strong> Hoàn thành ít nhất 01 khóa học hoặc tập huấn thuộc các nhóm kỹ năng dưới đây từ cấp Khoa trở lên sẽ thỏa mãn tiêu chí kỹ năng.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border border-[#382215]/20 space-y-1.5">
                      <h5 className="font-black text-[#8C3B1E]">1. Nhóm kỹ năng về nhận thức</h5>
                      <ul className="list-disc list-inside space-y-1 text-[#6E472B]">
                        <li>Tư duy tích cực, phản biện (Critical / Positive Thinking)</li>
                        <li>Tư duy sáng tạo (Creativity Skill)</li>
                        <li>Xác định mục tiêu (Targeting Skills)</li>
                        <li>Khám phá bản thân (Self-discovery Skills)</li>
                        <li>Giải quyết vấn đề - ra quyết định</li>
                        <li>Ứng xử mạng xã hội (Social Networking Skills)</li>
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border border-[#382215]/20 space-y-1.5">
                      <h5 className="font-black text-[#245351]">2. Nhóm kỹ năng về xã hội</h5>
                      <ul className="list-disc list-inside space-y-1 text-[#6E472B]">
                        <li>Giao tiếp - ứng xử (Communication Skill)</li>
                        <li>Kỹ năng thuyết trình (Presentation Skill)</li>
                        <li>Làm việc nhóm hiệu quả (Team building Skill)</li>
                        <li>Thiết lập và duy trì các mối quan hệ</li>
                        <li>Đàm phán và thuyết phục</li>
                        <li>Nhận diện tình huống lừa đảo trên không gian mạng</li>
                        <li>Sơ cấp cứu cơ bản (Basic First Aid Skills)</li>
                        <li>Xử lý khủng hoảng truyền thông</li>
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border border-[#382215]/20 space-y-1.5">
                      <h5 className="font-black text-[#C8532B]">3. Quản lý bản thân</h5>
                      <ul className="list-disc list-inside space-y-1 text-[#6E472B]">
                        <li>Quản lý thời gian (Time Management)</li>
                        <li>Làm chủ cảm xúc (Emotion Management)</li>
                        <li>Vượt qua nghịch cảnh (Overcome Adversity)</li>
                        <li>Thích nghi, cân bằng cuộc sống</li>
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border border-[#382215]/20 space-y-1.5">
                      <h5 className="font-black text-[#4338CA]">4. Chuyên nghiệp / Nâng cao</h5>
                      <ul className="list-disc list-inside space-y-1 text-[#6E472B]">
                        <li>Phỏng vấn tuyển dụng (Recruitment Interview)</li>
                        <li>Lập kế hoạch (Planning Skills)</li>
                        <li>Điều hành cuộc họp (Text Editing Skills)</li>
                        <li>Kỹ năng số (Digital Skills)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#FAF3E3] border-t border-[#382215]/20 flex items-center justify-between">
              <span className="text-[11px] text-[#6E472B]">
                Ban hành theo Quyết định số 118/QĐ-HSV ngày 23/6/2026 của Hội Sinh viên AGU
              </span>
              <button
                type="button"
                onClick={() => setIsRegulationModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#382215] text-white text-xs font-bold hover:bg-[#5C432C] cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Preview Image or PDF Proof */}
      {previewProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FAF7F0] rounded-3xl border-3 border-[#382215] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-[#1E3A24] text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-[#382215]">
              <div>
                <h4 className="font-bold text-sm sm:text-base font-serif-vintage">
                  {previewProof.activityTitle}
                </h4>
                <p className="text-[11px] text-emerald-200">
                  Sinh viên: {previewProof.studentName} ({previewProof.studentId}) • {previewProof.criterionName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewProof.proofUrl}
                  download={previewProof.attachmentName || `${previewProof.activityTitle}.pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-[#E5A140] hover:bg-[#d49132] text-[#382215] font-bold text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải Về Máy</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewProof(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-auto bg-stone-900 flex items-center justify-center min-h-[380px]">
              {previewProof.attachmentType === 'pdf' || previewProof.proofUrl?.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewProof.proofUrl}
                  title={previewProof.activityTitle}
                  className="w-full h-[65vh] rounded-xl bg-white border-0"
                />
              ) : (
                <img
                  src={previewProof.proofUrl}
                  alt={previewProof.activityTitle}
                  className="max-w-full max-h-[68vh] object-contain rounded-xl shadow-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

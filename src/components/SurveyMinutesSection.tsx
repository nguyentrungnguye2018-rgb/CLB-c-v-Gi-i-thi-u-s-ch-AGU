import React, { useState, useEffect } from 'react';
import {
  FileText,
  Vote,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Lock,
  UserCheck,
  Printer,
  Send,
  BarChart3,
  FolderArchive,
  X,
  Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, DepartmentType } from '../types';
import {
  isMasterRootUser,
  isClubPresidentUser,
  isClubVicePresidentUser
} from '../utils/governance';

interface SurveyMinutesSectionProps {
  currentUser: UserProfile;
  isBcnMode: boolean;
  userList: UserProfile[];
  onSaveMinutesToArchive?: (planPayload: any) => void;
}

interface SurveyQuestionItem {
  id: string;
  text: string;
  type: 'single_choice' | 'multiple_choice' | 'text';
  options: string[];
  required: boolean;
}

interface SurveyResponseItem {
  id: string;
  respondentId: string;
  respondentName: string;
  respondentStudentId: string;
  respondentDept: string;
  submittedAt: string;
  answers: Record<string, string | string[]>;
}

interface ClubSurveyPoll {
  id: string;
  title: string;
  description: string;
  meetingContext: string;
  academicYear: string;
  anonymityMode: 'anonymous' | 'identified';
  status: 'open' | 'closed';
  createdBy: string;
  createdAt: string;
  questions: SurveyQuestionItem[];
  responses: SurveyResponseItem[];
}

interface DiscussionOpinionRow {
  id: string;
  speaker: string;
  content: string;
}

interface VoteTableRow {
  id: string;
  fullName: string;
  branch: string;
  roleOrContent: string;
  votesFor: number;
  totalVotes: number;
}

export const SurveyMinutesSection: React.FC<SurveyMinutesSectionProps> = ({
  currentUser,
  isBcnMode,
  userList,
  onSaveMinutesToArchive
}) => {
  const isRoot = isMasterRootUser(currentUser);
  const isPresident = isClubPresidentUser(currentUser);
  const isVicePresident = isClubVicePresidentUser(currentUser);
  const isBcnLeader =
    isRoot ||
    isPresident ||
    isVicePresident ||
    isBcnMode ||
    currentUser.role === 'bcn_admin' ||
    currentUser.departmentRole === 'leader';

  const isAlumniViewerOnly =
    currentUser.clubRole === 'alumni_viewer' ||
    (Boolean(currentUser.isGraduated) && currentUser.clubRole !== 'former_bcn' && currentUser.canComment === false);

  const [subTab, setSubTab] = useState<'surveys' | 'minutes'>('surveys');
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  // =========================================================================
  // PHẦN 1: HỆ THỐNG FORM KHẢO SÁT, ĐÓNG GÓP Ý KIẾN & BIỂU QUYẾT
  // =========================================================================
  const [surveys, setSurveys] = useState<ClubSurveyPoll[]>(() => {
    try {
      const saved = localStorage.getItem('agu_club_surveys_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    let isMounted = true;
    const loadSurveys = async () => {
      try {
        const res = await fetch('/api/state');
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && Array.isArray(data.clubSurveys)) {
          setSurveys(data.clubSurveys);
          localStorage.setItem('agu_club_surveys_v1', JSON.stringify(data.clubSurveys));
        }
      } catch {
        // fallback local
      }
    };
    loadSurveys();
    return () => {
      isMounted = false;
    };
  }, []);

  const syncSurveysToServer = async (nextList: ClubSurveyPoll[]) => {
    setSurveys(nextList);
    localStorage.setItem('agu_club_surveys_v1', JSON.stringify(nextList));
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'clubSurveys', data: nextList })
      });
    } catch (err) {
      console.error('Lỗi đồng bộ khảo sát:', err);
    }
  };

  // Builder Modal States
  const [isCreateSurveyOpen, setIsCreateSurveyOpen] = useState(false);
  const [surveyTitle, setSurveyTitle] = useState('');
  const [surveyDesc, setSurveyDesc] = useState('');
  const [surveyAcademicYear, setSurveyAcademicYear] = useState('Năm học 2026 - 2027');
  const [surveyAnonymity, setSurveyAnonymity] = useState<'anonymous' | 'identified'>('identified');
  const [draftQuestions, setDraftQuestions] = useState<SurveyQuestionItem[]>([
    {
      id: 'sq-1',
      text: 'Bạn có tán thành với nội dung dự thảo kế hoạch / phương án triển khai của CLB không?',
      type: 'single_choice',
      options: ['Tán thành hoàn toàn', 'Tán thành nhưng cần điều chỉnh thêm', 'Không tán thành'],
      required: true
    },
    {
      id: 'sq-2',
      text: 'Ý kiến đóng góp xây dựng chi tiết của bạn:',
      type: 'text',
      options: [],
      required: false
    }
  ]);

  // Response Answers Map: surveyId -> questionId -> value
  const [userDraftAnswers, setUserDraftAnswers] = useState<Record<string, Record<string, string | string[]>>>({});

  const handleAddDraftQuestion = () => {
    setDraftQuestions((prev) => [
      ...prev,
      {
        id: `sq-${Date.now()}`,
        text: '',
        type: 'single_choice',
        options: ['Phương án 1', 'Phương án 2'],
        required: true
      }
    ]);
  };

  const handleSaveNewSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surveyTitle.trim()) return;
    const validQuestions = draftQuestions.filter((q) => q.text.trim());
    if (validQuestions.length === 0) return;

    const newPoll: ClubSurveyPoll = {
      id: `poll-${Date.now()}`,
      title: surveyTitle.trim(),
      description: surveyDesc.trim(),
      meetingContext: 'Lấy ý kiến hội viên & biểu quyết CLB',
      academicYear: surveyAcademicYear.trim() || 'Năm học 2026 - 2027',
      anonymityMode: surveyAnonymity,
      status: 'open',
      createdBy: `${currentUser.name} (${currentUser.position || 'BCN'})`,
      createdAt: new Date().toLocaleDateString('vi-VN'),
      questions: validQuestions,
      responses: []
    };

    await syncSurveysToServer([newPoll, ...surveys]);
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    setIsCreateSurveyOpen(false);
    setSurveyTitle('');
    setSurveyDesc('');
    setBannerMsg(`Đã phát hành phiếu khảo sát "${newPoll.title}" (${newPoll.anonymityMode === 'anonymous' ? 'Chế độ Ẩn danh' : 'Công khai danh tính'})!`);
    setTimeout(() => setBannerMsg(null), 5000);
  };

  const handleSubmitSurveyResponse = async (poll: ClubSurveyPoll) => {
    if (isAlumniViewerOnly) return;
    const answers = userDraftAnswers[poll.id] || {};
    for (const q of poll.questions) {
      if (q.required) {
        const val = answers[q.id];
        if (!val || (Array.isArray(val) && val.length === 0) || (typeof val === 'string' && !val.trim())) {
          alert(`Vui lòng trả lời câu hỏi bắt buộc: "${q.text}"`);
          return;
        }
      }
    }

    const isAnon = poll.anonymityMode === 'anonymous';
    const newResp: SurveyResponseItem = {
      id: `resp-${Date.now()}`,
      respondentId: isAnon ? `ANON-${Math.floor(1000 + Math.random() * 9000)}` : currentUser.id,
      respondentName: isAnon ? 'Thành viên ẩn danh' : currentUser.name,
      respondentStudentId: isAnon ? 'ẨN DANH' : currentUser.studentId,
      respondentDept: isAnon ? 'Bảo mật' : currentUser.department,
      submittedAt: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
      answers
    };

    const nextSurveys = surveys.map((s) =>
      s.id === poll.id
        ? {
            ...s,
            responses: [newResp, ...s.responses.filter((r) => isAnon || r.respondentId !== currentUser.id)]
          }
        : s
    );

    await syncSurveysToServer(nextSurveys);
    confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
    setBannerMsg(`Đã gửi ý kiến đóng góp vào phiếu "${poll.title}" thành công!`);
    setTimeout(() => setBannerMsg(null), 4500);
  };

  // =========================================================================
  // PHẦN 2: TRÌNH TẠO BIÊN BẢN CUỘC HỌP THEO ĐÚNG MẪU BCN CLB ĐỌC SÁCH AGU
  // =========================================================================
  const todayObj = new Date();
  const [docNumber, setDocNumber] = useState('01/BB-CLB');
  const [academicYear, setAcademicYear] = useState('Năm học 2026 - 2027');
  const [docDay, setDocDay] = useState(String(todayObj.getDate()).padStart(2, '0'));
  const [docMonth, setDocMonth] = useState(String(todayObj.getMonth() + 1).padStart(2, '0'));
  const [docYear, setDocYear] = useState(String(todayObj.getFullYear()));
  const [meetingTitle, setMeetingTitle] = useState('Triển khai kế hoạch hoạt động tháng & phân công nhiệm vụ 4 ban');
  const [startHour, setStartHour] = useState('18');
  const [startMinute, setStartMinute] = useState('30');
  const [location, setLocation] = useState('Phòng họp tầng 3 — Thư viện Trường Đại học An Giang');
  const [chairName, setChairName] = useState(currentUser.name);
  const [chairRole, setChairRole] = useState(currentUser.position || 'Chủ nhiệm CLB Đọc và Giới thiệu sách');
  const [secretaryName, setSecretaryName] = useState('');
  const [guests, setGuests] = useState('Đại diện Ban Thư ký Hội Sinh viên Trường Đại học An Giang (nếu có)');
  const [totalSummoned, setTotalSummoned] = useState<number>(Math.max(1, userList.filter((u) => u.id !== 'bcn-root').length));
  const [totalPresent, setTotalPresent] = useState<number>(Math.max(1, userList.filter((u) => u.id !== 'bcn-root').length));
  const [absentReasonNote, setAbsentReasonNote] = useState('0 hội viên (Có lý do: 0; Không lý do: 0)');

  const [openingReason, setOpeningReason] = useState(
    'Đồng chí Chủ tọa tuyên bố lý do tổ chức cuộc họp, giới thiệu đại biểu tham dự và thông qua chương trình làm việc của hội nghị.'
  );

  const [discussions, setDiscussions] = useState<DiscussionOpinionRow[]>([
    {
      id: 'disc-1',
      speaker: 'Ban Nội dung & Ban Truyền thông',
      content: 'Đề xuất chủ đề truyền thông sách tháng mới và thống nhất tiến độ thiết kế ấn phẩm.'
    }
  ]);

  const [voteRows, setVoteRows] = useState<VoteTableRow[]>([
    {
      id: 'vr-1',
      fullName: 'Thông qua dự thảo Kế hoạch hoạt động trọng tâm',
      branch: 'Toàn thể CLB',
      roleOrContent: 'Biểu quyết thông qua kế hoạch & phân công 4 ban',
      votesFor: Math.max(1, userList.filter((u) => u.id !== 'bcn-root').length),
      totalVotes: Math.max(1, userList.filter((u) => u.id !== 'bcn-root').length)
    }
  ]);

  const [consensusPercent, setConsensusPercent] = useState('100');
  const [endHour, setEndHour] = useState('20');
  const [endMinute, setEndMinute] = useState('15');
  const [isPreviewMinutesOpen, setIsPreviewMinutesOpen] = useState(false);

  const absentCount = Math.max(0, totalSummoned - totalPresent);
  const attendancePercent = totalSummoned > 0 ? ((totalPresent / totalSummoned) * 100).toFixed(1) : '100';

  const handlePrintMinutes = () => {
    window.print();
  };

  const handleArchiveMinutesToClub = () => {
    if (!onSaveMinutesToArchive) return;
    const summaryText = `Số biên bản: ${docNumber} (${academicYear}) • Thời gian: ${startHour}g${startMinute}, ngày ${docDay}/${docMonth}/${docYear} • Địa điểm: ${location} • Chủ tọa: ${chairName} (${chairRole}) • Thư ký: ${secretaryName || 'Thư ký CLB'} • Sĩ số: ${totalPresent}/${totalSummoned} (${attendancePercent}%). Kết luận thống nhất ${consensusPercent}%.`;

    onSaveMinutesToArchive({
      title: `[Biên Bản ${docNumber}] ${meetingTitle}`,
      documentNumber: docNumber,
      academicYear,
      issuedDate: `${docDay}/${docMonth}/${docYear}`,
      proposedBy: chairName,
      proposedById: currentUser.id,
      department: 'Nhân sự & Kế hoạch' as DepartmentType,
      assignedDept: 'Nhân sự & Kế hoạch' as DepartmentType,
      description: summaryText,
      timeline: `${academicYear} · Ngày ${docDay}/${docMonth}/${docYear}`,
      targetAudience: 'Ban Chủ Nhiệm & Toàn thể Hội viên CLB',
      priority: 'high' as const,
      status: 'approved' as const,
      archivedAt: `${docDay}/${docMonth}/${docYear}`,
      createdAt: `${docDay}/${docMonth}/${docYear}`,
      budgetEstimate: 0,
      actionItems: discussions.map((d) => `${d.speaker}: ${d.content}`)
    });

    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    setBannerMsg(`Đã lưu Biên bản số "${docNumber}" (${academicYear}) vào Kho Lưu Trữ Văn Kiện CLB!`);
    setTimeout(() => setBannerMsg(null), 5000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="text-xs font-black uppercase tracking-widest text-[#8C3B1E]">
            Hội Sinh Viên Trường Đại Học An Giang • Hành Chính & Dân Chủ CLB
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#382215] font-serif-vintage tracking-tight">
            Khảo Sát Ý Kiến, Biểu Quyết & Biên Bản Cuộc Họp
          </h2>
          <p className="text-xs sm:text-sm text-[#4A3525] leading-relaxed">
            Tạo phiếu khảo sát đóng góp ý kiến (<strong>ẩn danh hoặc công khai danh tính</strong> tùy tính chất cuộc họp) và lập <strong>Biên bản cuộc họp chuẩn thể thức BCN CLB</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#F2E5C9] p-1.5 rounded-2xl border-2 border-[#382215] shadow-[3px_3px_0px_#382215] shrink-0">
          <button
            type="button"
            onClick={() => setSubTab('surveys')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition ${
              subTab === 'surveys' ? 'bg-[#C8532B] text-white' : 'text-[#382215] hover:bg-white/60'
            }`}
          >
            <Vote className="w-4 h-4" />
            <span>Khảo Sát & Biểu Quyết ({surveys.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('minutes')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition ${
              subTab === 'minutes' ? 'bg-[#245351] text-[#FFE29A]' : 'text-[#382215] hover:bg-white/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Tạo Biên Bản Cuộc Họp</span>
          </button>
        </div>
      </div>

      {bannerMsg && (
        <div className="p-4 rounded-2xl bg-[#FAF3E3] border-2 border-[#486A39] text-[#1E3A24] text-xs font-bold flex items-center justify-between shadow-[3px_3px_0px_#382215]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#486A39]" />
            <span>{bannerMsg}</span>
          </div>
          <button type="button" onClick={() => setBannerMsg(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =========================================================================
          TAB A: KHẢO SÁT, ĐÓNG GÓP Ý KIẾN & BIỂU QUYẾT
         ========================================================================= */}
      {subTab === 'surveys' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF3E3] p-4 rounded-2xl border-2 border-[#382215]">
            <div>
              <h3 className="font-black text-base text-[#382215] font-serif-vintage">
                Danh Sách Phiếu Khảo Sát & Biểu Quyết Đang Mở
              </h3>
              <p className="text-xs text-[#6E472B]">
                Hỗ trợ biểu quyết công khai danh tính hoặc ẩn danh tuyệt đối tùy theo tính chất từng phiên họp.
              </p>
            </div>

            {isBcnLeader && (
              <button
                type="button"
                onClick={() => setIsCreateSurveyOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#245351] hover:bg-[#193B39] text-[#FFE29A] font-black text-xs flex items-center gap-1.5 border-2 border-[#382215] shadow-[3px_3px_0px_#382215] cursor-pointer shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Tạo Form Khảo Sát / Biểu Quyết Mới</span>
              </button>
            )}
          </div>

          {surveys.length === 0 ? (
            <div className="p-10 text-center rounded-3xl bg-[#FAF3E3] border-2 border-dashed border-[#382215]/30 space-y-2">
              <Vote className="w-10 h-10 text-[#6E472B]/50 mx-auto" />
              <div className="font-black text-sm text-[#382215]">Chưa có phiếu khảo sát hay biểu quyết nào</div>
              <p className="text-xs text-[#6E472B]">
                Ban Chủ Nhiệm có thể bấm nút <strong>"Tạo Form Khảo Sát / Biểu Quyết Mới"</strong> để lấy ý kiến toàn thể CLB.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {surveys.map((poll) => {
                const isAnon = poll.anonymityMode === 'anonymous';
                const alreadySubmitted = !isAnon && poll.responses.some((r) => r.respondentId === currentUser.id);
                const draftAns = userDraftAnswers[poll.id] || {};

                return (
                  <div
                    key={poll.id}
                    className="rounded-3xl p-6 border-3 border-[#382215] bg-[#FAF3E3] shadow-[5px_5px_0px_#382215] space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-[#382215]/15">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border border-[#382215] flex items-center gap-1 ${
                              isAnon ? 'bg-[#382215] text-[#FFE29A]' : 'bg-[#E5F0E4] text-[#1E3A24]'
                            }`}
                          >
                            {isAnon ? <Lock className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                            <span>{isAnon ? 'Biểu quyết Ẩn danh 100%' : 'Công khai danh tính'}</span>
                          </span>
                          <span className="text-[11px] font-bold text-[#8C3B1E]">{poll.academicYear}</span>
                        </div>
                        <h4 className="font-black text-lg text-[#382215] font-serif-vintage">{poll.title}</h4>
                        {poll.description && <p className="text-xs text-[#5C432C]">{poll.description}</p>}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-3 py-1 rounded-xl bg-white border border-[#382215] text-xs font-black text-[#245351]">
                          {poll.responses.length} lượt tham gia
                        </span>
                        {isBcnLeader && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Xóa phiếu khảo sát này?')) {
                                syncSurveysToServer(surveys.filter((s) => s.id !== poll.id));
                              }
                            }}
                            className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-300 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Khu vực thành viên điền câu trả lời */}
                    {!isAlumniViewerOnly && (
                      <div className="space-y-3 bg-[#FFFDF8] p-4 rounded-2xl border-2 border-[#382215]/20">
                        {poll.questions.map((q, qIdx) => (
                          <div key={q.id} className="space-y-1.5 text-xs">
                            <label className="block font-black text-[#382215]">
                              Câu {qIdx + 1}: {q.text} {q.required && <span className="text-rose-600">*</span>}
                            </label>

                            {q.type === 'single_choice' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {q.options.map((opt, oIdx) => {
                                  const selected = draftAns[q.id] === opt;
                                  return (
                                    <button
                                      key={oIdx}
                                      type="button"
                                      onClick={() =>
                                        setUserDraftAnswers((prev) => ({
                                          ...prev,
                                          [poll.id]: { ...draftAns, [q.id]: opt }
                                        }))
                                      }
                                      className={`p-2.5 rounded-xl border-2 text-left font-bold cursor-pointer transition ${
                                        selected
                                          ? 'bg-[#245351] text-white border-[#382215]'
                                          : 'bg-[#FAF3E3] text-[#382215] border-[#382215]/20'
                                      }`}
                                    >
                                      {selected ? '● ' : '○ '}
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {q.type === 'text' && (
                              <textarea
                                rows={2}
                                value={(draftAns[q.id] as string) || ''}
                                onChange={(e) =>
                                  setUserDraftAnswers((prev) => ({
                                    ...prev,
                                    [poll.id]: { ...draftAns, [q.id]: e.target.value }
                                  }))
                                }
                                placeholder="Nhập ý kiến đóng góp xây dựng của bạn..."
                                className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-white text-xs"
                              />
                            )}
                          </div>
                        ))}

                        <div className="pt-2 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[#6E472B]">
                            {isAnon
                              ? '🔒 Hệ thống không lưu tên hay MSSV của bạn khi gửi phiếu này.'
                              : `👤 Gửi dưới tên: ${currentUser.name} (${currentUser.studentId})`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSubmitSurveyResponse(poll)}
                            className="px-4 py-2 rounded-xl bg-[#C8532B] hover:bg-[#A63E1B] text-white font-black text-xs flex items-center gap-1.5 border-2 border-[#382215] shadow-[2px_2px_0px_#382215] cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{alreadySubmitted ? 'Cập Nhật Ý Kiến' : 'Gửi Biểu Quyết & Góp Ý'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Bảng tổng hợp kết quả biểu quyết trực quan */}
                    {poll.responses.length > 0 && (
                      <div className="p-4 rounded-2xl bg-[#F2E5C9] border-2 border-[#382215]/30 space-y-3 text-xs">
                        <div className="flex items-center gap-1.5 font-black text-[#245351] uppercase">
                          <BarChart3 className="w-4 h-4" />
                          <span>Kết Quả Tổng Hợp ({poll.responses.length} phiếu)</span>
                        </div>

                        {poll.questions.map((q) => {
                          if (q.type === 'single_choice') {
                            return (
                              <div key={q.id} className="space-y-1.5">
                                <div className="font-bold text-[#382215]">{q.text}</div>
                                {q.options.map((opt) => {
                                  const count = poll.responses.filter((r) => r.answers[q.id] === opt).length;
                                  const pct = Math.round((count / poll.responses.length) * 100);
                                  return (
                                    <div key={opt} className="space-y-0.5">
                                      <div className="flex justify-between text-[11px] font-bold">
                                        <span>{opt}</span>
                                        <span>{count} phiếu ({pct}%)</span>
                                      </div>
                                      <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-[#382215]/30">
                                        <div className="h-full bg-[#245351]" style={{ width: `${pct}%` }} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          }

                          const textComments = poll.responses
                            .map((r) => ({
                              author: isAnon ? 'Thành viên ẩn danh' : `${r.respondentName} (${r.respondentStudentId})`,
                              text: String(r.answers[q.id] || '').trim()
                            }))
                            .filter((item) => item.text);

                          if (textComments.length === 0) return null;
                          return (
                            <div key={q.id} className="space-y-1.5 pt-1">
                              <div className="font-bold text-[#382215]">{q.text}</div>
                              {textComments.map((c, idx) => (
                                <div key={idx} className="p-2.5 rounded-xl bg-white border border-[#382215]/20">
                                  <div className="text-[10px] font-black text-[#8C3B1E]">{c.author}:</div>
                                  <p className="text-[#382215] mt-0.5">"{c.text}"</p>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB B: TRÌNH TẠO BIÊN BẢN CUỘC HỌP THEO ĐÚNG MẪU BCN CLB ĐỌC SÁCH AGU
         ========================================================================= */}
      {subTab === 'minutes' && (
        <div className="space-y-6">
          <div className="rounded-3xl p-6 sm:p-8 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#382215]/20 pb-4">
              <div>
                <div className="text-[11px] font-black uppercase text-[#C8532B]">
                  Biểu Mẫu Hành Chính Chuẩn • BCN CLB Đọc và Giới Thiệu Sách AGU
                </div>
                <h3 className="text-xl font-black text-[#382215] font-serif-vintage">
                  Soạn Thảo Biên Bản Hội Nghị / Cuộc Họp
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPreviewMinutesOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#245351] text-[#FFE29A] font-black text-xs flex items-center gap-1.5 border-2 border-[#382215] shadow-[2px_2px_0px_#382215] cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Xem Văn Bản Chuẩn & In PDF</span>
                </button>

                {isBcnLeader && onSaveMinutesToArchive && (
                  <button
                    type="button"
                    onClick={handleArchiveMinutesToClub}
                    className="px-4 py-2 rounded-xl bg-[#C8532B] text-white font-black text-xs flex items-center gap-1.5 border-2 border-[#382215] shadow-[2px_2px_0px_#382215] cursor-pointer"
                  >
                    <FolderArchive className="w-4 h-4 text-[#FFE29A]" />
                    <span>Lưu Vào Kho Văn Kiện CLB</span>
                  </button>
                )}
              </div>
            </div>

            {/* 1. Số hiệu, Năm học & Thời gian ban hành */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-black text-[#382215] mb-1">Số biên bản *</label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="VD: 05/BB-CLB"
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#382215]/30 bg-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-black text-[#382215] mb-1">Năm học phát hành *</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="VD: Năm học 2026 - 2027"
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#382215]/30 bg-white font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-black text-[#382215] mb-1">Ngày / Tháng / Năm lập biên bản *</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={docDay}
                    onChange={(e) => setDocDay(e.target.value)}
                    placeholder="Ngày"
                    className="px-3 py-2 rounded-xl border border-[#382215]/30 bg-white text-center font-bold"
                  />
                  <input
                    type="text"
                    value={docMonth}
                    onChange={(e) => setDocMonth(e.target.value)}
                    placeholder="Tháng"
                    className="px-3 py-2 rounded-xl border border-[#382215]/30 bg-white text-center font-bold"
                  />
                  <input
                    type="text"
                    value={docYear}
                    onChange={(e) => setDocYear(e.target.value)}
                    placeholder="Năm"
                    className="px-3 py-2 rounded-xl border border-[#382215]/30 bg-white text-center font-bold"
                  />
                </div>
              </div>
            </div>

            {/* 2. Tên cuộc họp, Giờ bắt đầu & Địa điểm */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block font-black text-[#382215] mb-1">Tên Hội nghị / Cuộc họp *</label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#382215]/30 bg-white font-bold"
                />
              </div>

              <div>
                <label className="block font-black text-[#382215] mb-1">Thời gian bắt đầu (Giờ : Phút)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    className="w-16 px-2.5 py-2 rounded-xl border bg-white text-center font-bold"
                  />
                  <span className="font-black">giờ</span>
                  <input
                    type="text"
                    value={startMinute}
                    onChange={(e) => setStartMinute(e.target.value)}
                    className="w-16 px-2.5 py-2 rounded-xl border bg-white text-center font-bold"
                  />
                  <span className="font-black">phút</span>
                </div>
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-black text-[#382215] mb-1">Địa điểm tổ chức cuộc họp *</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-[#382215]/30 bg-white"
              />
            </div>

            {/* 3. Thành phần tham dự */}
            <div className="p-4 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215]/20 space-y-3 text-xs">
              <div className="font-black text-[#245351] uppercase">I. Thành Phần Tham Dự & Sĩ Số</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Họ tên Chủ tọa *</label>
                  <input
                    type="text"
                    value={chairName}
                    onChange={(e) => setChairName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Chức vụ Chủ tọa *</label>
                  <input
                    type="text"
                    value={chairRole}
                    onChange={(e) => setChairRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Họ tên Thư ký cuộc họp *</label>
                  <input
                    type="text"
                    value={secretaryName}
                    onChange={(e) => setSecretaryName(e.target.value)}
                    placeholder="Nhập họ tên Thư ký..."
                    className="w-full px-3 py-2 rounded-xl border bg-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Khách mời / Đại biểu (nếu có)</label>
                <input
                  type="text"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-white"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold mb-1">Tổng triệu tập</label>
                  <input
                    type="number"
                    value={totalSummoned}
                    onChange={(e) => setTotalSummoned(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Có mặt (Tỷ lệ: {attendancePercent}%)</label>
                  <input
                    type="number"
                    value={totalPresent}
                    onChange={(e) => setTotalPresent(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border bg-white font-bold text-emerald-800"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold mb-1">Vắng ({absentCount} hội viên) — Ghi rõ lý do</label>
                  <input
                    type="text"
                    value={absentReasonNote}
                    onChange={(e) => setAbsentReasonNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 4. Nội dung cuộc họp & Thảo luận */}
            <div className="p-4 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215]/20 space-y-3 text-xs">
              <div className="font-black text-[#245351] uppercase">II. Nội Dung Cuộc Họp & Ý Kiến Thảo Luận</div>
              <div>
                <label className="block font-bold mb-1">1. Tuyên bố lý do, giới thiệu đại biểu và thông qua chương trình:</label>
                <textarea
                  rows={2}
                  value={openingReason}
                  onChange={(e) => setOpeningReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-white"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold">2. Các ý kiến trao đổi, thảo luận tại cuộc họp:</label>
                  <button
                    type="button"
                    onClick={() =>
                      setDiscussions((prev) => [
                        ...prev,
                        { id: `disc-${Date.now()}`, speaker: '', content: '' }
                      ])
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#245351] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Thêm ý kiến
                  </button>
                </div>

                {discussions.map((d, idx) => (
                  <div key={d.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
                    <input
                      type="text"
                      value={d.speaker}
                      onChange={(e) =>
                        setDiscussions((prev) =>
                          prev.map((item) => (item.id === d.id ? { ...item, speaker: e.target.value } : item))
                        )
                      }
                      placeholder={`Họ tên / Bộ phận (${idx + 1})`}
                      className="sm:col-span-4 px-3 py-2 rounded-xl border bg-white font-bold"
                    />
                    <input
                      type="text"
                      value={d.content}
                      onChange={(e) =>
                        setDiscussions((prev) =>
                          prev.map((item) => (item.id === d.id ? { ...item, content: e.target.value } : item))
                        )
                      }
                      placeholder="Nội dung ý kiến đóng góp, thảo luận..."
                      className="sm:col-span-7 px-3 py-2 rounded-xl border bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setDiscussions((prev) => prev.filter((item) => item.id !== d.id))}
                      className="sm:col-span-1 p-2 text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* 3. Bảng Biểu Quyết / Quyết Nghị */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold">3. Bảng Biểu Quyết / Quyết Nghị của Hội Nghị:</label>
                  <button
                    type="button"
                    onClick={() =>
                      setVoteRows((prev) => [
                        ...prev,
                        {
                          id: `vr-${Date.now()}`,
                          fullName: '',
                          branch: 'CLB Đọc Sách AGU',
                          roleOrContent: '',
                          votesFor: totalPresent,
                          totalVotes: totalPresent
                        }
                      ])
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#C8532B] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Thêm dòng biểu quyết
                  </button>
                </div>

                {voteRows.map((row, idx) => (
                  <div key={row.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-[#FAF3E3] p-2.5 rounded-xl border">
                    <input
                      type="text"
                      value={row.fullName}
                      onChange={(e) =>
                        setVoteRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, fullName: e.target.value } : r))
                        )
                      }
                      placeholder={`${idx + 1}. Họ và tên / Nội dung`}
                      className="sm:col-span-3 px-2.5 py-1.5 rounded-lg border bg-white font-bold"
                    />
                    <input
                      type="text"
                      value={row.branch}
                      onChange={(e) =>
                        setVoteRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, branch: e.target.value } : r))
                        )
                      }
                      placeholder="Chi hội"
                      className="sm:col-span-2 px-2.5 py-1.5 rounded-lg border bg-white"
                    />
                    <input
                      type="text"
                      value={row.roleOrContent}
                      onChange={(e) =>
                        setVoteRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, roleOrContent: e.target.value } : r))
                        )
                      }
                      placeholder="Chức vụ / Nội dung"
                      className="sm:col-span-4 px-2.5 py-1.5 rounded-lg border bg-white"
                    />
                    <div className="sm:col-span-2 flex items-center gap-1">
                      <input
                        type="number"
                        value={row.votesFor}
                        onChange={(e) =>
                          setVoteRows((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, votesFor: Number(e.target.value) } : r))
                          )
                        }
                        className="w-12 px-1.5 py-1.5 rounded-lg border bg-white text-center font-bold"
                      />
                      <span>/</span>
                      <input
                        type="number"
                        value={row.totalVotes}
                        onChange={(e) =>
                          setVoteRows((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, totalVotes: Number(e.target.value) } : r))
                          )
                        }
                        className="w-12 px-1.5 py-1.5 rounded-lg border bg-white text-center font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setVoteRows((prev) => prev.filter((r) => r.id !== row.id))}
                      className="sm:col-span-1 text-rose-600 flex justify-center cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Kết luận & Giờ kết thúc */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-black text-[#382215] mb-1">III. Tỷ lệ thống nhất chung của Hội nghị (%)</label>
                <input
                  type="text"
                  value={consensusPercent}
                  onChange={(e) => setConsensusPercent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#382215]/30 bg-white font-black text-emerald-800"
                />
              </div>

              <div>
                <label className="block font-black text-[#382215] mb-1">Thời gian kết thúc cuộc họp</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    className="w-16 px-2.5 py-2 rounded-xl border bg-white text-center font-bold"
                  />
                  <span className="font-black">giờ</span>
                  <input
                    type="text"
                    value={endMinute}
                    onChange={(e) => setEndMinute(e.target.value)}
                    className="w-16 px-2.5 py-2 rounded-xl border bg-white text-center font-bold"
                  />
                  <span className="font-black">phút cùng ngày</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TẠO KHẢO SÁT MỚI */}
      {isCreateSurveyOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#FAF3E3] rounded-3xl border-3 border-[#382215] shadow-[6px_6px_0px_#382215] max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-[#245351] text-white p-4.5 flex items-center justify-between border-b-2 border-[#382215]">
              <h4 className="font-black text-base font-serif-vintage">
                Tạo Phiếu Khảo Sát, Đóng Góp Ý Kiến & Biểu Quyết
              </h4>
              <button type="button" onClick={() => setIsCreateSurveyOpen(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewSurvey} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-black text-[#382215] mb-1">Tiêu đề phiếu khảo sát / biểu quyết *</label>
                <input
                  type="text"
                  required
                  value={surveyTitle}
                  onChange={(e) => setSurveyTitle(e.target.value)}
                  placeholder="Ví dụ: Lấy ý kiến tổ chức Ngày hội Văn hóa đọc Học kỳ II..."
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#382215]/30 bg-white font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-black text-[#382215] mb-1">Năm học / Đợt khảo sát *</label>
                  <input
                    type="text"
                    required
                    value={surveyAcademicYear}
                    onChange={(e) => setSurveyAcademicYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-black text-[#382215] mb-1">Chế độ danh tính người góp ý *</label>
                  <select
                    value={surveyAnonymity}
                    onChange={(e) => setSurveyAnonymity(e.target.value as 'anonymous' | 'identified')}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#382215] bg-white font-bold"
                  >
                    <option value="identified">👤 Công khai danh tính (Ghi nhận họ tên & MSSV)</option>
                    <option value="anonymous">🎭 Ẩn danh tuyệt đối (Bảo mật danh tính 100%)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#382215] mb-1">Mô tả mục đích khảo sát</label>
                <textarea
                  rows={2}
                  value={surveyDesc}
                  onChange={(e) => setSurveyDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-white"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-[#382215]">Danh sách câu hỏi khảo sát:</span>
                  <button
                    type="button"
                    onClick={handleAddDraftQuestion}
                    className="px-3 py-1 rounded-lg bg-[#C8532B] text-white font-bold cursor-pointer"
                  >
                    + Thêm câu hỏi
                  </button>
                </div>

                {draftQuestions.map((q, idx) => (
                  <div key={q.id} className="p-3.5 rounded-2xl bg-white border-2 border-[#382215]/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#C8532B]">Câu {idx + 1}:</span>
                      <input
                        type="text"
                        required
                        value={q.text}
                        onChange={(e) =>
                          setDraftQuestions((prev) =>
                            prev.map((item) => (item.id === q.id ? { ...item, text: e.target.value } : item))
                          )
                        }
                        placeholder="Nhập nội dung câu hỏi..."
                        className="flex-1 px-2.5 py-1.5 rounded-lg border font-bold"
                      />
                      <select
                        value={q.type}
                        onChange={(e) =>
                          setDraftQuestions((prev) =>
                            prev.map((item) =>
                              item.id === q.id ? { ...item, type: e.target.value as SurveyQuestionItem['type'] } : item
                            )
                          )
                        }
                        className="px-2 py-1.5 rounded-lg border bg-[#FAF3E3] font-bold"
                      >
                        <option value="single_choice">Trắc nghiệm chọn 1</option>
                        <option value="text">Tự luận góp ý</option>
                      </select>
                    </div>

                    {q.type === 'single_choice' && (
                      <input
                        type="text"
                        value={q.options.join(', ')}
                        onChange={(e) =>
                          setDraftQuestions((prev) =>
                            prev.map((item) =>
                              item.id === q.id
                                ? { ...item, options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }
                                : item
                            )
                          )
                        }
                        placeholder="Các phương án cách nhau bởi dấu phẩy (VD: Tán thành, Không tán thành)"
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-[#FAF3E3]/50"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateSurveyOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-200 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#245351] text-[#FFE29A] font-black cursor-pointer"
                >
                  Phát Hành Khảo Sát
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XEM TRƯỚC & IN PDF BIÊN BẢN CUỘC HỌP CHUẨN THỂ THỨC HÀNH CHÍNH */}
      {isPreviewMinutesOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="bg-[#382215] text-white px-5 py-3.5 flex items-center justify-between">
              <span className="font-bold text-sm">Bản Xem Trước Biên Bản Cuộc Họp (Khổ A4 • Times New Roman)</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintMinutes}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>In / Lưu PDF</span>
                </button>
                <button type="button" onClick={() => setIsPreviewMinutesOpen(false)} className="cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 sm:p-12 overflow-y-auto text-black leading-relaxed" style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '14pt' }}>
              <div className="grid grid-cols-2 gap-4 text-center mb-4">
                <div>
                  <div className="font-bold uppercase text-[12pt]">HỘI SINH VIÊN TRƯỜNG ĐẠI HỌC AN GIANG</div>
                  <div className="font-bold uppercase text-[12pt]">BCN CLB ĐỌC VÀ GIỚI THIỆU SÁCH</div>
                  <div className="font-bold">***</div>
                  <div className="mt-1 text-[13pt]">Số: {docNumber}</div>
                  <div className="italic text-[12pt]">({academicYear})</div>
                </div>
                <div className="flex flex-col justify-between">
                  <div className="font-bold uppercase text-[12pt]">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="font-bold underline text-[13pt]">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="italic mt-2 text-[13pt]">
                    An Giang, ngày {docDay} tháng {docMonth} năm {docYear}
                  </div>
                </div>
              </div>

              <div className="text-center my-6">
                <div className="font-bold uppercase text-[15pt]">BIÊN BẢN</div>
                <div className="font-bold text-[14pt]">{meetingTitle}</div>
                <div>--------------------------------------------</div>
              </div>

              <div className="space-y-2.5 text-justify">
                <p>
                  <strong>1. Thời gian:</strong> Vào lúc {startHour} giờ {startMinute} phút, ngày {docDay} tháng {docMonth} năm {docYear}.
                </p>
                <p>
                  <strong>2. Địa điểm:</strong> {location}.
                </p>
                <p>
                  <strong>3. Thành phần tham dự:</strong>
                </p>
                <ul className="list-none pl-4 space-y-1">
                  <li>- Chủ tọa: {chairName} - {chairRole}.</li>
                  <li>- Thư ký: {secretaryName || '[Họ và tên thư ký]'} - Thư ký cuộc họp.</li>
                  <li>- Khách mời / Đại biểu (nếu có): {guests}.</li>
                  <li>
                    - Tổng số hội viên/thành viên triệu tập: {totalSummoned} hội viên. Có mặt: {totalPresent} hội viên (đạt tỷ lệ {attendancePercent}%). Vắng: {absentReasonNote}.
                  </li>
                </ul>

                <p className="font-bold pt-2">II. NỘI DUNG CUỘC HỌP:</p>
                <p>
                  <strong>1. Tuyên bố lý do, giới thiệu đại biểu và thông qua chương trình cuộc họp:</strong>
                </p>
                <p className="pl-4">{openingReason}</p>

                <p>
                  <strong>2. Các ý kiến trao đổi, thảo luận tại cuộc họp:</strong>
                </p>
                <div className="pl-4 space-y-1">
                  {discussions.map((d) => (
                    <p key={d.id}>
                      - Ý kiến của {d.speaker || '...'}: {d.content || '...'}
                    </p>
                  ))}
                </div>

                <p>
                  <strong>3. Biểu quyết / Quyết nghị của hội nghị:</strong>
                </p>
                <p className="pl-4">
                  Hội nghị tiến hành biểu quyết đối với các nội dung/danh sách dự kiến. Kết quả cụ thể như sau:
                </p>

                <table className="w-full border-collapse border border-black text-[12pt] my-3">
                  <thead>
                    <tr className="bg-stone-100">
                      <th className="border border-black px-2 py-1.5 text-center w-12">TT</th>
                      <th className="border border-black px-2 py-1.5 text-left">Họ và tên / Nội dung</th>
                      <th className="border border-black px-2 py-1.5 text-left">Chi hội</th>
                      <th className="border border-black px-2 py-1.5 text-left">Chức vụ / Nội dung</th>
                      <th className="border border-black px-2 py-1.5 text-center">Kết quả biểu quyết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voteRows.map((row, idx) => {
                      const pct = row.totalVotes > 0 ? ((row.votesFor / row.totalVotes) * 100).toFixed(1) : '100';
                      return (
                        <tr key={row.id}>
                          <td className="border border-black px-2 py-1.5 text-center">{idx + 1}</td>
                          <td className="border border-black px-2 py-1.5">{row.fullName}</td>
                          <td className="border border-black px-2 py-1.5">{row.branch}</td>
                          <td className="border border-black px-2 py-1.5">{row.roleOrContent}</td>
                          <td className="border border-black px-2 py-1.5 text-center">
                            {row.votesFor}/{row.totalVotes} ({pct}%)
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <p className="font-bold pt-2">III. KẾT LUẬN CUỘC HỌP / THỐNG NHẤT CHUNG:</p>
                <p>
                  Hội nghị thống nhất {consensusPercent}% với các nội dung đã thảo luận và quyết nghị như trên. Giao các đồng chí có liên quan hoàn chỉnh hồ sơ, thủ tục trình Ban Thư ký Hội Sinh viên Trường Đại học An Giang xem xét quyết định.
                </p>
                <p>
                  Cuộc họp kết thúc vào lúc {endHour} giờ {endMinute} phút cùng ngày./.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center mt-8 pt-2">
                <div>
                  <div className="font-bold uppercase">THƯ KÝ</div>
                  <div className="italic text-[12pt]">(Đã ký)</div>
                  <div className="font-bold mt-16">{secretaryName || '[Họ và tên thư ký]'}</div>
                </div>
                <div>
                  <div className="font-bold uppercase">CHỦ TỌA</div>
                  <div className="italic text-[12pt]">(Đã ký)</div>
                  <div className="font-bold mt-16">{chairName}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

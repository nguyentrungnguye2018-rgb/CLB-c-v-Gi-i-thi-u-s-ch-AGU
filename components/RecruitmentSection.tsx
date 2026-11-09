import React, { useState } from 'react';
import { 
  UserPlus, 
  Plus, 
  Trash2, 
  Copy, 
  ExternalLink, 
  HelpCircle, 
  Check, 
  Send, 
  FileText,
  Crown,
  Inbox,
  CheckCircle2,
  X,
  UserCheck,
  ArrowRightLeft,
  Users2,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  RecruitmentQuestion, 
  RecruitmentApplication, 
  UserProfile, 
  DepartmentType 
} from '../types';
import { INITIAL_RECRUITMENT_QUESTIONS } from '../data/mockData';
import { isMasterRootUser, isClubPresidentUser, isClubVicePresidentUser } from '../utils/governance';

interface RecruitmentSectionProps {
  currentUser: UserProfile;
  isMasterRoot: boolean;
  questions: RecruitmentQuestion[];
  applications: RecruitmentApplication[];
  userList?: UserProfile[];
  initialSubTab?: 'review' | 'builder' | 'candidate_form';
  onAddQuestion: (q: Omit<RecruitmentQuestion, 'id'>) => void;
  onDeleteQuestion: (id: string) => void;
  onRestoreDefaultQuestions?: () => void;
  onSubmitApplication: (app: Omit<RecruitmentApplication, 'id' | 'status' | 'submittedAt'>) => void;
  onReviewApplication: (appId: string, status: 'approved' | 'rejected', notes: string) => void;
  onApproveDepartment?: (targetUserId: string, department: DepartmentType, note?: string) => void;
}

export const RecruitmentSection: React.FC<RecruitmentSectionProps> = ({
  currentUser,
  isMasterRoot,
  questions,
  applications,
  userList = [],
  initialSubTab,
  onAddQuestion,
  onDeleteQuestion,
  onRestoreDefaultQuestions,
  onSubmitApplication,
  onReviewApplication,
  onApproveDepartment
}) => {
  const isPresident = isClubPresidentUser(currentUser);
  const isVicePresident = isClubVicePresidentUser(currentUser);
  const isRoot = isMasterRootUser(currentUser) || isMasterRoot;
  const isBcn = isPresident || isVicePresident || isRoot;
  const isSubDeptLeader = !isBcn && (currentUser.departmentRole === 'leader' || currentUser.departmentRole === 'vice_leader' || currentUser.role === 'lead');

  const activeQuestions = questions.length > 0 ? questions : INITIAL_RECRUITMENT_QUESTIONS;

  const [activeSubTab, setActiveSubTab] = useState<'review' | 'builder' | 'candidate_form'>(
    initialSubTab || (!isBcn && !isSubDeptLeader ? 'candidate_form' : 'review')
  );
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShareBox, setShowShareBox] = useState(false);
  const [filterDept, setFilterDept] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<RecruitmentApplication | null>(null);
  const [reviewNoteInput, setReviewNoteInput] = useState('');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedSuccessName, setSubmittedSuccessName] = useState<string | null>(null);

  // Form states for creating new question
  const [newQText, setNewQText] = useState('');
  const [newQType, setNewQType] = useState<'multiple_choice' | 'short_answer'>('short_answer');
  const [newQOptions, setNewQOptions] = useState('Lựa chọn A, Lựa chọn B, Lựa chọn C');
  const [newQRequired, setNewQRequired] = useState<boolean>(true);

  // Candidate submission form
  const [candName, setCandName] = useState('');
  const [candNickname, setCandNickname] = useState('');
  const [candStudentId, setCandStudentId] = useState('');
  const [candFaculty, setCandFaculty] = useState('Khoa Sư phạm');
  const [candEmail, setCandEmail] = useState('');
  const [candPhone, setCandPhone] = useState('');
  const [candDept, setCandDept] = useState<DepartmentType>('Nội dung');
  const [candAnswers, setCandAnswers] = useState<Record<string, string>>({});

  const recruitmentShareUrl = `${window.location.origin}/?apply=1`;

  const copyTextSafely = async (textToCopy: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
        return true;
      }
    } catch {
      // Fallback below for iframe restrictions
    }
    try {
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textArea);
      return ok;
    } catch {
      return false;
    }
  };

  const handleCopyLink = async () => {
    await copyTextSafely(recruitmentShareUrl);
    setCopiedLink(true);
    setShowShareBox(true);
    setStatusBanner('Đã sao chép đường dẫn Form Tuyển Thành Viên! Bạn có thể dán gửi ngay cho các bạn sinh viên.');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleCreateQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQText.trim()) return;

    onAddQuestion({
      text: newQText.trim(),
      type: newQType,
      options: newQType === 'multiple_choice' 
        ? newQOptions.split(',').map(s => s.trim()).filter(Boolean) 
        : undefined,
      required: newQRequired
    });

    setNewQText('');
    setNewQRequired(true);
    setStatusBanner('Đã thêm câu hỏi mới vào bộ đề tuyển thành viên!');
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.5 } });
  };

  const handleCandidateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!candName.trim() || !candStudentId.trim()) {
      setFormError('Vui lòng điền đầy đủ Họ tên và Mã số sinh viên (*)');
      return;
    }

    // Check that all required questions have been answered
    const unansweredRequired = activeQuestions.filter(q => q.required && (!candAnswers[q.id] || !candAnswers[q.id].trim()));
    if (unansweredRequired.length > 0) {
      setFormError(`Vui lòng trả lời câu hỏi bắt buộc: "${unansweredRequired[0].text}"`);
      return;
    }

    const submittedName = candName.trim();

    onSubmitApplication({
      fullName: submittedName,
      nickname: candNickname.trim() || undefined,
      studentId: candStudentId.toUpperCase().trim(),
      faculty: candFaculty,
      email: candEmail.trim() || `${candStudentId.toLowerCase().trim()}@student.agu.edu.vn`,
      phone: candPhone.trim() || 'Đang cập nhật',
      desiredDept: candDept,
      answers: candAnswers
    });

    confetti({
      particleCount: 80,
      spread: 65,
      origin: { y: 0.5 }
    });

    setSubmittedSuccessName(submittedName);
    setStatusBanner(`Đã gửi đơn ứng tuyển của "${submittedName}" vào Hòm thư chờ duyệt thành công!`);
    setCandName('');
    setCandNickname('');
    setCandStudentId('');
    setCandEmail('');
    setCandPhone('');
    setCandAnswers({});
    if (isBcn) {
      setTimeout(() => {
        setSubmittedSuccessName(null);
        setActiveSubTab('review');
      }, 2200);
    }
  };

  const handleApprove = (app: RecruitmentApplication) => {
    onReviewApplication(
      app.id,
      'approved',
      reviewNoteInput || 'Đạt vòng tuyển chọn! Chào mừng bạn trở thành thành viên CLB.'
    );
    setSelectedApp(null);
    setReviewNoteInput('');
    setStatusBanner(`Đã duyệt "${app.fullName}" vào Ban ${app.desiredDept}. Đơn đã được dọn khỏi hòm thư chờ duyệt!`);
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.4 } });
    setTimeout(() => setStatusBanner(null), 4000);
  };

  const handleReject = (app: RecruitmentApplication) => {
    onReviewApplication(
      app.id,
      'rejected',
      reviewNoteInput || 'Hồ sơ chưa phù hợp trong đợt này.'
    );
    setSelectedApp(null);
    setReviewNoteInput('');
    setStatusBanner(`Đã từ chối và dọn đơn của "${app.fullName}" khỏi hòm thư chờ duyệt.`);
    setTimeout(() => setStatusBanner(null), 4000);
  };

  // ONLY show PENDING applications in the review queue! Approved/rejected ones vanish immediately!
  const pendingApps = applications.filter(
    a => a.status === 'pending' && (filterDept === 'all' || a.desiredDept === filterDept)
  );

  // Sub-department leader view: "Xác Nhận Vào Nhóm"
  if (isSubDeptLeader) {
    const myDept = currentUser.department;
    const pendingMembersInMyDept = userList.filter(
      u => (u.department === myDept || u.requestedDepartment === myDept) &&
           (u.departmentStatus === 'pending_approval' || u.departmentStatus === 'pending_transfer')
    );

    const approvedApplicantsInMyDept = applications.filter(
      a => a.status === 'approved' && a.desiredDept === myDept
    );

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header for Trưởng/Phó Nhóm */}
        <div className="glass-vintage p-6 border-2 border-[#382215]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="text-xs font-extrabold uppercase tracking-widest text-[#8C3B1E] flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-[#8C3B1E]" />
              <span>Xác Nhận Thành Viên Vào Ban Chuyên Môn</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-serif-vintage text-[#382215] tracking-tight">
              Xác Nhận Vào Ban {myDept}
            </h2>
            <p className="text-xs sm:text-sm text-[#4A3525] leading-relaxed">
              Quyền hạn của Trưởng nhóm & Phó nhóm <strong>Ban {myDept}</strong>: Các ứng viên đã được Chủ nhiệm & Phó Chủ nhiệm CLB duyệt sơ tuyển, sau khi tạo tài khoản và chọn Ban {myDept}, sẽ xuất hiện tại đây để bạn bấm <strong>Xác nhận vào nhóm</strong>.
            </p>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-[#F2E5C9] border border-[#382215]/20 text-xs font-bold text-[#382215]">
            Trưởng/Phó Ban: <strong>{currentUser.name}</strong>
          </div>
        </div>

        {statusBanner && (
          <div className="p-4 rounded-xl bg-[#FAF3E3] border-2 border-[#486A39] text-[#2B1D14] text-xs sm:text-sm flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#486A39] shrink-0" />
              <span className="font-bold">{statusBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-[#6E472B] hover:text-[#382215] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Section 1: Thành viên chờ xác nhận vào nhóm */}
        <div className="glass-vintage p-5 sm:p-6 border-2 border-[#382215]/25 space-y-4">
          <div className="flex items-center justify-between border-b border-[#382215]/15 pb-3">
            <div className="flex items-center gap-2">
              <Users2 className="w-5 h-5 text-[#C8532B]" />
              <h3 className="font-black text-base text-[#382215] font-serif-vintage">
                Danh Sách Chờ Xác Nhận Vào Ban {myDept} ({pendingMembersInMyDept.length})
              </h3>
            </div>
            <span className="text-xs font-semibold text-[#6E472B]">
              Xác nhận xong tự động vào ban & dọn sạch hòm thư
            </span>
          </div>

          {pendingMembersInMyDept.length === 0 ? (
            <div className="py-10 px-4 text-center rounded-xl bg-[#F2E5C9]/40 border border-dashed border-[#382215]/25 space-y-2">
              <Inbox className="w-9 h-9 text-[#6E472B]/60 mx-auto" />
              <h4 className="font-bold text-sm text-[#382215]">
                Hòm thư xác nhận của Ban {myDept} hiện đang trống (0)
              </h4>
              <p className="text-xs text-[#6E472B] max-w-md mx-auto">
                Hiện không có thành viên nào đang chờ xác nhận hoặc chuyển nhóm vào Ban {myDept}. Hòm thư hoàn toàn sạch sẽ, gọn gàng!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {pendingMembersInMyDept.map(member => {
                const isTransfer = member.departmentStatus === 'pending_transfer';
                return (
                  <div
                    key={member.id}
                    className="p-4 rounded-xl bg-[#FFFDF7] border-2 border-[#382215]/20 shadow-xs flex flex-col justify-between gap-3 hover:border-[#C8532B] transition"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-12 h-12 rounded-xl object-cover border border-[#382215]/30 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <h4 className="font-bold text-sm text-[#382215] truncate">
                            {member.name}
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isTransfer
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}>
                            {isTransfer ? 'Yêu cầu chuyển nhóm' : 'Ứng viên mới đăng ký'}
                          </span>
                        </div>
                        {member.nickname && (
                          <div className="text-xs text-[#C8532B] italic font-semibold">
                            "{member.nickname}"
                          </div>
                        )}
                        <div className="text-xs text-[#6E472B] mt-0.5">
                          MSSV: <span className="font-mono font-bold">{member.studentId}</span> · {member.faculty}
                        </div>
                        {isTransfer && member.transferFromDept && (
                          <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg mt-1 border border-amber-200">
                            Chuyển từ: <strong>Ban {member.transferFromDept}</strong> · Lý do: {member.transferReason || 'Điều chỉnh nguyện vọng'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-[#382215]/10 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onApproveDepartment) {
                            onApproveDepartment(
                              member.id,
                              myDept,
                              `Trưởng/Phó Ban ${myDept} (${currentUser.name}) đã xác nhận tiếp nhận vào nhóm.`
                            );
                            setStatusBanner(`Đã xác nhận thành công bạn "${member.name}" vào Ban ${myDept}!`);
                            confetti({ particleCount: 60, spread: 60, origin: { y: 0.5 } });
                            setTimeout(() => setStatusBanner(null), 4000);
                          }
                        }}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#245351] hover:bg-[#1B403E] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#382215] border border-[#382215] cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4 text-[#FFE29A]" />
                        <span>Xác Nhận Tiếp Nhận Vào Ban {myDept}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Ứng viên đã được BCN duyệt sơ tuyển */}
        {approvedApplicantsInMyDept.length > 0 && (
          <div className="glass-vintage p-5 border border-[#382215]/20 space-y-3">
            <h4 className="font-bold text-xs text-[#382215] uppercase tracking-wider">
              Ứng Viên Đã Được BCN Duyệt Vòng Sơ Tuyển ({approvedApplicantsInMyDept.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {approvedApplicantsInMyDept.map(app => (
                <div key={app.id} className="p-2.5 rounded-lg bg-[#FAF3E3] border border-[#382215]/15 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#382215]">{app.fullName}</span> ({app.studentId})
                    <div className="text-[10px] text-[#6E472B]">{app.faculty} · Nộp: {app.submittedAt}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    BCN Đã Duyệt
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner in Ngữ Văn Book Cover Style */}
      <div className="glass-vintage p-6 border-2 border-[#382215]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="text-xs font-extrabold uppercase tracking-widest text-[#8C3B1E]">
            Cổng Tuyển Thành Viên & Xét Duyệt Hồ Sơ
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-serif-vintage text-[#382215] tracking-tight">
            Hòm Thư Tuyển Thành Viên CLB
          </h2>
          <p className="text-xs sm:text-sm text-[#4A3525] leading-relaxed">
            Đơn nào duyệt hoặc từ chối xong sẽ <strong>tự động biến mất ngay khỏi thanh duyệt</strong> để trả lại hòm thư trống gọn gàng, dễ đọc.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-4 py-2.5 rounded-xl bg-[#C8532B] hover:bg-[#A63E1B] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition bubble-3d"
          >
            {copiedLink ? <Check className="w-4 h-4 text-[#FFE29A]" /> : <Copy className="w-4 h-4" />}
            <span>{copiedLink ? 'Đã sao chép link!' : 'Sao Chép Link Tuyển Quân'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('candidate_form')}
            className="px-4 py-2.5 rounded-xl bg-[#F2E5C9] hover:bg-[#EAD8B3] text-[#382215] border-2 border-[#382215]/25 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
          >
            <ExternalLink className="w-4 h-4 text-[#8C3B1E]" />
            <span>Mở Form Ứng Viên</span>
          </button>
        </div>
      </div>

      {showShareBox && (
        <div className="p-4 rounded-2xl bg-[#FFFDF8] border-3 border-[#382215] shadow-[4px_4px_0px_#382215] space-y-2.5 text-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-2">
            <span className="font-black text-[#8C3B1E] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5 text-[#C8532B]" />
              <span>Đường dẫn Form Tuyển Thành Viên Trực Tuyến (Dán gửi vào nhóm Zalo / Messenger / Fanpage):</span>
            </span>
            <button
              type="button"
              onClick={() => setShowShareBox(false)}
              className="text-[#6E472B] hover:text-[#382215] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              readOnly
              value={recruitmentShareUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 px-3.5 py-2 rounded-xl bg-[#FAF3E3] border-2 border-[#382215]/30 font-mono text-xs font-bold text-[#382215]"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-2 rounded-xl bg-[#245351] hover:bg-[#1A3F3D] text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-[#382215]"
            >
              <Check className="w-3.5 h-3.5 text-[#FFE29A]" />
              <span>{copiedLink ? 'Đã chép vào bộ nhớ!' : 'Chép Link'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('candidate_form')}
              className="px-4 py-2 rounded-xl bg-[#C8532B] hover:bg-[#A63E1B] text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-[#382215]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở Form Ngay</span>
            </button>
          </div>
        </div>
      )}

      {statusBanner && (
        <div className="p-4 rounded-xl bg-[#FAF3E3] border-2 border-[#486A39] text-[#2B1D14] text-xs sm:text-sm flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#486A39] shrink-0" />
            <span className="font-bold">{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-[#6E472B] hover:text-[#382215] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b-2 border-[#382215]/15 pb-2 overflow-x-auto">
        {isBcn && (
          <>
            <button
              type="button"
              onClick={() => setActiveSubTab('review')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeSubTab === 'review'
                  ? 'bg-[#382215] text-[#FAF3E3] shadow-xs'
                  : 'bg-[#FAF3E3] text-[#382215] hover:bg-[#F2E5C9] border border-[#382215]/20'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Hòm Thư Chờ Duyệt ({applications.filter(a => a.status === 'pending').length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('builder')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeSubTab === 'builder'
                  ? 'bg-[#382215] text-[#FAF3E3] shadow-xs'
                  : 'bg-[#FAF3E3] text-[#382215] hover:bg-[#F2E5C9] border border-[#382215]/20'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Bộ Câu Hỏi Tuyển Chọn ({activeQuestions.length})</span>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setActiveSubTab('candidate_form')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
            activeSubTab === 'candidate_form'
              ? 'bg-[#382215] text-[#FAF3E3] shadow-xs'
              : 'bg-[#FAF3E3] text-[#382215] hover:bg-[#F2E5C9] border border-[#382215]/20'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Form Nộp Đơn Ứng Viên</span>
        </button>
      </div>

      {/* SUB-TAB 1: Review Pending Applications Only */}
      {activeSubTab === 'review' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FAF3E3] p-4 rounded-xl border-2 border-[#382215]/20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#382215]">Lọc theo Ban ứng tuyển:</span>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#382215]/30 bg-[#FFFDF7] text-xs font-bold text-[#382215]"
              >
                <option value="all">Tất cả các ban ({applications.filter(a => a.status === 'pending').length})</option>
                <option value="Truyền thông">Ban Truyền thông</option>
                <option value="Nội dung">Ban Nội dung</option>
                <option value="Nhân sự & Kế hoạch">Ban Nhân sự & Kế hoạch</option>
                <option value="Hậu cần">Ban Hậu cần</option>
              </select>
            </div>

            <div className="text-xs font-bold text-[#8C3B1E]">
              Đang chờ xử lý: {pendingApps.length} đơn
            </div>
          </div>

          {pendingApps.length === 0 ? (
            <div className="glass-vintage p-12 text-center space-y-2 border-2 border-[#382215]/20">
              <Inbox className="w-10 h-10 text-[#6E472B]/60 mx-auto" />
              <h4 className="font-black text-base text-[#382215] font-serif-vintage">
                Hòm thư chờ duyệt đơn tuyển hiện đang trống
              </h4>
              <p className="text-xs text-[#6E472B] max-w-md mx-auto">
                Tất cả đơn đăng ký đã được xét duyệt và dọn sạch. Khi có ứng viên mới nộp đơn, hồ sơ sẽ hiển thị tại đây.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingApps.map((app) => (
                <div
                  key={app.id}
                  className="glass-vintage p-5 rounded-2xl border-2 border-[#382215]/25 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#382215]/15">
                    <div className="space-y-0.5">
                      <h4 className="font-black text-base text-[#382215] font-serif-vintage">
                        {app.fullName} {app.nickname && <span className="text-xs text-[#8C3B1E] italic">({app.nickname})</span>}
                      </h4>
                      <div className="text-xs text-[#6E472B]">
                        MSSV: <strong className="font-mono text-[#382215]">{app.studentId}</strong> · {app.faculty} · Nguyện vọng: <strong className="text-[#C8532B]">Ban {app.desiredDept}</strong>
                      </div>
                    </div>

                    <div className="text-xs text-[#6E472B] font-semibold">
                      Ngày nộp: {app.submittedAt}
                    </div>
                  </div>

                  {/* Answers list */}
                  <div className="space-y-2.5 bg-[#FFFDF7] p-4 rounded-xl border border-[#382215]/15 text-xs">
                    <div className="font-extrabold text-[#8C3B1E] text-[11px] uppercase tracking-wider">
                      Câu trả lời ứng tuyển:
                    </div>
                    {activeQuestions.map((q, idx) => (
                      <div key={q.id} className="space-y-0.5 pb-2 border-b border-[#382215]/10 last:border-b-0 last:pb-0">
                        <div className="font-bold text-[#382215]">{idx + 1}. {q.text}</div>
                        <div className="text-[#4A3525]">
                          → {app.answers[q.id] || '(Chưa trả lời)'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Review Action Controls */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 text-xs">
                    <input
                      type="text"
                      placeholder="Ghi chú nhận xét (tùy chọn)..."
                      value={selectedApp?.id === app.id ? reviewNoteInput : ''}
                      onChange={(e) => {
                        setSelectedApp(app);
                        setReviewNoteInput(e.target.value);
                      }}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-[#382215]/30 bg-[#FFFDF7] text-xs text-[#382215]"
                    />
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleReject(app)}
                        className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-[#382215] font-bold text-xs cursor-pointer"
                      >
                        Từ Chối
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(app)}
                        className="px-5 py-2 rounded-xl bg-[#486A39] hover:bg-[#38552B] text-white font-bold text-xs shadow-xs bubble-3d flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Duyệt Nhận Vào CLB</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: Questions Builder */}
      {activeSubTab === 'builder' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="glass-vintage p-5 rounded-2xl border-2 border-[#382215]/25 space-y-3.5 text-xs">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#C8532B]" />
              <h3 className="font-bold text-sm text-[#382215] font-serif-vintage">
                Thêm Câu Hỏi Tuyển Chọn
              </h3>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-3">
              <div>
                <label className="block font-bold text-[#382215] mb-1">Dạng câu hỏi *</label>
                <select
                  value={newQType}
                  onChange={(e) => setNewQType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-[#FFFDF7] text-xs"
                >
                  <option value="short_answer">Tự luận ngắn</option>
                  <option value="multiple_choice">Trắc nghiệm chọn lựa</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#382215] mb-1">Nội dung câu hỏi *</label>
                <textarea
                  rows={3}
                  required
                  value={newQText}
                  onChange={(e) => setNewQText(e.target.value)}
                  placeholder="Nhập câu hỏi tuyển thành viên..."
                  className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-[#FFFDF7] text-xs"
                />
              </div>

              {newQType === 'multiple_choice' && (
                <div>
                  <label className="block font-bold text-[#382215] mb-1">
                    Các lựa chọn (phân cách bằng dấu phẩy) *
                  </label>
                  <input
                    type="text"
                    value={newQOptions}
                    onChange={(e) => setNewQOptions(e.target.value)}
                    placeholder="Lựa chọn 1, Lựa chọn 2, Lựa chọn 3"
                    className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-[#FFFDF7] text-xs"
                  />
                </div>
              )}

              {/* Phân loại: Bắt buộc trả lời vs Không bắt buộc */}
              <div>
                <label className="block font-bold text-[#382215] mb-1">
                  Yêu cầu trả lời của câu hỏi:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewQRequired(true)}
                    className={`p-2 rounded-xl text-center font-bold text-xs border-2 cursor-pointer transition ${
                      newQRequired
                        ? 'bg-[#C8532B] text-white border-[#382215] shadow-xs'
                        : 'bg-white text-[#5C432C] border-[#382215]/30 hover:border-[#382215]'
                    }`}
                  >
                    Bắt buộc trả lời *
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewQRequired(false)}
                    className={`p-2 rounded-xl text-center font-bold text-xs border-2 cursor-pointer transition ${
                      !newQRequired
                        ? 'bg-[#E5A140] text-[#382215] border-[#382215] shadow-xs'
                        : 'bg-white text-[#5C432C] border-[#382215]/30 hover:border-[#382215]'
                    }`}
                  >
                    Tùy chọn (Không bắt buộc)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#C8532B] hover:bg-[#A63E1B] text-white font-bold text-xs shadow-xs bubble-3d flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Vào Bộ Đề Tuyển</span>
              </button>
            </form>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h4 className="font-bold text-sm text-[#382215] font-serif-vintage flex items-center justify-between flex-wrap gap-2">
              <span>Danh Sách Câu Hỏi Hiện Tại ({activeQuestions.length})</span>
              <span className="text-[11px] font-normal text-[#5C432C]">
                {activeQuestions.filter(q => q.required).length} bắt buộc · {activeQuestions.filter(q => !q.required).length} tùy chọn
              </span>
            </h4>

            <div className="space-y-2.5">
              {activeQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="glass-vintage p-4 rounded-xl border-2 border-[#382215]/20 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#382215] text-xs sm:text-sm">
                        {idx + 1}. {q.text}
                      </span>
                      {q.required ? (
                        <span className="px-2 py-0.5 rounded-md bg-[#C8532B] text-white font-black text-[10px] uppercase tracking-wider">
                          Bắt buộc trả lời *
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-[#E5A140]/30 text-[#8C3B1E] border border-[#E5A140] font-bold text-[10px]">
                          Tùy chọn (Không bắt buộc)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#6E472B]">
                      Dạng: {q.type === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận ngắn'}
                      {q.options && ` · Lựa chọn: [${q.options.join(', ')}]`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteQuestion(q.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-100 text-[#8C3B1E] cursor-pointer transition shrink-0"
                    title="Xóa câu hỏi này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Candidate Preliminary Form */}
      {activeSubTab === 'candidate_form' && (
        <div className="max-w-2xl mx-auto glass-vintage p-6 rounded-2xl border-2 border-[#382215]/30 space-y-5 text-xs">
          <div className="text-center space-y-2 pb-3 border-b border-[#382215]/15">
            <img
              src="/assets/aistudio/TUYE__N_THA_NH_VIE_N_778c37b9.png"
              alt="Logo CLB Đọc và Giới thiệu sách"
              className="h-12 sm:h-14 w-auto object-contain rounded-full mx-auto"
            />
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#8C3B1E]">
              Đơn Đăng Ký Ứng Tuyển Thành Viên
            </div>
            <h3 className="text-xl font-black font-serif-vintage text-[#382215]">
              Gia Nhập CLB Đọc và Giới Thiệu Sách AGU
            </h3>
          </div>

          {submittedSuccessName && (
            <div className="p-4 rounded-2xl bg-[#E9F5EC] border-2 border-[#245351] text-[#1B403E] space-y-1 text-center">
              <div className="font-black text-sm flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-[#245351]" />
                <span>Đã gửi đơn ứng tuyển của "{submittedSuccessName}" thành công!</span>
              </div>
              <p className="text-xs">
                Hồ sơ của bạn đã được chuyển vào Hòm thư chờ duyệt của Ban Chủ Nhiệm CLB.
              </p>
            </div>
          )}

          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-500 text-rose-900 font-bold text-xs flex items-center justify-between gap-2">
              <span>⚠️ {formError}</span>
              <button
                type="button"
                onClick={() => setFormError(null)}
                className="text-rose-700 hover:text-rose-950 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleCandidateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#382215] mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={candName}
                  onChange={(e) => setCandName(e.target.value)}
                  placeholder="Ví dụ: Trần Minh Thư"
                  className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-[#FFFDF7] text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-[#382215] mb-1">Biệt danh / Nickname</label>
                <input
                  type="text"
                  value={candNickname}
                  onChange={(e) => setCandNickname(e.target.value)}
                  placeholder="Ví dụ: Thư Sách"
                  className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-[#FFFDF7] text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#382215] mb-1">Mã số sinh viên *</label>
                <input
                  type="text"
                  required
                  value={candStudentId}
                  onChange={(e) => setCandStudentId(e.target.value)}
                  placeholder="Ví dụ: DTH243912"
                  className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-[#FFFDF7] font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-[#382215] mb-1">Khoa / Ngành học</label>
                <input
                  type="text"
                  value={candFaculty}
                  onChange={(e) => setCandFaculty(e.target.value)}
                  placeholder="Khoa Sư phạm / Ngoại ngữ / CNTT..."
                  className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-[#FFFDF7] text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#382215] mb-1">Email liên hệ</label>
                <input
                  type="email"
                  value={candEmail}
                  onChange={(e) => setCandEmail(e.target.value)}
                  placeholder="mssv@student.agu.edu.vn"
                  className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-[#FFFDF7] text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-[#382215] mb-1">Số điện thoại / Zalo</label>
                <input
                  type="text"
                  value={candPhone}
                  onChange={(e) => setCandPhone(e.target.value)}
                  placeholder="09xx.xxx.xxx"
                  className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-[#FFFDF7] text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#382215] mb-1">Ban chuyên môn muốn ứng tuyển *</label>
              <select
                value={candDept}
                onChange={(e) => setCandDept(e.target.value as DepartmentType)}
                className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-[#FFFDF7] text-xs font-bold text-[#382215]"
              >
                <option value="Truyền thông">Ban Truyền thông</option>
                <option value="Nội dung">Ban Nội dung</option>
                <option value="Nhân sự & Kế hoạch">Ban Nhân sự & Kế hoạch</option>
                <option value="Hậu cần">Ban Hậu cần</option>
              </select>
            </div>

            <div className="pt-2 border-t border-[#382215]/15 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[#382215] uppercase tracking-wider text-[11px]">
                  Bộ Câu Hỏi Đánh Giá Năng Lực & Nguyện Vọng
                </span>
                <span className="text-[10px] text-[#6E472B]">
                  * Bắt buộc phải điền · Tùy chọn có thể bỏ qua
                </span>
              </div>

              {activeQuestions.map((q, idx) => (
                <div key={q.id} className="space-y-2 p-3 rounded-xl bg-[#FFFDF8] border border-[#382215]/20">
                  <div className="flex items-start justify-between gap-2">
                    <label className="font-bold text-[#382215] text-xs">
                      {idx + 1}. {q.text}
                    </label>
                    {q.required ? (
                      <span className="px-2 py-0.5 rounded bg-[#C8532B] text-white font-black text-[9px] uppercase tracking-wider shrink-0">
                        Bắt buộc *
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-[#E5A140]/25 text-[#8C3B1E] border border-[#E5A140]/60 font-bold text-[9px] shrink-0">
                        Tùy chọn
                      </span>
                    )}
                  </div>

                  {q.type === 'multiple_choice' && q.options ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt) => (
                        <div
                          key={opt}
                          onClick={() => setCandAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                            candAnswers[q.id] === opt 
                              ? 'bg-[#F2E5C9] border-[#C8532B] font-bold text-[#382215] shadow-xs' 
                              : 'bg-white border-[#382215]/20 text-[#4A3525] hover:border-[#382215]'
                          }`}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      rows={2}
                      required={q.required}
                      value={candAnswers[q.id] || ''}
                      onChange={(e) => setCandAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder={q.required ? 'Nhập câu trả lời của bạn (Bắt buộc)...' : 'Nhập câu trả lời nếu bạn muốn chia sẻ (Tùy chọn)...'}
                      className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-white text-xs text-[#382215]"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#382215]/15 flex items-center justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#C8532B] hover:bg-[#A63E1B] text-white font-bold text-xs shadow-md bubble-3d flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Nộp Đơn Ứng Tuyển Ngay</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

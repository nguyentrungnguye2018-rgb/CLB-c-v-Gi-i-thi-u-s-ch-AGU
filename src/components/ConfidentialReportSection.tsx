import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Unlock,
  CheckCircle2,
  EyeOff,
  UserCheck,
  Sparkles,
  X,
  Fingerprint,
  Trash2,
  ShieldCheck,
  KeyRound,
  Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ConfidentialReport, UserProfile, DepartmentType } from '../types';

interface ConfidentialReportSectionProps {
  currentUser: UserProfile;
  reports: ConfidentialReport[];
  isBcnMode: boolean;
  onSendReport: (report: Omit<ConfidentialReport, 'id' | 'createdAt' | 'status'>) => void;
  onUpdateBcnResponse: (reportId: string, response: string) => void;
  onDeleteReport?: (reportId: string) => void;
  onOpenAuthModal: () => void;
}

export const ConfidentialReportSection: React.FC<ConfidentialReportSectionProps> = ({
  currentUser,
  reports,
  isBcnMode,
  onSendReport,
  onUpdateBcnResponse,
  onDeleteReport,
  onOpenAuthModal
}) => {
  // Nhận diện tài khoản Hội Sinh Viên Trường giám sát (được xem & thấy tên nhưng KHÔNG được giải quyết mâu thuẫn nội bộ)
  const isHsvSupervisor =
    currentUser.clubRole === 'hsv_supervisor' ||
    currentUser.adminType === 'hsv_supervisor';

  // Chủ nhiệm / Phó Chủ nhiệm / Tài khoản Chính CLB có toàn quyền giải quyết
  const isInternalBcnResolver =
    !isHsvSupervisor &&
    (isBcnMode ||
      currentUser.role === 'bcn_admin' ||
      currentUser.adminType === 'master_root' ||
      currentUser.clubRole === 'president' ||
      currentUser.clubRole === 'vice_president');

  // Cả BCN nội bộ lẫn Hội Sinh Viên Giám Sát đều được xem toàn bộ hòm thư & thấy danh tính
  const canViewAllReportsAndIdentities = isInternalBcnResolver || isHsvSupervisor;
  const isDeptLeader = !isHsvSupervisor && (currentUser.departmentRole === 'leader' || currentUser.role === 'lead');

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [recipientChoice, setRecipientChoice] = useState<'truong_ban' | 'bcn_master'>('bcn_master');
  const [category, setCategory] = useState<'Góp ý sinh hoạt' | 'Mâu thuẫn nội bộ' | 'Ý tưởng sự kiện' | 'Cơ sở vật chất Thư viện' | 'Khác'>('Góp ý sinh hoạt');
  const [targetDept, setTargetDept] = useState<DepartmentType>('Truyền thông');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('pending');

  const [decryptedReportIds, setDecryptedReportIds] = useState<string[]>([]);
  const [responseInputs, setResponseInputs] = useState<Record<string, string>>({});
  const [submitSuccessToast, setSubmitSuccessToast] = useState<string | null>(null);

  const handleCompose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const isEncrypted = recipientChoice === 'bcn_master';
    const hashDigits = Math.floor(1000 + Math.random() * 9000);
    const encryptedCode = isEncrypted
      ? `AES-256#AGU-BCN-${hashDigits}`
      : 'OPEN-TO-DEPT-LEAD';

    onSendReport({
      recipientType: recipientChoice,
      targetDepartment: recipientChoice === 'truong_ban' ? targetDept : undefined,
      category,
      title: title.trim(),
      content: content.trim(),
      isEncrypted,
      encryptedCode,
      realSenderId: currentUser.id,
      realSenderName: currentUser.name,
      realSenderNickname: currentUser.nickname,
      realSenderStudentId: currentUser.studentId,
      realSenderDept: currentUser.department,
      urgency
    });

    confetti({ particleCount: 45, spread: 50, origin: { y: 0.6 } });

    setIsComposeOpen(false);
    setTitle('');
    setContent('');
    setSubmitSuccessToast('Đã gửi báo cáo ẩn danh thành công! Ban Chủ Nhiệm đã nhận được thông báo.');
    setTimeout(() => setSubmitSuccessToast(null), 5000);
  };

  const toggleDecryptIdentity = (reportId: string) => {
    if (!canViewAllReportsAndIdentities) return;
    setDecryptedReportIds(prev =>
      prev.includes(reportId) ? prev.filter(id => id !== reportId) : [...prev, reportId]
    );
  };

  const handleSendResponse = (reportId: string) => {
    if (!isInternalBcnResolver) return;
    const text = responseInputs[reportId]?.trim();
    if (!text) return;
    onUpdateBcnResponse(reportId, text);
    setResponseInputs(prev => ({ ...prev, [reportId]: '' }));
  };

  const visibleReports = reports
    .filter(r => {
      if (canViewAllReportsAndIdentities) return true;
      const isMine =
        r.realSenderId === currentUser.id ||
        (r.realSenderStudentId &&
          currentUser.studentId &&
          r.realSenderStudentId.toLowerCase() === currentUser.studentId.toLowerCase()) ||
        (r.realSenderName && r.realSenderName.toLowerCase() === currentUser.name.toLowerCase());
      if (isMine) return true;
      if (isDeptLeader && r.recipientType === 'truong_ban' && r.targetDepartment === currentUser.department) {
        return true;
      }
      return false;
    })
    .filter(r => {
      if (filterStatus === 'pending') return r.status !== 'resolved';
      if (filterStatus === 'resolved') return r.status === 'resolved';
      return true;
    });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="rounded-3xl p-6 sm:p-8 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E5A140] text-[#382215] text-xs font-black border-2 border-[#382215] shadow-[2px_2px_0px_#382215]">
            <Mail className="w-4 h-4 text-[#382215]" />
            <span>
              {isHsvSupervisor
                ? 'Hội Sinh Viên Trường • Chế Độ Giám Sát Minh Bạch'
                : isInternalBcnResolver
                ? 'Hòm Thư Bảo Mật Ẩn Danh Dành Cho Ban Chủ Nhiệm'
                : 'Kênh Phản Ánh & Tâm Tư Bảo Mật 100%'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#382215] font-serif-vintage tracking-tight">
            {isHsvSupervisor
              ? 'Giám Sát Phản Ánh & Tâm Tư Sinh Viên CLB'
              : isInternalBcnResolver
              ? 'Trung Tâm Quản Trị Báo Cáo Ẩn Danh (BCN)'
              : 'Hòm Thư Báo Cáo Ẩn Danh & Kiến Nghị'}
          </h2>
          <p className="text-xs sm:text-sm text-[#5C432C] leading-relaxed font-medium">
            {isHsvSupervisor ? (
              <>
                Tài khoản Hội Sinh Viên Trường có quyền <strong>theo dõi nội dung phản ánh và đối soát danh tính người gửi</strong> để nắm bắt tình hình hoạt động. Quyền phản hồi và giải quyết mâu thuẫn nội bộ thuộc thẩm quyền tự chủ của Ban Chủ Nhiệm CLB.
              </>
            ) : isInternalBcnResolver ? (
              <>
                Nơi lưu trữ độc lập toàn bộ thư phản ánh, góp ý và báo cáo ẩn danh của thành viên gửi về Ban Chủ Nhiệm. BCN có thể giải mã danh tính khi cần bảo hộ thành viên và gửi phản hồi giải quyết.
              </>
            ) : (
              <>
                Mọi ý kiến đóng góp xây dựng CLB, khúc mắc nội bộ hay đề xuất hoạt động đều được bảo mật tuyệt đối.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {!canViewAllReportsAndIdentities && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-4 py-3 rounded-2xl bg-[#FFFDF8] hover:bg-[#F2E5C9] text-[#382215] border-2 border-[#382215] text-xs font-black flex items-center gap-1.5 shadow-[3px_3px_0px_#382215] cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-[#C8532B]" />
              <span>Chế độ BCN</span>
            </button>
          )}
          {!isHsvSupervisor && (
            <button
              type="button"
              onClick={() => setIsComposeOpen(true)}
              className="px-6 py-3 rounded-2xl bg-[#C8532B] hover:bg-[#A63E1B] text-white text-xs sm:text-sm font-black flex items-center gap-2.5 shadow-[4px_4px_0px_#382215] border-2 border-[#382215] cursor-pointer"
            >
              <Mail className="w-5 h-5 text-[#FFE29A]" />
              <span>Gửi Báo Cáo Ẩn Danh Mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner thông báo phân quyền riêng cho Hội Sinh Viên Trường */}
      {isHsvSupervisor && (
        <div className="rounded-2xl p-4 border-2 border-[#245351] bg-[#EAF2EF] text-[#1E3A24] flex items-center gap-3 text-xs font-bold shadow-[3px_3px_0px_#382215]">
          <Eye className="w-5 h-5 text-[#245351] shrink-0" />
          <span>
            Chế độ Hội Sinh Viên Trường: Bạn được xem đầy đủ nội dung thư và bấm <strong>"Xem Danh Tính Người Gửi"</strong>, nhưng không có quyền can thiệp hoặc bấm giải quyết mâu thuẫn nội bộ của CLB.
          </span>
        </div>
      )}

      {submitSuccessToast && (
        <div className="p-4 rounded-2xl bg-[#FAF3E3] border-2 border-[#486A39] text-[#1E3A24] text-xs sm:text-sm flex items-center justify-between gap-3 shadow-[4px_4px_0px_#382215]">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#486A39] shrink-0" />
            <span className="font-bold">{submitSuccessToast}</span>
          </div>
          <button type="button" onClick={() => setSubmitSuccessToast(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Reports Inbox */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF3E3] p-4.5 rounded-2xl border-2 border-[#382215] shadow-[4px_4px_0px_#382215]">
          <div>
            <h3 className="font-black text-base text-[#382215] font-serif-vintage flex items-center gap-2">
              {canViewAllReportsAndIdentities ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-[#C8532B]" />
                  <span>Toàn Bộ Hòm Thư Bảo Mật ({visibleReports.length} thư)</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5 text-[#245351]" />
                  <span>Hộp Thư Đã Gửi Của Riêng Bạn ({visibleReports.length} thư)</span>
                </>
              )}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            {(['pending', 'resolved', 'all'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border-2 border-[#382215] ${
                  filterStatus === st
                    ? 'bg-[#382215] text-[#FAF3E3] shadow-[2px_2px_0px_#382215]'
                    : 'bg-[#FFFDF8] text-[#382215] hover:bg-[#F2E5C9]'
                }`}
              >
                {st === 'pending' ? 'Hòm thư chờ xử lý' : st === 'resolved' ? 'Đã xử lý xong' : 'Tất cả'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {visibleReports.length === 0 ? (
            <div className="glass-vintage rounded-2xl p-12 text-center space-y-2 border-2 border-[#382215]/20">
              <Mail className="w-10 h-10 text-[#6E472B]/60 mx-auto" />
              <h4 className="font-black text-base text-[#382215] font-serif-vintage">
                Hòm thư hiện đang trống
              </h4>
            </div>
          ) : (
            visibleReports.map((report) => {
              const isEncrypted = report.isEncrypted;
              // Hội Sinh Viên Trường mặc định thấy rõ tên người gửi hoặc có thể bấm mở khóa xem tên
              const isDecrypted = isHsvSupervisor || decryptedReportIds.includes(report.id);
              const isToBcn = report.recipientType === 'bcn_master';
              const isMyReport =
                report.realSenderId === currentUser.id ||
                (report.realSenderStudentId &&
                  currentUser.studentId &&
                  report.realSenderStudentId.toLowerCase() === currentUser.studentId.toLowerCase());

              return (
                <div
                  key={report.id}
                  className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[5px_5px_0px_#382215] space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#382215]/15">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black border-2 border-[#382215] flex items-center gap-1.5 ${
                          isToBcn ? 'bg-[#E5A140] text-[#382215]' : 'bg-[#245351] text-[#FFE29A]'
                        }`}
                      >
                        {isToBcn ? 'Gửi Ban Chủ Nhiệm' : `Gửi Trưởng Ban ${report.targetDepartment}`}
                      </span>
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#FFFDF8] text-[#382215] border border-[#382215]">
                        {report.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#6E472B] font-bold">
                      <span>Gửi ngày: {report.createdAt}</span>
                      <span>•</span>
                      <span className={report.status === 'resolved' ? 'text-[#486A39] font-black' : 'text-[#C8532B] font-black'}>
                        {report.status === 'resolved' ? '✓ Đã phản hồi' : 'Chờ xử lý'}
                      </span>
                      {(isInternalBcnResolver || isMyReport) && onDeleteReport && (
                        <button
                          type="button"
                          onClick={() => onDeleteReport(report.id)}
                          className="ml-2 p-1.5 rounded-lg bg-rose-100 hover:bg-rose-600 text-rose-800 hover:text-white border-2 border-rose-600 cursor-pointer flex items-center gap-1 text-[11px] font-black"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Identity Box */}
                  <div className="p-4 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#FAF3E3] border border-[#382215] flex items-center justify-center shrink-0">
                        {isEncrypted && !isDecrypted ? (
                          <Lock className="w-4 h-4 text-[#C8532B]" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-[#245351]" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-[#382215]">
                          {canViewAllReportsAndIdentities && isDecrypted ? (
                            <span className="text-[#486A39] flex items-center gap-1.5 font-bold flex-wrap">
                              <span>
                                Người gửi: <strong>{report.realSenderName}</strong> ({report.realSenderStudentId}) - Ban {report.realSenderDept}
                              </span>
                              <span className="text-[10px] bg-[#E5F0E4] px-2 py-0.5 rounded border border-[#382215] font-black text-[#1E3A24]">
                                {isHsvSupervisor ? 'Hiển thị cho Hội Sinh Viên' : 'Đã giải mã bởi BCN'}
                              </span>
                            </span>
                          ) : isEncrypted ? (
                            <span className="font-mono text-[#382215]">
                              Mã định danh ẩn danh: <strong className="text-[#C8532B]">{report.encryptedCode}</strong>
                            </span>
                          ) : (
                            <span>
                              Người gửi: <strong>{report.realSenderName}</strong> ({report.realSenderStudentId})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isEncrypted && isInternalBcnResolver && (
                      <button
                        type="button"
                        onClick={() => toggleDecryptIdentity(report.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#FAF3E3] border-2 border-[#382215] text-xs font-black text-[#382215] flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        {isDecrypted ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Khóa ẩn danh lại</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3.5 h-3.5 text-[#C8532B]" />
                            <span>Giải Mã Danh Tính</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Report Content */}
                  <div className="space-y-2">
                    <h4 className="font-black text-base text-[#382215] font-serif-vintage">{report.title}</h4>
                    <p className="text-xs sm:text-sm text-[#382215] leading-relaxed whitespace-pre-line bg-[#FFFDF8] p-4.5 rounded-2xl border-2 border-[#382215]/20 font-medium">
                      {report.content}
                    </p>
                  </div>

                  {/* BCN Official Response */}
                  {report.bcnResponse && (
                    <div className="p-4 rounded-2xl bg-[#F2E5C9] border-2 border-[#382215] text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-black text-[#382215]">
                        <Sparkles className="w-4 h-4 text-[#C8532B]" />
                        <span>Phản hồi chính thức từ Ban Chủ Nhiệm CLB:</span>
                      </div>
                      <p className="text-[#382215] leading-relaxed pl-5 font-serif-vintage italic text-sm">
                        "{report.bcnResponse}"
                      </p>
                    </div>
                  )}

                  {/* KHÓA QUYỀN GIẢI QUYẾT MÂU THUẪN ĐỐI VỚI HỘI SINH VIÊN TRƯỜNG */}
                  {isHsvSupervisor ? (
                    <div className="p-3 rounded-xl bg-stone-200/80 border border-stone-400 text-[11px] font-bold text-stone-700 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                      <span>
                        Quyền giám sát Hội Sinh Viên Trường: Chỉ theo dõi và nắm bắt danh tính, không can thiệp giải quyết mâu thuẫn nội bộ CLB.
                      </span>
                    </div>
                  ) : (
                    (isInternalBcnResolver ||
                      (isDeptLeader &&
                        report.recipientType === 'truong_ban' &&
                        report.targetDepartment === currentUser.department)) && (
                      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs">
                        <input
                          type="text"
                          placeholder="Nhập phản hồi giải quyết chính thức từ BCN CLB..."
                          value={responseInputs[report.id] || ''}
                          onChange={(e) => setResponseInputs(prev => ({ ...prev, [report.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendResponse(report.id)}
                          className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#FFFDF8] border-2 border-[#382215] font-bold text-[#382215]"
                        />
                        <button
                          type="button"
                          onClick={() => handleSendResponse(report.id)}
                          className="px-4 py-2.5 rounded-xl bg-[#486A39] hover:bg-[#38552B] text-white font-black cursor-pointer shrink-0 border-2 border-[#382215]"
                        >
                          Duyệt & Giải Quyết Xong
                        </button>
                      </div>
                    )
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Compose */}
      {isComposeOpen && !isHsvSupervisor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[#FAF7F0] rounded-2xl border-2 border-[#5E936B]/50 w-full max-w-xl p-6 space-y-4 text-xs sm:text-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base font-serif-vintage">Gửi Thư Báo Cáo Ẩn Danh & Kiến Nghị</h3>
              <button type="button" onClick={() => setIsComposeOpen(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCompose} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRecipientChoice('bcn_master')}
                  className={`p-3 rounded-xl border-2 font-bold text-left cursor-pointer ${
                    recipientChoice === 'bcn_master' ? 'bg-amber-50 border-amber-500' : 'bg-white'
                  }`}
                >
                  Gửi Ban Chủ Nhiệm (Ẩn danh)
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientChoice('truong_ban')}
                  className={`p-3 rounded-xl border-2 font-bold text-left cursor-pointer ${
                    recipientChoice === 'truong_ban' ? 'bg-emerald-50 border-[#3B6E47]' : 'bg-white'
                  }`}
                >
                  Gửi Trưởng Ban chuyên môn
                </button>
              </div>
              {recipientChoice === 'truong_ban' && (
                <select
                  value={targetDept}
                  onChange={(e) => setTargetDept(e.target.value as DepartmentType)}
                  className="w-full px-3 py-2 rounded-xl border bg-white text-xs"
                >
                  <option value="Truyền thông">Ban Truyền thông</option>
                  <option value="Nội dung">Ban Nội dung</option>
                  <option value="Nhân sự & Kế hoạch">Ban Nhân sự & Kế hoạch</option>
                  <option value="Hậu cần">Ban Hậu cần</option>
                </select>
              )}
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as typeof category)}
                  className="px-3 py-2 rounded-xl border bg-white text-xs"
                >
                  <option value="Góp ý sinh hoạt">Góp ý sinh hoạt CLB</option>
                  <option value="Mâu thuẫn nội bộ">Mâu thuẫn nội bộ / Nhân sự</option>
                  <option value="Ý tưởng sự kiện">Ý tưởng sự kiện</option>
                  <option value="Cơ sở vật chất Thư viện">Cơ sở vật chất Thư viện</option>
                  <option value="Khác">Khác</option>
                </select>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as typeof urgency)}
                  className="px-3 py-2 rounded-xl border bg-white text-xs"
                >
                  <option value="low">Nhẹ</option>
                  <option value="medium">Bình thường</option>
                  <option value="high">Khẩn cấp</option>
                </select>
              </div>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tiêu đề phản ánh..."
                className="w-full px-3 py-2 rounded-xl border bg-white text-xs"
              />
              <textarea
                rows={4}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nội dung chi tiết..."
                className="w-full px-3 py-2 rounded-xl border bg-white text-xs"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsComposeOpen(false)} className="px-4 py-2 rounded-xl bg-stone-200">
                  Hủy
                </button>
                <button type="submit" className="px-6 py-2 rounded-xl bg-[#23432B] text-white font-bold cursor-pointer">
                  Gửi Vào Hòm Thư
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

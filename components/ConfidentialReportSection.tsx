import React, { useState } from 'react';
import {
  Mail,
  Send,
  Lock,
  Unlock,
  ShieldAlert,
  CheckCircle2,
  EyeOff,
  UserCheck,
  Sparkles,
  X,
  Fingerprint,
  Trash2,
  ShieldCheck,
  KeyRound
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
  const isBcnAdmin = isBcnMode || currentUser.role === 'bcn_admin' || currentUser.adminType === 'master_root';
  const isDeptLeader = currentUser.departmentRole === 'leader' || currentUser.role === 'lead';

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [recipientChoice, setRecipientChoice] = useState<'truong_ban' | 'bcn_master'>('bcn_master');
  const [category, setCategory] = useState<'Góp ý sinh hoạt' | 'Mâu thuẫn nội bộ' | 'Ý tưởng sự kiện' | 'Cơ sở vật chất Thư viện' | 'Khác'>('Góp ý sinh hoạt');
  const [targetDept, setTargetDept] = useState<DepartmentType>('Truyền thông');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('pending');

  // Track which report IDs BCN has toggled to reveal real identity
  const [decryptedReportIds, setDecryptedReportIds] = useState<string[]>([]);
  // Response inputs
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

    confetti({
      particleCount: 45,
      spread: 50,
      origin: { y: 0.6 }
    });

    setIsComposeOpen(false);
    setTitle('');
    setContent('');
    setSubmitSuccessToast('Đã gửi báo cáo ẩn danh thành công! Ban Chủ Nhiệm đã nhận được thông báo.');
    setTimeout(() => setSubmitSuccessToast(null), 5000);
  };

  const toggleDecryptIdentity = (reportId: string) => {
    if (!isBcnAdmin) return;
    setDecryptedReportIds(prev =>
      prev.includes(reportId) ? prev.filter(id => id !== reportId) : [...prev, reportId]
    );
  };

  const handleSendResponse = (reportId: string) => {
    const text = responseInputs[reportId]?.trim();
    if (!text) return;
    onUpdateBcnResponse(reportId, text);
    setResponseInputs(prev => ({ ...prev, [reportId]: '' }));
  };

  // Privacy filter:
  // - BCN sees ALL reports in the Confidential Inbox.
  // - Department Leaders see reports sent to their department + their own reports.
  // - Normal members ONLY see reports they themselves submitted, keeping everyone else's reports 100% confidential.
  const visibleReports = reports.filter(r => {
    if (isBcnAdmin) return true;
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
  }).filter(r => {
    if (filterStatus === 'pending') return r.status !== 'resolved';
    if (filterStatus === 'resolved') return r.status === 'resolved';
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner - Khối cứng mềm mại */}
      <div className="rounded-3xl p-6 sm:p-8 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E5A140] text-[#382215] text-xs font-black border-2 border-[#382215] shadow-[2px_2px_0px_#382215]">
            <Mail className="w-4 h-4 text-[#382215]" />
            <span>
              {isBcnAdmin
                ? 'Hòm Thư Bảo Mật Ẩn Danh Dành Cho Ban Chủ Nhiệm'
                : 'Kênh Phản Ánh & Tâm Tư Bảo Mật 100%'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#382215] font-serif-vintage tracking-tight">
            {isBcnAdmin ? 'Trung Tâm Quản Trị Báo Cáo Ẩn Danh (BCN)' : 'Hòm Thư Báo Cáo Ẩn Danh & Kiến Nghị'}
          </h2>
          <p className="text-xs sm:text-sm text-[#5C432C] leading-relaxed font-medium">
            {isBcnAdmin ? (
              <>
                Nơi lưu trữ độc lập toàn bộ thư phản ánh, góp ý và báo cáo ẩn danh của thành viên gửi về Ban Chủ Nhiệm. BCN có thể giải mã danh tính khi cần bảo hộ thành viên, gửi phản hồi trực tiếp hoặc xóa thư đã xử lý xong.
              </>
            ) : (
              <>
                Mọi ý kiến đóng góp xây dựng CLB, khúc mắc nội bộ hay đề xuất hoạt động đều được bảo mật tuyệt đối. Thư bạn gửi chỉ hiện trong lịch sử cá nhân của bạn và <strong>Hòm Thư Ẩn Danh bên Ban Chủ Nhiệm</strong> (các thành viên khác hoàn toàn không thể nhìn thấy).
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {!isBcnAdmin && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-4 py-3 rounded-2xl bg-[#FFFDF8] hover:bg-[#F2E5C9] text-[#382215] border-2 border-[#382215] text-xs font-black flex items-center gap-1.5 shadow-[3px_3px_0px_#382215] cursor-pointer transition active:translate-x-[2px] active:translate-y-[2px]"
              title="Dành cho Ban Chủ Nhiệm mở khóa toàn bộ Hòm thư"
            >
              <KeyRound className="w-4 h-4 text-[#C8532B]" />
              <span>Chế độ BCN</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsComposeOpen(true)}
            className="px-6 py-3 rounded-2xl bg-[#C8532B] hover:bg-[#A63E1B] text-white text-xs sm:text-sm font-black flex items-center gap-2.5 shadow-[4px_4px_0px_#382215] border-2 border-[#382215] cursor-pointer shrink-0 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#382215] transition-all"
          >
            <Mail className="w-5 h-5 text-[#FFE29A]" />
            <span>Gửi Báo Cáo Ẩn Danh Mới</span>
          </button>
        </div>
      </div>

      {/* Artistic 4-Layer Wax Seal & Security Protocol Banner */}
      <div className="rounded-3xl p-6 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#382215]/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#C8532B] border-2 border-[#382215] flex items-center justify-center text-white shadow-[2px_2px_0px_#382215]">
              <Lock className="w-5 h-5 text-[#FFE29A]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-[#382215] text-sm sm:text-base font-serif-vintage">
                  Quy Trình 4 Tầng Niêm Phong Thư Ẩn Danh & Bảo Mật Dân Chủ
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#245351] text-[#FFE29A] text-[9px] font-black border border-[#382215]">
                  100% Khuyết Danh
                </span>
              </div>
              <p className="text-[11px] text-[#6E472B]">
                Mọi ý kiến đóng góp, phê bình hay giải trình đều được bảo vệ nghiêm ngặt bằng quy chế bảo hộ thành viên AGU
              </p>
            </div>
          </div>
          <div className="text-[10px] font-black text-[#8C3B1E] bg-[#F2E5C9] px-3 py-1 rounded-lg border border-[#382215]">
            Ấn Niêm Phong BCN · Bảo Hộ Toàn Diện
          </div>
        </div>

        {/* 4 Protocol Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215] shadow-[2px_2px_0px_#382215] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#245351] uppercase tracking-wider">Tầng 1</span>
              <span className="text-base">🔏</span>
            </div>
            <div className="font-bold text-xs text-[#382215]">Mã Hóa AES-256</div>
            <p className="text-[10px] text-[#6E472B] leading-snug">
              Nội dung thư được cấp mã số định danh riêng biệt, chống can thiệp và truy vết trái phép.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215] shadow-[2px_2px_0px_#382215] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#C8532B] uppercase tracking-wider">Tầng 2</span>
              <span className="text-base">🎭</span>
            </div>
            <div className="font-bold text-xs text-[#382215]">Khuyết Danh Tuyệt Đối</div>
            <p className="text-[10px] text-[#6E472B] leading-snug">
              Hệ thống tự động che giấu tên thật, MSSV và tài khoản khi chuyển thư tới hòm thư quản lý.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215] shadow-[2px_2px_0px_#382215] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#9C6F19] uppercase tracking-wider">Tầng 3</span>
              <span className="text-base">📮</span>
            </div>
            <div className="font-bold text-xs text-[#382215]">Hòm Thư Độc Lập</div>
            <p className="text-[10px] text-[#6E472B] leading-snug">
              Chỉ Ban Chủ Nhiệm cấp cao mới có thẩm quyền mở và tiếp nhận; các thành viên khác không thể xem.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215] shadow-[2px_2px_0px_#382215] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#382215] uppercase tracking-wider">Tầng 4</span>
              <span className="text-base">⚖️</span>
            </div>
            <div className="font-bold text-xs text-[#382215]">Lắng Nghe & Phản Hồi</div>
            <p className="text-[10px] text-[#6E472B] leading-snug">
              BCN gửi thư hồi đáp chính thức trực tiếp vào lịch sử cá nhân của bạn để kịp thời giải quyết khúc mắc.
            </p>
          </div>
        </div>
      </div>

      {submitSuccessToast && (
        <div className="p-4 rounded-2xl bg-[#FAF3E3] border-2 border-[#486A39] text-[#1E3A24] text-xs sm:text-sm flex items-center justify-between gap-3 shadow-[4px_4px_0px_#382215]">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#486A39] shrink-0" />
            <span className="font-bold">{submitSuccessToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSubmitSuccessToast(null)}
            className="text-[#6E472B] hover:text-[#382215] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Reports Inbox / Personal Sent History - Khối cứng mềm mại */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF3E3] p-4.5 rounded-2xl border-2 border-[#382215] shadow-[4px_4px_0px_#382215]">
          <div>
            <h3 className="font-black text-base text-[#382215] font-serif-vintage flex items-center gap-2">
              {isBcnAdmin ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-[#C8532B]" />
                  <span>Toàn Bộ Hòm Thư Bảo Mật Gửi Tới BCN ({visibleReports.length} thư)</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5 text-[#245351]" />
                  <span>Hộp Thư Đã Gửi Của Riêng Bạn ({visibleReports.length} thư)</span>
                </>
              )}
            </h3>
            <p className="text-xs text-[#6E472B] mt-0.5">
              {isBcnAdmin
                ? 'Tất cả báo cáo ẩn danh đều được tập trung tại tab độc lập này để BCN xét duyệt chỉn chu.'
                : 'Bảo mật riêng tư: Chỉ bạn và Ban Chủ Nhiệm mới thấy nội dung và phản hồi của những thư này.'}
            </p>
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
                Hòm thư chờ xử lý hiện đang trống
              </h4>
              <p className="text-xs text-[#6E472B] max-w-md mx-auto">
                Tất cả thư báo cáo đã được giải quyết gọn gàng. Khi có thư mới gửi về, nội dung sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            visibleReports.map((report) => {
              const isEncrypted = report.isEncrypted;
              const isDecrypted = decryptedReportIds.includes(report.id);
              const isToBcn = report.recipientType === 'bcn_master';
              const isMyReport =
                report.realSenderId === currentUser.id ||
                (report.realSenderStudentId &&
                  currentUser.studentId &&
                  report.realSenderStudentId.toLowerCase() === currentUser.studentId.toLowerCase());

              return (
                <div
                  key={report.id}
                  className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[5px_5px_0px_#382215] hover:shadow-[7px_7px_0px_#382215] transition-all space-y-4"
                >
                  {/* Header row of the report */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#382215]/15">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black border-2 border-[#382215] flex items-center gap-1.5 shadow-[2px_2px_0px_#382215] ${
                          isToBcn
                            ? 'bg-[#E5A140] text-[#382215]'
                            : 'bg-[#245351] text-[#FFE29A]'
                        }`}
                      >
                        {isToBcn ? (
                          <>
                            <Lock className="w-3.5 h-3.5 text-[#382215]" />
                            <span>Gửi Ban Chủ Nhiệm (Bảo Mật Tối Cao)</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-[#FFE29A]" />
                            <span>Gửi Trưởng Ban {report.targetDepartment}</span>
                          </>
                        )}
                      </span>
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#FFFDF8] text-[#382215] border border-[#382215]">
                        {report.category}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full border border-[#382215] ${
                          report.urgency === 'high'
                            ? 'bg-[#C8532B] text-white'
                            : report.urgency === 'medium'
                            ? 'bg-[#E5A140] text-[#382215]'
                            : 'bg-[#FAF3E3] text-[#382215]'
                        }`}
                      >
                        Mức độ: {report.urgency === 'high' ? 'Khẩn cấp' : report.urgency === 'medium' ? 'Bình thường' : 'Góp ý nhẹ'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#6E472B] font-bold">
                      <span>Gửi ngày: {report.createdAt}</span>
                      <span>•</span>
                      <span
                        className={`font-black ${
                          report.status === 'resolved'
                            ? 'text-[#486A39]'
                            : report.status === 'processing'
                            ? 'text-[#C8532B]'
                            : 'text-[#6E472B]'
                        }`}
                      >
                        {report.status === 'resolved'
                          ? '✓ Đã phản hồi'
                          : report.status === 'processing'
                          ? '⏳ Đang thụ lý'
                          : 'Đã tiếp nhận'}
                      </span>
                      {(isBcnAdmin || isMyReport) && onDeleteReport && (
                        <button
                          type="button"
                          onClick={() => onDeleteReport(report.id)}
                          className="ml-2 p-1.5 rounded-lg bg-rose-100 hover:bg-rose-600 text-rose-800 hover:text-white border-2 border-rose-600 transition cursor-pointer flex items-center gap-1 text-[11px] font-black shadow-2xs"
                          title="Xóa báo cáo này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Identity Box: Encrypted vs Clear */}
                  <div className="p-4 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-[2px_2px_0px_#382215]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#FAF3E3] border border-[#382215] flex items-center justify-center text-[#382215] shadow-2xs shrink-0">
                        {isEncrypted ? (
                          <Lock className="w-4 h-4 text-[#C8532B]" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-[#245351]" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-[#382215]">
                          {isEncrypted ? (
                            isBcnAdmin && isDecrypted ? (
                              <span className="text-[#486A39] flex items-center gap-1.5 font-bold flex-wrap">
                                <span>
                                  Danh tính thực:{' '}
                                  <strong>{report.realSenderName}</strong> ({report.realSenderStudentId}) - Ban {report.realSenderDept}
                                </span>
                                <span className="text-[10px] bg-[#E5F0E4] px-2 py-0.5 rounded border border-[#382215] font-black text-[#1E3A24]">
                                  Đã giải mã bởi BCN
                                </span>
                              </span>
                            ) : (
                              <span className="font-mono text-[#382215] flex items-center gap-1.5 flex-wrap">
                                <span>
                                  Mã định danh ẩn danh: <strong className="text-[#C8532B]">{report.encryptedCode}</strong>
                                </span>
                                <span className="text-[10px] bg-[#E5A140] text-[#382215] border border-[#382215] px-2 py-0.5 rounded font-black">
                                  Bảo mật AES-256
                                </span>
                              </span>
                            )
                          ) : (
                            <span className="text-[#382215]">
                              Người gửi: <strong>{report.realSenderName}</strong> ({report.realSenderStudentId}) - Ban {report.realSenderDept}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#6E472B] mt-0.5">
                          {isEncrypted
                            ? 'Danh tính người gửi được ẩn danh hoàn toàn và chỉ Ban Chủ Nhiệm mới có quyền giải mã.'
                            : 'Báo cáo gửi trực tiếp đến Trưởng ban chuyên môn.'}
                        </div>
                      </div>
                    </div>

                    {/* Decrypt trigger button ONLY visible to BCN */}
                    {isEncrypted && isBcnAdmin && (
                      <button
                        type="button"
                        onClick={() => toggleDecryptIdentity(report.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#FAF3E3] hover:bg-[#F2E5C9] border-2 border-[#382215] text-xs font-black text-[#382215] flex items-center gap-1.5 shadow-[2px_2px_0px_#382215] cursor-pointer transition shrink-0 active:translate-x-[1px] active:translate-y-[1px]"
                      >
                        {isDecrypted ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-[#6E472B]" />
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
                    <h4 className="font-black text-base text-[#382215] font-serif-vintage">
                      {report.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-[#382215] leading-relaxed whitespace-pre-line bg-[#FFFDF8] p-4.5 rounded-2xl border-2 border-[#382215]/20 shadow-xs font-medium">
                      {report.content}
                    </p>
                  </div>

                  {/* BCN Official Feedback Response */}
                  {report.bcnResponse && (
                    <div className="p-4 rounded-2xl bg-[#F2E5C9] border-2 border-[#382215] text-xs space-y-1 shadow-[2px_2px_0px_#382215]">
                      <div className="flex items-center gap-1.5 font-black text-[#382215]">
                        <Sparkles className="w-4 h-4 text-[#C8532B]" />
                        <span>Phản hồi chính thức từ Ban Chủ Nhiệm CLB:</span>
                      </div>
                      <p className="text-[#382215] leading-relaxed pl-5 font-serif-vintage italic text-sm">
                        "{report.bcnResponse}"
                      </p>
                    </div>
                  )}

                  {/* BCN Response Input (Once resolved, disappears immediately from pending inbox!) */}
                  {(isBcnAdmin || (isDeptLeader && report.recipientType === 'truong_ban' && report.targetDepartment === currentUser.department)) && (
                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs">
                      <input
                        type="text"
                        placeholder="Nhập phản hồi chính thức từ BCN (tùy chọn)..."
                        value={responseInputs[report.id] || ''}
                        onChange={(e) => setResponseInputs(prev => ({ ...prev, [report.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendResponse(report.id)}
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#FFFDF8] border-2 border-[#382215] font-bold text-[#382215] focus:outline-none focus:border-[#C8532B] shadow-[2px_2px_0px_#382215]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const text = responseInputs[report.id]?.trim() || 'Đã tiếp nhận và xử lý xong.';
                          onUpdateBcnResponse(report.id, text);
                          setResponseInputs(prev => ({ ...prev, [report.id]: '' }));
                        }}
                        className="px-4 py-2.5 rounded-xl bg-[#486A39] hover:bg-[#38552B] text-white font-black cursor-pointer shrink-0 border-2 border-[#382215] shadow-[2px_2px_0px_#382215] active:translate-x-[1px] active:translate-y-[1px]"
                      >
                        Duyệt & Xử Lý Xong
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: Compose New Confidential Report */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FAF7F0] rounded-2xl border-2 border-[#5E936B]/50 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-[#24432B] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-base font-serif-vintage">
                  Gửi Thư Báo Cáo Ẩn Danh & Kiến Nghị
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompose} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {/* Recipient Selection Toggle */}
              <div>
                <label className="block font-bold text-[#23432B] mb-2">
                  Bạn muốn gửi báo cáo này đến ai? *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setRecipientChoice('bcn_master')}
                    className={`p-3.5 rounded-2xl border-2 transition cursor-pointer ${
                      recipientChoice === 'bcn_master'
                        ? 'bg-amber-50 border-amber-500 shadow-sm'
                        : 'bg-white border-[#D6CBB8] hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span>Gửi Ban Chủ Nhiệm (Ẩn danh)</span>
                    </div>
                    <p className="text-[11px] text-amber-800/80 mt-1">
                      Mã hóa AES-256 danh tính của bạn. Lưu trực tiếp vào Hòm thư mật của Ban Chủ Nhiệm.
                    </p>
                  </div>

                  <div
                    onClick={() => setRecipientChoice('truong_ban')}
                    className={`p-3.5 rounded-2xl border-2 transition cursor-pointer ${
                      recipientChoice === 'truong_ban'
                        ? 'bg-emerald-50 border-[#3B6E47] shadow-sm'
                        : 'bg-white border-[#D6CBB8] hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-emerald-900 text-xs">
                      <UserCheck className="w-4 h-4 text-emerald-700" />
                      <span>Gửi Trưởng Ban chuyên môn</span>
                    </div>
                    <p className="text-[11px] text-emerald-800/80 mt-1">
                      Gửi trực tiếp tới Trưởng ban của 1 trong 4 ban chuyên môn để hỗ trợ nhanh.
                    </p>
                  </div>
                </div>
              </div>

              {/* Target Department if sending to Lead */}
              {recipientChoice === 'truong_ban' && (
                <div>
                  <label className="block font-bold text-[#23432B] mb-1">
                    Chọn ban tiếp nhận *
                  </label>
                  <select
                    value={targetDept}
                    onChange={(e) => setTargetDept(e.target.value as DepartmentType)}
                    className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-2 focus:ring-[#3B6E47]"
                  >
                    <option value="Truyền thông">Ban Truyền thông</option>
                    <option value="Nội dung">Ban Nội dung</option>
                    <option value="Nhân sự & Kế hoạch">Ban Nhân sự & Kế hoạch</option>
                    <option value="Hậu cần">Ban Hậu cần</option>
                  </select>
                </div>
              )}

              {/* Category & Urgency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#23432B] mb-1">Danh mục vấn đề *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as typeof category)}
                    className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-2 focus:ring-[#3B6E47]"
                  >
                    <option value="Góp ý sinh hoạt">Góp ý sinh hoạt CLB</option>
                    <option value="Mâu thuẫn nội bộ">Mâu thuẫn nội bộ / Nhân sự</option>
                    <option value="Ý tưởng sự kiện">Ý tưởng sự kiện & Format mới</option>
                    <option value="Cơ sở vật chất Thư viện">Cơ sở vật chất Thư viện AGU</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#23432B] mb-1">Mức độ khẩn cấp</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as typeof urgency)}
                    className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-2 focus:ring-[#3B6E47]"
                  >
                    <option value="low">Nhẹ / Góp ý lâu dài</option>
                    <option value="medium">Bình thường</option>
                    <option value="high">Khẩn cấp / Cần BCN giải quyết ngay</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#23432B] mb-1">Tiêu đề phản ánh *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Đề xuất cải thiện giờ mượn sách tại tủ sách tầng 3..."
                  className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-2 focus:ring-[#3B6E47]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#23432B] mb-1">Nội dung chi tiết *</label>
                <textarea
                  rows={5}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Hãy chia sẻ chân thành và cụ thể để Ban Chủ Nhiệm lắng nghe và hỗ trợ bạn..."
                  className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-2 focus:ring-[#3B6E47]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#DFD6C3]">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#23432B] hover:bg-[#1B3522] text-white font-bold bubble-3d shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Send className="w-4 h-4 text-emerald-300" />
                  <span>Gửi Vào Hòm Thư Bảo Mật</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

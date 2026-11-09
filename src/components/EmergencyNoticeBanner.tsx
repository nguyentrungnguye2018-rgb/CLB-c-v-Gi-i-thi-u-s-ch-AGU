import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Megaphone,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  BellRing
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EmergencyNotice, UserProfile } from '../types';
import { isClubPresidentUser, isClubVicePresidentUser, isMasterRootUser } from '../utils/governance';

interface EmergencyNoticeBannerProps {
  notices: EmergencyNotice[];
  currentUser: UserProfile;
  isBcnMode: boolean;
  onAddNotice: (notice: Omit<EmergencyNotice, 'id' | 'issuedAt'>) => void;
  onDismissNotice?: (id: string) => void;
  onToggleNoticeActive?: (id: string, active: boolean) => void;
  onDeleteNotice?: (id: string) => void;
}

export const EmergencyNoticeBanner: React.FC<EmergencyNoticeBannerProps> = ({
  notices,
  currentUser,
  isBcnMode,
  onAddNotice,
  onDismissNotice,
  onToggleNoticeActive,
  onDeleteNotice
}) => {
  const isPresident = isClubPresidentUser(currentUser);
  const isVicePresident = isClubVicePresidentUser(currentUser);
  const isRoot = isMasterRootUser(currentUser);
  const canIssueEmergency = isPresident || isVicePresident || isRoot || isBcnMode;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNoticeToView, setSelectedNoticeToView] = useState<EmergencyNotice | null>(null);

  // New emergency form
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newSeverity, setNewSeverity] = useState<'urgent' | 'critical' | 'alert'>('critical');
  const [newPinned, setNewPinned] = useState(true);

  // Active notices to show in top banner
  const activeNotices = notices.filter(n => n.isActive);

  const handleCreateEmergency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const roleLabel = isPresident
      ? 'Chủ nhiệm CLB'
      : isVicePresident
      ? 'Phó Chủ nhiệm CLB'
      : isRoot
      ? 'Tài khoản Chính CLB'
      : 'Ban Chủ Nhiệm';

    onAddNotice({
      title: newTitle.trim(),
      content: newContent.trim(),
      severity: newSeverity,
      issuedBy: currentUser.name,
      issuedByRole: roleLabel,
      isActive: true,
      pinned: newPinned
    });

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.2 },
      colors: ['#C8532B', '#E5A140', '#382215']
    });

    setNewTitle('');
    setNewContent('');
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Top Emergency Broadcast Banner (if there are active emergency notices) */}
      {activeNotices.length > 0 && (
        <div className="w-full bg-[#C8532B] text-white border-b-2 border-[#382215] shadow-md px-3 sm:px-6 py-2">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#FAF3E3] text-[#C8532B] font-black shrink-0 animate-pulse border border-[#382215]">
                <BellRing className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-[#FAF3E3] text-[#C8532B] font-black text-[10px] uppercase tracking-wider border border-[#382215]">
                  {activeNotices[0].severity === 'critical'
                    ? 'LỆNH KHẨN CẤP'
                    : activeNotices[0].severity === 'urgent'
                    ? 'CỰC KỲ KHẨN'
                    : 'THÔNG BÁO QUAN TRỌNG'}
                </span>
                <span className="font-bold text-xs sm:text-sm truncate font-serif-vintage tracking-wide">
                  {activeNotices[0].title}
                </span>
                <span className="text-[11px] text-[#FAF3E3]/85 hidden md:inline truncate max-w-md">
                  — {activeNotices[0].content}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedNoticeToView(activeNotices[0])}
                className="px-3 py-1 rounded-lg bg-[#FAF3E3] hover:bg-[#F2E5C9] text-[#382215] font-extrabold text-xs flex items-center gap-1 cursor-pointer transition shadow-[2px_2px_0px_#382215] border border-[#382215]"
              >
                <span>Xem Chi Tiết</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onDeleteNotice) onDeleteNotice(activeNotices[0].id);
                  if (onDismissNotice) onDismissNotice(activeNotices[0].id);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#FAF3E3] hover:bg-rose-100 text-rose-800 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition border-2 border-rose-600 shadow-[2px_2px_0px_#382215]"
                title="Gỡ bỏ hoàn toàn thông báo khẩn này"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Gỡ Lệnh Khẩn Cấp</span>
              </button>

              {canIssueEmergency && (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-[#382215] hover:bg-[#4D301E] text-[#E5A140] font-bold text-xs flex items-center gap-1 cursor-pointer transition border-2 border-[#E5A140] shadow-[2px_2px_0px_#382215]"
                  title="Quản lý và phát thông báo khẩn mới"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Phát Lệnh Mới</span>
                </button>
              )}

              {onDismissNotice && (
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteNotice) onDeleteNotice(activeNotices[0].id);
                    if (onDismissNotice) onDismissNotice(activeNotices[0].id);
                  }}
                  className="p-1.5 rounded-xl bg-[#FAF3E3] hover:bg-white text-[#382215] border-2 border-[#382215] cursor-pointer shadow-[2px_2px_0px_#382215] transition"
                  title="Gỡ bỏ hoàn toàn thông báo này"
                >
                  <X className="w-4 h-4 text-[#382215]" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* When no active notices exist, do not clutter top of page */}
      {activeNotices.length === 0 && null}

      {/* Modal: View Full Emergency Directive */}
      {selectedNoticeToView && (
        <div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#FAF3E3] rounded-2xl border-3 border-[#382215] shadow-[6px_6px_0px_#382215] max-w-lg w-full overflow-hidden">
            <div className="bg-[#C8532B] text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-[#382215]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FAF3E3] text-[#C8532B] flex items-center justify-center font-black">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#FAF3E3] text-[#C8532B] border border-[#382215]">
                    THÔNG BÁO KHẨN CẤP CLB
                  </span>
                  <h3 className="font-bold text-base font-serif-vintage mt-1 text-white">
                    {selectedNoticeToView.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNoticeToView(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-[#FFFDF8] p-4 rounded-xl border-2 border-[#382215]/20 text-[#382215] leading-relaxed whitespace-pre-line text-sm font-serif-vintage">
                {selectedNoticeToView.content}
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#F2E5C9] border border-[#382215]/20 text-[11px] text-[#5C432C]">
                <div>
                  <div>Phát bởi: <strong>{selectedNoticeToView.issuedBy}</strong> ({selectedNoticeToView.issuedByRole})</div>
                  <div className="text-stone-500">Thời gian: {selectedNoticeToView.issuedAt}</div>
                </div>
                {onDeleteNotice && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteNotice(selectedNoticeToView.id);
                      if (onDismissNotice) onDismissNotice(selectedNoticeToView.id);
                      setSelectedNoticeToView(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black flex items-center gap-1.5 cursor-pointer border-2 border-[#382215] shadow-[2px_2px_0px_#382215]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Gỡ Lệnh Khẩn Cấp</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedNoticeToView(null)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#382215] hover:bg-[#4D301E] text-[#FAF3E3] font-bold text-xs cursor-pointer shadow-[2px_2px_0px_#C8532B]"
                >
                  Đã Đọc & Tiếp Nhận Chỉ Đạo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Issue New Emergency Notice (Chủ nhiệm & Phó Chủ nhiệm) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#FAF3E3] rounded-2xl border-3 border-[#382215] shadow-[6px_6px_0px_#382215] max-w-lg w-full overflow-hidden">
            <div className="bg-[#382215] text-[#FAF3E3] p-4 sm:p-5 flex items-center justify-between border-b-2 border-[#C8532B]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#C8532B] text-white flex items-center justify-center font-black">
                  <Megaphone className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-serif-vintage text-[#FAF3E3]">
                    Phát Thông Báo Khẩn Toàn CLB
                  </h3>
                  <p className="text-[11px] text-[#F2E5C9]/80">
                    Quyền hạn của Chủ nhiệm & Phó Chủ nhiệm CLB Đọc và Giới thiệu sách
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmergency} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#382215] mb-1">
                  1. Mức độ khẩn cấp *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'critical', label: 'Lệnh Khẩn Cấp 🚨', color: 'border-[#C8532B] bg-[#C8532B] text-white' },
                    { id: 'urgent', label: 'Cực Kỳ Khẩn ⚡', color: 'border-[#E5A140] bg-[#E5A140] text-stone-900' },
                    { id: 'alert', label: 'Quan Trọng 📢', color: 'border-[#245351] bg-[#245351] text-white' }
                  ].map(lvl => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setNewSeverity(lvl.id as any)}
                      className={`p-2 rounded-xl text-center font-bold text-xs border-2 cursor-pointer transition ${
                        newSeverity === lvl.id
                          ? `${lvl.color} shadow-[2px_2px_0px_#382215]`
                          : 'bg-[#FFFDF8] text-[#5C432C] border-[#382215]/30 hover:border-[#382215]'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#382215] mb-1">
                  2. Tiêu đề thông báo khẩn *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: KHẨN CẤP: Dời lịch sinh hoạt tuần này sang Thứ Bảy..."
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#382215]/30 bg-white font-bold text-sm focus:border-[#C8532B] text-[#382215]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#382215] mb-1">
                  3. Nội dung chỉ đạo khẩn chi tiết *
                </label>
                <textarea
                  rows={4}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Ghi rõ lý do khẩn, thời gian, địa điểm, các bước toàn thể thành viên hoặc ban bệ cần chấp hành..."
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#382215]/30 bg-white font-medium text-xs leading-relaxed focus:border-[#C8532B] text-[#382215]"
                />
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F2E5C9] border border-[#382215]/20">
                <input
                  type="checkbox"
                  id="pinEmergency"
                  checked={newPinned}
                  onChange={(e) => setNewPinned(e.target.checked)}
                  className="rounded text-[#C8532B]"
                />
                <label htmlFor="pinEmergency" className="font-bold text-[#382215] cursor-pointer">
                  Ghim nổi bật ngay đầu trang cho toàn thể thành viên khi mở web
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#382215]/15">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F2E5C9] text-[#382215] font-bold text-xs cursor-pointer border border-[#382215]/30"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#C8532B] hover:bg-[#A83E1B] text-white font-black text-xs cursor-pointer shadow-[3px_3px_0px_#382215] border-2 border-[#382215] flex items-center gap-1.5"
                >
                  <Megaphone className="w-4 h-4 text-amber-300" />
                  <span>Ban Hành Thông Báo Khẩn</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

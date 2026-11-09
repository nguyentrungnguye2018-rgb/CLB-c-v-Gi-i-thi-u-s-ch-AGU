import React from 'react';
import {
  Flame,
  Users2,
  UserPlus,
  Vault,
  Award,
  Mail,
  Crown,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  X,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile } from '../types';
import { ActiveTab } from './Navbar';
import { isClubPresidentUser, isClubVicePresidentUser, isMasterRootUser } from '../utils/governance';

interface WelcomeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  isBcnMode: boolean;
  onNavigateTab: (tab: ActiveTab) => void;
}

export const WelcomeGuideModal: React.FC<WelcomeGuideModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isBcnMode,
  onNavigateTab
}) => {
  if (!isOpen) return null;

  const isPresident = isClubPresidentUser(currentUser);
  const isVicePresident = isClubVicePresidentUser(currentUser);
  const isRoot = isMasterRootUser(currentUser);
  const isBcnLeader = isPresident || isVicePresident || isRoot || isBcnMode || currentUser.role === 'bcn_admin';
  const isSubDeptLeader = !isBcnLeader && (currentUser.departmentRole === 'leader' || currentUser.departmentRole === 'vice_leader' || currentUser.role === 'lead');

  const handleFinishGuide = () => {
    confetti({
      particleCount: 70,
      spread: 65,
      origin: { y: 0.6 }
    });
    onClose();
  };

  const handleJumpToTab = (tab: ActiveTab) => {
    onNavigateTab(tab);
    onClose();
  };

  const guideSteps = [
    {
      step: '01',
      title: 'Bảng Tin E-News, Tra Cứu Sách & Giữ Chuỗi Đọc Sách',
      badge: 'Chuỗi bắt đầu từ 0 ngày 🔥',
      description:
        'Trang web đã được làm sạch hoàn toàn để bắt đầu hành trình mới. Mỗi ngày, hãy bấm "Điểm danh giữ chuỗi", đăng bài Tản văn, gửi bài Cảm nhận sách hoặc khoảnh khắc Locket để tăng chuỗi lửa và điểm rèn luyện. Bạn cũng có thể tra cứu thông tin sách & tác giả trực tiếp từ Google.',
      icon: Flame,
      accentBg: 'bg-[#FFF3E6]',
      accentText: 'text-[#C8532B]',
      tab: 'feed' as ActiveTab,
      ctaLabel: 'Mở Bảng Tin & Chuỗi'
    },
    {
      step: '02',
      title: 'Sơ Đồ 4 Ban & Chế Độ Kiêm Nhiệm Đa Ban',
      badge: 'Hỗ trợ kiêm nhiệm cùng lúc 👥',
      description:
        'Quản lý nhân sự 4 ban: Truyền thông, Nội dung, Nhân sự & Kế hoạch, Hậu cần. Đặc biệt, một thành viên có thể kiêm nhiệm nhiều chức vụ ở nhiều ban cùng lúc (vừa ở BCN hoặc ban hiện tại, vừa kiêm thêm ban khác) mà không mất chức vụ cũ.',
      icon: Users2,
      accentBg: 'bg-[#E9F5EC]',
      accentText: 'text-[#245351]',
      tab: 'org' as ActiveTab,
      ctaLabel: 'Xem Sơ Đồ 4 Ban'
    },
    ...(isBcnLeader || isSubDeptLeader
      ? [
          {
            step: '03',
            title: isBcnLeader
              ? 'Tuyển Thành Viên & Sao Chép Link Tuyển Quân'
              : 'Xác Nhận Thành Viên Vào Ban Chuyên Môn',
            badge: isBcnLeader ? 'Form & Link tuyển quân trực tuyến 📋' : 'Dành cho Trưởng / Phó Ban ✅',
            description: isBcnLeader
              ? 'Tạo bộ câu hỏi phỏng vấn (bắt buộc hoặc tùy chọn), bấm "Sao Chép Link Tuyển Quân" để gửi link nộp đơn trực tiếp cho sinh viên. Sau khi Chủ nhiệm/Phó Chủ nhiệm duyệt sơ tuyển, Trưởng/Phó ban sẽ xác nhận thành viên vào nhóm.'
              : 'Khi ứng viên đã được Chủ nhiệm/Phó Chủ nhiệm CLB duyệt sơ tuyển và chọn ban của bạn, bạn chỉ cần vào mục này bấm "Xác nhận tiếp nhận vào ban".',
            icon: UserPlus,
            accentBg: 'bg-[#FDF4DC]',
            accentText: 'text-[#8C3B1E]',
            tab: 'recruitment' as ActiveTab,
            ctaLabel: isBcnLeader ? 'Mở Cổng Tuyển Thành Viên' : 'Mở Ô Xác Nhận Vào Nhóm'
          }
        ]
      : []),
    {
      step: isBcnLeader || isSubDeptLeader ? '04' : '03',
      title: 'Kế Hoạch BCN, Két Quỹ Minh Bạch & Sao Năm Cánh',
      badge: 'Quỹ công khai từ 0 ₫ 🏛️',
      description:
        'Theo dõi kế hoạch hoạt động của CLB, quan sát Két quỹ thu chi minh bạch 100%, nộp minh chứng xét danh hiệu Sao Năm Cánh (Sinh viên 5 tốt), gửi góp ý qua Hòm thư ẩn danh và lưu giữ truyền thống tại Bảo tàng CLB.',
      icon: Vault,
      accentBg: 'bg-[#F3ECF8]',
      accentText: 'text-[#5A3868]',
      tab: 'vault' as ActiveTab,
      ctaLabel: 'Xem Két Quỹ CLB'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#FAF3E3] border-3 border-[#382215] shadow-[8px_8px_0px_#382215] text-[#382215] flex flex-col">
        {/* Top Header with Flat Rounded 3-Logo Image */}
        <div className="p-5 sm:p-7 bg-[#F2E5C9] border-b-3 border-[#382215] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <img
              src="/assets/aistudio/TUYE__N_THA_NH_VIE_N_778c37b9.png"
              alt="Bộ ba Logo Trường Đại học An Giang - Hội Sinh Viên - CLB Đọc và Giới thiệu sách"
              className="h-14 sm:h-16 w-auto object-contain rounded-full shrink-0"
            />
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#C8532B] text-white text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-[#FFE29A]" />
                <span>Chào Mừng & Hướng Dẫn Sử Dụng</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-serif-vintage text-[#382215] leading-tight">
                Chào mừng {currentUser.name} đến với CLB Đọc và Giới Thiệu Sách!
              </h2>
              <p className="text-xs text-[#5C432C] font-semibold">
                Vai trò hiện tại: <strong className="text-[#8C3B1E]">{currentUser.position || `Ban ${currentUser.department}`}</strong> · Cẩm nang bắt đầu nhanh trên nền tảng chính thức
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 sm:static p-2 rounded-xl bg-[#FFFDF8] hover:bg-[#EAD8B3] border-2 border-[#382215] text-[#382215] cursor-pointer transition"
            title="Đóng hướng dẫn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Content: Step-by-step Cards */}
        <div className="p-5 sm:p-7 space-y-5 overflow-y-auto">
          <div className="p-4 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-[#C8532B] shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed text-[#4A3525]">
                <strong className="text-[#382215]">Trang web đã sẵn sàng hoạt động chính thức:</strong> Toàn bộ bài viết mẫu, quỹ mẫu và nhân sự thử nghiệm đã được làm sạch về <strong className="text-[#C8532B]">0</strong>. Dưới đây là các chức năng cốt lõi để bạn và câu lạc bộ bắt đầu ngay:
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guideSteps.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="p-5 rounded-2xl bg-[#FFFDF8] border-3 border-[#382215] shadow-[4px_4px_0px_#382215] flex flex-col justify-between gap-4 hover:-translate-y-0.5 transition"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-[#382215] text-[#FAF3E3] font-black text-xs flex items-center justify-center">
                          {item.step}
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${item.accentBg} ${item.accentText} border border-[#382215]/20`}>
                          {item.badge}
                        </span>
                      </div>
                      <Icon className={`w-5 h-5 ${item.accentText}`} />
                    </div>

                    <h3 className="font-black text-sm sm:text-base text-[#382215] font-serif-vintage leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-xs text-[#4A3525] leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#382215]/15 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleJumpToTab(item.tab)}
                      className="px-3.5 py-2 rounded-xl bg-[#F2E5C9] hover:bg-[#E5D3AC] text-[#382215] border-2 border-[#382215] font-black text-xs flex items-center gap-1.5 cursor-pointer transition shadow-[2px_2px_0px_#382215]"
                    >
                      <span>{item.ctaLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#C8532B]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Role Permissions Summary */}
          <div className="p-4 rounded-2xl bg-[#F2E5C9]/80 border-2 border-[#382215]/25 space-y-2 text-xs">
            <div className="font-black text-[#382215] flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[#8C3B1E]" />
              <span>Tóm tắt phân quyền vận hành trong Câu lạc bộ:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-[#4A3525]">
              <div className="p-2.5 rounded-xl bg-[#FFFDF8] border border-[#382215]/20">
                <strong className="text-[#C8532B] block mb-0.5">1. Chủ nhiệm & Phó Chủ nhiệm CLB:</strong>
                Quản lý toàn thể CLB, duyệt sơ tuyển ứng viên, bổ nhiệm Trưởng/Phó ban, điều chuyển thẳng thành viên & kiêm nhiệm, cập nhật Quỹ và xóa hồ sơ vi phạm ở Bảo tàng.
              </div>
              <div className="p-2.5 rounded-xl bg-[#FFFDF8] border border-[#382215]/20">
                <strong className="text-[#245351] block mb-0.5">2. Trưởng nhóm & Phó nhóm (4 Ban):</strong>
                Xác nhận thành viên mới vào ban của mình, hỗ trợ chuyển nhóm khi duyệt nhầm (báo cáo lên BCN), đăng chi phí vào Két quỹ và xem Hòm thư ẩn danh.
              </div>
              <div className="p-2.5 rounded-xl bg-[#FFFDF8] border border-[#382215]/20">
                <strong className="text-[#382215] block mb-0.5">3. Thành viên Câu lạc bộ:</strong>
                Điểm danh giữ chuỗi đọc sách, đăng bài E-News & Locket, nộp minh chứng Sinh viên 5 tốt, xem công khai Két quỹ CLB và gửi câu hỏi/góp ý ẩn danh.
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-4 sm:p-5 bg-[#F2E5C9] border-t-3 border-[#382215] flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-[#5C432C] font-semibold">
            💡 Bạn luôn có thể mở lại bảng này bất cứ lúc nào bằng nút <strong>"Hướng Dẫn"</strong> trên thanh công cụ.
          </span>
          <button
            type="button"
            onClick={handleFinishGuide}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-[#C8532B] hover:bg-[#A83E1B] text-white font-black text-xs sm:text-sm border-2 border-[#382215] shadow-[3px_3px_0px_#382215] flex items-center justify-center gap-2 cursor-pointer transition"
          >
            <CheckCircle2 className="w-4 h-4 text-[#FFE29A]" />
            <span>Đã Hiểu & Bắt Đầu Sử Dụng Ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Sparkles, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Lock, 
  ShieldCheck, 
  RefreshCw,
  Megaphone,
  Award,
  Crown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BOOK_ISLAND_QUOTES } from '../data/mockData';
import { UserProfile, ClubDecree } from '../types';

interface DynamicIslandProps {
  currentUser: UserProfile;
  onCheckIn: () => void;
  onOpenAuth: () => void;
  isBcnMode: boolean;
  latestDecree?: ClubDecree;
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({
  currentUser,
  onCheckIn,
  onOpenAuth,
  isBcnMode,
  latestDecree
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const todayStr = new Date().toLocaleDateString('vi-VN');
  const isCheckedInToday = currentUser.lastCheckInDate === todayStr;

  // Rotate quotes
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % BOOK_ISLAND_QUOTES.length);
    }, 14000);
    return () => clearInterval(timer);
  }, []);

  const handleIslandCheckIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCheckedInToday) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.15 },
        colors: ['#3B6E47', '#6AD5A1', '#C88A36', '#FAF6EB']
      });
      onCheckIn();
    }
  };

  const handleNextQuote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuoteIndex((prev) => (prev + 1) % BOOK_ISLAND_QUOTES.length);
  };

  const currentQuote = BOOK_ISLAND_QUOTES[quoteIndex];

  return (
    <div className="fixed top-2.5 left-1/2 -translate-x-1/2 z-50 max-w-[96vw]">
      {/* Invisible backdrop when expanded so clicking outside smoothly closes */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-[1px] -z-10"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(false);
          }}
        />
      )}

      <div 
        onClick={() => {
          if (!isExpanded) setIsExpanded(true);
        }}
        className={`bg-[#132817]/95 backdrop-blur-md text-[#F4F9F2] border border-[#436A4C]/70 shadow-2xl select-none ring-1 ring-emerald-500/30 rounded-2xl ${
          isExpanded 
            ? 'w-[94vw] sm:w-[560px] p-4 sm:p-5 ring-2 ring-amber-400/40 cursor-default' 
            : 'px-3 sm:px-4 py-1.5 cursor-pointer hover:bg-[#1A341F]'
        }`}
      >
        {/* =========================================================================
            COLLAPSED DYNAMIC ISLAND (KHUNG VUÔNG BO GÓC MỞ TỨC THÌ)
           ========================================================================= */}
        {!isExpanded ? (
          <div className="flex items-center gap-2 sm:gap-3 text-xs font-medium">
            {/* Official Club Logo Thumbnail */}
            <div className="flex items-center shrink-0">
              <img 
                src="/assets/aistudio/TUYE__N_THA_NH_VIE_N_778c37b9.png" 
                alt="Logo CLB" 
                className="h-5 sm:h-6 object-contain rounded-lg drop-shadow-xs"
              />
            </div>

            {/* Streak Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[#234A2C] rounded-lg text-[#6AD5A1] font-bold text-xs shrink-0 border border-emerald-500/40">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
              <span>{currentUser.readingStreak} ngày</span>
            </div>

            {/* Dynamic Content Snippet */}
            <div className="hidden sm:flex items-center gap-1.5 truncate max-w-[240px] text-[#DCE7DA]">
              {latestDecree?.pinToIsland ? (
                <>
                  <Megaphone className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-bounce" />
                  <span className="truncate text-rose-200 font-semibold text-xs">
                    {latestDecree.title}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="truncate italic text-xs">"{currentQuote.text}"</span>
                </>
              )}
            </div>

            <div className="sm:hidden flex items-center text-[11px] text-[#E1EBDC] truncate max-w-[110px]">
              <span>{currentUser.nickname || currentUser.name}</span>
            </div>

            {/* Status / Quick Check-in button right on collapsed island */}
            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              {!isCheckedInToday ? (
                <button
                  type="button"
                  onClick={handleIslandCheckIn}
                  className="px-2 py-0.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold text-[10px] flex items-center gap-1 shadow-2xs transition cursor-pointer"
                >
                  <Flame className="w-3 h-3 fill-stone-950" />
                  <span>Giữ chuỗi +1</span>
                </button>
              ) : (
                <span className="text-[10px] text-emerald-300 font-semibold hidden xs:inline">
                  ✓ Đã giữ chuỗi
                </span>
              )}
              {isBcnMode && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold bg-amber-400/20 text-amber-300 rounded-md border border-amber-400/50 shadow-2xs">
                  <Crown className="w-3 h-3 text-amber-400" />
                  BCN
                </span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-[#8BAE90]" />
            </div>
          </div>
        ) : (
          /* =========================================================================
              EXPANDED ISLAND DASHBOARD (BẢNG ĐIỀU KHIỂN ĐẢO SÁCH)
             ========================================================================= */
          <div className="space-y-4 text-xs">
            {/* Top Bar with Official Emblem */}
            <div className="flex items-center justify-between pb-3 border-b border-[#2C4E36]">
              <div className="flex items-center gap-3">
                <div className="p-1 rounded-xl bg-white/10 border border-white/20 shadow-xs shrink-0">
                  <img 
                    src="/assets/aistudio/TUYE__N_THA_NH_VIE_N_778c37b9.png" 
                    alt="Logo CLB Đọc Sách" 
                    className="h-9 sm:h-10 object-contain drop-shadow-sm"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-400 text-stone-900 uppercase tracking-wider">
                      Book Island
                    </span>
                    <h4 className="font-bold text-white tracking-wide text-xs sm:text-sm font-serif-vintage">
                      {currentUser.name}
                    </h4>
                  </div>
                  <p className="text-[10px] text-[#A6C5AB] mt-0.5">
                    Bút danh: <strong className="text-amber-300">{currentUser.nickname || 'Chưa đặt'}</strong> • Ban {currentUser.department}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleNextQuote}
                  title="Đổi câu nói truyền cảm hứng"
                  className="p-1.5 rounded-lg hover:bg-[#2C4E36] text-[#A6C5AB] transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                  }}
                  className="p-1.5 rounded-lg hover:bg-[#2C4E36] text-[#A6C5AB] cursor-pointer"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Pinned Decree if exists */}
            {latestDecree && (
              <div className="bg-rose-950/70 p-2.5 rounded-xl border border-rose-500/40 text-[11px] text-rose-100 flex items-start gap-2">
                <Megaphone className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-bold text-rose-200">{latestDecree.title}: </span>
                  <span>{latestDecree.content}</span>
                </div>
              </div>
            )}

            {/* Quotation card */}
            <div className="bg-[#0E1E12] p-3.5 rounded-2xl border border-[#2D5037] text-xs space-y-2">
              <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Góc Trầm Tích Sách & Cuộc Sống
                </span>
                <span className="text-[#8FB394] font-medium font-mono">
                  {quoteIndex + 1}/{BOOK_ISLAND_QUOTES.length}
                </span>
              </div>

              <p className="text-[#E6F0E5] italic leading-relaxed font-serif text-[11px] sm:text-xs">
                "{currentQuote.text}"
              </p>

              <div className="flex items-center justify-between pt-1.5 border-t border-[#1C3621] text-[10px] text-[#95B799]">
                <span>Tác giả: <strong>{currentQuote.author}</strong></span>
                <span className="text-emerald-400 font-medium">#VănHóaĐọcSinhViên</span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-[#1C3621] p-2.5 rounded-xl border border-[#355B3C]">
                <div className="flex items-center justify-center gap-1 text-amber-400 font-bold text-sm">
                  <Flame className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{currentUser.readingStreak}</span>
                </div>
                <div className="text-[10px] text-[#ADC6B0] mt-0.5">Chuỗi Sách (ngày)</div>
              </div>

              <div className="bg-[#1C3621] p-2.5 rounded-xl border border-[#355B3C]">
                <div className="flex items-center justify-center gap-1 text-[#6AD5A1] font-bold text-sm">
                  <Award className="w-3.5 h-3.5" />
                  <span>{currentUser.meritPoints || 50}</span>
                </div>
                <div className="text-[10px] text-[#ADC6B0] mt-0.5">Điểm Lửa BCN</div>
              </div>

              <div className="bg-[#1C3621] p-2.5 rounded-xl border border-[#355B3C]">
                <div className="text-emerald-400 font-bold text-sm">
                  {currentUser.s5tProgress}%
                </div>
                <div className="text-[10px] text-[#ADC6B0] mt-0.5">Tiến độ SV5T</div>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleIslandCheckIn}
                disabled={isCheckedInToday}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs transition shadow-md ${
                  isCheckedInToday
                    ? 'bg-[#26442E] text-[#9BB9A0] cursor-default'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer active:scale-95'
                }`}
              >
                {isCheckedInToday ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Đã giữ chuỗi hôm nay ({todayStr}) • +10 Điểm Lửa!</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-bounce" />
                    <span>Điểm danh Giữ Chuỗi hôm nay (+1 🔥 & +10 Điểm Lửa)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAuth();
                  setIsExpanded(false);
                }}
                className="py-2.5 px-3.5 rounded-xl bg-[#223E28] hover:bg-[#2C4E33] text-[#D3E4D1] text-xs font-semibold border border-[#3E6547] flex items-center gap-1.5 transition cursor-pointer"
              >
                {isBcnMode ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>BCN War Room</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-[#9CBDA0]" />
                    <span>Đổi tài khoản / Nickname</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

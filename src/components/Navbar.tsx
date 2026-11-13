import React from 'react';
import { 
  Flame, 
  Award, 
  Mail, 
  Vault, 
  Users2, 
  KeyRound,
  Crown,
  UserPlus,
  UserCheck,
  History,
  HelpCircle,
  LogOut,
  Bell,
  Vote
} from 'lucide-react';
import { UserProfile, EmergencyNotice } from '../types';
import { isClubPresidentUser, isClubVicePresidentUser, isMasterRootUser } from '../utils/governance';

export type ActiveTab = 'feed' | 'command' | 'surveys' | 's5t' | 'reports' | 'vault' | 'org' | 'recruitment' | 'fame';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  currentUser: UserProfile;
  isBcnMode: boolean;
  onOpenAuthModal: () => void;
  onOpenGuide?: () => void;
  onLogout?: () => void;
  pendingTotalCount?: number;
  activeEmergencyNotice?: EmergencyNotice | null;
  activeDecreesCount?: number;
  unreadAlertsCount?: number;
  onOpenEmergencyModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  isBcnMode,
  onOpenAuthModal,
  onOpenGuide,
  onLogout,
  activeEmergencyNotice,
  activeDecreesCount,
  unreadAlertsCount = 0,
  onOpenEmergencyModal
}) => {
  const isPresident = isClubPresidentUser(currentUser);
  const isVicePresident = isClubVicePresidentUser(currentUser);
  const isRoot = isMasterRootUser(currentUser);
  const isBcnLeader = isPresident || isVicePresident || isRoot || isBcnMode || currentUser.role === 'bcn_admin';
  const isSubDeptLeader = !isBcnLeader && (currentUser.departmentRole === 'leader' || currentUser.departmentRole === 'vice_leader' || currentUser.role === 'lead');

  const navItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'feed', label: 'Bảng Tin & Chuỗi', icon: Flame },
    { id: 'org', label: 'Nhân sự', icon: Users2 },
    { id: 'command', label: 'Kế Hoạch & BCN', icon: Crown },
    { id: 'surveys', label: 'Khảo Sát & Biên Bản', icon: Vote },
  ];

  if (isBcnLeader) {
    navItems.push({ id: 'recruitment', label: 'Tuyển Thành Viên', icon: UserPlus });
  } else if (isSubDeptLeader) {
    navItems.push({ id: 'recruitment', label: 'Xác Nhận Vào Nhóm', icon: UserCheck });
  }

  navItems.push(
    { id: 'reports', label: 'Hòm Thư Ẩn Danh', icon: Mail },
    { id: 's5t', label: 'Sao Năm Cánh', icon: Award },
    { id: 'vault', label: 'Két Quỹ CLB', icon: Vault },
    { id: 'fame', label: 'Bảo Tàng', icon: History }
  );

  return (
    <header className="sticky top-0 z-40 bg-[#FAF3E3]/95 backdrop-blur-md border-b-2 border-[#382215]/20 shadow-sm py-2.5 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex items-center justify-between w-full lg:w-auto gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative inline-flex items-center shrink-0">
              <div 
                onClick={() => onSelectTab('feed')}
                className="flex items-center cursor-pointer shrink-0 group"
                title="Câu Lạc Bộ Đọc và Giới Thiệu Sách - Trường Đại Học An Giang"
              >
                <img 
                  src="/assets/aistudio/TUYE__N_THA_NH_VIE_N_778c37b9.png" 
                  alt="Bộ ba Logo CLB Đọc và Giới thiệu sách AGU" 
                  className="h-11 sm:h-13 w-auto object-contain rounded-full shrink-0 group-hover:scale-105 transition-transform"
                />
              </div>

              {onOpenEmergencyModal && (
                <button
                  type="button"
                  onClick={onOpenEmergencyModal}
                  className={`absolute -top-1.5 -right-2.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-white border-2 border-[#382215] shadow-[2px_2px_0px_#382215] cursor-pointer transition-transform hover:scale-110 z-10 ${
                    unreadAlertsCount > 0
                      ? 'bg-[#C8532B] hover:bg-rose-700'
                      : 'bg-[#245351] hover:bg-[#1B3E3D]'
                  }`}
                  title="Bấm để xem Bảng Sắc Lệnh Thông Tri & Thông Báo CLB"
                >
                  <Bell className={`w-2.5 h-2.5 text-[#FFE29A] ${unreadAlertsCount > 0 ? 'animate-bounce' : ''}`} />
                  <span className="text-[8px] font-black tracking-tighter uppercase text-[#FFE29A]">
                    {unreadAlertsCount > 0 ? `${unreadAlertsCount} MỚI` : 'THÔNG BÁO'}
                  </span>
                </button>
              )}
            </div>

            {(activeEmergencyNotice || (activeDecreesCount && activeDecreesCount > 0)) && onOpenEmergencyModal && (
              <button
                type="button"
                onClick={onOpenEmergencyModal}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C8532B] hover:bg-[#A83E1B] text-white text-[11px] font-black shadow-[2px_2px_0px_#382215] border-2 border-[#382215] cursor-pointer transition-all"
              >
                <span className="px-1.5 py-0.2 rounded-full bg-[#FFE29A] text-[#382215] text-[9px] font-black uppercase">
                  {unreadAlertsCount > 0 ? 'MỚI' : 'TIN'}
                </span>
                <span className="truncate max-w-[110px] sm:max-w-[170px]">
                  {activeEmergencyNotice ? activeEmergencyNotice.title : 'Sắc Lệnh Thông Tri'}
                </span>
              </button>
            )}
          </div>

          <div className="lg:hidden flex items-center gap-1.5 shrink-0">
            {onOpenGuide && (
              <button
                type="button"
                onClick={onOpenGuide}
                className="p-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215]/30 text-[#8C3B1E] cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="flex items-center gap-2 py-1.5 px-2 bg-[#F2E5C9] rounded-xl border-2 border-[#382215]/20 text-xs cursor-pointer shrink-0"
            >
              <img src={currentUser.avatar} alt={currentUser.name} className="w-7 h-7 rounded-full object-cover" />
              <div className="text-left leading-tight">
                <div className="font-bold text-[#382215] truncate max-w-[85px]">{currentUser.name}</div>
              </div>
            </button>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-2 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-700 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <nav className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id as ActiveTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#C8532B] text-[#FFFDF7] border-2 border-[#382215] shadow-[2px_2px_0px_#382215]'
                    : 'text-[#382215] hover:bg-[#EFE2C6] hover:text-[#8C3B1E] border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#FFE29A]' : 'text-[#6E472B]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-2 shrink-0">
          {onOpenGuide && (
            <button
              type="button"
              onClick={onOpenGuide}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215] text-[#382215] text-xs font-extrabold cursor-pointer shadow-[2px_2px_0px_#382215]"
            >
              <HelpCircle className="w-4 h-4 text-[#C8532B]" />
              <span>Hướng Dẫn</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="flex items-center gap-2.5 py-1.5 pl-2 pr-3 rounded-2xl bg-[#F2E5C9] border-2 border-[#382215] text-[#382215] cursor-pointer shadow-[2px_2px_0px_#382215]"
          >
            <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
            <div className="text-left text-xs leading-tight">
              <div className="font-extrabold text-[#382215] truncate max-w-[140px]">{currentUser.name}</div>
              <div className="text-[10px] font-semibold text-[#8C3B1E] truncate max-w-[140px]">
                {currentUser.position || `Ban ${currentUser.department}`}
              </div>
            </div>
            <div className="pl-1.5 border-l border-[#382215]/25 text-[#382215]">
              <KeyRound className="w-3.5 h-3.5" />
            </div>
          </button>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-2.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-800 cursor-pointer shadow-[2px_2px_0px_#382215]"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

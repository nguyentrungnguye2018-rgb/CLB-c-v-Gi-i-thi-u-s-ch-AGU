import React, { useState } from 'react';
import {
  Bell,
  UserPlus,
  X,
  CheckCircle2,
  ShieldAlert,
  FileText
} from 'lucide-react';
import {
  RecruitmentApplication,
  ClubPlan,
  ConfidentialReport,
  UserProfile
} from '../types';
import { ActiveTab } from './Navbar';

export interface BcnPushToastItem {
  id: string;
  type: 'new_application' | 'new_plan' | 'new_report';
  title: string;
  subtitle: string;
  meta: string;
  timestamp: string;
  targetTab: ActiveTab;
  itemId: string;
}

interface BcnToastManagerProps {
  currentUser: UserProfile;
  isBcnMode: boolean;
  isMasterRoot: boolean;
  applications: RecruitmentApplication[];
  plans: ClubPlan[];
  reports: ConfidentialReport[];
  onNavigateTab: (tab: ActiveTab) => void;
}

export const BcnToastManager: React.FC<BcnToastManagerProps> = ({
  currentUser,
  isBcnMode,
  isMasterRoot,
  applications,
  plans,
  reports,
  onNavigateTab
}) => {
  const isBcnAuthorized = isBcnMode || currentUser.role === 'bcn_admin' || isMasterRoot;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Only count items that are strictly pending approval
  const pendingApplications = applications.filter(a => a.status === 'pending');
  const pendingPlans = plans.filter(p => p.status === 'under_discussion');
  const pendingReports = reports.filter(r => r.status !== 'resolved');

  const totalPendingCount = pendingApplications.length + pendingPlans.length + pendingReports.length;

  if (!isBcnAuthorized) return null;

  return (
    <>
      {/* Clean, non-intrusive BCN Inbox Button in Bottom-Right (No auto-popping floating banners blocking the screen) */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="relative flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#382215] hover:bg-[#4D301E] text-[#FAF3E3] border-2 border-[#E5A140] shadow-xl transition-all cursor-pointer"
          title="Hòm thư việc chờ duyệt dành cho Ban Chủ Nhiệm"
        >
          <div className="relative">
            <Bell className="w-4 h-4 text-[#E5A140]" />
            {totalPendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#C8532B] text-white text-[9px] font-black flex items-center justify-center">
                {totalPendingCount}
              </span>
            )}
          </div>
          <span className="text-xs font-bold hidden sm:inline">
            {totalPendingCount > 0
              ? `Hòm Thư Chờ Duyệt (${totalPendingCount})`
              : 'Hòm Thư Duyệt Trống (0)'}
          </span>
        </button>
      </div>

      {/* BCN Notification Center Drawer Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[85] bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-5">
          <div className="bg-[#FAF3E3] border-2 border-[#382215] rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#382215] text-[#FAF3E3] p-4 sm:p-5 flex items-center justify-between border-b-2 border-[#C8532B]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E5A140] text-[#382215] flex items-center justify-center font-bold shadow-xs">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base font-serif-vintage text-[#FAF3E3]">
                    Hòm Thư Duyệt BCN ({totalPendingCount} việc chờ)
                  </h3>
                  <p className="text-[11px] text-[#F2E5C9]/80">
                    Mục nào duyệt xong sẽ tự động biến mất khỏi danh sách
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
              {totalPendingCount === 0 ? (
                <div className="py-12 px-4 rounded-2xl bg-[#FFFDF8] border border-[#D4C29A] text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-[#245351] mx-auto" />
                  <div className="font-bold text-sm text-[#382215]">
                    Hòm Thư Chờ Duyệt Hiện Đang Trống!
                  </div>
                  <p className="text-xs text-[#6B4E35]">
                    Tất cả đơn đăng ký, kế hoạch và báo cáo đều đã được xử lý gọn gàng.
                  </p>
                </div>
              ) : (
                <>
                  {/* Section 1: Pending Recruitment Applications */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#382215] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                        <UserPlus className="w-3.5 h-3.5 text-[#C8532B]" />
                        Đơn Tuyển Chờ Duyệt ({pendingApplications.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateTab('recruitment');
                          setIsDrawerOpen(false);
                        }}
                        className="text-[11px] font-bold text-[#245351] hover:underline cursor-pointer"
                      >
                        Mở cổng duyệt đơn →
                      </button>
                    </div>

                    {pendingApplications.length === 0 ? (
                      <div className="p-3 rounded-xl bg-[#FFFDF8] border border-[#D4C29A] text-[#6B4E35] text-center text-[11px]">
                        Hòm thư đơn tuyển trống.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pendingApplications.map(app => (
                          <div
                            key={app.id}
                            className="p-3 rounded-xl bg-[#FFFDF8] border border-[#D4C29A] shadow-2xs flex items-center justify-between gap-2"
                          >
                            <div className="space-y-0.5">
                              <div className="font-bold text-[#382215]">
                                {app.fullName} <span className="text-[10px] text-[#6B4E35]">({app.studentId})</span>
                              </div>
                              <div className="text-[11px] text-[#5C432C]">
                                Nguyện vọng: <strong>Ban {app.desiredDept}</strong>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                onNavigateTab('recruitment');
                                setIsDrawerOpen(false);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-[#C8532B] hover:bg-[#A83E1B] text-white font-bold text-[11px] shrink-0 cursor-pointer"
                            >
                              Duyệt Ngay
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 2: Pending Club Plans */}
                  <div className="space-y-2 pt-2 border-t border-[#D4C29A]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#382215] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                        <FileText className="w-3.5 h-3.5 text-[#245351]" />
                        Kế Hoạch Chờ Duyệt ({pendingPlans.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateTab('command');
                          setIsDrawerOpen(false);
                        }}
                        className="text-[11px] font-bold text-[#245351] hover:underline cursor-pointer"
                      >
                        Mở kho kế hoạch →
                      </button>
                    </div>

                    {pendingPlans.length === 0 ? (
                      <div className="p-3 rounded-xl bg-[#FFFDF8] border border-[#D4C29A] text-[#6B4E35] text-center text-[11px]">
                        Hòm thư duyệt kế hoạch trống.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pendingPlans.map(plan => (
                          <div
                            key={plan.id}
                            className="p-3 rounded-xl bg-[#FFFDF8] border border-[#D4C29A] shadow-2xs flex items-center justify-between gap-2"
                          >
                            <div className="space-y-0.5">
                              <div className="font-bold text-[#382215] line-clamp-1">
                                {plan.title}
                              </div>
                              <div className="text-[11px] text-[#5C432C]">
                                Đề xuất: <strong>{plan.proposedBy}</strong>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                onNavigateTab('command');
                                setIsDrawerOpen(false);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-[#245351] hover:bg-[#193C3A] text-white font-bold text-[11px] shrink-0 cursor-pointer"
                            >
                              Phê Duyệt
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 3: Pending Confidential Reports */}
                  <div className="space-y-2 pt-2 border-t border-[#D4C29A]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#382215] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                        <ShieldAlert className="w-3.5 h-3.5 text-[#C8532B]" />
                        Thư Ẩn Danh Chờ Xử Lý ({pendingReports.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateTab('reports');
                          setIsDrawerOpen(false);
                        }}
                        className="text-[11px] font-bold text-[#C8532B] hover:underline cursor-pointer"
                      >
                        Mở hòm thư →
                      </button>
                    </div>

                    {pendingReports.length === 0 ? (
                      <div className="p-3 rounded-xl bg-[#FFFDF8] border border-[#D4C29A] text-[#6B4E35] text-center text-[11px]">
                        Hòm thư ẩn danh trống.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pendingReports.map(rep => (
                          <div
                            key={rep.id}
                            className="p-3 rounded-xl bg-[#FFFDF8] border border-[#D4C29A] shadow-2xs flex items-center justify-between gap-2"
                          >
                            <div className="space-y-0.5">
                              <div className="font-bold text-[#382215] line-clamp-1">
                                {rep.title}
                              </div>
                              <div className="text-[10px] text-[#6B4E35]">
                                Chuyên mục: {rep.category} • {rep.createdAt}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                onNavigateTab('reports');
                                setIsDrawerOpen(false);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-[#C8532B] hover:bg-[#A83E1B] text-white font-bold text-[11px] shrink-0 cursor-pointer"
                            >
                              Xử Lý
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="p-3.5 bg-[#F2E5C9] border-t border-[#D4C29A] flex items-center justify-between text-[11px] text-[#382215]">
              <span className="flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#245351]" />
                Duyệt xong tự động làm trống hòm thư
              </span>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-3.5 py-1 rounded-lg bg-[#382215] text-[#FAF3E3] font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

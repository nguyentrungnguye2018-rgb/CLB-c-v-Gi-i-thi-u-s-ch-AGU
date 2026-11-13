import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  UserProfile, 
  Post, 
  LocketMoment, 
  S5TCriterion, 
  S5TProof, 
  ConfidentialReport, 
  Transaction,
  ClubPlan,
  ClubTask,
  ClubDecree,
  RecruitmentQuestion,
  RecruitmentApplication,
  HallOfFameItem,
  RoleType,
  AdminAccountType,
  DepartmentType,
  ClubTermRecord,
  EmergencyNotice,
  AnnualTheme,
  MemberEvaluation,
  PlanAnonymousFeedback
} from './types';
import { 
  SAMPLE_USERS, 
  INITIAL_POSTS, 
  INITIAL_LOCKET_MOMENTS, 
  S5T_CRITERIA_LIST, 
  INITIAL_S5T_PROOFS, 
  INITIAL_CONFIDENTIAL_REPORTS, 
  INITIAL_TRANSACTIONS,
  INITIAL_PLANS,
  INITIAL_TASKS,
  INITIAL_DECREES,
  MASTER_PASSCODE,
  INITIAL_RECRUITMENT_QUESTIONS,
  INITIAL_APPLICATIONS,
  HALL_OF_FAME_DATA,
  INITIAL_TERM_HISTORY
} from './data/mockData';
import { 
  fetchCloudState, 
  pushCloudSync, 
  registerUserToCloud,
  sendReportToCloud,
  sendReportResponseToCloud,
  sendPostToCloud,
  sendPostLikeToCloud,
  sendPostCommentToCloud,
  sendLocketToCloud,
  sendLocketReactToCloud,
  deleteUserFromCloud,
  transferSuccessionToCloud,
  updateProfileOnCloud,
  assignRoleOnCloud,
  approveDepartmentOnCloud,
  appointSubDeptLeadersOnCloud,
  appointTermBcnOnCloud,
  addTransactionToCloud,
  addPlanToCloud,
  deleteItemFromCloud,
  updateAnnualThemeOnCloud,
  dismissEmergencyNoticeOnCloud,
  submitApplicationToCloud,
  GlobalSyncState 
} from './services/cloudSync';
import {
  isMasterRootUser,
  isClubPresidentUser,
  isClubVicePresidentUser,
  approveUserIntoDepartment,
  rejectUserDepartmentRequest,
  appointSubDepartmentLeaders,
  assignSingleMemberSubDeptRole,
  appointClubTermLeaders,
  requestMemberGroupTransfer,
  directTransferMemberGroup
} from './utils/governance';
import { Download } from 'lucide-react';
import { safeLocalStorageSet } from './utils/fileUpload';
import { EmergencyNoticeBanner } from './components/EmergencyNoticeBanner';
import { Navbar, ActiveTab } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { InitialAuthGate } from './components/InitialAuthGate';
import { NewfeedSection } from './components/NewfeedSection';
import { BcnCommandCenter } from './components/BcnCommandCenter';
import { S5TTrackerSection } from './components/S5TTrackerSection';
import { ConfidentialReportSection } from './components/ConfidentialReportSection';
import { FinancialVaultSection } from './components/FinancialVaultSection';
import { OrgChartSection } from './components/OrgChartSection';
import { RecruitmentSection } from './components/RecruitmentSection';
import { SuccessionModal, SuccessionTransferPayload, FullTermAppointmentPayload } from './components/SuccessionModal';
import { HallOfFameSection } from './components/HallOfFameSection';
import { BcnToastManager } from './components/BcnToastManager';
import { WelcomeGuideModal } from './components/WelcomeGuideModal';
import { BookSearchGroundingWidget } from './components/BookSearchGroundingWidget';
import { SurveyMinutesSection } from './components/SurveyMinutesSection';
import { syncCurrentUserToFirestore, signOutFirebase } from './firebase';
import { 
  MapPin, 
  LogOut, 
  ShieldCheck, 
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X
} from 'lucide-react';

export default function App() {
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const autoStartParam = searchParams.get('autostart') === '1';
  const isDirectApplyLink = searchParams.get('apply') === '1' || pathname.includes('tuyen-thanh-vien');
  const roleParam = searchParams.get('role');
  const initialTabParam = searchParams.get('tab') as ActiveTab | null;

  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    isDirectApplyLink
      ? 'recruitment'
      : initialTabParam && ['feed', 'command', 'surveys', 's5t', 'reports', 'vault', 'org', 'recruitment', 'fame'].includes(initialTabParam)
        ? initialTabParam
        : 'feed'
  );
  const [isPublicApplyMode, setIsPublicApplyMode] = useState<boolean>(isDirectApplyLink);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSuccessionModalOpen, setIsSuccessionModalOpen] = useState(false);
  const [isWelcomeGuideOpen, setIsWelcomeGuideOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('agu_welcome_guide_v1_seen') !== 'true';
    } catch {
      return true;
    }
  });

  const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'offline'>('syncing');
  const lastServerUpdateRef = useRef<number>(0);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (autoStartParam) return true;
    const authFlag = localStorage.getItem('agu_authenticated') === 'true';
    const savedUser = localStorage.getItem('agu_user');
    return authFlag && Boolean(savedUser);
  });

  const [userList, setUserList] = useState<UserProfile[]>(() => {
    try {
      if (localStorage.getItem('agu_clean_official_launch_v4') !== 'true') {
        localStorage.removeItem('agu_user_list');
        localStorage.setItem('agu_clean_official_launch_v4', 'true');
      }
    } catch {
      // ignore
    }
    let deletedIds: string[] = [];
    try {
      const rawDel = localStorage.getItem('agu_deleted_user_ids');
      if (rawDel) deletedIds = JSON.parse(rawDel);
    } catch {
      // ignore
    }
    const deletedSet = new Set(deletedIds);
    const saved = localStorage.getItem('agu_user_list');
    if (saved) {
      try {
        const parsed: UserProfile[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter(u => u && !deletedSet.has(u.id));
          const existingIds = new Set(filtered.map(u => u.id));
          const merged = [...filtered];
          SAMPLE_USERS.forEach(su => {
            if (!existingIds.has(su.id) && !deletedSet.has(su.id)) merged.push(su);
          });
          return merged;
        }
      } catch {
        // ignore
      }
    }
    return SAMPLE_USERS.filter(u => !deletedSet.has(u.id));
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('agu_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
      } catch {
        // ignore
      }
    }
    return SAMPLE_USERS[0];
  });

  const [mySavedAccounts, setMySavedAccounts] = useState<UserProfile[]>([]);

  const rememberPersonalAccount = (_user: UserProfile) => {};

  const [isBcnMode, setIsBcnMode] = useState<boolean>(() => {
    if (autoStartParam) {
      if (roleParam === 'member' || roleParam === 'subdept' || roleParam === 'lead') return false;
      return true;
    }
    return localStorage.getItem('agu_is_bcn') === 'true';
  });

  const isMasterRoot = isMasterRootUser(currentUser) || (isBcnMode && currentUser.id === 'bcn-root');
  const isClubPresident = isClubPresidentUser(currentUser);
  const isClubVicePresident = isClubVicePresidentUser(currentUser);
  const isBcnLeader = isClubPresident || isClubVicePresident || isMasterRoot || isBcnMode || currentUser.role === 'bcn_admin';
  const isSubDeptLeader = !isBcnLeader && (currentUser.departmentRole === 'leader' || currentUser.departmentRole === 'vice_leader' || currentUser.role === 'lead');

  useEffect(() => {
    const isLeadershipUser = currentUser.role === 'bcn_admin' || currentUser.adminType === 'master_root' || currentUser.adminType === 'bcn_elected' || isMasterRootUser(currentUser) || isClubPresidentUser(currentUser) || isClubVicePresidentUser(currentUser);
    if (!isLeadershipUser && isBcnMode) {
      setIsBcnMode(false);
    }
  }, [currentUser, isBcnMode]);

  useEffect(() => {
    if (!isBcnLeader && !isSubDeptLeader && activeTab === 'recruitment' && !isDirectApplyLink && !isPublicApplyMode) {
      setActiveTab('feed');
    }
  }, [currentUser, isBcnLeader, isSubDeptLeader, activeTab, isDirectApplyLink, isPublicApplyMode]);

  const [posts, setPosts] = useState<Post[]>(() => {
    const saved = localStorage.getItem('agu_posts');
    return saved ? JSON.parse(saved) : INITIAL_POSTS;
  });

  const [locketMoments, setLocketMoments] = useState<LocketMoment[]>(() => {
    const saved = localStorage.getItem('agu_lockets');
    return saved ? JSON.parse(saved) : INITIAL_LOCKET_MOMENTS;
  });

  const [criteria, setCriteria] = useState<S5TCriterion[]>(() => {
    const saved = localStorage.getItem('agu_criteria');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 5) {
          return S5T_CRITERIA_LIST.map((official) => {
            const existing = parsed.find((c: any) => c && c.id === official.id);
            return existing ? { ...official, completedCount: existing.completedCount, status: existing.status } : official;
          });
        }
      } catch {
        // ignore
      }
    }
    return S5T_CRITERIA_LIST;
  });

  const [proofs, setProofs] = useState<S5TProof[]>(() => {
    const saved = localStorage.getItem('agu_proofs');
    return saved ? JSON.parse(saved) : INITIAL_S5T_PROOFS;
  });

  const [reports, setReports] = useState<ConfidentialReport[]>(() => {
    const saved = localStorage.getItem('agu_reports');
    return saved ? JSON.parse(saved) : INITIAL_CONFIDENTIAL_REPORTS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('agu_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [plans, setPlans] = useState<ClubPlan[]>(() => {
    const saved = localStorage.getItem('agu_plans');
    return saved ? JSON.parse(saved) : INITIAL_PLANS;
  });

  const [tasks, setTasks] = useState<ClubTask[]>(() => {
    const saved = localStorage.getItem('agu_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  const [decrees, setDecrees] = useState<ClubDecree[]>(() => {
    const saved = localStorage.getItem('agu_decrees');
    return saved ? JSON.parse(saved) : INITIAL_DECREES;
  });

  const [questions, setQuestions] = useState<RecruitmentQuestion[]>(() => {
    const saved = localStorage.getItem('agu_recruitment_questions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // ignore
      }
    }
    return INITIAL_RECRUITMENT_QUESTIONS;
  });

  const [applications, setApplications] = useState<RecruitmentApplication[]>(() => {
    const saved = localStorage.getItem('agu_applications');
    return saved ? JSON.parse(saved) : INITIAL_APPLICATIONS;
  });

  const [hallOfFame, setHallOfFame] = useState<HallOfFameItem[]>(() => {
    let deletedHofIds: string[] = [];
    try {
      deletedHofIds = JSON.parse(localStorage.getItem('agu_deleted_hof_ids') || '[]');
    } catch {
      // ignore
    }
    const saved = localStorage.getItem('agu_hall_of_fame');
    const baseList: HallOfFameItem[] = saved ? JSON.parse(saved) : HALL_OF_FAME_DATA;
    return Array.isArray(baseList) ? baseList.filter(item => item && !deletedHofIds.includes(item.id)) : [];
  });

  const [termHistory, setTermHistory] = useState<ClubTermRecord[]>(() => {
    const saved = localStorage.getItem('agu_term_history');
    return saved ? JSON.parse(saved) : INITIAL_TERM_HISTORY;
  });

  const [memberEvaluations, setMemberEvaluations] = useState<MemberEvaluation[]>(() => {
    const saved = localStorage.getItem('agu_member_evaluations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // ignore
      }
    }
    return [];
  });

  const [emergencyNotices, setEmergencyNotices] = useState<EmergencyNotice[]>(() => {
    const saved = localStorage.getItem('agu_emergency_notices');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(n => n && n.isActive);
      } catch {
        // ignore
      }
    }
    return [];
  });

  const [annualTheme, setAnnualTheme] = useState<AnnualTheme>(() => {
    const saved = localStorage.getItem('agu_annual_theme');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {
      theme: "Định vị tư duy, bản lĩnh tri thức — Khơi nguồn cảm hứng đọc sinh viên AGU",
      year: "2026 - 2027",
      setBy: "Chủ nhiệm CLB",
      setAt: "26/10/2026"
    };
  });

  const applyRemoteState = (cloudData: GlobalSyncState) => {
    if (cloudData.userList && Array.isArray(cloudData.userList)) {
      let localDeletedIds: string[] = [];
      try {
        const rawDel = localStorage.getItem('agu_deleted_user_ids');
        if (rawDel) localDeletedIds = JSON.parse(rawDel);
      } catch {
        // ignore
      }
      const combinedDeletedIds = Array.from(new Set([...(cloudData.deletedUserIds || []), ...localDeletedIds]));
      localStorage.setItem('agu_deleted_user_ids', JSON.stringify(combinedDeletedIds));
      const deletedSet = new Set(combinedDeletedIds);
      const cloudUsers = cloudData.userList.filter(u => u && u.id && !deletedSet.has(u.id));

      setUserList(cloudUsers);
      localStorage.setItem('agu_user_list', JSON.stringify(cloudUsers));

      const todayStr = new Date().toLocaleDateString('vi-VN');
      setCurrentUser(prev => {
        const updatedSelf = cloudUsers.find(
          u =>
            u.id === prev.id ||
            (u.studentId && prev.studentId && u.studentId.toLowerCase() === prev.studentId.toLowerCase() && u.role === prev.role)
        );
        if (!updatedSelf) {
          return cloudUsers[0] || SAMPLE_USERS[0];
        }
        const mergedLastDate = updatedSelf.lastCheckInDate || prev.lastCheckInDate;
        const checkedToday = mergedLastDate === todayStr;
        return {
          ...prev,
          ...updatedSelf,
          readingStreak: updatedSelf.readingStreak ?? 0,
          enewsStreak: updatedSelf.enewsStreak ?? 0,
          lastCheckInDate: mergedLastDate,
          hasCheckedInToday: checkedToday
        };
      });

      setMySavedAccounts(prev => {
        const next = prev
          .filter(u => !deletedSet.has(u.id) && cloudUsers.some(cu => cu.id === u.id))
          .map(savedAcc => {
            const fresh = cloudUsers.find(u => u.id === savedAcc.id);
            return fresh ? { ...savedAcc, ...fresh } : savedAcc;
          });
        localStorage.setItem('agu_my_accounts', JSON.stringify(next));
        return next;
      });
    }
    if (cloudData.posts && Array.isArray(cloudData.posts)) setPosts(cloudData.posts);
    if (cloudData.locketMoments && Array.isArray(cloudData.locketMoments)) setLocketMoments(cloudData.locketMoments);
    if (cloudData.criteria && Array.isArray(cloudData.criteria)) {
      const enriched = S5T_CRITERIA_LIST.map((official) => {
        const found = cloudData.criteria.find((c: any) => c && c.id === official.id);
        return found ? { ...official, completedCount: found.completedCount, status: found.status } : official;
      });
      setCriteria(enriched);
    } else {
      setCriteria(S5T_CRITERIA_LIST);
    }
    if (cloudData.proofs && Array.isArray(cloudData.proofs)) setProofs(cloudData.proofs);
    if (cloudData.reports && Array.isArray(cloudData.reports)) setReports(cloudData.reports);
    if (cloudData.transactions && Array.isArray(cloudData.transactions)) setTransactions(cloudData.transactions);
    if (cloudData.plans && Array.isArray(cloudData.plans)) setPlans(cloudData.plans);
    if (cloudData.tasks && Array.isArray(cloudData.tasks)) setTasks(cloudData.tasks);
    if (cloudData.decrees && Array.isArray(cloudData.decrees)) setDecrees(cloudData.decrees);
    if (cloudData.questions && Array.isArray(cloudData.questions) && cloudData.questions.length > 0) {
      setQuestions(cloudData.questions);
    }
    if (cloudData.applications && Array.isArray(cloudData.applications)) setApplications(cloudData.applications);
    if (cloudData.hallOfFame && Array.isArray(cloudData.hallOfFame)) {
      let deletedHofIds: string[] = [];
      try {
        deletedHofIds = JSON.parse(localStorage.getItem('agu_deleted_hof_ids') || '[]');
      } catch {
        // ignore
      }
      const filteredHof = cloudData.hallOfFame.filter(item => item && !deletedHofIds.includes(item.id));
      setHallOfFame(filteredHof);
    }
    if (cloudData.termHistory && Array.isArray(cloudData.termHistory)) setTermHistory(cloudData.termHistory);
    if (cloudData.memberEvaluations && Array.isArray(cloudData.memberEvaluations)) {
      setMemberEvaluations(cloudData.memberEvaluations);
    }
    if (cloudData.emergencyNotices && Array.isArray(cloudData.emergencyNotices)) {
      let dismissed: string[] = [];
      try {
        dismissed = JSON.parse(localStorage.getItem('agu_dismissed_emergency_ids') || '[]');
      } catch {
        // ignore
      }
      setEmergencyNotices(cloudData.emergencyNotices.filter(n => n && n.isActive && !dismissed.includes(n.id)));
    }
    if (cloudData.annualTheme) setAnnualTheme(cloudData.annualTheme);
    
    if (cloudData.lastUpdated) {
      lastServerUpdateRef.current = cloudData.lastUpdated;
    }
    setSyncStatus('connected');
  };

  useEffect(() => {
    let isMounted = true;

    async function initialSync() {
      setSyncStatus('syncing');
      const cloudData = await fetchCloudState();
      if (cloudData && isMounted) {
        applyRemoteState(cloudData);
      } else if (isMounted) {
        setSyncStatus('connected');
      }
    }
    initialSync();

    const interval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const cloudData = await fetchCloudState();
      if (cloudData && isMounted) {
        if (!lastServerUpdateRef.current || cloudData.lastUpdated > lastServerUpdateRef.current) {
          applyRemoteState(cloudData);
        }
      }
    }, 20000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('agu_authenticated', String(isAuthenticated));
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('agu_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    safeLocalStorageSet('agu_is_bcn', String(isBcnMode));
  }, [isBcnMode]);

  useEffect(() => {
    safeLocalStorageSet('agu_user_list', JSON.stringify(userList));
  }, [userList]);

  useEffect(() => {
    safeLocalStorageSet('agu_posts', JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    safeLocalStorageSet('agu_lockets', JSON.stringify(locketMoments));
  }, [locketMoments]);

  useEffect(() => {
    safeLocalStorageSet('agu_criteria', JSON.stringify(criteria));
  }, [criteria]);

  useEffect(() => {
    safeLocalStorageSet('agu_proofs', JSON.stringify(proofs));
  }, [proofs]);

  useEffect(() => {
    safeLocalStorageSet('agu_reports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    safeLocalStorageSet('agu_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    safeLocalStorageSet('agu_plans', JSON.stringify(plans));
  }, [plans]);

  useEffect(() => {
    safeLocalStorageSet('agu_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    safeLocalStorageSet('agu_decrees', JSON.stringify(decrees));
  }, [decrees]);

  useEffect(() => {
    safeLocalStorageSet('agu_recruitment_questions', JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    safeLocalStorageSet('agu_applications', JSON.stringify(applications));
  }, [applications]);

  useEffect(() => {
    safeLocalStorageSet('agu_hall_of_fame', JSON.stringify(hallOfFame));
  }, [hallOfFame]);

  useEffect(() => {
    safeLocalStorageSet('agu_term_history', JSON.stringify(termHistory));
  }, [termHistory]);

  useEffect(() => {
    safeLocalStorageSet('agu_member_evaluations', JSON.stringify(memberEvaluations));
  }, [memberEvaluations]);

  useEffect(() => {
    localStorage.setItem('agu_emergency_notices', JSON.stringify(emergencyNotices));
  }, [emergencyNotices]);

  useEffect(() => {
    localStorage.setItem('agu_annual_theme', JSON.stringify(annualTheme));
  }, [annualTheme]);

  const handleSelectUser = (user: UserProfile) => {
    setCurrentUser(user);
    if (user.role === 'bcn_admin' || user.adminType === 'master_root' || user.adminType === 'bcn_elected') {
      setIsBcnMode(true);
    } else {
      setIsBcnMode(false);
    }
    setUserList(prev => {
      const exists = prev.some(u => u.id === user.id);
      return exists ? prev.map(u => (u.id === user.id ? user : u)) : [user, ...prev];
    });
  };

  const handleGateLogin = (user: UserProfile, isBcn: boolean) => {
    handleSelectUser(user);
    setIsBcnMode(isBcn);
    setIsAuthenticated(true);
    try {
      if (localStorage.getItem(`agu_welcome_seen_${user.id}`) !== 'true') {
        setIsWelcomeGuideOpen(true);
      }
    } catch {
      setIsWelcomeGuideOpen(true);
    }
  };

  const handleGateRegister = async (newUser: UserProfile) => {
    setUserList(prev => [newUser, ...prev.filter(u => u.id !== newUser.id)]);
    setCurrentUser(newUser);
    setIsBcnMode(false);
    setIsAuthenticated(true);
    setIsWelcomeGuideOpen(true);
    const updatedState = await registerUserToCloud(newUser);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleLogout = () => {
    signOutFirebase().catch(() => {});
    localStorage.removeItem('agu_authenticated');
    localStorage.removeItem('agu_user');
    localStorage.removeItem('agu_is_bcn');
    setIsAuthenticated(false);
    setIsBcnMode(false);
    setActiveTab('feed');
  };

  const handleCheckIn = async () => {
    const todayStr = new Date().toLocaleDateString('vi-VN');
    if (currentUser.lastCheckInDate === todayStr) return;

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#3B6E47', '#6AD5A1', '#C88A36', '#FAF6EB']
    });

    const updatedUser: UserProfile = {
      ...currentUser,
      readingStreak: Math.max(1, (currentUser.readingStreak || 0) + 1),
      enewsStreak: Math.max(1, (currentUser.enewsStreak || 0) + 1),
      hasCheckedInToday: true,
      lastCheckInDate: todayStr,
      meritPoints: (currentUser.meritPoints || 50) + 10
    };

    setCurrentUser(updatedUser);
    setUserList(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));

    syncCurrentUserToFirestore(updatedUser).catch(() => {});
    const updatedState = await updateProfileOnCloud({
      userId: updatedUser.id,
      readingStreak: updatedUser.readingStreak,
      enewsStreak: updatedUser.enewsStreak,
      hasCheckedInToday: true,
      lastCheckInDate: todayStr,
      meritPoints: updatedUser.meritPoints
    });
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleRegisterUser = async (newUser: UserProfile) => {
    setUserList(prev => [newUser, ...prev.filter(u => u.id !== newUser.id)]);
    const updatedState = await registerUserToCloud(newUser);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleLikePost = async (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const nextLiked = !p.userLiked;
        return {
          ...p,
          userLiked: nextLiked,
          likes: nextLiked ? p.likes + 1 : Math.max(0, p.likes - 1)
        };
      }
      return p;
    }));
    const updatedState = await sendPostLikeToCloud(postId, currentUser.id);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleAddComment = async (postId: string, comment: { author: string; avatar: string; text: string; time: string }) => {
    const updatedState = await sendPostCommentToCloud(postId, comment);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleReactLocket = async (locketId: string) => {
    setLocketMoments(prev => prev.map(m => {
      if (m.id === locketId) {
        const nextReact = !m.userReacted;
        return {
          ...m,
          userReacted: nextReact,
          reactions: nextReact ? m.reactions + 1 : Math.max(0, m.reactions - 1)
        };
      }
      return m;
    }));
    const updatedState = await sendLocketReactToCloud(locketId);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleAddPost = async (newPost: Omit<Post, 'id' | 'createdAt' | 'likes' | 'commentsCount'>) => {
    const postItem: Post = {
      ...newPost,
      id: `post-${Date.now()}`,
      authorId: currentUser.id,
      authorNickname: currentUser.nickname,
      createdAt: 'Vừa xong',
      likes: 1,
      userLiked: true,
      commentsCount: 0
    };
    setPosts(prev => [postItem, ...prev]);
    const updatedState = await sendPostToCloud(postItem);
    if (updatedState) applyRemoteState(updatedState);

    const todayStr = new Date().toLocaleDateString('vi-VN');
    if (currentUser.lastCheckInDate !== todayStr) {
      await handleCheckIn();
    }
  };

  const handleDeletePost = async (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    const updatedState = await deleteItemFromCloud('posts', postId);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleAddLocket = async (newMoment: Omit<LocketMoment, 'id' | 'timestamp' | 'reactions'>) => {
    const locketItem: LocketMoment = {
      ...newMoment,
      id: `locket-${Date.now()}`,
      authorId: currentUser.id,
      authorNickname: currentUser.nickname,
      timestamp: 'Vừa xong',
      reactions: 1,
      userReacted: true
    };
    setLocketMoments(prev => [locketItem, ...prev]);
    const updatedState = await sendLocketToCloud(locketItem);
    if (updatedState) applyRemoteState(updatedState);

    const todayStr = new Date().toLocaleDateString('vi-VN');
    if (currentUser.lastCheckInDate !== todayStr) {
      await handleCheckIn();
    }
  };

  const handleDeleteLocket = async (locketId: string) => {
    setLocketMoments(prev => prev.filter(m => m.id !== locketId));
    const updatedState = await deleteItemFromCloud('locketMoments', locketId);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleSubmitProof = async (proofData: Omit<S5TProof, 'id' | 'submittedAt' | 'status'>) => {
    const proofItem: S5TProof = {
      ...proofData,
      id: `proof-${Date.now()}`,
      userId: currentUser.id,
      submittedAt: new Date().toLocaleDateString('vi-VN'),
      status: 'pending'
    };
    const nextProofs = [proofItem, ...proofs];
    setProofs(nextProofs);
    const updatedState = await pushCloudSync('proofs', nextProofs);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleDeleteProof = async (proofId: string) => {
    setProofs(prev => prev.filter(p => p.id !== proofId));
    const updatedState = await deleteItemFromCloud('proofs', proofId);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleReviewProof = async (proofId: string, status: 'approved' | 'rejected', comment: string) => {
    const nextProofs = proofs.map(p => {
      if (p.id === proofId) {
        return {
          ...p,
          status,
          reviewedBy: currentUser.name,
          reviewComment: comment
        };
      }
      return p;
    });
    setProofs(nextProofs);

    let nextCriteria = criteria;
    if (status === 'approved') {
      const reviewedProof = proofs.find(p => p.id === proofId);
      if (reviewedProof) {
        nextCriteria = criteria.map(c => {
          if (c.id === reviewedProof.criterionId) {
            const nextCompleted = c.completedCount + 1;
            return {
              ...c,
              completedCount: nextCompleted,
              status: (nextCompleted >= c.requiredCount ? 'completed' : 'in_progress') as S5TCriterion['status']
            };
          }
          return c;
        });
        setCriteria(nextCriteria);
        await pushCloudSync('criteria', nextCriteria);
      }
    }
    const updatedState = await pushCloudSync('proofs', nextProofs);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleSendReport = async (reportData: Omit<ConfidentialReport, 'id' | 'createdAt' | 'status'>) => {
    const newReport: ConfidentialReport = {
      ...reportData,
      id: `rep-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`,
      realSenderId: currentUser.id,
      realSenderNickname: currentUser.nickname,
      createdAt: new Date().toLocaleDateString('vi-VN'),
      status: 'received'
    };
    setReports(prev => [newReport, ...prev]);
    const updatedState = await sendReportToCloud(newReport);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleDeleteReport = async (reportId: string) => {
    setReports(prev => prev.filter(r => r.id !== reportId));
    const updatedState = await deleteItemFromCloud('reports', reportId);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleUpdateBcnResponse = async (reportId: string, response: string) => {
    const updatedReports = reports.map(r => {
      if (r.id === reportId) {
        return {
          ...r,
          bcnResponse: response,
          status: 'resolved' as const
        };
      }
      return r;
    });
    setReports(updatedReports);
    const updatedState = await sendReportResponseToCloud(reportId, response);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleUpdateProfile = async (payload: { userId: string; avatar?: string; nickname?: string; favoriteBook?: string; newPassword?: string }) => {
    if (currentUser.id === payload.userId) {
      const updatedCurrent: UserProfile = {
        ...currentUser,
        avatar: payload.avatar || currentUser.avatar,
        nickname: payload.nickname !== undefined ? payload.nickname : currentUser.nickname,
        favoriteBook: payload.favoriteBook !== undefined ? payload.favoriteBook : currentUser.favoriteBook,
        password: payload.newPassword || currentUser.password
      };
      setCurrentUser(updatedCurrent);
    }
    setUserList(prev => prev.map(u => {
      if (u.id === payload.userId) {
        return {
          ...u,
          avatar: payload.avatar || u.avatar,
          nickname: payload.nickname !== undefined ? payload.nickname : u.nickname,
          favoriteBook: payload.favoriteBook !== undefined ? payload.favoriteBook : u.favoriteBook,
          password: payload.newPassword || u.password
        };
      }
      return u;
    }));

    const updatedState = await updateProfileOnCloud(payload);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleApproveDepartment = async (targetUserId: string, department: DepartmentType, note?: string) => {
    const updatedUsers = approveUserIntoDepartment(userList, targetUserId, department, note);
    setUserList(updatedUsers);
    const updatedState = await approveDepartmentOnCloud({
      targetUserId,
      department,
      status: 'approved',
      note
    });
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleRejectDepartment = async (targetUserId: string, note?: string) => {
    const updatedUsers = rejectUserDepartmentRequest(userList, targetUserId, note);
    setUserList(updatedUsers);
    const target = userList.find(u => u.id === targetUserId);
    const updatedState = await approveDepartmentOnCloud({
      targetUserId,
      department: target?.department || 'Truyền thông',
      status: 'rejected',
      note
    });
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleAppointSubDeptLeaders = async (payload: {
    department: DepartmentType;
    leaderId: string;
    viceLeaderIds: string[];
  }) => {
    const result = appointSubDepartmentLeaders(userList, {
      department: payload.department,
      leaderId: payload.leaderId,
      viceLeaderIds: payload.viceLeaderIds,
      appointedByName: currentUser.name
    });
    if (result.error) {
      return { error: result.error };
    }
    setUserList(result.updatedUsers);
    const updatedState = await appointSubDeptLeadersOnCloud({
      department: payload.department,
      leaderId: payload.leaderId,
      viceLeaderIds: payload.viceLeaderIds,
      appointedByName: currentUser.name
    });
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleAssignRole = async (payload: {
    targetUserId: string;
    department: string;
    roleTitle: string;
    departmentRole: 'leader' | 'vice_leader' | 'member';
    roleType: 'member' | 'lead' | 'bcn_admin';
  }) => {
    const updatedUsers = assignSingleMemberSubDeptRole(userList, {
      targetUserId: payload.targetUserId,
      department: payload.department as DepartmentType,
      departmentRole: payload.departmentRole,
      roleTitle: payload.roleTitle,
      roleType: payload.roleType as RoleType
    });
    setUserList(updatedUsers);
    const updatedState = await assignRoleOnCloud(payload);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleAppointFullTerm = async (payload: FullTermAppointmentPayload) => {
    const result = appointClubTermLeaders(userList, hallOfFame, termHistory, payload);
    if (result.error) {
      return { error: result.error };
    }
    setUserList(result.updatedUsers);
    setHallOfFame(result.updatedHallOfFame);
    setTermHistory(result.updatedTermHistory);

    const updatedState = await appointTermBcnOnCloud(payload);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleRequestGroupTransfer = async (targetUserId: string, newDept: DepartmentType, reason: string) => {
    const { updatedUsers, reportItem } = requestMemberGroupTransfer(
      userList,
      targetUserId,
      newDept,
      reason,
      currentUser.name
    );
    setUserList(updatedUsers);
    if (reportItem) {
      const nextReports = [reportItem, ...reports];
      setReports(nextReports);
      await sendReportToCloud(reportItem);
    }
    const updatedState = await pushCloudSync('userList', updatedUsers);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleDirectGroupTransfer = async (targetUserId: string, newDept: DepartmentType, reason?: string) => {
    const updatedUsers = directTransferMemberGroup(
      userList,
      targetUserId,
      newDept,
      currentUser.name,
      reason
    );
    setUserList(updatedUsers);
    const updatedState = await pushCloudSync('userList', updatedUsers);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleAddEmergencyNotice = async (noticeData: Omit<EmergencyNotice, 'id' | 'issuedAt'>) => {
    const newNotice: EmergencyNotice = {
      ...noticeData,
      id: `em-${Date.now()}`,
      issuedAt: new Date().toLocaleDateString('vi-VN')
    };
    const nextNotices = [newNotice, ...emergencyNotices];
    setEmergencyNotices(nextNotices);
    const updatedState = await pushCloudSync('emergencyNotices', nextNotices);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleDismissEmergencyNotice = async (id: string) => {
    const nextNotices = emergencyNotices.filter(n => n.id !== id);
    setEmergencyNotices(nextNotices);
    try {
      localStorage.setItem('agu_emergency_notices', JSON.stringify(nextNotices));
      const dismissed = JSON.parse(localStorage.getItem('agu_dismissed_emergency_ids') || '[]');
      if (!dismissed.includes(id)) dismissed.push(id);
      localStorage.setItem('agu_dismissed_emergency_ids', JSON.stringify(dismissed));
    } catch {
      // ignore
    }
    await dismissEmergencyNoticeOnCloud(id);
    const updatedState = await pushCloudSync('emergencyNotices', nextNotices);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleDeleteEmergencyNotice = async (id: string) => {
    const nextNotices = emergencyNotices.filter(n => n.id !== id);
    setEmergencyNotices(nextNotices);
    try {
      localStorage.setItem('agu_emergency_notices', JSON.stringify(nextNotices));
      const dismissed = JSON.parse(localStorage.getItem('agu_dismissed_emergency_ids') || '[]');
      if (!dismissed.includes(id)) dismissed.push(id);
      localStorage.setItem('agu_dismissed_emergency_ids', JSON.stringify(dismissed));
    } catch {
      // ignore
    }
    await dismissEmergencyNoticeOnCloud(id);
    const updatedState = await pushCloudSync('emergencyNotices', nextNotices);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleUpdateAnnualTheme = async (newTheme: AnnualTheme) => {
    setAnnualTheme(newTheme);
    localStorage.setItem('agu_annual_theme', JSON.stringify(newTheme));
    const updatedState = await updateAnnualThemeOnCloud(newTheme);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleIncreaseReadingStreak = async () => {
    const nextStreak = (currentUser.readingStreak || 0) + 1;
    const updatedUser: UserProfile = {
      ...currentUser,
      readingStreak: nextStreak,
      meritPoints: (currentUser.meritPoints || 50) + 25
    };
    setCurrentUser(updatedUser);
    setUserList(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    await updateProfileOnCloud({
      userId: updatedUser.id,
      readingStreak: nextStreak,
      meritPoints: updatedUser.meritPoints
    });
  };

  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    const txItem: Transaction = {
      ...newTx,
      id: `tx-${Date.now()}`
    };
    const nextTx = [txItem, ...transactions];
    setTransactions(nextTx);
    const updatedState = await addTransactionToCloud(txItem);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleAddPlan = async (newPlan: Omit<ClubPlan, 'id' | 'votesAgree' | 'votesDisagree'>) => {
    const planItem: ClubPlan = {
      ...newPlan,
      id: `plan-${Date.now()}`,
      votesAgree: 1,
      votesDisagree: 0,
      userVoted: 'agree',
      submittedByRole: currentUser.position || `${currentUser.departmentRole === 'leader' ? 'Trưởng ban' : currentUser.departmentRole === 'vice_leader' ? 'Phó ban' : 'Thành viên'} Ban ${currentUser.department}`
    };
    const nextPlans = [planItem, ...plans];
    setPlans(nextPlans);
    const updatedState = await addPlanToCloud(planItem);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleVotePlan = async (
    planId: string, 
    vote: 'agree' | 'disagree', 
    anonymousReason?: string, 
    anonymousCategory?: string
  ) => {
    const nextPlans = plans.map(p => {
      if (p.id === planId) {
        const agreeDelta = vote === 'agree' ? (p.userVoted === 'agree' ? 0 : 1) : (p.userVoted === 'agree' ? -1 : 0);
        const disagreeDelta = vote === 'disagree' ? (p.userVoted === 'disagree' ? 0 : 1) : (p.userVoted === 'disagree' ? -1 : 0);
        
        let feedbacks = Array.isArray(p.anonymousDislikes) ? [...p.anonymousDislikes] : [];
        if (vote === 'disagree' && anonymousReason && anonymousReason.trim()) {
          const newFb: PlanAnonymousFeedback = {
            id: `dislike-fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            reason: anonymousReason.trim(),
            category: (anonymousCategory as any) || 'Nội dung chưa phù hợp',
            submittedAt: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          };
          feedbacks = [newFb, ...feedbacks];
        }

        return {
          ...p,
          votesAgree: Math.max(0, p.votesAgree + agreeDelta),
          votesDisagree: Math.max(0, p.votesDisagree + disagreeDelta),
          userVoted: vote,
          anonymousDislikes: feedbacks
        };
      }
      return p;
    });
    setPlans(nextPlans);
    const updatedState = await pushCloudSync('plans', nextPlans);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleUpdatePlanStatus = async (planId: string, status: ClubPlan['status']) => {
    const nextPlans = plans.map(p =>
      p.id === planId
        ? {
            ...p,
            status,
            archivedAt: status === 'approved' ? new Date().toLocaleDateString('vi-VN') : p.archivedAt
          }
        : p
    );
    setPlans(nextPlans);
    const updatedState = await pushCloudSync('plans', nextPlans);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleDeletePlan = async (planId: string) => {
    setPlans(prev => prev.filter(p => p.id !== planId));
    const updatedState = await deleteItemFromCloud('plans', planId);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleAddTask = async (newTask: Omit<ClubTask, 'id'>) => {
    const taskItem: ClubTask = {
      ...newTask,
      id: `task-${Date.now()}`
    };
    const nextTasks = [taskItem, ...tasks];
    setTasks(nextTasks);
    const updatedState = await pushCloudSync('tasks', nextTasks);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    const updatedState = await deleteItemFromCloud('tasks', taskId);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleUpdateTaskStatus = async (taskId: string, status: ClubTask['status']) => {
    const nextTasks = tasks.map(t => t.id === taskId ? { ...t, status } : t);
    setTasks(nextTasks);
    const updatedState = await pushCloudSync('tasks', nextTasks);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleCompleteTaskAndReward = async (taskId: string, memberName: string, points: number) => {
    const nextTasks = tasks.map(t => t.id === taskId ? { ...t, status: 'done' as const } : t);
    setTasks(nextTasks);
    
    const nextUsers = userList.map(u => {
      if (u.name.toLowerCase().includes(memberName.toLowerCase()) || memberName.toLowerCase().includes(u.name.toLowerCase())) {
        return { ...u, meritPoints: (u.meritPoints || 50) + points };
      }
      return u;
    });
    setUserList(nextUsers);

    if (currentUser.name.toLowerCase().includes(memberName.toLowerCase())) {
      setCurrentUser(prev => ({ ...prev, meritPoints: (prev.meritPoints || 50) + points }));
    }

    await pushCloudSync('tasks', nextTasks);
    const updatedState = await pushCloudSync('userList', nextUsers);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleAwardBadge = async (userId: string, badgeName: string, points: number) => {
    const nextUsers = userList.map(u => {
      if (u.id === userId) {
        const nextBadges = u.badges.includes(badgeName) ? u.badges : [...u.badges, badgeName];
        return { ...u, badges: nextBadges, meritPoints: (u.meritPoints || 50) + points };
      }
      return u;
    });
    setUserList(nextUsers);

    if (currentUser.id === userId) {
      setCurrentUser(prev => ({
        ...prev,
        badges: prev.badges.includes(badgeName) ? prev.badges : [...prev.badges, badgeName],
        meritPoints: (prev.meritPoints || 50) + points
      }));
    }

    const updatedState = await pushCloudSync('userList', nextUsers);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleRemoveBadge = async (userId: string, badgeName: string) => {
    const nextUsers = userList.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          badges: (u.badges || []).filter(b => b !== badgeName)
        };
      }
      return u;
    });
    setUserList(nextUsers);

    if (currentUser.id === userId) {
      setCurrentUser(prev => ({
        ...prev,
        badges: (prev.badges || []).filter(b => b !== badgeName)
      }));
    }

    const updatedState = await pushCloudSync('userList', nextUsers);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleIssueDecree = async (newDecree: Omit<ClubDecree, 'id' | 'issuedAt'>) => {
    const decreeItem: ClubDecree = {
      ...newDecree,
      id: `dec-${Date.now()}`,
      issuedAt: new Date().toLocaleDateString('vi-VN')
    };
    const nextDecrees = [decreeItem, ...decrees];
    setDecrees(nextDecrees);
    const updatedState = await pushCloudSync('decrees', nextDecrees);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleDeleteDecree = async (decreeId: string) => {
    setDecrees(prev => prev.filter(d => d.id !== decreeId));
    const updatedState = await deleteItemFromCloud('decrees', decreeId);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleUnlockBcn = (passcode: string) => {
    if (passcode.trim() === MASTER_PASSCODE) {
      setIsBcnMode(true);
      return true;
    }
    return false;
  };

  const handleExitBcnMode = () => {
    setIsBcnMode(false);
  };

  const handleAddQuestion = async (q: Omit<RecruitmentQuestion, 'id'>) => {
    const newQ: RecruitmentQuestion = {
      ...q,
      id: `q-${Date.now()}`
    };
    const nextQ = [...questions, newQ];
    setQuestions(nextQ);
    const updatedState = await pushCloudSync('questions', nextQ);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleDeleteQuestion = async (id: string) => {
    const nextQ = questions.filter(q => q.id !== id);
    setQuestions(nextQ);
    const updatedState = await pushCloudSync('questions', nextQ);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleSubmitApplication = async (app: Omit<RecruitmentApplication, 'id' | 'status' | 'submittedAt'>) => {
    const newApp: RecruitmentApplication = {
      ...app,
      id: `app-${Date.now().toString().slice(-4)}`,
      status: 'pending',
      submittedAt: new Date().toLocaleDateString('vi-VN')
    };
    const nextApps = [newApp, ...applications];
    setApplications(nextApps);
    const directState = await submitApplicationToCloud(newApp);
    if (directState) {
      applyRemoteState(directState);
    } else {
      const updatedState = await pushCloudSync('applications', nextApps);
      if (updatedState) applyRemoteState(updatedState);
    }
  };

  const handleReviewApplication = async (appId: string, status: 'approved' | 'rejected', notes: string) => {
    const reviewedApp = applications.find(a => a.id === appId);
    const nextApps = applications.map(a => {
      if (a.id === appId) {
        return {
          ...a,
          status,
          reviewNotes: notes
        };
      }
      return a;
    });
    setApplications(nextApps);

    if (status === 'approved' && reviewedApp) {
      const existingMember = userList.find(
        u =>
          (u.studentId && u.studentId.toLowerCase() === reviewedApp.studentId.toLowerCase()) ||
          (u.email && u.email.toLowerCase() === reviewedApp.email.toLowerCase())
      );

      if (existingMember) {
        await handleApproveDepartment(existingMember.id, reviewedApp.desiredDept, notes);
      } else {
        const admittedUser: UserProfile = {
          id: `user-rec-${Date.now()}`,
          name: reviewedApp.fullName,
          nickname: reviewedApp.nickname || `${reviewedApp.fullName.split(' ').slice(-1)[0]} Sách`,
          studentId: reviewedApp.studentId.toUpperCase(),
          email: reviewedApp.email,
          password: '123456',
          faculty: reviewedApp.faculty,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          role: 'member',
          adminType: 'member',
          clubRole: 'member',
          department: reviewedApp.desiredDept,
          requestedDepartment: reviewedApp.desiredDept,
          departmentStatus: 'approved',
          departmentRole: 'member',
          position: `Thành viên Ban ${reviewedApp.desiredDept}`,
          approvedByRootAt: new Date().toLocaleDateString('vi-VN'),
          readingStreak: 0,
          enewsStreak: 0,
          hasCheckedInToday: false,
          s5tProgress: 0,
          favoriteBook: 'Nhà Giả Kim',
          joinDate: new Date().toLocaleDateString('vi-VN'),
          meritPoints: 0,
          badges: ['Tân Thành Viên AGU 🌱', `Thành Viên Ban ${reviewedApp.desiredDept} ✅`]
        };
        setUserList(prev => [admittedUser, ...prev]);
        await registerUserToCloud(admittedUser);
      }
    }

    const updatedState = await pushCloudSync('applications', nextApps);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleTransferSuccession = async (payload: SuccessionTransferPayload) => {
    const {
      targetPositionKey,
      positionTitle,
      outgoingLeader,
      incomingMemberId,
      isNewCustomMember,
      newCustomInfo,
      hallOfFameRecord
    } = payload;

    setHallOfFame(prev => [hallOfFameRecord, ...prev]);

    const nextClubRole = targetPositionKey === 'lead' ? 'club_president' : 'club_vice_president';
    const nextDeptRole = targetPositionKey === 'lead' ? 'leader' : 'vice_leader';

    let newLeaderObj: UserProfile | undefined;
    if (isNewCustomMember && newCustomInfo) {
      newLeaderObj = {
        id: `bcn-elected-${Date.now()}`,
        name: newCustomInfo.name,
        nickname: newCustomInfo.nickname,
        studentId: newCustomInfo.studentId,
        faculty: newCustomInfo.faculty,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'bcn_admin' as RoleType,
        adminType: 'bcn_elected' as AdminAccountType,
        clubRole: nextClubRole,
        department: 'BQT' as DepartmentType,
        departmentStatus: 'approved',
        departmentRole: nextDeptRole,
        position: positionTitle,
        term: 'Nhiệm kỳ mới (2026-2027)',
        readingStreak: 0,
        enewsStreak: 0,
        hasCheckedInToday: false,
        s5tProgress: 0,
        favoriteBook: newCustomInfo.favoriteBook || 'Nhà Giả Kim',
        joinDate: 'Tháng 10/2026',
        meritPoints: 0,
        badges: ['Tân BCN Đương Nhiệm 👑', 'Người Dẫn Đường AGU 🔥']
      };
    }

    const updatedState = await transferSuccessionToCloud({
      outgoingLeaderId: outgoingLeader.id,
      incomingMemberId: incomingMemberId || undefined,
      newLeader: newLeaderObj,
      hallOfFameRecord,
      positionTitle
    });

    if (updatedState) {
      applyRemoteState(updatedState);
    } else {
      setUserList(prev => {
        let updated = [...prev];
        updated = updated.map(u => {
          if (u.id === outgoingLeader.id) {
            const isVice = outgoingLeader.position.toLowerCase().includes('phó');
            return {
              ...u,
              role: 'member' as RoleType,
              adminType: 'member' as AdminAccountType,
              clubRole: 'member',
              position: isVice ? 'Cựu Phó Chủ nhiệm CLB (Tiền bối danh dự)' : 'Cựu Chủ nhiệm CLB (Tiền bối danh dự)',
              badges: u.badges.includes('Cựu BCN Tiền Nhiệm 🎖️') ? u.badges : [...u.badges, 'Cựu BCN Tiền Nhiệm 🎖️']
            };
          }
          if (incomingMemberId && u.id === incomingMemberId) {
            return {
              ...u,
              role: 'bcn_admin' as RoleType,
              adminType: 'bcn_elected' as AdminAccountType,
              clubRole: nextClubRole,
              department: 'BQT' as DepartmentType,
              departmentStatus: 'approved',
              departmentRole: nextDeptRole,
              position: positionTitle,
              term: 'Nhiệm kỳ mới (2026-2027)',
              badges: u.badges.includes('Tân BCN Đương Nhiệm 👑') ? u.badges : [...u.badges, 'Tân BCN Đương Nhiệm 👑']
            };
          }
          return u;
        });
        if (newLeaderObj) updated = [newLeaderObj, ...updated];
        return updated;
      });
    }

    if (currentUser.id === outgoingLeader.id) {
      const isVice = outgoingLeader.position.toLowerCase().includes('phó');
      const emeritusPosition = isVice 
        ? 'Cựu Phó Chủ nhiệm CLB (Tiền bối danh dự)' 
        : 'Cựu Chủ nhiệm CLB (Tiền bối danh dự)';
      setCurrentUser(prev => ({
        ...prev,
        role: 'member',
        adminType: 'member',
        clubRole: 'member',
        position: emeritusPosition,
        badges: [...prev.badges.filter(b => !b.includes('Chủ Nhiệm Nhiệm Kỳ')), 'Cựu BCN Tiền Nhiệm 🎖️']
      }));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!userId || userId === 'bcn-root') return;

    try {
      const rawDel = localStorage.getItem('agu_deleted_user_ids');
      const existingDel: string[] = rawDel ? JSON.parse(rawDel) : [];
      if (!existingDel.includes(userId)) {
        existingDel.push(userId);
        localStorage.setItem('agu_deleted_user_ids', JSON.stringify(existingDel));
      }
    } catch {
      // ignore
    }

    const updatedList = userList.filter(u => u.id !== userId);
    setUserList(updatedList);
    localStorage.setItem('agu_user_list', JSON.stringify(updatedList));

    setMySavedAccounts(prev => {
      const next = prev.filter(u => u.id !== userId);
      localStorage.setItem('agu_my_accounts', JSON.stringify(next));
      return next;
    });

    const updatedState = await deleteUserFromCloud(userId);
    if (updatedState) applyRemoteState(updatedState);

    if (currentUser.id === userId) {
      const fallbackUser = updatedList.find(u => u.id !== 'bcn-root') || updatedList[0];
      if (fallbackUser) {
        setCurrentUser(fallbackUser);
      }
    }
  };

  const handleAddToHallOfFame = async (newItem: Omit<HallOfFameItem, 'id'>) => {
    const record: HallOfFameItem = {
      ...newItem,
      id: `hof-${Date.now()}`
    };
    const nextHof = [record, ...hallOfFame];
    setHallOfFame(nextHof);
    const updatedState = await pushCloudSync('hallOfFame', nextHof);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleUpdateHallOfFameItem = async (updatedItem: HallOfFameItem) => {
    const nextHof = hallOfFame.map(item => (item.id === updatedItem.id ? updatedItem : item));
    setHallOfFame(nextHof);
    localStorage.setItem('agu_hall_of_fame', JSON.stringify(nextHof));
    const updatedState = await pushCloudSync('hallOfFame', nextHof);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleDeleteFromHallOfFame = async (id: string) => {
    try {
      const existingDeleted: string[] = JSON.parse(localStorage.getItem('agu_deleted_hof_ids') || '[]');
      if (!existingDeleted.includes(id)) {
        const nextDeleted = [...existingDeleted, id];
        localStorage.setItem('agu_deleted_hof_ids', JSON.stringify(nextDeleted));
      }
    } catch {
      // ignore
    }
    const nextHof = hallOfFame.filter(item => item.id !== id);
    setHallOfFame(nextHof);
    localStorage.setItem('agu_hall_of_fame', JSON.stringify(nextHof));
    await deleteItemFromCloud('hallOfFame', id);
    const updatedState = await pushCloudSync('hallOfFame', nextHof);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleAddEvaluation = async (newEval: Omit<MemberEvaluation, 'id' | 'createdAt'>) => {
    const item: MemberEvaluation = {
      ...newEval,
      id: `eval-${Date.now()}`,
      createdAt: new Date().toLocaleDateString('vi-VN')
    };
    const nextEvals = [item, ...memberEvaluations];
    setMemberEvaluations(nextEvals);
    const updatedState = await pushCloudSync('memberEvaluations', nextEvals);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleUpdateEvaluation = async (updated: MemberEvaluation) => {
    const nextEvals = memberEvaluations.map(ev => (ev.id === updated.id ? updated : ev));
    setMemberEvaluations(nextEvals);
    const updatedState = await pushCloudSync('memberEvaluations', nextEvals);
    if (updatedState) applyRemoteState(updatedState);
  };

  const [isDecreeNoticeModalOpen, setIsDecreeNoticeModalOpen] = useState(false);
  const [decreeModalFilter, setDecreeModalFilter] = useState<'all' | 'urgent' | 'award' | 'announcement'>('all');

  const [readNoticeIds, setReadNoticeIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('agu_read_notice_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    safeLocalStorageSet('agu_read_notice_ids', JSON.stringify(readNoticeIds));
  }, [readNoticeIds]);

  const handleMarkNoticeAsRead = (id: string) => {
    setReadNoticeIds(prev => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleMarkAllNoticesAsRead = () => {
    const allIds = [
      ...emergencyNotices.map(n => n.id),
      ...decrees.map(d => d.id)
    ];
    setReadNoticeIds(prev => Array.from(new Set([...prev, ...allIds])));
  };

  const unreadAlertsCount =
    emergencyNotices.filter(n => !readNoticeIds.includes(n.id)).length +
    decrees.filter(d => !readNoticeIds.includes(d.id)).length;

  const [lastBackupTime] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('agu_last_backup_time');
      return saved ? Number(saved) : Date.now();
    } catch {
      return Date.now();
    }
  });

  const [is24hBackupReminderOpen, setIs24hBackupReminderOpen] = useState<boolean>(false);
  const hoursSinceLastBackup = Math.floor((Date.now() - lastBackupTime) / 3600000);
  const isBackupDue = (Date.now() - lastBackupTime) >= 86400000;

  useEffect(() => {
    if (isMasterRoot && isBackupDue) {
      setIs24hBackupReminderOpen(true);
    }
  }, [isMasterRoot, isBackupDue]);

  const handleDownloadBackupAndReset24h = () => {
    window.open('/api/backup/download', '_blank');
    setIs24hBackupReminderOpen(false);
  };

  const handleDeleteEvaluation = async (id: string) => {
    const nextEvals = memberEvaluations.filter(e => e.id !== id);
    setMemberEvaluations(nextEvals);
    await deleteItemFromCloud('memberEvaluations', id);
    const updatedState = await pushCloudSync('memberEvaluations', nextEvals);
    if (updatedState) applyRemoteState(updatedState);
  };

  const handleExecuteEvaluationAction = async (
    evaluation: MemberEvaluation,
    actionType: 'reward' | 'rotate'
  ) => {
    const nextEvals = memberEvaluations.map(ev =>
      ev.id === evaluation.id
        ? {
            ...ev,
            appliedAction: (actionType === 'reward' ? 'rewarded' : 'rotated') as 'rewarded' | 'rotated'
          }
        : ev
    );
    setMemberEvaluations(nextEvals);
    await pushCloudSync('memberEvaluations', nextEvals);

    if (actionType === 'reward') {
      const badge = evaluation.suggestedRewardBadge || 'Thành Viên Xuất Sắc Cuối Kỳ 🏆';
      const points = evaluation.suggestedBonusPoints || 80;
      await handleAwardBadge(evaluation.memberId, badge, points);
    } else if (actionType === 'rotate' && evaluation.suggestedTargetDept) {
      await handleDirectGroupTransfer(
        evaluation.memberId,
        evaluation.suggestedTargetDept,
        `Luân chuyển nhân sự theo phiếu đánh giá năng lực định kỳ (${evaluation.period})`
      );
    }
  };

  const handleCloseWelcomeGuide = () => {
    setIsWelcomeGuideOpen(false);
    try {
      localStorage.setItem('agu_welcome_guide_v1_seen', 'true');
      if (currentUser?.id) {
        localStorage.setItem(`agu_welcome_seen_${currentUser.id}`, 'true');
      }
    } catch {
      // ignore
    }
  };

  if (!isAuthenticated && isPublicApplyMode) {
    return (
      <div className="min-h-screen bg-[#F8F5EE] flex flex-col justify-between p-3 sm:p-6">
        <div className="max-w-4xl w-full mx-auto space-y-5">
          <div className="p-4 sm:p-5 rounded-3xl bg-[#FAF3E3] border-3 border-[#382215] shadow-[6px_6px_0px_#382215] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src="/assets/aistudio/TUYE__N_THA_NH_VIE_N_778c37b9.png"
                alt="Logo CLB"
                className="h-12 sm:h-14 w-auto object-contain rounded-full shrink-0"
              />
              <div>
                <div className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-[#8C3B1E]">
                  Hội Sinh Viên Trường Đại Học An Giang
                </div>
                <h1 className="text-lg sm:text-xl font-black text-[#382215] font-serif-vintage">
                  Cổng Tuyển Thành Viên Trực Tuyến CLB Đọc và Giới Thiệu Sách
                </h1>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPublicApplyMode(false)}
              className="px-4 py-2 rounded-xl bg-[#382215] text-[#FAF3E3] font-black text-xs cursor-pointer transition shrink-0"
            >
              Về Cổng Đăng Nhập / Đăng Ký →
            </button>
          </div>

          <RecruitmentSection
            currentUser={{
              ...SAMPLE_USERS[0],
              id: 'candidate-guest',
              name: 'Ứng viên mới',
              role: 'member',
              adminType: 'member',
              clubRole: 'member',
              departmentRole: 'member'
            }}
            isMasterRoot={false}
            questions={questions}
            applications={applications}
            userList={userList}
            initialSubTab="candidate_form"
            onAddQuestion={handleAddQuestion}
            onDeleteQuestion={handleDeleteQuestion}
            onSubmitApplication={handleSubmitApplication}
            onReviewApplication={handleReviewApplication}
            onApproveDepartment={handleApproveDepartment}
          />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col justify-between">
        <div className="bg-[#FAF3E3] border-b-2 border-[#382215]/20 py-2 px-4 flex items-center justify-center gap-3 text-xs">
          <span className="font-bold text-[#382215]">Bạn có link tuyển thành viên hoặc muốn nộp đơn ứng tuyển?</span>
          <button
            type="button"
            onClick={() => setIsPublicApplyMode(true)}
            className="px-3 py-1 rounded-lg bg-[#C8532B] text-white font-black text-xs cursor-pointer transition"
          >
            Mở Form Tuyển Thành Viên →
          </button>
        </div>

        <InitialAuthGate
          onLogin={handleGateLogin}
          onRegister={handleGateRegister}
          userList={userList}
          mySavedAccounts={mySavedAccounts}
        />

        <div className="text-center py-3 text-[#382215] font-semibold text-[11px]">
          CLB Đọc và Giới thiệu sách • Trường Đại học An Giang (AGU)
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col selection:bg-[#C8532B] selection:text-white pb-10">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        isBcnMode={isBcnMode}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenGuide={() => setIsWelcomeGuideOpen(true)}
        onLogout={handleLogout}
        activeEmergencyNotice={emergencyNotices.find(n => n.isActive) || emergencyNotices[0] || null}
        activeDecreesCount={decrees.length}
        unreadAlertsCount={unreadAlertsCount}
        onOpenEmergencyModal={() => setIsDecreeNoticeModalOpen(true)}
      />

      {/* SẮC LỆNH & THÔNG BÁO MODAL */}
      {isDecreeNoticeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#FAF3E3] rounded-3xl border-3 border-[#382215] shadow-[8px_8px_0px_#382215] w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#C8532B] text-white p-4.5 flex items-center justify-between border-b-3 border-[#382215]">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-full bg-[#FFE29A] text-[#382215] text-[10px] font-black uppercase">
                  {unreadAlertsCount > 0 ? `${unreadAlertsCount} HOT` : 'THÔNG BÁO'}
                </span>
                <h4 className="font-black text-base font-serif-vintage">Bảng Sắc Lệnh Thông Tri & Thông Báo CLB</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsDecreeNoticeModalOpen(false)}
                className="p-1.5 rounded-xl bg-black/20 text-white cursor-pointer font-black"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-[#382215]">
              {emergencyNotices.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-black uppercase text-[#C8532B]">🚨 Thông Báo Khẩn Cấp</div>
                  {emergencyNotices.map(notice => (
                    <div key={notice.id} className="p-3.5 rounded-2xl bg-[#FFFDF8] border-2 border-[#C8532B] space-y-1">
                      <div className="font-black text-sm text-[#C8532B]">{notice.title}</div>
                      <p className="text-xs">{notice.content}</p>
                    </div>
                  ))}
                </div>
              )}
              {decrees.map(decree => (
                <div key={decree.id} className="p-3.5 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215] space-y-1">
                  <div className="font-black text-sm text-[#382215]">{decree.title}</div>
                  <p className="text-xs">{decree.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <EmergencyNoticeBanner
        notices={emergencyNotices}
        currentUser={currentUser}
        isBcnMode={isBcnMode}
        onAddNotice={handleAddEmergencyNotice}
        onDismissNotice={handleDismissEmergencyNotice}
        onDeleteNotice={handleDeleteEmergencyNotice}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-5 pb-10">
        {activeTab === 'feed' && (
          <>
            <BookSearchGroundingWidget />
            <NewfeedSection
              currentUser={currentUser}
              isBcnMode={isBcnMode}
              posts={posts}
              locketMoments={locketMoments}
              annualTheme={annualTheme}
              onUpdateAnnualTheme={handleUpdateAnnualTheme}
              onLikePost={handleLikePost}
              onReactLocket={handleReactLocket}
              onAddPost={handleAddPost}
              onDeletePost={handleDeletePost}
              onAddLocket={handleAddLocket}
              onDeleteLocket={handleDeleteLocket}
              onCheckIn={handleCheckIn}
              onIncreaseReadingStreak={handleIncreaseReadingStreak}
              onAddComment={handleAddComment}
            />
          </>
        )}

        {activeTab === 'command' && (
          <BcnCommandCenter
            currentUser={currentUser}
            isBcnMode={isBcnMode}
            isMasterRoot={isMasterRoot}
            plans={plans}
            tasks={tasks}
            decrees={decrees}
            userList={userList}
            memberEvaluations={memberEvaluations}
            reports={reports}
            transactions={transactions}
            posts={posts}
            onAddPlan={handleAddPlan}
            onDeletePlan={handleDeletePlan}
            onVotePlan={handleVotePlan}
            onUpdatePlanStatus={handleUpdatePlanStatus}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
            onUpdateTaskStatus={handleUpdateTaskStatus}
            onCompleteTaskAndReward={handleCompleteTaskAndReward}
            onAwardBadge={handleAwardBadge}
            onRemoveBadge={handleRemoveBadge}
            onIssueDecree={handleIssueDecree}
            onDeleteDecree={handleDeleteDecree}
            onAddEvaluation={handleAddEvaluation}
            onUpdateEvaluation={handleUpdateEvaluation}
            onDeleteEvaluation={handleDeleteEvaluation}
            onExecuteEvaluationAction={handleExecuteEvaluationAction}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onOpenRecruitment={() => setActiveTab('recruitment')}
            onOpenSuccession={() => setIsSuccessionModalOpen(true)}
            onOpenHallOfFame={() => setActiveTab('fame')}
            onOpenReports={() => setActiveTab('reports')}
            onDeleteUser={handleDeleteUser}
            onStateRestored={applyRemoteState}
            onAssignRole={handleAssignRole}
            onApproveDepartment={handleApproveDepartment}
            onRejectDepartment={handleRejectDepartment}
          />
        )}

        {activeTab === 'surveys' && (
          <SurveyMinutesSection
            currentUser={currentUser}
            isBcnMode={isBcnMode}
            userList={userList}
            onSaveMinutesToArchive={handleAddPlan}
          />
        )}

        {activeTab === 's5t' && (
          <S5TTrackerSection
            currentUser={currentUser}
            criteria={criteria}
            proofs={proofs}
            isBcnMode={isBcnMode}
            onSubmitProof={handleSubmitProof}
            onReviewProof={handleReviewProof}
            onDeleteProof={handleDeleteProof}
          />
        )}

        {activeTab === 'reports' && (
          <ConfidentialReportSection
            currentUser={currentUser}
            reports={reports}
            isBcnMode={isBcnMode}
            onSendReport={handleSendReport}
            onUpdateBcnResponse={handleUpdateBcnResponse}
            onDeleteReport={handleDeleteReport}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === 'vault' && (
          <FinancialVaultSection
            currentUser={currentUser}
            transactions={transactions}
            isBcnMode={isBcnMode}
            onUnlockBcn={handleUnlockBcn}
            onAddTransaction={handleAddTransaction}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === 'org' && (
          <OrgChartSection
            currentUser={currentUser}
            isBcnMode={isBcnMode}
            userList={userList}
            termHistory={termHistory}
            onApproveDepartment={handleApproveDepartment}
            onRejectDepartment={handleRejectDepartment}
            onAppointSubDeptLeaders={handleAppointSubDeptLeaders}
            onRequestGroupTransfer={handleRequestGroupTransfer}
            onDirectGroupTransfer={handleDirectGroupTransfer}
            onOpenSuccessionModal={() => setIsSuccessionModalOpen(true)}
            onDeleteUser={handleDeleteUser}
          />
        )}

        {activeTab === 'recruitment' && (
          <RecruitmentSection
            currentUser={currentUser}
            isMasterRoot={isMasterRoot}
            questions={questions}
            applications={applications}
            userList={userList}
            initialSubTab={isDirectApplyLink ? 'candidate_form' : undefined}
            onAddQuestion={handleAddQuestion}
            onDeleteQuestion={handleDeleteQuestion}
            onSubmitApplication={handleSubmitApplication}
            onReviewApplication={handleReviewApplication}
            onApproveDepartment={handleApproveDepartment}
          />
        )}

        {activeTab === 'fame' && (
          <HallOfFameSection
            items={hallOfFame}
            currentUser={currentUser}
            isBcnMode={isBcnMode}
            onAddItem={handleAddToHallOfFame}
            onUpdateItem={handleUpdateHallOfFameItem}
            onDeleteItem={handleDeleteFromHallOfFame}
          />
        )}
      </main>

      <WelcomeGuideModal
        isOpen={isWelcomeGuideOpen}
        onClose={handleCloseWelcomeGuide}
        currentUser={currentUser}
        isBcnMode={isBcnMode}
        onNavigateTab={(tab: ActiveTab) => setActiveTab(tab)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        onRegisterUser={handleRegisterUser}
        isBcnMode={isBcnMode}
        onUnlockBcn={handleUnlockBcn}
        onExitBcnMode={handleExitBcnMode}
        userList={userList}
        mySavedAccounts={mySavedAccounts}
        onDeleteUser={handleDeleteUser}
        onUpdateProfile={handleUpdateProfile}
        onLogout={handleLogout}
      />

      <SuccessionModal
        isOpen={isSuccessionModalOpen}
        onClose={() => setIsSuccessionModalOpen(false)}
        bcnAccounts={userList.filter(u => u.adminType === 'bcn_elected')}
        userList={userList}
        termHistory={termHistory}
        currentOperator={currentUser}
        onTransferSuccession={handleTransferSuccession}
        onAppointFullTerm={handleAppointFullTerm}
      />

      <BcnToastManager
        currentUser={currentUser}
        isBcnMode={isBcnMode}
        isMasterRoot={isMasterRoot}
        applications={applications}
        plans={plans}
        reports={reports}
        onNavigateTab={(tab: ActiveTab) => setActiveTab(tab)}
      />
    </div>
  );
}

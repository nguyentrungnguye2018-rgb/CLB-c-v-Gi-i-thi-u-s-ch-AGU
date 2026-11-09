import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  KeyRound, 
  UserCheck, 
  AlertCircle, 
  Sparkles, 
  GraduationCap, 
  Lock, 
  CheckCircle, 
  Unlock,
  UserPlus,
  Smile,
  BookOpen,
  Crown,
  ChevronRight,
  Trash2,
  Camera,
  Upload,
  User,
  Save,
  CheckCircle2,
  Eye,
  EyeOff,
  Search,
  RotateCcw,
  Pin
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, DepartmentType } from '../types';
import { SAMPLE_USERS, MASTER_PASSCODE } from '../data/mockData';
import { loginToCloud } from '../services/cloudSync';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  onRegisterUser: (newUser: UserProfile) => void;
  isBcnMode: boolean;
  onUnlockBcn: (passcode: string) => boolean;
  onExitBcnMode: () => void;
  userList: UserProfile[];
  mySavedAccounts?: UserProfile[];
  onDeleteUser?: (userId: string) => void;
  onUpdateProfile?: (updatedData: { userId: string; avatar?: string; nickname?: string; favoriteBook?: string; newPassword?: string }) => void;
  onLogout?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  onRegisterUser,
  isBcnMode,
  onUnlockBcn,
  onExitBcnMode,
  userList,
  onUpdateProfile,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'members' | 'register' | 'bcn'>('profile');
  
  // Profile settings state (for currently logged in user)
  const [editAvatar, setEditAvatar] = useState(currentUser.avatar);
  const [editNickname, setEditNickname] = useState(currentUser.nickname || '');
  const [editFavoriteBook, setEditFavoriteBook] = useState(currentUser.favoriteBook || '');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');
  const [profileSaveSuccess, setProfileSaveSuccess] = useState('');
  const [profileSaveError, setProfileSaveError] = useState('');
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  // Sync profile fields whenever currentUser changes
  useEffect(() => {
    setEditAvatar(currentUser.avatar);
    setEditNickname(currentUser.nickname || '');
    setEditFavoriteBook(currentUser.favoriteBook || '');
    setProfileSaveSuccess('');
    setProfileSaveError('');
  }, [currentUser]);

  // Security Gate before accessing "Chuyển Tài Khoản" tab (requires current account password OR Admin Passcode)
  const [isSwitchGateUnlocked, setIsSwitchGateUnlocked] = useState(false);
  const [gatePasswordInput, setGatePasswordInput] = useState('');
  const [gateError, setGateError] = useState('');
  const [showGatePassword, setShowGatePassword] = useState(false);

  // Strict credential-based account switching states (never lists other users' accounts publicly)
  const [switchIdentifier, setSwitchIdentifier] = useState('');
  const [switchPassword, setSwitchPassword] = useState('');
  const [switchError, setSwitchError] = useState('');
  const [showSwitchPassword, setShowSwitchPassword] = useState(false);

  // Reset security gate whenever modal opens/closes, tab changes, or currentUser changes
  useEffect(() => {
    setIsSwitchGateUnlocked(false);
    setGatePasswordInput('');
    setGateError('');
    setSwitchIdentifier('');
    setSwitchPassword('');
    setSwitchError('');
  }, [isOpen, activeTab, currentUser.id]);

  // Registration form states
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regNickname, setRegNickname] = useState('');
  const [regStudentId, setRegStudentId] = useState('');
  const [regFaculty, setRegFaculty] = useState('Khoa Sư phạm AGU');
  const [regDepartment, setRegDepartment] = useState<DepartmentType>('Nhân sự & Kế hoạch');
  const [regFavoriteBook, setRegFavoriteBook] = useState('');
  const [regAvatar, setRegAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80');
  const [regError, setRegError] = useState('');
  const regFileInputRef = useRef<HTMLInputElement>(null);

  // BCN Master login states
  const [passcodeInput, setPasscodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const sampleAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150&auto=format&fit=crop&q=80'
  ];

  // Helper: Read uploaded image file as base64 DataURL
  const handleUploadImageFile = (file: File, callback: (dataUrl: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        callback(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle saving current user profile changes
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaveError('');
    setProfileSaveSuccess('');

    if (newPasswordInput && newPasswordInput.length < 6) {
      setProfileSaveError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPasswordInput && newPasswordInput !== confirmNewPasswordInput) {
      setProfileSaveError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    if (onUpdateProfile) {
      onUpdateProfile({
        userId: currentUser.id,
        avatar: editAvatar,
        nickname: editNickname.trim(),
        favoriteBook: editFavoriteBook.trim(),
        newPassword: newPasswordInput || undefined
      });
    }

    setProfileSaveSuccess('Cập nhật hồ sơ và mật khẩu thành công! Thông tin đã được đồng bộ lên máy chủ.');
    setNewPasswordInput('');
    setConfirmNewPasswordInput('');

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  // Step 1 Security Gate: Verify current account password OR high-level Admin Passcode before opening account switch UI
  const handleUnlockSwitchGate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateError('');

    const cleanGatePass = gatePasswordInput.trim();
    if (!cleanGatePass) {
      setGateError('Vui lòng nhập mật khẩu của tài khoản hiện tại hoặc Mã bảo mật cấp cao (Admin Passcode)!');
      return;
    }

    const matchedCurrentInList = userList.find(u => u.id === currentUser.id);
    const expectedCurrentPassword =
      currentUser.password ||
      matchedCurrentInList?.password ||
      (currentUser.id === 'bcn-root' ? MASTER_PASSCODE : '');

    // Allow unlock if input matches current account's password OR high-level admin passcode
    if (
      cleanGatePass === MASTER_PASSCODE ||
      (expectedCurrentPassword && cleanGatePass === expectedCurrentPassword)
    ) {
      setIsSwitchGateUnlocked(true);
      setGatePasswordInput('');
      setGateError('');
      return;
    }

    // Fallback check against server for current user
    const currentIdentifier = currentUser.email || currentUser.studentId || currentUser.name;
    if (currentIdentifier) {
      const cloudVerify = await loginToCloud(currentIdentifier, cleanGatePass);
      if (cloudVerify.success) {
        setIsSwitchGateUnlocked(true);
        setGatePasswordInput('');
        setGateError('');
        return;
      }
    }

    setGateError('Mật khẩu tài khoản hiện tại hoặc Mã bảo mật cấp cao (Admin Passcode) không chính xác! Đã chặn truy cập chuyển đổi tài khoản.');
  };

  // Step 2: Strict password-authenticated account switch (never bypasses password)
  const handleConfirmSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSwitchError('');

    if (!isSwitchGateUnlocked) {
      setSwitchError('Vui lòng mở khóa xác thực bảo mật trước khi chuyển đổi tài khoản!');
      return;
    }

    const cleanId = switchIdentifier.trim().toLowerCase();
    const cleanPassword = switchPassword.trim();

    if (!cleanId || !cleanPassword) {
      setSwitchError('Vui lòng nhập đầy đủ Email/MSSV/Họ tên và Mật khẩu tài khoản cần chuyển đến!');
      return;
    }

    const foundLocal = userList.find(
      u =>
        (u.studentId && u.studentId.toLowerCase() === cleanId) ||
        (u.email && u.email.toLowerCase() === cleanId) ||
        (u.name && u.name.toLowerCase() === cleanId)
    );

    if (foundLocal) {
      const expectedPassword = foundLocal.password || (foundLocal.id === 'bcn-root' ? MASTER_PASSCODE : '');
      const isPasswordValid =
        (expectedPassword && cleanPassword === expectedPassword) ||
        cleanPassword === MASTER_PASSCODE;

      if (!isPasswordValid) {
        setSwitchError('Mật khẩu tài khoản đích hoặc Mã bảo mật không chính xác! Vui lòng kiểm tra lại.');
        return;
      }

      if (foundLocal.role !== 'bcn_admin' && foundLocal.adminType !== 'master_root') {
        onExitBcnMode();
      }
      onSelectUser(foundLocal);
      setSwitchIdentifier('');
      setSwitchPassword('');
      setIsSwitchGateUnlocked(false);
      onClose();
      return;
    }

    // Fallback: verify directly against cloud server
    const cloudResult = await loginToCloud(cleanId, cleanPassword);
    if (cloudResult.success && cloudResult.user) {
      if (cloudResult.user.role !== 'bcn_admin' && cloudResult.user.adminType !== 'master_root') {
        onExitBcnMode();
      }
      onSelectUser(cloudResult.user);
      setSwitchIdentifier('');
      setSwitchPassword('');
      setIsSwitchGateUnlocked(false);
      onClose();
      return;
    }

    setSwitchError(cloudResult.error || 'Tài khoản hoặc mật khẩu không chính xác!');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regName.trim() || !regStudentId.trim()) {
      setRegError('Vui lòng điền đầy đủ họ tên và mã số sinh viên.');
      return;
    }

    // Validate email (@agu.edu.vn, @student.agu.edu.vn, or @gmail.com)
    const emailClean = regEmail.trim().toLowerCase();
    if (!emailClean || !emailClean.includes('@')) {
      setRegError('Vui lòng nhập địa chỉ Email hợp lệ (@agu.edu.vn, @student.agu.edu.vn hoặc @gmail.com).');
      return;
    }

    // Validate password
    if (!regPassword || regPassword.length < 4) {
      setRegError('Mật khẩu phải có ít nhất 4 ký tự.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Xác nhận mật khẩu không trùng khớp.');
      return;
    }

    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      name: regName.trim(),
      email: regEmail.trim().toLowerCase(),
      password: regPassword,
      nickname: regNickname.trim() ? regNickname.trim() : `${regName.split(' ').slice(-1)[0]} Sách 📖`,
      studentId: regStudentId.toUpperCase().trim(),
      faculty: regFaculty,
      avatar: regAvatar,
      role: 'member',
      department: regDepartment,
      requestedDepartment: regDepartment,
      departmentStatus: 'pending_approval',
      departmentRole: 'member',
      position: `Chờ Account Chính duyệt vào Ban ${regDepartment}`,
      readingStreak: 0,
      enewsStreak: 0,
      hasCheckedInToday: false,
      s5tProgress: 0,
      favoriteBook: regFavoriteBook.trim() || 'Dế Mèn Phiêu Lưu Ký',
      joinDate: 'Tháng 10/2026',
      meritPoints: 0,
      badges: ['Tân Thành Viên AGU ✨', 'Chờ Duyệt Ban ⏳']
    };

    onRegisterUser(newUser);
    onSelectUser(newUser);
    onExitBcnMode();

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.5 },
      colors: ['#3B6E47', '#6AD5A1', '#C88A36', '#FAF6EB']
    });

    onClose();
  };

  const handleUnlockMaster = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (passcodeInput.trim() === MASTER_PASSCODE) {
      const bcnAdminUser = userList.find(u => u.adminType === 'master_root') || userList.find(u => u.role === 'bcn_admin') || SAMPLE_USERS[0];
      onUnlockBcn(passcodeInput);
      onSelectUser(bcnAdminUser);
      setSuccessMsg('Mở khóa Ban Chủ Nhiệm thành công! Kích hoạt toàn bộ quyền hạn tối cao.');

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#F59E0B', '#10B981', '#3B82F6', '#EF4444']
      });

      setTimeout(() => {
        onClose();
        setSuccessMsg('');
        setPasscodeInput('');
      }, 700);
    } else {
      setErrorMsg('Mã xác thực không chính xác! Vui lòng kiểm tra lại.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#FAF7F0] rounded-2xl border border-[#5E936B]/40 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#1C3621] to-[#2B5234] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <KeyRound className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif-vintage tracking-wide">
                Cổng Tài Khoản & Bảo Mật Cá Nhân CLB
              </h3>
              <p className="text-xs text-emerald-100/80">
                CLB Đọc và Giới thiệu sách Trường Đại học An Giang
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status bar */}
        <div className="bg-[#EFE9DA] px-5 py-2.5 border-b border-[#DFD5C2] flex items-center justify-between text-xs shrink-0">
          <span className="text-[#556D58] font-medium">Tài khoản đang đăng nhập:</span>
          <div className="flex items-center gap-2 font-bold text-[#23432B]">
            <img src={currentUser.avatar} alt={currentUser.name} className="w-5 h-5 rounded-full object-cover ring-1 ring-emerald-600" />
            <span>{currentUser.name}</span>
            {currentUser.nickname && (
              <span className="text-[11px] text-[#3B6E47] italic">({currentUser.nickname})</span>
            )}
            <span className={`px-2 py-0.5 rounded-md text-[10px] ${
              isBcnMode 
                ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold' 
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}>
              {isBcnMode ? '★ BCN Tối Cao' : (currentUser.position || currentUser.department)}
            </span>
          </div>
        </div>

        {/* Modal 4 Tabs */}
        <div className="flex border-b border-[#E3DAC8] px-4 pt-2 bg-[#F5F0E4] gap-1 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-[#3B6E47] text-[#23432B]'
                : 'border-transparent text-[#768C79] hover:text-[#23432B]'
            }`}
          >
            <User className="w-4 h-4 text-emerald-700" />
            <span>Hồ Sơ Của Tôi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`py-2 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'members'
                ? 'border-[#3B6E47] text-[#23432B]'
                : 'border-transparent text-[#768C79] hover:text-[#23432B]'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Chuyển Tài Khoản</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`py-2 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'register'
                ? 'border-[#3B6E47] text-[#23432B]'
                : 'border-transparent text-[#768C79] hover:text-[#23432B]'
            }`}
          >
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <span>Tự Tạo Account Mới</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bcn')}
            className={`py-2 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'bcn'
                ? 'border-amber-600 text-amber-900 bg-amber-50/50 rounded-t-lg'
                : 'border-transparent text-[#768C79] hover:text-amber-900'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-600" />
            <span>Cổng Ban Chủ Nhiệm</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* TAB 0: Hồ sơ cá nhân (Edit Avatar, Nickname, Password) */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-[#23432B] flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <div className="font-bold">Bảo Mật Tài Khoản & Cá Nhân Hóa Avatar</div>
                  <div className="text-[11px] text-stone-600">
                    Bạn có thể tự do tải ảnh đại diện từ điện thoại/máy tính và đổi mật khẩu riêng để bảo vệ quyền riêng tư.
                  </div>
                </div>
              </div>

              {profileSaveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{profileSaveSuccess}</span>
                </div>
              )}

              {profileSaveError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{profileSaveError}</span>
                </div>
              )}

              {/* Avatar Upload Section */}
              <div className="p-4 rounded-xl bg-white border border-[#DDD3BF] space-y-3">
                <label className="block font-bold text-[#23432B]">
                  Ảnh đại diện (Avatar) của bạn
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <img
                      src={editAvatar}
                      alt={currentUser.name}
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-600 shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => profileFileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition cursor-pointer"
                      title="Tải ảnh mới từ máy"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-2 flex-1">
                    <input
                      type="file"
                      ref={profileFileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadImageFile(file, (dataUrl) => setEditAvatar(dataUrl));
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => profileFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Chọn ảnh từ máy tính / điện thoại</span>
                    </button>
                    <p className="text-[10px] text-stone-500">
                      Hỗ trợ chụp từ camera hoặc ảnh JPG/PNG. Thể hiện cá tính riêng của bạn!
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100">
                  <span className="text-[11px] font-medium text-stone-500">Hoặc chọn avatar gợi ý:</span>
                  <div className="flex items-center gap-2 mt-1 overflow-x-auto pb-1">
                    {sampleAvatars.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt="preset"
                        onClick={() => setEditAvatar(url)}
                        className={`w-9 h-9 rounded-xl object-cover cursor-pointer transition ${
                          editAvatar === url ? 'ring-2 ring-[#3B6E47] scale-105' : 'opacity-60 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* User details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#23432B] mb-1">Họ và tên</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.name}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-100 text-stone-600 font-medium cursor-not-allowed"
                  />
                  <span className="text-[10px] text-stone-400">MSSV: {currentUser.studentId} • {currentUser.department}</span>
                </div>

                <div>
                  <label className="block font-bold text-[#23432B] mb-1">Bút danh / Nickname vui nhộn</label>
                  <input
                    type="text"
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    placeholder="Ví dụ: Mọt Sách AGU / Độc Giả Bí Ẩn"
                    className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white focus:ring-1 focus:ring-[#3B6E47]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#23432B] mb-1">Cuốn sách tâm đắc nhất của bạn</label>
                <input
                  type="text"
                  value={editFavoriteBook}
                  onChange={(e) => setEditFavoriteBook(e.target.value)}
                  placeholder="Ví dụ: Nhà Giả Kim, Tuổi Trẻ Đáng Giá Bao Nhiêu..."
                  className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white focus:ring-1 focus:ring-[#3B6E47]"
                />
              </div>

              {/* Change Password Section */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Đổi Mật Khẩu Riêng (Ngăn người khác xem bài & thông tin cá nhân)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">Mật khẩu mới</label>
                    <input
                      type="password"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Để trống nếu không muốn đổi"
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-300 bg-white focus:ring-1 focus:ring-amber-500 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">Xác nhận mật khẩu mới</label>
                    <input
                      type="password"
                      value={confirmNewPasswordInput}
                      onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-300 bg-white focus:ring-1 focus:ring-amber-500 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#DFD6C3]">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#23432B] hover:bg-[#1A3320] text-white font-bold flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4 text-emerald-300" />
                  <span>Lưu Thay Đổi Hồ Sơ & Mật Khẩu</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 1: Two-Step Security Gate + Strict Credential-Based Account Switching */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              {!isSwitchGateUnlocked ? (
                /* STEP 1: Mandatory Security Gate requiring Current Account Password OR Admin Passcode */
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-[#FDF8ED] border-2 border-amber-300 text-amber-950 text-xs flex items-start gap-3 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center shrink-0 text-amber-900">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-sm font-serif-vintage text-[#23432B]">
                        Khóa Bảo Mật Chuyển Đổi Tài Khoản
                      </div>
                      <p className="text-[11px] text-amber-900 leading-relaxed">
                        Để ngăn chặn việc truy cập trái phép vào tài khoản người khác trong menu quản trị, hệ thống yêu cầu bạn xác thực <strong>Mật khẩu của tài khoản hiện tại ({currentUser.name})</strong> hoặc <strong>Mã bảo mật cấp cao (Admin Passcode)</strong> trước khi mở chức năng Chuyển đổi tài khoản.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleUnlockSwitchGate} className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-[#DED4C3] shadow-xs space-y-4 text-xs">
                    <div className="flex items-center justify-between border-b border-[#EAE3D4] pb-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={currentUser.avatar}
                          alt={currentUser.name}
                          className="w-9 h-9 rounded-full object-cover ring-2 ring-[#3B6E47]"
                        />
                        <div>
                          <div className="font-bold text-[#1F3D26] text-xs sm:text-sm">
                            Xác Thực Quyền Mở Chuyển Đổi Tài Khoản
                          </div>
                          <div className="text-[11px] text-[#557058]">
                            Đang đăng nhập: <strong>{currentUser.name}</strong> ({currentUser.studentId})
                          </div>
                        </div>
                      </div>
                      <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                    </div>

                    {gateError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{gateError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block font-bold text-[#23432B] mb-1.5">
                        Nhập Mật khẩu của tài khoản hiện tại hoặc Mã bảo mật cấp cao (Admin Passcode) *
                      </label>
                      <div className="relative">
                        <input
                          type={showGatePassword ? 'text' : 'password'}
                          required
                          value={gatePasswordInput}
                          onChange={(e) => {
                            setGatePasswordInput(e.target.value);
                            setGateError('');
                          }}
                          placeholder="Nhập mật khẩu hiện tại hoặc mã bảo mật cấp cao..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#C5BCAB] bg-[#FAF8F3] font-mono text-xs focus:ring-2 focus:ring-[#3B6E47]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGatePassword(!showGatePassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                        >
                          {showGatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between gap-2">
                      {onLogout && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onLogout();
                          }}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold cursor-pointer transition"
                        >
                          Đăng Xuất Khỏi Thiết Bị
                        </button>
                      )}
                      <button
                        type="submit"
                        className="ml-auto px-5 py-2.5 rounded-xl bg-[#23432B] hover:bg-[#1A3320] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
                      >
                        <Unlock className="w-3.5 h-3.5 text-amber-300" />
                        <span>Xác Thực & Mở Cổng Chuyển Tài Khoản</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* STEP 2: Unlocked Target Account Credential Form */
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        <strong>Đã xác thực bảo mật cấp 1:</strong> Hãy nhập thông tin và mật khẩu của tài khoản bạn muốn chuyển sang.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSwitchGateUnlocked(false);
                        setSwitchIdentifier('');
                        setSwitchPassword('');
                        setSwitchError('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 font-bold text-[11px] hover:bg-emerald-100 cursor-pointer shrink-0"
                    >
                      Khóa Lại
                    </button>
                  </div>

                  <form onSubmit={handleConfirmSwitch} className="p-4 rounded-2xl bg-white border-2 border-[#DED4C3] shadow-xs space-y-3.5 text-xs">
                    <div className="border-b border-[#EAE3D4] pb-2.5 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-[#1F3D26] font-serif-vintage">
                          Đăng Nhập Tài Khoản Đích Cần Chuyển Đổi
                        </h4>
                        <p className="text-[11px] text-[#557058]">
                          Danh sách tài khoản của người khác được ẩn hoàn toàn để bảo mật
                        </p>
                      </div>
                      <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                    </div>

                    {switchError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{switchError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block font-bold text-[#23432B] mb-1">
                        Email AGU / Mã số sinh viên (MSSV) / Họ và tên của tài khoản cần chuyển đến *
                      </label>
                      <input
                        type="text"
                        required
                        value={switchIdentifier}
                        onChange={(e) => {
                          setSwitchIdentifier(e.target.value);
                          setSwitchError('');
                        }}
                        placeholder="Nhập Email @agu.edu.vn hoặc MSSV của tài khoản cần chuyển..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#C5BCAB] bg-[#FAF8F3] text-xs font-semibold focus:ring-2 focus:ring-[#3B6E47]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#23432B] mb-1">
                        Mật khẩu riêng của tài khoản đích (hoặc Mã bảo mật cấp cao) *
                      </label>
                      <div className="relative">
                        <input
                          type={showSwitchPassword ? 'text' : 'password'}
                          required
                          value={switchPassword}
                          onChange={(e) => {
                            setSwitchPassword(e.target.value);
                            setSwitchError('');
                          }}
                          placeholder="Nhập chính xác mật khẩu tài khoản đích..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#C5BCAB] bg-[#FAF8F3] font-mono text-xs focus:ring-2 focus:ring-[#3B6E47]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSwitchPassword(!showSwitchPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                        >
                          {showSwitchPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between gap-2">
                      {onLogout && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onLogout();
                          }}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold cursor-pointer transition"
                        >
                          Đăng Xuất Khỏi Thiết Bị
                        </button>
                      )}
                      <button
                        type="submit"
                        className="ml-auto px-5 py-2.5 rounded-xl bg-[#23432B] hover:bg-[#1A3320] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-300" />
                        <span>Xác Nhận Mật Khẩu & Chuyển Tài Khoản</span>
                      </button>
                    </div>
                  </form>

                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={() => setActiveTab('register')}
                      className="text-xs font-bold text-[#3B6E47] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Chưa có tài khoản? Tự tạo tài khoản mới tại đây</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Self Account Registration */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-[#E8F1E7] border border-[#BFDBC0] text-[#244E2C] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Đăng ký tài khoản sinh viên AGU chính thức với email <strong>@agu.edu.vn</strong> và mật khẩu bảo mật riêng!
                </span>
              </div>

              {regError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#23432B] mb-1">Họ và tên thật *</label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white focus:ring-1 focus:ring-[#3B6E47]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#23432B] mb-1">
                    Email trường AGU (@agu.edu.vn hoặc @student.agu.edu.vn) *
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="tenmssv@student.agu.edu.vn"
                    className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white focus:ring-1 focus:ring-[#3B6E47] font-mono"
                  />
                </div>
              </div>

              {/* Password fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#23432B] mb-1">Mật khẩu riêng *</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white font-mono focus:ring-1 focus:ring-[#3B6E47]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#23432B] mb-1">Xác nhận mật khẩu *</label>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white font-mono focus:ring-1 focus:ring-[#3B6E47]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#23432B] mb-1">Mã số sinh viên (MSSV) *</label>
                  <input
                    type="text"
                    required
                    value={regStudentId}
                    onChange={(e) => setRegStudentId(e.target.value)}
                    placeholder="Ví dụ: DTH241234"
                    className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white font-mono focus:ring-1 focus:ring-[#3B6E47]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#23432B] mb-1">
                    Bút danh / Nickname vui nhộn
                  </label>
                  <input
                    type="text"
                    value={regNickname}
                    onChange={(e) => setRegNickname(e.target.value)}
                    placeholder="Ví dụ: An Mọt Sách 📖 / Cú Đêm AGU"
                    className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white focus:ring-1 focus:ring-[#3B6E47]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#23432B] mb-1">Khoa / Ngành học</label>
                  <select
                    value={regFaculty}
                    onChange={(e) => setRegFaculty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white focus:ring-1 focus:ring-[#3B6E47]"
                  >
                    <option value="Khoa Sư phạm AGU">Khoa Sư phạm AGU</option>
                    <option value="Khoa Ngoại ngữ AGU">Khoa Ngoại ngữ AGU</option>
                    <option value="Khoa Kỹ thuật - CNTT AGU">Khoa Kỹ thuật - CNTT AGU</option>
                    <option value="Khoa Kinh tế - QTKD AGU">Khoa Kinh tế - QTKD AGU</option>
                    <option value="Khoa Du lịch & VHNT AGU">Khoa Du lịch & VHNT AGU</option>
                    <option value="Khoa Nông nghiệp - TNTN AGU">Khoa Nông nghiệp - TNTN AGU</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#23432B] mb-1">Cuốn sách yêu thích nhất</label>
                  <input
                    type="text"
                    value={regFavoriteBook}
                    onChange={(e) => setRegFavoriteBook(e.target.value)}
                    placeholder="Ví dụ: Hoàng Tử Bé..."
                    className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white focus:ring-1 focus:ring-[#3B6E47]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#23432B] mb-1">
                  Chọn Ban chuyên môn muốn sinh hoạt *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Truyền thông', label: 'Ban Truyền thông (E-News, Media)' },
                    { id: 'Nội dung', label: 'Ban Nội dung (Biên tập sách)' },
                    { id: 'Nhân sự & Kế hoạch', label: 'Ban Nhân sự & Kế hoạch (Trọng yếu ⭐)' },
                    { id: 'Hậu cần', label: 'Ban Hậu cần (Tủ sách Thư viện)' }
                  ].map((dept) => (
                    <div
                      key={dept.id}
                      onClick={() => setRegDepartment(dept.id as DepartmentType)}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition ${
                        regDepartment === dept.id
                          ? 'bg-[#E8F1E7] border-[#3B6E47] font-bold text-[#1F3D26]'
                          : 'bg-white border-[#D6CBB8] text-stone-600 hover:border-emerald-300'
                      }`}
                    >
                      {dept.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Avatar Upload or Select */}
              <div className="p-3 rounded-xl bg-white border border-[#DED4C3] space-y-2">
                <label className="block font-bold text-[#23432B]">
                  Ảnh đại diện cá nhân (Tải ảnh từ máy hoặc chọn mẫu)
                </label>
                <div className="flex items-center gap-3">
                  <img src={regAvatar} alt="preview" className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-600 shrink-0" />
                  <div className="space-y-1">
                    <input
                      type="file"
                      ref={regFileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadImageFile(file, (dataUrl) => setRegAvatar(dataUrl));
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => regFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold flex items-center gap-1.5 cursor-pointer text-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Tải ảnh từ máy / Camera</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pt-1">
                  {sampleAvatars.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt="avatar"
                      onClick={() => setRegAvatar(url)}
                      className={`w-9 h-9 rounded-xl object-cover cursor-pointer transition ${
                        regAvatar === url ? 'ring-2 ring-[#3B6E47] scale-105' : 'opacity-60 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#DFD6C3]">
                <button
                  type="button"
                  onClick={() => setActiveTab('members')}
                  className="px-4 py-2 rounded-xl bg-stone-200 text-stone-700 font-semibold cursor-pointer"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#23432B] hover:bg-[#1A3320] text-white font-bold cursor-pointer flex items-center gap-2 shadow-md"
                >
                  <UserPlus className="w-4 h-4 text-emerald-300" />
                  <span>Tạo Tài Khoản & Vào CLB</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: BCN Master Login Portal */}
          {activeTab === 'bcn' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-[#FDF8EE] border border-amber-300">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-800">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div className="text-xs space-y-1">
                    <h4 className="font-bold text-amber-950 text-sm">
                      Trung Tâm Chỉ Huy Ban Chủ Nhiệm (Master War Room)
                    </h4>
                    <p className="text-amber-900 leading-relaxed">
                      Dành riêng cho Ban Chủ Nhiệm và Cố Vấn CLB. Toàn quyền điều phối nhiệm vụ 4 ban, cùng Ban Nội Dung & Ban Nhân Sự - Kế Hoạch biểu quyết phê duyệt kế hoạch, phong huân chương, quản lý ngân sách và giải mã hòm thư.
                    </p>
                  </div>
                </div>
              </div>

              {isBcnMode ? (
                <div className="p-4 rounded-xl bg-[#E8F3EA] border border-[#3B6E47] text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span>Bạn đang nắm quyền Ban Chủ Nhiệm Tối Cao</span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    Tab "Trung Tâm BCN" và "Két Quỹ" đã được mở khóa toàn diện trên thanh điều hướng.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('members');
                    }}
                    className="px-4 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    Chuyển Sang Tài Khoản Cá Nhân (Yêu Cầu Nhập Mật Khẩu)
                  </button>
                </div>
              ) : (
                <form onSubmit={handleUnlockMaster} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-[#23432B] mb-1.5">
                      Nhập Mã Bảo Mật Câu Lạc Bộ:
                    </label>
                    <div className="relative">
                      <input 
                        type="password"
                        value={passcodeInput}
                        onChange={(e) => setPasscodeInput(e.target.value)}
                        placeholder="Nhập mã xác thực câu lạc bộ..."
                        className="w-full px-4 py-2.5 rounded-xl border border-[#C5BCAB] bg-white text-sm focus:ring-2 focus:ring-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 p-2.5 rounded-xl border border-red-200">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className="flex items-center gap-2 text-emerald-700 text-xs bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs shadow-md bubble-3d flex items-center gap-2 cursor-pointer"
                    >
                      <Unlock className="w-4 h-4" />
                      Kích Hoạt Quyền BCN
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

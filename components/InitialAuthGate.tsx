import React, { useState } from 'react';
import { 
  BookOpen, 
  Crown, 
  UserPlus, 
  KeyRound, 
  Sparkles, 
  Feather, 
  GraduationCap, 
  CheckCircle, 
  AlertCircle, 
  ShieldCheck, 
  ArrowRight,
  Flame,
  Star,
  Upload,
  Camera,
  Lock,
  Search,
  Pin,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, DepartmentType } from '../types';
import { MASTER_PASSCODE, SPECIAL_BCN_ACCOUNTS } from '../data/mockData';
import { readFileAsDataUrl } from '../utils/imageUpload';
import { loginToCloud } from '../services/cloudSync';
import { signInWithGoogleFirebase } from '../firebase';

interface InitialAuthGateProps {
  onLogin: (user: UserProfile, isBcn: boolean) => void;
  onRegister: (newUser: UserProfile) => void;
  userList: UserProfile[];
  mySavedAccounts?: UserProfile[];
}

export const InitialAuthGate: React.FC<InitialAuthGateProps> = ({
  onLogin,
  onRegister,
  userList,
  mySavedAccounts = []
}) => {
  const [activeTab, setActiveTab] = useState<'register' | 'member_login' | 'bcn_portal'>('register');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Register form states
  const [regName, setRegName] = useState('');
  const [regNickname, setRegNickname] = useState('');
  const [regStudentId, setRegStudentId] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regFaculty, setRegFaculty] = useState('Khoa Sư phạm');
  const [regDepartment, setRegDepartment] = useState<DepartmentType>('Nhân sự & Kế hoạch');
  const [regFavoriteBook, setRegFavoriteBook] = useState('');
  const [regAvatar, setRegAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80');
  const [regError, setRegError] = useState('');

  // Member Login states
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  // BCN Master Passcode
  const [bcnPasscode, setBcnPasscode] = useState('');
  const [bcnSelectedAccount, setBcnSelectedAccount] = useState<string>(SPECIAL_BCN_ACCOUNTS[0].id);
  const [bcnError, setBcnError] = useState('');

  const handleGoogleSignIn = async () => {
    setRegError('');
    setLoginError('');
    setIsGoogleLoading(true);
    try {
      const { userProfile, isAdmin } = await signInWithGoogleFirebase();
      const existing = userList.find(
        u => u.id === userProfile.id || (u.email && u.email.toLowerCase() === userProfile.email?.toLowerCase())
      );
      if (existing) {
        onLogin(existing, isAdmin || existing.role === 'bcn_admin');
      } else {
        onRegister(userProfile);
        onLogin(userProfile, isAdmin);
      }
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#3B6E47', '#6AD5A1', '#C88A36', '#FAF6EB']
      });
    } catch (err: any) {
      const msg = err?.message || 'Đăng nhập Google không thành công.';
      if (!msg.includes('popup-closed-by-user')) {
        setRegError('Không thể đăng nhập bằng Google: ' + msg);
        setLoginError('Không thể đăng nhập bằng Google: ' + msg);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const sampleAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  ];

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!regName.trim() || !regStudentId.trim() || !regEmail.trim()) {
      setRegError('Vui lòng điền đầy đủ họ tên, MSSV và Email AGU.');
      return;
    }

    const emailClean = regEmail.trim().toLowerCase();
    if (!emailClean.includes('@')) {
      setRegError('Vui lòng nhập Email hợp lệ (@agu.edu.vn, @student.agu.edu.vn hoặc @gmail.com)');
      return;
    }

    if (!regPassword || regPassword.length < 4) {
      setRegError('Mật khẩu bắt buộc phải có ít nhất 4 ký tự để bảo vệ tài khoản của bạn.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Mật khẩu xác nhận không trùng khớp. Vui lòng kiểm tra lại!');
      return;
    }

    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      name: regName.trim(),
      nickname: regNickname.trim() ? regNickname.trim() : `${regName.split(' ').slice(-1)[0]} Sách 📖`,
      studentId: regStudentId.toUpperCase().trim(),
      email: emailClean,
      password: regPassword.trim(),
      faculty: regFaculty,
      avatar: regAvatar,
      role: 'member',
      adminType: 'member',
      department: regDepartment,
      requestedDepartment: regDepartment,
      departmentStatus: 'pending_approval',
      departmentRole: 'member',
      position: `Chờ duyệt vào Ban ${regDepartment}`,
      readingStreak: 0,
      enewsStreak: 0,
      hasCheckedInToday: false,
      s5tProgress: 0,
      favoriteBook: regFavoriteBook.trim() || 'Dế Mèn Phiêu Lưu Ký',
      joinDate: 'Tháng 10/2026',
      meritPoints: 0,
      badges: ['Tân Thành Viên Mới ✨', 'Chờ Duyệt Ban ⏳']
    };

    onRegister(newUser);
    onLogin(newUser, false);

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.5 },
      colors: ['#3B6E47', '#6AD5A1', '#C88A36', '#FAF6EB']
    });
  };

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setLoginError('Vui lòng nhập Email, MSSV hoặc Họ tên và mật khẩu');
      return;
    }

    const cleanId = loginIdentifier.trim().toLowerCase();
    const found = userList.find(u => 
      (u.studentId && u.studentId.toLowerCase() === cleanId) ||
      (u.email && u.email.toLowerCase() === cleanId) ||
      (u.name && u.name.toLowerCase() === cleanId)
    );

    if (found) {
      const correctPassword = found.password || (found.id === 'bcn-root' ? MASTER_PASSCODE : '');
      if (!correctPassword || loginPassword.trim() !== correctPassword) {
        setLoginError('Mật khẩu không chính xác! Vui lòng kiểm tra lại.');
        return;
      }

      onLogin(found, found.role === 'bcn_admin');
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#3B6E47', '#D4AF37', '#10B981']
      });
      return;
    }

    // Fallback: verify directly against cloud server in case local userList hasn't synced yet
    const cloudLoginResult = await loginToCloud(cleanId, loginPassword.trim());
    if (cloudLoginResult.success && cloudLoginResult.user) {
      onLogin(cloudLoginResult.user, cloudLoginResult.user.role === 'bcn_admin');
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#3B6E47', '#D4AF37', '#10B981']
      });
      return;
    }

    setLoginError(cloudLoginResult.error || 'Không tìm thấy tài khoản với Email, MSSV hoặc Họ tên này!');
  };

  const handleBcnLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (bcnPasscode.trim() === MASTER_PASSCODE) {
      const selectedBcn = userList.find(u => u.id === bcnSelectedAccount) || SPECIAL_BCN_ACCOUNTS[0];
      onLogin(selectedBcn, true);

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#F59E0B', '#10B981', '#3B82F6']
      });
    } else {
      setBcnError('Mã xác thực không chính xác! Vui lòng kiểm tra lại.');
    }
  };

  const bcnAccounts = userList.filter(u => u.role === 'bcn_admin');
  const displayBcnList = bcnAccounts.length > 0 ? bcnAccounts : SPECIAL_BCN_ACCOUNTS;
  const membersOnly = userList.filter(u => u.id !== 'bcn-root');

  return (
    <div className="min-h-screen bg-[#F8F5EE] flex flex-col justify-center items-center p-3 sm:p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#8BAE90]/15 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#C88A36]/10 rounded-full blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2" />

      <div className="w-full max-w-4xl bg-white rounded-2xl border-2 border-[#DED4C3] shadow-xl overflow-hidden relative z-10 flex flex-col md:flex-row">
        {/* Left Side: Brand & Spirit */}
        <div className="md:w-5/12 bg-gradient-to-br from-[#1B3521] via-[#24482C] to-[#36683E] text-white p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col items-start gap-3">
              <img 
                src="/assets/aistudio/TUYE__N_THA_NH_VIE_N_778c37b9.png" 
                alt="Logo CLB Đọc và Giới thiệu sách" 
                className="h-14 sm:h-16 w-auto object-contain rounded-full"
              />
              <div>
                <span className="text-[10px] tracking-wider uppercase font-bold text-emerald-200">
                  Cổng Đăng Ký & Đăng Nhập
                </span>
                <h1 className="text-base sm:text-lg font-bold font-serif-vintage tracking-tight">
                  CLB Đọc và Giới thiệu sách
                </h1>
              </div>
            </div>

            <p className="text-xs text-emerald-100/90 leading-relaxed font-reading">
              "Sách mở ra những chân trời bao la, nơi mỗi sinh viên tìm thấy ngọn lửa tri thức và những người bạn cùng chung chí hướng."
            </p>
          </div>

          <div className="space-y-2.5 bg-black/20 p-3.5 rounded-xl border border-white/10 text-xs">
            <div className="font-bold text-amber-300 flex items-center gap-1.5 text-[11px]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Đặc quyền thành viên sau khi đăng ký:</span>
            </div>
            <ul className="space-y-1 text-[11px] text-[#D3E8D7] pl-1">
              <li>✓ Tự đặt Bút danh / Nickname cá tính</li>
              <li>✓ Giữ chuỗi đọc sách và E-News mỗi ngày 🔥</li>
              <li>✓ Nộp minh chứng xét danh hiệu Sao Năm Cánh (Sinh viên 5 tốt)</li>
              <li>✓ Đăng bài tản văn và Locket khoảnh khắc</li>
            </ul>
          </div>

          <div className="text-[10px] text-emerald-200/80 pt-2 border-t border-white/10">
            Quản trị 100% bởi Sinh Viên • Tự do sáng tạo & lan tỏa tri thức
          </div>
        </div>

        {/* Right Side: Tabbed Auth Forms */}
        <div className="md:w-7/12 p-6 sm:p-8 bg-[#FAF8F3] flex flex-col justify-between">
          <div>
            {/* Quick Google Sign-In Banner */}
            <div className="mb-3.5">
              <button
                type="button"
                disabled={isGoogleLoading}
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-emerald-50/70 border-2 border-[#3B6E47] text-[#1F3D26] font-bold text-xs shadow-xs flex items-center justify-center gap-2.5 cursor-pointer transition disabled:opacity-60"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>
                  {isGoogleLoading
                    ? 'Đang xác thực tài khoản Google...'
                    : 'Đăng nhập nhanh bằng Google (Firebase Auth)'}
                </span>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-[#DCD1BE] pb-2 mb-4 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'register'
                    ? 'bg-[#23432B] text-white shadow-xs'
                    : 'text-[#536E56] hover:bg-[#EAE3D2]'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>1. Đăng Ký Mới</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('member_login')}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'member_login'
                    ? 'bg-[#23432B] text-white shadow-xs'
                    : 'text-[#536E56] hover:bg-[#EAE3D2]'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>2. Đăng Nhập Thành Viên</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('bcn_portal')}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'bcn_portal'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'text-amber-900 hover:bg-amber-100/60'
                }`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <span>3. Cổng BCN</span>
              </button>
            </div>

            {/* TAB 1: Register New Account */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3 text-xs">
                {regError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2 animate-in fade-in">
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
                      placeholder="Ví dụ: Nguyễn Hoàng Nam"
                      className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-1 focus:ring-[#3B6E47]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#23432B] mb-1">Bút danh / Nickname cá tính *</label>
                    <input
                      type="text"
                      required
                      value={regNickname}
                      onChange={(e) => setRegNickname(e.target.value)}
                      placeholder="Ví dụ: Nam Bút Mực 🖋️"
                      className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-1 focus:ring-[#3B6E47]"
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
                      placeholder="Ví dụ: DTH241890"
                      className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white font-mono text-xs focus:ring-1 focus:ring-[#3B6E47]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#23432B] mb-1">Khoa / Ngành học</label>
                    <input
                      type="text"
                      value={regFaculty}
                      onChange={(e) => setRegFaculty(e.target.value)}
                      placeholder="Khoa Sư phạm, CNTT, Ngoại ngữ..."
                      className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs"
                    />
                  </div>
                </div>

                {/* Email AGU Requirement */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-[#23432B]">
                      Email AGU Trường Cấp (@agu.edu.vn hoặc @student.agu.edu.vn) *
                    </label>
                  </div>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="ten.mssv@agu.edu.vn hoặc @student.agu.edu.vn"
                    className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-1 focus:ring-[#3B6E47]"
                  />
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    Bắt buộc dùng Email của Trường Đại học An Giang để xác thực danh tính sinh viên.
                  </span>
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#23432B] mb-1">Mật khẩu riêng cho tài khoản *</label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Tối thiểu 4 ký tự..."
                      className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-1 focus:ring-[#3B6E47]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#23432B] mb-1">Xác nhận mật khẩu *</label>
                    <input
                      type="password"
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu..."
                      className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-1 focus:ring-[#3B6E47]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#23432B] mb-1">Chọn Ban chuyên môn tham gia *</label>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {[
                      { id: 'Truyền thông', label: 'Ban Truyền thông' },
                      { id: 'Nội dung', label: 'Ban Nội dung' },
                      { id: 'Nhân sự & Kế hoạch', label: 'Ban Nhân sự & Kế hoạch (⭐)' },
                      { id: 'Hậu cần', label: 'Ban Hậu cần' }
                    ].map(dept => (
                      <div
                        key={dept.id}
                        onClick={() => setRegDepartment(dept.id as DepartmentType)}
                        className={`p-2 rounded-xl border text-center cursor-pointer transition ${
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

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-[#23432B]">Ảnh đại diện / Avatar (Tự do cá tính) *</label>
                    <label className="text-[11px] font-bold text-[#2E5839] hover:underline flex items-center gap-1 cursor-pointer">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Tải ảnh từ máy / Chụp ảnh</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const b64 = await readFileAsDataUrl(file, 400, 0.85);
                              setRegAvatar(b64);
                            } catch (err: any) {
                              alert(err.message || 'Lỗi đọc ảnh');
                            }
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-[#C5BCAB]">
                    <img
                      src={regAvatar}
                      alt="avatar preview"
                      className="w-11 h-11 rounded-xl object-cover ring-2 ring-[#3B6E47] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-stone-500 mb-1">Hoặc chọn nhanh sticker:</div>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                        {sampleAvatars.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt="avatar"
                            onClick={() => setRegAvatar(url)}
                            className={`w-7 h-7 rounded-lg object-cover cursor-pointer transition ${
                              regAvatar === url ? 'ring-2 ring-[#3B6E47] scale-105' : 'opacity-60 hover:opacity-100'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#23432B] mb-1">Cuốn sách tâm đắc nhất</label>
                  <input
                    type="text"
                    value={regFavoriteBook}
                    onChange={(e) => setRegFavoriteBook(e.target.value)}
                    placeholder="Ví dụ: Hoàng Tử Bé, Cây Cam Ngọt Của Tôi..."
                    className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 rounded-xl bg-[#23432B] hover:bg-[#1A3320] text-white font-bold text-xs shadow-md bubble-3d flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-emerald-300" />
                  <span>Hoàn Tất Đăng Ký & Tạo Mật Khẩu Riêng</span>
                </button>
              </form>
            )}

            {/* TAB 2: Member Password-Protected Login */}
            {activeTab === 'member_login' && (
              <div className="space-y-3.5 text-xs">
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-[11px] flex items-start gap-2">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Bảo mật tuyệt đối:</strong> Hệ thống không hiển thị công khai danh sách tài khoản thành viên. Bạn bắt buộc phải nhập đúng <strong>Email AGU / MSSV</strong> và <strong>Mật khẩu riêng</strong> đã tạo để đăng nhập.
                  </span>
                </div>

                <form onSubmit={handleMemberLogin} className="space-y-3 bg-white p-4 rounded-xl border border-[#DED4C3] shadow-xs">
                  <div className="border-b border-[#EAE3D4] pb-2">
                    <h3 className="font-bold text-sm text-[#1F3D26] font-serif-vintage">
                      Đăng Nhập Thành Viên Có Mật Khẩu Riêng
                    </h3>
                    <p className="text-[11px] text-[#557058]">
                      Nhập Email AGU, MSSV hoặc Họ tên kèm mật khẩu riêng để vào tài khoản.
                    </p>
                  </div>

                  {loginError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-[#23432B] mb-1">
                      Email AGU / Mã số sinh viên (MSSV) / Họ và tên *
                    </label>
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="Ví dụ: nam.nh@agu.edu.vn hoặc DTH215842"
                      className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-[#FAF8F3] text-xs font-semibold focus:ring-1 focus:ring-[#3B6E47]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#23432B] mb-1">
                      Mật khẩu tài khoản của bạn *
                    </label>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Nhập chính xác mật khẩu tài khoản của bạn..."
                      className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-[#FAF8F3] text-xs focus:ring-1 focus:ring-[#3B6E47]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#23432B] hover:bg-[#1A3320] text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-4 h-4 text-amber-300" />
                    <span>Đăng Nhập Vào Tài Khoản</span>
                  </button>
                </form>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="text-xs font-bold text-[#3B6E47] hover:underline cursor-pointer"
                  >
                    + Chưa có tài khoản? Bấm sang Đăng Ký Mới
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: BCN Special Portal */}
            {activeTab === 'bcn_portal' && (
              <form onSubmit={handleBcnLogin} className="space-y-3.5 text-xs">
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-700" />
                    <span>Cổng Ban Chủ Nhiệm Sinh Viên:</span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    Bao gồm <strong>1 Account Chính (Câu lạc bộ Đọc và Giới thiệu sách)</strong> giữ toàn quyền và <strong>3 Account BCN nhiệm kỳ</strong>.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-[#23432B] mb-1">
                    Chọn Account Ban Chủ Nhiệm:
                  </label>
                  <div className="space-y-2">
                    {displayBcnList.map((acc) => (
                      <div
                        key={acc.id}
                        onClick={() => setBcnSelectedAccount(acc.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2.5 ${
                          bcnSelectedAccount === acc.id
                            ? 'bg-[#E8F1E7] border-[#3B6E47] ring-1 ring-[#3B6E47]'
                            : 'bg-white border-[#D6CBB8] hover:border-emerald-300'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#23432B] text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {acc.adminType === 'master_root' ? '🏛️' : '👑'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-[#1F3D26] truncate">
                            {acc.name}
                          </div>
                          <div className="text-[10px] text-stone-500 truncate">
                            {acc.position} • {acc.term}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#23432B] mb-1">
                    Nhập Mã Xác Thực Câu Lạc Bộ:
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={bcnPasscode}
                      onChange={(e) => setBcnPasscode(e.target.value)}
                      placeholder="Nhập mã bảo mật câu lạc bộ..."
                      className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white font-mono text-xs focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {bcnError && (
                  <p className="text-xs text-rose-600 font-semibold">{bcnError}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white font-bold text-xs shadow-md bubble-3d flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Crown className="w-4 h-4" />
                  <span>Xác Nhận & Mở Quyền BCN</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

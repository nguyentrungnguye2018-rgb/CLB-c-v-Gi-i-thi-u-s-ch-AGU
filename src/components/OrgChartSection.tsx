// State tạo tài khoản Giám Sát Hội Sinh Viên Trường (Chỉ Tài khoản Chính CLB bcn-root tự quyết định)
  const [isCreateHsvOpen, setIsCreateHsvOpen] = useState(false);
  const [hsvDisplayName, setHsvDisplayName] = useState('Ban Thư Ký Hội Sinh Viên Trường ĐH An Giang');
  const [hsvUsername, setHsvUsername] = useState('HSV-AGU-ADMIN');
  const [hsvPassword, setHsvPassword] = useState('');

  const handleCreateHsvSupervisorAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRoot || !hsvDisplayName.trim() || !hsvUsername.trim() || !hsvPassword.trim()) return;

    const newHsvAccount: UserProfile = {
      id: `hsv_sup_${Date.now()}`,
      name: hsvDisplayName.trim(),
      nickname: 'Hội Sinh Viên Giám Sát 🏛️',
      studentId: hsvUsername.trim().toUpperCase(),
      faculty: 'Hội Sinh Viên Trường ĐH An Giang',
      avatar: '/assets/aistudio/TUYE__N_THA_NH_VIE_N_778c37b9.png',
      role: 'bcn_admin',
      adminType: 'hsv_supervisor',
      clubRole: 'hsv_supervisor',
      department: 'BQT',
      departmentStatus: 'approved',
      position: 'Hội Sinh Viên Trường (Quản Lý & Giám Sát CLB)',
      departmentRole: 'leader',
      term: 'Giám Sát Thường Trực',
      email: `${hsvUsername.trim().toLowerCase()}@agu.edu.vn`,
      password: hsvPassword.trim(),
      readingStreak: 0,
      enewsStreak: 0,
      hasCheckedInToday: false,
      s5tProgress: 100,
      favoriteBook: 'Văn Hóa Đọc Sinh Viên AGU',
      joinDate: new Date().getFullYear().toString(),
      meritPoints: 0,
      badges: ['Hội Sinh Viên Trường ĐH An Giang 🏛️'],
      canComment: true
    };

    const nextUsers = [...effectiveUserList, newHsvAccount];
    setLocallyCreatedAlumni((prev) => [...prev, newHsvAccount]);
    await syncUsersToServer(nextUsers);

    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    setDeptActionBanner(
      `Tài khoản Chính CLB đã cấp phát thành công tài khoản Hội Sinh Viên Giám Sát "${newHsvAccount.name}" (Tên đăng nhập: ${newHsvAccount.studentId}) — Có quyền quản lý như Chủ nhiệm nhưng khóa quyền Thu/Chi và Giải quyết mâu thuẫn nội bộ!`
    );
    setIsCreateHsvOpen(false);
    setHsvPassword('');
    setTimeout(() => setDeptActionBanner(null), 7000);
  };

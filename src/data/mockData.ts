import { 
  UserProfile, 
  Post, 
  LocketMoment, 
  S5TCriterion, 
  S5TProof, 
  ConfidentialReport, 
  Transaction, 
  ClubDepartment,
  ClubPlan,
  ClubTask,
  ClubDecree,
  HallOfFameItem,
  RecruitmentQuestion,
  RecruitmentApplication,
  ClubTermRecord
} from '../types';

export const MASTER_PASSCODE = 'AGU2026';

// Tài khoản Chính thức duy nhất của Câu lạc bộ khi xuất bản chính thức
export const SPECIAL_BCN_ACCOUNTS: UserProfile[] = [
  {
    id: 'bcn-root',
    name: 'Câu lạc bộ Đọc và Giới thiệu sách',
    nickname: 'Tài Khoản Chính CLB 🏛️',
    studentId: 'CLB-ROOT-PERMANENT',
    email: 'clb.docsach@agu.edu.vn',
    password: MASTER_PASSCODE,
    faculty: 'Đại Diện Toàn Thể Sinh Viên CLB',
    avatar: '/assets/aistudio/TUYE__N_THA_NH_VIE_N_778c37b9.png',
    role: 'bcn_admin',
    adminType: 'master_root',
    clubRole: 'root',
    department: 'BQT',
    departmentStatus: 'approved',
    position: 'Tài Khoản Chính CLB (Quản Trị Tối Cao)',
    departmentRole: 'leader',
    term: 'Vĩnh Cửu',
    readingStreak: 0,
    enewsStreak: 0,
    hasCheckedInToday: false,
    s5tProgress: 0,
    favoriteBook: 'Tủ Sách Tri Thức CLB',
    joinDate: '2026',
    meritPoints: 0,
    badges: ['Tài Khoản Chính CLB 🏛️']
  }
];

export const SAMPLE_USERS: UserProfile[] = [
  ...SPECIAL_BCN_ACCOUNTS
];

export const INITIAL_TERM_HISTORY: ClubTermRecord[] = [];

export const HALL_OF_FAME_DATA: HallOfFameItem[] = [];

export const INITIAL_RECRUITMENT_QUESTIONS: RecruitmentQuestion[] = [
  {
    id: 'rq-1',
    text: 'Bạn thường dành thời gian đọc những thể loại sách nào nhiều nhất?',
    type: 'multiple_choice',
    options: ['Văn học kinh điển & Tản văn', 'Kỹ năng mềm & Phát triển bản thân', 'Tâm lý & Triết học', 'Khoa học & Công nghệ', 'Truyện tranh & Trinh thám'],
    required: true
  },
  {
    id: 'rq-2',
    text: 'Bạn có nguyện vọng cống hiến cho Ban chuyên môn nào?',
    type: 'multiple_choice',
    options: ['Ban Truyền thông (Thiết kế poster, viết E-News, TikTok)', 'Ban Nội dung (Biên tập sách, đàm đạo văn học)', 'Ban Nhân sự & Kế hoạch (Lên plan, tổ chức sự kiện, SV5T)', 'Ban Hậu cần (Quản lý tủ sách, âm thanh, quà tặng)'],
    required: true
  },
  {
    id: 'rq-3',
    text: 'Nếu được chọn 1 cuốn sách làm bạn đồng hành trên hoang đảo, bạn chọn cuốn nào và vì sao?',
    type: 'short_answer',
    required: true
  },
  {
    id: 'rq-4',
    text: 'Bạn có thể dành ra bao nhiêu giờ mỗi tuần cho các hoạt động của CLB?',
    type: 'multiple_choice',
    options: ['3 - 5 giờ / tuần', '5 - 8 giờ / tuần', 'Trên 8 giờ / tuần (Toàn tâm toàn ý)'],
    required: true
  },
  {
    id: 'rq-5',
    text: 'Điều gì khiến bạn muốn nộp đơn gia nhập CLB Đọc và Giới thiệu sách kỳ này?',
    type: 'short_answer',
    required: false
  }
];

export const INITIAL_APPLICATIONS: RecruitmentApplication[] = [];

export const BOOK_ISLAND_QUOTES = [
  { text: 'Sách là tấm vé khứ hồi tới những miền đất ta chưa từng đặt chân.', author: 'CLB Đọc Sách' },
  { text: 'Hôm nay bạn đã đọc được 15 trang sách chưa? Bắt đầu giữ chuỗi lửa nào! 🔥', author: 'Thư viện Sách' },
  { text: 'Đọc một cuốn sách hay cũng như trò chuyện với người thông tuệ nhất.', author: 'René Descartes' },
  { text: 'Trang sách lật mở, chân trời nở hoa - Tự hào tuổi trẻ đọc sách! 🌿', author: 'Bản tin E-News' }
];

export const INITIAL_POSTS: Post[] = [];

export const INITIAL_LOCKET_MOMENTS: LocketMoment[] = [];

export const S5T_CRITERIA_LIST: S5TCriterion[] = [
  {
    id: 'crit-1',
    name: 'Đạo đức tốt',
    description: 'Điểm rèn luyện cả năm đạt từ 90 điểm trở lên (thang 100); Không vi phạm pháp luật & quy chế; Đạt thêm ít nhất 01 tiêu chí rèn luyện tư tưởng, đạo đức.',
    iconName: 'ShieldCheck',
    requiredCount: 2,
    completedCount: 0,
    status: 'in_progress',
    regulationArticle: 'Điều 5.2.1 QĐ 118/QĐ-HSV',
    mandatorySummary: 'ĐRL cả năm ≥ 90/100 điểm & Không vi phạm pháp luật, nội quy nhà trường, quy định địa phương và cộng đồng.',
    electiveSummary: 'Đạt thêm ít nhất 01 trong 06 tiêu chí về rèn luyện, tư tưởng chính trị, đạo đức lối sống.',
    electiveMinCount: 1,
    subRequirements: [
      {
        id: 'crit-1-m1',
        type: 'mandatory',
        title: 'Điểm rèn luyện đạt từ 90 điểm trở lên',
        detail: 'Điểm rèn luyện trung bình chung cả năm học đạt từ 90 điểm trở lên trên thang điểm 100 theo quy chế Bộ GD&ĐT.'
      },
      {
        id: 'crit-1-m2',
        type: 'mandatory',
        title: 'Chấp hành pháp luật & nội quy',
        detail: 'Không vi phạm pháp luật và các quy chế, nội quy của nhà trường, quy định của địa phương và cộng đồng.'
      },
      {
        id: 'crit-1-e1',
        type: 'elective',
        title: 'Đảng viên Hoàn thành xuất sắc nhiệm vụ',
        detail: 'Đạt mức xếp loại Đảng viên Hoàn thành xuất sắc nhiệm vụ trong năm gần nhất (áp dụng cho sinh viên là Đảng viên ĐCSVN).'
      },
      {
        id: 'crit-1-e2',
        type: 'elective',
        title: 'Thanh niên tiên tiến làm theo lời Bác',
        detail: 'Là gương điển hình trong việc học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh được biểu dương từ cấp Trường trở lên.'
      },
      {
        id: 'crit-1-e3',
        type: 'elective',
        title: 'Hành động dũng cảm hoặc cứu người, giúp người neo đơn',
        detail: 'Có hành động dũng cảm cứu người bị nạn, bắt cướp, giúp người nghèo, người gặp khó khăn hoạn nạn được khen thưởng từ cấp cơ sở trở lên hoặc được nêu gương trên truyền thông.'
      },
      {
        id: 'crit-1-e4',
        type: 'elective',
        title: 'Tham luận / Giải thưởng Mác - Lênin, Tư tưởng HCM',
        detail: 'Có tham luận, bài viết trình bày tại diễn đàn học thuật hoặc đạt thành tích cao tại cuộc thi cấp Trường trở lên về Mác-Lênin, Tư tưởng Hồ Chí Minh, Lịch sử văn hóa VN.'
      },
      {
        id: 'crit-1-e5',
        type: 'elective',
        title: 'Hoạt động giáo dục truyền thống yêu nước',
        detail: 'Tham quan di tích lịch sử, bảo tàng; thăm hỏi Mẹ VNAH; thắp nến tri ân anh hùng liệt sĩ; hát ca khúc truyền thống; hoạt động hướng về biên giới hải đảo.'
      },
      {
        id: 'crit-1-e6',
        type: 'elective',
        title: 'Hoạt động giáo dục đạo đức lối sống & an ninh',
        detail: 'Tham gia an ninh xung kích; tham gia hoạt động tuyên truyền về pháp luật, kiến thức phòng tránh các tệ nạn xã hội.'
      }
    ]
  },
  {
    id: 'crit-2',
    name: 'Học tập tốt',
    description: 'Điểm trung bình chung học tập cả năm đạt từ 8.5/10 trở lên; Không gian lận thi cử; Đạt thêm ít nhất 02 tiêu chí về NCKH và học thuật.',
    iconName: 'GraduationCap',
    requiredCount: 3,
    completedCount: 0,
    status: 'in_progress',
    regulationArticle: 'Điều 5.2.2 QĐ 118/QĐ-HSV',
    mandatorySummary: 'ĐTB học tập cả năm đạt từ 8.5/10 (không áp dụng hệ 4 hay thang chữ) & Động cơ học tập đúng đắn, không vi phạm quy chế thi.',
    electiveSummary: 'Đạt thêm ít nhất 02 trong 06 tiêu chí về NCKH, bài báo khoa học hoặc giải thưởng học thuật.',
    electiveMinCount: 2,
    subRequirements: [
      {
        id: 'crit-2-m1',
        type: 'mandatory',
        title: 'Điểm TB chung học tập cả năm ≥ 8.5/10',
        detail: 'Điểm trung bình chung học tập cả năm học đạt từ 8.5/10 trở lên (áp dụng hệ điểm 10, không quy đổi thang 4 hoặc thang chữ).'
      },
      {
        id: 'crit-2-m2',
        type: 'mandatory',
        title: 'Thái độ học tập đúng đắn, trung thực',
        detail: 'Có động cơ, thái độ học tập đúng đắn; không gian lận trong thi cử, không vi phạm quy chế thi.'
      },
      {
        id: 'crit-2-e1',
        type: 'elective',
        title: 'Sinh hoạt thường xuyên tại CLB học thuật AGU',
        detail: 'Tham gia sinh hoạt thường xuyên tại ít nhất 01 Câu lạc bộ học thuật trực thuộc Hội Sinh viên Trường (xem Phụ lục 1 QĐ 118).'
      },
      {
        id: 'crit-2-e2',
        type: 'elective',
        title: 'Đề tài nghiên cứu khoa học sinh viên',
        detail: 'Có đề tài NCKH từ cấp Khoa trở lên (tham gia với tư cách là chủ nhiệm đề tài hoặc thành viên) trong năm học (không tính khóa luận tốt nghiệp).'
      },
      {
        id: 'crit-2-e3',
        type: 'elective',
        title: 'Bài viết tạp chí chuyên ngành hoặc kỷ yếu hội thảo',
        detail: 'Có bài viết đăng trên tạp chí chuyên ngành hoặc bài tham luận trong kỷ yếu hội thảo khoa học chuyên ngành từ cấp Trường trở lên.'
      },
      {
        id: 'crit-2-e4',
        type: 'elective',
        title: 'Sản phẩm sáng tạo / Sở hữu trí tuệ',
        detail: 'Có sản phẩm sáng tạo được cấp bằng sáng chế, cấp giấy phép xuất bản hoặc đạt các giải thưởng khoa học từ cấp Trường trở lên.'
      },
      {
        id: 'crit-2-e5',
        type: 'elective',
        title: 'Đội tuyển Khoa thi học thuật cấp Trường',
        detail: 'Là thành viên các đội tuyển Khoa tham gia và đạt giải tại các kỳ thi học thuật cấp Trường trở lên.'
      },
      {
        id: 'crit-2-e6',
        type: 'elective',
        title: 'Đạt giải thưởng cuộc thi học thuật cấp Khoa trở lên',
        detail: 'Đạt giải thưởng trong các cuộc thi học thuật do cấp Khoa trở lên tổ chức.'
      }
    ]
  },
  {
    id: 'crit-3',
    name: 'Thể lực tốt',
    description: 'Đạt danh hiệu "Sinh viên khỏe" / "Thanh niên khỏe" cấp Trường hoặc đạt giải thi đấu thể dục thể thao từ cấp Trường trở lên.',
    iconName: 'Activity',
    requiredCount: 1,
    completedCount: 0,
    status: 'in_progress',
    regulationArticle: 'Điều 5.2.3 QĐ 118/QĐ-HSV',
    mandatorySummary: 'Đạt ít nhất 01 trong 03 tiêu chí về thể lực hoặc giải thi đấu thể thao cấp Trường.',
    electiveSummary: 'Tham gia sát hạch thể lực hoặc thi đấu TDTT đạt chuẩn.',
    electiveMinCount: 1,
    specialNote: 'Sinh viên khuyết tật không bắt buộc xét tiêu chuẩn về thể lực (cần bổ sung giấy chứng nhận/xác nhận khuyết tật khi xét).',
    subRequirements: [
      {
        id: 'crit-3-e1',
        type: 'elective',
        title: 'Danh hiệu "Sinh viên khỏe" / "Thanh niên khỏe"',
        detail: 'Tham gia các hoạt động sát hạch thể lực và đạt danh hiệu "Sinh viên khỏe" hoặc "Thanh niên khỏe" cấp Trường (do BTK Hội Sinh viên Trường công nhận).'
      },
      {
        id: 'crit-3-e2',
        type: 'elective',
        title: 'Đạt giải tại các giải thể thao cấp Trường trở lên',
        detail: 'Tham gia và đạt giải tại các giải thi đấu thể dục thể thao từ cấp Trường trở lên.'
      },
      {
        id: 'crit-3-e3',
        type: 'elective',
        title: 'Thành viên đội tuyển thể thao cấp Trường trở lên',
        detail: 'Là thành viên đội tuyển cấp Trường trở lên tham gia dự thi các môn TDTT cấp Tỉnh, Đại học Quốc gia, Khu vực...'
      }
    ]
  },
  {
    id: 'crit-4',
    name: 'Tình nguyện tốt',
    description: 'Tham gia ít nhất 05 ngày tình nguyện/năm học (tính cộng dồn thực tế), bắt buộc có giấy chứng nhận/xác nhận từ đơn vị tổ chức.',
    iconName: 'HeartHandshake',
    requiredCount: 5,
    completedCount: 0,
    status: 'in_progress',
    regulationArticle: 'Điều 5.2.4 QĐ 118/QĐ-HSV',
    mandatorySummary: 'Tham gia ít nhất 05 ngày tình nguyện/năm học (được tính theo số ngày thực tế tham gia các hoạt động tình nguyện cộng dồn).',
    electiveSummary: 'Mỗi hoạt động tình nguyện trực tiếp có giấy chứng nhận/xác nhận sẽ tích lũy số ngày tương ứng.',
    electiveMinCount: 5,
    specialNote: 'Bắt buộc có giấy chứng nhận hoặc xác nhận của đơn vị tổ chức. Các hoạt động mang tính chất quyên góp hiện vật, hiện kim mà không tham gia trực tiếp sẽ không được tính.',
    subRequirements: [
      {
        id: 'crit-4-e1',
        type: 'elective',
        title: 'Chiến dịch Tiếp sức mùa thi / Mùa hè xanh / Tình nguyện',
        detail: 'Tham gia theo số ngày thực tế được đơn vị tổ chức cấp giấy chứng nhận/xác nhận.'
      },
      {
        id: 'crit-4-e2',
        type: 'elective',
        title: 'Hiến máu nhân đạo vì cộng đồng',
        detail: 'Tham gia 01 lần hiến máu nhân đạo tình nguyện được tính tương đương 01 ngày hoạt động tình nguyện.'
      },
      {
        id: 'crit-4-e3',
        type: 'elective',
        title: 'Ngày hội Chủ nhật xanh / Bảo vệ môi trường',
        detail: 'Tham gia 01 ngày tình nguyện Chủ nhật xanh, dọn dẹp vệ sinh khuôn viên trường lớp, trồng cây xanh.'
      },
      {
        id: 'crit-4-e4',
        type: 'elective',
        title: 'Đón Tân sinh viên / Hỗ trợ sinh viên đầu khóa',
        detail: 'Tham gia 01 ngày tình nguyện đón tiếp và hỗ trợ tân sinh viên nhập học.'
      },
      {
        id: 'crit-4-e5',
        type: 'elective',
        title: 'Tình nguyện xây dựng Nông thôn mới / An sinh xã hội',
        detail: 'Tham gia các hoạt động tình nguyện xây dựng nông thôn mới, chuyển đổi số cộng đồng tại các địa phương.'
      }
    ]
  },
  {
    id: 'crit-5',
    name: 'Hội nhập tốt',
    description: 'Đạt chuẩn Ngoại ngữ B1 CEFR + Đạt 02 tiêu chí Kỹ năng (CLB Đọc sách STT 14 Phụ lục 1) + Đạt 01 hoạt động Hội nhập quốc tế.',
    iconName: 'Globe',
    requiredCount: 4,
    completedCount: 0,
    status: 'in_progress',
    regulationArticle: 'Điều 5.2.5 QĐ 118/QĐ-HSV',
    mandatorySummary: 'Chứng chỉ tiếng Anh B1 CEFR hoặc tương đương & 02 tiêu chí Kỹ năng thực hành xã hội & 01 tiêu chí Hoạt động hội nhập.',
    electiveSummary: 'Kết hợp hài hòa giữa Ngoại ngữ chuẩn hóa, Kỹ năng thực hành xã hội và Hoạt động giao lưu hội nhập.',
    electiveMinCount: 4,
    specialNote: 'Đặc biệt: Tham gia sinh hoạt thường xuyên tại CLB Đọc & Giới thiệu sách (STT 14 - Phụ lục 1) được công nhận trực tiếp là 01 tiêu chí Kỹ năng!',
    subRequirements: [
      {
        id: 'crit-5-nn1',
        type: 'mandatory',
        category: 'Ngoại ngữ',
        title: 'Chứng chỉ tiếng Anh B1 CEFR hoặc tương đương',
        detail: 'Đạt chứng chỉ tiếng Anh trình độ B1 (theo khung tham chiếu châu Âu) hoặc tương đương (IELTS, TOEFL, TOEIC...) hoặc ngoại ngữ 2 (với SV chuyên ngữ).'
      },
      {
        id: 'crit-5-kn1',
        type: 'elective',
        category: 'Kỹ năng',
        title: 'Hoàn thành khóa kỹ năng thực hành xã hội (Phụ lục 2)',
        detail: 'Tham gia và hoàn thành ít nhất 01 khóa trang bị kỹ năng thực hành xã hội từ cấp Khoa trở lên tổ chức.'
      },
      {
        id: 'crit-5-kn2',
        type: 'elective',
        category: 'Kỹ năng',
        title: 'Đạt giải hoặc làm báo cáo viên lớp kỹ năng',
        detail: 'Đạt giải tại các cuộc thi về kỹ năng hoặc là báo cáo viên các lớp kỹ năng từ cấp Khoa trở lên.'
      },
      {
        id: 'crit-5-kn3',
        type: 'elective',
        category: 'Kỹ năng',
        title: 'Sinh hoạt tại CLB Đọc & Giới thiệu sách (STT 14 Phụ lục 1)',
        detail: 'Tham gia sinh hoạt thường xuyên tại CLB Đọc và Giới thiệu sách - CLB Kỹ năng trực thuộc Hội Sinh viên AGU.'
      },
      {
        id: 'crit-5-hn1',
        type: 'elective',
        category: 'Hội nhập',
        title: 'Tham gia hoạt động hội nhập cấp Trường trở lên',
        detail: 'Tham gia ít nhất 01 hoạt động hội nhập do cấp Trường trở lên tổ chức.'
      },
      {
        id: 'crit-5-hn2',
        type: 'elective',
        category: 'Hội nhập',
        title: 'Giao lưu quốc tế / Hội thảo khoa học quốc tế',
        detail: 'Tham gia ít nhất 01 hoạt động giao lưu quốc tế: hội nghị, hội thảo quốc tế, gặp gỡ giao lưu với thanh niên sinh viên quốc tế.'
      },
      {
        id: 'crit-5-hn3',
        type: 'elective',
        category: 'Hội nhập',
        title: 'Giải cuộc thi kiến thức hội nhập / ngoại ngữ',
        detail: 'Tham gia và đạt giải tại các cuộc thi về kiến thức hội nhập hoặc các cuộc thi học thuật bằng ngoại ngữ từ cấp Khoa trở lên.'
      }
    ]
  }
];

export const INITIAL_S5T_PROOFS: S5TProof[] = [];

export const INITIAL_CONFIDENTIAL_REPORTS: ConfidentialReport[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const DEPARTMENTS_DATA: ClubDepartment[] = [
  {
    id: 'Truyền thông',
    name: 'Ban Truyền Thông (Media & PR)',
    lead: 'Chưa bổ nhiệm',
    leadNickname: '',
    leadTitle: 'Trưởng Ban Truyền Thông',
    leadAvatar: '/assets/aistudio/TUYE__N_THA_NH_VIE_N_778c37b9.png',
    leadContact: 'Đang cập nhật',
    memberCount: 0,
    mission: 'Chịu trách nhiệm quản lý Fanpage CLB, biên tập ấn phẩm E-News định kỳ, thiết kế poster sự kiện, chụp ảnh Locket lưu giữ khoảnh khắc thanh xuân.',
    color: '#3B6E47',
    badges: ['E-News Editor', 'Visual Master', 'Viral Content']
  },
  {
    id: 'Nội dung',
    name: 'Ban Nội Dung',
    lead: 'Chưa bổ nhiệm',
    leadNickname: '',
    leadTitle: 'Trưởng Ban Nội Dung',
    leadAvatar: '/assets/aistudio/TUYE__N_THA_NH_VIE_N_778c37b9.png',
    leadContact: 'Đang cập nhật',
    memberCount: 0,
    mission: 'Tuyển chọn đầu sách chất lượng, soạn thảo kịch bản các buổi sinh hoạt chuyên đề, xây dựng câu hỏi đàm đạo văn học, cùng Ban Kế Hoạch đưa ra định hướng sách của CLB.',
    color: '#C88A36',
    badges: ['Sách & Tri Thức', 'Kịch Bản Sinh Hoạt', 'Đại Sứ Văn Hóa Đọc']
  },
  {
    id: 'Nhân sự & Kế hoạch',
    name: 'Ban Nhân Sự & Kế Hoạch',
    lead: 'Chưa bổ nhiệm',
    leadNickname: '',
    leadTitle: 'Trưởng Ban Nhân Sự & Kế Hoạch',
    leadAvatar: '/assets/aistudio/TUYE__N_THA_NH_VIE_N_778c37b9.png',
    leadContact: 'Đang cập nhật',
    memberCount: 0,
    mission: 'Ban trọng yếu! Trực tiếp cùng BCN và Ban Nội Dung lên kế hoạch hành động toàn diện, phân bổ nhân sự, theo dõi điểm danh chuỗi đọc sách, quản lý hồ sơ xét Sinh viên 5 tốt.',
    color: '#8D5B8C',
    badges: ['Kế Hoạch Chiến Lược', 'Điều Phối Nhân Lực', 'Hồ Sơ S5T Chuẩn']
  },
  {
    id: 'Hậu cần',
    name: 'Ban Hậu Cần & Tủ Sách',
    lead: 'Chưa bổ nhiệm',
    leadNickname: '',
    leadTitle: 'Trưởng Ban Hậu Cần',
    leadAvatar: '/assets/aistudio/TUYE__N_THA_NH_VIE_N_778c37b9.png',
    leadContact: 'Đang cập nhật',
    memberCount: 0,
    mission: 'Quản lý kho sách, mã số hóa thẻ mượn sách tầng 3 Thư viện, chuẩn bị âm thanh, máy chiếu, teabreak và quà tặng lưu niệm trong mọi sự kiện.',
    color: '#4B7B94',
    badges: ['Tủ Sách Thư Viện', 'Âm Thanh Ánh Sáng', 'Thủ Kho Đắc Lực']
  }
];

export const INITIAL_PLANS: ClubPlan[] = [];

export const INITIAL_TASKS: ClubTask[] = [];

export const INITIAL_DECREES: ClubDecree[] = [];

import React, { useState } from 'react';
import { 
  Flame, 
  Sparkles, 
  BookOpen, 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  PlusCircle, 
  Camera, 
  Send, 
  Calendar, 
  Clock, 
  Tag, 
  MapPin, 
  X, 
  CheckCircle2, 
  Feather,
  Smile,
  BookMarked,
  Upload,
  Image as ImageIcon,
  Trash2,
  Quote,
  Edit3,
  Crown,
  Compass,
  Search
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Post, LocketMoment, UserProfile, DepartmentType, AnnualTheme } from '../types';
import { readFileAsDataUrl } from '../utils/imageUpload';
import { isMasterRootUser, isClubPresidentUser, isClubVicePresidentUser } from '../utils/governance';

interface NewfeedSectionProps {
  currentUser: UserProfile;
  isBcnMode?: boolean;
  posts: Post[];
  locketMoments: LocketMoment[];
  annualTheme?: AnnualTheme;
  onUpdateAnnualTheme?: (newTheme: AnnualTheme) => void;
  onLikePost: (postId: string) => void;
  onReactLocket: (locketId: string) => void;
  onAddPost: (newPost: Omit<Post, 'id' | 'createdAt' | 'likes' | 'commentsCount'>) => void;
  onAddLocket: (newMoment: Omit<LocketMoment, 'id' | 'timestamp' | 'reactions'>) => void;
  onDeletePost?: (postId: string) => void;
  onDeleteLocket?: (locketId: string) => void;
  onCheckIn: () => void;
  onIncreaseReadingStreak?: () => void;
  onAddComment?: (postId: string, comment: { author: string; avatar: string; text: string; time: string }) => void;
}

export const NewfeedSection: React.FC<NewfeedSectionProps> = ({
  currentUser,
  isBcnMode = false,
  posts,
  locketMoments,
  annualTheme,
  onUpdateAnnualTheme,
  onLikePost,
  onReactLocket,
  onAddPost,
  onAddLocket,
  onDeletePost,
  onDeleteLocket,
  onCheckIn,
  onIncreaseReadingStreak,
  onAddComment
}) => {
  const isPresident = isClubPresidentUser(currentUser);
  const isVicePresident = isClubVicePresidentUser(currentUser);
  const isRoot = isMasterRootUser(currentUser);
  const canEditAnnualTheme = isPresident || isVicePresident || isRoot || isBcnMode;
  const todayStr = new Date().toLocaleDateString('vi-VN');
  const isCheckedInToday = currentUser.lastCheckInDate === todayStr;
  const isBcnAdmin = isBcnMode || currentUser.role === 'bcn_admin' || currentUser.adminType === 'master_root';

  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isLocketModalOpen, setIsLocketModalOpen] = useState(false);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<string[]>([]);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentsList, setCommentsList] = useState<Record<string, { author: string; avatar: string; text: string; time: string }[]>>({});

  // Floating heart animation triggers
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; postId: string; x: number; y: number }[]>([]);

  // Annual Theme states
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [themeTextInput, setThemeTextInput] = useState(
    annualTheme?.theme || 'Định vị tư duy, bản lĩnh tri thức — Khơi nguồn cảm hứng đọc sinh viên AGU'
  );
  const [themeYearInput, setThemeYearInput] = useState(annualTheme?.year || '2026 - 2027');

  // Daily Quotes for Book Club
  const DAILY_QUOTES = [
    { text: "Sách là ngọn đèn bất diệt soi sáng bước đường tri thức của mỗi sinh viên.", author: "CLB Đọc và Giới thiệu sách AGU" },
    { text: "Đọc sách không chỉ là nạp kiến thức, mà là học cách lắng nghe và thấu hiểu cuộc đời.", author: "Văn hóa đọc AGU" },
    { text: "Một cuốn sách hay giống như một người bạn tri kỷ, mở ra là niềm vui, khép lại là bài học.", author: "Trần Đăng Khoa" },
    { text: "Định vị tư duy, bản lĩnh tri thức — Mỗi ngày 15 trang sách kiến tạo nên tương lai.", author: "Bản tin E-News AGU" },
    { text: "Không có con tàu nào đưa ta đi xa bằng một trang sách mở.", author: "Emily Dickinson" },
    { text: "Đọc một trang sách, gieo một hạt giống nhân ái giữa lòng An Giang.", author: "Góc Sách AGU" },
    { text: "Sách mở ra những chân trời bao la, nơi sinh viên tìm thấy ngọn lửa đam mê.", author: "Đoàn - Hội Sinh Viên AGU" }
  ];
  const dailyQuote = DAILY_QUOTES[new Date().getDate() % DAILY_QUOTES.length];

  // Book Review Form states (Bắt buộc đọc sách để giữ Chuỗi Đọc Sách)
  const [isBookReviewModalOpen, setIsBookReviewModalOpen] = useState(false);
  const [reviewBookTitle, setReviewBookTitle] = useState('');
  const [reviewBookAuthor, setReviewBookAuthor] = useState('');
  const [reviewPagesRead, setReviewPagesRead] = useState('Trang 30 đến trang 75');
  const [reviewTakeaway, setReviewTakeaway] = useState('');
  const [reviewContent, setReviewContent] = useState('');

  // Form states for general new post
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'E-News' | 'Tản văn' | 'Góc Sách AGU' | 'Điểm Tin Tuần' | 'Phóng Sự CLB' | 'Cảm Nhận Sách'>('E-News');
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newExcerpt, setNewExcerpt] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCover, setNewCover] = useState('https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80');
  const [newTags, setNewTags] = useState('AGUBookClub, SachHay, ENews');

  // Form states for new locket
  const [newLocketCaption, setNewLocketCaption] = useState('');
  const [newLocketLocation, setNewLocketLocation] = useState('Tầng 3 Thư viện AGU');
  const [newLocketImage, setNewLocketImage] = useState('https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600&auto=format&fit=crop&q=80');

  // Literary Compass & Mood Inspirations
  const LITERARY_MOODS = [
    {
      id: 'mindset',
      label: 'Khai Phóng & Tư Duy',
      icon: '🏛️',
      motto: 'Rèn luyện tư duy phản biện, làm chủ góc nhìn khoa học và bản lĩnh tri thức sinh viên.',
      recommendation: 'Tư Duy Nhanh Và Chậm · Khuyến Học · Nghệ Thuật Tư Duy Rành Mạch',
      color: '#245351',
      bg: '#EAF2EF'
    },
    {
      id: 'soul',
      label: 'Tâm Hồn & Chiêm Nghiệm',
      icon: '🌿',
      motto: 'Lắng đọng những khoảng lặng giữa nhịp sống, trân quý từng rung cảm chân thành của người trẻ.',
      recommendation: 'Hoàng Tử Bé · Cây Cam Ngọt Của Tôi · Để Gió Cuốn Đi',
      color: '#C8532B',
      bg: '#FDF1EC'
    },
    {
      id: 'heritage',
      label: 'Đất & Người Phương Nam',
      icon: '📜',
      motto: 'Tình yêu quê hương An Giang, nét đẹp văn hóa Thất Sơn và nghĩa tình phù sa sông Hậu.',
      recommendation: 'Hương Rừng Cà Mau · Nét Đẹp Đất An Giang · Ký Ức Miền Tây',
      color: '#8C3B1E',
      bg: '#F9EFE9'
    },
    {
      id: 'growth',
      label: 'Hành Động & Thói Quen',
      icon: '💡',
      motto: 'Mỗi ngày tích lũy 1% tiến bộ từ 15 trang sách, kiên định trên hành trình giữ vững chuỗi.',
      recommendation: 'Atomic Habits · Sức Mạnh Của Thói Quen · Tuổi Trẻ Đáng Giá Bao Nhiêu',
      color: '#9C6F19',
      bg: '#FFF8EB'
    },
    {
      id: 'creativity',
      label: 'Khát Vọng & Sáng Tạo',
      icon: '🚀',
      motto: 'Dám mơ lớn, dấn thân phụng sự cộng đồng sinh viên AGU và kiên định mở lối đi riêng.',
      recommendation: 'Bắt Đầu Với Câu Hỏi Tại Sao · Khởi Nghiệp Tinh Gọn · Dám Ước Mơ',
      color: '#382215',
      bg: '#F2E5C9'
    }
  ];
  const [selectedMoodId, setSelectedMoodId] = useState<string>('mindset');
  const activeMood = LITERARY_MOODS.find(m => m.id === selectedMoodId) || LITERARY_MOODS[0];

  const [feedSearchQuery, setFeedSearchQuery] = useState('');
  const categories = ['Tất cả', 'Cảm Nhận Sách', 'E-News', 'Tản văn', 'Góc Sách AGU', 'Phóng Sự CLB'];

  const filteredPosts = posts.filter(p => {
    const matchesCategory = selectedCategory === 'Tất cả' || p.category === selectedCategory;
    if (!matchesCategory) return false;
    if (!feedSearchQuery.trim()) return true;
    const q = feedSearchQuery.toLowerCase().trim();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.bookTitle && p.bookTitle.toLowerCase().includes(q)) ||
      (p.bookAuthor && p.bookAuthor.toLowerCase().includes(q)) ||
      p.content.toLowerCase().includes(q) ||
      p.excerpt.toLowerCase().includes(q) ||
      p.authorName.toLowerCase().includes(q) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
    );
  });

  const triggerLike = (e: React.MouseEvent, postId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const newId = Date.now();
    setFloatingHearts(prev => [...prev, { id: newId, postId, x: rect.left + 20, y: rect.top - 10 }]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== newId));
    }, 1000);
    onLikePost(postId);
  };

  const toggleBookmark = (postId: string) => {
    setBookmarkedPosts(prev => 
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    );
  };

  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    const newComment = {
      author: currentUser.name,
      avatar: currentUser.avatar,
      text,
      time: 'Vừa xong'
    };

    setCommentsList(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newComment]
    }));

    if (onAddComment) {
      onAddComment(postId, newComment);
    }

    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    onAddPost({
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      authorRole: currentUser.position,
      authorDept: currentUser.department,
      title: newTitle,
      bookTitle: newBookTitle || undefined,
      bookAuthor: newBookAuthor || undefined,
      category: newCategory,
      excerpt: newExcerpt || newContent.slice(0, 140) + '...',
      content: newContent,
      coverImage: newCover,
      tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
      readingTimeMinutes: Math.max(2, Math.ceil(newContent.split(' ').length / 150))
    });

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 }
    });

    setIsPostModalOpen(false);
    setNewTitle('');
    setNewContent('');
    setNewExcerpt('');
    setNewBookTitle('');
  };

  const handleCreateLocket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocketCaption.trim()) return;

    onAddLocket({
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      department: currentUser.department,
      caption: newLocketCaption,
      location: newLocketLocation,
      imageUrl: newLocketImage
    });

    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.5 }
    });

    setIsLocketModalOpen(false);
    setNewLocketCaption('');
  };

  const handleCreateBookReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBookTitle.trim() || !reviewContent.trim()) return;

    onAddPost({
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorNickname: currentUser.nickname,
      authorAvatar: currentUser.avatar,
      authorRole: currentUser.position,
      authorDept: currentUser.department,
      title: `[Cảm Nhận Sách] ${reviewBookTitle.trim()}`,
      bookTitle: reviewBookTitle.trim(),
      bookAuthor: reviewBookAuthor.trim() || undefined,
      bookPagesRead: reviewPagesRead.trim() || undefined,
      bookTakeaway: reviewTakeaway.trim() || undefined,
      isBookReview: true,
      category: 'Cảm Nhận Sách',
      excerpt: reviewTakeaway.trim() || reviewContent.slice(0, 140) + '...',
      content: `${reviewPagesRead ? `📖 **Tiến độ đọc hôm nay:** ${reviewPagesRead}\n\n` : ''}${reviewTakeaway ? `💡 **Bài học đúc kết tâm đắc:** ${reviewTakeaway}\n\n` : ''}${reviewContent}`,
      coverImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80',
      tags: ['CamNhanSach', 'ChuoiDocSach', 'AGUBookClub'],
      readingTimeMinutes: 3
    });

    if (onIncreaseReadingStreak) {
      onIncreaseReadingStreak();
    }

    confetti({
      particleCount: 85,
      spread: 70,
      origin: { y: 0.5 },
      colors: ['#245351', '#E5A140', '#C8532B', '#FFFDF7']
    });

    setIsBookReviewModalOpen(false);
    setReviewBookTitle('');
    setReviewBookAuthor('');
    setReviewTakeaway('');
    setReviewContent('');
  };

  const handleSaveAnnualTheme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!themeTextInput.trim()) return;

    if (onUpdateAnnualTheme) {
      onUpdateAnnualTheme({
        theme: themeTextInput.trim(),
        year: themeYearInput.trim() || '2026 - 2027',
        setBy: currentUser.name,
        setAt: new Date().toLocaleDateString('vi-VN')
      });
    }

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.3 }
    });

    setIsThemeModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Floating Animated Hearts */}
      {floatingHearts.map(h => (
        <div
          key={h.id}
          className="fixed z-50 pointer-events-none animate-float-heart text-rose-500 font-bold"
          style={{ left: h.x, top: h.y }}
        >
          ❤️ +1
        </div>
      ))}

      {/* Top Banner: AGU Book Club Official Header, Annual Theme & Personal Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Welcome & Literary Poster Hero Banner */}
        <div className="lg:col-span-2 rounded-3xl p-6 sm:p-8 relative overflow-hidden bg-[#FAF3E3] border-3 border-[#382215] shadow-[6px_6px_0px_#382215] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative z-10 flex-1 space-y-3.5">
            {/* Bộ ba Logo truyền thống trang trọng không bị tràn chữ */}
            <div className="flex items-center gap-4">
              <div className="relative group cursor-pointer">
                <img
                  src="/assets/aistudio/TUYE__N_THA_NH_VIE_N_778c37b9.png"
                  alt="Bộ ba Biểu Trưng: Trường Đại Học An Giang - Hội Sinh Viên - CLB Sách AGU"
                  className="h-16 sm:h-20 w-auto object-contain rounded-2xl shrink-0 border-2 border-[#382215] shadow-[3px_3px_0px_#382215] bg-white/60 p-1 group-hover:scale-105 transition-transform"
                />
                <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-[#E5A140] border border-[#382215] text-[9px] font-black uppercase text-[#382215] shadow-[1px_1px_0px_#382215]">
                  Est. 2023
                </span>
              </div>
              <div className="space-y-0.5">
                <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#8C3B1E] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#E5A140]" />
                  <span>KHÔNG GIAN TRI THỨC SỐ</span>
                </div>
                <div className="text-xs sm:text-sm font-black text-[#245351] uppercase tracking-wide">
                  Tuyển Tập Điểm Sách · Tản Văn · Bản Tin E-News
                </div>
              </div>
            </div>

            {/* Chủ đề năm (Annual Theme) - Cố định hiển thị trang trọng cho toàn bộ CLB */}
            <div className="p-4 rounded-2xl bg-[#F2E5C9] border-2 border-[#382215] space-y-1.5 relative shadow-[3px_3px_0px_#382215]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#C8532B] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#E5A140]" />
                  <span>CHỦ ĐỀ NĂM ({annualTheme?.year || '2026 - 2027'})</span>
                </span>
                {canEditAnnualTheme && (
                  <button
                    type="button"
                    onClick={() => {
                      setThemeTextInput(annualTheme?.theme || 'Định vị tư duy, bản lĩnh tri thức — Khơi nguồn cảm hứng đọc sinh viên AGU');
                      setThemeYearInput(annualTheme?.year || '2026 - 2027');
                      setIsThemeModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#C8532B] hover:bg-[#A83E1B] text-white text-[10px] font-black flex items-center gap-1 cursor-pointer transition border border-[#382215] shadow-[2px_2px_0px_#382215] active:translate-x-[1px] active:translate-y-[1px]"
                    title="Chủ nhiệm & Phó Chủ nhiệm đặt hoặc sửa Chủ đề năm của CLB"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Sửa Chủ Đề Năm</span>
                  </button>
                )}
              </div>
              <p className="text-xs sm:text-sm font-bold text-[#382215] font-serif-vintage italic leading-snug">
                "{annualTheme?.theme || 'Định vị tư duy, bản lĩnh tri thức — Khơi nguồn cảm hứng đọc sinh viên AGU'}"
              </p>
            </div>

            {/* Quote of the Day */}
            <div className="flex items-start gap-2.5 bg-[#FFFDF8] p-3.5 rounded-2xl border-2 border-[#382215]/30 text-xs text-[#382215] leading-relaxed shadow-[2px_2px_0px_#382215]">
              <Quote className="w-4 h-4 text-[#C8532B] shrink-0 mt-0.5" />
              <div>
                <span className="font-serif-vintage italic text-[#4A3525]">"{dailyQuote.text}"</span>
                <span className="text-[10px] font-bold text-[#8C3B1E] block mt-0.5">— {dailyQuote.author}</span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsBookReviewModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#245351] hover:bg-[#1B403E] text-white text-xs font-black flex items-center gap-1.5 shadow-[3px_3px_0px_#382215] cursor-pointer border-2 border-[#382215] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#382215] transition-all"
              >
                <BookMarked className="w-4 h-4 text-[#FFE29A]" />
                <span>Viết Cảm Nhận Sách (Giữ Chuỗi 📖)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPostModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-[#C8532B] hover:bg-[#A63E1B] text-[#FFFDF7] text-xs font-bold flex items-center gap-1.5 shadow-[3px_3px_0px_#382215] cursor-pointer border-2 border-[#382215] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#382215] transition-all"
              >
                <PlusCircle className="w-4 h-4 text-[#FFE29A]" />
                <span>Viết Bài E-News / Tản Văn</span>
              </button>

              <button
                type="button"
                onClick={() => setIsLocketModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-[#F2E5C9] hover:bg-[#EAD8B3] text-[#382215] border-2 border-[#382215] text-xs font-bold flex items-center gap-1.5 shadow-[3px_3px_0px_#382215] cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#382215] transition-all"
              >
                <Camera className="w-4 h-4 text-[#C8532B]" />
                <span>Đăng Locket (+15 Điểm)</span>
              </button>
            </div>
          </div>

          {/* Right Side: Logged-in User Profile Card replacing the old graphic */}
          <div className="w-full md:w-56 shrink-0 rounded-3xl border-3 border-[#382215] shadow-[5px_5px_0px_#382215] bg-[#F2E5C9] p-4 text-center space-y-3">
            <div className="relative mx-auto w-20 h-20 rounded-2xl overflow-hidden border-2.5 border-[#382215] shadow-xs">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="font-black text-sm text-[#382215] font-serif-vintage truncate">
                {currentUser.name}
              </div>
              {currentUser.nickname && (
                <div className="text-[11px] font-bold text-[#C8532B] italic truncate">
                  "{currentUser.nickname}"
                </div>
              )}
              <div className="text-[11px] text-[#6E472B] font-semibold mt-0.5">
                {currentUser.studentId} · {currentUser.faculty}
              </div>
              <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded-lg bg-[#FAF3E3] border-2 border-[#382215] text-[10px] font-black text-[#245351] shadow-[2px_2px_0px_#382215]">
                {currentUser.position || `Ban ${currentUser.department}`}
              </div>
            </div>
          </div>
        </div>

        {/* Streak Tracker Card in Warm Sand & Terracotta */}
        <div className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] shadow-[6px_6px_0px_#382215] bg-[#FAF3E3] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#382215]/20">
              <div className="flex items-center gap-2 text-[#382215] font-black text-base font-serif-vintage">
                <Flame className="w-5 h-5 text-[#C8532B] fill-[#C8532B]" />
                <span>Hệ Thống Chuỗi Hoạt Động</span>
              </div>
              <span className="text-xs font-bold text-[#8C3B1E]">
                {todayStr}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-4">
              {/* Chuỗi Đọc Sách Thật Sự (Cần Viết Cảm Nhận Sách) */}
              <div className="p-4 bg-[#F2E5C9] rounded-2xl border-2 border-[#382215] text-center shadow-[3px_3px_0px_#382215]">
                <div className="flex items-center justify-center gap-1.5 text-2xl font-black text-[#C8532B] tabular-nums">
                  <Flame className="w-6 h-6 fill-[#C8532B] text-[#C8532B]" />
                  <span>{currentUser.readingStreak}</span>
                </div>
                <div className="text-xs font-black text-[#382215] mt-1">Chuỗi Đọc Sách</div>
                <div className="text-[10px] text-[#8C3B1E] font-bold mt-0.5">Viết cảm nhận sách</div>
              </div>

              {/* Chuỗi Check-in & E-News (Gộp chung: Mỗi ngày đăng nhập 1 lần) */}
              <div className="p-4 bg-[#F2E5C9] rounded-2xl border-2 border-[#382215] text-center shadow-[3px_3px_0px_#382215]">
                <div className="flex items-center justify-center gap-1.5 text-2xl font-black text-[#245351] tabular-nums">
                  <Sparkles className="w-6 h-6 text-[#245351]" />
                  <span>{currentUser.enewsStreak}</span>
                </div>
                <div className="text-xs font-black text-[#382215] mt-1">Chuỗi Check-in</div>
                <div className="text-[10px] text-[#245351] font-bold mt-0.5">Đăng nhập mỗi ngày</div>
              </div>
            </div>

            {/* Social Media Star Badge indicator */}
            {currentUser.meritPoints >= 100 && (
              <div className="p-3 rounded-2xl bg-[#245351] text-[#FFE29A] text-xs font-black flex items-center justify-center gap-2 border-2 border-[#382215] shadow-[3px_3px_0px_#382215] mb-3">
                <Crown className="w-4 h-4 text-[#FFE29A] fill-[#FFE29A]" />
                <span>Người Siêng Năng Mạng Xã Hội 🌟 ({currentUser.meritPoints} điểm)</span>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={onCheckIn}
              disabled={isCheckedInToday}
              className={`w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition border-2 border-[#382215] shadow-[4px_4px_0px_#382215] ${
                isCheckedInToday
                  ? 'bg-[#E3DEC9] text-[#486A39] cursor-default'
                  : 'bg-[#C8532B] hover:bg-[#A63E1B] text-white cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#382215]'
              }`}
            >
              {isCheckedInToday ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#486A39]" />
                  <span>Đã check-in hôm nay ({todayStr})</span>
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 fill-[#FFE29A] text-[#FFE29A]" />
                  <span>Điểm Danh Check-in Hôm Nay (+10 Điểm)</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-[#6E472B]">
              Đăng Locket khoảnh khắc làm việc để nhận <strong>+15 điểm cống hiến</strong>!
            </p>
          </div>
        </div>
      </div>

      {/* Artistic Centerpiece: La Bàn Tri Thức & 5 Luồng Cảm Hứng Đọc */}
      <div className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b-2 border-[#382215]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#245351] border-2 border-[#382215] flex items-center justify-center text-[#FFE29A] shadow-[2px_2px_0px_#382215]">
              <Compass className="w-5 h-5 text-[#FFE29A] animate-[spin_20s_linear_infinite]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-[#382215] text-base sm:text-lg font-serif-vintage">
                  La Bàn Tri Thức & 5 Chiều Kích Cảm Hứng Đọc
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#E5A140] border border-[#382215] text-[9px] font-black uppercase text-[#382215]">
                  Nghệ Thuật Đọc Sách
                </span>
              </div>
              <p className="text-xs text-[#6E472B]">
                Mỗi ngày xoay la bàn định vị một chiều kích tinh thần, bồi đắp tư duy và làm giàu vốn sống sinh viên AGU
              </p>
            </div>
          </div>
          <div className="text-[11px] font-bold text-[#8C3B1E] bg-[#F2E5C9] px-3 py-1.5 rounded-xl border border-[#382215] self-start md:self-auto">
            Khơi nguồn tri thức — Văn hóa đọc AGU
          </div>
        </div>

        {/* 5 Mood Selector Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {LITERARY_MOODS.map(mood => {
            const isSelected = mood.id === selectedMoodId;
            return (
              <button
                key={mood.id}
                type="button"
                onClick={() => {
                  setSelectedMoodId(mood.id);
                  confetti({
                    particleCount: 25,
                    spread: 45,
                    origin: { y: 0.6 },
                    colors: [mood.color, '#FAF3E3', '#E5A140']
                  });
                }}
                className={`p-3 rounded-2xl border-2 border-[#382215] text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'shadow-[4px_4px_0px_#382215] -translate-y-0.5'
                    : 'bg-[#FFFDF8] hover:bg-[#F2E5C9] shadow-[2px_2px_0px_#382215]'
                }`}
                style={{
                  backgroundColor: isSelected ? mood.bg : undefined,
                  borderColor: isSelected ? '#382215' : undefined
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{mood.icon}</span>
                  {isSelected && (
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-[#382215]"
                      style={{ backgroundColor: mood.color }}
                    />
                  )}
                </div>
                <div className="font-black text-xs text-[#382215] leading-snug">
                  {mood.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Mood Showcase Display */}
        <div
          className="p-5 sm:p-6 rounded-2xl border-2 border-[#382215] shadow-[3px_3px_0px_#382215] relative overflow-hidden transition-all duration-300"
          style={{ backgroundColor: activeMood.bg }}
        >
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">{activeMood.icon}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#8C3B1E]">
                  CHIỀU KÍCH: {activeMood.label}
                </span>
              </div>
              <p className="font-serif-vintage italic text-base sm:text-lg text-[#382215] font-bold leading-relaxed">
                "{activeMood.motto}"
              </p>
              <div className="flex items-center gap-1.5 text-xs text-[#245351] font-semibold pt-1">
                <BookOpen className="w-4 h-4 shrink-0 text-[#C8532B]" />
                <span><strong>Tác phẩm gợi ý đọc:</strong> {activeMood.recommendation}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsBookReviewModalOpen(true);
                  setReviewBookTitle(activeMood.recommendation.split('·')[0].trim());
                }}
                className="px-4 py-2.5 rounded-xl bg-[#245351] hover:bg-[#1B403E] text-white text-xs font-black flex items-center gap-1.5 border-2 border-[#382215] shadow-[2px_2px_0px_#382215] cursor-pointer active:translate-x-[1px] active:translate-y-[1px] transition"
              >
                <BookMarked className="w-3.5 h-3.5 text-[#FFE29A]" />
                <span>Viết cảm nhận sách này</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Locket Moments Reel Section */}
      <div className="rounded-3xl p-6 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F2E5C9] border-2 border-[#382215] flex items-center justify-center text-[#C8532B] shadow-[2px_2px_0px_#382215]">
              <Camera className="w-4 h-4 text-[#C8532B]" />
            </div>
            <div>
              <h3 className="font-black text-[#382215] text-sm sm:text-base font-serif-vintage">
                Locket Moments • Kỷ Niệm Thường Nhật CLB
              </h3>
              <p className="text-[11px] text-[#6E472B]">
                Những khoảnh khắc chân thực của các bạn thành viên tại Thư viện & Giảng đường AGU
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsLocketModalOpen(true)}
            className="text-xs font-black text-[#245351] hover:text-[#382215] flex items-center gap-1.5 bg-[#FFFDF8] hover:bg-[#F2E5C9] px-3.5 py-2 rounded-xl border-2 border-[#382215] shadow-[2px_2px_0px_#382215] active:translate-x-[1px] active:translate-y-[1px] transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#C8532B]" />
            <span>Thêm ảnh</span>
          </button>
        </div>

        {/* Horizontal Scroll of Moments */}
        {locketMoments.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[#FFFDF8] border-2 border-dashed border-[#382215]/30 text-xs font-bold text-[#6E472B]">
            Chưa có khoảnh khắc Locket nào được đăng tải. Hãy là người đầu tiên chia sẻ khoảnh khắc đọc sách!
          </div>
        ) : (
        <div className="flex items-stretch gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin">
          {locketMoments.map((moment) => {
            const canDeleteLocket =
              isBcnAdmin ||
              moment.authorId === currentUser.id ||
              moment.authorName.toLowerCase() === currentUser.name.toLowerCase();

            return (
              <div
                key={moment.id}
                className="w-64 shrink-0 bg-[#FFFDF8] p-3.5 rounded-2xl border-2 border-[#382215] shadow-[4px_4px_0px_#382215] hover:shadow-[6px_6px_0px_#382215] hover:-translate-y-1 transition-all group relative flex flex-col justify-between"
              >
                {/* Photo Area with polaroid look */}
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-stone-100 mb-2.5 border border-[#382215]/20">
                  <img 
                    src={moment.imageUrl} 
                    alt={moment.caption} 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold border border-white/20">
                    <MapPin className="w-2.5 h-2.5 text-[#FFE29A]" />
                    <span className="truncate max-w-[120px]">{moment.location}</span>
                  </div>

                  {canDeleteLocket && onDeleteLocket && (
                    <button
                      type="button"
                      onClick={() => onDeleteLocket(moment.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white transition cursor-pointer border border-white/20"
                      title="Xóa ảnh Locket này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Caption & Author */}
                <div className="space-y-2">
                  <p className="text-xs text-[#2B1D14] font-semibold line-clamp-2 leading-relaxed">
                    {moment.caption}
                  </p>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-[#382215]/15 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <img 
                        src={moment.authorAvatar} 
                        alt={moment.authorName} 
                        className="w-5 h-5 rounded-full object-cover border border-[#382215]"
                      />
                      <span className="font-bold text-[#382215]">{moment.authorName}</span>
                      <span className="text-[9px] text-[#6E472B]">({moment.timestamp})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onReactLocket(moment.id)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black transition cursor-pointer border border-[#382215] ${
                        moment.userReacted
                          ? 'bg-rose-100 text-rose-700 shadow-2xs'
                          : 'bg-[#FAF3E3] hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${moment.userReacted ? 'fill-rose-600 text-rose-600' : ''}`} />
                      <span>{moment.reactions}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Main Feed Section */}
      <div className="space-y-4">
        {/* Real-time Search in Bản tin chuỗi */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#8C3B1E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={feedSearchQuery}
            onChange={(e) => setFeedSearchQuery(e.target.value)}
            placeholder="Tra cứu bài viết, tên sách, tác giả, tản văn trong Bản tin chuỗi..."
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215] text-xs font-bold text-[#382215] placeholder:text-[#8C3B1E]/60 shadow-[3px_3px_0px_#382215] focus:outline-none focus:ring-2 focus:ring-[#C8532B]"
          />
          {feedSearchQuery && (
            <button
              type="button"
              onClick={() => setFeedSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C3B1E] hover:text-[#382215] cursor-pointer p-1"
              title="Xóa tìm kiếm"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap border-2 border-[#382215] ${
                  selectedCategory === cat
                    ? 'bg-[#245351] text-white shadow-[3px_3px_0px_#382215]'
                    : 'bg-[#FFFDF8] hover:bg-[#F2E5C9] text-[#382215] shadow-[2px_2px_0px_#382215]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="text-xs text-[#5C432C] font-bold">
            Hiển thị {filteredPosts.length} bài viết
          </div>
        </div>

        {/* Post List */}
        <div className="space-y-6">
          {filteredPosts.map((post) => {
            const isBookmarked = bookmarkedPosts.includes(post.id);
            const comments = (post.commentsList && post.commentsList.length > 0)
              ? post.commentsList
              : (post.comments && post.comments.length > 0)
              ? post.comments
              : (commentsList[post.id] || []);
            const isCommentsOpen = activeCommentsPostId === post.id;
            const canDeletePost =
              isBcnAdmin ||
              post.authorId === currentUser.id ||
              post.authorName.toLowerCase() === currentUser.name.toLowerCase();

            return (
              <article
                key={post.id}
                className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[5px_5px_0px_#382215] hover:shadow-[7px_7px_0px_#382215] transition-all relative space-y-4"
              >
                {/* Author row & category tag */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={post.authorAvatar} 
                      alt={post.authorName} 
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-[#5E936B]/40 shadow-2xs"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-xs sm:text-sm text-[#23432B]">
                          {post.authorName}
                        </h4>
                        {post.authorNickname && (
                          <span className="text-[11px] font-bold text-amber-700 italic">
                            ({post.authorNickname})
                          </span>
                        )}
                        <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-[#E5F0E4] text-[#2C5734] border border-[#C5DDC6]">
                          {post.authorDept}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#718B74] mt-0.5">
                        <span>{post.authorRole}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {post.createdAt}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#F3ECDD] text-[#765D30] border border-[#DECFB5]">
                      {post.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleBookmark(post.id)}
                      className={`p-2 rounded-xl transition cursor-pointer ${
                        isBookmarked 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'hover:bg-stone-200/50 text-stone-500'
                      }`}
                      title={isBookmarked ? 'Bỏ lưu' : 'Lưu bài viết'}
                    >
                      <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-600' : ''}`} />
                    </button>
                    {canDeletePost && onDeletePost && (
                      <button
                        type="button"
                        onClick={() => onDeletePost(post.id)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
                        title="Xóa bài viết này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Article Header & Book Reference */}
                <div className="space-y-2">
                  <h3 className="text-lg sm:text-xl font-extrabold text-[#1F3A24] font-serif-vintage tracking-tight leading-snug">
                    {post.title}
                  </h3>

                  {post.bookTitle && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#F0EBE0] text-[#5C4D32] text-xs font-medium border border-[#DDD3BF]">
                      <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                      <span>Tác phẩm: <strong>{post.bookTitle}</strong> {post.bookAuthor && `(Tác giả: ${post.bookAuthor})`}</span>
                    </div>
                  )}
                </div>

                {/* Cover Image if available */}
                {post.coverImage && (
                  <div className="relative aspect-[21/9] sm:aspect-[24/9] rounded-2xl overflow-hidden shadow-xs border border-[#E3DAC8]">
                    <img 
                      src={post.coverImage} 
                      alt={post.title} 
                      className="w-full h-full object-cover hover:scale-102 transition duration-500"
                    />
                    <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/60 text-white text-[11px] backdrop-blur-xs">
                      {post.readingTimeMinutes} phút đọc
                    </div>
                  </div>
                )}

                {/* Excerpt and Content */}
                <div className="space-y-3 text-xs sm:text-sm text-[#384C3C] font-reading leading-relaxed">
                  <p className="italic font-serif text-[#465E4A] bg-[#F7F4EA] p-3 rounded-2xl border-l-4 border-[#5E936B]">
                    "{post.excerpt}"
                  </p>
                  <p className="whitespace-pre-line text-[#2B3E2F]">
                    {post.content}
                  </p>
                </div>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {post.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-medium text-[#4D6D53] bg-[#E9F2E8] px-2.5 py-0.5 rounded-lg hover:bg-[#D8E9D7] cursor-pointer"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Interactive Footer: Likes, Comments, Share */}
                <div className="flex items-center justify-between pt-3 border-t border-[#E5DCBE] text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => triggerLike(e, post.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                        post.userLiked
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : 'bg-white hover:bg-rose-50 text-stone-600 border border-[#D5CBBC]'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${post.userLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{post.likes} Yêu thích</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveCommentsPostId(isCommentsOpen ? null : post.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-600 border border-[#D5CBBC] font-semibold transition cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-700" />
                      <span>{comments.length || post.commentsCount} Bình luận</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href);
                      confetti({ particleCount: 30, spread: 40, origin: { y: 0.7 } });
                    }}
                    className="p-1.5 rounded-lg hover:bg-stone-200/50 text-stone-500 flex items-center gap-1 cursor-pointer"
                    title="Chia sẻ bài viết"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs">Chia sẻ</span>
                  </button>
                </div>

                {/* Comments Expandable Box */}
                {isCommentsOpen && (
                  <div className="bg-[#F8F5EE] rounded-2xl p-4 border border-[#DFD6C3] space-y-3 animate-in fade-in duration-200">
                    <h5 className="font-bold text-xs text-[#2A442F]">
                      Thảo luận ({comments.length})
                    </h5>

                    {comments.map((c, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs">
                        <img 
                          src={c.avatar} 
                          alt={c.author} 
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-[#5E936B] shrink-0 mt-0.5" 
                        />
                        <div className="bg-white p-2.5 rounded-2xl border border-[#E3DAC8] flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#23432B]">{c.author}</span>
                            <span className="text-[10px] text-stone-400">{c.time}</span>
                          </div>
                          <p className="text-[#3A4E3E] mt-1">{c.text}</p>
                        </div>
                      </div>
                    ))}

                    {/* New Comment Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <img 
                        src={currentUser.avatar} 
                        alt={currentUser.name} 
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-[#5E936B] shrink-0" 
                      />
                      <input
                        type="text"
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                        placeholder="Để lại cảm nghĩ của bạn về bài viết..."
                        className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#D5CABB] text-xs focus:outline-none focus:ring-1 focus:ring-[#3B6E47]"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddComment(post.id)}
                        className="p-2 rounded-xl bg-[#3B6E47] hover:bg-[#2C5536] text-white cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {/* Modal: Write New E-News / Essay */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FAF7F0] rounded-3xl border-2 border-[#5E936B]/50 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-[#26472D] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Feather className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-base font-serif-vintage">
                  Đăng Bài Viết E-News & Tản Văn Mới
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPostModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#23432B] mb-1">Chuyên mục bài viết *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-2 focus:ring-[#3B6E47]"
                  >
                    <option value="E-News">Bản tin E-News</option>
                    <option value="Tản văn">Tản văn & Cảm xúc</option>
                    <option value="Góc Sách AGU">Góc Sách AGU</option>
                    <option value="Phóng Sự CLB">Phóng Sự Hoạt Động CLB</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#23432B] mb-1">Tags (phân cách bởi dấu phẩy)</label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="AGU, DocSach, TriThuc..."
                    className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-2 focus:ring-[#3B6E47]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#23432B] mb-1">Tiêu đề bài viết *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Đọc lại 'Chiếc Lá Cuối Cùng' giữa những ngày thi..."
                  className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white font-bold text-sm focus:ring-2 focus:ring-[#3B6E47]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#23432B] mb-1">Tên cuốn sách (nếu có)</label>
                  <input
                    type="text"
                    value={newBookTitle}
                    onChange={(e) => setNewBookTitle(e.target.value)}
                    placeholder="Ví dụ: Cây Cam Ngọt Của Tôi"
                    className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-2 focus:ring-[#3B6E47]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#23432B] mb-1">Tác giả cuốn sách</label>
                  <input
                    type="text"
                    value={newBookAuthor}
                    onChange={(e) => setNewBookAuthor(e.target.value)}
                    placeholder="Ví dụ: José Mauro de Vasconcelos"
                    className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-2 focus:ring-[#3B6E47]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-[#23432B]">Ảnh bìa bài viết *</label>
                  <label className="text-xs font-bold text-[#2E5839] hover:underline flex items-center gap-1 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Tải ảnh từ máy</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const b64 = await readFileAsDataUrl(file, 1200, 0.82);
                            setNewCover(b64);
                          } catch {
                            // ignore invalid image
                          }
                        }
                      }}
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={newCover.startsWith('data:') ? 'Đã tải ảnh trực tiếp từ thiết bị ✓' : newCover}
                  onChange={(e) => setNewCover(e.target.value)}
                  placeholder="Dán link ảnh URL hoặc bấm Tải ảnh từ máy ở trên..."
                  className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-2 focus:ring-[#3B6E47]"
                />
                {newCover && (
                  <div className="mt-2 aspect-[21/9] rounded-xl overflow-hidden bg-stone-100 border border-stone-200">
                    <img src={newCover} alt="Cover Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#23432B] mb-1">Trích đoạn nổi bật (Excerpt)</label>
                <input
                  type="text"
                  value={newExcerpt}
                  onChange={(e) => setNewExcerpt(e.target.value)}
                  placeholder="Một câu quote hoặc dòng tóm tắt sâu sắc..."
                  className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-2 focus:ring-[#3B6E47]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#23432B] mb-1">Nội dung chi tiết *</label>
                <textarea
                  rows={6}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Viết cảm nghĩ, bài điểm sách, hoặc chia sẻ góc nhìn của bạn..."
                  className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white font-reading text-sm focus:ring-2 focus:ring-[#3B6E47]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#DFD6C3]">
                <button
                  type="button"
                  onClick={() => setIsPostModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#2D5337] hover:bg-[#23422B] text-white font-bold bubble-3d shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Send className="w-4 h-4 text-emerald-300" />
                  <span>Xuất Bản Bài Viết</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Locket Moment */}
      {isLocketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FAF7F0] rounded-3xl border-2 border-amber-300 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-amber-700 to-amber-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-200" />
                <h3 className="font-bold text-base font-serif-vintage">
                  Đăng Locket Khoảnh Khắc CLB
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLocketModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLocket} className="p-5 space-y-4 text-xs sm:text-sm">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-[#23432B]">Ảnh khoảnh khắc Locket *</label>
                  <label className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1 cursor-pointer">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Chụp / Tải ảnh từ máy</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const b64 = await readFileAsDataUrl(file, 900, 0.85);
                            setNewLocketImage(b64);
                          } catch {
                            // ignore invalid image
                          }
                        }
                      }}
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={newLocketImage.startsWith('data:') ? 'Đã tải ảnh khoảnh khắc từ máy ✓' : newLocketImage}
                  onChange={(e) => setNewLocketImage(e.target.value)}
                  placeholder="Dán link ảnh URL hoặc bấm Chụp / Tải ảnh ở trên..."
                  className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-2 focus:ring-amber-500"
                />
                <div className="mt-2 aspect-video rounded-xl overflow-hidden bg-stone-100 border border-stone-200">
                  <img src={newLocketImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#23432B] mb-1">Địa điểm chụp tại AGU</label>
                <input
                  type="text"
                  value={newLocketLocation}
                  onChange={(e) => setNewLocketLocation(e.target.value)}
                  placeholder="Ví dụ: Tầng 3 Thư viện AGU / Bờ hồ khuôn viên mới"
                  className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-[#23432B] mb-1">Lời nhắn Locket *</label>
                <textarea
                  rows={3}
                  required
                  value={newLocketCaption}
                  onChange={(e) => setNewLocketCaption(e.target.value)}
                  placeholder="Cảm nghĩ ngắn, câu nói vui cùng đồng đội..."
                  className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#DFD6C3]">
                <button
                  type="button"
                  onClick={() => setIsLocketModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold bubble-3d shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Đăng Locket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Đặt / Chỉnh Sửa Chủ Đề Năm (Chỉ Chủ nhiệm & Phó Chủ nhiệm) */}
      {isThemeModalOpen && (
        <div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#FAF3E3] rounded-2xl border-3 border-[#382215] shadow-[6px_6px_0px_#382215] max-w-lg w-full overflow-hidden">
            <div className="bg-[#C8532B] text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-[#382215]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FAF3E3] text-[#C8532B] flex items-center justify-center font-black">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#FAF3E3] text-[#C8532B] border border-[#382215]">
                    QUYỀN HẠN BAN CHỦ NHIỆM
                  </span>
                  <h3 className="font-bold text-base font-serif-vintage mt-1 text-white">
                    Đặt & Cập Nhật Chủ Đề Năm
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsThemeModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAnnualTheme} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-[#F2E5C9] border border-[#382215]/20 text-[#4A3525] leading-relaxed">
                Chủ đề năm sẽ được <strong>cố định hiển thị trang trọng tại đầu trang web</strong> cho toàn bộ thành viên và khách truy cập câu lạc bộ cùng theo dõi và lan tỏa tinh thần.
              </div>

              <div>
                <label className="block font-bold text-[#382215] mb-1">
                  1. Niên Khóa / Nhiệm Kỳ *
                </label>
                <input
                  type="text"
                  required
                  value={themeYearInput}
                  onChange={(e) => setThemeYearInput(e.target.value)}
                  placeholder="Ví dụ: 2026 - 2027"
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-[#382215]/30 bg-white font-bold text-sm text-[#382215] focus:border-[#C8532B]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#382215] mb-1">
                  2. Khẩu hiệu / Chủ đề năm chính thức của CLB *
                </label>
                <textarea
                  rows={3}
                  required
                  value={themeTextInput}
                  onChange={(e) => setThemeTextInput(e.target.value)}
                  placeholder="Ví dụ: Định vị tư duy, bản lĩnh tri thức — Khơi nguồn cảm hứng đọc sinh viên AGU..."
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#382215]/30 bg-white font-bold text-xs leading-relaxed text-[#382215] focus:border-[#C8532B]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#382215]/15">
                <button
                  type="button"
                  onClick={() => setIsThemeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F2E5C9] text-[#382215] font-bold text-xs cursor-pointer border border-[#382215]/30"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C8532B] hover:bg-[#A83E1B] text-white font-black text-xs cursor-pointer shadow-[2px_2px_0px_#382215] border border-[#382215]"
                >
                  Lưu & Cố Định Chủ Đề Năm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Viết Cảm Nhận Sách (Bắt Buộc Đọc Sách Để Giữ Chuỗi Đọc Sách) */}
      {isBookReviewModalOpen && (
        <div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#FAF3E3] rounded-2xl border-3 border-[#382215] shadow-[6px_6px_0px_#382215] max-w-lg w-full max-h-[92vh] overflow-y-auto">
            <div className="bg-[#245351] text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-[#382215]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FFE29A] text-[#245351] flex items-center justify-center font-black">
                  <BookMarked className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#FAF3E3] text-[#245351] border border-[#382215]">
                    GIỮ CHUỖI ĐỌC SÁCH THỰC THỤ
                  </span>
                  <h3 className="font-bold text-base font-serif-vintage mt-1 text-white">
                    Viết Cảm Nhận Sách Hôm Nay
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBookReviewModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBookReview} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-[#F2E5C9] border border-[#382215]/20 text-[#382215] leading-relaxed">
                <strong>Quy định giữ chuỗi:</strong> Bạn cần đọc sách (tối thiểu 15 trang/ngày), ghi rõ trang đã đọc và đúc kết được điều gì. Khi gửi bài viết, bạn sẽ được <strong>+1 ngày Chuỗi Đọc Sách</strong> và nhận <strong>+25 điểm cống hiến</strong>!
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#382215] mb-1">
                    Tên Cuốn Sách *
                  </label>
                  <input
                    type="text"
                    required
                    value={reviewBookTitle}
                    onChange={(e) => setReviewBookTitle(e.target.value)}
                    placeholder="Ví dụ: Cây Cam Ngọt Của Tôi..."
                    className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-white font-bold text-xs text-[#382215]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#382215] mb-1">
                    Tác Giả
                  </label>
                  <input
                    type="text"
                    value={reviewBookAuthor}
                    onChange={(e) => setReviewBookAuthor(e.target.value)}
                    placeholder="Ví dụ: José Mauro de Vasconcelos"
                    className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-white font-medium text-xs text-[#382215]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#382215] mb-1">
                  Hôm nay bạn đọc từ trang nào đến trang nào? *
                </label>
                <input
                  type="text"
                  required
                  value={reviewPagesRead}
                  onChange={(e) => setReviewPagesRead(e.target.value)}
                  placeholder="Ví dụ: Từ trang 45 đến trang 85 (40 trang)"
                  className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-white font-bold text-xs text-[#245351]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#382215] mb-1">
                  Đúc kết / Bài học tâm đắc nhất bạn rút ra từ những trang này? *
                </label>
                <input
                  type="text"
                  required
                  value={reviewTakeaway}
                  onChange={(e) => setReviewTakeaway(e.target.value)}
                  placeholder="Ví dụ: Sự kiên nhẫn và lòng thấu cảm có thể chữa lành những vết thương vô hình..."
                  className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-white font-semibold text-xs text-[#8C3B1E]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#382215] mb-1">
                  Cảm nghĩ & Phân tích chi tiết *
                </label>
                <textarea
                  rows={4}
                  required
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  placeholder="Nêu cảm nhận của bạn về nhân vật, chi tiết ấn tượng, hoặc câu nói nào chạm tới cảm xúc của bạn..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#382215]/30 bg-white font-medium text-xs leading-relaxed text-[#382215]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#382215]/15">
                <button
                  type="button"
                  onClick={() => setIsBookReviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F2E5C9] text-[#382215] font-bold text-xs cursor-pointer border border-[#382215]/30"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#245351] hover:bg-[#1B403E] text-white font-black text-xs cursor-pointer shadow-[2px_2px_0px_#382215] border border-[#382215] flex items-center gap-1.5"
                >
                  <BookOpen className="w-4 h-4 text-[#FFE29A]" />
                  <span>Hoàn Tất & Tăng Chuỗi Đọc Sách (+1)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

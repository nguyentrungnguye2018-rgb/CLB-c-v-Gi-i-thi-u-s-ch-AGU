import React, { useState, useEffect } from 'react';
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
  Clock, 
  MapPin, 
  X, 
  CheckCircle2, 
  Feather,
  BookMarked,
  Upload,
  Trash2,
  Quote,
  Edit3,
  Crown,
  Compass,
  Search
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Post, LocketMoment, UserProfile, AnnualTheme } from '../types';
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

// Hàm chuyển đổi mốc thời gian thành chuỗi đếm tiến tự động (Vừa xong -> X phút trước -> X giờ trước -> X ngày trước)
const formatDynamicTime = (rawTime: string | number | undefined, nowMs: number): string => {
  if (!rawTime) return 'Vừa xong';

  let parsedMs = NaN;
  if (typeof rawTime === 'number') {
    parsedMs = rawTime;
  } else if (typeof rawTime === 'string') {
    const trimmed = rawTime.trim();
    if (/^\d{13}$/.test(trimmed)) {
      parsedMs = Number(trimmed);
    } else if (!Number.isNaN(Date.parse(trimmed))) {
      parsedMs = Date.parse(trimmed);
    } else {
      // Hỗ trợ định dạng Việt Nam "HH:mm dd/MM/yyyy" hoặc "dd/MM/yyyy"
      const vnMatch = trimmed.match(/^(?:(\d{1,2}):(\d{2})(?::(\d{2}))?\s+)?(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (vnMatch) {
        const [, hh = '0', mm = '0', ss = '0', day, month, year] = vnMatch;
        parsedMs = new Date(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hh),
          Number(mm),
          Number(ss)
        ).getTime();
      }
    }
  }

  if (Number.isNaN(parsedMs)) {
    return String(rawTime);
  }

  const diffSec = Math.max(0, Math.floor((nowMs - parsedMs) / 1000));
  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} ngày trước`;

  const d = new Date(parsedMs);
  return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · ${d.toLocaleDateString('vi-VN')}`;
};

export const NewfeedSection: React.FC<NewfeedSectionProps> = ({
  currentUser,
  isBcnMode = false,
  posts,
  locketMoments,
  annualTheme,
  onUpdateAnnualTheme,
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

  // Quyền tối cao xóa bài của người khác: CHỈ Chủ nhiệm CLB hoặc Tài khoản Chính CLB (bcn-root)
  const canForceDeleteAny = isPresident || isRoot || isBcnMode;

  // Đồng hồ cập nhật mỗi 30 giây để thời gian bài đăng tự động nhảy số
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Lưu trữ danh sách người đã thả tim cộng dồn theo từng tài khoản (likedBy: string[])
  const [postLikesOverride, setPostLikesOverride] = useState<Record<string, string[]>>({});
  const [locketLikesOverride, setLocketLikesOverride] = useState<Record<string, string[]>>({});
  // Lưu mốc thời gian chuẩn cho các bài viết vừa đăng trong phiên
  const [localCreatedTimestamps, setLocalCreatedTimestamps] = useState<Record<string, number>>({});

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

  // Book Review Form states
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

  // Đồng bộ dữ liệu mảng lên Firestore
  const syncCollectionToServer = async (key: 'posts' | 'locketMoments', updatedList: any[]) => {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data: updatedList })
      });
    } catch (err) {
      console.error(`Lỗi đồng bộ ${key}:`, err);
    }
  };

  // Xử lý thả tim bài viết CỘNG DỒN theo từng tài khoản
  const triggerLike = async (e: React.MouseEvent, post: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const newId = Date.now();
    setFloatingHearts(prev => [...prev, { id: newId, postId: post.id, x: rect.left + 20, y: rect.top - 10 }]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== newId));
    }, 1000);

    const existingLikedBy: string[] =
      postLikesOverride[post.id] !== undefined
        ? postLikesOverride[post.id]
        : Array.isArray(post.likedBy)
        ? post.likedBy
        : [];

    const alreadyLiked = existingLikedBy.includes(currentUser.id);
    const nextLikedBy = alreadyLiked
      ? existingLikedBy.filter((uid) => uid !== currentUser.id)
      : [...existingLikedBy, currentUser.id];

    setPostLikesOverride((prev) => ({ ...prev, [post.id]: nextLikedBy }));

    const updatedPosts = posts.map((p: any) =>
      p.id === post.id
        ? {
            ...p,
            likedBy: nextLikedBy,
            likes: nextLikedBy.length
          }
        : p
    );
    await syncCollectionToServer('posts', updatedPosts);
  };

  // Xử lý thả tim Locket CỘNG DỒN theo từng tài khoản
  const handleToggleLocketReaction = async (moment: any) => {
    const existingReactedBy: string[] =
      locketLikesOverride[moment.id] !== undefined
        ? locketLikesOverride[moment.id]
        : Array.isArray(moment.reactedBy)
        ? moment.reactedBy
        : [];

    const alreadyReacted = existingReactedBy.includes(currentUser.id);
    const nextReactedBy = alreadyReacted
      ? existingReactedBy.filter((uid) => uid !== currentUser.id)
      : [...existingReactedBy, currentUser.id];

    setLocketLikesOverride((prev) => ({ ...prev, [moment.id]: nextReactedBy }));

    const updatedLockets = locketMoments.map((m: any) =>
      m.id === moment.id
        ? {
            ...m,
            reactedBy: nextReactedBy,
            reactions: nextReactedBy.length
          }
        : m
    );
    await syncCollectionToServer('locketMoments', updatedLockets);
  };

  const toggleBookmark = (postId: string) => {
    setBookmarkedPosts(prev => 
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    );
  };

  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    const nowFormatted = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN');
    const newComment = {
      author: currentUser.name,
      avatar: currentUser.avatar,
      text,
      time: nowFormatted
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

    const nowTs = Date.now();
    const isoNow = new Date(nowTs).toISOString();

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
      readingTimeMinutes: Math.max(2, Math.ceil(newContent.split(' ').length / 150)),
      createdAt: isoNow,
      createdTimestamp: nowTs,
      likedBy: [],
      likes: 0
    } as any);

    setLocalCreatedTimestamps((prev) => ({ ...prev, [newTitle]: nowTs }));

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

    const nowTs = Date.now();
    const isoNow = new Date(nowTs).toISOString();

    onAddLocket({
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      department: currentUser.department,
      caption: newLocketCaption,
      location: newLocketLocation,
      imageUrl: newLocketImage,
      timestamp: isoNow,
      createdTimestamp: nowTs,
      reactedBy: [],
      reactions: 0
    } as any);

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

    const nowTs = Date.now();
    const isoNow = new Date(nowTs).toISOString();

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
      readingTimeMinutes: 3,
      createdAt: isoNow,
      createdTimestamp: nowTs,
      likedBy: [],
      likes: 0
    } as any);

    if (onIncreaseReadingStreak) {
      onIncreaseReadingStreak();
    }

    confetti({
      particleCount: 85,
      spread: 70,
      origin: { y: 0.5 },
      colors: ['#245351',

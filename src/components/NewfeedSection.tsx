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
  Search,
  Bell,
  Check,
  Lock
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

interface EmbeddedHeartNotice {
  id: string;
  senderId: string;
  senderName: string;
  createdAtMs: number;
  seenByIds: string[];
}

const formatDynamicTime = (rawTime: string | number | undefined, nowMs: number): string => {
  if (!rawTime || rawTime === 'Vừa đăng') return 'Vừa xong';

  let parsedMs = NaN;
  if (typeof rawTime === 'number') {
    parsedMs = rawTime;
  } else if (typeof rawTime === 'string') {
    const trimmed = rawTime.trim();
    if (/^\d{10,13}$/.test(trimmed)) {
      parsedMs = trimmed.length === 10 ? Number(trimmed) * 1000 : Number(trimmed);
    } else if (!Number.isNaN(Date.parse(trimmed))) {
      parsedMs = Date.parse(trimmed);
    } else {
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
  const d = new Date(parsedMs);
  const exactClock = `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${d.toLocaleDateString('vi-VN')}`;

  if (diffSec < 60) return `Vừa xong (${diffSec} giây trước)`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước · ${exactClock}`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước · ${exactClock}`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} ngày trước · ${exactClock}`;

  return exactClock;
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
  const canForceDeleteAny = isPresident || isRoot || isBcnMode;

  // Kiểm tra quyền bình luận & góp ý:
  // - Tài khoản Cựu Thành Viên sinh viên thường (alumni_viewer) CHỈ ĐƯỢC XEM, KHÔNG ĐƯỢC GÓP Ý
  // - Cựu Ban Chủ Nhiệm (former_bcn) và Thành viên đương nhiệm ĐƯỢC BÌNH LUẬN GÓP Ý
  const isAlumniViewerOnly =
    currentUser.clubRole === 'alumni_viewer' ||
    (Boolean(currentUser.isGraduated) && currentUser.clubRole !== 'former_bcn' && currentUser.canComment === false);
  const canCommentAndPost = !isAlumniViewerOnly;

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const [serverPostsSnapshot, setServerPostsSnapshot] = useState<any[] | null>(null);
  const [serverLocketsSnapshot, setServerLocketsSnapshot] = useState<any[] | null>(null);
  const [postLikesOverride, setPostLikesOverride] = useState<Record<string, string[]>>({});
  const [locketLikesOverride, setLocketLikesOverride] = useState<Record<string, string[]>>({});
  const [localCreatedTimestamps, setLocalCreatedTimestamps] = useState<Record<string, number>>({});
  const [likingInProgress, setLikingInProgress] = useState<Record<string, boolean>>({});
  const [dismissedNoticeIds, setDismissedNoticeIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    const syncLatestFromServer = async () => {
      try {
        const res = await fetch('/api/state');
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;
        if (Array.isArray(data.posts)) setServerPostsSnapshot(data.posts);
        if (Array.isArray(data.locketMoments)) setServerLocketsSnapshot(data.locketMoments);
      } catch {
        // ignore
      }
    };
    syncLatestFromServer();
    const poll = setInterval(syncLatestFromServer, 12000);
    return () => {
      isMounted = false;
      clearInterval(poll);
    };
  }, [currentUser.id]);

  const effectivePosts: any[] = serverPostsSnapshot && serverPostsSnapshot.length > 0 ? serverPostsSnapshot : posts;
  const effectiveLockets: any[] =
    serverLocketsSnapshot && serverLocketsSnapshot.length > 0 ? serverLocketsSnapshot : locketMoments;

  const myUnreadHeartNotices: {
    noticeId: string;
    targetType: 'post' | 'locket';
    targetId: string;
    senderName: string;
    itemTitle: string;
    createdAtMs: number;
  }[] = [];

  effectivePosts.forEach((p: any) => {
    const isMine =
      (p.authorId && p.authorId === currentUser.id) ||
      (p.authorName || '').trim().toLowerCase() === currentUser.name.trim().toLowerCase();
    if (!isMine || !Array.isArray(p.heartNotices)) return;

    p.heartNotices.forEach((n: EmbeddedHeartNotice) => {
      const alreadySeen =
        dismissedNoticeIds.includes(n.id) ||
        (Array.isArray(n.seenByIds) && n.seenByIds.includes(currentUser.id));
      if (!alreadySeen) {
        myUnreadHeartNotices.push({
          noticeId: n.id,
          targetType: 'post',
          targetId: p.id,
          senderName: n.senderName,
          itemTitle: p.title,
          createdAtMs: n.createdAtMs
        });
      }
    });
  });

  effectiveLockets.forEach((m: any) => {
    const isMine =
      (m.authorId && m.authorId === currentUser.id) ||
      (m.authorName || '').trim().toLowerCase() === currentUser.name.trim().toLowerCase();
    if (!isMine || !Array.isArray(m.heartNotices)) return;

    m.heartNotices.forEach((n: EmbeddedHeartNotice) => {
      const alreadySeen =
        dismissedNoticeIds.includes(n.id) ||
        (Array.isArray(n.seenByIds) && n.seenByIds.includes(currentUser.id));
      if (!alreadySeen) {
        myUnreadHeartNotices.push({
          noticeId: n.id,
          targetType: 'locket',
          targetId: m.id,
          senderName: n.senderName,
          itemTitle: m.caption,
          createdAtMs: n.createdAtMs
        });
      }
    });
  });

  myUnreadHeartNotices.sort((a, b) => b.createdAtMs - a.createdAtMs);

  const handleMarkHeartNoticeSeen = async (item: {
    noticeId: string;
    targetType: 'post' | 'locket';
    targetId: string;
  }) => {
    setDismissedNoticeIds((prev) => [...prev, item.noticeId]);

    try {
      if (item.targetType === 'post') {
        const updatedPosts = effectivePosts.map((p: any) => {
          if (p.id !== item.targetId || !Array.isArray(p.heartNotices)) return p;
          return {
            ...p,
            heartNotices: p.heartNotices.map((n: EmbeddedHeartNotice) =>
              n.id === item.noticeId
                ? { ...n, seenByIds: Array.from(new Set([...(n.seenByIds || []), currentUser.id])) }
                : n
            )
          };
        });
        setServerPostsSnapshot(updatedPosts);
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'posts', data: updatedPosts })
        });
      } else {
        const updatedLockets = effectiveLockets.map((m: any) => {
          if (m.id !== item.targetId || !Array.isArray(m.heartNotices)) return m;
          return {
            ...m,
            heartNotices: m.heartNotices.map((n: EmbeddedHeartNotice) =>
              n.id === item.noticeId
                ? { ...n, seenByIds: Array.from(new Set([...(n.seenByIds || []), currentUser.id])) }
                : n
            )
          };
        });
        setServerLocketsSnapshot(updatedLockets);
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'locketMoments', data: updatedLockets })
        });
      }
    } catch (err) {
      console.error('Lỗi cập nhật đã xem thông báo tim:', err);
    }
  };

  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isLocketModalOpen, setIsLocketModalOpen] = useState(false);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<string[]>([]);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentsList, setCommentsList] = useState<Record<string, { author: string; avatar: string; text: string; time: string }[]>>({});
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; postId: string; x: number; y: number }[]>([]);

  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [themeTextInput, setThemeTextInput] = useState(
    annualTheme?.theme || 'Định vị tư duy, bản lĩnh tri thức — Khơi nguồn cảm hứng đọc sinh viên AGU'
  );
  const [themeYearInput, setThemeYearInput] = useState(annualTheme?.year || '2026 - 2027');

  const DAILY_QUOTES = [
    { text: "Sách là ngọn đèn bất diệt soi sáng bước đường tri thức của mỗi sinh viên.", author: "CLB Đọc và Giới thiệu sách AGU" },
    { text: "Đọc sách không chỉ là nạp kiến thức, mà là học cách lắng nghe và thấu hiểu cuộc đời.", author: "Văn hóa đọc AGU" },
    { text: "Một cuốn sách hay giống như một người bạn tri kỷ, mở ra là niềm vui, khép lại là bài học.", author: "Trần Đăng Khoa" },
    { text: "Định vị tư duy, bản lĩnh tri thức — Mỗi ngày 15 trang sách kiến tạo nên tương lai.", author: "Bản tin E-News AGU" }
  ];
  const dailyQuote = DAILY_QUOTES[new Date().getDate() % DAILY_QUOTES.length];

  const [isBookReviewModalOpen, setIsBookReviewModalOpen] = useState(false);
  const [reviewBookTitle, setReviewBookTitle] = useState('');
  const [reviewBookAuthor, setReviewBookAuthor] = useState('');
  const [reviewPagesRead, setReviewPagesRead] = useState('Trang 30 đến trang 75');
  const [reviewTakeaway, setReviewTakeaway] = useState('');
  const [reviewContent, setReviewContent] = useState('');

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'E-News' | 'Tản văn' | 'Góc Sách AGU' | 'Điểm Tin Tuần' | 'Phóng Sự CLB' | 'Cảm Nhận Sách'>('E-News');
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newExcerpt, setNewExcerpt] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCover, setNewCover] = useState('https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80');
  const [newTags, setNewTags] = useState('AGUBookClub, SachHay, ENews');

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

  const filteredPosts = effectivePosts.filter(p => {
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
      (p.tags && p.tags.some((t: string) => t.toLowerCase().includes(q)))
    );
  });

  const getNormalizedLikedBy = (
    item: any,
    overrideMap: Record<string, string[]>,
    field: 'likedBy' | 'reactedBy',
    legacyCountField: 'likes' | 'reactions'
  ): string[] => {
    if (overrideMap[item.id] !== undefined) {
      return overrideMap[item.id];
    }
    if (Array.isArray(item[field])) {
      return item[field];
    }
    const legacyCount = Number(item[legacyCountField] || 0);
    if (legacyCount > 0) {
      return Array.from({ length: legacyCount }, (_, idx) => `legacy_user_${idx + 1}`);
    }
    return [];
  };

  const triggerLike = async (e: React.MouseEvent, post: any) => {
    if (likingInProgress[post.id]) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const newId = Date.now();
    setFloatingHearts(prev => [...prev, { id: newId, postId: post.id, x: rect.left + 20, y: rect.top - 10 }]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== newId));
    }, 1000);

    setLikingInProgress((prev) => ({ ...prev, [post.id]: true }));

    try {
      let latestPosts: any[] = effectivePosts;
      try {
        const stateRes = await fetch('/api/state');
        if (stateRes.ok) {
          const stateData = await stateRes.json();
          if (Array.isArray(stateData.posts) && stateData.posts.length > 0) {
            latestPosts = stateData.posts;
          }
        }
      } catch {
        // fallback
      }

      const targetPost = latestPosts.find((p) => p.id === post.id) || post;
      const currentLikedBy = getNormalizedLikedBy(targetPost, postLikesOverride, 'likedBy', 'likes');
      const alreadyLiked = currentLikedBy.includes(currentUser.id);

      const nextLikedBy = alreadyLiked
        ? currentLikedBy.filter((uid) => uid !== currentUser.id)
        : [...currentLikedBy, currentUser.id];

      setPostLikesOverride((prev) => ({ ...prev, [post.id]: nextLikedBy }));

      const isSelfLike =
        (targetPost.authorId && targetPost.authorId === currentUser.id) ||
        (targetPost.authorName || '').trim().toLowerCase() === currentUser.name.trim().toLowerCase();

      const existingNotices: EmbeddedHeartNotice[] = Array.isArray(targetPost.heartNotices)
        ? targetPost.heartNotices
        : [];

      let nextNotices = existingNotices;
      if (!alreadyLiked && !isSelfLike) {
        const newNotice: EmbeddedHeartNotice = {
          id: `hn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          senderId: currentUser.id,
          senderName: currentUser.name,
          createdAtMs: Date.now(),
          seenByIds: []
        };
        nextNotices = [newNotice, ...existingNotices.filter((n) => n.senderId !== currentUser.id)];
      } else if (alreadyLiked) {
        nextNotices = existingNotices.filter((n) => n.senderId !== currentUser.id);
      }

      const updatedPosts = latestPosts.map((p: any) =>
        p.id === post.id
          ? {
              ...p,
              likedBy: nextLikedBy,
              likes: nextLikedBy.length,
              userLiked: !alreadyLiked,
              heartNotices: nextNotices
            }
          : p
      );

      setServerPostsSnapshot(updatedPosts);

      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'posts', data: updatedPosts })
      });
    } finally {
      setLikingInProgress((prev) => ({ ...prev, [post.id]: false }));
    }
  };

  const handleToggleLocketReaction = async (moment: any) => {
    if (likingInProgress[moment.id]) return;
    setLikingInProgress((prev) => ({ ...prev, [moment.id]: true }));

    try {
      let latestLockets: any[] = effectiveLockets;
      try {
        const stateRes = await fetch('/api/state');
        if (stateRes.ok) {
          const stateData = await stateRes.json();
          if (Array.isArray(stateData.locketMoments) && stateData.locketMoments.length > 0) {
            latestLockets = stateData.locketMoments;
          }
        }
      } catch {
        // fallback
      }

      const targetMoment = latestLockets.find((m) => m.id === moment.id) || moment;
      const currentReactedBy = getNormalizedLikedBy(targetMoment, locketLikesOverride, 'reactedBy', 'reactions');
      const alreadyReacted = currentReactedBy.includes(currentUser.id);

      const nextReactedBy = alreadyReacted
        ? currentReactedBy.filter((uid) => uid !== currentUser.id)
        : [...currentReactedBy, currentUser.id];

      setLocketLikesOverride((prev) => ({ ...prev, [moment.id]: nextReactedBy }));

      const isSelfReact =
        (targetMoment.authorId && targetMoment.authorId === currentUser.id) ||
        (targetMoment.authorName || '').trim().toLowerCase() === currentUser.name.trim().toLowerCase();

      const existingNotices: EmbeddedHeartNotice[] = Array.isArray(targetMoment.heartNotices)
        ? targetMoment.heartNotices
        : [];

      let nextNotices = existingNotices;
      if (!alreadyReacted && !isSelfReact) {
        const newNotice: EmbeddedHeartNotice = {
          id: `hn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          senderId: currentUser.id,
          senderName: currentUser.name,
          createdAtMs: Date.now(),
          seenByIds: []
        };
        nextNotices = [newNotice, ...existingNotices.filter((n) => n.senderId !== currentUser.id)];
      } else if (alreadyReacted) {
        nextNotices = existingNotices.filter((n) => n.senderId !== currentUser.id);
      }

      const updatedLockets = latestLockets.map((m: any) =>
        m.id === moment.id
          ? {
              ...m,
              reactedBy: nextReactedBy,
              reactions: nextReactedBy.length,
              userReacted: !alreadyReacted,
              heartNotices: nextNotices
            }
          : m
      );

      setServerLocketsSnapshot(updatedLockets);

      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'locketMoments', data: updatedLockets })
      });
    } finally {
      setLikingInProgress((prev) => ({ ...prev, [moment.id]: false }));
    }
  };

  const toggleBookmark = (postId: string) => {
    setBookmarkedPosts(prev => 
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    );
  };

  const handleAddComment = (postId: string) => {
    if (!canCommentAndPost) return;
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    const nowFormatted =
      new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
      ' ' +
      new Date().toLocaleDateString('vi-VN');
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
    if (!canCommentAndPost || !newTitle.trim() || !newContent.trim()) return;

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
      likes: 0,
      heartNotices: []
    } as any);

    setLocalCreatedTimestamps((prev) => ({ ...prev, [newTitle]: nowTs }));
    setIsPostModalOpen(false);
    setNewTitle('');
    setNewContent('');
    setNewExcerpt('');
    setNewBookTitle('');
  };

  const handleCreateLocket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCommentAndPost || !newLocketCaption.trim()) return;

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
      reactions: 0,
      heartNotices: []
    } as any);

    setIsLocketModalOpen(false);
    setNewLocketCaption('');
  };

  const handleCreateBookReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCommentAndPost || !reviewBookTitle.trim() || !reviewContent.trim()) return;

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
      likes: 0,
      heartNotices: []
    } as any);

    if (onIncreaseReadingStreak) onIncreaseReadingStreak();

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
    setIsThemeModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {floatingHearts.map(h => (
        <div
          key={h.id}
          className="fixed z-50 pointer-events-none animate-float-heart text-rose-500 font-bold"
          style={{ left: h.x, top: h.y }}
        >
          ❤️ +1
        </div>
      ))}

      {/* Banner thông báo chế độ Viewer đối với Cựu Thành Viên sinh viên thường đã tốt nghiệp */}
      {isAlumniViewerOnly && (
        <div className="rounded-2xl p-4 border-2 border-[#245351] bg-[#EAF2EF] text-[#1E3A24] flex items-center gap-3 text-xs font-bold shadow-[3px_3px_0px_#382215]">
          <Lock className="w-4 h-4 text-[#245351] shrink-0" />
          <span>
            Bạn đang truy cập bằng <strong>Tài khoản Cựu Thành Viên (Chế độ Xem - Viewer)</strong>. Bạn có thể theo dõi toàn bộ hoạt động CLB nhưng không có quyền bình luận góp ý hoặc đăng bài mới.
          </span>
        </div>
      )}

      {/* Ô thông báo khi có người thả tim */}
      {myUnreadHeartNotices.length > 0 && (
        <div className="rounded-2xl p-4 border-2 border-rose-700 bg-rose-50/95 shadow-[4px_4px_0px_#9F1239] space-y-2.5 animate-in slide-in-from-top-3">
          <div className="flex items-center gap-2 text-xs font-black text-rose-900">
            <Bell className="w-4 h-4 text-rose-600 animate-bounce" />
            <span>Thông báo tương tác mới ({myUnreadHeartNotices.length})</span>
          </div>

          <div className="space-y-2">
            {myUnreadHeartNotices.map((notice) => (
              <div
                key={notice.noticeId}
                className="p-3 rounded-xl bg-white border border-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center shrink-0">
                    <Heart className="w-4 h-4 fill-rose-600 text-rose-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[#382215] font-medium leading-snug">
                      <strong className="text-rose-700">{notice.senderName}</strong> đã thả tim{' '}
                      {notice.targetType === 'post' ? 'bài viết' : 'khoảnh khắc Locket'}{' '}
                      <strong>"{notice.itemTitle}"</strong> của bạn
                    </p>
                    <span className="text-[10px] text-[#6E472B] font-semibold">
                      {formatDynamicTime(notice.createdAtMs, nowMs)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleMarkHeartNoticeSeen(notice)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#245351] hover:bg-[#193B39] text-white font-black text-[11px] flex items-center gap-1 self-end sm:self-center shrink-0 cursor-pointer shadow-[2px_2px_0px_#382215] border border-[#382215]"
                >
                  <Check className="w-3.5 h-3.5 text-[#FFE29A]" />
                  <span>Đã xem</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl p-6 sm:p-8 relative overflow-hidden bg-[#FAF3E3] border-3 border-[#382215] shadow-[6px_6px_0px_#382215] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative z-10 flex-1 space-y-3.5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src="/assets/aistudio/TUYE__N_THA_NH_VIE_N_778c37b9.png"
                  alt="Bộ ba Biểu Trưng"
                  className="h-16 sm:h-20 w-auto object-contain rounded-2xl shrink-0 border-2 border-[#382215] shadow-[3px_3px_0px_#382215] bg-white/60 p-1"
                />
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
                    className="px-2.5 py-1 rounded-lg bg-[#C8532B] text-white text-[10px] font-black flex items-center gap-1 cursor-pointer border border-[#382215]"
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

            <div className="flex items-start gap-2.5 bg-[#FFFDF8] p-3.5 rounded-2xl border-2 border-[#382215]/30 text-xs text-[#382215]">
              <Quote className="w-4 h-4 text-[#C8532B] shrink-0 mt-0.5" />
              <div>
                <span className="font-serif-vintage italic text-[#4A3525]">"{dailyQuote.text}"</span>
                <span className="text-[10px] font-bold text-[#8C3B1E] block mt-0.5">— {dailyQuote.author}</span>
              </div>
            </div>

            {canCommentAndPost && (
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsBookReviewModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#245351] text-white text-xs font-black flex items-center gap-1.5 shadow-[3px_3px_0px_#382215] cursor-pointer border-2 border-[#382215]"
                >
                  <BookMarked className="w-4 h-4 text-[#FFE29A]" />
                  <span>Viết Cảm Nhận Sách (Giữ Chuỗi 📖)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPostModalOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#C8532B] text-[#FFFDF7] text-xs font-bold flex items-center gap-1.5 shadow-[3px_3px_0px_#382215] cursor-pointer border-2 border-[#382215]"
                >
                  <PlusCircle className="w-4 h-4 text-[#FFE29A]" />
                  <span>Viết Bài E-News / Tản Văn</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsLocketModalOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#F2E5C9] text-[#382215] border-2 border-[#382215] text-xs font-bold flex items-center gap-1.5 shadow-[3px_3px_0px_#382215] cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-[#C8532B]" />
                  <span>Đăng Locket (+15 Điểm)</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Side: Logged-in User Profile Card (Tài khoản Cựu Chủ nhiệm không hiển thị ảnh cá nhân) */}
          <div className="w-full md:w-56 shrink-0 rounded-3xl border-3 border-[#382215] shadow-[5px_5px_0px_#382215] bg-[#F2E5C9] p-4 text-center space-y-3">
            {currentUser.clubRole !== 'former_bcn' ? (
              <div className="relative mx-auto w-20 h-20 rounded-2xl overflow-hidden border-2.5 border-[#382215] shadow-xs">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="mx-auto w-16 h-16 rounded-2xl bg-[#245351] border-2 border-[#382215] flex items-center justify-center text-[#FFE29A]">
                <Crown className="w-8 h-8" />
              </div>
            )}
            <div>
              <div className="font-black text-sm text-[#382215] font-serif-vintage truncate">
                {currentUser.name}
              </div>
              <div className="text-[11px] text-[#6E472B] font-semibold mt-0.5">
                {currentUser.studentId} · {currentUser.faculty}
              </div>
              <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded-lg bg-[#FAF3E3] border-2 border-[#382215] text-[10px] font-black text-[#245351]">
                {currentUser.position || `Ban ${currentUser.department}`}
              </div>
            </div>
          </div>
        </div>

        {/* Streak Tracker Card */}
        <div className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] shadow-[6px_6px_0px_#382215] bg-[#FAF3E3] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#382215]/20">
              <div className="flex items-center gap-2 text-[#382215] font-black text-base font-serif-vintage">
                <Flame className="w-5 h-5 text-[#C8532B] fill-[#C8532B]" />
                <span>Hệ Thống Chuỗi Hoạt Động</span>
              </div>
              <span className="text-xs font-bold text-[#8C3B1E]">{todayStr}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="p-4 bg-[#F2E5C9] rounded-2xl border-2 border-[#382215] text-center shadow-[3px_3px_0px_#382215]">
                <div className="flex items-center justify-center gap-1.5 text-2xl font-black text-[#C8532B] tabular-nums">
                  <Flame className="w-6 h-6 fill-[#C8532B] text-[#C8532B]" />
                  <span>{currentUser.readingStreak}</span>
                </div>
                <div className="text-xs font-black text-[#382215] mt-1">Chuỗi Đọc Sách</div>
              </div>

              <div className="p-4 bg-[#F2E5C9] rounded-2xl border-2 border-[#382215] text-center shadow-[3px_3px_0px_#382215]">
                <div className="flex items-center justify-center gap-1.5 text-2xl font-black text-[#245351] tabular-nums">
                  <Sparkles className="w-6 h-6 text-[#245351]" />
                  <span>{currentUser.enewsStreak}</span>
                </div>
                <div className="text-xs font-black text-[#382215] mt-1">Chuỗi Check-in</div>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={onCheckIn}
              disabled={isCheckedInToday || isAlumniViewerOnly}
              className={`w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition border-2 border-[#382215] shadow-[4px_4px_0px_#382215] ${
                isCheckedInToday || isAlumniViewerOnly
                  ? 'bg-[#E3DEC9] text-[#486A39] cursor-default'
                  : 'bg-[#C8532B] hover:bg-[#A63E1B] text-white cursor-pointer'
              }`}
            >
              {isAlumniViewerOnly ? (
                <span>Tài khoản Cựu Thành Viên (Chế độ Xem)</span>
              ) : isCheckedInToday ? (
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
          </div>
        </div>
      </div>

      {/* La Bàn Tri Thức */}
      <div className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-[#382215]/20">
          <div className="w-10 h-10 rounded-2xl bg-[#245351] border-2 border-[#382215] flex items-center justify-center text-[#FFE29A]">
            <Compass className="w-5 h-5 text-[#FFE29A]" />
          </div>
          <div>
            <h3 className="font-black text-[#382215] text-base sm:text-lg font-serif-vintage">
              La Bàn Tri Thức & 5 Chiều Kích Cảm Hứng Đọc
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {LITERARY_MOODS.map(mood => {
            const isSelected = mood.id === selectedMoodId;
            return (
              <button
                key={mood.id}
                type="button"
                onClick={() => setSelectedMoodId(mood.id)}
                className={`p-3 rounded-2xl border-2 border-[#382215] text-left cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected ? 'shadow-[4px_4px_0px_#382215] -translate-y-0.5' : 'bg-[#FFFDF8]'
                }`}
                style={{ backgroundColor: isSelected ? mood.bg : undefined }}
              >
                <span className="text-2xl">{mood.icon}</span>
                <div className="font-black text-xs text-[#382215]">{mood.label}</div>
              </button>
            );
          })}
        </div>

        <div
          className="p-5 rounded-2xl border-2 border-[#382215] space-y-1.5"
          style={{ backgroundColor: activeMood.bg }}
        >
          <p className="font-serif-vintage italic text-base text-[#382215] font-bold">"{activeMood.motto}"</p>
          <div className="flex items-center gap-1.5 text-xs text-[#245351] font-semibold">
            <BookOpen className="w-4 h-4 shrink-0 text-[#C8532B]" />
            <span><strong>Tác phẩm gợi ý đọc:</strong> {activeMood.recommendation}</span>
          </div>
        </div>
      </div>

      {/* Locket Moments */}
      <div className="rounded-3xl p-6 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-[#C8532B]" />
            <h3 className="font-black text-[#382215] text-sm sm:text-base font-serif-vintage">
              Locket Moments • Kỷ Niệm Thường Nhật CLB
            </h3>
          </div>
          {canCommentAndPost && (
            <button
              type="button"
              onClick={() => setIsLocketModalOpen(true)}
              className="text-xs font-black text-[#245351] bg-[#FFFDF8] px-3.5 py-2 rounded-xl border-2 border-[#382215] cursor-pointer"
            >
              + Thêm ảnh
            </button>
          )}
        </div>

        <div className="flex items-stretch gap-4 overflow-x-auto pb-3 pt-1">
          {effectiveLockets.map((moment: any) => {
            const isMomentAuthor =
              (moment.authorId && moment.authorId === currentUser.id) ||
              moment.authorName.trim().toLowerCase() === currentUser.name.trim().toLowerCase();
            const canDeleteLocket = isMomentAuthor || canForceDeleteAny;

            const reactedByList = getNormalizedLikedBy(moment, locketLikesOverride, 'reactedBy', 'reactions');
            const isReactedByMe = reactedByList.includes(currentUser.id);
            const totalReactionsCount = reactedByList.length;
            const dynamicLocketTime = formatDynamicTime(moment.createdTimestamp || moment.timestamp, nowMs);

            return (
              <div
                key={moment.id}
                className="w-64 shrink-0 bg-[#FFFDF8] p-3.5 rounded-2xl border-2 border-[#382215] shadow-[4px_4px_0px_#382215] relative flex flex-col justify-between"
              >
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-stone-100 mb-2.5">
                  <img src={moment.imageUrl} alt={moment.caption} className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-bold">
                    <MapPin className="w-2.5 h-2.5 text-[#FFE29A]" />
                    <span className="truncate max-w-[120px]">{moment.location}</span>
                  </div>

                  {canDeleteLocket && onDeleteLocket && (
                    <button
                      type="button"
                      onClick={() => onDeleteLocket(moment.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-[#2B1D14] font-semibold line-clamp-2">{moment.caption}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-[#382215]/15 text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-[#382215] truncate">{moment.authorName}</span>
                      <span className="text-[9px] text-[#6E472B] shrink-0">({dynamicLocketTime})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleLocketReaction(moment)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black cursor-pointer border border-[#382215] ${
                        isReactedByMe ? 'bg-rose-100 text-rose-700' : 'bg-[#FAF3E3] text-stone-700'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isReactedByMe ? 'fill-rose-600 text-rose-600' : ''}`} />
                      <span>{totalReactionsCount}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Feed Section */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-[#8C3B1E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={feedSearchQuery}
            onChange={(e) => setFeedSearchQuery(e.target.value)}
            placeholder="Tra cứu bài viết, tên sách, tác giả..."
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215] text-xs font-bold text-[#382215]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap border-2 border-[#382215] ${
                selectedCategory === cat ? 'bg-[#245351] text-white' : 'bg-[#FFFDF8] text-[#382215]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {filteredPosts.map((post: any) => {
            const isBookmarked = bookmarkedPosts.includes(post.id);
            const comments =
              post.commentsList && post.commentsList.length > 0
                ? post.commentsList
                : post.comments && post.comments.length > 0
                ? post.comments
                : commentsList[post.id] || [];
            const isCommentsOpen = activeCommentsPostId === post.id;

            const isPostAuthor =
              (post.authorId && post.authorId === currentUser.id) ||
              post.authorName.trim().toLowerCase() === currentUser.name.trim().toLowerCase();
            const canDeletePost = isPostAuthor || canForceDeleteAny;

            const likedByList = getNormalizedLikedBy(post, postLikesOverride, 'likedBy', 'likes');
            const isLikedByMe = likedByList.includes(currentUser.id);
            const totalLikesCount = likedByList.length;

            const rawTimestamp =
              post.createdTimestamp ||
              localCreatedTimestamps[post.title] ||
              (post.createdAt && post.createdAt !== 'Vừa đăng' ? post.createdAt : undefined);
            const dynamicPostTime = formatDynamicTime(rawTimestamp, nowMs);

            return (
              <article
                key={post.id}
                className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[5px_5px_0px_#382215] space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img src={post.authorAvatar} alt={post.authorName} className="w-10 h-10 rounded-xl object-cover" />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-xs sm:text-sm text-[#23432B]">{post.authorName}</h4>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#E5F0E4] text-[#2C5734]">
                          {post.authorDept}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#718B74] mt-0.5">
                        <span>{post.authorRole}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-bold text-[#C8532B]">
                          <Clock className="w-3 h-3 text-[#C8532B]" />
                          {dynamicPostTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#F3ECDD] text-[#765D30]">
                      {post.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleBookmark(post.id)}
                      className="p-2 rounded-xl text-stone-500 cursor-pointer"
                    >
                      <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-600 text-amber-600' : ''}`} />
                    </button>
                    {canDeletePost && onDeletePost && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Xóa bài viết "${post.title}"?`)) onDeletePost(post.id);
                        }}
                        className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-extrabold text-[#1F3A24] font-serif-vintage">{post.title}</h3>

                {post.coverImage && (
                  <div className="relative aspect-[21/9] rounded-2xl overflow-hidden border border-[#E3DAC8]">
                    <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="space-y-3 text-xs sm:text-sm text-[#384C3C] leading-relaxed">
                  <p className="italic font-serif bg-[#F7F4EA] p-3 rounded-2xl border-l-4 border-[#5E936B]">
                    "{post.excerpt}"
                  </p>
                  <p className="whitespace-pre-line text-[#2B3E2F]">{post.content}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#E5DCBE] text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => triggerLike(e, post)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold cursor-pointer ${
                        isLikedByMe
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : 'bg-white text-stone-600 border border-[#D5CBBC]'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLikedByMe ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{totalLikesCount} Yêu thích</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveCommentsPostId(isCommentsOpen ? null : post.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-stone-600 border border-[#D5CBBC] font-semibold cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-700" />
                      <span>{comments.length || post.commentsCount} Bình luận</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(window.location.href)}
                    className="p-1.5 rounded-lg text-stone-500 flex items-center gap-1 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs">Chia sẻ</span>
                  </button>
                </div>

                {/* Khung bình luận & góp ý (Khóa đối với Cựu Thành Viên Viewer) */}
                {isCommentsOpen && (
                  <div className="bg-[#F8F5EE] rounded-2xl p-4 border border-[#DFD6C3] space-y-3">
                    <h5 className="font-bold text-xs text-[#2A442F]">Thảo luận ({comments.length})</h5>

                    {comments.map((c: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs">
                        <div className="bg-white p-2.5 rounded-2xl border border-[#E3DAC8] flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#23432B]">{c.author}</span>
                            <span className="text-[10px] text-stone-400">{c.time}</span>
                          </div>
                          <p className="text-[#3A4E3E] mt-1">{c.text}</p>
                        </div>
                      </div>
                    ))}

                    {canCommentAndPost ? (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                          placeholder={
                            currentUser.clubRole === 'former_bcn'
                              ? 'Góp ý chia sẻ kinh nghiệm từ Cựu Ban Chủ Nhiệm...'
                              : 'Để lại cảm nghĩ của bạn về bài viết...'
                          }
                          className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#D5CABB] text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(post.id)}
                          className="p-2 rounded-xl bg-[#3B6E47] text-white cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-stone-200/80 border border-stone-300 text-[11px] font-bold text-stone-700 flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                        <span>
                          Tài khoản Cựu Thành Viên (Chế độ Xem) — Chỉ Cựu Ban Chủ Nhiệm và Thành viên đương nhiệm mới có quyền bình luận góp ý.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {/* Modal: Write New Post */}
      {isPostModalOpen && canCommentAndPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[#FAF7F0] rounded-3xl border-2 border-[#5E936B]/50 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-[#26472D] text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-base font-serif-vintage">Đăng Bài Viết E-News & Tản Văn Mới</h3>
              <button type="button" onClick={() => setIsPostModalOpen(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border bg-white text-xs"
              >
                <option value="E-News">Bản tin E-News</option>
                <option value="Tản văn">Tản văn & Cảm xúc</option>
                <option value="Góc Sách AGU">Góc Sách AGU</option>
                <option value="Phóng Sự CLB">Phóng Sự Hoạt Động CLB</option>
              </select>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Tiêu đề bài viết..."
                className="w-full px-3 py-2 rounded-xl border bg-white font-bold"
              />
              <textarea
                rows={5}
                required
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Nội dung chi tiết..."
                className="w-full px-3 py-2 rounded-xl border bg-white"
              />
              <button type="submit" className="px-6 py-2.5 rounded-xl bg-[#2D5337] text-white font-bold cursor-pointer">
                Xuất Bản Bài Viết
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Locket */}
      {isLocketModalOpen && canCommentAndPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[#FAF7F0] rounded-3xl w-full max-w-md overflow-hidden">
            <div className="bg-amber-800 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-base">Đăng Locket Khoảnh Khắc CLB</h3>
              <button type="button" onClick={() => setIsLocketModalOpen(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateLocket} className="p-5 space-y-4 text-xs">
              <label className="text-xs font-bold text-amber-800 flex items-center gap-1 cursor-pointer">
                <Camera className="w-3.5 h-3.5" />
                <span>Chụp / Tải ảnh từ máy</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const b64 = await readFileAsDataUrl(file, 900, 0.85);
                      setNewLocketImage(b64);
                    }
                  }}
                />
              </label>
              <input
                type="text"
                value={newLocketLocation}
                onChange={(e) => setNewLocketLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-white"
              />
              <textarea
                rows={3}
                required
                value={newLocketCaption}
                onChange={(e) => setNewLocketCaption(e.target.value)}
                placeholder="Lời nhắn Locket..."
                className="w-full px-3 py-2 rounded-xl border bg-white"
              />
              <button type="submit" className="px-5 py-2 rounded-xl bg-amber-600 text-white font-bold cursor-pointer">
                Đăng Locket
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Sửa Chủ Đề Năm */}
      {isThemeModalOpen && (
        <div className="fixed inset-0 z-[95] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FAF3E3] rounded-2xl border-3 border-[#382215] max-w-lg w-full p-5 space-y-4 text-xs">
            <h3 className="font-bold text-base">Cập Nhật Chủ Đề Năm</h3>
            <form onSubmit={handleSaveAnnualTheme} className="space-y-3">
              <input
                type="text"
                required
                value={themeYearInput}
                onChange={(e) => setThemeYearInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-white font-bold"
              />
              <textarea
                rows={3}
                required
                value={themeTextInput}
                onChange={(e) => setThemeTextInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-white"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsThemeModalOpen(false)} className="px-4 py-2 rounded-xl bg-stone-200">
                  Hủy
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#C8532B] text-white font-bold">
                  Lưu Chủ Đề
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Viết Cảm Nhận Sách */}
      {isBookReviewModalOpen && canCommentAndPost && (
        <div className="fixed inset-0 z-[95] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FAF3E3] rounded-2xl border-3 border-[#382215] max-w-lg w-full p-5 space-y-3.5 text-xs">
            <h3 className="font-bold text-base">Viết Cảm Nhận Sách Hôm Nay</h3>
            <form onSubmit={handleCreateBookReview} className="space-y-3">
              <input
                type="text"
                required
                value={reviewBookTitle}
                onChange={(e) => setReviewBookTitle(e.target.value)}
                placeholder="Tên cuốn sách..."
                className="w-full px-3 py-2 rounded-xl border bg-white font-bold"
              />
              <input
                type="text"
                required
                value={reviewPagesRead}
                onChange={(e) => setReviewPagesRead(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-white"
              />
              <input
                type="text"
                required
                value={reviewTakeaway}
                onChange={(e) => setReviewTakeaway(e.target.value)}
                placeholder="Bài học tâm đắc..."
                className="w-full px-3 py-2 rounded-xl border bg-white"
              />
              <textarea
                rows={4}
                required
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                placeholder="Cảm nghĩ chi tiết..."
                className="w-full px-3 py-2 rounded-xl border bg-white"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsBookReviewModalOpen(false)} className="px-4 py-2 rounded-xl bg-stone-200">
                  Hủy
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#245351] text-white font-bold">
                  Hoàn Tất
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

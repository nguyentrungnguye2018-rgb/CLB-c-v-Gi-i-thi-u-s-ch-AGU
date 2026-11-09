import React, { useState, useRef } from 'react';
import { 
  Award, 
  Sparkles, 
  BookOpen, 
  Crown, 
  Star, 
  Quote, 
  History, 
  ShieldCheck, 
  PlusCircle, 
  Trash2, 
  Search, 
  X, 
  Image as ImageIcon,
  CheckCircle2,
  Calendar,
  User,
  Upload,
  Camera,
  Edit3
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { HallOfFameItem, UserProfile } from '../types';
import { isMasterRootUser, isClubPresidentUser, isClubVicePresidentUser } from '../utils/governance';
import { readFileAsDataUrl } from '../utils/imageUpload';

interface HallOfFameSectionProps {
  items: HallOfFameItem[];
  currentUser?: UserProfile;
  isBcnMode: boolean;
  onAddItem?: (newItem: Omit<HallOfFameItem, 'id'>) => void;
  onUpdateItem?: (updatedItem: HallOfFameItem) => void;
  onDeleteItem?: (id: string) => void;
}

const ERA_PRESETS = [
  'Nhiệm kỳ I (2023 - 2024)',
  'Nhiệm kỳ II (2024 - 2025)',
  'Nhiệm kỳ III (2025 - 2026)',
  'Nhiệm kỳ IV (2026 - 2027)'
];

export const HallOfFameSection: React.FC<HallOfFameSectionProps> = ({ 
  items,
  currentUser,
  isBcnMode,
  onAddItem,
  onUpdateItem,
  onDeleteItem
}) => {
  const isPresident = isClubPresidentUser(currentUser);
  const isVicePresident = isClubVicePresidentUser(currentUser);
  const isRoot = isMasterRootUser(currentUser);
  const canDeleteHof = Boolean(onDeleteItem) && (isPresident || isVicePresident || isRoot || isBcnMode || currentUser?.role === 'bcn_admin' || currentUser?.role === 'lead' || true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HallOfFameItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEraFilter, setSelectedEraFilter] = useState<string>('all');
  const [deletedBannerMsg, setDeletedBannerMsg] = useState<string | null>(null);

  // Form states for new / edited Hall of Fame entry
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('Chủ nhiệm CLB');
  const [termYears, setTermYears] = useState('Thời kỳ đầu sáng lập (2021 - 2022)');
  const [bestContributions, setBestContributions] = useState('');
  const [legacyQuote, setLegacyQuote] = useState('');
  const [avatar, setAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const quickCardFileInputRef = useRef<HTMLInputElement | null>(null);
  const [quickPhotoTargetItem, setQuickPhotoTargetItem] = useState<HallOfFameItem | null>(null);

  // Sample portrait avatar presets
  const sampleAvatars = [
    { label: 'Chân dung 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80' },
    { label: 'Chân dung 2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80' },
    { label: 'Chân dung 3', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80' },
    { label: 'Chân dung 4', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80' }
  ];

  const openCreateModal = () => {
    setEditingItem(null);
    setName('');
    setNickname('');
    setStudentId('');
    setTitle('Chủ nhiệm CLB');
    setTermYears('Thời kỳ đầu sáng lập (2021 - 2022)');
    setBestContributions('');
    setLegacyQuote('');
    setUploadError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: HallOfFameItem) => {
    setEditingItem(item);
    setName(item.name);
    setNickname(item.nickname || '');
    setStudentId(item.studentId || '');
    setTitle(item.title);
    setTermYears(item.termYears);
    setBestContributions(item.bestContributions);
    setLegacyQuote(item.legacyQuote || '');
    setAvatar(item.avatar);
    setUploadError(null);
    setIsAddModalOpen(true);
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setIsUploadingPhoto(true);
    try {
      const dataUrl = await readFileAsDataUrl(file, 1100, 0.85);
      setAvatar(dataUrl);
    } catch (err: any) {
      setUploadError(err?.message || 'Không thể đọc tệp hình ảnh. Vui lòng chọn ảnh JPG/PNG.');
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleQuickCardPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !quickPhotoTargetItem || !onUpdateItem) return;
    try {
      const dataUrl = await readFileAsDataUrl(file, 1100, 0.85);
      onUpdateItem({
        ...quickPhotoTargetItem,
        avatar: dataUrl
      });
      setDeletedBannerMsg(`Đã cập nhật ảnh mới cho "${quickPhotoTargetItem.name}" (${quickPhotoTargetItem.termYears}) thành công!`);
    } catch {
      // ignore
    } finally {
      setQuickPhotoTargetItem(null);
      e.target.value = '';
    }
  };

  const saveEntry = (keepOpenForNext: boolean) => {
    if (!name.trim() || !bestContributions.trim()) return;

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#D4AF37', '#10B981', '#F59E0B', '#FAF5E8']
    });

    if (editingItem && onUpdateItem) {
      onUpdateItem({
        ...editingItem,
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        studentId: studentId.trim() || editingItem.studentId,
        title: title.trim(),
        termYears: termYears.trim(),
        bestContributions: bestContributions.trim(),
        legacyQuote: legacyQuote.trim() || 'Hành trình vạn dặm khởi đầu từ trang sách mở ra.',
        avatar: avatar.trim()
      });
      setDeletedBannerMsg(`Đã cập nhật hồ sơ & hình ảnh của "${name.trim()}" (${termYears.trim()}) trong Bảo Tàng!`);
      setEditingItem(null);
      setIsAddModalOpen(false);
      return;
    }

    if (onAddItem) {
      onAddItem({
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        studentId: studentId.trim() || `SV-${Math.floor(100000 + Math.random() * 900000)}`,
        title: title.trim(),
        termYears: termYears.trim(),
        bestContributions: bestContributions.trim(),
        legacyQuote: legacyQuote.trim() || 'Hành trình vạn dặm khởi đầu từ trang sách mở ra.',
        avatar: avatar.trim()
      });
      setDeletedBannerMsg(`Đã đăng tải hình ảnh & hồ sơ "${name.trim()}" (${termYears.trim()}) vào Bảo Tàng Thành Tựu!`);
    }

    setName('');
    setNickname('');
    setStudentId('');
    setBestContributions('');
    setLegacyQuote('');
    if (!keepOpenForNext) {
      setIsAddModalOpen(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveEntry(false);
  };

  // Distinct eras in current items
  const uniqueEras = Array.from(new Set(items.map(i => i.termYears).filter(Boolean)));

  // Filtered list
  const filteredItems = items.filter(item => {
    const matchesEra = selectedEraFilter === 'all' || item.termYears === selectedEraFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.nickname && item.nickname.toLowerCase().includes(q)) ||
      item.title.toLowerCase().includes(q) ||
      item.termYears.toLowerCase().includes(q) ||
      item.bestContributions.toLowerCase().includes(q);
    return matchesEra && matchesQuery;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hidden file input for quick 1-click photo replacement on any card */}
      <input
        ref={quickCardFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleQuickCardPhotoChange}
        className="hidden"
      />

      {/* Premier Luxury Banner - Khối cứng mềm mại */}
      <div className="rounded-3xl bg-[#FAF3E3] border-3 border-[#382215] shadow-[6px_6px_0px_#382215] p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5A140] text-[#382215] text-[11px] font-black uppercase tracking-wider border-2 border-[#382215] shadow-[2px_2px_0px_#382215]">
                <Star className="w-3.5 h-3.5 fill-[#382215] text-[#382215]" />
                Gian Trưng Bày Truyền Thống CLB (Từ Thời Kỳ Đầu Đến Nay)
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#245351] text-[#FFE29A] text-[10px] font-black border border-[#382215]">
                <History className="w-3 h-3 text-[#FFE29A]" />
                {items.length} Thế Hệ & Thành Tựu Được Lưu Giữ
              </span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black font-serif-vintage tracking-tight text-[#382215]">
              Bảo Tàng Thành Tựu & Lịch Sử Các Thời Kỳ CLB
            </h2>
            
            <p className="text-xs sm:text-sm text-[#5C432C] leading-relaxed font-medium">
              Nơi tự tay đăng tải hình ảnh kỷ niệm, chân dung và dấu ấn thanh xuân của dàn Ban Chủ Nhiệm, Trưởng/Phó ban và các thế hệ thành viên từ thời kỳ đầu sáng lập câu lạc bộ đến nay.
            </p>
          </div>

          {/* Primary Upload / Add Button */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-3 rounded-2xl font-black text-xs bg-[#C8532B] hover:bg-[#A63E1B] text-white flex items-center gap-2 border-2 border-[#382215] shadow-[4px_4px_0px_#382215] hover:shadow-[5px_5px_0px_#382215] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#382215] transition cursor-pointer shrink-0"
            >
              <Upload className="w-4 h-4 text-[#FFE29A]" />
              <span>Tải Ảnh & Thêm Thế Hệ Vào Bảo Tàng</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Banner when an item is added, updated or removed */}
      {deletedBannerMsg && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215] shadow-[4px_4px_0px_#382215] text-xs font-black text-[#382215] animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#486A39] shrink-0" />
            <span>{deletedBannerMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeletedBannerMsg(null)}
            className="p-1 rounded-lg hover:bg-[#F2E5C9] text-[#382215] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Era Filter Toolbar - Khối cứng mềm mại */}
      <div className="flex flex-col gap-3 bg-[#FAF3E3] p-4 rounded-2xl border-2 border-[#382215] shadow-[4px_4px_0px_#382215]">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-black text-[#382215]">
            <Award className="w-4 h-4 text-[#C8532B]" />
            <span>Danh Sách Vinh Danh Các Thời Kỳ ({filteredItems.length} hồ sơ)</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E472B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, bút danh, thời kỳ, chức vụ..."
              className="pl-9 pr-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215]/30 text-xs font-bold text-[#382215] w-full sm:w-72 focus:outline-none focus:border-[#C8532B] focus:ring-1 focus:ring-[#C8532B]"
            />
          </div>
        </div>

        {uniqueEras.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-[#382215]/10">
            <span className="text-[11px] font-extrabold text-[#6E472B] shrink-0 mr-1">Lọc theo thời kỳ:</span>
            <button
              type="button"
              onClick={() => setSelectedEraFilter('all')}
              className={`px-3 py-1 rounded-xl text-[11px] font-black transition cursor-pointer shrink-0 ${
                selectedEraFilter === 'all'
                  ? 'bg-[#382215] text-[#FFE29A]'
                  : 'bg-[#FFFDF8] text-[#382215] border border-[#382215]/25 hover:bg-[#F2E5C9]'
              }`}
            >
              Tất cả thời kỳ ({items.length})
            </button>
            {uniqueEras.map(era => (
              <button
                key={era}
                type="button"
                onClick={() => setSelectedEraFilter(era)}
                className={`px-3 py-1 rounded-xl text-[11px] font-black transition cursor-pointer shrink-0 ${
                  selectedEraFilter === era
                    ? 'bg-[#C8532B] text-white border border-[#382215]'
                    : 'bg-[#FFFDF8] text-[#382215] border border-[#382215]/25 hover:bg-[#F2E5C9]'
                }`}
              >
                {era}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hall of fame cards grid - Khối cứng mềm mại */}
      {filteredItems.length === 0 ? (
        <div className="p-10 text-center bg-[#FAF3E3] rounded-3xl border-3 border-dashed border-[#382215]/40 text-[#382215] space-y-4 shadow-[4px_4px_0px_#382215]">
          <div className="w-16 h-16 rounded-2xl bg-[#E5A140]/30 border-2 border-[#382215] flex items-center justify-center mx-auto shadow-[3px_3px_0px_#382215]">
            <Camera className="w-8 h-8 text-[#382215]" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h4 className="font-black text-base font-serif-vintage text-[#382215]">
              Bảo Tàng Sẵn Sàng Để Bạn Tự Tay Up Ảnh Các Thế Hệ CLB
            </h4>
            <p className="text-xs font-medium text-[#6E472B] leading-relaxed">
              Hãy nhấn nút bên dưới để tải ảnh trực tiếp từ máy tính hoặc điện thoại của bạn lên, phục dựng lại trọn vẹn dàn nhân sự từ thời kỳ đầu sáng lập tới nay.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-2xl font-black text-xs bg-[#C8532B] hover:bg-[#A63E1B] text-white inline-flex items-center gap-2 border-2 border-[#382215] shadow-[3px_3px_0px_#382215] cursor-pointer transition"
          >
            <Upload className="w-4 h-4 text-[#FFE29A]" />
            <span>Tải Ảnh Thế Hệ Đầu Tiên Lên Ngay</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-[#FAF3E3] p-6 rounded-3xl border-3 border-[#382215] shadow-[5px_5px_0px_#382215] flex flex-col justify-between space-y-4 hover:shadow-[7px_7px_0px_#382215] transition relative overflow-hidden group"
            >
              {/* Header Bar inside card: Ribbon & Edit/Delete Buttons cleanly separated */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#382215]/15 flex-wrap">
                <div className="bg-[#E5A140] text-[#382215] font-black text-[11px] px-3 py-1 rounded-xl border-2 border-[#382215] shadow-[2px_2px_0px_#382215] flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-[#382215] text-[#382215]" />
                  <span>{item.termYears}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#FFFDF8] hover:bg-[#EAD8B3] text-[#382215] border-2 border-[#382215] font-black text-[11px] flex items-center gap-1 transition cursor-pointer shadow-[2px_2px_0px_#382215]"
                    title="Đổi ảnh từ máy hoặc sửa thông tin hồ sơ này"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#245351]" />
                    <span>Đổi Ảnh / Sửa</span>
                  </button>

                  {canDeleteHof && onDeleteItem && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDeleteItem(item.id);
                        setDeletedBannerMsg(`Đã gỡ bỏ hồ sơ "${item.name}" (${item.title}) khỏi Bảo Tàng Thành Tựu.`);
                      }}
                      className="relative z-20 px-3 py-1.5 rounded-xl bg-[#C8532B] hover:bg-rose-700 text-white border-2 border-[#382215] font-black text-[11px] flex items-center gap-1.5 transition cursor-pointer shadow-[2px_2px_0px_#382215] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                      title="Gỡ bỏ thành viên này khỏi Bảo Tàng Thành Tựu"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa Khỏi Bảo Tàng</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4 pt-1">
                <div className="relative shrink-0 group/avatar">
                  <img 
                    src={item.avatar} 
                    alt={item.name} 
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-[#382215] shadow-[3px_3px_0px_#382215]"
                  />
                  {onUpdateItem && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickPhotoTargetItem(item);
                        quickCardFileInputRef.current?.click();
                      }}
                      className="absolute inset-0 rounded-2xl bg-black/55 opacity-0 group-hover/avatar:opacity-100 transition flex flex-col items-center justify-center text-white text-[10px] font-black gap-1 cursor-pointer"
                      title="Bấm để tải ảnh mới từ máy lên"
                    >
                      <Camera className="w-4 h-4 text-[#FFE29A]" />
                      <span>Tải Ảnh Lên</span>
                    </button>
                  )}
                  <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#E5A140] border border-[#382215] text-[#382215] flex items-center justify-center text-xs font-black shadow-xs">
                    👑
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-base sm:text-lg text-[#382215] font-serif-vintage leading-tight">
                      {item.name}
                    </h4>
                    {item.nickname && (
                      <span className="text-xs font-bold text-[#C8532B] italic">
                        ({item.nickname})
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-black text-[#245351] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#245351] shrink-0" />
                    <span>{item.title}</span>
                  </p>

                  {item.studentId && (
                    <p className="text-[11px] text-[#6E472B] font-mono font-semibold">
                      Mã SV / Khóa: {item.studentId}
                    </p>
                  )}
                </div>
              </div>

              {/* Contributions */}
              <div className="p-4 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215]/25 shadow-[2px_2px_0px_#382215] text-xs space-y-1.5">
                <div className="font-black text-[#382215] flex items-center gap-1.5 text-xs">
                  <Award className="w-4 h-4 text-[#C8532B]" />
                  <span>Dấu ấn cống hiến & Thành tựu nổi bật:</span>
                </div>
                <p className="text-[#4A3525] leading-relaxed pl-1 text-xs font-medium whitespace-pre-line">
                  {item.bestContributions}
                </p>
              </div>

              {/* Quote */}
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#F2E5C9]/70 border border-[#382215]/20 text-xs italic text-[#382215] shadow-xs">
                <Quote className="w-4 h-4 text-[#C8532B] shrink-0 mt-0.5" />
                <p className="leading-relaxed font-serif text-xs text-[#382215] font-semibold">
                  "{item.legacyQuote}"
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================================
          MODAL: TẢI ẢNH TỪ MÁY & THÊM / SỬA HỒ SƠ BẢO TÀNG (TỪ THỜI KỲ ĐẦU ĐẾN NAY)
         ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-[#FAF3E3] w-full max-w-xl rounded-3xl border-3 border-[#382215] shadow-[8px_8px_0px_#382215] p-5 sm:p-6 space-y-4 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-[#382215]/15 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E5A140] border-2 border-[#382215] text-[#382215] flex items-center justify-center font-black shadow-[2px_2px_0px_#382215]">
                  <Camera className="w-4 h-4 text-[#382215]" />
                </div>
                <div>
                  <h3 className="font-black text-base text-[#382215] font-serif-vintage">
                    {editingItem ? `Cập Nhật Ảnh & Hồ Sơ: ${editingItem.name}` : 'Đăng Tải Ảnh & Hồ Sơ Các Thời Kỳ CLB'}
                  </h3>
                  <p className="text-[11px] text-[#6E472B] font-semibold">
                    Tự tải ảnh từ thiết bị của bạn lên để lưu giữ các thế hệ từ thời kỳ đầu tới nay
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingItem(null);
                }}
                className="text-[#382215] hover:bg-[#EAD8B3] rounded-xl cursor-pointer p-1.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              {/* 1. Direct Image Upload from Computer/Phone + Preview */}
              <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215] shadow-[3px_3px_0px_#382215] space-y-3">
                <label className="block font-black text-[#382215] flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#C8532B]" />
                  <span>1. Tải Ảnh Chân Dung / Ảnh Kỷ Niệm Từ Máy Lên:</span>
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative shrink-0">
                    <img
                      src={avatar}
                      alt="Xem trước ảnh tải lên"
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-[#382215] shadow-[3px_3px_0px_#382215]"
                    />
                    <span className="absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-[#E5A140] border border-[#382215] text-[9px] font-black text-[#382215]">
                      Xem trước
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 w-full space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#245351] hover:bg-[#1B403E] text-[#FFE29A] border-2 border-[#382215] shadow-[2px_2px_0px_#382215] font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Upload className="w-4 h-4 text-[#FFE29A]" />
                      <span>
                        {isUploadingPhoto ? 'Đang xử lý ảnh...' : 'Chọn Ảnh Từ Máy Tính / Điện Thoại (JPG, PNG)'}
                      </span>
                    </button>

                    {uploadError && (
                      <p className="text-[11px] font-bold text-rose-700">{uploadError}</p>
                    )}

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#6E472B] block">
                        Hoặc dán đường dẫn ảnh (URL) / chọn ảnh mẫu:
                      </span>
                      <input
                        type="text"
                        value={avatar.startsWith('data:') ? '' : avatar}
                        onChange={(e) => {
                          if (e.target.value.trim()) setAvatar(e.target.value.trim());
                        }}
                        placeholder={avatar.startsWith('data:') ? '✓ Đã tải ảnh trực tiếp từ thiết bị lên' : 'Dán link ảnh tại đây (tùy chọn)...'}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF3E3] border border-[#382215]/30 text-[11px] font-medium text-[#382215]"
                      />
                      <div className="flex items-center gap-1 overflow-x-auto pt-0.5">
                        {sampleAvatars.map((s, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setAvatar(s.url)}
                            className="text-[10px] px-2 py-0.5 rounded-lg bg-[#FAF3E3] text-[#382215] border border-[#382215]/30 hover:bg-[#E5A140]/40 font-bold cursor-pointer shrink-0"
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Era / Term Quick Selection + Input */}
              <div className="space-y-1.5">
                <label className="block font-black text-[#382215]">
                  2. Thời Kỳ / Nhiệm Kỳ Hoạt Động (Từ Thời Kỳ Đầu Tới Giờ):
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {ERA_PRESETS.map((era) => (
                    <button
                      key={era}
                      type="button"
                      onClick={() => setTermYears(era)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-black border transition cursor-pointer shrink-0 ${
                        termYears === era
                          ? 'bg-[#C8532B] text-white border-[#382215]'
                          : 'bg-[#FFFDF8] text-[#382215] border-[#382215]/30 hover:bg-[#EAD8B3]'
                      }`}
                    >
                      {era}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={termYears}
                  onChange={(e) => setTermYears(e.target.value)}
                  placeholder="Ví dụ: Nhiệm kỳ I (2023 - 2024), Nhiệm kỳ II (2024 - 2025)..."
                  className="w-full px-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215]/40 font-bold text-[#382215]"
                  required
                />
              </div>

              {/* 3. Name & Nickname */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-black text-[#382215] mb-1">
                    3. Họ và Tên Cựu Nhân Sự / Thế Hệ CLB:
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215]/40 font-bold text-[#382215]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-black text-[#382215] mb-1">
                    4. Biệt Danh / Bút Danh Kỷ Niệm (Tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Ví dụ: Người Đặt Viên Gạch Đầu Tiên"
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215]/40 font-semibold text-[#382215]"
                  />
                </div>
              </div>

              {/* 5. Title & Student ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-black text-[#382215] mb-1">
                    5. Chức Vụ / Vai Trò Trong Thời Kỳ Đó:
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Chủ nhiệm Sáng lập, Phó Chủ nhiệm, Trưởng ban..."
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215]/40 font-bold text-[#382215]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-black text-[#382215] mb-1">
                    6. MSSV / Khoa / Khóa Học (Tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Ví dụ: DTH200105 - Khoa Sư phạm"
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215]/40 font-semibold text-[#382215]"
                  />
                </div>
              </div>

              {/* 7. Best contributions */}
              <div>
                <label className="block font-black text-[#382215] mb-1">
                  7. Dấu Ấn Cống Hiến & Kỷ Niệm Đáng Nhớ:
                </label>
                <textarea
                  rows={3}
                  value={bestContributions}
                  onChange={(e) => setBestContributions(e.target.value)}
                  placeholder="Ghi lại công lao, dấu ấn của anh/chị hoặc tập thể thời kỳ này đối với CLB Đọc và Giới thiệu sách..."
                  className="w-full px-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215]/40 font-medium text-[#382215] leading-relaxed"
                  required
                />
              </div>

              {/* 8. Legacy Quote */}
              <div>
                <label className="block font-black text-[#382215] mb-1">
                  8. Câu Nói Tâm Đắc / Lời Nhắn Gửi Thế Hệ Sau:
                </label>
                <input
                  type="text"
                  value={legacyQuote}
                  onChange={(e) => setLegacyQuote(e.target.value)}
                  placeholder="Ví dụ: Hãy giữ mãi ngọn lửa yêu sách dưới mái trường Đại học An Giang..."
                  className="w-full px-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215]/40 font-medium text-[#382215] italic"
                />
              </div>

              {/* Action Buttons (including Save & Add Another for uploading historical batches!) */}
              <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2.5 rounded-xl font-black text-[#382215] bg-[#EAD8B3] hover:bg-[#DEC696] border-2 border-[#382215] transition cursor-pointer"
                >
                  Đóng
                </button>

                {!editingItem && (
                  <button
                    type="button"
                    onClick={() => saveEntry(true)}
                    disabled={!name.trim() || !bestContributions.trim()}
                    className="px-4 py-2.5 rounded-xl font-black bg-[#245351] hover:bg-[#1B403E] text-[#FFE29A] border-2 border-[#382215] shadow-[2px_2px_0px_#382215] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <PlusCircle className="w-4 h-4 text-[#FFE29A]" />
                    <span>Lưu & Up Tiếp Người Tiếp Theo</span>
                  </button>
                )}

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-black bg-[#C8532B] hover:bg-[#A63E1B] text-white border-2 border-[#382215] shadow-[3px_3px_0px_#382215] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Crown className="w-4 h-4 text-[#FFE29A]" />
                  <span>{editingItem ? 'Lưu Cập Nhật Bảo Tàng' : 'Lưu Vào Bảo Tàng Thành Tựu'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


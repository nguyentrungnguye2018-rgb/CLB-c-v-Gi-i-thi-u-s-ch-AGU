import React, { useState } from 'react';
import { Search, Sparkles, ExternalLink, BookOpen, X, Loader2, BookCheck } from 'lucide-react';
import { searchBooksWithGoogleGrounding } from '../services/cloudSync';

// Initial Club Literature Vault (Dữ liệu sách & tác giả ban đầu của CLB)
interface InitialBookInfo {
  keywords: string[];
  title: string;
  author: string;
  intro: string;
  coreValue: string;
  discussion: string;
  sourceType: 'Kho Sách CLB Đọc Sách AGU' | 'Google Search Grounding';
}

const INITIAL_BOOK_VAULT: InitialBookInfo[] = [
  {
    keywords: ['cây cam ngọt', 'cay cam ngot', 'vasconcelos', 'zeze', 'bồ đào nha'],
    title: 'Cây Cam Ngọt Của Tôi (Meu Pé de Laranja Lima)',
    author: 'José Mauro de Vasconcelos',
    intro: 'Tác phẩm tự truyện kinh điển của văn học Brazil về cậu bé Zezé 5 tuổi thông minh, giàu trí tưởng tượng nhưng thiếu thốn tình thương gia đình, tìm thấy người bạn tri kỷ ở cây cam ngọt sau vườn và bác Bồ.',
    coreValue: 'Giá trị nhân văn sâu sắc về lòng trắc ẩn, tình thương yêu và nỗi đau trưởng thành. Cuốn sách nhắc nhở chúng ta trân trọng trái tim thơ ngây của trẻ thơ.',
    discussion: '1. Tình bạn giữa Zezé và bác Bồ đã cứu rỗi tâm hồn cậu bé ra sao?\n2. Bài học về sự thấu cảm và lắng nghe trong môi trường giáo dục sinh viên.',
    sourceType: 'Kho Sách CLB Đọc Sách AGU'
  },
  {
    keywords: ['hoàng tử bé', 'hoang tu be', 'saint-exupery', 'hoa hong', 'con cao'],
    title: 'Hoàng Tử Bé (Le Petit Prince)',
    author: 'Antoine de Saint-Exupéry',
    intro: 'Kiệt tác văn học Pháp kể về cuộc hành trình của Hoàng tử bé từ tiểu tinh cầu B612 đến Trái Đất, mang triết lý nhân sinh bất hủ về tình yêu và cái nhìn bằng trái tim.',
    coreValue: '"Người ta chỉ thấy rõ với trái tim. Điều cốt lõi vô hình đối với mắt trần." Tác phẩm là lời cảnh tỉnh người lớn về sự giản dị và thuần khiết.',
    discussion: '1. Ý nghĩa biểu tượng của bông hoa hồng và bài học thuần hóa của chú cáo.\n2. Làm thế nào để sinh viên AGU giữ được ngọn lửa hồn nhiên giữa guồng quay trưởng thành?',
    sourceType: 'Kho Sách CLB Đọc Sách AGU'
  },
  {
    keywords: ['nhà giả kim', 'nha gia kim', 'paulo coelho', 'santiago', 'kho bau', 'kim tu thap'],
    title: 'Nhà Giả Kim (The Alchemist)',
    author: 'Paulo Coelho',
    intro: 'Một trong những cuốn sách bán chạy nhất mọi thời đại, kể về hành trình theo đuổi "Vận Mệnh Cá Nhân" của chàng chăn cừu Santiago từ Tây Ban Nha đến kim tự tháp Ai Cập.',
    coreValue: 'Khi bạn khao khát một điều gì đó, cả vũ trụ sẽ hợp lực giúp bạn đạt được nó. Lòng kiên định và khả năng đọc những "dấu chỉ" của cuộc đời.',
    discussion: '1. "Vận Mệnh Cá Nhân" của mỗi sinh viên thời đại mới là gì?\n2. Những nỗi sợ nào cản bước người trẻ dấn thân?',
    sourceType: 'Kho Sách CLB Đọc Sách AGU'
  },
  {
    keywords: ['nguyễn nhật ánh', 'nguyen nhat anh', 'cho toi xin mot ve di tuoi tho', 'mat biec', 'toi thay hoa vang'],
    title: 'Tuyển Tập Nhà Văn Nguyễn Nhật Ánh (Mắt Biếc, Cho Tôi Xin Một Vé Đi Tuổi Thơ)',
    author: 'Nguyễn Nhật Ánh',
    intro: 'Nhà văn thiếu nhi và tuổi trẻ hàng đầu Việt Nam. Các tác phẩm của ông như tấm vé nhiệm màu đưa độc giả quay về những rung động trong trẻo của tuổi học trò.',
    coreValue: 'Tình bạn, tình làng nghĩa xóm, tình yêu đơn phương trong sáng và ký ức êm đềm của làng quê Việt Nam.',
    discussion: '1. Vì sao văn phong của Nguyễn Nhật Ánh luôn chạm đến trái tim nhiều thế hệ sinh viên?\n2. Góc nhìn nhân vật Ngạn và Hà Lan dưới lăng kính của người trẻ hiện đại.',
    sourceType: 'Kho Sách CLB Đọc Sách AGU'
  },
  {
    keywords: ['atomic habits', 'thoi quen nguyen tu', 'james clear', '1%', 'thoi quen'],
    title: 'Atomic Habits — Thói Quen Nguyên Tử',
    author: 'James Clear',
    intro: 'Cuốn cẩm nang phát triển bản thân nổi tiếng toàn cầu về cách tạo dựng thói quen tốt và từ bỏ thói quen xấu thông qua nguyên lý cải thiện 1% mỗi ngày.',
    coreValue: 'Hệ thống quan trọng hơn mục tiêu. Sự tích lũy vi mô của thói quen hàng ngày chính là đòn bẩy kiến tạo thành công bền vững.',
    discussion: '1. Ứng dụng quy luật 4 bước (Nhận biết - Thèm muốn - Phản hồi - Phần thưởng) vào việc giữ chuỗi đọc sách 15 phút mỗi ngày tại AGU.\n2. Cách vượt qua "Thung lũng thất vọng" khi mới bắt đầu rèn luyện.',
    sourceType: 'Kho Sách CLB Đọc Sách AGU'
  },
  {
    keywords: ['khuyến học', 'khuyen hoc', 'fukuzawa yukichi', 'nhat ban', 'duy tan'],
    title: 'Khuyến Học (Gakumon no Susume)',
    author: 'Fukuzawa Yukichi',
    intro: 'Tác phẩm khai sáng tư tưởng Nhật Bản thời Minh Trị Duy Tân, mở đầu bằng tuyên ngôn bất hủ: "Trời không tạo ra người đứng trên người, cũng không tạo ra người đứng dưới người."',
    coreValue: 'Học vấn thực dụng, tinh thần độc lập tự cường của từng cá nhân là gốc rễ cho sự phồn vinh của quốc gia dân tộc.',
    discussion: '1. Tinh thần "tự lực cánh sinh" và học tập suốt đời đối với sinh viên AGU.\n2. Phân biệt học thuật sáo rỗng và học vấn thực chất.',
    sourceType: 'Kho Sách CLB Đọc Sách AGU'
  },
  {
    keywords: ['đắc nhân tâm', 'dac nhan tam', 'dale carnegie', 'giao tiep'],
    title: 'Đắc Nhân Tâm (How to Win Friends and Influence People)',
    author: 'Dale Carnegie',
    intro: 'Cuốn sách nghệ thuật thu phục lòng người và giao tiếp ứng xử kinh điển nhất thế kỷ 20, được hàng triệu độc giả tôn vinh.',
    coreValue: 'Chân thành khen ngợi, đặt mình vào vị trí của người khác và học cách lắng nghe để xây dựng mối quan hệ tin cậy.',
    discussion: '1. Ứng dụng Đắc Nhân Tâm trong quản lý đội nhóm và sinh hoạt câu lạc bộ sinh viên.\n2. Ranh giới giữa sự khéo léo chân thành và thói tâng bốc giả tạo.',
    sourceType: 'Kho Sách CLB Đọc Sách AGU'
  },
  {
    keywords: ['hương rừng cà mau', 'huong rung ca mau', 'sơn nam', 'mien tay', 'an giang', 'phuong nam'],
    title: 'Hương Rừng Cà Mau & Văn Hóa Đất Phương Nam',
    author: 'Sơn Nam (Nhà văn An Giang)',
    intro: 'Bức tranh tráng lệ, hào sảng về công cuộc khẩn hoang miền Tây Nam Bộ của những con người đi mở cõi, gắn liền với sông nước phù sa và rừng tràm U Minh.',
    coreValue: 'Bản sắc nghĩa tình, tinh thần trọng nghĩa khinh tài và lòng dũng cảm vượt qua thiên nhiên khắc nghiệt của tiền nhân phương Nam.',
    discussion: '1. Nét đẹp con người và phong thổ An Giang - Nam Bộ trong văn chương Sơn Nam.\n2. Trách nhiệm của sinh viên AGU trong việc bảo tồn và lan tỏa văn hóa vùng sông Tiền - sông Hậu.',
    sourceType: 'Kho Sách CLB Đọc Sách AGU'
  }
];

export const BookSearchGroundingWidget: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [sources, setSources] = useState<{ title: string; uri: string }[]>([]);
  const [sourceBadge, setSourceBadge] = useState<string>('Kho Dữ Liệu Ban Đầu CLB AGU');
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return;

    setError(null);

    // 1. First, search locally in the Initial Literature Vault (Tra cứu dữ liệu ban đầu)
    const localMatch = INITIAL_BOOK_VAULT.find(b => 
      b.keywords.some(k => cleanQuery.includes(k) || k.includes(cleanQuery)) ||
      b.title.toLowerCase().includes(cleanQuery) ||
      b.author.toLowerCase().includes(cleanQuery)
    );

    if (localMatch) {
      setResultText(
        `📖 **Tác phẩm:** ${localMatch.title}\n✍️ **Tác giả:** ${localMatch.author}\n\n📌 **Giới thiệu tóm tắt:**\n${localMatch.intro}\n\n💡 **Giá trị & Thông điệp cốt lõi:**\n${localMatch.coreValue}\n\n🎯 **Gợi ý thảo luận cho buổi sinh hoạt CLB AGU:**\n${localMatch.discussion}`
      );
      setSources([
        { title: 'Thư viện Tủ Sách Khai Sáng CLB Đọc Sách AGU', uri: '#' },
        { title: 'Tủ sách Văn học & Kỹ năng Sinh viên AGU', uri: '#' }
      ]);
      setSourceBadge('Dữ Liệu Thư Viện Ban Đầu CLB AGU');
    }

    // 2. Also try Google Search Grounding to enrich if possible
    setIsLoading(true);
    const res = await searchBooksWithGoogleGrounding(query.trim());
    setIsLoading(false);

    if (res.success && res.text) {
      setResultText(res.text);
      setSources(res.sources || []);
      setSourceBadge('Google Search Grounding Cập Nhật Thực Tế');
    } else if (!localMatch) {
      // If no local match and online failed, give helpful fallback literature guidance
      setResultText(
        `📚 **Kết quả tra cứu nhanh cho "${query.trim()}":**\n\nCuốn sách hoặc tác giả này thuộc danh mục tra cứu mở rộng của CLB Đọc và Giới thiệu sách AGU.\n\n💡 **Gợi ý từ CLB:**\n- Bạn có thể tìm thấy bản in giấy trực tiếp tại **Tầng 3 - Thư viện Trường Đại học An Giang**.\n- Bạn có thể viết một bài **Cảm Nhận Sách** ở Bảng Tin để chia sẻ góc nhìn cùng các thành viên trong CLB!`
      );
      setSources([
        { title: 'Thư viện Trường Đại học An Giang (AGU Library)', uri: 'https://lib.agu.edu.vn' }
      ]);
      setSourceBadge('Tra cứu Kho Sách CLB & Thư Viện AGU');
    }
  };

  return (
    <div className="mb-6 rounded-3xl p-5 sm:p-6 bg-[#FAF3E3] border-3 border-[#382215] shadow-[6px_6px_0px_#382215] space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#245351] text-[#FFE29A] border-2 border-[#382215] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#382215]">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-[#8C3B1E] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C8532B]" />
              <span>Tra Cứu Dữ Liệu Ban Đầu & Trực Tuyến CLB</span>
            </div>
            <h3 className="text-sm sm:text-base font-black font-serif-vintage text-[#382215]">
              Tra Cứu Sách, Tác Giả & Tác Phẩm Kinh Điển
            </h3>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-auto md:min-w-[400px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#6E472B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập tên sách, tác giả (VD: Cây cam ngọt của tôi, Nguyễn Nhật Ánh, Nhà giả kim)..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FFFDF8] border-2 border-[#382215] text-xs font-semibold text-[#382215] placeholder:text-[#6E472B]/70 shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl bg-[#C8532B] hover:bg-[#A63E1B] disabled:opacity-60 text-white font-black text-xs border-2 border-[#382215] shadow-[2px_2px_0px_#382215] flex items-center gap-1.5 cursor-pointer shrink-0 active:translate-x-[1px] active:translate-y-[1px] transition"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>{isLoading ? 'Đang tìm...' : 'Tra Cứu'}</span>
          </button>
        </form>
      </div>

      {/* Quick Search Preset Tags */}
      <div className="flex items-center gap-2 flex-wrap pt-0.5">
        <span className="text-[10px] font-black uppercase text-[#8C3B1E]">Gợi ý tra cứu ban đầu:</span>
        {['Cây cam ngọt của tôi', 'Hoàng tử bé', 'Nhà giả kim', 'Nguyễn Nhật Ánh', 'Atomic Habits', 'Khuyến học', 'Sơn Nam'].map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => {
              setQuery(tag);
              // Trigger local search directly
              const clean = tag.toLowerCase();
              const m = INITIAL_BOOK_VAULT.find(b => 
                b.keywords.some(k => clean.includes(k) || k.includes(clean)) ||
                b.title.toLowerCase().includes(clean)
              );
              if (m) {
                setResultText(
                  `📖 **Tác phẩm:** ${m.title}\n✍️ **Tác giả:** ${m.author}\n\n📌 **Giới thiệu tóm tắt:**\n${m.intro}\n\n💡 **Giá trị & Thông điệp cốt lõi:**\n${m.coreValue}\n\n🎯 **Gợi ý thảo luận cho buổi sinh hoạt CLB AGU:**\n${m.discussion}`
                );
                setSources([
                  { title: 'Thư viện Tủ Sách Khai Sáng CLB Đọc Sách AGU', uri: '#' }
                ]);
                setSourceBadge('Dữ Liệu Thư Viện Ban Đầu CLB AGU');
              }
            }}
            className="px-2.5 py-1 rounded-lg bg-[#FFFDF8] hover:bg-[#F2E5C9] text-[11px] font-bold text-[#382215] border border-[#382215]/30 cursor-pointer transition shadow-2xs"
          >
            {tag}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-400 text-rose-900 text-xs font-bold flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {resultText && (
        <div className="p-4 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215] space-y-3 text-xs text-[#382215] shadow-[3px_3px_0px_#382215] animate-in fade-in">
          <div className="flex items-center justify-between border-b border-[#382215]/15 pb-2">
            <div className="flex items-center gap-2">
              <BookCheck className="w-4 h-4 text-[#245351]" />
              <span className="font-black text-[#245351] uppercase tracking-wider text-[11px]">
                {sourceBadge}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setResultText(null);
                setSources([]);
              }}
              className="text-[#6E472B] hover:text-[#382215] cursor-pointer flex items-center gap-1 font-bold"
            >
              <X className="w-3.5 h-3.5" />
              <span>Đóng</span>
            </button>
          </div>

          <div className="whitespace-pre-line leading-relaxed text-[#382215] font-medium">
            {resultText}
          </div>

          {sources.length > 0 && (
            <div className="pt-2 border-t border-[#382215]/15 space-y-1.5">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#8C3B1E]">
                Nguồn tham chiếu:
              </div>
              <div className="flex flex-wrap gap-2">
                {sources.map((src, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F2E5C9] border border-[#382215]/30 text-[11px] font-bold text-[#382215]"
                  >
                    <BookOpen className="w-3 h-3 text-[#C8532B]" />
                    <span className="truncate max-w-[280px]">{src.title}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

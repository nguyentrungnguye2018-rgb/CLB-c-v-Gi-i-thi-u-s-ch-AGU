import React, { useState } from 'react';
import { 
  Vault, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  PlusCircle, 
  Download, 
  Lock, 
  ShieldCheck, 
  Receipt, 
  Filter, 
  Search, 
  FileSpreadsheet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  X,
  Sparkles,
  Calendar,
  Camera,
  Upload,
  Image as ImageIcon,
  Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Transaction, UserProfile } from '../types';
import { MASTER_PASSCODE } from '../data/mockData';
import { isClubPresidentUser, isClubVicePresidentUser, isMasterRootUser } from '../utils/governance';

interface FinancialVaultSectionProps {
  currentUser: UserProfile;
  transactions: Transaction[];
  isBcnMode: boolean;
  onUnlockBcn: (passcode: string) => boolean;
  onAddTransaction: (newTx: Omit<Transaction, 'id'>) => void;
  onOpenAuthModal: () => void;
}

export const FinancialVaultSection: React.FC<FinancialVaultSectionProps> = ({
  currentUser,
  transactions,
  isBcnMode,
  onUnlockBcn,
  onAddTransaction,
  onOpenAuthModal
}) => {
  const [passcodeInput, setPasscodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Transaction form
  const [newType, setNewType] = useState<'income' | 'expense'>('expense');
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState<number>(150000);
  const [newCategory, setNewCategory] = useState<Transaction['category']>('Mua sách mới');
  const [newPerformedBy, setNewPerformedBy] = useState(`${currentUser.name} (${currentUser.department})`);
  const [newNote, setNewNote] = useState('');
  const [newReceiptImage, setNewReceiptImage] = useState<string>('');
  const [previewReceiptTx, setPreviewReceiptTx] = useState<Transaction | null>(null);
  const receiptFileInputRef = React.useRef<HTMLInputElement>(null);

  // Calculations
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const currentBalance = totalIncome - totalExpense;

  // Filtered transactions
  const filteredList = transactions.filter(t => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesSearch = t.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                          t.category.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                          t.receiptCode.toLowerCase().includes(searchKeyword.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Category breakdown for expense distribution bar
  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInput.trim() === MASTER_PASSCODE) {
      onUnlockBcn(passcodeInput);
      setErrorMsg('');
      setPasscodeInput('');
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.5 }
      });
    } else {
      setErrorMsg('Mã xác thực không đúng. Vui lòng kiểm tra lại.');
    }
  };

  const handleCreateTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || newAmount <= 0) return;

    const receiptPrefix = newType === 'income' ? 'PT' : 'PC';
    const randomCode = Math.floor(100 + Math.random() * 900);
    const receiptCode = `${receiptPrefix}-2026-${randomCode}`;

    onAddTransaction({
      type: newType,
      title: newTitle,
      amount: Number(newAmount),
      category: newCategory,
      date: new Date().toLocaleDateString('vi-VN'),
      performedBy: newPerformedBy,
      approvedBy: 'ThS. Huỳnh Bảo Anh (Chủ nhiệm CLB)',
      receiptCode,
      note: newNote,
      receiptImage: newReceiptImage || undefined
    });

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });

    setIsModalOpen(false);
    setNewTitle('');
    setNewNote('');
    setNewReceiptImage('');
  };

  const exportFinancialReport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Mã phiếu,Loại,Hạng mục,Nội dung,Số tiền (VNĐ),Ngày,Người lập\n"
      + transactions.map(t => `"${t.receiptCode}","${t.type === 'income' ? 'Thu' : 'Chi'}","${t.category}","${t.title}","${t.amount}","${t.date}","${t.performedBy}"`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BaoCao_QuyCLB_AGU_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const isPresident = isClubPresidentUser(currentUser);
  const isVicePresident = isClubVicePresidentUser(currentUser);
  const isRoot = isMasterRootUser(currentUser);
  const isSubDeptLeader = currentUser.departmentRole === 'leader' || currentUser.departmentRole === 'vice_leader' || currentUser.role === 'lead';
  const canAddExpense = isPresident || isVicePresident || isRoot || isSubDeptLeader || isBcnMode;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header - Khối cứng mềm mại */}
      <div className="rounded-3xl p-6 sm:p-8 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E5A140] text-[#382215] text-xs font-black border-2 border-[#382215] shadow-[2px_2px_0px_#382215]">
            <ShieldCheck className="w-4 h-4 text-[#382215]" />
            <span>Két Quỹ CLB • Công Khai & Minh Bạch 100%</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#382215] font-serif-vintage tracking-tight">
            Két Quỹ & Quản Lý Ngân Sách CLB
          </h2>
          <p className="text-xs sm:text-sm text-[#5C432C] leading-relaxed font-medium">
            Toàn bộ nguồn thu chi, hội phí, tiền mua sách mới tại Thư viện AGU và tài trợ đều được <strong>công khai minh bạch cho toàn thể thành viên xem xét và đối soát</strong>. Quyền lập phiếu chi thuộc về Trưởng/Phó Ban và Ban Chủ Nhiệm.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={exportFinancialReport}
            className="px-4 py-2.5 rounded-xl bg-[#FFFDF8] hover:bg-[#F2E5C9] text-[#382215] border-2 border-[#382215] text-xs sm:text-sm font-black flex items-center gap-2 shadow-[3px_3px_0px_#382215] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#382215] cursor-pointer transition"
          >
            <Download className="w-4 h-4 text-[#245351]" />
            <span>Xuất Báo Cáo CSV</span>
          </button>
          {canAddExpense ? (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-[#C8532B] hover:bg-[#A63E1B] text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-[3px_3px_0px_#382215] border-2 border-[#382215] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#382215] cursor-pointer transition"
            >
              <PlusCircle className="w-4 h-4 text-[#FFE29A]" />
              <span>Tạo Phiếu Thu / Chi Mới</span>
            </button>
          ) : (
            <div className="px-4 py-2 rounded-xl bg-[#F2E5C9] border-2 border-[#382215] text-[#382215] text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_#382215]">
              <ShieldCheck className="w-4 h-4 text-[#245351]" />
              <span>Chế độ: Thành viên quan sát & đối soát</span>
            </div>
          )}
        </div>
      </div>

      {/* Financial Metrics Cards - Khối cứng mềm mại */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Net Balance */}
        <div className="rounded-2xl p-5 border-2 border-[#382215] bg-[#F2E5C9] shadow-[4px_4px_0px_#382215] space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-[#245351]">
            <span>Số Dư Quỹ Hiện Có</span>
            <Vault className="w-5 h-5 text-[#245351]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#1E3A24] tabular-nums">
            {formatVND(currentBalance)}
          </div>
          <p className="text-[11px] text-[#245351] font-bold">
            Sẵn sàng cho chuỗi hoạt động Tháng 11
          </p>
        </div>

        {/* Total Income */}
        <div className="rounded-2xl p-5 border-2 border-[#382215] bg-[#FFFDF8] shadow-[4px_4px_0px_#382215] space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-[#486A39]">
            <span>Tổng Thu Vào</span>
            <div className="w-7 h-7 rounded-lg bg-[#E5F0E4] border border-[#382215] flex items-center justify-center text-[#486A39] shadow-2xs">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#486A39] tabular-nums">
            {formatVND(totalIncome)}
          </div>
          <p className="text-[11px] text-[#6E472B] font-semibold">
            Gồm hội phí & tài trợ cựu sinh viên
          </p>
        </div>

        {/* Total Expense */}
        <div className="rounded-2xl p-5 border-2 border-[#382215] bg-[#FFFDF8] shadow-[4px_4px_0px_#382215] space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-[#C8532B]">
            <span>Tổng Đã Chi Ra</span>
            <div className="w-7 h-7 rounded-lg bg-[#FBECE6] border border-[#382215] flex items-center justify-center text-[#C8532B] shadow-2xs">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#C8532B] tabular-nums">
            {formatVND(totalExpense)}
          </div>
          <p className="text-[11px] text-[#8C3B1E] font-semibold">
            Mua sách mới, in ấn, teabreak
          </p>
        </div>

        {/* Reserve Fund for Books */}
        <div className="rounded-2xl p-5 border-2 border-[#382215] bg-[#FFFDF8] shadow-[4px_4px_0px_#382215] space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-[#245351]">
            <span>Chi Mua Sách Mới</span>
            <Receipt className="w-5 h-5 text-[#245351]" />
          </div>
          <div className="text-2xl font-black text-[#245351] tabular-nums">
            {formatVND(transactions.filter(t => t.category === 'Mua sách mới').reduce((acc, curr) => acc + curr.amount, 0))}
          </div>
          <p className="text-[11px] text-[#245351] font-semibold">
            Tổng số chứng từ: {transactions.length} phiếu
          </p>
        </div>
      </div>

      {/* Artistic Interactive Balance Scale & Audit Seal (Cán Cân Tài Chính Thu - Chi & Con Dấu Triện) */}
      <div className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-lg">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5A140] text-[#382215] text-[11px] font-black uppercase border border-[#382215] shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#382215]" />
            <span>Cán Cân Ngân Sách Đối Soát Cổ Điển</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black font-serif-vintage text-[#382215]">
            Cán Cân Thu - Chi Minh Bạch Tuyệt Đối
          </h3>
          <p className="text-xs text-[#5C432C] leading-relaxed font-medium">
            Mọi khoản thu hội phí, tiền sách và chi phí tổ chức đều được cân đối chính xác đến từng đồng. Khi có phiếu thu chi mới, cán cân tự động cập nhật góc nghiêng đối soát thực tế.
          </p>
          <div className="pt-2 flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold">
              Thu: {formatVND(totalIncome)}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-900 border border-rose-300 text-xs font-bold">
              Chi: {formatVND(totalExpense)}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-950 border border-amber-300 text-xs font-black">
              Thặng dư: {formatVND(currentBalance)}
            </span>
          </div>
        </div>

        {/* Vintage SVG Balance Scale Graphic */}
        <div className="flex flex-col items-center justify-center p-4 bg-[#F2E5C9] rounded-2xl border-2 border-[#382215] shadow-[3px_3px_0px_#382215] w-full sm:w-80 shrink-0">
          <div className="text-[11px] font-black text-[#8C3B1E] uppercase tracking-wider mb-1">
            Góc Cân Đối Ngân Sách CLB
          </div>
          <div className="w-52 h-32 flex items-center justify-center relative">
            <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
              {/* Fulcrum Base */}
              <polygon points="100,60 85,115 115,115" fill="#382215" stroke="#245351" strokeWidth="2" />
              <circle cx="100" cy="60" r="6" fill="#E5A140" stroke="#382215" strokeWidth="2" />

              {/* Tilted Balance Arm */}
              {(() => {
                const diff = totalIncome - totalExpense;
                const total = totalIncome + totalExpense || 1;
                const tilt = Math.max(-12, Math.min(12, (diff / total) * 15));
                return (
                  <g transform={`rotate(${tilt}, 100, 60)`} className="transition-transform duration-700">
                    <line x1="20" y1="60" x2="180" y2="60" stroke="#382215" strokeWidth="5" strokeLinecap="round" />
                    {/* Left pan (Income / Thu) */}
                    <line x1="30" y1="60" x2="20" y2="90" stroke="#382215" strokeWidth="1.5" />
                    <line x1="30" y1="60" x2="40" y2="90" stroke="#382215" strokeWidth="1.5" />
                    <ellipse cx="30" cy="92" rx="22" ry="6" fill="#486A39" stroke="#382215" strokeWidth="2" />
                    {/* Right pan (Expense / Chi) */}
                    <line x1="170" y1="60" x2="160" y2="90" stroke="#382215" strokeWidth="1.5" />
                    <line x1="170" y1="60" x2="180" y2="90" stroke="#382215" strokeWidth="1.5" />
                    <ellipse cx="170" cy="92" rx="22" ry="6" fill="#C8532B" stroke="#382215" strokeWidth="2" />
                  </g>
                );
              })()}
            </svg>
          </div>
          <div className="flex items-center justify-between w-full text-[10px] font-black text-[#382215] px-2 pt-1 border-t border-[#382215]/20">
            <span className="text-[#486A39]">▲ Thu vào ({totalIncome > 0 ? Math.round((totalIncome / (totalIncome + totalExpense || 1)) * 100) : 0}%)</span>
            <span className="text-[#C8532B]">▼ Chi ra ({totalExpense > 0 ? Math.round((totalExpense / (totalIncome + totalExpense || 1)) * 100) : 0}%)</span>
          </div>
        </div>
      </div>

      {/* Expense Allocation Distribution Bar - Khối cứng mềm mại */}
      <div className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[5px_5px_0px_#382215] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-sm sm:text-base text-[#382215] font-serif-vintage flex items-center gap-2">
            <PieChart className="w-5 h-5 text-[#245351]" />
            <span>Cơ Cấu Phân Bổ Chi Tiêu Hoạt Động</span>
          </h3>
          <span className="text-xs font-black text-[#C8532B]">Tổng chi: {formatVND(totalExpense)}</span>
        </div>
        <div className="w-full bg-[#FFFDF8] rounded-2xl h-5 overflow-hidden flex border-2 border-[#382215] shadow-inner">
          {Object.entries(expenseByCategory).map(([cat, amount], idx) => {
            const percent = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
            const colors = ['bg-[#245351]', 'bg-[#C8532B]', 'bg-[#E5A140]', 'bg-[#486A39]', 'bg-[#8C3B1E]'];
            const colorClass = colors[idx % colors.length];
            return (
              <div
                key={cat}
                style={{ width: `${percent}%` }}
                className={`${colorClass} h-full transition-all duration-500 border-r border-[#382215]/30 last:border-r-0`}
                title={`${cat}: ${formatVND(amount)} (${percent.toFixed(1)}%)`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {Object.entries(expenseByCategory).map(([cat, amount], idx) => {
            const percent = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : 0;
            const dotColors = ['bg-[#245351]', 'bg-[#C8532B]', 'bg-[#E5A140]', 'bg-[#486A39]', 'bg-[#8C3B1E]'];
            return (
              <div key={cat} className="flex items-center gap-1.5 font-bold">
                <span className={`w-3.5 h-3.5 rounded-full border border-[#382215] ${dotColors[idx % dotColors.length]}`} />
                <span className="text-[#5C432C]">{cat}:</span>
                <span className="text-[#382215]">{formatVND(amount)} ({percent}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ledger & Transactions Table - Khối cứng mềm mại */}
      <div className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] space-y-4">
        {/* Controls bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-[#FFFDF8] p-1.5 rounded-2xl border-2 border-[#382215] shadow-[2px_2px_0px_#382215]">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                filterType === 'all' ? 'bg-[#382215] text-[#FAF3E3]' : 'text-[#6E472B] hover:text-[#382215]'
              }`}
            >
              Tất cả ({transactions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('income')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                filterType === 'income' ? 'bg-[#486A39] text-white' : 'text-[#6E472B] hover:text-[#382215]'
              }`}
            >
              Thu (+)
            </button>
            <button
              type="button"
              onClick={() => setFilterType('expense')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                filterType === 'expense' ? 'bg-[#C8532B] text-white' : 'text-[#6E472B] hover:text-[#382215]'
              }`}
            >
              Chi (-)
            </button>
          </div>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E472B]" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm theo nội dung, mã phiếu..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215] text-xs font-bold text-[#382215] focus:outline-none focus:border-[#C8532B] shadow-[2px_2px_0px_#382215]"
            />
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-3.5">
          {filteredList.map((tx) => (
            <div
              key={tx.id}
              className="bg-[#FFFDF8] p-4.5 rounded-2xl border-2 border-[#382215] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:shadow-[5px_5px_0px_#382215] hover:-translate-y-0.5 transition shadow-[3px_3px_0px_#382215]"
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-[#382215] shadow-2xs ${
                  tx.type === 'income' 
                    ? 'bg-[#E5F0E4] text-[#486A39]' 
                    : 'bg-[#FBECE6] text-[#C8532B]'
                }`}>
                  {tx.type === 'income' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-sm text-[#382215]">{tx.title}</span>
                    <span className="font-mono text-[10px] font-bold bg-[#FAF3E3] px-2 py-0.5 rounded border border-[#382215] text-[#382215]">
                      {tx.receiptCode}
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#245351] text-[#FFE29A]">
                      {tx.category}
                    </span>
                  </div>

                  <p className="text-[#6E472B] font-medium text-xs">
                    Ngày: {tx.date} • Người lập: <strong>{tx.performedBy}</strong> • Phê duyệt: {tx.approvedBy}
                  </p>

                  {tx.note && (
                    <p className="text-[#8C3B1E] italic text-xs">
                      Ghi chú: {tx.note}
                    </p>
                  )}

                  {tx.receiptImage && (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewReceiptTx(tx)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF3E3] hover:bg-[#F2E5C9] text-[#382215] text-[11px] font-black border-2 border-[#382215] shadow-[2px_2px_0px_#382215] transition cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-[#C8532B]" />
                        <span>Xem Biên Lai / Hóa Đơn Chụp</span>
                        <Eye className="w-3 h-3 text-[#245351]" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0 self-end sm:self-center">
                <div className={`text-base sm:text-lg font-black tabular-nums ${
                  tx.type === 'income' ? 'text-[#486A39]' : 'text-[#C8532B]'
                }`}>
                  {tx.type === 'income' ? '+' : '-'}{formatVND(tx.amount)}
                </div>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  {tx.receiptImage && (
                    <span className="text-[10px] font-black text-[#245351] bg-[#FAF3E3] border border-[#382215] px-2 py-0.5 rounded">
                      Đã kèm biên lai
                    </span>
                  )}
                  <span className="text-[10px] text-[#6E472B] font-semibold">Đã kiểm toán BCN</span>
                </div>
              </div>
            </div>
          ))}

          {filteredList.length === 0 && (
            <div className="text-center py-8 text-xs text-stone-500">
              Không tìm thấy giao dịch tài chính phù hợp với từ khóa.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create New Receipt / Voucher */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FAF7F0] rounded-2xl border-2 border-[#5E936B]/50 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-[#24432B] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-base font-serif-vintage">
                  Tạo Phiếu Thu / Chi Ngân Sách CLB
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTx} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-[#23432B] mb-1">Loại chứng từ *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewType('income')}
                    className={`py-2 rounded-xl font-bold border transition cursor-pointer ${
                      newType === 'income'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-white text-stone-600 border-stone-300'
                    }`}
                  >
                    Phiếu Thu (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('expense')}
                    className={`py-2 rounded-xl font-bold border transition cursor-pointer ${
                      newType === 'expense'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                        : 'bg-white text-stone-600 border-stone-300'
                    }`}
                  >
                    Phiếu Chi (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#23432B] mb-1">Nội dung thu / chi *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Mua 10 cuốn 'Hoàng Tử Bé' tặng học sinh nghèo..."
                  className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-2 focus:ring-[#3B6E47]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#23432B] mb-1">Số tiền (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    step={1000}
                    value={newAmount}
                    onChange={(e) => setNewAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs font-bold text-[#1F3D26] focus:ring-2 focus:ring-[#3B6E47]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#23432B] mb-1">Hạng mục chi *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-2 focus:ring-[#3B6E47]"
                  >
                    <option value="Quỹ hội phí">Quỹ hội phí</option>
                    <option value="Mua sách mới">Mua sách mới</option>
                    <option value="Tổ chức Talkshow">Tổ chức Talkshow</option>
                    <option value="In ấn & Quà tặng">In ấn & Quà tặng</option>
                    <option value="Tài trợ & Quyên góp">Tài trợ & Quyên góp</option>
                    <option value="Tiệc trà & Teabreak">Tiệc trà & Teabreak</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#23432B] mb-1">Người thực hiện</label>
                <input
                  type="text"
                  value={newPerformedBy}
                  onChange={(e) => setNewPerformedBy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-2 focus:ring-[#3B6E47]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#23432B] mb-1">Ghi chú chứng từ</label>
                <textarea
                  rows={2}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Hóa đơn bán lẻ số ..., đơn vị cung cấp..."
                  className="w-full px-3 py-2 rounded-xl border border-[#C5BCAB] bg-white text-xs focus:ring-2 focus:ring-[#3B6E47]"
                />
              </div>

              {/* Chụp & Đính kèm biên lai / hóa đơn */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-amber-800" />
                    <span className="font-bold text-xs text-amber-950">Chụp / Đính Kèm Biên Lai & Hóa Đơn Thu Chi</span>
                  </div>
                  {newReceiptImage && (
                    <button
                      type="button"
                      onClick={() => setNewReceiptImage('')}
                      className="text-[11px] text-rose-600 hover:underline font-semibold"
                    >
                      Xóa ảnh
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={receiptFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          setNewReceiptImage(reader.result);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />

                {newReceiptImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-amber-300 max-h-48 bg-stone-900 flex items-center justify-center">
                    <img
                      src={newReceiptImage}
                      alt="Receipt preview"
                      className="max-h-48 w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => receiptFileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/60 text-white text-[11px] font-semibold hover:bg-black/80 flex items-center gap-1"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Đổi ảnh khác</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => receiptFileInputRef.current?.click()}
                    className="w-full py-3 px-4 border-2 border-dashed border-amber-300 rounded-xl bg-white hover:bg-amber-50/50 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer text-amber-900"
                  >
                    <Upload className="w-5 h-5 text-amber-700" />
                    <span className="font-bold text-xs">Chụp ảnh biên lai bằng Camera hoặc tải ảnh từ máy</span>
                    <span className="text-[10px] text-amber-700/80">Lưu giữ chứng từ minh bạch cho BCN và nhà trường</span>
                  </button>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#DFD6C3]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#23432B] hover:bg-[#1B3522] text-white font-bold bubble-3d shadow-md cursor-pointer"
                >
                  Lưu & Tạo Phiếu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal: View Receipt Image */}
      {previewReceiptTx && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative bg-[#FAF7F0] rounded-2xl border-2 border-emerald-600 shadow-2xl max-w-xl w-full max-h-[92vh] overflow-hidden flex flex-col">
            <div className="bg-[#1C3621] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-amber-300" />
                <div>
                  <h4 className="font-bold text-sm font-serif-vintage">
                    Hóa Đơn / Biên Lai: {previewReceiptTx.receiptCode}
                  </h4>
                  <p className="text-[11px] text-emerald-200/80">
                    {previewReceiptTx.title} • {formatVND(previewReceiptTx.amount)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewReceiptTx(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-stone-900/10">
              {previewReceiptTx.receiptImage ? (
                <img
                  src={previewReceiptTx.receiptImage}
                  alt={previewReceiptTx.title}
                  className="max-h-[60vh] w-auto max-w-full rounded-xl object-contain shadow-lg border border-stone-200"
                />
              ) : (
                <div className="text-center py-10 text-stone-500 text-xs">
                  Không có hình ảnh biên lai đính kèm.
                </div>
              )}
            </div>

            <div className="p-3 bg-[#EFE9DA] border-t border-[#DED4C3] flex items-center justify-between text-xs text-[#2A4B31] shrink-0">
              <span>Người lập: <strong>{previewReceiptTx.performedBy}</strong> ({previewReceiptTx.date})</span>
              <button
                type="button"
                onClick={() => setPreviewReceiptTx(null)}
                className="px-4 py-1.5 rounded-xl bg-[#23432B] text-white font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

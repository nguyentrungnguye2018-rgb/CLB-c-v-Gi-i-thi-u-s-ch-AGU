import React, { useState } from 'react';
import { 
  Vault, 
  PieChart, 
  PlusCircle, 
  Download, 
  ShieldCheck, 
  Receipt, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  X,
  Sparkles,
  Camera,
  Upload,
  Image as ImageIcon,
  Eye,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  History,
  PenTool,
  BellRing
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Transaction, UserProfile } from '../types';
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
  onAddTransaction,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State cho Tạo mới & Chỉnh sửa phiếu
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [newType, setNewType] = useState<'income' | 'expense'>('expense');
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState<number>(150000);
  const [newCategory, setNewCategory] = useState<Transaction['category']>('Mua sách mới');
  const [newSignerName, setNewSignerName] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newReceiptImage, setNewReceiptImage] = useState<string>('');
  const [previewReceiptTx, setPreviewReceiptTx] = useState<Transaction | null>(null);
  const receiptFileInputRef = React.useRef<HTMLInputElement>(null);

  // State cho Hộp thoại xác nhận 2 lớp
  const [confirmSavePayload, setConfirmSavePayload] = useState<any | null>(null);

  // State cho Duyệt xóa chéo 2 chiều
  const [deleteTargetTx, setDeleteTargetTx] = useState<any | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [localTxOverrides, setLocalTxOverrides] = useState<Record<string, any>>({});
  const [deletedIdsLocal, setDeletedIdsLocal] = useState<string[]>([]);
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  // Phân quyền Chủ nhiệm, Phó Chủ nhiệm & Tài khoản Chính CLB
  const isRoot = isMasterRootUser(currentUser);
  const isPresident = isClubPresidentUser(currentUser) || isRoot || isBcnMode;
  const isVicePresident =
    isClubVicePresidentUser(currentUser) ||
    (currentUser.position || '').toLowerCase().includes('phó chủ nhiệm');
  const canManageFund = isPresident || isVicePresident;

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Hợp nhất dữ liệu giao dịch
  const mergedTransactions: any[] = transactions
    .filter((t) => !deletedIdsLocal.includes(t.id))
    .map((t) => (localTxOverrides[t.id] ? { ...t, ...localTxOverrides[t.id] } : t));

  // Tính toán tổng thu chi
  const totalIncome = mergedTransactions
    .filter((t) => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = mergedTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const currentBalance = totalIncome - totalExpense;

  // Lọc danh sách giao dịch
  const filteredList = mergedTransactions.filter((t) => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesSearch =
      t.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      t.category.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      t.receiptCode.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (t.performedBy || '').toLowerCase().includes(searchKeyword.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Phân bổ chi tiêu
  const expenseByCategory = mergedTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

  // Đồng bộ danh sách giao dịch lên Firestore
  const syncTransactionsToServer = async (updatedList: any[]) => {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'transactions', data: updatedList })
      });
    } catch (err) {
      console.error('Lỗi đồng bộ quỹ lên server:', err);
    }
  };

  // Hàm gửi Notification kiểm chéo tới Phó Chủ nhiệm / Chủ nhiệm / Admin chính chủ
  const dispatchCrossCheckNotification = async (params: {
    actionType: 'create' | 'edit' | 'request_delete' | 'approved_delete';
    receiptCode: string;
    txTitle: string;
    amount: number;
    actorIdentity: string;
    recipientLabel: string;
    detailNote?: string;
  }) => {
    const actionTitles = {
      create: `[Kiểm chéo Quỹ] Phiếu thu/chi mới: ${params.receiptCode}`,
      edit: `[Kiểm chéo Quỹ] Chỉnh sửa chứng từ: ${params.receiptCode}`,
      request_delete: `[Cần duyệt xóa Quỹ] Phiếu ${params.receiptCode} chờ xác nhận`,
      approved_delete: `[Đã duyệt xóa Quỹ] Hoàn tất xóa phiếu ${params.receiptCode}`
    };

    const actionDescriptions = {
      create: `Kính gửi ${params.recipientLabel}: ${params.actorIdentity} vừa lập phiếu "${params.txTitle}" (${formatVND(params.amount)}). Vui lòng kiểm tra đối soát tại Két Quỹ CLB.`,
      edit: `Kính gửi ${params.recipientLabel}: ${params.actorIdentity} vừa chỉnh sửa phiếu "${params.txTitle}" (${formatVND(params.amount)}). ${params.detailNote || ''} Vui lòng kiểm tra lại lịch sử lưu vết.`,
      request_delete: `Kính gửi ${params.recipientLabel}: ${params.actorIdentity} đề nghị xóa phiếu "${params.txTitle}" (${formatVND(params.amount)}). Lý do: ${params.detailNote || 'Nhập nhầm số liệu'}. Vui lòng vào Két Quỹ CLB để duyệt xóa chéo.`,
      approved_delete: `${params.actorIdentity} đã xác nhận đồng ý xóa phiếu "${params.txTitle}" (${formatVND(params.amount)}) khỏi sổ quỹ CLB.`
    };

    const noticeTitle = actionTitles[params.actionType];
    const noticeContent = actionDescriptions[params.actionType];

    // 1. Gửi thông báo lên hệ thống thông báo toàn CLB (hiển thị ngay trên banner & chuông thông báo)
    try {
      await fetch('/api/emergency-notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noticeTitle,
          content: noticeContent,
          targetRoles: ['bcn_admin', 'president', 'vice_president', 'master_root'],
          category: 'financial_cross_check',
          issuedBy: params.actorIdentity
        })
      });
    } catch (err) {
      console.error('Lỗi gửi thông báo kiểm chéo lên server:', err);
    }

    // 2. Kích hoạt thông báo đẩy trên trình duyệt (nếu thiết bị đã cấp quyền)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(noticeTitle, { body: noticeContent });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            new Notification(noticeTitle, { body: noticeContent });
          }
        });
      }
    }

    // 3. Hiển thị xác nhận ngay trên màn hình người thao tác
    setToastBanner(`Đã gửi thông báo kiểm chéo tới ${params.recipientLabel}!`);
    setTimeout(() => setToastBanner(null), 5000);
  };

  // Xác định bên nhận thông báo kiểm chéo dựa theo vai trò người đang thao tác
  const getCrossCheckRecipientLabel = () => {
    if (isVicePresident && !isPresident) {
      return 'Chủ nhiệm CLB & Tài khoản Chính CLB';
    }
    if (isPresident && !isRoot) {
      return 'Phó Chủ nhiệm CLB & Tài khoản Chính CLB';
    }
    return 'Chủ nhiệm CLB & Phó Chủ nhiệm CLB';
  };

  const openCreateModal = () => {
    setEditingTx(null);
    setNewType('expense');
    setNewTitle('');
    setNewAmount(150000);
    setNewCategory('Mua sách mới');
    setNewSignerName('');
    setNewNote('');
    setNewReceiptImage('');
    setIsModalOpen(true);
  };

  const openEditModal = (tx: any) => {
    setEditingTx(tx);
    setNewType(tx.type);
    setNewTitle(tx.title);
    setNewAmount(tx.amount);
    setNewCategory(tx.category);
    setNewSignerName('');
    setNewNote(tx.note || '');
    setNewReceiptImage(tx.receiptImage || '');
    setIsModalOpen(true);
  };

  const handlePrepareSaveTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || newAmount <= 0) return;
    if (newSignerName.trim().length < 2) {
      alert('Vui lòng tự nhập đầy đủ Họ và Tên của bạn vào ô Ký tên xác nhận!');
      return;
    }

    const roleLabel = isRoot
      ? 'Tài khoản Chính CLB'
      : isPresident
      ? 'Chủ nhiệm CLB'
      : isVicePresident
      ? 'Phó Chủ nhiệm CLB'
      : currentUser.position || 'BCN';
    const signedIdentity = `${newSignerName.trim()} (${roleLabel})`;
    const nowStr = new Date().toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    if (editingTx) {
      const prevHistory = Array.isArray(editingTx.editHistory) ? editingTx.editHistory : [];
      const diffDetail =
        editingTx.amount !== Number(newAmount)
          ? `Số tiền đổi từ ${formatVND(editingTx.amount)} thành ${formatVND(Number(newAmount))}.`
          : '';
      const updatedTx = {
        ...editingTx,
        type: newType,
        title: newTitle.trim(),
        amount: Number(newAmount),
        category: newCategory,
        note: newNote.trim(),
        receiptImage: newReceiptImage || undefined,
        lastEditedBy: signedIdentity,
        lastEditedAt: nowStr,
        editHistory: [...prevHistory, `Đã chỉnh sửa bởi ${signedIdentity} lúc ${nowStr}`]
      };
      setConfirmSavePayload({ mode: 'edit', tx: updatedTx, diffDetail });
    } else {
      const receiptPrefix = newType === 'income' ? 'PT' : 'PC';
      const randomCode = Math.floor(100 + Math.random() * 900);
      const receiptCode = `${receiptPrefix}-2026-${randomCode}`;

      const newTxPayload = {
        type: newType,
        title: newTitle.trim(),
        amount: Number(newAmount),
        category: newCategory,
        date: new Date().toLocaleDateString('vi-VN'),
        performedBy: signedIdentity,
        approvedBy: `Đã ký xác nhận bởi ${signedIdentity}`,
        receiptCode,
        note: newNote.trim(),
        receiptImage: newReceiptImage || undefined,
        editHistory: []
      };
      setConfirmSavePayload({ mode: 'create', tx: newTxPayload });
    }
  };

  const handleConfirmExecuteSave = async () => {
    if (!confirmSavePayload) return;
    const recipientLabel = getCrossCheckRecipientLabel();

    if (confirmSavePayload.mode === 'create') {
      const createdTx = confirmSavePayload.tx;
      onAddTransaction(createdTx);
      await dispatchCrossCheckNotification({
        actionType: 'create',
        receiptCode: createdTx.receiptCode,
        txTitle: createdTx.title,
        amount: createdTx.amount,
        actorIdentity: createdTx.performedBy,
        recipientLabel
      });
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    } else if (confirmSavePayload.mode === 'edit') {
      const updatedTx = confirmSavePayload.tx;
      setLocalTxOverrides((prev) => ({ ...prev, [updatedTx.id]: updatedTx }));
      const updatedList = mergedTransactions.map((t) => (t.id === updatedTx.id ? updatedTx : t));
      await syncTransactionsToServer(updatedList);
      await dispatchCrossCheckNotification({
        actionType: 'edit',
        receiptCode: updatedTx.receiptCode,
        txTitle: updatedTx.title,
        amount: updatedTx.amount,
        actorIdentity: updatedTx.lastEditedBy,
        recipientLabel,
        detailNote: confirmSavePayload.diffDetail
      });
    }

    setConfirmSavePayload(null);
    setIsModalOpen(false);
    setEditingTx(null);
    setNewTitle('');
    setNewSignerName('');
    setNewNote('');
    setNewReceiptImage('');
  };

  // Đề nghị xóa phiếu -> Gửi thông báo kiểm chéo ngay cho bên còn lại
  const handleRequestCrossDelete = async () => {
    if (!deleteTargetTx) return;
    const requesterRole = isPresident ? 'president' : 'vice_president';
    const targetRoleLabel = getCrossCheckRecipientLabel();
    const actorIdentity = `${currentUser.name} (${
      isRoot ? 'Tài khoản Chính CLB' : isPresident ? 'Chủ nhiệm CLB' : 'Phó Chủ nhiệm CLB'
    })`;
    const nowStr = new Date().toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const pendingDeleteInfo = {
      status: 'pending_delete',
      requestedById: currentUser.id,
      requestedByName: actorIdentity,
      requestedByRole: requesterRole,
      waitingForRole: isPresident ? 'vice_president' : 'president',
      waitingForLabel: targetRoleLabel,
      reason: deleteReason.trim() || 'Nhập nhầm thông tin phiếu',
      requestedAt: nowStr
    };

    const updatedTx = { ...deleteTargetTx, pendingDelete: pendingDeleteInfo };
    setLocalTxOverrides((prev) => ({ ...prev, [deleteTargetTx.id]: updatedTx }));

    const updatedList = mergedTransactions.map((t) => (t.id === deleteTargetTx.id ? updatedTx : t));
    await syncTransactionsToServer(updatedList);
    await dispatchCrossCheckNotification({
      actionType: 'request_delete',
      receiptCode: deleteTargetTx.receiptCode,
      txTitle: deleteTargetTx.title,
      amount: deleteTargetTx.amount,
      actorIdentity,
      recipientLabel: targetRoleLabel,
      detailNote: deleteReason.trim()
    });

    setDeleteTargetTx(null);
    setDeleteReason('');
  };

  // Phê duyệt đồng ý xóa phiếu
  const handleApproveCrossDelete = async (tx: any) => {
    if (
      !window.confirm(
        `Xác nhận đồng ý xóa vĩnh viễn phiếu "${tx.title}" (${formatVND(tx.amount)}) theo đề nghị của ${tx.pendingDelete?.requestedByName}?`
      )
    ) {
      return;
    }

    const approverIdentity = `${currentUser.name} (${
      isRoot ? 'Tài khoản Chính CLB' : isPresident ? 'Chủ nhiệm CLB' : 'Phó Chủ nhiệm CLB'
    })`;

    setDeletedIdsLocal((prev) => [...prev, tx.id]);
    try {
      await fetch('/api/items/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'transactions', itemId: tx.id })
      });
      await dispatchCrossCheckNotification({
        actionType: 'approved_delete',
        receiptCode: tx.receiptCode,
        txTitle: tx.title,
        amount: tx.amount,
        actorIdentity: approverIdentity,
        recipientLabel: tx.pendingDelete?.requestedByName || 'BCN CLB'
      });
    } catch (err) {
      console.error('Lỗi xóa phiếu trên server:', err);
    }
  };

  // Từ chối xóa (Giữ lại phiếu)
  const handleRejectCrossDelete = async (tx: any) => {
    const updatedTx = { ...tx, pendingDelete: null };
    setLocalTxOverrides((prev) => ({ ...prev, [tx.id]: updatedTx }));
    const updatedList = mergedTransactions.map((t) => (t.id === tx.id ? updatedTx : t));
    await syncTransactionsToServer(updatedList);
  };

  const exportFinancialReport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Mã phiếu,Loại,Hạng mục,Nội dung,Số tiền (VNĐ),Ngày,Người lập & Ký xác nhận,Lịch sử chỉnh sửa\n' +
      mergedTransactions
        .map(
          (t) =>
            `"${t.receiptCode}","${t.type === 'income' ? 'Thu' : 'Chi'}","${t.category}","${t.title}","${t.amount}","${t.date}","${t.performedBy}","${(t.editHistory || []).join(' | ')}"`
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BaoCao_QuyCLB_AGU_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner thông báo xác nhận vừa gửi Notification kiểm chéo */}
      {toastBanner && (
        <div className="fixed bottom-5 right-5 z-60 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#245351] text-[#FFE29A] border-2 border-[#382215] shadow-[4px_4px_0px_#382215] text-xs font-black animate-in slide-in-from-bottom-4">
          <BellRing className="w-4 h-4 text-[#E5A140] animate-bounce" />
          <span>{toastBanner}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="rounded-3xl p-6 sm:p-8 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E5A140] text-[#382215] text-xs font-black border-2 border-[#382215] shadow-[2px_2px_0px_#382215]">
            <ShieldCheck className="w-4 h-4 text-[#382215]" />
            <span>Két Quỹ CLB • Công Khai & Kiểm Chéo Tự Động</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#382215] font-serif-vintage tracking-tight">
            Két Quỹ & Quản Lý Ngân Sách CLB
          </h2>
          <p className="text-xs sm:text-sm text-[#5C432C] leading-relaxed font-medium">
            Mọi khoản thu chi đều yêu cầu <strong>người lập tự ký tên xác nhận</strong> và tự động gửi <strong>thông báo kiểm chéo</strong> tới Phó Chủ nhiệm / Chủ nhiệm / Tài khoản Chính CLB để đối soát ngay lập tức.
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
          {canManageFund ? (
            <button
              type="button"
              onClick={openCreateModal}
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

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 border-2 border-[#382215] bg-[#F2E5C9] shadow-[4px_4px_0px_#382215] space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-[#245351]">
            <span>Số Dư Quỹ Hiện Có</span>
            <Vault className="w-5 h-5 text-[#245351]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#1E3A24] tabular-nums">
            {formatVND(currentBalance)}
          </div>
          <p className="text-[11px] text-[#245351] font-bold">
            Sẵn sàng cho các hoạt động của CLB
          </p>
        </div>

        <div className="rounded-2xl p-5 border-2 border-[#382215] bg-[#FFFDF8] shadow-[4px_4px_0px_#382215] space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-[#486A39]">
            <span>Tổng Thu Vào</span>
            <div className="w-7 h-7 rounded-lg bg-[#E5F0E4] border border-[#382215] flex items-center justify-center text-[#486A39]">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#486A39] tabular-nums">
            {formatVND(totalIncome)}
          </div>
          <p className="text-[11px] text-[#6E472B] font-semibold">
            Gồm hội phí & tài trợ hoạt động
          </p>
        </div>

        <div className="rounded-2xl p-5 border-2 border-[#382215] bg-[#FFFDF8] shadow-[4px_4px_0px_#382215] space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-[#C8532B]">
            <span>Tổng Đã Chi Ra</span>
            <div className="w-7 h-7 rounded-lg bg-[#FBECE6] border border-[#382215] flex items-center justify-center text-[#C8532B]">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#C8532B] tabular-nums">
            {formatVND(totalExpense)}
          </div>
          <p className="text-[11px] text-[#8C3B1E] font-semibold">
            Mua sách mới, in ấn, sự kiện
          </p>
        </div>

        <div className="rounded-2xl p-5 border-2 border-[#382215] bg-[#FFFDF8] shadow-[4px_4px_0px_#382215] space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-[#245351]">
            <span>Chi Mua Sách Mới</span>
            <Receipt className="w-5 h-5 text-[#245351]" />
          </div>
          <div className="text-2xl font-black text-[#245351] tabular-nums">
            {formatVND(
              mergedTransactions
                .filter((t) => t.category === 'Mua sách mới')
                .reduce((acc, curr) => acc + curr.amount, 0)
            )}
          </div>
          <p className="text-[11px] text-[#245351] font-semibold">
            Tổng số chứng từ: {mergedTransactions.length} phiếu
          </p>
        </div>
      </div>

      {/* Cán Cân Ngân Sách */}
      <div className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="space-y-

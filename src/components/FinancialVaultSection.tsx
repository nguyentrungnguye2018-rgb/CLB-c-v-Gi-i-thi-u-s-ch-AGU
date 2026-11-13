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

    setToastBanner(`Đã gửi thông báo kiểm chéo tới ${params.recipientLabel}!`);
    setTimeout(() => setToastBanner(null), 5000);
  };

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

      {/* Cán Cân Ngân Sách (ĐÃ SỬA ĐÚNG CHIỀU VẬT LÝ THU - CHI) */}
      <div className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-lg">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5A140] text-[#382215] text-[11px] font-black uppercase border border-[#382215]">
            <Sparkles className="w-3.5 h-3.5 text-[#382215]" />
            <span>Cán Cân Ngân Sách Đối Soát Cổ Điển</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black font-serif-vintage text-[#382215]">
            Cán Cân Thu - Chi Minh Bạch Tuyệt Đối
          </h3>
          <p className="text-xs text-[#5C432C] leading-relaxed font-medium">
            Mọi khoản thu hội phí, tiền sách và chi phí tổ chức đều được cân đối chính xác đến từng đồng. Bên nào giá trị lớn hơn thì đĩa cân bên đó tự động trĩu nặng xuống.
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

        <div className="flex flex-col items-center justify-center p-4 bg-[#F2E5C9] rounded-2xl border-2 border-[#382215] shadow-[3px_3px_0px_#382215] w-full sm:w-80 shrink-0">
          <div className="text-[11px] font-black text-[#8C3B1E] uppercase tracking-wider mb-1">
            Góc Cân Đối Ngân Sách CLB
          </div>
          <div className="w-52 h-32 flex items-center justify-center relative">
            <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
              <polygon points="100,60 85,115 115,115" fill="#382215" stroke="#245351" strokeWidth="2" />
              <circle cx="100" cy="60" r="6" fill="#E5A140" stroke="#382215" strokeWidth="2" />
              {(() => {
                // Đảo dấu chuẩn vật lý: Thu lớn hơn (totalIncome > totalExpense) => góc âm => Đĩa Thu bên trái hạ thấp xuống
                const diff = totalExpense - totalIncome;
                const total = totalIncome + totalExpense || 1;
                const tilt = Math.max(-12, Math.min(12, (diff / total) * 15));
                return (
                  <g transform={`rotate(${tilt}, 100, 60)`} className="transition-transform duration-700">
                    <line x1="20" y1="60" x2="180" y2="60" stroke="#382215" strokeWidth="5" strokeLinecap="round" />
                    {/* Đĩa trái: Thu vào */}
                    <line x1="30" y1="60" x2="20" y2="90" stroke="#382215" strokeWidth="1.5" />
                    <line x1="30" y1="60" x2="40" y2="90" stroke="#382215" strokeWidth="1.5" />
                    <ellipse cx="30" cy="92" rx="22" ry="6" fill="#486A39" stroke="#382215" strokeWidth="2" />
                    {/* Đĩa phải: Chi ra */}
                    <line x1="170" y1="60" x2="160" y2="90" stroke="#382215" strokeWidth="1.5" />
                    <line x1="170" y1="60" x2="180" y2="90" stroke="#382215" strokeWidth="1.5" />
                    <ellipse cx="170" cy="92" rx="22" ry="6" fill="#C8532B" stroke="#382215" strokeWidth="2" />
                  </g>
                );
              })()}
            </svg>
          </div>
          <div className="flex items-center justify-between w-full text-[10px] font-black text-[#382215] px-2 pt-1 border-t border-[#382215]/20">
            <span className="text-[#486A39]">
              ▲ Thu vào ({totalIncome > 0 ? Math.round((totalIncome / (totalIncome + totalExpense || 1)) * 100) : 0}%)
            </span>
            <span className="text-[#C8532B]">
              ▼ Chi ra ({totalExpense > 0 ? Math.round((totalExpense / (totalIncome + totalExpense || 1)) * 100) : 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* Expense Allocation Distribution Bar */}
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

      {/* Ledger & Transactions Table */}
      <div className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-[#FFFDF8] p-1.5 rounded-2xl border-2 border-[#382215] shadow-[2px_2px_0px_#382215]">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                filterType === 'all' ? 'bg-[#382215] text-[#FAF3E3]' : 'text-[#6E472B] hover:text-[#382215]'
              }`}
            >
              Tất cả ({mergedTransactions.length})
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
              placeholder="Tìm theo nội dung, mã phiếu, người ký..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FFFDF8] border-2 border-[#382215] text-xs font-bold text-[#382215] focus:outline-none focus:border-[#C8532B] shadow-[2px_2px_0px_#382215]"
            />
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-3.5">
          {filteredList.map((tx) => {
            const pendingDelete = tx.pendingDelete;
            const canApproveDelete =
              pendingDelete &&
              pendingDelete.requestedById !== currentUser.id &&
              ((pendingDelete.waitingForRole === 'president' && isPresident) ||
                (pendingDelete.waitingForRole === 'vice_president' && isVicePresident) ||
                isPresident);

            return (
              <div
                key={tx.id}
                className={`p-4.5 rounded-2xl border-2 border-[#382215] flex flex-col gap-3 text-xs transition shadow-[3px_3px_0px_#382215] ${
                  pendingDelete ? 'bg-amber-50/90 border-amber-600' : 'bg-[#FFFDF8] hover:shadow-[5px_5px_0px_#382215]'
                }`}
              >
                {pendingDelete && (
                  <div className="p-3 rounded-xl bg-amber-100 border-2 border-amber-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start gap-2 text-amber-950">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-black">
                          Đang chờ {pendingDelete.waitingForLabel} duyệt xóa phiếu nhập lộn
                        </p>
                        <p className="text-[11px] font-medium">
                          Người đề nghị: <strong>{pendingDelete.requestedByName}</strong> • Lý do: "{pendingDelete.reason}" ({pendingDelete.requestedAt})
                        </p>
                      </div>
                    </div>
                    {canApproveDelete ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleApproveCrossDelete(tx)}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Đồng ý xóa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectCrossDelete(tx)}
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-[#382215] border border-[#382215] font-bold text-[11px] cursor-pointer"
                        >
                          Giữ lại phiếu
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-black text-amber-800 bg-white/80 px-2.5 py-1 rounded-lg border border-amber-400 self-start sm:self-center">
                        Đã gửi thông báo chờ đối soát
                      </span>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-[#382215] ${
                        tx.type === 'income' ? 'bg-[#E5F0E4] text-[#486A39]' : 'bg-[#FBECE6] text-[#C8532B]'
                      }`}
                    >
                      {tx.type === 'income' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>

                    <div className="space-y-1">
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
                        Ngày lập: <strong>{tx.date}</strong> • Người thực hiện & ký xác nhận:{' '}
                        <strong className="text-[#245351]">{tx.performedBy}</strong>
                      </p>

                      {tx.note && <p className="text-[#8C3B1E] italic text-xs">Ghi chú: {tx.note}</p>}

                      {Array.isArray(tx.editHistory) && tx.editHistory.length > 0 && (
                        <div className="pt-1 space-y-0.5">
                          {tx.editHistory.map((log: string, idx: number) => (
                            <div
                              key={idx}
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#245351] bg-[#E5F0E4]/70 px-2.5 py-0.5 rounded-md border border-[#245351]/30 mr-2"
                            >
                              <History className="w-3 h-3" />
                              <span>{log}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {tx.receiptImage && (
                        <div className="pt-1.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewReceiptTx(tx)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF3E3] hover:bg-[#F2E5C9] text-[#382215] text-[11px] font-black border-2 border-[#382215] shadow-[2px_2px_0px_#382215] transition cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-[#C8532B]" />
                            <span>Xem Biên Lai / Hóa Đơn</span>
                            <Eye className="w-3 h-3 text-[#245351]" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between gap-2 shrink-0 self-end sm:self-center">
                    <div
                      className={`text-base sm:text-lg font-black tabular-nums ${
                        tx.type === 'income' ? 'text-[#486A39]' : 'text-[#C8532B]'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatVND(tx.amount)}
                    </div>

                    {canManageFund && !pendingDelete && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(tx)}
                          className="px-2.5 py-1 rounded-lg bg-[#FAF3E3] hover:bg-[#E5A140]/30 text-[#382215] border border-[#382215] font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                          title="Chỉnh sửa phiếu (Có lưu vết & báo kiểm chéo)"
                        >
                          <Edit3 className="w-3 h-3 text-[#245351]" />
                          <span>Sửa phiếu</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTargetTx(tx);
                            setDeleteReason('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                          title="Báo xóa phiếu nhập lộn (Gửi thông báo duyệt chéo)"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Xóa lộn</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredList.length === 0 && (
            <div className="text-center py-8 text-xs text-stone-500">
              Không tìm thấy giao dịch tài chính phù hợp với từ khóa.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Tạo mới / Chỉnh sửa Phiếu Thu Chi */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FAF7F0] rounded-2xl border-2 border-[#382215] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-[#24432B] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-base font-serif-vintage">
                  {editingTx ? `Chỉnh Sửa Phiếu Quỹ (${editingTx.receiptCode})` : 'Tạo Phiếu Thu / Chi Ngân Sách CLB'}
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

            <form onSubmit={handlePrepareSaveTx} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
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
                  placeholder="Ví dụ: Mua 10 cuốn sách mới cho tủ sách CLB..."
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
                  <label className="block font-bold text-[#23432B] mb-1">Hạng mục *</label>
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

              {/* Ô BẮT BUỘC NGƯỜI NHẬP TỰ GÕ TÊN KÝ XÁC NHẬN */}
              <div className="p-3.5 rounded-xl bg-emerald-50/90 border-2 border-emerald-700/40 space-y-1.5">
                <label className="flex items-center gap-1.5 font-black text-[#1E3A24] text-xs">
                  <PenTool className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Ký tên xác nhận người thực hiện (Tự nhập họ tên bạn) *</span>
                </label>
                <input
                  type="text"
                  required
                  value={newSignerName}
                  onChange={(e) => setNewSignerName(e.target.value)}
                  placeholder="Gõ đầy đủ Họ và Tên của bạn (VD: Nguyễn Trung Nguyên)..."
                  className="w-full px-3 py-2 rounded-xl border-2 border-emerald-700/50 bg-white text-xs font-bold text-[#1E3A24] focus:outline-none focus:border-emerald-800"
                />
                <p className="text-[11px] text-emerald-900/80">
                  Sau khi lưu, hệ thống sẽ tự động gửi thông báo kiểm chéo tới <strong>{getCrossCheckRecipientLabel()}</strong>.
                </p>
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

              {/* Chụp & Đính kèm biên lai */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-amber-800" />
                    <span className="font-bold text-xs text-amber-950">Đính Kèm Biên Lai / Hóa Đơn (Nếu có)</span>
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
                  <div className="relative rounded-xl overflow-hidden border border-amber-300 max-h-40 bg-stone-900 flex items-center justify-center">
                    <img src={newReceiptImage} alt="Receipt preview" className="max-h-40 w-full object-contain" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => receiptFileInputRef.current?.click()}
                    className="w-full py-2.5 px-4 border-2 border-dashed border-amber-300 rounded-xl bg-white hover:bg-amber-50/50 flex flex-col items-center justify-center gap-1 transition cursor-pointer text-amber-900"
                  >
                    <Upload className="w-4 h-4 text-amber-700" />
                    <span className="font-bold text-xs">Chọn hoặc chụp ảnh hóa đơn đính kèm</span>
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
                  className="px-6 py-2.5 rounded-xl bg-[#23432B] hover:bg-[#1B3522] text-white font-bold shadow-md cursor-pointer"
                >
                  Tiếp tục xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hộp thoại xác nhận 2 lớp: "Bạn đã chắc chắn chưa?" */}
      {confirmSavePayload && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#FAF3E3] rounded-2xl border-3 border-[#382215] shadow-[6px_6px_0px_#382215] max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E5A140] border-2 border-[#382215] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#382215]" />
              </div>
              <div>
                <h4 className="font-black text-base text-[#382215] font-serif-vintage">
                  Bạn đã chắc chắn chưa?
                </h4>
                <p className="text-xs text-[#6E472B]">
                  Hệ thống sẽ lưu phiếu và gửi thông báo kiểm chéo tới {getCrossCheckRecipientLabel()}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border-2 border-[#382215] space-y-1.5 text-xs text-[#382215]">
              <div>
                • Loại phiếu:{' '}
                <strong className={confirmSavePayload.tx.type === 'income' ? 'text-[#486A39]' : 'text-[#C8532B]'}>
                  {confirmSavePayload.tx.type === 'income' ? 'Phiếu Thu (+)' : 'Phiếu Chi (-)'}
                </strong>
              </div>
              <div>
                • Nội dung: <strong>{confirmSavePayload.tx.title}</strong>
              </div>
              <div>
                • Số tiền: <strong className="text-sm">{formatVND(confirmSavePayload.tx.amount)}</strong>
              </div>
              <div>
                • Chữ ký xác nhận:{' '}
                <strong className="text-[#245351]">
                  {confirmSavePayload.mode === 'edit' ? confirmSavePayload.tx.lastEditedBy : confirmSavePayload.tx.performedBy}
                </strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setConfirmSavePayload(null)}
                className="px-4 py-2 rounded-xl bg-white border-2 border-[#382215] text-[#382215] font-bold text-xs cursor-pointer hover:bg-stone-100"
              >
                Quay lại sửa
              </button>
              <button
                type="button"
                onClick={handleConfirmExecuteSave}
                className="px-5 py-2 rounded-xl bg-[#245351] hover:bg-[#193B39] text-white border-2 border-[#382215] font-black text-xs cursor-pointer shadow-[2px_2px_0px_#382215]"
              >
                Chắc chắn, lưu & gửi thông báo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Yêu cầu duyệt xóa chéo 2 chiều khi nhập lộn */}
      {deleteTargetTx && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#FAF3E3] rounded-2xl border-3 border-[#382215] shadow-[6px_6px_0px_#382215] max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 border-2 border-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-700" />
              </div>
              <div>
                <h4 className="font-black text-base text-[#382215] font-serif-vintage">
                  Đề Nghị Duyệt Xóa Phiếu Nhập Lộn
                </h4>
                <p className="text-xs text-[#6E472B]">
                  Gửi thông báo kiểm chéo tới {getCrossCheckRecipientLabel()}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#382215] leading-relaxed bg-white p-3 rounded-xl border border-[#382215]">
              Phiếu <strong>"{deleteTargetTx.title}"</strong> ({formatVND(deleteTargetTx.amount)}) sẽ được chuyển sang trạng thái chờ <strong>{getCrossCheckRecipientLabel()}</strong> xác nhận đồng ý trước khi xóa khỏi hệ thống.
            </p>

            <div>
              <label className="block font-bold text-xs text-[#382215] mb-1">Lý do đề nghị xóa phiếu *</label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Ví dụ: Nhập nhầm số tiền hoặc trùng phiếu trước đó..."
                className="w-full px-3 py-2 rounded-xl border-2 border-[#382215] bg-white text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTargetTx(null)}
                className="px-4 py-2 rounded-xl bg-white border-2 border-[#382215] text-[#382215] font-bold text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleRequestCrossDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white border-2 border-[#382215] font-black text-xs cursor-pointer shadow-[2px_2px_0px_#382215]"
              >
                Gửi thông báo duyệt xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal: Xem ảnh biên lai */}
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
              <span>
                Người lập & ký xác nhận: <strong>{previewReceiptTx.performedBy}</strong> ({previewReceiptTx.date})
              </span>
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

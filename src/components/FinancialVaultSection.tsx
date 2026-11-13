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

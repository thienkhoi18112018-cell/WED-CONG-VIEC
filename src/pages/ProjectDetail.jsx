import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  ArrowLeft, CheckCircle, Edit, Trash2, Camera, Download, 
  Copy, Printer, FileSpreadsheet, Filter, Search, RotateCcw, X, Check, Calendar, Lock,
  ArrowRightLeft, FilePlus2
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import PasswordModal from '../components/PasswordModal';
import {
  EXPENSE_CATEGORIES,
  SUB_CONTRACTOR_CATEGORIES,
  EXPENSE_CATEGORY_LIST,
  getExpenseCategoryInfo
} from '../constants/expenseCategories';
import { getProjectYear } from '../utils/yearHelpers';

const VARIATION_STATUS = {
  PENDING: { label: 'Chờ duyệt', badge: 'badge-warning' },
  APPROVED: { label: 'Đã duyệt', badge: 'badge-info' },
  PAID: { label: 'Đã thanh toán', badge: 'badge-success' }
};

const ProjectDetail = () => {
  const { id } = useParams();
  const { 
    role,
    projects, updateProject, 
    addDailyLog, updateDailyLog, removeDailyLog, 
    addTransaction, updateTransaction, removeTransaction,
    addProjectVariation, updateProjectVariation, removeProjectVariation, transferVariationToFinance
  } = useAppContext();
  
  const project = projects.find(p => p?.id?.toString() === id?.toString());

  const [activeTab, setActiveTab] = useState('LOGS'); // 'LOGS' | 'EXTRAS' | 'FINANCE'

  // Khóa nhân viên chỉ được xem và nhập Nhật ký
  useEffect(() => {
    if (role !== 'ADMIN' && activeTab !== 'LOGS') {
      setActiveTab('LOGS');
    }
  }, [role, activeTab]);

  // State Modal Mật Khẩu Két Sắt cho Thu/Chi & Phát sinh
  const [authModal, setAuthModal] = useState({ isOpen: false, action: null, targetItem: null, title: '', desc: '' });
  
  // State form Nhật ký
  const [editingLogId, setEditingLogId] = useState(null);
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [logWork, setLogWork] = useState('');
  const [logWeather, setLogWeather] = useState('Nắng');
  const [logWorkers, setLogWorkers] = useState(1);
  const [logIsWorking, setLogIsWorking] = useState(true);
  const [logImage, setLogImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // State form Thu Chi
  const [editingTransId, setEditingTransId] = useState(null);
  const [transDate, setTransDate] = useState(new Date().toISOString().slice(0, 10));
  const [transType, setTransType] = useState('IN');
  const [expenseCategory, setExpenseCategory] = useState('THO_XAY');
  const [transAmount, setTransAmount] = useState('');
  const [transNote, setTransNote] = useState('');

  // State Bộ lọc Sổ Quỹ Thu/Chi
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');

  // State form Nội dung Phát sinh
  const [editingVarId, setEditingVarId] = useState(null);
  const [varDate, setVarDate] = useState(new Date().toISOString().slice(0, 10));
  const [varTitle, setVarTitle] = useState('');
  const [varType, setVarType] = useState('INCREASE'); // 'INCREASE' | 'DECREASE'
  const [varAmount, setVarAmount] = useState('');
  const [varStatus, setVarStatus] = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'PAID'
  const [varNote, setVarNote] = useState('');
  const [varFilterStatus, setVarFilterStatus] = useState('ALL');
  const [varFilterType, setVarFilterType] = useState('ALL');
  const [varSearch, setVarSearch] = useState('');

  // State Modal chuyển nhanh khoản phát sinh sang Sổ quỹ
  const [transferModal, setTransferModal] = useState({
    isOpen: false,
    variation: null,
    date: new Date().toISOString().slice(0, 10),
    type: 'IN',
    expenseCategory: 'KHAC',
    amount: '',
    note: '',
    markAsPaid: true
  });

  // State xuất PDF
  const [isExporting, setIsExporting] = useState(false);

  // Refs cho xuất PDF
  const reportRef = useRef();

  const calculateProgress = () => {
    if (!project || project.isCompleted) return 100;
    const expectedDays = (project.durationMonths || 1) * 30;
    const workingDaysCount = (project.dailyLogs || []).filter(l => l.isWorking).length;
    return Math.min(Math.round((workingDaysCount / expectedDays) * 100), 99);
  };

  const currentProgress = calculateProgress();
  
  const checkDelay = () => {
    if (!project || project.isCompleted) return false;
    if (!project.startDate || !project.durationMonths) return false;
    const start = new Date(project.startDate);
    const expectedEnd = new Date(start.setMonth(start.getMonth() + project.durationMonths));
    return new Date() > expectedEnd;
  };

  const isDelayed = checkDelay();

  const handleComplete = () => {
    if (window.confirm('Xác nhận công trình đã hoàn thành 100%?')) {
      updateProject(project.id, { isCompleted: true, progress: 100 });
    }
  };

  // Tính toán tổng số liệu Sổ quỹ theo từng phân loại
  const {
    totalIn,
    totalOut,
    countAll,
    countIn,
    countOut,
    totalsByCategory,
    countsByCategory,
    totalSubContractors,
    countSubContractors
  } = useMemo(() => {
    const trans = project?.transactions || [];
    let tIn = 0;
    let tOut = 0;
    let cIn = 0;
    let cOut = 0;
    const catTotals = {};
    const catCounts = {};
    Object.keys(EXPENSE_CATEGORIES).forEach((k) => {
      catTotals[k] = 0;
      catCounts[k] = 0;
    });

    trans.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'IN') {
        tIn += amt;
        cIn += 1;
      } else if (t.type === 'OUT') {
        tOut += amt;
        cOut += 1;
        const catKey = t.expenseCategory && EXPENSE_CATEGORIES[t.expenseCategory] ? t.expenseCategory : 'KHAC';
        catTotals[catKey] += amt;
        catCounts[catKey] += 1;
      }
    });

    const subTotal = SUB_CONTRACTOR_CATEGORIES.reduce((sum, k) => sum + (catTotals[k] || 0), 0);
    const subCount = SUB_CONTRACTOR_CATEGORIES.reduce((sum, k) => sum + (catCounts[k] || 0), 0);

    return {
      totalIn: tIn,
      totalOut: tOut,
      countAll: trans.length,
      countIn: cIn,
      countOut: cOut,
      totalsByCategory: catTotals,
      countsByCategory: catCounts,
      totalSubContractors: subTotal,
      countSubContractors: subCount
    };
  }, [project?.transactions]);

  // Lọc danh sách giao dịch theo Phân loại, Thời gian, Từ khóa
  const filteredTransactions = useMemo(() => {
    return (project?.transactions || [])
      .filter(t => {
        // 1. Lọc theo Phân loại
        if (filterCategory === 'IN') {
          if (t.type !== 'IN') return false;
        } else if (filterCategory === 'SUB_CONTRACTORS') {
          const catKey = t.expenseCategory && EXPENSE_CATEGORIES[t.expenseCategory] ? t.expenseCategory : 'KHAC';
          if (t.type !== 'OUT' || !SUB_CONTRACTOR_CATEGORIES.includes(catKey)) return false;
        } else if (filterCategory !== 'ALL') {
          const catKey = t.expenseCategory && EXPENSE_CATEGORIES[t.expenseCategory] ? t.expenseCategory : 'KHAC';
          if (t.type !== 'OUT' || catKey !== filterCategory) return false;
        }

        // 2. Lọc theo ngày bắt đầu
        if (filterStartDate && t.date < filterStartDate) return false;
        // 3. Lọc theo ngày kết thúc
        if (filterEndDate && t.date > filterEndDate) return false;

        // 4. Tìm kiếm từ khóa
        if (searchKeyword.trim()) {
          const kw = searchKeyword.toLowerCase();
          const matchNote = (t.note || '').toLowerCase().includes(kw);
          const matchAmount = (t.amount || '').toString().includes(kw);
          const catLabel = getExpenseCategoryInfo(t.expenseCategory).label.toLowerCase();
          return matchNote || matchAmount || catLabel.includes(kw);
        }

        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [project?.transactions, filterCategory, filterStartDate, filterEndDate, searchKeyword]);

  // Tính toán thống kê & bộ lọc Nội dung Phát sinh
  const variationStats = useMemo(() => {
    const vars = project?.variations || [];
    let increaseSum = 0;
    let decreaseSum = 0;
    let approvedNet = 0;
    let paidCount = 0;

    vars.forEach((v) => {
      const amt = Number(v.amount) || 0;
      if (v.type === 'DECREASE') {
        decreaseSum += amt;
        if (v.status === 'APPROVED' || v.status === 'PAID') approvedNet -= amt;
      } else {
        increaseSum += amt;
        if (v.status === 'APPROVED' || v.status === 'PAID') approvedNet += amt;
      }
      if (v.status === 'PAID') paidCount += 1;
    });

    const netSum = increaseSum - decreaseSum;
    const baseContract = Number(project?.totalValue) || 0;
    return {
      totalCount: vars.length,
      increaseSum,
      decreaseSum,
      netSum,
      approvedNet,
      paidCount,
      totalAfterVariations: baseContract + netSum
    };
  }, [project?.variations, project?.totalValue]);

  const filteredVariations = useMemo(() => {
    return (project?.variations || [])
      .filter((v) => {
        if (varFilterStatus !== 'ALL' && v.status !== varFilterStatus) return false;
        if (varFilterType !== 'ALL' && v.type !== varFilterType) return false;
        if (varSearch.trim()) {
          const kw = varSearch.toLowerCase();
          const mTitle = (v.title || '').toLowerCase().includes(kw);
          const mNote = (v.note || '').toLowerCase().includes(kw);
          const mAmt = (v.amount || '').toString().includes(kw);
          return mTitle || mNote || mAmt;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [project?.variations, varFilterStatus, varFilterType, varSearch]);

  // Tổng tiền của danh sách đang lọc
  const filteredTotal = useMemo(() => {
    let inSum = 0;
    let outSum = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'IN') inSum += t.amount;
      if (t.type === 'OUT') outSum += t.amount;
    });
    return { inSum, outSum, net: inSum - outSum };
  }, [filteredTransactions]);

  // Nhanh chóng đặt khoảng thời gian
  const setQuickDate = (mode) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    if (mode === 'TODAY') {
      setFilterStartDate(todayStr);
      setFilterEndDate(todayStr);
    } else if (mode === 'WEEK') {
      const dayOfWeek = now.getDay();
      const diffToMonday = (dayOfWeek + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      const mondayStr = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const sundayStr = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;

      setFilterStartDate(mondayStr);
      setFilterEndDate(sundayStr);
    } else if (mode === 'MONTH') {
      const firstDay = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
      const lastDayObj = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const lastDay = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(lastDayObj.getDate())}`;
      setFilterStartDate(firstDay);
      setFilterEndDate(lastDay);
    } else {
      setFilterStartDate('');
      setFilterEndDate('');
    }
  };

  // Tiêu đề báo cáo tự động theo tab & phân loại đang lọc
  const getReportTitle = () => {
    if (activeTab === 'LOGS') return 'BÁO CÁO NHẬT KÝ THI CÔNG';
    if (activeTab === 'EXTRAS') return 'BẢNG KÊ NỘI DUNG PHÁT SINH CÔNG TRÌNH';
    if (filterCategory === 'SUB_CONTRACTORS') return 'BẢNG KÊ CHI PHÍ CÁC ĐỘI THỢ PHỤ TRỢ (ĐIỆN, SƠN, CƠ KHÍ, NHÔM KÍNH, KHÁC)';
    if (filterCategory === 'IN') return 'BẢNG KÊ CÁC ĐỢT KHÁCH HÀNG TẠM ỨNG & THANH TOÁN';
    if (EXPENSE_CATEGORIES[filterCategory]?.reportTitle) {
      return EXPENSE_CATEGORIES[filterCategory].reportTitle;
    }
    return 'BÁO CÁO TỔNG HỢP SỔ QUỸ THU CHI CÔNG TRÌNH';
  };

  // 1. Xuất báo cáo sao chép gửi Zalo
  const copyForZalo = () => {
    if (activeTab === 'EXTRAS') {
      let text = `📋 BẢNG KÊ NỘI DUNG PHÁT SINH CÔNG TRÌNH\n`;
      text += `🏗️ Công trình: ${project.name}\n`;
      if (project.manager) text += `👷 Phụ trách: ${project.manager}\n`;
      text += `📅 Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}\n`;
      text += `--------------------------------------\n`;

      if (filteredVariations.length === 0) {
        text += `(Chưa có nội dung phát sinh phù hợp)\n`;
      } else {
        const list = [...filteredVariations].sort((a, b) => new Date(a.date) - new Date(b.date));
        list.forEach((v, i) => {
          const sign = v.type === 'DECREASE' ? '-' : '+';
          const statusLabel = VARIATION_STATUS[v.status]?.label || 'Chờ duyệt';
          text += `${i + 1}. [${v.date}] ${sign}${(Number(v.amount) || 0).toLocaleString('vi-VN')} đ (${statusLabel})\n`;
          text += `   • ${v.title}${v.note ? ` — ${v.note}` : ''}\n`;
        });
      }

      text += `--------------------------------------\n`;
      text += `📈 Phát sinh tăng: +${variationStats.increaseSum.toLocaleString('vi-VN')} đ\n`;
      text += `📉 Phát sinh giảm: -${variationStats.decreaseSum.toLocaleString('vi-VN')} đ\n`;
      text += `💰 PHÁT SINH RÒNG: ${variationStats.netSum >= 0 ? '+' : ''}${variationStats.netSum.toLocaleString('vi-VN')} đ\n`;
      text += `(Hệ thống Quản lý Xây dựng HD Cons)`;

      navigator.clipboard.writeText(text);
      setCopyFeedback('✓ Đã sao chép bảng kê phát sinh! Bạn có thể dán vào Zalo gửi cho khách hàng.');
      setTimeout(() => setCopyFeedback(''), 4000);
      return;
    }

    const title = getReportTitle();
    let text = `📋 ${title.toUpperCase()}\n`;
    text += `🏗️ Công trình: ${project.name}\n`;
    if (project.manager) text += `👷 Phụ trách: ${project.manager}\n`;
    if (filterStartDate || filterEndDate) {
      text += `⏱️ Thời gian: ${filterStartDate || 'Trước đây'} đến ${filterEndDate || 'Hiện tại'}\n`;
    }
    text += `📅 Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}\n`;
    text += `--------------------------------------\n`;
    
    if (filteredTransactions.length === 0) {
      text += `(Không có giao dịch nào phù hợp với bộ lọc)\n`;
    } else {
      // Sắp xếp thứ tự thời gian tăng dần để dễ đối chiếu
      const list = [...filteredTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
      list.forEach((t, i) => {
        const cat = t.type === 'IN' ? 'Thu' : getExpenseCategoryInfo(t.expenseCategory).label;
        text += `${i + 1}. [${t.date}] ${t.type === 'IN' ? '+' : '-'}${t.amount.toLocaleString('vi-VN')} đ\n   • ${t.note} (${cat})\n`;
      });
    }
    text += `--------------------------------------\n`;
    if (filterCategory === 'IN') {
      text += `💰 TỔNG CỘNG TIỀN VÀO: ${filteredTotal.inSum.toLocaleString('vi-VN')} đ\n`;
    } else if (filterCategory === 'ALL') {
      text += `💰 TỔNG CHI: ${filteredTotal.outSum.toLocaleString('vi-VN')} đ\n`;
      text += `💵 TỔNG THU: ${filteredTotal.inSum.toLocaleString('vi-VN')} đ\n`;
    } else {
      text += `💰 TỔNG CỘNG ĐÃ CHI: ${filteredTotal.outSum.toLocaleString('vi-VN')} đ\n`;
    }
    text += `(Hệ thống Quản lý Xây dựng HD Cons)`;

    navigator.clipboard.writeText(text);
    setCopyFeedback('✓ Đã sao chép nội dung báo cáo! Bạn có thể dán vào Zalo gửi cho đội thợ / vật tư.');
    setTimeout(() => setCopyFeedback(''), 4000);
  };

  // 2. Xuất file Excel (CSV UTF-8)
  const exportCSV = () => {
    const safeProjectName = (project.name || '').replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_');

    if (activeTab === 'EXTRAS') {
      const filename = `Phat_sinh_${safeProjectName}_${new Date().toISOString().slice(0, 10)}.csv`;
      const headers = ['STT', 'Ngày', 'Loại phát sinh', 'Nội dung phát sinh', 'Trạng thái', 'Số tiền (VNĐ)', 'Ghi chú', 'Đã chuyển Sổ quỹ'];
      const rows = filteredVariations.map((v, i) => [
        i + 1,
        v.date,
        v.type === 'DECREASE' ? 'Phát sinh giảm' : 'Phát sinh tăng',
        `"${(v.title || '').replace(/"/g, '""')}"`,
        `"${(VARIATION_STATUS[v.status]?.label || 'Chờ duyệt').replace(/"/g, '""')}"`,
        v.type === 'DECREASE' ? -(Number(v.amount) || 0) : (Number(v.amount) || 0),
        `"${(v.note || '').replace(/"/g, '""')}"`,
        v.transferredToFinance ? 'Đã chuyển' : 'Chưa chuyển'
      ]);
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const catName = filterCategory === 'ALL' ? 'Tong_hop' : filterCategory;
    const filename = `Bao_cao_${catName}_${safeProjectName}_${new Date().toISOString().slice(0, 10)}.csv`;
    
    const headers = ['STT', 'Ngày', 'Loại giao dịch', 'Phân loại', 'Nội dung chi tiết', 'Số tiền (VNĐ)'];
    const rows = filteredTransactions.map((t, i) => [
      i + 1,
      t.date,
      t.type === 'IN' ? 'Tiền Vào' : 'Tiền Ra',
      `"${(t.type === 'IN' ? 'Thu' : getExpenseCategoryInfo(t.expenseCategory).label).replace(/"/g, '""')}"`,
      `"${(t.note || '').replace(/"/g, '""')}"`,
      t.type === 'IN' ? t.amount : -t.amount
    ]);
    
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. In báo cáo trực tiếp
  const printReport = () => {
    window.print();
  };

  // 4. Xuất file PDF Báo cáo theo bộ lọc
  const exportPDF = async () => {
    const input = reportRef.current;
    if (!input) return;
    
    setIsExporting(true);
    
    setTimeout(async () => {
      const originalStyle = input.style.cssText;
      input.style.backgroundColor = '#ffffff';
      input.style.padding = '25px';
      input.style.color = '#000000';
      
      try {
        const canvas = await html2canvas(input, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        const catSuffix = filterCategory !== 'ALL' ? `_${filterCategory}` : '';
        pdf.save(`Bao_cao_${project.name}_${activeTab}${catSuffix}.pdf`);
      } catch (err) {
        console.error('Lỗi khi xuất PDF:', err);
        alert('Không thể xuất PDF, vui lòng thử lại.');
      } finally {
        input.style.cssText = originalStyle;
        setIsExporting(false);
      }
    }, 120);
  };

  const startEditLog = (log) => {
    setEditingLogId(log.id);
    setLogDate(log.date);
    setLogWork(log.work);
    setLogWeather(log.weather);
    setLogWorkers(log.workers);
    setLogIsWorking(log.isWorking);
  };

  const cancelEditLog = () => {
    setEditingLogId(null);
    setLogDate(new Date().toISOString().slice(0, 10));
    setLogWork('');
    setLogWeather('Nắng');
    setLogWorkers(1);
    setLogIsWorking(true);
    setLogImage(null);
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    
    let imageUrl = null;
    try {
      if (logImage) {
        const formData = new FormData();
        formData.append('image', logImage);
        
        const IMGBB_API_KEY = 'b7fba4419a881b35dccfe77f6139d45a'; 
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
          imageUrl = result.data.url;
        } else {
          throw new Error(result.error?.message || 'Lỗi tải ảnh lên ImgBB');
        }
      }
      
      const data = {
        date: logDate, work: logWork, weather: logWeather,
        workers: parseInt(logWorkers), isWorking: logIsWorking === 'true' || logIsWorking === true,
        imageUrl: imageUrl || (editingLogId ? (project.dailyLogs.find(l => l.id === editingLogId)?.imageUrl || null) : null)
      };
      
      if (editingLogId) {
        await updateDailyLog(project.id, editingLogId, data);
        setEditingLogId(null);
      } else {
        await addDailyLog(project.id, data);
      }
      setLogWork('');
      setLogImage(null);
    } catch (error) {
      console.error("Lỗi upload ảnh:", error);
      alert("Có lỗi xảy ra khi tải ảnh lên.");
    } finally {
      setIsUploading(false);
    }
  };

  const requestEditTrans = (t) => {
    setAuthModal({
      isOpen: true,
      action: 'EDIT_TRANS',
      targetItem: t,
      title: 'Xác nhận để Sửa Khoản Thu/Chi',
      desc: `Nhập mật khẩu két sắt (Nhutvn93) để chỉnh sửa dòng: "${t.note || 'Khoản tiền'}".`
    });
  };

  const requestDeleteTrans = (transId) => {
    setAuthModal({
      isOpen: true,
      action: 'DELETE_TRANS',
      targetItem: transId,
      title: 'Xác nhận để Xóa Khoản Thu/Chi',
      desc: 'Khoản tiền này sẽ bị xóa vĩnh viễn khỏi sổ quỹ công trình. Nhập mật khẩu két sắt (Nhutvn93) để xác nhận.'
    });
  };

  const handleAuthSuccess = async () => {
    if (authModal.action === 'EDIT_TRANS' && authModal.targetItem) {
      startEditTrans(authModal.targetItem);
    } else if (authModal.action === 'DELETE_TRANS' && authModal.targetItem) {
      await removeTransaction(project.id, authModal.targetItem);
    } else if (authModal.action === 'EDIT_VAR' && authModal.targetItem) {
      startEditVariation(authModal.targetItem);
    } else if (authModal.action === 'DELETE_VAR' && authModal.targetItem) {
      await removeProjectVariation(project.id, authModal.targetItem);
    }
  };

  // --- LOGIC NỘI DUNG PHÁT SINH ---
  const startEditVariation = (v) => {
    setEditingVarId(v.id);
    setVarDate(v.date || new Date().toISOString().slice(0, 10));
    setVarTitle(v.title || '');
    setVarType(v.type || 'INCREASE');
    setVarAmount((v.amount || 0).toString());
    setVarStatus(v.status || 'PENDING');
    setVarNote(v.note || '');
  };

  const cancelEditVariation = () => {
    setEditingVarId(null);
    setVarDate(new Date().toISOString().slice(0, 10));
    setVarTitle('');
    setVarType('INCREASE');
    setVarAmount('');
    setVarStatus('PENDING');
    setVarNote('');
  };

  const requestEditVariation = (v) => {
    setAuthModal({
      isOpen: true,
      action: 'EDIT_VAR',
      targetItem: v,
      title: 'Xác nhận để Sửa Nội dung Phát sinh',
      desc: `Nhập mật khẩu két sắt (Nhutvn93) để chỉnh sửa mục: "${v.title}".`
    });
  };

  const requestDeleteVariation = (varId) => {
    setAuthModal({
      isOpen: true,
      action: 'DELETE_VAR',
      targetItem: varId,
      title: 'Xác nhận để Xóa Nội dung Phát sinh',
      desc: 'Mục phát sinh này sẽ bị xóa vĩnh viễn khỏi công trình. Nhập mật khẩu két sắt (Nhutvn93) để xác nhận.'
    });
  };

  const handleSaveVariation = async (e) => {
    e.preventDefault();
    const parsedAmount = parseInt(varAmount.toString().replace(/\D/g, ''), 10) || 0;
    const payload = {
      date: varDate,
      title: varTitle.trim(),
      type: varType,
      amount: parsedAmount,
      status: varStatus,
      note: varNote.trim()
    };

    if (editingVarId) {
      await updateProjectVariation(project.id, editingVarId, payload);
      setEditingVarId(null);
    } else {
      await addProjectVariation(project.id, payload);
    }

    setVarTitle('');
    setVarAmount('');
    setVarNote('');
    setVarStatus('PENDING');
  };

  const openTransferModal = (v) => {
    const defaultTransType = v.type === 'DECREASE' ? 'OUT' : 'IN';
    setTransferModal({
      isOpen: true,
      variation: v,
      date: v.date || new Date().toISOString().slice(0, 10),
      type: defaultTransType,
      expenseCategory: 'KHAC',
      amount: (v.amount || 0).toString(),
      note: `[Phát sinh] ${v.title}${v.note ? ` (${v.note})` : ''}`,
      markAsPaid: true
    });
  };

  const handleConfirmTransfer = async (e) => {
    e.preventDefault();
    if (!transferModal.variation) return;
    const parsedAmount = parseInt(transferModal.amount.toString().replace(/\D/g, ''), 10) || 0;
    if (parsedAmount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ lớn hơn 0');
      return;
    }

    const transPayload = {
      date: transferModal.date,
      type: transferModal.type,
      amount: parsedAmount,
      note: transferModal.note.trim(),
      expenseCategory: transferModal.type === 'OUT' ? (transferModal.expenseCategory || 'KHAC') : null,
      fromVariationId: transferModal.variation.id
    };

    await transferVariationToFinance(
      project.id,
      transferModal.variation.id,
      transPayload,
      transferModal.markAsPaid
    );

    setTransferModal({ ...transferModal, isOpen: false, variation: null });
    setCopyFeedback('✓ Đã chuyển khoản phát sinh sang Sổ quỹ Thu/Chi thành công!');
    setTimeout(() => setCopyFeedback(''), 4000);
  };

  const startEditTrans = (t) => {
    setEditingTransId(t.id);
    setTransDate(t.date);
    setTransType(t.type);
    setExpenseCategory(t.expenseCategory || 'THO_XAY');
    setTransAmount(t.amount.toString());
    setTransNote(t.note);
  };

  const cancelEditTrans = () => {
    setEditingTransId(null);
    setTransDate(new Date().toISOString().slice(0, 10));
    setTransType('IN');
    setExpenseCategory('THO_XAY');
    setTransAmount('');
    setTransNote('');
  };

  const handleAddTrans = (e) => {
    e.preventDefault();
    const data = {
      date: transDate, 
      type: transType, 
      note: transNote,
      amount: parseInt(transAmount.replace(/\D/g, '')) || 0,
      expenseCategory: transType === 'OUT' ? (expenseCategory || 'THO_XAY') : null
    };
    if (editingTransId) {
      updateTransaction(project.id, editingTransId, data);
      setEditingTransId(null);
    } else {
      addTransaction(project.id, data);
    }
    setTransAmount('');
    setTransNote('');
  };

  if (!project) {
    return <div className="page-container">Dự án không tồn tại!</div>;
  }

  return (
    <div className="page-container animate-fade-in">
      
      {/* Toast thông báo đã copy gửi Zalo */}
      {copyFeedback && (
        <div 
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'var(--success)',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 500,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <Check size={18} />
          {copyFeedback}
        </div>
      )}

      <div className="mb-4 flex justify-between items-center no-print">
        <Link to="/dashboard/construction" className="btn btn-outline">
          <ArrowLeft size={16} /> Quay lại
        </Link>
        <div className="flex gap-2">
          {(activeTab === 'FINANCE' || activeTab === 'EXTRAS') && role === 'ADMIN' && (
            <button onClick={copyForZalo} className="btn btn-outline flex items-center gap-1.5" title="Copy tin nhắn có định dạng đẹp để dán vào Zalo">
              <Copy size={16} className="text-primary" /> Sao chép gửi Zalo
            </button>
          )}
          <button onClick={exportPDF} className="btn btn-primary">
            <Download size={16} /> Xuất PDF
          </button>
        </div>
      </div>

      {/* Card Thông tin Công trình & Khung Xuất Báo Cáo */}
      <div className="card mb-6" ref={reportRef}>
        <div className="flex justify-between items-start">
          <div style={{ width: '100%' }}>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <span className="badge badge-primary">Năm {getProjectYear(project) || 'Khác'}</span>
            </div>
            <p className="text-secondary mb-2">
              Phụ trách: <strong>{project.manager}</strong> | Bắt đầu: {project.startDate} | Dự kiến: {project.durationMonths} tháng
            </p>
            {role === 'ADMIN' ? (
              <div className="text-secondary mb-4 space-y-1">
                <p>
                  Tổng giá trị hợp đồng: <strong>{project.totalValue?.toLocaleString('vi-VN')} VNĐ</strong>
                </p>
                {variationStats.totalCount > 0 && (
                  <p className="text-sm">
                    Phát sinh ({variationStats.totalCount} mục):{' '}
                    <strong style={{ color: variationStats.netSum >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {variationStats.netSum >= 0 ? '+' : ''}{variationStats.netSum.toLocaleString('vi-VN')} VNĐ
                    </strong>
                    {' '}→ Tổng sau phát sinh:{' '}
                    <strong className="text-primary">{variationStats.totalAfterVariations.toLocaleString('vi-VN')} VNĐ</strong>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-secondary mb-4 flex items-center gap-1.5 text-xs">
                <span className="badge badge-secondary flex items-center gap-1" style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}>
                  <Lock size={12} /> Giá trị hợp đồng: Bảo mật Quản trị viên
                </span>
              </p>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '200px', height: '10px', background: 'var(--border-color)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${currentProgress}%`, height: '100%', background: isDelayed ? 'var(--danger)' : 'var(--success)' }}></div>
              </div>
              <span style={{ fontWeight: 'bold' }}>Tiến độ: {currentProgress}%</span>
              {isDelayed && <span className="badge badge-danger">Trễ tiến độ</span>}
              {project.isCompleted && <span className="badge badge-success">Đã hoàn thành</span>}
            </div>
            {!project.isCompleted && (
              <p className="text-sm text-secondary italic">*Tiến độ được tính bằng Số ngày có làm việc / Tổng ngày dự kiến</p>
            )}

            {/* ========================================================= */}
            {/* BẢNG DỮ LIỆU DÀNH CHO XUẤT PDF & IN ẤN (Theo đúng bộ lọc) */}
            {/* ========================================================= */}
            {isExporting && (
              <div className="mt-6 border-t pt-4">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold uppercase tracking-wide">{getReportTitle()}</h2>
                  <p className="text-sm text-secondary mt-1">
                    Công trình: <strong>{project.name}</strong> • Phụ trách: <strong>{project.manager}</strong>
                  </p>
                  <p className="text-xs text-secondary mt-0.5">
                    {filterStartDate || filterEndDate 
                      ? `Khoảng thời gian: ${filterStartDate || 'Đầu dự án'} đến ${filterEndDate || 'Hiện tại'}`
                      : 'Thời gian: Toàn bộ quá trình thực hiện'}
                    {' '}| Ngày xuất: {new Date().toLocaleDateString('vi-VN')}
                  </p>
                </div>
                
                {activeTab === 'LOGS' && (
                  <div className="table-container">
                    <table className="table" style={{ border: '1px solid #ddd', width: '100%' }}>
                      <thead style={{ background: '#f5f5f5' }}>
                        <tr>
                          <th style={{ width: '100px' }}>Ngày</th>
                          <th style={{ width: '100px' }}>Thời tiết</th>
                          <th style={{ width: '100px' }}>Nhân lực</th>
                          <th style={{ width: '100px' }}>Trạng thái</th>
                          <th>Nội dung công việc</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...(project.dailyLogs || [])].sort((a,b) => new Date(b.date) - new Date(a.date)).map(log => (
                          <tr key={log.id}>
                            <td>{log.date}</td>
                            <td>{log.weather}</td>
                            <td>{log.workers} người</td>
                            <td>{log.isWorking ? 'Có làm' : 'Nghỉ'}</td>
                            <td>{log.work}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'EXTRAS' && (
                  <div className="table-container">
                    <table className="table" style={{ border: '1px solid #ddd', width: '100%' }}>
                      <thead style={{ background: '#f5f5f5' }}>
                        <tr>
                          <th style={{ width: '40px' }}>STT</th>
                          <th style={{ width: '95px' }}>Ngày</th>
                          <th style={{ width: '105px' }}>Loại</th>
                          <th>Nội dung phát sinh</th>
                          <th style={{ width: '115px' }}>Trạng thái</th>
                          <th className="text-right" style={{ width: '130px' }}>Số tiền (VNĐ)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredVariations.map((v, idx) => (
                          <tr key={v.id}>
                            <td className="text-secondary text-xs">{idx + 1}</td>
                            <td>{v.date}</td>
                            <td>{v.type === 'DECREASE' ? 'Phát sinh giảm' : 'Phát sinh tăng'}</td>
                            <td>
                              {v.title}
                              {v.note ? <div style={{ fontSize: '0.8rem', color: '#666' }}>{v.note}</div> : null}
                            </td>
                            <td>{VARIATION_STATUS[v.status]?.label || 'Chờ duyệt'}</td>
                            <td className="text-right font-bold" style={{ color: v.type === 'DECREASE' ? '#ef4444' : '#10b981' }}>
                              {v.type === 'DECREASE' ? '-' : '+'}{(Number(v.amount) || 0).toLocaleString('vi-VN')}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                          <td colSpan="5" className="text-right">TỔNG PHÁT SINH RÒNG:</td>
                          <td className="text-right" style={{ color: variationStats.netSum >= 0 ? '#10b981' : '#ef4444' }}>
                            {variationStats.netSum >= 0 ? '+' : ''}{variationStats.netSum.toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', marginTop: '2.5rem', textAlign: 'center', pageBreakInside: 'avoid' }}>
                      <div>
                        <strong>Đại diện Chủ đầu tư / Khách hàng</strong>
                        <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>(Ký xác nhận phát sinh)</p>
                        <div style={{ height: '70px' }}></div>
                      </div>
                      <div>
                        <strong>Đại diện Đơn vị Thi công</strong>
                        <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>(Ký và ghi rõ họ tên)</p>
                        <div style={{ height: '70px' }}></div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'FINANCE' && (
                  <div className="table-container">
                    <table className="table" style={{ border: '1px solid #ddd', width: '100%' }}>
                      <thead style={{ background: '#f5f5f5' }}>
                        <tr>
                          <th style={{ width: '40px' }}>STT</th>
                          <th style={{ width: '95px' }}>Ngày</th>
                          <th style={{ width: '80px' }}>Loại</th>
                          <th style={{ width: '120px' }}>Phân loại</th>
                          <th>Nội dung chi tiết</th>
                          <th className="text-right" style={{ width: '130px' }}>Số tiền (VNĐ)</th>
                          <th style={{ width: '110px', textAlign: 'center' }}>Ký xác nhận</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((t, idx) => (
                          <tr key={t.id}>
                            <td className="text-secondary text-xs">{idx + 1}</td>
                            <td>{t.date}</td>
                            <td>{t.type === 'IN' ? 'Tiền Vào' : 'Tiền Ra'}</td>
                            <td>{t.type === 'IN' ? '-' : (EXPENSE_CATEGORIES[t.expenseCategory]?.label || 'Tiền khác')}</td>
                            <td>{t.note}</td>
                            <td className="text-right font-bold" style={{ color: t.type === 'IN' ? '#10b981' : '#ef4444' }}>
                              {t.type === 'IN' ? '+' : '-'}{t.amount.toLocaleString('vi-VN')}
                            </td>
                            <td style={{ borderLeft: '1px dashed #ddd' }}></td>
                          </tr>
                        ))}

                        {/* Dòng tổng kết */}
                        <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                          <td colSpan="5" className="text-right">
                            {filterCategory === 'IN' ? 'TỔNG CỘNG TIỀN VÀO:' : filterCategory === 'ALL' ? 'TỔNG CHI / TỔNG THU:' : 'TỔNG CỘNG ĐÃ CHI:'}
                          </td>
                          <td className="text-right" style={{ color: filterCategory === 'IN' ? '#10b981' : '#ef4444' }}>
                            {filterCategory === 'IN' 
                              ? `+${filteredTotal.inSum.toLocaleString('vi-VN')} đ`
                              : filterCategory === 'ALL'
                                ? `Chi: -${filteredTotal.outSum.toLocaleString('vi-VN')} đ`
                                : `-${filteredTotal.outSum.toLocaleString('vi-VN')} đ`}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Khung chữ ký xác nhận */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', marginTop: '2.5rem', textAlign: 'center', pageBreakInside: 'avoid' }}>
                      <div>
                        <strong>Người lập bảng</strong>
                        <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>(Ký, ghi rõ họ tên)</p>
                        <div style={{ height: '70px' }}></div>
                      </div>
                      <div>
                        <strong>Đội trưởng / Đơn vị cung cấp</strong>
                        <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>(Ký xác nhận đã nhận/cung cấp)</p>
                        <div style={{ height: '70px' }}></div>
                      </div>
                      <div>
                        <strong>Chỉ huy trưởng / Ban Giám đốc</strong>
                        <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>(Ký và đóng dấu)</p>
                        <div style={{ height: '70px' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* End phần xuất báo cáo */}

          </div>
          <div data-html2canvas-ignore className="no-print">
            {!project.isCompleted ? (
              <button className="btn btn-success" style={{ background: 'var(--success)', color: 'white' }} onClick={handleComplete}>
                <CheckCircle size={16} /> Chốt Hoàn thành
              </button>
            ) : (
              <div className="badge badge-success text-lg p-2"><CheckCircle size={20} /> Đã Bàn Giao</div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs chuyển đổi giữa Nhật ký, Nội dung phát sinh & Sổ quỹ */}
      {role === 'ADMIN' ? (
        <div className="flex flex-wrap gap-4 mb-6 no-print" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <button 
            className={`pb-2 px-4 ${activeTab === 'LOGS' ? 'border-b-2 font-bold' : 'text-secondary'}`} 
            style={{ borderColor: activeTab === 'LOGS' ? 'var(--accent-primary)' : 'transparent' }}
            onClick={() => setActiveTab('LOGS')}
          >
            Nhật ký thi công
          </button>
          <button 
            className={`pb-2 px-4 flex items-center gap-1.5 ${activeTab === 'EXTRAS' ? 'border-b-2 font-bold' : 'text-secondary'}`} 
            style={{ borderColor: activeTab === 'EXTRAS' ? 'var(--accent-primary)' : 'transparent' }}
            onClick={() => setActiveTab('EXTRAS')}
          >
            Nội dung phát sinh
            {variationStats.totalCount > 0 && (
              <span className="badge badge-orange text-xs">{variationStats.totalCount}</span>
            )}
          </button>
          <button 
            className={`pb-2 px-4 ${activeTab === 'FINANCE' ? 'border-b-2 font-bold' : 'text-secondary'}`}
            style={{ borderColor: activeTab === 'FINANCE' ? 'var(--accent-primary)' : 'transparent' }}
            onClick={() => setActiveTab('FINANCE')}
          >
            Sổ quỹ Thu/Chi
          </button>
        </div>
      ) : (
        <div className="flex gap-4 mb-6 no-print" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div 
            className="pb-2 px-4 border-b-2 font-bold text-primary flex items-center gap-1.5"
            style={{ borderColor: 'var(--accent-primary)' }}
          >
            📋 Nhật ký thi công công trình
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: NHẬT KÝ THI CÔNG */}
      {/* ========================================================= */}
      {activeTab === 'LOGS' && (
        <div className="flex flex-col gap-8">
          <div>
            <div className="card" style={{ maxWidth: '800px' }}>
              <h3 className="font-bold mb-4">{editingLogId ? 'Sửa nhật ký' : 'Ghi nhận nhật ký'}</h3>
              <form onSubmit={handleAddLog} className="flex flex-col gap-4">
                <div className="input-group">
                  <label className="input-label">Ngày</label>
                  <input type="date" required className="input-field" value={logDate} onChange={e=>setLogDate(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Thời tiết</label>
                  <select className="input-field" value={logWeather} onChange={e=>setLogWeather(e.target.value)}>
                    <option value="Nắng">Nắng</option>
                    <option value="Mưa">Mưa</option>
                    <option value="Bão">Bão</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Trạng thái làm việc</label>
                  <select className="input-field" value={logIsWorking} onChange={e=>setLogIsWorking(e.target.value)}>
                    <option value={true}>Có làm việc</option>
                    <option value={false}>Nghỉ (Do mưa/Sự cố)</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Số lượng thợ/nhân lực</label>
                  <input type="number" min="0" required className="input-field" value={logWorkers} onChange={e=>setLogWorkers(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Công việc thực hiện</label>
                  <textarea required className="input-field" rows="3" value={logWork} onChange={e=>setLogWork(e.target.value)} placeholder="Mô tả công việc..."></textarea>
                </div>
                <div className="input-group">
                  <label className="input-label">Hình ảnh thi công (Không bắt buộc)</label>
                  <div className="flex items-center gap-2">
                    <label className="btn btn-outline flex-1 flex items-center justify-center gap-2 cursor-pointer">
                      <Camera size={20} />
                      {logImage ? 'Đã chọn 1 ảnh' : 'Chụp/Tải ảnh lên'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={e => setLogImage(e.target.files[0])} 
                      />
                    </label>
                  </div>
                  {logImage && <div className="text-sm text-success mt-1">✓ {logImage.name}</div>}
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={isUploading} className="btn btn-primary w-full justify-center">
                    {isUploading ? 'Đang lưu...' : (editingLogId ? 'Lưu chỉnh sửa' : 'Thêm mới')}
                  </button>
                  {editingLogId && <button type="button" className="btn btn-outline" onClick={cancelEditLog}>Hủy</button>}
                </div>
              </form>
            </div>
          </div>
          <div>
            <div className="card w-full">
              <h3 className="font-bold mb-4">Lịch sử nhật ký</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Thời tiết</th>
                      <th>Nhân lực</th>
                      <th>Trạng thái</th>
                      <th>Công việc</th>
                      <th className="text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...(project.dailyLogs || [])].sort((a,b) => new Date(b.date) - new Date(a.date)).map(log => (
                      <tr key={log.id} style={{ background: editingLogId === log.id ? 'var(--bg-secondary)' : 'transparent' }}>
                        <td>{log.date}</td>
                        <td>{log.weather}</td>
                        <td>{log.workers} người</td>
                        <td>{log.isWorking ? <span className="text-success font-bold">Có làm</span> : <span className="text-danger font-bold">Nghỉ</span>}</td>
                        <td>
                          {log.work}
                          {log.imageUrl && (
                            <div className="mt-2">
                              <a href={log.imageUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm flex items-center gap-1 hover:underline">
                                <Camera size={14} /> Xem ảnh đính kèm
                              </a>
                            </div>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => startEditLog(log)} className="icon-btn text-info" title="Sửa"><Edit size={16} /></button>
                            <button onClick={() => removeDailyLog(project.id, log.id)} className="icon-btn text-danger" title="Xóa"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(project.dailyLogs || []).length === 0 && (
                      <tr><td colSpan="6" className="text-center text-secondary py-4">Chưa có nhật ký nào.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: NỘI DUNG PHÁT SINH (CHỈ ADMIN) */}
      {/* ========================================================= */}
      {activeTab === 'EXTRAS' && role === 'ADMIN' && (
        <div className="flex flex-col gap-8">
          <div>
            {/* Thẻ thống kê Phát sinh */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" style={{ maxWidth: '900px' }}>
              <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--success)' }}>
                <div className="text-xs text-secondary font-medium mb-1">📈 Phát sinh tăng</div>
                <div className="text-lg font-bold text-success">+{variationStats.increaseSum.toLocaleString('vi-VN')} <span className="text-xs">đ</span></div>
              </div>
              <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--danger)' }}>
                <div className="text-xs text-secondary font-medium mb-1">📉 Phát sinh giảm</div>
                <div className="text-lg font-bold text-danger">-{variationStats.decreaseSum.toLocaleString('vi-VN')} <span className="text-xs">đ</span></div>
              </div>
              <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-primary)' }}>
                <div className="text-xs text-secondary font-medium mb-1">⚖️ Phát sinh ròng</div>
                <div className="text-lg font-bold" style={{ color: variationStats.netSum >= 0 ? 'var(--accent-primary)' : 'var(--danger)' }}>
                  {variationStats.netSum >= 0 ? '+' : ''}{variationStats.netSum.toLocaleString('vi-VN')} <span className="text-xs">đ</span>
                </div>
              </div>
              <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-secondary)' }}>
                <div className="text-xs text-secondary font-medium mb-1">🏗️ Tổng HĐ + Phát sinh</div>
                <div className="text-lg font-bold" style={{ color: 'var(--accent-secondary)' }}>
                  {variationStats.totalAfterVariations.toLocaleString('vi-VN')} <span className="text-xs">đ</span>
                </div>
              </div>
            </div>

            {/* Form Thêm / Sửa Nội dung Phát sinh */}
            <div className="card" style={{ maxWidth: '900px' }}>
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <FilePlus2 size={18} className="text-primary" />
                {editingVarId ? 'Sửa nội dung phát sinh' : 'Ghi nhận nội dung phát sinh mới'}
              </h3>
              <form onSubmit={handleSaveVariation} className="flex flex-col gap-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="input-group">
                    <label className="input-label">Ngày phát sinh</label>
                    <input type="date" required className="input-field" value={varDate} onChange={e => setVarDate(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Loại phát sinh</label>
                    <select className="input-field" value={varType} onChange={e => setVarType(e.target.value)}>
                      <option value="INCREASE">📈 Phát sinh tăng (Làm thêm hạng mục)</option>
                      <option value="DECREASE">📉 Phát sinh giảm (Cắt bớt hạng mục)</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Trạng thái duyệt</label>
                    <select className="input-field" value={varStatus} onChange={e => setVarStatus(e.target.value)}>
                      <option value="PENDING">⏳ Chờ duyệt</option>
                      <option value="APPROVED">✅ Đã duyệt / Đã chốt</option>
                      <option value="PAID">💰 Đã thanh toán</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="input-group">
                    <label className="input-label">Nội dung hạng mục phát sinh</label>
                    <input
                      type="text"
                      required
                      className="input-field"
                      value={varTitle}
                      onChange={e => setVarTitle(e.target.value)}
                      placeholder="VD: Làm thêm mái che sân thượng, đổi gạch..."
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Giá trị phát sinh (VNĐ)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      className="input-field"
                      value={varAmount}
                      onChange={e => setVarAmount(e.target.value)}
                      placeholder="Nhập số tiền..."
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Ghi chú / Diễn giải khối lượng (Không bắt buộc)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={varNote}
                    onChange={e => setVarNote(e.target.value)}
                    placeholder="VD: Chủ nhà yêu cầu thêm ngày 20/11, kích thước 15m2..."
                  />
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary w-full justify-center">
                    {editingVarId ? 'Lưu chỉnh sửa phát sinh' : 'Thêm nội dung phát sinh'}
                  </button>
                  {editingVarId && <button type="button" className="btn btn-outline" onClick={cancelEditVariation}>Hủy</button>}
                </div>
              </form>
            </div>
          </div>

          {/* Bảng danh sách Phát sinh */}
          <div>
            <div className="card w-full">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Filter size={18} className="text-primary" />
                    Danh sách Nội dung Phát sinh
                  </h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Theo dõi các hạng mục phát sinh và bấm nút chuyển nhanh sang Sổ quỹ Thu/Chi khi thanh toán.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={copyForZalo} className="btn btn-outline flex items-center gap-1.5 text-xs">
                    <Copy size={14} className="text-primary" /> Copy gửi Zalo
                  </button>
                  <button onClick={exportCSV} className="btn btn-outline flex items-center gap-1.5 text-xs">
                    <FileSpreadsheet size={14} className="text-success" /> Xuất Excel
                  </button>
                  <button onClick={exportPDF} className="btn btn-primary flex items-center gap-1.5 text-xs">
                    <Download size={14} /> Xuất PDF
                  </button>
                  <button onClick={printReport} className="btn btn-outline flex items-center gap-1.5 text-xs">
                    <Printer size={14} /> In
                  </button>
                </div>
              </div>

              {/* Bộ lọc Trạng thái & Tìm kiếm */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button className={`filter-pill ${varFilterStatus === 'ALL' ? 'active' : ''}`} onClick={() => setVarFilterStatus('ALL')}>
                    Tất cả ({variationStats.totalCount})
                  </button>
                  <button className={`filter-pill ${varFilterStatus === 'PENDING' ? 'active' : ''}`} onClick={() => setVarFilterStatus('PENDING')}>
                    ⏳ Chờ duyệt
                  </button>
                  <button className={`filter-pill ${varFilterStatus === 'APPROVED' ? 'active' : ''}`} onClick={() => setVarFilterStatus('APPROVED')}>
                    ✅ Đã duyệt
                  </button>
                  <button className={`filter-pill ${varFilterStatus === 'PAID' ? 'active' : ''}`} onClick={() => setVarFilterStatus('PAID')}>
                    💰 Đã thanh toán
                  </button>
                  <select
                    className="input-field"
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    value={varFilterType}
                    onChange={e => setVarFilterType(e.target.value)}
                  >
                    <option value="ALL">Tất cả tăng/giảm</option>
                    <option value="INCREASE">Chỉ phát sinh tăng</option>
                    <option value="DECREASE">Chỉ phát sinh giảm</option>
                  </select>
                </div>

                <div style={{ position: 'relative', minWidth: '220px', flex: '1', maxWidth: '300px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    placeholder="Tìm nội dung phát sinh..."
                    className="input-field"
                    style={{ width: '100%', paddingLeft: '32px', fontSize: '0.8rem' }}
                    value={varSearch}
                    onChange={e => setVarSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-container">
                <table className="table" style={{ minWidth: '860px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '45px' }}>STT</th>
                      <th style={{ width: '105px' }}>Ngày</th>
                      <th style={{ width: '125px' }}>Loại</th>
                      <th style={{ minWidth: '230px' }}>Nội dung phát sinh</th>
                      <th style={{ width: '125px' }}>Trạng thái</th>
                      <th className="text-right" style={{ width: '135px' }}>Số tiền</th>
                      <th className="text-right no-print" style={{ width: '210px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVariations.map((v, idx) => {
                      const statusInfo = VARIATION_STATUS[v.status] || VARIATION_STATUS.PENDING;
                      return (
                        <tr key={v.id} style={{ background: editingVarId === v.id ? 'var(--bg-secondary)' : 'transparent' }}>
                          <td className="text-secondary text-xs">{idx + 1}</td>
                          <td className="text-sm">{v.date}</td>
                          <td>
                            {v.type === 'DECREASE' ? (
                              <span className="badge badge-danger">📉 Giảm</span>
                            ) : (
                              <span className="badge badge-success">📈 Tăng</span>
                            )}
                          </td>
                          <td>
                            <div className="text-sm font-medium">{v.title}</div>
                            {v.note && <div className="text-xs text-secondary mt-0.5">{v.note}</div>}
                            {v.transferredToFinance && (
                              <span className="badge badge-primary text-xs mt-1">✓ Đã chuyển Sổ quỹ</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${statusInfo.badge}`}>{statusInfo.label}</span>
                          </td>
                          <td className="text-right font-bold text-sm" style={{ color: v.type === 'DECREASE' ? 'var(--danger)' : 'var(--success)' }}>
                            {v.type === 'DECREASE' ? '-' : '+'}{(Number(v.amount) || 0).toLocaleString('vi-VN')} đ
                          </td>
                          <td className="text-right no-print">
                            <div className="flex gap-1.5 justify-end items-center">
                              <button
                                onClick={() => openTransferModal(v)}
                                className="btn btn-outline text-xs flex items-center gap-1"
                                style={{ padding: '4px 8px', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                                title="Chuyển nhanh khoản phát sinh này sang Sổ quỹ Thu/Chi"
                              >
                                <ArrowRightLeft size={13} />
                                {v.transferredToFinance ? 'Chuyển thêm' : 'Chuyển Sổ quỹ'}
                              </button>
                              <button onClick={() => requestEditVariation(v)} className="icon-btn text-info" title="Sửa (Cần mật khẩu két sắt)"><Edit size={16} /></button>
                              <button onClick={() => requestDeleteVariation(v.id)} className="icon-btn text-danger" title="Xóa (Cần mật khẩu két sắt)"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredVariations.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center text-secondary py-6">
                          Chưa có nội dung phát sinh nào phù hợp.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: SỔ QUỸ THU / CHI (CÓ BỘ LỌC TỪNG ĐỘI & XUẤT BÁO CÁO) */}
      {/* ========================================================= */}
      {activeTab === 'FINANCE' && role === 'ADMIN' && (
        <div className="flex flex-col gap-8">
          <div>
            {/* Thống kê Tổng thu & Tổng chi */}
            <div className="grid md:grid-cols-2 gap-4 mb-4" style={{ maxWidth: '850px' }}>
              <div 
                className={`card text-white card-clickable ${filterCategory === 'IN' ? 'active-card' : ''}`} 
                style={{ background: 'var(--accent-primary)', color: 'white' }}
                onClick={() => setFilterCategory(filterCategory === 'IN' ? 'ALL' : 'IN')}
                title="Bấm để lọc các đợt khách tạm ứng/thanh toán"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="opacity-80">Tổng thu (Tiền vào)</span>
                  <span className="text-xs opacity-75">{countIn} giao dịch</span>
                </div>
                <div className="text-2xl font-bold">{totalIn.toLocaleString('vi-VN')} VNĐ</div>
                <div className="text-xs opacity-75 mt-1">👉 Nhấp để lọc danh sách tiền khách đóng</div>
              </div>

              <div 
                className={`card text-white card-clickable ${filterCategory === 'ALL' ? '' : ''}`} 
                style={{ background: 'var(--danger)', color: 'white' }}
                onClick={() => setFilterCategory('ALL')}
                title="Bấm để xem tất cả khoản chi"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="opacity-80">Tổng chi (Tiền ra)</span>
                  <span className="text-xs opacity-75">{countOut} giao dịch</span>
                </div>
                <div className="text-2xl font-bold">{totalOut.toLocaleString('vi-VN')} VNĐ</div>
                <div className="text-xs opacity-75 mt-1">Gồm thợ xây, 5 nhóm thợ phụ, vật tư & chi phí khác</div>
              </div>
            </div>

            {/* Thống kê bóc tách 4 nhóm chính */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3" style={{ maxWidth: '900px' }}>
              
              {/* Card 1: Thợ xây */}
              <div 
                className={`card card-clickable ${filterCategory === 'THO_XAY' ? 'active-card' : ''}`}
                style={{ padding: '1rem', borderLeft: '4px solid var(--accent-primary)' }}
                onClick={() => setFilterCategory(filterCategory === 'THO_XAY' ? 'ALL' : 'THO_XAY')}
                title="Nhấp để lọc riêng tiền thợ xây ứng/trả để xuất báo cáo gửi đội thợ"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-secondary font-medium">🧱 Thợ xây ứng/trả</span>
                  <span className="text-xs badge badge-primary">{countsByCategory.THO_XAY || 0}</span>
                </div>
                <div className="text-lg font-bold text-primary">{(totalsByCategory.THO_XAY || 0).toLocaleString('vi-VN')} <span className="text-xs">đ</span></div>
                <div className="text-xs mt-1" style={{ color: filterCategory === 'THO_XAY' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                  {filterCategory === 'THO_XAY' ? '● Đang lọc đội này' : '👉 Nhấp để lọc'}
                </div>
              </div>

              {/* Card 2: Tổng 5 nhóm Thợ phụ trợ */}
              <div 
                className={`card card-clickable ${filterCategory === 'SUB_CONTRACTORS' ? 'active-card' : ''}`}
                style={{ padding: '1rem', borderLeft: '4px solid var(--info)' }}
                onClick={() => setFilterCategory(filterCategory === 'SUB_CONTRACTORS' ? 'ALL' : 'SUB_CONTRACTORS')}
                title="Nhấp để lọc gộp cả 5 đội thợ: Điện, Sơn, Cơ khí, Nhôm kính, Thợ khác"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-secondary font-medium">👷 5 Đội thợ phụ trợ</span>
                  <span className="text-xs badge badge-info">{countSubContractors}</span>
                </div>
                <div className="text-lg font-bold" style={{ color: 'var(--info)' }}>{totalSubContractors.toLocaleString('vi-VN')} <span className="text-xs">đ</span></div>
                <div className="text-xs mt-1" style={{ color: filterCategory === 'SUB_CONTRACTORS' ? 'var(--info)' : 'var(--text-secondary)' }}>
                  {filterCategory === 'SUB_CONTRACTORS' ? '● Đang lọc 5 đội' : '👉 Điện, Sơn, CK, NK, Khác'}
                </div>
              </div>

              {/* Card 3: Tiền vật tư */}
              <div 
                className={`card card-clickable ${filterCategory === 'VAT_TU' ? 'active-card' : ''}`}
                style={{ padding: '1rem', borderLeft: '4px solid var(--accent-secondary)' }}
                onClick={() => setFilterCategory(filterCategory === 'VAT_TU' ? 'ALL' : 'VAT_TU')}
                title="Nhấp để lọc riêng tiền vật tư (xi măng, cát, đá, sắt thép, gạch...)"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-secondary font-medium">🏗️ Tiền vật tư</span>
                  <span className="text-xs badge badge-orange">{countsByCategory.VAT_TU || 0}</span>
                </div>
                <div className="text-lg font-bold" style={{ color: 'var(--accent-secondary)' }}>{(totalsByCategory.VAT_TU || 0).toLocaleString('vi-VN')} <span className="text-xs">đ</span></div>
                <div className="text-xs mt-1" style={{ color: filterCategory === 'VAT_TU' ? 'var(--accent-secondary)' : 'var(--text-secondary)' }}>
                  {filterCategory === 'VAT_TU' ? '● Đang lọc vật tư' : '👉 Nhấp để lọc'}
                </div>
              </div>

              {/* Card 4: Chi phí khác */}
              <div 
                className={`card card-clickable ${filterCategory === 'KHAC' ? 'active-card' : ''}`}
                style={{ padding: '1rem', borderLeft: '4px solid var(--text-secondary)' }}
                onClick={() => setFilterCategory(filterCategory === 'KHAC' ? 'ALL' : 'KHAC')}
                title="Nhấp để lọc các chi phí máy móc, vận chuyển, lặt vặt khác"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-secondary font-medium">📦 Chi phí khác</span>
                  <span className="text-xs badge badge-secondary">{countsByCategory.KHAC || 0}</span>
                </div>
                <div className="text-lg font-bold text-secondary">{(totalsByCategory.KHAC || 0).toLocaleString('vi-VN')} <span className="text-xs">đ</span></div>
                <div className="text-xs mt-1" style={{ color: filterCategory === 'KHAC' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {filterCategory === 'KHAC' ? '● Đang lọc mục này' : '👉 Nhấp để lọc'}
                </div>
              </div>

            </div>

            {/* Chi tiết 5 nhóm thợ tách riêng: Thợ điện, Thợ sơn, Thợ cơ khí, Thợ nhôm kính, Thợ khác */}
            <div className="mb-2" style={{ maxWidth: '900px' }}>
              <div className="text-xs font-bold text-secondary mb-2">
                Chi tiết theo từng đội thợ (Nhấp vào đội để lọc & xuất báo cáo riêng):
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                {SUB_CONTRACTOR_CATEGORIES.map((catKey) => {
                  const info = EXPENSE_CATEGORIES[catKey];
                  const isActive = filterCategory === catKey;
                  return (
                    <div
                      key={catKey}
                      className={`card card-clickable ${isActive ? 'active-card' : ''}`}
                      style={{ padding: '0.85rem', borderLeft: `4px solid ${info.color}` }}
                      onClick={() => setFilterCategory(isActive ? 'ALL' : catKey)}
                      title={`Nhấp để lọc riêng ${info.label.toLowerCase()}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-secondary">{info.icon} {info.shortLabel}</span>
                        <span className={`text-xs badge ${info.badge}`}>{countsByCategory[catKey] || 0}</span>
                      </div>
                      <div className="text-base font-bold" style={{ color: info.color }}>
                        {(totalsByCategory[catKey] || 0).toLocaleString('vi-VN')} <span className="text-xs">đ</span>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: isActive ? info.color : 'var(--text-secondary)' }}>
                        {isActive ? '● Đang lọc' : '👉 Lọc đội này'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-secondary mb-6 italic">
              💡 Mẹo: Nhấp vào từng ô thống kê ở trên để lọc tức thì danh sách bên dưới và xuất báo cáo cho từng đội!
            </p>
            
            {/* Form Ghi nhận Thu / Chi */}
            <div className="card" style={{ maxWidth: '850px' }}>
              <h3 className="font-bold mb-4">{editingTransId ? 'Sửa Thu/Chi' : 'Ghi nhận Thu/Chi'}</h3>
              <form onSubmit={handleAddTrans} className="flex flex-col gap-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="input-group">
                    <label className="input-label">Ngày giao dịch</label>
                    <input type="date" required className="input-field" value={transDate} onChange={e=>setTransDate(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Loại giao dịch</label>
                    <select className="input-field" value={transType} onChange={e=>setTransType(e.target.value)}>
                      <option value="IN">Tiền Vào (Khách thanh toán...)</option>
                      <option value="OUT">Tiền Ra (Chi trả công trình)</option>
                    </select>
                  </div>
                </div>

                {transType === 'OUT' && (
                  <div className="input-group animate-fade-in">
                    <label className="input-label font-bold" style={{ color: 'var(--danger)' }}>Phân loại khoản chi</label>
                    <select className="input-field" value={expenseCategory} onChange={e=>setExpenseCategory(e.target.value)} style={{ borderColor: 'var(--danger)' }}>
                      {EXPENSE_CATEGORY_LIST.map((cat) => (
                        <option key={cat.key} value={cat.key}>{cat.optionLabel}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="input-group">
                  <label className="input-label">Số tiền (VNĐ)</label>
                  <input type="number" min="0" required className="input-field" value={transAmount} onChange={e=>setTransAmount(e.target.value)} placeholder="Nhập số tiền..." />
                </div>
                <div className="input-group">
                  <label className="input-label">Nội dung chi tiết</label>
                  <input 
                    type="text" 
                    required 
                    className="input-field" 
                    value={transNote} 
                    onChange={e=>setTransNote(e.target.value)} 
                    placeholder={transType === 'OUT' ? (expenseCategory === 'THO_XAY' ? 'VD: Thợ Ba ứng lần 2...' : expenseCategory === 'VAT_TU' ? 'VD: 3 xe cát bãi Ba Thắng...' : 'VD: Mua dây điện cadivi...') : 'VD: Khách tạm ứng đợt 1...'} 
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary w-full justify-center">
                    {editingTransId ? 'Lưu chỉnh sửa' : 'Thêm mới'}
                  </button>
                  {editingTransId && <button type="button" className="btn btn-outline" onClick={cancelEditTrans}>Hủy</button>}
                </div>
              </form>
            </div>
          </div>
          
          {/* ========================================================= */}
          {/* BẢNG LỊCH SỬ GIAO DỊCH & CÔNG CỤ LỌC / XUẤT BÁO CÁO TỪNG ĐỘI */}
          {/* ========================================================= */}
          <div>
            <div className="card w-full">
              
              {/* Header khu vực Lịch sử giao dịch */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Filter size={18} className="text-primary" />
                    Lịch sử giao dịch & Sổ quỹ
                  </h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Lọc theo từng đội thi công, tiền vật tư để xuất bảng kê gửi đối tác & thợ.
                  </p>
                </div>

                {/* Các nút Hành động Xuất báo cáo theo bộ lọc hiện tại */}
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={copyForZalo}
                    className="btn btn-outline flex items-center gap-1.5 text-xs"
                    title="Sao chép nội dung báo cáo dạng tin nhắn để dán vào Zalo gửi cho đội thợ"
                  >
                    <Copy size={14} className="text-primary" /> Copy gửi Zalo
                  </button>

                  <button 
                    onClick={exportCSV}
                    className="btn btn-outline flex items-center gap-1.5 text-xs"
                    title="Tải về file Excel (CSV) có tiếng Việt để mở trên máy tính"
                  >
                    <FileSpreadsheet size={14} className="text-success" /> Xuất Excel
                  </button>

                  <button 
                    onClick={exportPDF}
                    className="btn btn-primary flex items-center gap-1.5 text-xs"
                    title="Xuất phiếu/bảng kê PDF có sẵn chỗ ký tên cho đội thợ nhận tiền"
                  >
                    <Download size={14} /> Xuất PDF
                  </button>

                  <button 
                    onClick={printReport}
                    className="btn btn-outline flex items-center gap-1.5 text-xs"
                    title="In bảng kê ra máy in"
                  >
                    <Printer size={14} /> In
                  </button>
                </div>
              </div>

              {/* BỘ LỌC 1: LỌC THEO PHÂN LOẠI (Nút tròn bấm nhanh) */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs font-bold text-secondary">Phân loại:</span>
                
                <button 
                  className={`filter-pill ${filterCategory === 'ALL' ? 'active' : ''}`}
                  onClick={() => setFilterCategory('ALL')}
                >
                  Tất cả ({countAll})
                </button>

                <button 
                  className={`filter-pill ${filterCategory === 'SUB_CONTRACTORS' ? 'active' : ''}`}
                  onClick={() => setFilterCategory('SUB_CONTRACTORS')}
                >
                  👷 5 đội thợ phụ ({countSubContractors})
                </button>

                {EXPENSE_CATEGORY_LIST.map((item) => {
                  const info = EXPENSE_CATEGORIES[item.key];
                  return (
                    <button
                      key={item.key}
                      className={`filter-pill ${filterCategory === item.key ? 'active' : ''}`}
                      onClick={() => setFilterCategory(item.key)}
                    >
                      {info.icon} {info.shortLabel} ({countsByCategory[item.key] || 0})
                    </button>
                  );
                })}

                <button 
                  className={`filter-pill ${filterCategory === 'IN' ? 'active' : ''}`}
                  onClick={() => setFilterCategory('IN')}
                >
                  💰 Tiền vào ({countIn})
                </button>
              </div>

              {/* BỘ LỌC 2: KHOẢNG THỜI GIAN & TÌM KIẾM TỪ KHÓA */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                
                {/* Lọc theo ngày */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium text-secondary">Từ ngày:</span>
                  <input 
                    type="date" 
                    className="input-field" 
                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                    value={filterStartDate} 
                    onChange={e => setFilterStartDate(e.target.value)} 
                  />
                  <span className="font-medium text-secondary">Đến ngày:</span>
                  <input 
                    type="date" 
                    className="input-field" 
                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                    value={filterEndDate} 
                    onChange={e => setFilterEndDate(e.target.value)} 
                  />

                  {/* Nút chọn nhanh */}
                  <button onClick={() => setQuickDate('TODAY')} className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.75rem' }}>Hôm nay</button>
                  <button onClick={() => setQuickDate('WEEK')} className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.75rem' }}>Tuần này</button>
                  <button onClick={() => setQuickDate('MONTH')} className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.75rem' }}>Tháng này</button>
                  {(filterStartDate || filterEndDate) && (
                    <button onClick={() => setQuickDate('ALL')} className="btn btn-outline text-danger" style={{ padding: '3px 8px', fontSize: '0.75rem' }}>Xóa ngày</button>
                  )}
                </div>

                {/* Ô tìm kiếm */}
                <div style={{ position: 'relative', minWidth: '220px', flex: '1', maxWidth: '300px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input 
                    type="text" 
                    placeholder="Tìm theo nội dung, số tiền..." 
                    className="input-field" 
                    style={{ width: '100%', paddingLeft: '32px', fontSize: '0.8rem' }}
                    value={searchKeyword}
                    onChange={e => setSearchKeyword(e.target.value)}
                  />
                  {searchKeyword && (
                    <button 
                      onClick={() => setSearchKeyword('')} 
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}
                      className="text-secondary hover:text-primary"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

              </div>

              {/* BANNER THÔNG TIN BỘ LỌC ĐANG CHỌN */}
              <div 
                className="flex flex-wrap items-center justify-between p-3 rounded-lg mb-4"
                style={{ 
                  background: filterCategory === 'IN' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)', 
                  border: `1px solid ${filterCategory === 'IN' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(59, 130, 246, 0.25)'}` 
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">
                    {filterCategory === 'ALL' && '📋 Xem tất cả các khoản'}
                    {filterCategory === 'SUB_CONTRACTORS' && '👷 Đang lọc: Tổng 5 đội thợ phụ trợ (Điện, Sơn, Cơ khí, Nhôm kính, Thợ khác)'}
                    {filterCategory === 'IN' && '💰 Đang lọc: Các khoản tiền vào (Khách thanh toán)'}
                    {EXPENSE_CATEGORIES[filterCategory] && `${EXPENSE_CATEGORIES[filterCategory].icon} Đang lọc: ${EXPENSE_CATEGORIES[filterCategory].label}`}
                  </span>
                  <span className="badge badge-secondary text-xs">
                    {filteredTransactions.length} giao dịch
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs text-secondary font-medium">Tổng tiền theo bộ lọc: </span>
                    <strong className="text-base" style={{ color: filterCategory === 'IN' ? 'var(--success)' : 'var(--danger)' }}>
                      {filterCategory === 'IN' 
                        ? `+${filteredTotal.inSum.toLocaleString('vi-VN')} đ` 
                        : filterCategory === 'ALL'
                          ? `Chi: -${filteredTotal.outSum.toLocaleString('vi-VN')} đ | Thu: +${filteredTotal.inSum.toLocaleString('vi-VN')} đ`
                          : `-${filteredTotal.outSum.toLocaleString('vi-VN')} đ`}
                    </strong>
                  </div>

                  {(filterCategory !== 'ALL' || filterStartDate || filterEndDate || searchKeyword) && (
                    <button 
                      onClick={() => {
                        setFilterCategory('ALL');
                        setFilterStartDate('');
                        setFilterEndDate('');
                        setSearchKeyword('');
                      }}
                      className="btn btn-outline text-xs flex items-center gap-1"
                      style={{ padding: '3px 8px' }}
                      title="Quay về xem tất cả"
                    >
                      <RotateCcw size={12} /> Bỏ lọc
                    </button>
                  )}
                </div>
              </div>

              {/* BẢNG DỮ LIỆU GIAO DỊCH */}
              <div className="table-container">
                <table className="table" style={{ minWidth: '780px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '45px' }}>STT</th>
                      <th style={{ width: '105px' }}>Ngày</th>
                      <th style={{ width: '90px' }}>Loại</th>
                      <th style={{ width: '140px' }}>Phân loại</th>
                      <th style={{ minWidth: '220px' }}>Nội dung</th>
                      <th className="text-right" style={{ width: '140px' }}>Số tiền</th>
                      <th className="text-right no-print" style={{ width: '90px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((t, idx) => {
                      const catInfo = EXPENSE_CATEGORIES[t.expenseCategory] || (t.type === 'OUT' ? EXPENSE_CATEGORIES.KHAC : null);
                      return (
                        <tr key={t.id} style={{ background: editingTransId === t.id ? 'var(--bg-secondary)' : 'transparent' }}>
                          <td className="text-secondary text-xs">{idx + 1}</td>
                          <td className="text-sm">{t.date}</td>
                          <td>
                            {t.type === 'IN' ? <span className="badge badge-success">Tiền Vào</span> : <span className="badge badge-danger">Tiền Ra</span>}
                          </td>
                          <td>
                            {t.type === 'IN' ? (
                              <span className="text-secondary text-xs">-</span>
                            ) : (
                              <span className={`badge ${catInfo?.badge || 'badge-secondary'}`}>
                                {catInfo?.icon} {catInfo?.label}
                              </span>
                            )}
                          </td>
                          <td className="text-sm font-medium" style={{ minWidth: '220px', lineHeight: '1.45' }}>{t.note}</td>
                          <td className="text-right font-bold text-sm" style={{ color: t.type === 'IN' ? 'var(--success)' : 'var(--danger)' }}>
                            {t.type === 'IN' ? '+' : '-'}{t.amount.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="text-right no-print">
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => requestEditTrans(t)} className="icon-btn text-info" title="Sửa (Cần mật khẩu két sắt)"><Edit size={16} /></button>
                              <button onClick={() => requestDeleteTrans(t.id)} className="icon-btn text-danger" title="Xóa (Cần mật khẩu két sắt)"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center text-secondary py-6">
                          <div className="flex flex-col items-center justify-center">
                            <Filter size={28} className="opacity-40 mb-1" />
                            <div>Không tìm thấy giao dịch nào phù hợp với bộ lọc hiện tại.</div>
                            <button 
                              onClick={() => { setFilterCategory('ALL'); setFilterStartDate(''); setFilterEndDate(''); setSearchKeyword(''); }}
                              className="btn btn-outline text-xs mt-2 text-primary"
                            >
                              👉 Xem toàn bộ giao dịch
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal Chuyển nhanh Khoản Phát Sinh sang Sổ Quỹ */}
      {transferModal.isOpen && (
        <div className="modal-overlay" onClick={() => setTransferModal({ ...transferModal, isOpen: false })}>
          <div className="modal-content" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <ArrowRightLeft size={18} className="text-primary" />
                  Chuyển Phát Sinh sang Sổ Quỹ
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  Tạo ngay một giao dịch Thu hoặc Chi tương ứng trong Sổ quỹ Thu/Chi công trình.
                </p>
              </div>
              <button onClick={() => setTransferModal({ ...transferModal, isOpen: false })} className="icon-btn">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmTransfer} className="modal-body flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label className="input-label">Ngày ghi sổ quỹ</label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    value={transferModal.date}
                    onChange={e => setTransferModal({ ...transferModal, date: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Loại giao dịch Sổ quỹ</label>
                  <select
                    className="input-field"
                    value={transferModal.type}
                    onChange={e => setTransferModal({ ...transferModal, type: e.target.value })}
                  >
                    <option value="IN">Tiền Vào (Khách thanh toán phát sinh)</option>
                    <option value="OUT">Tiền Ra (Chi trả đội thợ / vật tư phát sinh)</option>
                  </select>
                </div>
              </div>

              {transferModal.type === 'OUT' && (
                <div className="input-group">
                  <label className="input-label font-bold" style={{ color: 'var(--danger)' }}>Phân loại khoản chi</label>
                  <select
                    className="input-field"
                    style={{ borderColor: 'var(--danger)' }}
                    value={transferModal.expenseCategory}
                    onChange={e => setTransferModal({ ...transferModal, expenseCategory: e.target.value })}
                  >
                    {EXPENSE_CATEGORY_LIST.map((cat) => (
                      <option key={cat.key} value={cat.key}>{cat.optionLabel}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Số tiền ghi sổ quỹ (VNĐ)</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="input-field"
                  value={transferModal.amount}
                  onChange={e => setTransferModal({ ...transferModal, amount: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Nội dung giao dịch</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={transferModal.note}
                  onChange={e => setTransferModal({ ...transferModal, note: e.target.value })}
                />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={transferModal.markAsPaid}
                  onChange={e => setTransferModal({ ...transferModal, markAsPaid: e.target.checked })}
                />
                <span>Tự động đánh dấu mục phát sinh này là <strong>Đã thanh toán</strong></span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn btn-outline" onClick={() => setTransferModal({ ...transferModal, isOpen: false })}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  <ArrowRightLeft size={15} /> Xác nhận chuyển sang Sổ quỹ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Mật Khẩu Két Sắt */}
      <PasswordModal 
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        onSuccess={handleAuthSuccess}
        title={authModal.title}
        description={authModal.desc}
      />
    </div>
  );
};

export default ProjectDetail;

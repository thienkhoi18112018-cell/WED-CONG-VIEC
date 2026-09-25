import React, { useState, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  ArrowLeft, CheckCircle, Edit, Trash2, Camera, Download, 
  Copy, Printer, FileSpreadsheet, Filter, Search, RotateCcw, X, Check, Calendar 
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const ProjectDetail = () => {
  const { id } = useParams();
  const { 
    projects, updateProject, 
    addDailyLog, updateDailyLog, removeDailyLog, 
    addTransaction, updateTransaction, removeTransaction 
  } = useAppContext();
  
  const project = projects.find(p => p?.id?.toString() === id?.toString());

  const [activeTab, setActiveTab] = useState('LOGS');
  
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
  const [expenseCategory, setExpenseCategory] = useState('THO_XAY'); // 'THO_XAY' | 'THO_KHAC' | 'VAT_TU' | 'KHAC'
  const [transAmount, setTransAmount] = useState('');
  const [transNote, setTransNote] = useState('');

  // State Bộ lọc Sổ Quỹ Thu/Chi (Yêu cầu lọc theo phân loại & xuất báo cáo theo từng đội)
  const [filterCategory, setFilterCategory] = useState('ALL'); // 'ALL' | 'THO_XAY' | 'THO_KHAC' | 'VAT_TU' | 'KHAC' | 'IN'
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');

  const EXPENSE_CATEGORIES = {
    THO_XAY: { label: 'Tiền thợ xây', badge: 'badge-primary', icon: '🧱' },
    THO_KHAC: { label: 'Tiền thợ khác', badge: 'badge-info', icon: '⚡' },
    VAT_TU: { label: 'Tiền vật tư', badge: 'badge-orange', icon: '🏗️' },
    KHAC: { label: 'Tiền khác', badge: 'badge-secondary', icon: '📦' }
  };

  // Refs cho xuất PDF
  const reportRef = useRef();

  if (!project) return <div className="page-container">Dự án không tồn tại!</div>;

  const calculateProgress = () => {
    if (project.isCompleted) return 100;
    const expectedDays = project.durationMonths * 30;
    const workingDaysCount = (project.dailyLogs || []).filter(l => l.isWorking).length;
    return Math.min(Math.round((workingDaysCount / expectedDays) * 100), 99);
  };

  const currentProgress = calculateProgress();
  
  const checkDelay = () => {
    if (project.isCompleted) return false;
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

  // Tính toán tổng số liệu gốc
  const totalIn = (project.transactions || []).filter(t => t.type === 'IN').reduce((sum, t) => sum + t.amount, 0);
  const totalOut = (project.transactions || []).filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.amount, 0);

  // Chi tiết từng nhóm chi phí đầu ra
  const totalThoXay = (project.transactions || []).filter(t => t.type === 'OUT' && t.expenseCategory === 'THO_XAY').reduce((sum, t) => sum + t.amount, 0);
  const totalThoKhac = (project.transactions || []).filter(t => t.type === 'OUT' && t.expenseCategory === 'THO_KHAC').reduce((sum, t) => sum + t.amount, 0);
  const totalVatTu = (project.transactions || []).filter(t => t.type === 'OUT' && t.expenseCategory === 'VAT_TU').reduce((sum, t) => sum + t.amount, 0);
  const totalKhac = (project.transactions || []).filter(t => t.type === 'OUT' && (!t.expenseCategory || t.expenseCategory === 'KHAC')).reduce((sum, t) => sum + t.amount, 0);

  // Số lượng từng nhóm
  const countAll = (project.transactions || []).length;
  const countThoXay = (project.transactions || []).filter(t => t.type === 'OUT' && t.expenseCategory === 'THO_XAY').length;
  const countThoKhac = (project.transactions || []).filter(t => t.type === 'OUT' && t.expenseCategory === 'THO_KHAC').length;
  const countVatTu = (project.transactions || []).filter(t => t.type === 'OUT' && t.expenseCategory === 'VAT_TU').length;
  const countKhac = (project.transactions || []).filter(t => t.type === 'OUT' && (!t.expenseCategory || t.expenseCategory === 'KHAC')).length;
  const countIn = (project.transactions || []).filter(t => t.type === 'IN').length;

  // Lọc danh sách giao dịch theo Phân loại, Thời gian, Từ khóa
  const filteredTransactions = useMemo(() => {
    return (project.transactions || [])
      .filter(t => {
        // 1. Lọc theo Phân loại
        if (filterCategory === 'IN') {
          if (t.type !== 'IN') return false;
        } else if (filterCategory === 'THO_XAY') {
          if (t.type !== 'OUT' || t.expenseCategory !== 'THO_XAY') return false;
        } else if (filterCategory === 'THO_KHAC') {
          if (t.type !== 'OUT' || t.expenseCategory !== 'THO_KHAC') return false;
        } else if (filterCategory === 'VAT_TU') {
          if (t.type !== 'OUT' || t.expenseCategory !== 'VAT_TU') return false;
        } else if (filterCategory === 'KHAC') {
          if (t.type !== 'OUT' || (t.expenseCategory && t.expenseCategory !== 'KHAC')) return false;
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
          const catLabel = (EXPENSE_CATEGORIES[t.expenseCategory]?.label || '').toLowerCase();
          return matchNote || matchAmount || catLabel.includes(kw);
        }

        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [project.transactions, filterCategory, filterStartDate, filterEndDate, searchKeyword]);

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

  // Tiêu đề báo cáo tự động theo phân loại đang lọc
  const getReportTitle = () => {
    if (activeTab === 'LOGS') return 'BÁO CÁO NHẬT KÝ THI CÔNG';
    if (filterCategory === 'THO_XAY') return 'BẢNG KÊ QUYẾT TOÁN & TẠM ỨNG TIỀN THỢ XÂY';
    if (filterCategory === 'THO_KHAC') return 'BẢNG KÊ CHI PHÍ CÁC ĐỘI THỢ PHỤ TRỢ (ĐIỆN, NƯỚC, SƠN, TRẦN...)';
    if (filterCategory === 'VAT_TU') return 'BẢNG KÊ CHI TIẾT CUNG CẤP VẬT TƯ CÔNG TRÌNH';
    if (filterCategory === 'KHAC') return 'BẢNG KÊ CHI TIẾT CÁC KHOẢN CHI PHÍ KHÁC';
    if (filterCategory === 'IN') return 'BẢNG KÊ CÁC ĐỢT KHÁCH HÀNG TẠM ỨNG & THANH TOÁN';
    return 'BÁO CÁO TỔNG HỢP SỔ QUỸ THU CHI CÔNG TRÌNH';
  };

  // 1. Xuất báo cáo sao chép gửi Zalo
  const copyForZalo = () => {
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
        const cat = EXPENSE_CATEGORIES[t.expenseCategory]?.label || (t.type === 'IN' ? 'Thu' : 'Khác');
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
    const catName = filterCategory === 'ALL' ? 'Tong_hop' : filterCategory;
    const safeProjectName = (project.name || '').replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_');
    const filename = `Bao_cao_${catName}_${safeProjectName}_${new Date().toISOString().slice(0, 10)}.csv`;
    
    const headers = ['STT', 'Ngày', 'Loại giao dịch', 'Phân loại', 'Nội dung chi tiết', 'Số tiền (VNĐ)'];
    const rows = filteredTransactions.map((t, i) => [
      i + 1,
      t.date,
      t.type === 'IN' ? 'Tiền Vào' : 'Tiền Ra',
      `"${(EXPENSE_CATEGORIES[t.expenseCategory]?.label || (t.type === 'IN' ? 'Thu' : 'Khác')).replace(/"/g, '""')}"`,
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
  const [isExporting, setIsExporting] = useState(false);

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
          {activeTab === 'FINANCE' && (
            <button onClick={copyForZalo} className="btn btn-outline flex items-center gap-1.5" title="Copy tin nhắn có định dạng đẹp để dán vào Zalo gửi cho thợ hoặc đối tác">
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
            <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
            <p className="text-secondary mb-2">
              Phụ trách: <strong>{project.manager}</strong> | Bắt đầu: {project.startDate} | Dự kiến: {project.durationMonths} tháng
            </p>
            <p className="text-secondary mb-4">
              Tổng giá trị hợp đồng: <strong>{project.totalValue?.toLocaleString('vi-VN')} VNĐ</strong>
            </p>
            
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

      {/* Tabs chuyển đổi giữa Nhật ký & Sổ quỹ */}
      <div className="flex gap-4 mb-6 no-print" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <button 
          className={`pb-2 px-4 ${activeTab === 'LOGS' ? 'border-b-2 font-bold' : 'text-secondary'}`} 
          style={{ borderColor: activeTab === 'LOGS' ? 'var(--accent-primary)' : 'transparent' }}
          onClick={() => setActiveTab('LOGS')}
        >
          Nhật ký thi công
        </button>
        <button 
          className={`pb-2 px-4 ${activeTab === 'FINANCE' ? 'border-b-2 font-bold' : 'text-secondary'}`}
          style={{ borderColor: activeTab === 'FINANCE' ? 'var(--accent-primary)' : 'transparent' }}
          onClick={() => setActiveTab('FINANCE')}
        >
          Sổ quỹ Thu/Chi
        </button>
      </div>

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
      {/* TAB 2: SỔ QUỸ THU / CHI (CÓ BỘ LỌC TỪNG ĐỘI & XUẤT BÁO CÁO) */}
      {/* ========================================================= */}
      {activeTab === 'FINANCE' && (
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
                  <span className="text-xs opacity-75">{countThoXay + countThoKhac + countVatTu + countKhac} giao dịch</span>
                </div>
                <div className="text-2xl font-bold">{totalOut.toLocaleString('vi-VN')} VNĐ</div>
                <div className="text-xs opacity-75 mt-1">Gồm thợ xây, thợ khác, vật tư & chi phí khác</div>
              </div>
            </div>

            {/* Thống kê bóc tách 4 nhóm chi phí - CÓ THỂ CLICK VÀO ĐỂ LỌC NHANH */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2" style={{ maxWidth: '850px' }}>
              
              {/* Card 1: Thợ xây */}
              <div 
                className={`card card-clickable ${filterCategory === 'THO_XAY' ? 'active-card' : ''}`}
                style={{ padding: '1rem', borderLeft: '4px solid var(--accent-primary)' }}
                onClick={() => setFilterCategory(filterCategory === 'THO_XAY' ? 'ALL' : 'THO_XAY')}
                title="Nhấp để lọc riêng tiền thợ xây ứng/trả để xuất báo cáo gửi đội thợ"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-secondary font-medium">🧱 Thợ xây ứng/trả</span>
                  <span className="text-xs badge badge-primary">{countThoXay}</span>
                </div>
                <div className="text-lg font-bold text-primary">{totalThoXay.toLocaleString('vi-VN')} <span className="text-xs">đ</span></div>
                <div className="text-xs mt-1" style={{ color: filterCategory === 'THO_XAY' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                  {filterCategory === 'THO_XAY' ? '● Đang lọc đội này' : '👉 Nhấp để lọc'}
                </div>
              </div>

              {/* Card 2: Thợ khác */}
              <div 
                className={`card card-clickable ${filterCategory === 'THO_KHAC' ? 'active-card' : ''}`}
                style={{ padding: '1rem', borderLeft: '4px solid var(--info)' }}
                onClick={() => setFilterCategory(filterCategory === 'THO_KHAC' ? 'ALL' : 'THO_KHAC')}
                title="Nhấp để lọc tiền thợ điện, nước, thạch cao, sơn, nhôm kính..."
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-secondary font-medium">⚡ Thợ khác chi</span>
                  <span className="text-xs badge badge-info">{countThoKhac}</span>
                </div>
                <div className="text-lg font-bold" style={{ color: 'var(--info)' }}>{totalThoKhac.toLocaleString('vi-VN')} <span className="text-xs">đ</span></div>
                <div className="text-xs mt-1" style={{ color: filterCategory === 'THO_KHAC' ? 'var(--info)' : 'var(--text-secondary)' }}>
                  {filterCategory === 'THO_KHAC' ? '● Đang lọc đội này' : '👉 Nhấp để lọc'}
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
                  <span className="text-xs badge badge-orange">{countVatTu}</span>
                </div>
                <div className="text-lg font-bold" style={{ color: 'var(--accent-secondary)' }}>{totalVatTu.toLocaleString('vi-VN')} <span className="text-xs">đ</span></div>
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
                  <span className="text-xs badge badge-secondary">{countKhac}</span>
                </div>
                <div className="text-lg font-bold text-secondary">{totalKhac.toLocaleString('vi-VN')} <span className="text-xs">đ</span></div>
                <div className="text-xs mt-1" style={{ color: filterCategory === 'KHAC' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {filterCategory === 'KHAC' ? '● Đang lọc mục này' : '👉 Nhấp để lọc'}
                </div>
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
                      <option value="THO_XAY">🧱 Tiền thợ xây (Ứng thợ, tiền công)</option>
                      <option value="THO_KHAC">⚡ Tiền thợ khác (Điện, nước, thạch cao, sơn, nhôm...)</option>
                      <option value="VAT_TU">🏗️ Tiền vật tư (Xi măng, cát, đá, sắt thép, gạch...)</option>
                      <option value="KHAC">📦 Tiền khác (Vận chuyển, máy móc, phát sinh...)</option>
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
                  className={`filter-pill ${filterCategory === 'THO_XAY' ? 'active' : ''}`}
                  onClick={() => setFilterCategory('THO_XAY')}
                >
                  🧱 Tiền thợ xây ({countThoXay})
                </button>

                <button 
                  className={`filter-pill ${filterCategory === 'THO_KHAC' ? 'active' : ''}`}
                  onClick={() => setFilterCategory('THO_KHAC')}
                >
                  ⚡ Tiền thợ khác ({countThoKhac})
                </button>

                <button 
                  className={`filter-pill ${filterCategory === 'VAT_TU' ? 'active' : ''}`}
                  onClick={() => setFilterCategory('VAT_TU')}
                >
                  🏗️ Tiền vật tư ({countVatTu})
                </button>

                <button 
                  className={`filter-pill ${filterCategory === 'KHAC' ? 'active' : ''}`}
                  onClick={() => setFilterCategory('KHAC')}
                >
                  📦 Chi phí khác ({countKhac})
                </button>

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
                    {filterCategory === 'THO_XAY' && '🧱 Đang lọc: Tiền thợ xây (Ứng thợ, tiền công)'}
                    {filterCategory === 'THO_KHAC' && '⚡ Đang lọc: Tiền thợ khác (Điện, nước, thạch cao, sơn...)'}
                    {filterCategory === 'VAT_TU' && '🏗️ Đang lọc: Tiền vật tư công trình'}
                    {filterCategory === 'KHAC' && '📦 Đang lọc: Các chi phí phát sinh khác'}
                    {filterCategory === 'IN' && '💰 Đang lọc: Các khoản tiền vào (Khách thanh toán)'}
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
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '45px' }}>STT</th>
                      <th style={{ width: '105px' }}>Ngày</th>
                      <th style={{ width: '90px' }}>Loại</th>
                      <th style={{ width: '140px' }}>Phân loại</th>
                      <th>Nội dung</th>
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
                          <td className="text-sm font-medium">{t.note}</td>
                          <td className="text-right font-bold text-sm" style={{ color: t.type === 'IN' ? 'var(--success)' : 'var(--danger)' }}>
                            {t.type === 'IN' ? '+' : '-'}{t.amount.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="text-right no-print">
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => startEditTrans(t)} className="icon-btn text-info" title="Sửa"><Edit size={16} /></button>
                              <button onClick={() => removeTransaction(project.id, t.id)} className="icon-btn text-danger" title="Xóa"><Trash2 size={16} /></button>
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
    </div>
  );
};

export default ProjectDetail;

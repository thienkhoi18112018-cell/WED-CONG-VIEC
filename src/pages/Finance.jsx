import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAppContext } from '../context/AppContext';
import { 
  Lock, TrendingUp, TrendingDown, DollarSign, Calendar, Clock, 
  Building2, HardHat, X, Search, ExternalLink, Download, Eye, Filter 
} from 'lucide-react';

const PROJECT_EXPENSE_CATEGORIES = {
  THO_XAY: { label: 'Tiền thợ xây', badge: 'badge-primary', icon: '🧱' },
  THO_KHAC: { label: 'Tiền thợ khác', badge: 'badge-info', icon: '⚡' },
  VAT_TU: { label: 'Tiền vật tư', badge: 'badge-orange', icon: '🏗️' },
  KHAC: { label: 'Tiền khác', badge: 'badge-secondary', icon: '📦' }
};

const COMPANY_EXPENSE_CATEGORIES = {
  LUONG: { label: 'Trả lương & Thưởng', badge: 'badge-primary', icon: '💼' },
  VAN_PHONG: { label: 'Văn phòng & Lặt vặt', badge: 'badge-info', icon: '☕' },
  MAT_BANG: { label: 'Mặt bằng, Điện, Nước', badge: 'badge-warning', icon: '🏢' },
  TIEP_KHACH: { label: 'Tiếp khách & Đối ngoại', badge: 'badge-orange', icon: '🤝' },
  XANG_XE: { label: 'Xăng xe & Đi lại', badge: 'badge-secondary', icon: '🚗' },
  KHAC: { label: 'Chi phí khác', badge: 'badge-secondary', icon: '📦' }
};

const Finance = () => {
  const { role, projects, designs, companyExpenses } = useAppContext();

  // State cho Modal chi tiết chi tiêu khi click vào các thẻ
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPeriod, setModalPeriod] = useState('TODAY'); // 'TODAY' | 'WEEK' | 'MONTH' | 'ALL' | 'COMPANY' | 'PROJECTS'
  const [modalSourceFilter, setModalSourceFilter] = useState('ALL'); // 'ALL' | 'CONSTRUCTION' | 'DESIGN' | 'COMPANY'
  const [modalSearch, setModalSearch] = useState('');

  // Tổng hợp dữ liệu
  const { 
    totalIn, 
    totalOut, 
    totalProjectOut, 
    totalCompanyOut, 
    spentToday, 
    spentThisWeek, 
    totalContractValue, 
    chartData, 
    projectBreakdown,
    allExpenseItems
  } = useMemo(() => {
    let tIn = 0;
    let tProjectOut = 0;
    let tCompanyOut = 0;
    let tContract = 0;
    
    // Ngày giờ hiện tại địa phương
    const now = new Date();
    const currentYear = now.getFullYear();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const currentMonthStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

    // Xác định Thứ 2 và Chủ Nhật của tuần hiện tại
    const dayOfWeek = now.getDay(); // 0: CN, 1: T2, ...
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    let todayOutSum = 0;
    let thisWeekOutSum = 0;

    const allExpenses = [];
    const allTransactions = [];
    const pBreakdown = [];

    // 1. Quét giao dịch từ Dự án Thi Công
    (projects || []).forEach(p => {
      let pIn = 0; 
      let pOut = 0;
      (p.transactions || []).forEach((t, idx) => {
        allTransactions.push(t);
        if (t.type === 'IN') { 
          tIn += t.amount; 
          pIn += t.amount; 
        }
        if (t.type === 'OUT') { 
          tProjectOut += t.amount; 
          pOut += t.amount;
          
          const isToday = t.date === todayStr;
          const d = new Date(t.date);
          const isWeek = d >= monday && d <= sunday;
          const isMonth = t.date && t.date.startsWith(currentMonthStr);

          if (isToday) todayOutSum += t.amount;
          if (isWeek) thisWeekOutSum += t.amount;

          const catInfo = PROJECT_EXPENSE_CATEGORIES[t.expenseCategory] || PROJECT_EXPENSE_CATEGORIES.KHAC;

          allExpenses.push({
            id: `p-${p.id}-${t.id || idx}`,
            date: t.date,
            amount: t.amount,
            note: t.note || 'Chi phí thi công',
            sourceType: 'CONSTRUCTION',
            sourceTypeName: 'Dự án Thi Công',
            sourceName: p.name,
            sourceId: p.id,
            sourceLink: `/dashboard/construction/${p.id}`,
            category: t.expenseCategory || 'KHAC',
            categoryLabel: catInfo.label,
            categoryIcon: catInfo.icon,
            categoryBadge: catInfo.badge,
            isToday,
            isThisWeek: isWeek,
            isThisMonth: isMonth
          });
        }
      });
      pBreakdown.push({ id: `C-${p.id}`, type: 'Thi công', name: p.name, in: pIn, out: pOut, totalValue: p.totalValue });
      
      if (p.startDate && p.startDate.startsWith(currentYear.toString())) {
        tContract += (Number(p.totalValue) || 0);
      }
    });

    // 2. Quét giao dịch từ Hồ sơ Thiết Kế
    (designs || []).forEach(d => {
      let dIn = 0; 
      let dOut = 0;
      (d.transactions || []).forEach((t, idx) => {
        allTransactions.push(t);
        if (t.type === 'IN') { 
          tIn += t.amount; 
          dIn += t.amount; 
        }
        if (t.type === 'OUT') { 
          tProjectOut += t.amount; 
          dOut += t.amount; 

          const isToday = t.date === todayStr;
          const dateObj = new Date(t.date);
          const isWeek = dateObj >= monday && dateObj <= sunday;
          const isMonth = t.date && t.date.startsWith(currentMonthStr);

          if (isToday) todayOutSum += t.amount;
          if (isWeek) thisWeekOutSum += t.amount;

          allExpenses.push({
            id: `d-${d.id}-${t.id || idx}`,
            date: t.date,
            amount: t.amount,
            note: t.note || 'Chi phí thiết kế',
            sourceType: 'DESIGN',
            sourceTypeName: 'Hồ sơ Thiết Kế',
            sourceName: d.name,
            sourceId: d.id,
            sourceLink: `/dashboard/design/${d.id}`,
            category: 'THIET_KE',
            categoryLabel: 'Chi phí thiết kế',
            categoryIcon: '📐',
            categoryBadge: 'badge-info',
            isToday,
            isThisWeek: isWeek,
            isThisMonth: isMonth
          });
        }
      });
      pBreakdown.push({ id: `D-${d.id}`, type: 'Thiết kế', name: d.name, in: dIn, out: dOut, totalValue: d.totalValue });
      
      if (d.startDate && d.startDate.startsWith(currentYear.toString())) {
        tContract += (Number(d.totalValue) || 0);
      }
    });

    // 3. Quét Chi phí hoạt động công ty
    (companyExpenses || []).forEach((exp, idx) => {
      const amt = Number(exp.amount) || 0;
      tCompanyOut += amt;

      const isToday = exp.date === todayStr;
      const dateObj = new Date(exp.date);
      const isWeek = dateObj >= monday && dateObj <= sunday;
      const isMonth = exp.date && exp.date.startsWith(currentMonthStr);

      if (isToday) todayOutSum += amt;
      if (isWeek) thisWeekOutSum += amt;

      const catInfo = COMPANY_EXPENSE_CATEGORIES[exp.category] || COMPANY_EXPENSE_CATEGORIES.KHAC;

      allExpenses.push({
        id: `c-${exp.id || idx}`,
        date: exp.date,
        amount: amt,
        note: exp.note ? (exp.recipient ? `${exp.note} (Người nhận: ${exp.recipient})` : exp.note) : (exp.recipient ? `Chi trả: ${exp.recipient}` : 'Chi phí vận hành'),
        sourceType: 'COMPANY',
        sourceTypeName: 'C.Ty (Vận hành)',
        sourceName: 'Văn phòng công ty',
        sourceId: null,
        sourceLink: `/dashboard/company-expenses`,
        category: exp.category || 'KHAC',
        categoryLabel: catInfo.label,
        categoryIcon: catInfo.icon,
        categoryBadge: catInfo.badge,
        isToday,
        isThisWeek: isWeek,
        isThisMonth: isMonth
      });
    });

    const totalAllOut = tProjectOut + tCompanyOut;

    // Gom nhóm theo tháng cho biểu đồ (năm hiện tại)
    const months = Array.from({ length: 12 }, (_, i) => ({
      name: `T${i + 1}`,
      thu: 0,
      chi: 0
    }));

    allTransactions.forEach(t => {
      const date = new Date(t.date);
      if (date.getFullYear() === currentYear) {
        const monthIndex = date.getMonth();
        if (t.type === 'IN') months[monthIndex].thu += t.amount;
        if (t.type === 'OUT') months[monthIndex].chi += t.amount;
      }
    });

    (companyExpenses || []).forEach(exp => {
      const date = new Date(exp.date);
      if (date.getFullYear() === currentYear) {
        const monthIndex = date.getMonth();
        months[monthIndex].chi += (Number(exp.amount) || 0);
      }
    });

    return { 
      totalIn: tIn, 
      totalOut: totalAllOut,
      totalProjectOut: tProjectOut,
      totalCompanyOut: tCompanyOut,
      spentToday: todayOutSum,
      spentThisWeek: thisWeekOutSum,
      totalContractValue: tContract, 
      chartData: months, 
      projectBreakdown: pBreakdown,
      allExpenseItems: allExpenses
    };
  }, [projects, designs, companyExpenses]);

  // Bộ lọc cho Modal chi tiết
  const filteredModalExpenses = useMemo(() => {
    return (allExpenseItems || [])
      .filter(item => {
        // Lọc theo thời gian / phân hệ
        if (modalPeriod === 'TODAY' && !item.isToday) return false;
        if (modalPeriod === 'WEEK' && !item.isThisWeek) return false;
        if (modalPeriod === 'MONTH' && !item.isThisMonth) return false;
        if (modalPeriod === 'COMPANY' && item.sourceType !== 'COMPANY') return false;
        if (modalPeriod === 'PROJECTS' && item.sourceType === 'COMPANY') return false;

        // Lọc theo nguồn
        if (modalSourceFilter !== 'ALL' && item.sourceType !== modalSourceFilter) return false;

        // Tìm kiếm theo từ khóa
        if (modalSearch.trim()) {
          const kw = modalSearch.toLowerCase();
          const mNote = (item.note || '').toLowerCase().includes(kw);
          const mSource = (item.sourceName || '').toLowerCase().includes(kw);
          const mCat = (item.categoryLabel || '').toLowerCase().includes(kw);
          const mAmt = (item.amount || '').toString().includes(kw);
          return mNote || mSource || mCat || mAmt;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [allExpenseItems, modalPeriod, modalSourceFilter, modalSearch]);

  const modalTotalSum = useMemo(() => {
    return filteredModalExpenses.reduce((sum, item) => sum + item.amount, 0);
  }, [filteredModalExpenses]);

  // Đếm số lượng theo chu kỳ
  const countToday = useMemo(() => (allExpenseItems || []).filter(e => e.isToday).length, [allExpenseItems]);
  const countWeek = useMemo(() => (allExpenseItems || []).filter(e => e.isThisWeek).length, [allExpenseItems]);
  const countMonth = useMemo(() => (allExpenseItems || []).filter(e => e.isThisMonth).length, [allExpenseItems]);
  const countAll = useMemo(() => (allExpenseItems || []).length, [allExpenseItems]);
  const countCompany = useMemo(() => (allExpenseItems || []).filter(e => e.sourceType === 'COMPANY').length, [allExpenseItems]);
  const countProjects = useMemo(() => (allExpenseItems || []).filter(e => e.sourceType !== 'COMPANY').length, [allExpenseItems]);

  const openModal = (period, source = 'ALL') => {
    setModalPeriod(period);
    setModalSourceFilter(source);
    setModalSearch('');
    setIsModalOpen(true);
  };

  const exportModalCSV = () => {
    const periodLabel = modalPeriod === 'TODAY' ? 'Hom_nay' : modalPeriod === 'WEEK' ? 'Tuan_nay' : 'Chi_tiet';
    const filename = `Chi_tiet_chi_phi_${periodLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
    const headers = ['STT', 'Ngày', 'Ở đâu / Nguồn', 'Loại hình', 'Mục chi (Phân loại)', 'Nội dung chi tiết', 'Số tiền (VNĐ)'];
    const rows = filteredModalExpenses.map((item, idx) => [
      idx + 1,
      item.date,
      `"${(item.sourceName || '').replace(/"/g, '""')}"`,
      item.sourceTypeName,
      `"${(item.categoryLabel || '').replace(/"/g, '""')}"`,
      `"${(item.note || '').replace(/"/g, '""')}"`,
      item.amount
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

  if (role !== 'ADMIN') {
    return (
      <div className="page-container animate-fade-in flex flex-col items-center justify-center" style={{ minHeight: '80vh' }}>
        <div className="card text-center" style={{ maxWidth: '400px', width: '100%', padding: '3rem' }}>
          <div className="flex justify-center mb-4 text-danger">
            <Lock size={48} style={{ color: 'var(--danger)' }} />
          </div>
          <h2 className="text-xl font-bold mb-2">Quyền truy cập bị từ chối</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Chỉ Quản trị viên (ADMIN) mới có quyền xem dữ liệu tài chính.
          </p>
        </div>
      </div>
    );
  }

  const profit = totalIn - totalOut;

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header mb-6">
        <h1 className="page-title text-2xl font-bold">Quản lý Tài chính Tổng hợp</h1>
        <p className="page-subtitle text-secondary">
          Dữ liệu được tự động tổng hợp từ sổ quỹ tất cả dự án và chi phí vận hành công ty.
        </p>
      </div>

      {/* Hàng 1: Dòng tiền chính & Lợi nhuận */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-2 text-secondary">
            <TrendingUp size={20} className="text-success" />
            <span className="font-bold">Tổng Thu</span>
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-success">{totalIn.toLocaleString('vi-VN')} đ</div>
          <div className="text-xs text-secondary mt-1">Từ thi công & thiết kế</div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2 text-secondary">
            <TrendingDown size={20} className="text-danger" />
            <span className="font-bold">Tổng Chi Toàn Hệ Thống</span>
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-danger">{totalOut.toLocaleString('vi-VN')} đ</div>
          <div className="text-xs text-secondary mt-1">
            Dự án: {totalProjectOut.toLocaleString('vi-VN')}đ | C.Ty: {totalCompanyOut.toLocaleString('vi-VN')}đ
          </div>
        </div>

        <div className="card" style={{ background: 'var(--accent-primary)', color: 'white' }}>
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <DollarSign size={20} />
            <span className="font-bold">Lợi Nhuận Ròng Thực Tế</span>
          </div>
          <div className="text-2xl lg:text-3xl font-bold">{profit.toLocaleString('vi-VN')} đ</div>
          <div className="text-xs opacity-80 mt-1">Đã trừ chi phí nuôi công ty</div>
        </div>

        <div className="card" style={{ border: '2px solid var(--info)' }}>
          <div className="flex items-center gap-2 mb-2 text-info">
            <DollarSign size={20} />
            <span className="font-bold">Giá Trị HĐ Năm {new Date().getFullYear()}</span>
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-info">{totalContractValue.toLocaleString('vi-VN')} đ</div>
          <div className="text-xs text-secondary mt-1">Tổng hợp đồng ký năm nay</div>
        </div>
      </div>

      {/* Hàng 2: Theo dõi chi tiêu tức thời & Phân hệ - CÓ THỂ CLICK VÀO XEM CHI TIẾT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        
        {/* Thẻ 1: Tiền đã chi hôm nay */}
        <div 
          className="card card-clickable" 
          style={{ borderLeft: '4px solid var(--warning)', background: 'rgba(245, 158, 11, 0.05)' }}
          onClick={() => openModal('TODAY')}
          title="Nhấp vào để xem chi tiết hôm nay đã chi mục gì, ở đâu, số tiền cụ thể"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold" style={{ color: 'var(--warning)' }}>⚡ TIỀN ĐÃ CHI HÔM NAY</span>
            <Clock size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>
            {spentToday.toLocaleString('vi-VN')} <span className="text-sm">đ</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-2 pt-2" style={{ borderTop: '1px dashed rgba(245, 158, 11, 0.3)' }}>
            <span className="text-secondary">Hôm nay ({new Date().toLocaleDateString('vi-VN')})</span>
            <span className="font-bold flex items-center gap-1" style={{ color: 'var(--warning)' }}>
              <Eye size={13} /> {countToday > 0 ? `${countToday} khoản` : 'Bấm xem'}
            </span>
          </div>
        </div>

        {/* Thẻ 2: Tiền đã chi tuần này */}
        <div 
          className="card card-clickable" 
          style={{ borderLeft: '4px solid #8b5cf6', background: 'rgba(139, 92, 246, 0.05)' }}
          onClick={() => openModal('WEEK')}
          title="Nhấp vào để xem chi tiết tuần này đã chi những khoản gì"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold" style={{ color: '#8b5cf6' }}>📆 TIỀN ĐÃ CHI TUẦN NÀY</span>
            <Calendar size={18} style={{ color: '#8b5cf6' }} />
          </div>
          <div className="text-2xl font-bold" style={{ color: '#8b5cf6' }}>
            {spentThisWeek.toLocaleString('vi-VN')} <span className="text-sm">đ</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-2 pt-2" style={{ borderTop: '1px dashed rgba(139, 92, 246, 0.3)' }}>
            <span className="text-secondary">Thứ 2 đến Chủ Nhật</span>
            <span className="font-bold flex items-center gap-1" style={{ color: '#8b5cf6' }}>
              <Eye size={13} /> {countWeek > 0 ? `${countWeek} khoản` : 'Bấm xem'}
            </span>
          </div>
        </div>

        {/* Thẻ 3: Chi phí công ty */}
        <div 
          className="card card-clickable" 
          style={{ borderLeft: '4px solid var(--accent-primary)' }}
          onClick={() => openModal('COMPANY', 'COMPANY')}
          title="Nhấp vào để xem bảng kê toàn bộ chi phí vận hành công ty"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-secondary">Chi Phí Công Ty (Vận hành)</span>
            <Building2 size={18} className="text-primary" />
          </div>
          <div className="text-2xl font-bold text-primary">
            {totalCompanyOut.toLocaleString('vi-VN')} <span className="text-sm">đ</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-2 pt-2" style={{ borderTop: '1px dashed var(--border-color)' }}>
            <span className="text-secondary">Lương, mặt bằng, lặt vặt</span>
            <span className="font-bold flex items-center gap-1 text-primary">
              <Eye size={13} /> {countCompany} khoản
            </span>
          </div>
        </div>

        {/* Thẻ 4: Tổng chi các dự án */}
        <div 
          className="card card-clickable" 
          style={{ borderLeft: '4px solid var(--accent-secondary)' }}
          onClick={() => openModal('PROJECTS', 'ALL')}
          title="Nhấp vào để xem chi tiết tiền chi các công trình thi công & thiết kế"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-secondary">Tổng Chi Các Dự Án</span>
            <HardHat size={18} style={{ color: 'var(--accent-secondary)' }} />
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--accent-secondary)' }}>
            {totalProjectOut.toLocaleString('vi-VN')} <span className="text-sm">đ</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-2 pt-2" style={{ borderTop: '1px dashed var(--border-color)' }}>
            <span className="text-secondary">Vật tư, thợ xây, thợ khác</span>
            <span className="font-bold flex items-center gap-1" style={{ color: 'var(--accent-secondary)' }}>
              <Eye size={13} /> {countProjects} khoản
            </span>
          </div>
        </div>
      </div>

      {/* Biểu đồ dòng tiền */}
      <div className="card mb-8">
        <h3 className="mb-4 font-bold">Biểu đồ Dòng tiền năm {new Date().getFullYear()}</h3>
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" tickFormatter={(value) => `${value / 1000000}M`} />
              <Tooltip 
                formatter={(value) => `${value.toLocaleString('vi-VN')} đ`}
                contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} 
              />
              <Legend />
              <Bar dataKey="thu" fill="var(--success)" name="Tiền Vào (Thu)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="chi" fill="var(--danger)" name="Tiền Ra (Chi)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chi tiết Thu/Chi theo từng dự án */}
      <div className="card">
        <h3 className="font-bold mb-4">Chi tiết Thu/Chi theo từng Dự án</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Loại</th>
                <th>Tên dự án</th>
                <th className="text-right">Tổng Hợp Đồng</th>
                <th className="text-right">Đã Thu</th>
                <th className="text-right">Đã Chi</th>
                <th className="text-right">Tỷ lệ thu</th>
              </tr>
            </thead>
            <tbody>
              {projectBreakdown.map((p) => {
                const percent = p.totalValue ? Math.round((p.in / p.totalValue) * 100) : 0;
                return (
                  <tr key={p.id}>
                    <td><span className={`badge ${p.type === 'Thi công' ? 'badge-info' : 'badge-warning'}`}>{p.type}</span></td>
                    <td className="font-bold">
                      <Link 
                        to={p.type === 'Thi công' ? `/dashboard/construction/${p.id.replace('C-', '')}` : `/dashboard/design/${p.id.replace('D-', '')}`}
                        className="hover:underline text-primary flex items-center gap-1"
                      >
                        {p.name} <ExternalLink size={12} className="opacity-60" />
                      </Link>
                    </td>
                    <td className="text-right">{p.totalValue?.toLocaleString('vi-VN')}</td>
                    <td className="text-right text-success font-bold">{p.in.toLocaleString('vi-VN')}</td>
                    <td className="text-right text-danger font-bold">{p.out.toLocaleString('vi-VN')}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div style={{ width: '60px', height: '6px', background: 'var(--border-color)', borderRadius: '3px' }}>
                           <div style={{ width: `${Math.min(percent, 100)}%`, height: '100%', background: 'var(--success)', borderRadius: '3px' }}></div>
                        </div>
                        <span className="text-sm">{percent}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {/* Dòng tổng hợp Chi phí hoạt động công ty */}
              <tr style={{ background: 'rgba(59, 130, 246, 0.05)', borderTop: '2px solid var(--border-color)' }}>
                <td><span className="badge badge-primary">Vận hành</span></td>
                <td className="font-bold">
                  <Link to="/dashboard/company-expenses" className="hover:underline text-primary flex items-center gap-1">
                    🏢 Chi phí hoạt động công ty (Lương, văn phòng, lặt vặt) <ExternalLink size={12} className="opacity-60" />
                  </Link>
                </td>
                <td className="text-right text-secondary">-</td>
                <td className="text-right text-secondary">-</td>
                <td className="text-right text-danger font-bold">{totalCompanyOut.toLocaleString('vi-VN')}</td>
                <td className="text-right text-secondary text-sm">Chi thường xuyên</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL CHI TIẾT CÁC KHOẢN ĐÃ CHI KHI NHẤP VÀO THẺ THỐNG KÊ */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  {modalPeriod === 'TODAY' && <Clock size={20} style={{ color: 'var(--warning)' }} />}
                  {modalPeriod === 'WEEK' && <Calendar size={20} style={{ color: '#8b5cf6' }} />}
                  {modalPeriod === 'COMPANY' && <Building2 size={20} className="text-primary" />}
                  {modalPeriod === 'PROJECTS' && <HardHat size={20} style={{ color: 'var(--accent-secondary)' }} />}
                  {modalPeriod === 'ALL' && <Filter size={20} className="text-info" />}
                  
                  {modalPeriod === 'TODAY' && `Chi tiết các khoản đã chi HÔM NAY (${new Date().toLocaleDateString('vi-VN')})`}
                  {modalPeriod === 'WEEK' && 'Chi tiết các khoản đã chi TUẦN NÀY (Thứ 2 - CN)'}
                  {modalPeriod === 'MONTH' && `Chi tiết chi tiêu THÁNG ${new Date().getMonth() + 1}/${new Date().getFullYear()}`}
                  {modalPeriod === 'COMPANY' && 'Chi tiết Chi phí Vận hành Công ty'}
                  {modalPeriod === 'PROJECTS' && 'Chi tiết Chi phí Tất cả Công trình / Dự án'}
                  {modalPeriod === 'ALL' && 'Toàn bộ Lịch sử Chi tiền Hệ thống'}
                </h3>
                <p className="text-xs text-secondary mt-1">
                  Hiển thị nội dung chi tiết: chi mục gì, ở công trình nào, số tiền cụ thể từng khoản.
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="icon-btn text-secondary hover:text-primary"
                style={{ padding: '0.5rem', borderRadius: '50%' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              
              {/* Thanh lọc chu kỳ & nguồn */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                
                {/* Lọc theo mốc thời gian */}
                <div className="flex flex-wrap gap-2">
                  <button 
                    className={`filter-pill ${modalPeriod === 'TODAY' ? 'active' : ''}`}
                    onClick={() => setModalPeriod('TODAY')}
                  >
                    ⚡ Hôm nay ({countToday})
                  </button>
                  <button 
                    className={`filter-pill ${modalPeriod === 'WEEK' ? 'active' : ''}`}
                    onClick={() => setModalPeriod('WEEK')}
                  >
                    📆 Tuần này ({countWeek})
                  </button>
                  <button 
                    className={`filter-pill ${modalPeriod === 'MONTH' ? 'active' : ''}`}
                    onClick={() => setModalPeriod('MONTH')}
                  >
                    📅 Tháng này ({countMonth})
                  </button>
                  <button 
                    className={`filter-pill ${modalPeriod === 'ALL' ? 'active' : ''}`}
                    onClick={() => setModalPeriod('ALL')}
                  >
                    Tất cả ({countAll})
                  </button>
                </div>

                {/* Ô tìm kiếm */}
                <div style={{ position: 'relative', minWidth: '220px', flex: '1', maxWidth: '320px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input 
                    type="text" 
                    placeholder="Tìm nội dung, công trình..." 
                    className="input-field" 
                    style={{ width: '100%', paddingLeft: '32px', fontSize: '0.85rem' }}
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                  />
                  {modalSearch && (
                    <button 
                      onClick={() => setModalSearch('')} 
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}
                      className="text-secondary hover:text-primary"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Lọc nhanh theo Phân hệ nguồn chi */}
              <div className="flex flex-wrap items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <span className="text-xs font-bold text-secondary">Nguồn chi:</span>
                <button 
                  className={`filter-pill ${modalSourceFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setModalSourceFilter('ALL')}
                >
                  Tất cả nguồn
                </button>
                <button 
                  className={`filter-pill ${modalSourceFilter === 'CONSTRUCTION' ? 'active' : ''}`}
                  onClick={() => setModalSourceFilter('CONSTRUCTION')}
                >
                  🏗️ Dự án thi công
                </button>
                <button 
                  className={`filter-pill ${modalSourceFilter === 'DESIGN' ? 'active' : ''}`}
                  onClick={() => setModalSourceFilter('DESIGN')}
                >
                  📐 Hồ sơ thiết kế
                </button>
                <button 
                  className={`filter-pill ${modalSourceFilter === 'COMPANY' ? 'active' : ''}`}
                  onClick={() => setModalSourceFilter('COMPANY')}
                >
                  🏢 Vận hành công ty
                </button>
              </div>

              {/* Hộp tóm tắt tổng số tiền trong danh sách */}
              <div 
                className="flex items-center justify-between p-3 rounded-lg mb-4"
                style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
              >
                <div>
                  <span className="text-xs text-secondary font-medium">Danh sách hiển thị:</span>
                  <div className="font-bold text-sm">
                    {filteredModalExpenses.length} khoản chi phí
                    {modalSearch && <span className="text-secondary text-xs"> (Khớp với từ khóa "{modalSearch}")</span>}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-secondary font-medium">Tổng tiền đã chi:</span>
                  <div className="text-xl font-bold text-danger">
                    -{modalTotalSum.toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>

              {/* Bảng danh sách chi tiết */}
              <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table className="table">
                  <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg-secondary)' }}>
                    <tr>
                      <th style={{ width: '45px' }}>STT</th>
                      <th style={{ width: '105px' }}>Ngày</th>
                      <th style={{ width: '190px' }}>Ở đâu / Công trình</th>
                      <th style={{ width: '150px' }}>Mục gì (Phân loại)</th>
                      <th>Nội dung chi tiết</th>
                      <th className="text-right" style={{ width: '140px' }}>Số tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModalExpenses.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="text-secondary text-xs">{idx + 1}</td>
                        <td className="font-medium text-xs whitespace-nowrap">{item.date}</td>
                        <td>
                          {item.sourceLink ? (
                            <Link 
                              to={item.sourceLink} 
                              className="font-bold text-primary hover:underline flex items-center gap-1 text-sm"
                              onClick={() => setIsModalOpen(false)}
                            >
                              {item.sourceName} <ExternalLink size={12} className="opacity-60" />
                            </Link>
                          ) : (
                            <span className="font-bold text-sm">{item.sourceName}</span>
                          )}
                          <div className="text-xs text-secondary mt-0.5">{item.sourceTypeName}</div>
                        </td>
                        <td>
                          <span className={`badge ${item.categoryBadge}`}>
                            {item.categoryIcon} {item.categoryLabel}
                          </span>
                        </td>
                        <td>
                          <div className="text-sm font-medium">{item.note}</div>
                        </td>
                        <td className="text-right font-bold text-danger text-sm whitespace-nowrap">
                          -{item.amount.toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    ))}

                    {filteredModalExpenses.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-8">
                          <div className="flex flex-col items-center justify-center text-secondary">
                            <Clock size={36} className="opacity-40 mb-2" />
                            <div className="font-medium">
                              {modalPeriod === 'TODAY' 
                                ? `Hôm nay (${new Date().toLocaleDateString('vi-VN')}) chưa phát sinh khoản chi nào.`
                                : 'Không tìm thấy khoản chi nào phù hợp với bộ lọc.'}
                            </div>
                            {modalPeriod === 'TODAY' && countWeek > 0 && (
                              <button 
                                onClick={() => setModalPeriod('WEEK')} 
                                className="btn btn-outline text-xs mt-3 text-primary"
                                style={{ borderColor: 'var(--accent-primary)' }}
                              >
                                👉 Bấm xem các khoản đã chi trong Tuần này ({countWeek} khoản)
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <div className="text-xs text-secondary">
                *Bạn có thể bấm vào tên công trình để chuyển tới trang sổ quỹ của công trình đó.
              </div>
              <div className="flex items-center gap-2">
                {filteredModalExpenses.length > 0 && (
                  <button onClick={exportModalCSV} className="btn btn-outline flex items-center gap-1 text-xs">
                    <Download size={14} /> Xuất Excel (CSV)
                  </button>
                )}
                <button onClick={() => setIsModalOpen(false)} className="btn btn-primary text-xs">
                  Đóng
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Finance;

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAppContext } from '../context/AppContext';
import { Lock, TrendingUp, TrendingDown, DollarSign, Calendar, Clock, Building2, HardHat } from 'lucide-react';

const Finance = () => {
  const { role, projects, designs, companyExpenses } = useAppContext();

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
    projectBreakdown 
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

    // Helper kiểm tra một giao dịch chi có thuộc hôm nay / tuần này không
    const checkOutPeriod = (transDateStr, amount) => {
      if (!transDateStr) return;
      if (transDateStr === todayStr) {
        todayOutSum += amount;
      }
      const d = new Date(transDateStr);
      if (d >= monday && d <= sunday) {
        thisWeekOutSum += amount;
      }
    };

    // Thu thập tất cả giao dịch từ cả Thi công và Thiết kế
    const allTransactions = [];
    const pBreakdown = [];

    (projects || []).forEach(p => {
      let pIn = 0; let pOut = 0;
      (p.transactions || []).forEach(t => {
        allTransactions.push(t);
        if(t.type === 'IN') { tIn += t.amount; pIn += t.amount; }
        if(t.type === 'OUT') { 
          tProjectOut += t.amount; 
          pOut += t.amount;
          checkOutPeriod(t.date, t.amount);
        }
      });
      pBreakdown.push({ id: `C-${p.id}`, type: 'Thi công', name: p.name, in: pIn, out: pOut, totalValue: p.totalValue });
      
      // Cộng dồn giá trị hợp đồng nếu bắt đầu trong năm nay
      if (p.startDate && p.startDate.startsWith(currentYear.toString())) {
        tContract += (Number(p.totalValue) || 0);
      }
    });

    (designs || []).forEach(d => {
      let dIn = 0; let dOut = 0;
      (d.transactions || []).forEach(t => {
        allTransactions.push(t);
        if(t.type === 'IN') { tIn += t.amount; dIn += t.amount; }
        if(t.type === 'OUT') { 
          tProjectOut += t.amount; 
          dOut += t.amount; 
          checkOutPeriod(t.date, t.amount);
        }
      });
      pBreakdown.push({ id: `D-${d.id}`, type: 'Thiết kế', name: d.name, in: dIn, out: dOut, totalValue: d.totalValue });
      
      // Cộng dồn giá trị hợp đồng nếu bắt đầu trong năm nay
      if (d.startDate && d.startDate.startsWith(currentYear.toString())) {
        tContract += (Number(d.totalValue) || 0);
      }
    });

    // Cộng gộp Chi phí hoạt động công ty
    (companyExpenses || []).forEach(exp => {
      const amt = Number(exp.amount) || 0;
      tCompanyOut += amt;
      checkOutPeriod(exp.date, amt);
    });

    const totalAllOut = tProjectOut + tCompanyOut;

    // Gom nhóm theo tháng cho biểu đồ (năm hiện tại)
    const months = Array.from({length: 12}, (_, i) => ({
      name: `T${i+1}`,
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

    // Cộng chi phí công ty vào cột chi trong biểu đồ
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
      projectBreakdown: pBreakdown 
    };
  }, [projects, designs, companyExpenses]);

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
        <p className="page-subtitle text-secondary">Dữ liệu được tự động tổng hợp từ sổ quỹ tất cả dự án và chi phí vận hành công ty.</p>
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

      {/* Hàng 2: Theo dõi chi tiêu tức thời & Phân hệ (Yêu cầu đặc biệt của bạn) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card" style={{ borderLeft: '4px solid var(--warning)', background: 'rgba(245, 158, 11, 0.05)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold" style={{ color: 'var(--warning)' }}>⚡ TIỀN ĐÃ CHI HÔM NAY</span>
            <Clock size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>
            {spentToday.toLocaleString('vi-VN')} <span className="text-sm">đ</span>
          </div>
          <div className="text-xs text-secondary mt-1">Hôm nay ({new Date().toLocaleDateString('vi-VN')})</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #8b5cf6', background: 'rgba(139, 92, 246, 0.05)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold" style={{ color: '#8b5cf6' }}>📆 TIỀN ĐÃ CHI TUẦN NÀY</span>
            <Calendar size={18} style={{ color: '#8b5cf6' }} />
          </div>
          <div className="text-2xl font-bold" style={{ color: '#8b5cf6' }}>
            {spentThisWeek.toLocaleString('vi-VN')} <span className="text-sm">đ</span>
          </div>
          <div className="text-xs text-secondary mt-1">Tính từ Thứ 2 đến Chủ Nhật</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-secondary">Chi Phí Công Ty (Vận hành)</span>
            <Building2 size={18} className="text-primary" />
          </div>
          <div className="text-2xl font-bold text-primary">
            {totalCompanyOut.toLocaleString('vi-VN')} <span className="text-sm">đ</span>
          </div>
          <div className="text-xs text-secondary mt-1">Lương, mặt bằng, lặt vặt</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--accent-secondary)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-secondary">Tổng Chi Các Dự Án</span>
            <HardHat size={18} style={{ color: 'var(--accent-secondary)' }} />
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--accent-secondary)' }}>
            {totalProjectOut.toLocaleString('vi-VN')} <span className="text-sm">đ</span>
          </div>
          <div className="text-xs text-secondary mt-1">Vật tư, thợ xây, thợ khác</div>
        </div>
      </div>

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
                    <td className="font-bold">{p.name}</td>
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
                <td className="font-bold">🏢 Chi phí hoạt động công ty (Lương, văn phòng, lặt vặt)</td>
                <td className="text-right text-secondary">-</td>
                <td className="text-right text-secondary">-</td>
                <td className="text-right text-danger font-bold">{totalCompanyOut.toLocaleString('vi-VN')}</td>
                <td className="text-right text-secondary text-sm">Chi thường xuyên</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Finance;

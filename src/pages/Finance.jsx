import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAppContext } from '../context/AppContext';
import { Lock, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const Finance = () => {
  const { role, projects, designs } = useAppContext();

  // Tổng hợp dữ liệu
  const { totalIn, totalOut, chartData, projectBreakdown } = useMemo(() => {
    let tIn = 0;
    let tOut = 0;
    
    // Thu thập tất cả giao dịch từ cả Thi công và Thiết kế
    const allTransactions = [];
    const pBreakdown = [];

    projects.forEach(p => {
      let pIn = 0; let pOut = 0;
      p.transactions.forEach(t => {
        allTransactions.push(t);
        if(t.type === 'IN') { tIn += t.amount; pIn += t.amount; }
        if(t.type === 'OUT') { tOut += t.amount; pOut += t.amount; }
      });
      pBreakdown.push({ id: `C-${p.id}`, type: 'Thi công', name: p.name, in: pIn, out: pOut, totalValue: p.totalValue });
    });

    designs.forEach(d => {
      let dIn = 0; let dOut = 0;
      d.transactions.forEach(t => {
        allTransactions.push(t);
        if(t.type === 'IN') { tIn += t.amount; dIn += t.amount; }
        if(t.type === 'OUT') { tOut += t.amount; dOut += t.amount; }
      });
      pBreakdown.push({ id: `D-${d.id}`, type: 'Thiết kế', name: d.name, in: dIn, out: dOut, totalValue: d.totalValue });
    });

    // Gom nhóm theo tháng cho biểu đồ (năm hiện tại)
    const currentYear = new Date().getFullYear();
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

    return { totalIn: tIn, totalOut: tOut, chartData: months, projectBreakdown: pBreakdown };
  }, [projects, designs]);

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
      <div className="page-header">
        <h1 className="page-title">Quản lý Tài chính Tổng hợp</h1>
        <p className="page-subtitle">Dữ liệu được tự động tổng hợp từ sổ quỹ của tất cả dự án.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center gap-2 mb-2 text-secondary">
            <TrendingUp size={20} className="text-success" />
            <span className="font-bold">Tổng Thu</span>
          </div>
          <div className="text-3xl font-bold text-success">{totalIn.toLocaleString('vi-VN')} đ</div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-2 text-secondary">
            <TrendingDown size={20} className="text-danger" />
            <span className="font-bold">Tổng Chi</span>
          </div>
          <div className="text-3xl font-bold text-danger">{totalOut.toLocaleString('vi-VN')} đ</div>
        </div>
        <div className="card" style={{ background: 'var(--accent-primary)', color: 'white' }}>
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <DollarSign size={20} />
            <span className="font-bold">Lợi Nhuận Gộp</span>
          </div>
          <div className="text-3xl font-bold">{profit.toLocaleString('vi-VN')} đ</div>
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Finance;

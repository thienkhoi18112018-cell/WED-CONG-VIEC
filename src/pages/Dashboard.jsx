import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HardHat, DollarSign, PenTool, FileText } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const StatCard = ({ title, value, icon, subtitle }) => (
  <div className="card">
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-blue-50 text-blue-500" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)' }}>
          {icon}
        </div>
        <h3 className="text-sm font-medium text-secondary" style={{ color: 'var(--text-secondary)' }}>{title}</h3>
      </div>
    </div>
    <div>
      <div className="text-2xl font-bold" style={{ fontSize: '1.5rem', fontWeight: '700' }}>{value}</div>
      <div className="text-sm mt-1 text-secondary" style={{ fontSize: '0.875rem' }}>
        {subtitle}
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { role, projects, designs } = useAppContext();

  const { totalRevenue, chartData } = useMemo(() => {
    let revenue = 0;
    const currentYear = new Date().getFullYear();
    const months = Array.from({length: 12}, (_, i) => ({ name: `T${i+1}`, thu: 0, chi: 0 }));

    const processTrans = (transactions) => {
      transactions.forEach(t => {
        if (t.type === 'IN') revenue += t.amount;
        const date = new Date(t.date);
        if (date.getFullYear() === currentYear) {
          const mIndex = date.getMonth();
          if (t.type === 'IN') months[mIndex].thu += t.amount;
          if (t.type === 'OUT') months[mIndex].chi += t.amount;
        }
      });
    };

    projects.forEach(p => processTrans(p.transactions));
    designs.forEach(d => processTrans(d.transactions));

    return { totalRevenue: revenue, chartData: months };
  }, [projects, designs]);

  const activeProjectsCount = projects.filter(p => !p.isCompleted).length;
  const activeDesignsCount = designs.filter(d => !d.isCompleted).length;

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Tổng quan hệ thống</h1>
        <p className="page-subtitle">Xem tóm tắt tình hình hoạt động của công ty.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="Dự án đang thi công" value={activeProjectsCount} icon={<HardHat size={20} />} subtitle={`Tổng cộng: ${projects.length} dự án`} />
        <StatCard title="Hồ sơ thiết kế" value={activeDesignsCount} icon={<PenTool size={20} />} subtitle={`Tổng cộng: ${designs.length} hồ sơ`} />
        <StatCard title="Nhân sự / Tài liệu" value="24" icon={<FileText size={20} />} subtitle="Tài liệu nội bộ" />
        
        {role === 'ADMIN' ? (
          <StatCard 
            title="Tổng doanh thu (Đã thu)" 
            value={`${(totalRevenue / 1000000000).toFixed(2)} Tỷ`} 
            icon={<DollarSign size={20} />} 
            subtitle="Toàn thời gian" 
          />
        ) : (
          <div className="card flex items-center justify-center">
            <span style={{ color: 'var(--text-secondary)' }}>[Bảo mật doanh thu]</span>
          </div>
        )}
      </div>

      {role === 'ADMIN' && (
        <div className="card mb-8">
          <h3 className="mb-4 font-bold">Biểu đồ Thu/Chi năm {new Date().getFullYear()} (Triệu VNĐ)</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" tickFormatter={(value) => `${value / 1000000}`} />
                <Tooltip 
                  formatter={(value) => `${(value / 1000000).toLocaleString('vi-VN')} Triệu`}
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} 
                />
                <Bar dataKey="thu" fill="var(--success)" name="Thu" radius={[4, 4, 0, 0]} />
                <Bar dataKey="chi" fill="var(--danger)" name="Chi" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

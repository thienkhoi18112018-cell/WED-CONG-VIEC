import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, CheckCircle, Edit, Trash2 } from 'lucide-react';

const DesignDetail = () => {
  const { id } = useParams();
  const { designs, updateDesign, addDesignTransaction, updateDesignTransaction, removeDesignTransaction } = useAppContext();
  const design = designs.find(d => d.id === parseInt(id));

  const [editingTransId, setEditingTransId] = useState(null);
  const [transDate, setTransDate] = useState(new Date().toISOString().slice(0,10));
  const [transType, setTransType] = useState('IN');
  const [transAmount, setTransAmount] = useState('');
  const [transNote, setTransNote] = useState('');

  if (!design) return <div className="page-container">Hồ sơ không tồn tại!</div>;

  const handleComplete = () => {
    if(window.confirm('Xác nhận hồ sơ thiết kế đã hoàn thành 100%?')) {
      updateDesign(design.id, { isCompleted: true, progress: 100, status: 'Hoàn thành' });
    }
  };

  const startEditTrans = (t) => {
    setEditingTransId(t.id);
    setTransDate(t.date);
    setTransType(t.type);
    setTransAmount(t.amount.toString());
    setTransNote(t.note);
  };

  const cancelEditTrans = () => {
    setEditingTransId(null);
    setTransDate(new Date().toISOString().slice(0,10));
    setTransType('IN');
    setTransAmount('');
    setTransNote('');
  };

  const handleAddTrans = (e) => {
    e.preventDefault();
    const data = {
      date: transDate, type: transType, note: transNote,
      amount: parseInt(transAmount.replace(/\D/g, '')) || 0
    };
    if (editingTransId) {
      updateDesignTransaction(design.id, editingTransId, data);
      setEditingTransId(null);
    } else {
      addDesignTransaction(design.id, data);
    }
    setTransAmount('');
    setTransNote('');
  };

  const totalIn = design.transactions.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.amount, 0);
  const totalOut = design.transactions.filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="page-container animate-fade-in">
      <div className="mb-4">
        <Link to="/dashboard/design" className="btn btn-outline" style={{ display: 'inline-flex' }}>
          <ArrowLeft size={16} /> Quay lại
        </Link>
      </div>

      <div className="card mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">{design.name}</h1>
            <p className="text-secondary mb-2">Kiến trúc sư: {design.manager} | Bắt đầu: {design.startDate} | Dự kiến: {design.durationMonths} tháng</p>
            <p className="text-secondary mb-4">Tổng giá trị hợp đồng: <strong>{design.totalValue?.toLocaleString('vi-VN')} VNĐ</strong></p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '200px', height: '10px', background: 'var(--border-color)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${design.progress}%`, height: '100%', background: 'var(--accent-primary)' }}></div>
              </div>
              <span style={{ fontWeight: 'bold' }}>Tiến độ: {design.progress}%</span>
              {design.isCompleted && <span className="badge badge-success">Đã hoàn thành</span>}
            </div>
          </div>
          <div>
            {!design.isCompleted ? (
              <button className="btn btn-success" style={{ background: 'var(--success)', color: 'white' }} onClick={handleComplete}>
                <CheckCircle size={16} /> Chốt Hoàn thành
              </button>
            ) : (
              <div className="badge badge-success text-lg p-2"><CheckCircle size={20} /> Đã Bàn Giao</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="card mb-4 bg-primary text-white" style={{ background: 'var(--accent-primary)', color: 'white' }}>
            <div className="mb-2 opacity-80">Tổng thu (Tiền vào)</div>
            <div className="text-2xl font-bold">{totalIn.toLocaleString('vi-VN')} VNĐ</div>
          </div>
          <div className="card mb-4" style={{ background: 'var(--danger)', color: 'white' }}>
            <div className="mb-2 opacity-80">Tổng chi (Tiền ra)</div>
            <div className="text-2xl font-bold">{totalOut.toLocaleString('vi-VN')} VNĐ</div>
          </div>
          
          <div className="card">
            <h3 className="font-bold mb-4">{editingTransId ? 'Sửa Thu/Chi' : 'Ghi nhận Thu/Chi'}</h3>
            <form onSubmit={handleAddTrans} className="flex flex-col gap-4">
              <div className="input-group">
                <label className="input-label">Ngày giao dịch</label>
                <input type="date" required className="input-field" value={transDate} onChange={e=>setTransDate(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Loại giao dịch</label>
                <select className="input-field" value={transType} onChange={e=>setTransType(e.target.value)}>
                  <option value="IN">Tiền Vào (Khách thanh toán...)</option>
                  <option value="OUT">Tiền Ra (Mua vật tư, trả thợ...)</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Số tiền (VNĐ)</label>
                <input type="number" min="0" required className="input-field" value={transAmount} onChange={e=>setTransAmount(e.target.value)} placeholder="Nhập số tiền..." />
              </div>
              <div className="input-group">
                <label className="input-label">Nội dung</label>
                <input type="text" required className="input-field" value={transNote} onChange={e=>setTransNote(e.target.value)} placeholder="VD: Khách ứng đợt 1..." />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary w-full justify-center">{editingTransId ? 'Lưu chỉnh sửa' : 'Thêm mới'}</button>
                {editingTransId && <button type="button" className="btn btn-outline" onClick={cancelEditTrans}>Hủy</button>}
              </div>
            </form>
          </div>
        </div>
        
        <div className="md:col-span-2">
          <div className="card h-full">
            <h3 className="font-bold mb-4">Lịch sử giao dịch</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Loại</th>
                    <th>Nội dung</th>
                    <th className="text-right">Số tiền</th>
                    <th className="text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {design.transactions.sort((a,b) => new Date(b.date) - new Date(a.date)).map(t => (
                    <tr key={t.id} style={{ background: editingTransId === t.id ? 'var(--bg-secondary)' : 'transparent' }}>
                      <td>{t.date}</td>
                      <td>
                        {t.type === 'IN' ? <span className="badge badge-success">Tiền Vào</span> : <span className="badge badge-danger">Tiền Ra</span>}
                      </td>
                      <td>{t.note}</td>
                      <td className="text-right font-bold" style={{ color: t.type === 'IN' ? 'var(--success)' : 'var(--danger)' }}>
                        {t.type === 'IN' ? '+' : '-'}{t.amount.toLocaleString('vi-VN')}
                      </td>
                      <td className="text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => startEditTrans(t)} className="icon-btn text-info" title="Sửa"><Edit size={16} /></button>
                          <button onClick={() => removeDesignTransaction(design.id, t.id)} className="icon-btn text-danger" title="Xóa"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {design.transactions.length === 0 && (
                    <tr><td colSpan="5" className="text-center text-secondary py-4">Chưa có giao dịch nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignDetail;

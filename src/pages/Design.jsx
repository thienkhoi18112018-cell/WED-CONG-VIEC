import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Design = () => {
  const { designs, addDesign, updateDesign, removeDesign } = useAppContext();
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', manager: '', status: 'Chờ duyệt', progress: 0, startDate: '', durationMonths: 1, totalValue: 0
  });

  const openModal = (design = null) => {
    if (design) {
      setEditingId(design.id);
      setFormData(design);
    } else {
      setEditingId(null);
      setFormData({ name: '', manager: '', status: 'Chờ duyệt', progress: 0, startDate: new Date().toISOString().slice(0,10), durationMonths: 1, totalValue: 0 });
    }
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { 
      ...formData, 
      progress: parseInt(formData.progress) || 0, 
      durationMonths: parseInt(formData.durationMonths) || 1,
      totalValue: parseInt(formData.totalValue) || 0
    };
    
    if (editingId) {
      updateDesign(editingId, data);
    } else {
      addDesign(data);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if(window.confirm('Bạn có chắc muốn xóa hồ sơ thiết kế này?')) {
      removeDesign(id);
    }
  };

  const checkDelay = (startDate, durationMonths, progress, isCompleted) => {
    if (isCompleted) return false;
    if (!startDate || !durationMonths || progress >= 100) return false;
    const start = new Date(startDate);
    const expectedEnd = new Date(start.setMonth(start.getMonth() + durationMonths));
    const now = new Date();
    return now > expectedEnd;
  };

  return (
    <div className="page-container animate-fade-in relative">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Hồ sơ thiết kế</h1>
          <p className="page-subtitle">Quản lý bản vẽ, tiến độ và sổ quỹ riêng của từng hồ sơ.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => openModal()}>
            <Plus size={16} /> Thêm thiết kế
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontWeight: 'bold', fontSize: '1.25rem' }}>Danh Sách Hồ Sơ Thiết Kế</h2>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Mã HS</th>
                <th>Tên hồ sơ</th>
                <th>Kiến trúc sư</th>
                <th>Thời gian</th>
                <th>Tiến độ</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {designs.map((d) => {
                const isDelayed = checkDelay(d.startDate, d.durationMonths, d.progress, d.isCompleted);
                return (
                  <tr key={d.id}>
                    <td>#{d.id.toString().slice(-4)}</td>
                    <td style={{ fontWeight: 500 }}>
                      {d.name}
                      {isDelayed && (
                        <span className="badge badge-danger ml-2" style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                          <AlertTriangle size={12} /> Trễ hạn
                        </span>
                      )}
                    </td>
                    <td>{d.manager}</td>
                    <td>
                      <div className="text-sm">BĐ: {d.startDate}</div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Dự kiến: {d.durationMonths} tháng</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <div style={{ width: '100px', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${d.progress}%`, height: '100%', background: isDelayed ? 'var(--danger)' : 'var(--accent-primary)' }}></div>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{d.progress}%</span>
                      </div>
                      <span className={`badge ${d.isCompleted ? 'badge-success' : 'badge-info'}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Link to={`/dashboard/design/${d.id}`} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Quản lý</Link>
                        <button className="icon-btn" onClick={() => openModal(d)} title="Sửa"><Edit size={16} /></button>
                        <button className="icon-btn text-danger" onClick={() => handleDelete(d.id)} title="Xóa"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {designs.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center" style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Chưa có hồ sơ thiết kế nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '600px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editingId ? 'Sửa hồ sơ thiết kế' : 'Thêm hồ sơ mới'}</h3>
              <button onClick={() => setShowModal(false)} className="icon-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="input-group">
                <label className="input-label">Tên hồ sơ thiết kế</label>
                <input required type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">Người phụ trách (Kiến trúc sư)</label>
                <input required type="text" className="input-field" value={formData.manager} onChange={e => setFormData({...formData, manager: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label className="input-label">Ngày bắt đầu</label>
                  <input required type="date" className="input-field" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Dự kiến thực hiện (tháng)</label>
                  <input required type="number" min="1" className="input-field" value={formData.durationMonths} onChange={e => setFormData({...formData, durationMonths: e.target.value})} />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Tổng giá trị hợp đồng (VNĐ)</label>
                <input required type="number" min="0" className="input-field" value={formData.totalValue} onChange={e => setFormData({...formData, totalValue: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label className="input-label">Giai đoạn</label>
                  <select className="input-field" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="Chờ duyệt">Chờ duyệt</option>
                    <option value="Đang thực hiện">Đang thực hiện</option>
                    <option value="Chờ chỉnh sửa">Chờ chỉnh sửa</option>
                    <option value="Hoàn thành">Hoàn thành</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Tiến độ (%)</label>
                  <input type="number" min="0" max="100" className="input-field" value={formData.progress} onChange={e => setFormData({...formData, progress: e.target.value})} />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Design;

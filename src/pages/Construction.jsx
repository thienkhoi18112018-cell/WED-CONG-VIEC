import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { Camera, Plus, X, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Construction = () => {
  const { projects, addProject, updateProject, removeProject } = useAppContext();
  const tableRef = useRef(null);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', manager: '', status: 'Mới khởi công', progress: 0, startDate: '', durationMonths: 1, totalValue: 0
  });

  const handleExportImage = async () => {
    if (tableRef.current) {
      const canvas = await html2canvas(tableRef.current, {
        backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1e293b' : '#ffffff',
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'tien-do-thi-cong.png';
      link.href = dataUrl;
      link.click();
    }
  };

  const openModal = (project = null) => {
    if (project) {
      setEditingId(project.id);
      setFormData(project);
    } else {
      setEditingId(null);
      setFormData({ name: '', manager: '', status: 'Mới khởi công', progress: 0, startDate: new Date().toISOString().slice(0,10), durationMonths: 1 });
    }
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...formData, progress: parseInt(formData.progress) || 0, durationMonths: parseInt(formData.durationMonths) || 1 };
    
    if (editingId) {
      updateProject(editingId, data);
    } else {
      addProject(data);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if(window.confirm('Bạn có chắc muốn xóa dự án này?')) {
      removeProject(id);
    }
  };

  // Hàm tính toán trễ tiến độ
  const checkDelay = (startDate, durationMonths, progress) => {
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
          <h1 className="page-title">Quản lý thi công</h1>
          <p className="page-subtitle">Theo dõi tiến độ, thêm bớt, sửa thông tin các công trình.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline" onClick={() => openModal()}>
            <Plus size={16} /> Thêm dự án
          </button>
          <button className="btn btn-primary" onClick={handleExportImage}>
            <Camera size={16} /> Xuất ảnh báo cáo
          </button>
        </div>
      </div>

      <div className="card" ref={tableRef} style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontWeight: 'bold', fontSize: '1.25rem' }}>Bảng Tiến Độ Thi Công - Tháng 5/2026</h2>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Mã DA</th>
                <th>Tên công trình</th>
                <th>Người phụ trách</th>
                <th>Thời gian</th>
                <th>Tiến độ</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const isDelayed = checkDelay(p.startDate, p.durationMonths, p.progress);
                return (
                  <tr key={p.id}>
                    <td>#{p.id.toString().slice(-4)}</td>
                    <td style={{ fontWeight: 500 }}>
                      {p.name}
                      {isDelayed && (
                        <span className="badge badge-danger ml-2" style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                          <AlertTriangle size={12} /> Trễ tiến độ
                        </span>
                      )}
                    </td>
                    <td>{p.manager}</td>
                    <td>
                      <div className="text-sm">BĐ: {p.startDate}</div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Dự kiến: {p.durationMonths} tháng</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <div style={{ width: '100px', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${p.progress}%`, height: '100%', background: isDelayed ? 'var(--danger)' : 'var(--accent-primary)' }}></div>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{p.progress}%</span>
                      </div>
                      <span className={`badge ${p.progress >= 100 ? 'badge-success' : p.progress > 40 ? 'badge-info' : 'badge-warning'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Link to={`/dashboard/construction/${p.id}`} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Quản lý</Link>
                        <button className="icon-btn" onClick={() => openModal(p)} title="Sửa"><Edit size={16} /></button>
                        <button className="icon-btn text-danger" onClick={() => handleDelete(p.id)} title="Xóa"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {projects.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center" style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Chưa có dự án nào.</td>
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
              <h3 className="text-xl font-bold">{editingId ? 'Sửa thông tin dự án' : 'Thêm Dự án mới'}</h3>
              <button onClick={() => setShowModal(false)} className="icon-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="input-group">
                <label className="input-label">Tên công trình</label>
                <input required type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">Người phụ trách</label>
                <input required type="text" className="input-field" value={formData.manager} onChange={e => setFormData({...formData, manager: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label className="input-label">Ngày bắt đầu</label>
                  <input required type="date" className="input-field" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Dự kiến thi công (tháng)</label>
                  <input required type="number" min="1" className="input-field" value={formData.durationMonths} onChange={e => setFormData({...formData, durationMonths: e.target.value})} />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Tổng giá trị hợp đồng (VNĐ)</label>
                <input required type="number" min="0" className="input-field" value={formData.totalValue} onChange={e => setFormData({...formData, totalValue: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label className="input-label">Giai đoạn hiện tại</label>
                  <select className="input-field" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="Mới khởi công">Mới khởi công</option>
                    <option value="Đổ móng">Đổ móng</option>
                    <option value="Đang thi công">Đang thi công</option>
                    <option value="Hoàn thiện">Hoàn thiện</option>
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

export default Construction;

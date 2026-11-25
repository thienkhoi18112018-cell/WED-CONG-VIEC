import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { Camera, Plus, X, Edit, Trash2, AlertTriangle, Calendar } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import {
  YEAR_FILTER_OPTIONS,
  getProjectYear,
  getYearFromDate,
  matchesYearFilter,
  getYearFilterLabel
} from '../utils/yearHelpers';

const Construction = () => {
  const { projects, addProject, updateProject, removeProject } = useAppContext();
  const tableRef = useRef(null);
  
  const [yearFilter, setYearFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', manager: '', status: 'Mới khởi công', progress: 0, startDate: '', durationMonths: 1, totalValue: 0, year: new Date().getFullYear()
  });

  const yearCounts = useMemo(() => {
    const counts = { ALL: projects.length, '2026': 0, '2027': 0, OTHER: 0 };
    projects.forEach((p) => {
      const y = getProjectYear(p);
      if (y === 2026) counts['2026'] += 1;
      else if (y === 2027) counts['2027'] += 1;
      else counts.OTHER += 1;
    });
    return counts;
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => matchesYearFilter(getProjectYear(p), yearFilter));
  }, [projects, yearFilter]);

  const handleExportImage = async () => {
    if (tableRef.current) {
      const canvas = await html2canvas(tableRef.current, {
        backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1e293b' : '#ffffff',
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `tien-do-thi-cong-${yearFilter.toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const openModal = (project = null) => {
    if (project) {
      setEditingId(project.id);
      setFormData({
        ...project,
        totalValue: project.totalValue || 0,
        year: getProjectYear(project) || new Date().getFullYear()
      });
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const defaultYear = yearFilter === '2026' ? 2026 : yearFilter === '2027' ? 2027 : new Date().getFullYear();
      setEditingId(null);
      setFormData({
        name: '',
        manager: '',
        status: 'Mới khởi công',
        progress: 0,
        startDate: today,
        durationMonths: 1,
        totalValue: 0,
        year: defaultYear
      });
    }
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const resolvedYear = parseInt(formData.year, 10) || getYearFromDate(formData.startDate) || new Date().getFullYear();
    const data = {
      ...formData,
      progress: parseInt(formData.progress, 10) || 0,
      durationMonths: parseInt(formData.durationMonths, 10) || 1,
      totalValue: parseInt(formData.totalValue, 10) || 0,
      year: resolvedYear
    };
    
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

      {/* Bộ lọc phân loại công trình theo năm */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-xs font-bold text-secondary flex items-center gap-1 mr-1">
          <Calendar size={14} /> Phân loại năm:
        </span>
        {YEAR_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setYearFilter(opt.key)}
            className={`filter-pill ${yearFilter === opt.key ? 'active' : ''}`}
          >
            {opt.label} ({yearCounts[opt.key]})
          </button>
        ))}
      </div>

      <div className="card" ref={tableRef} style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontWeight: 'bold', fontSize: '1.25rem' }}>
          Bảng Tiến Độ Thi Công - {getYearFilterLabel(yearFilter)}
        </h2>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Mã DA</th>
                <th>Năm</th>
                <th>Tên công trình</th>
                <th>Người phụ trách</th>
                <th>Thời gian</th>
                <th>Tiến độ</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p) => {
                const isDelayed = checkDelay(p.startDate, p.durationMonths, p.progress);
                const projectYear = getProjectYear(p);
                return (
                  <tr key={p.id}>
                    <td>#{p.id.toString().slice(-4)}</td>
                    <td>
                      <span className={`badge ${projectYear === 2026 ? 'badge-primary' : projectYear === 2027 ? 'badge-info' : 'badge-secondary'}`}>
                        {projectYear || 'Khác'}
                      </span>
                    </td>
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
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center" style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
                    Không có dự án nào thuộc nhóm {getYearFilterLabel(yearFilter).toLowerCase()}.
                  </td>
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
                  <input
                    required
                    type="date"
                    className="input-field"
                    value={formData.startDate}
                    onChange={e => {
                      const val = e.target.value;
                      const parsedYear = getYearFromDate(val);
                      setFormData(prev => ({
                        ...prev,
                        startDate: val,
                        year: !editingId && parsedYear ? parsedYear : prev.year
                      }));
                    }}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Năm dự án (Phân loại)</label>
                  <div className="flex gap-2">
                    <input
                      required
                      type="number"
                      min="2000"
                      max="2100"
                      className="input-field"
                      style={{ flex: 1 }}
                      value={formData.year}
                      onChange={e => setFormData({ ...formData, year: e.target.value })}
                    />
                    <button
                      type="button"
                      className={`btn ${Number(formData.year) === 2026 ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.4rem 0.65rem', fontSize: '0.75rem' }}
                      onClick={() => setFormData({ ...formData, year: 2026 })}
                    >
                      2026
                    </button>
                    <button
                      type="button"
                      className={`btn ${Number(formData.year) === 2027 ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.4rem 0.65rem', fontSize: '0.75rem' }}
                      onClick={() => setFormData({ ...formData, year: 2027 })}
                    >
                      2027
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label className="input-label">Dự kiến thi công (tháng)</label>
                  <input required type="number" min="1" className="input-field" value={formData.durationMonths} onChange={e => setFormData({...formData, durationMonths: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Tổng giá trị hợp đồng (VNĐ)</label>
                  <input required type="number" min="0" className="input-field" value={formData.totalValue} onChange={e => setFormData({...formData, totalValue: e.target.value})} />
                </div>
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

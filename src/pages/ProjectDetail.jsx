import React, { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, CheckCircle, Edit, Trash2, Camera, Download } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const ProjectDetail = () => {
  const { id } = useParams();
  const { projects, updateProject, addDailyLog, updateDailyLog, removeDailyLog, addTransaction, updateTransaction, removeTransaction } = useAppContext();
  const project = projects.find(p => p?.id?.toString() === id?.toString());

  const [activeTab, setActiveTab] = useState('LOGS');
  
  // State form Nhật ký
  const [editingLogId, setEditingLogId] = useState(null);
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0,10));
  const [logWork, setLogWork] = useState('');
  const [logWeather, setLogWeather] = useState('Nắng');
  const [logWorkers, setLogWorkers] = useState(1);
  const [logIsWorking, setLogIsWorking] = useState(true);
  const [logImage, setLogImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // State form Thu Chi
  const [editingTransId, setEditingTransId] = useState(null);
  const [transDate, setTransDate] = useState(new Date().toISOString().slice(0,10));
  const [transType, setTransType] = useState('IN');
  const [expenseCategory, setExpenseCategory] = useState('THO_XAY'); // 'THO_XAY' | 'THO_KHAC' | 'VAT_TU' | 'KHAC'
  const [transAmount, setTransAmount] = useState('');
  const [transNote, setTransNote] = useState('');

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
    if(window.confirm('Xác nhận công trình đã hoàn thành 100%?')) {
      updateProject(project.id, { isCompleted: true, progress: 100 });
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = async () => {
    const input = reportRef.current;
    if (!input) return;
    
    setIsExporting(true);
    
    // Đợi React render lại phần bảng báo cáo
    setTimeout(async () => {
      const originalStyle = input.style.cssText;
      input.style.backgroundColor = '#ffffff';
      input.style.padding = '20px';
      input.style.color = '#000000';
      
      try {
        const canvas = await html2canvas(input, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Bao_cao_${project.name}_${activeTab}.pdf`);
      } catch (err) {
        console.error('Lỗi khi xuất PDF:', err);
        alert('Không thể xuất PDF, vui lòng thử lại.');
      } finally {
        input.style.cssText = originalStyle;
        setIsExporting(false);
      }
    }, 100);
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
    setLogDate(new Date().toISOString().slice(0,10));
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
        // Sử dụng ImgBB để tải ảnh miễn phí không cần thẻ
        const formData = new FormData();
        formData.append('image', logImage);
        
        // Thay khóa API của bạn vào đây
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
    setTransDate(new Date().toISOString().slice(0,10));
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

  const totalIn = (project.transactions || []).filter(t => t.type === 'IN').reduce((sum, t) => sum + t.amount, 0);
  const totalOut = (project.transactions || []).filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.amount, 0);

  // Chi tiết từng nhóm chi phí đầu ra
  const totalThoXay = (project.transactions || []).filter(t => t.type === 'OUT' && t.expenseCategory === 'THO_XAY').reduce((sum, t) => sum + t.amount, 0);
  const totalThoKhac = (project.transactions || []).filter(t => t.type === 'OUT' && t.expenseCategory === 'THO_KHAC').reduce((sum, t) => sum + t.amount, 0);
  const totalVatTu = (project.transactions || []).filter(t => t.type === 'OUT' && t.expenseCategory === 'VAT_TU').reduce((sum, t) => sum + t.amount, 0);
  const totalKhac = (project.transactions || []).filter(t => t.type === 'OUT' && (!t.expenseCategory || t.expenseCategory === 'KHAC')).reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="page-container animate-fade-in">
      <div className="mb-4 flex justify-between items-center">
        <Link to="/dashboard/construction" className="btn btn-outline">
          <ArrowLeft size={16} /> Quay lại
        </Link>
        <button onClick={exportPDF} className="btn btn-primary">
          <Download size={16} /> Xuất PDF
        </button>
      </div>

      <div className="card mb-6" ref={reportRef}>
        <div className="flex justify-between items-start">
          <div style={{ width: '100%' }}>
            <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
            <p className="text-secondary mb-2">Phụ trách: {project.manager} | Bắt đầu: {project.startDate} | Dự kiến: {project.durationMonths} tháng</p>
            <p className="text-secondary mb-4">Tổng giá trị hợp đồng: <strong>{project.totalValue?.toLocaleString('vi-VN')} VNĐ</strong></p>
            
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

            {/* Bảng dữ liệu dành cho xuất PDF (chỉ hiển thị khi đang xuất) */}
            {isExporting && (
            <div className="mt-6">
              <h3 className="font-bold mb-2 border-b pb-2">
                {activeTab === 'LOGS' ? 'BÁO CÁO NHẬT KÝ THI CÔNG' : 'BÁO CÁO TÀI CHÍNH THU CHI'}
              </h3>
              
              {activeTab === 'LOGS' && (
                <div className="table-container">
                  <table className="table" style={{ border: '1px solid #ddd' }}>
                    <thead style={{ background: '#f5f5f5' }}>
                      <tr>
                        <th>Ngày</th>
                        <th>Thời tiết</th>
                        <th>Nhân lực</th>
                        <th>Trạng thái</th>
                        <th>Công việc</th>
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
                  <table className="table" style={{ border: '1px solid #ddd' }}>
                    <thead style={{ background: '#f5f5f5' }}>
                      <tr>
                        <th>Ngày</th>
                        <th>Loại</th>
                        <th>Phân loại</th>
                        <th>Nội dung</th>
                        <th className="text-right">Số tiền (VNĐ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan="4" className="font-bold text-right">Tổng thu:</td>
                        <td className="text-right font-bold text-success">+{totalIn.toLocaleString('vi-VN')}</td>
                      </tr>
                      <tr>
                        <td colSpan="4" className="font-bold text-right">Tổng chi:</td>
                        <td className="text-right font-bold text-danger">-{totalOut.toLocaleString('vi-VN')}</td>
                      </tr>
                      <tr style={{ background: '#f8fafc', fontSize: '0.85em', color: '#475569' }}>
                        <td colSpan="5">
                          <strong>Bóc tách chi phí:</strong> 🧱 Thợ xây: {totalThoXay.toLocaleString('vi-VN')}đ | ⚡ Thợ khác: {totalThoKhac.toLocaleString('vi-VN')}đ | 🏗️ Vật tư: {totalVatTu.toLocaleString('vi-VN')}đ | 📦 Khác: {totalKhac.toLocaleString('vi-VN')}đ
                        </td>
                      </tr>
                      {[...(project.transactions || [])].sort((a,b) => new Date(b.date) - new Date(a.date)).map(t => (
                        <tr key={t.id}>
                          <td>{t.date}</td>
                          <td>{t.type === 'IN' ? 'Tiền Vào' : 'Tiền Ra'}</td>
                          <td>{t.type === 'IN' ? '-' : (EXPENSE_CATEGORIES[t.expenseCategory]?.label || 'Tiền khác')}</td>
                          <td>{t.note}</td>
                          <td className="text-right">{t.amount.toLocaleString('vi-VN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            )}
            {/* End phần xuất báo cáo */}

          </div>
          <div data-html2canvas-ignore>
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

      <div className="flex gap-4 mb-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
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

      {activeTab === 'FINANCE' && (
        <div className="flex flex-col gap-8">
          <div>
            {/* Thống kê Tổng thu & Tổng chi */}
            <div className="grid md:grid-cols-2 gap-4 mb-4" style={{ maxWidth: '850px' }}>
              <div className="card text-white" style={{ background: 'var(--accent-primary)', color: 'white' }}>
                <div className="mb-2 opacity-80">Tổng thu (Tiền vào)</div>
                <div className="text-2xl font-bold">{totalIn.toLocaleString('vi-VN')} VNĐ</div>
              </div>
              <div className="card text-white" style={{ background: 'var(--danger)', color: 'white' }}>
                <div className="mb-2 opacity-80">Tổng chi (Tiền ra)</div>
                <div className="text-2xl font-bold">{totalOut.toLocaleString('vi-VN')} VNĐ</div>
              </div>
            </div>

            {/* Thống kê bóc tách 4 nhóm chi phí */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" style={{ maxWidth: '850px' }}>
              <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-primary)' }}>
                <div className="text-xs text-secondary font-medium mb-1">🧱 Thợ xây ứng/trả</div>
                <div className="text-lg font-bold text-primary">{totalThoXay.toLocaleString('vi-VN')} <span className="text-xs">đ</span></div>
              </div>
              <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--info)' }}>
                <div className="text-xs text-secondary font-medium mb-1">⚡ Thợ khác chi</div>
                <div className="text-lg font-bold" style={{ color: 'var(--info)' }}>{totalThoKhac.toLocaleString('vi-VN')} <span className="text-xs">đ</span></div>
              </div>
              <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-secondary)' }}>
                <div className="text-xs text-secondary font-medium mb-1">🏗️ Tiền vật tư</div>
                <div className="text-lg font-bold" style={{ color: 'var(--accent-secondary)' }}>{totalVatTu.toLocaleString('vi-VN')} <span className="text-xs">đ</span></div>
              </div>
              <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--text-secondary)' }}>
                <div className="text-xs text-secondary font-medium mb-1">📦 Chi phí khác</div>
                <div className="text-lg font-bold text-secondary">{totalKhac.toLocaleString('vi-VN')} <span className="text-xs">đ</span></div>
              </div>
            </div>
            
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
                  <input type="text" required className="input-field" value={transNote} onChange={e=>setTransNote(e.target.value)} placeholder={transType === 'OUT' ? (expenseCategory === 'THO_XAY' ? 'VD: Thợ Ba ứng lần 2...' : expenseCategory === 'VAT_TU' ? 'VD: 3 xe cát bãi Ba Thắng...' : 'VD: Mua dây điện cadivi...') : 'VD: Khách tạm ứng đợt 1...'} />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary w-full justify-center">{editingTransId ? 'Lưu chỉnh sửa' : 'Thêm mới'}</button>
                  {editingTransId && <button type="button" className="btn btn-outline" onClick={cancelEditTrans}>Hủy</button>}
                </div>
              </form>
            </div>
          </div>
          
          <div>
            <div className="card w-full">
              <h3 className="font-bold mb-4">Lịch sử giao dịch</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Loại</th>
                      <th>Phân loại</th>
                      <th>Nội dung</th>
                      <th className="text-right">Số tiền</th>
                      <th className="text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...(project.transactions || [])].sort((a,b) => new Date(b.date) - new Date(a.date)).map(t => {
                      const catInfo = EXPENSE_CATEGORIES[t.expenseCategory] || (t.type === 'OUT' ? EXPENSE_CATEGORIES.KHAC : null);
                      return (
                        <tr key={t.id} style={{ background: editingTransId === t.id ? 'var(--bg-secondary)' : 'transparent' }}>
                          <td>{t.date}</td>
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
                          <td>{t.note}</td>
                          <td className="text-right font-bold" style={{ color: t.type === 'IN' ? 'var(--success)' : 'var(--danger)' }}>
                            {t.type === 'IN' ? '+' : '-'}{t.amount.toLocaleString('vi-VN')}
                          </td>
                          <td className="text-right">
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => startEditTrans(t)} className="icon-btn text-info" title="Sửa"><Edit size={16} /></button>
                              <button onClick={() => removeTransaction(project.id, t.id)} className="icon-btn text-danger" title="Xóa"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {(project.transactions || []).length === 0 && (
                      <tr><td colSpan="6" className="text-center text-secondary py-4">Chưa có giao dịch nào.</td></tr>
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

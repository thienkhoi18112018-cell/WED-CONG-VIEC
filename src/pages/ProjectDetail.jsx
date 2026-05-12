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
  const [transAmount, setTransAmount] = useState('');
  const [transNote, setTransNote] = useState('');

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
        const imageRef = ref(storage, `projects/${project.id}/logs/${Date.now()}_${logImage.name}`);
        await uploadBytes(imageRef, logImage);
        imageUrl = await getDownloadURL(imageRef);
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
                        <th>Nội dung</th>
                        <th className="text-right">Số tiền (VNĐ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan="3" className="font-bold text-right">Tổng thu:</td>
                        <td className="text-right font-bold text-success">+{totalIn.toLocaleString('vi-VN')}</td>
                      </tr>
                      <tr>
                        <td colSpan="3" className="font-bold text-right">Tổng chi:</td>
                        <td className="text-right font-bold text-danger">-{totalOut.toLocaleString('vi-VN')}</td>
                      </tr>
                      {[...(project.transactions || [])].sort((a,b) => new Date(b.date) - new Date(a.date)).map(t => (
                        <tr key={t.id}>
                          <td>{t.date}</td>
                          <td>{t.type === 'IN' ? 'Tiền Vào' : 'Tiền Ra'}</td>
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
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="card">
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
                        capture="environment" 
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
          <div className="md:col-span-2">
            <div className="card h-full">
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
                  <input type="text" required className="input-field" value={transNote} onChange={e=>setTransNote(e.target.value)} placeholder="VD: Mua xi măng..." />
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
                    {[...(project.transactions || [])].sort((a,b) => new Date(b.date) - new Date(a.date)).map(t => (
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
                            <button onClick={() => removeTransaction(project.id, t.id)} className="icon-btn text-danger" title="Xóa"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(project.transactions || []).length === 0 && (
                      <tr><td colSpan="5" className="text-center text-secondary py-4">Chưa có giao dịch nào.</td></tr>
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

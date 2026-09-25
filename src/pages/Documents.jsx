import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, Download, AlertCircle, FileCode, Image, FileArchive } from 'lucide-react';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppContext } from '../context/AppContext';

const Documents = () => {
  const { role } = useAppContext();
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'documents'), orderBy('uploadedAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setDocuments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Sử dụng Cloudinary với endpoint auto/upload để hỗ trợ đa dạng định dạng (PDF, DWG, DOCX, ZIP, Ảnh...)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 't4pe5mv6'); // Preset người dùng cung cấp
      formData.append('resource_type', 'auto');

      const response = await fetch('https://api.cloudinary.com/v1_1/dcycbg68u/auto/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.secure_url) {
        await addDoc(collection(db, 'documents'), {
          name: file.name,
          url: result.secure_url,
          size: file.size,
          type: file.type || result.format || 'unknown',
          resourceType: result.resource_type || 'auto',
          uploadedAt: new Date().toISOString()
        });
      } else {
        throw new Error(result.error?.message || 'Tải lên Cloudinary thất bại');
      }
    } catch (error) {
      console.error("Lỗi upload:", error);
      alert("Tải lên thất bại: " + (error.message || 'Vui lòng kiểm tra lại'));
    } finally {
      setIsUploading(false);
      e.target.value = ''; // reset input
    }
  };

  const handleDelete = async (docId) => {
    if (window.confirm('Xác nhận xóa tài liệu này?')) {
      try {
        await deleteDoc(doc(db, 'documents', docId));
      } catch (error) {
        console.error("Lỗi xóa:", error);
      }
    }
  };

  // Tạo URL tải trực tiếp về máy (bằng cờ fl_attachment của Cloudinary)
  const getDownloadUrl = (url) => {
    if (!url) return '';
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
      return url.replace('/upload/', '/upload/fl_attachment/');
    }
    return url;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (name = '') => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'dwg') return <FileCode size={18} className="text-warning" />;
    if (['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(ext)) return <Image size={18} className="text-info" />;
    if (['zip', 'rar', '7z'].includes(ext)) return <FileArchive size={18} className="text-secondary" />;
    if (ext === 'pdf') return <FileText size={18} className="text-danger" />;
    return <FileText size={18} className="text-primary" />;
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="page-title">Tài liệu nội bộ</h1>
          <p className="page-subtitle">Lưu trữ biểu mẫu, bản vẽ thiết kế (DWG), quy trình, hợp đồng mẫu của công ty.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={() => setShowGuide(!showGuide)} 
            className="btn btn-outline text-xs flex items-center gap-1"
            title="Xem hướng dẫn tải PDF"
          >
            <AlertCircle size={14} className="text-warning" /> Hướng dẫn mở khóa file PDF
          </button>

          {role === 'ADMIN' && (
            <label className="btn btn-primary cursor-pointer">
              <Upload size={16} /> {isUploading ? 'Đang tải...' : 'Tải lên tài liệu'}
              <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
            </label>
          )}
        </div>
      </div>

      {/* Hộp hướng dẫn mở khóa PDF trên Cloudinary (nếu cần) */}
      {showGuide && (
        <div 
          className="p-4 rounded-lg mb-6 animate-fade-in" 
          style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-warning mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-warning mb-1">Cách xử lý khi file PDF báo lỗi "Không tải được tài liệu PDF":</h4>
              <p className="text-xs text-secondary leading-relaxed">
                Mặc định tài khoản Cloudinary khóa tính năng tải/xem file PDF & ZIP vì lý do bảo mật. Để mở khóa (chỉ cần làm 1 lần duy nhất):
              </p>
              <ol className="text-xs text-secondary list-decimal list-inside mt-2 space-y-1">
                <li>Đăng nhập vào Cloudinary Console: <a href="https://cloudinary.com/console" target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium">cloudinary.com/console</a></li>
                <li>Bấm vào biểu tượng <strong>Cài đặt (Settings - hình bánh răng)</strong> ở góc dưới bên trái.</li>
                <li>Chọn tab <strong>Security</strong>.</li>
                <li>Kéo xuống mục <strong>"PDF and ZIP files delivery"</strong> (hoặc Blocked delivery formats).</li>
                <li>Tích chọn vào ô: <strong>"Allow delivery of PDF and ZIP files"</strong> rồi bấm <strong>Save</strong>.</li>
              </ol>
              <p className="text-xs text-success font-medium mt-2">
                ✓ Sau khi bật tùy chọn trên, tất cả file PDF và bản vẽ sẽ xem và tải về bình thường ngay lập tức!
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Tên tài liệu</th>
                <th>Kích thước</th>
                <th>Ngày tải lên</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((docItem) => (
                <tr key={docItem.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      {getFileIcon(docItem.name)}
                      <span className="font-medium text-sm">{docItem.name}</span>
                    </div>
                  </td>
                  <td className="text-sm">{formatSize(docItem.size)}</td>
                  <td className="text-sm">{new Date(docItem.uploadedAt).toLocaleDateString('vi-VN')}</td>
                  <td className="text-right">
                    <div className="flex gap-2 justify-end">
                      <a 
                        href={getDownloadUrl(docItem.url)} 
                        download={docItem.name}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn btn-outline py-1 px-2.5 text-xs flex items-center gap-1"
                        title="Tải trực tiếp về máy tính"
                      >
                        <Download size={13} /> Tải về
                      </a>
                      {role === 'ADMIN' && (
                        <button className="icon-btn text-danger" onClick={() => handleDelete(docItem.id)} title="Xóa tài liệu">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-secondary">
                    Chưa có tài liệu nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Documents;

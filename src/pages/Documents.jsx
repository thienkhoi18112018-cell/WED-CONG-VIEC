import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, Download } from 'lucide-react';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAppContext } from '../context/AppContext';

const Documents = () => {
  const { role } = useAppContext();
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

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
      // Sử dụng Cloudinary thay cho Firebase Storage
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 't4pe5mv6'); // Preset người dùng cung cấp

      const response = await fetch('https://api.cloudinary.com/v1_1/dcycbg68u/upload', {
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
          uploadedAt: new Date().toISOString()
        });
      } else {
        throw new Error(result.error?.message || 'Tải lên Cloudinary thất bại');
      }
    } catch (error) {
      console.error("Lỗi upload:", error);
      alert("Tải lên thất bại!");
    } finally {
      setIsUploading(false);
      e.target.value = ''; // reset input
    }
  };

  const handleDelete = async (docId) => {
    if (window.confirm('Xác nhận xóa tài liệu này?')) {
      try {
        await deleteDoc(doc(db, 'documents', docId));
        // Lưu ý: File thực tế trên Cloudinary sẽ không bị xóa tự động từ Frontend
        // Để bảo mật, chỉ có thể xóa file thông qua Cloudinary Dashboard hoặc Backend Server
      } catch (error) {
        console.error("Lỗi xóa:", error);
      }
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Tài liệu nội bộ</h1>
          <p className="page-subtitle">Lưu trữ biểu mẫu, quy trình, hợp đồng mẫu của công ty.</p>
        </div>
        {role === 'ADMIN' && (
          <div>
            <label className="btn btn-primary cursor-pointer">
              <Upload size={16} /> {isUploading ? 'Đang tải...' : 'Tải lên tài liệu'}
              <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
            </label>
          </div>
        )}
      </div>
      
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
                      <FileText size={18} className="text-primary" />
                      <span className="font-medium">{docItem.name}</span>
                    </div>
                  </td>
                  <td>{formatSize(docItem.size)}</td>
                  <td>{new Date(docItem.uploadedAt).toLocaleDateString('vi-VN')}</td>
                  <td className="text-right">
                    <div className="flex gap-2 justify-end">
                      <a href={docItem.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline py-1 px-2 text-sm">
                        <Download size={14} /> Tải về
                      </a>
                      {role === 'ADMIN' && (
                        <button className="icon-btn text-danger" onClick={() => handleDelete(docItem.id)} title="Xóa">
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

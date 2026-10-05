import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, X, ShieldCheck, AlertCircle } from 'lucide-react';

export const ADMIN_PASSWORD_PRIMARY = 'Nhutvn93';
export const ADMIN_PASSWORD_SECONDARY = 'Nhut93';

export const verifyAdminPassword = (pwd) => {
  if (!pwd) return false;
  const clean = pwd.trim();
  return clean === ADMIN_PASSWORD_PRIMARY || clean === ADMIN_PASSWORD_SECONDARY;
};

const PasswordModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  title = "Xác nhận Mật khẩu Két sắt", 
  description = "Vui lòng nhập mật khẩu Quản trị viên để tiếp tục." 
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setShowPassword(false);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (verifyAdminPassword(password)) {
      setError('');
      onSuccess();
      onClose();
    } else {
      setError('Mật khẩu không chính xác! Vui lòng kiểm tra lại.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div 
        className="modal-content animate-fade-in" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '420px', width: '92%' }}
      >
        <div className="modal-header" style={{ padding: '1rem 1.25rem' }}>
          <div className="flex items-center gap-2">
            <div 
              className="flex items-center justify-center rounded-full"
              style={{ width: '36px', height: '36px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}
            >
              <Lock size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base">{title}</h3>
              <p className="text-xs text-secondary">{description}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="icon-btn text-secondary hover:text-primary"
            style={{ padding: '0.4rem', borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '1.25rem' }}>
            {error && (
              <div 
                className="flex items-center gap-2 p-2.5 rounded-lg mb-3 text-xs font-semibold"
                style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
              >
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="input-group">
              <label className="input-label text-xs font-semibold flex items-center justify-between">
                <span>Mật khẩu Quản trị (Két sắt)</span>
                <span className="text-secondary font-normal" style={{ fontSize: '0.7rem' }}>Bảo mật tài chính</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  style={{ width: '100%', paddingRight: '40px', fontSize: '0.95rem' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                  title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              onClick={onClose} 
              className="btn btn-outline text-xs"
              style={{ padding: '0.5rem 1rem' }}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="btn btn-primary text-xs flex items-center gap-1.5"
              style={{ padding: '0.5rem 1.2rem', background: 'var(--accent-primary)' }}
            >
              <ShieldCheck size={15} />
              <span>Xác nhận</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordModal;

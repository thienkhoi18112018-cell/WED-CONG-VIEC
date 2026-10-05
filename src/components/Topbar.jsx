import React, { useState } from 'react';
import { Moon, Sun, Bell, UserCircle, LogOut, Menu, Lock, ShieldCheck } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import PasswordModal from './PasswordModal';
import './Topbar.css';

const Topbar = ({ toggleSidebar }) => {
  const { role, unlockAdmin, lockAdmin, theme, toggleTheme, logout } = useAppContext();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="topbar glass-panel">
      <div className="topbar-left flex items-center gap-2">
        <button className="icon-btn mobile-menu-btn" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
        {/* Empty for now, can put breadcrumbs here */}
      </div>

      <div className="topbar-right">
        {/* Quản lý quyền: Mở khóa Quản trị viên hoặc Khóa lại về Nhân viên */}
        <div className="role-switcher">
          {role === 'ADMIN' ? (
            <button 
              className="badge badge-danger flex items-center gap-1.5 cursor-pointer hover:opacity-90"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', border: 'none' }}
              onClick={() => {
                if (window.confirm('Khóa lại về chế độ Nhân viên (Ẩn tài chính)?')) {
                  lockAdmin();
                }
              }}
              title="Đang mở quyền Quản trị viên. Bấm để khóa lại về quyền Nhân viên."
            >
              <ShieldCheck size={14} />
              <span>👑 Quản trị viên (Bấm để khóa)</span>
            </button>
          ) : (
            <button 
              className="btn btn-outline flex items-center gap-1.5 text-xs py-1 px-2.5"
              style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', background: 'rgba(59, 130, 246, 0.08)' }}
              onClick={() => setIsAuthModalOpen(true)}
              title="Bấm để mở khóa quyền Quản trị viên (Cần mật khẩu két sắt)"
            >
              <Lock size={14} />
              <span>Mở khóa Admin</span>
            </button>
          )}
        </div>

        <PasswordModal 
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={() => {
            unlockAdmin('Nhutvn93');
          }}
          title="Mở khóa Quyền Quản Trị Viên"
          description="Nhập mật khẩu két sắt để xem toàn bộ tài chính và sổ quỹ."
        />

        <button className="icon-btn" onClick={toggleTheme}>
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <button className="icon-btn relative">
          <Bell size={20} />
          <span className="notification-dot"></span>
        </button>

        <div className="user-profile">
          <div className="avatar">
            <UserCircle size={32} />
          </div>
          <div className="user-info">
            <span className="user-name">Người dùng Demo</span>
            <span className="user-role">{role}</span>
          </div>
        </div>

        <button className="icon-btn text-danger" onClick={handleLogout} title="Đăng xuất">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Topbar;

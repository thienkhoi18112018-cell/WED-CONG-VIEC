import React from 'react';
import { Moon, Sun, Bell, UserCircle, LogOut, Menu } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import './Topbar.css';

const Topbar = ({ toggleSidebar }) => {
  const { role, toggleRole, theme, toggleTheme, logout } = useAppContext();
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
        {/* Role Demo Switcher */}
        <div className="role-switcher">
          <span className="role-label">Mode:</span>
          <button 
            className={`badge ${role === 'ADMIN' ? 'badge-danger' : 'badge-info'}`}
            onClick={toggleRole}
            title="Nhấn để đổi quyền (Demo)"
          >
            {role === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên'}
          </button>
        </div>

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

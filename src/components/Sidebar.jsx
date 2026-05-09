import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, HardHat, PenTool, FileText, DollarSign, Settings } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import './Sidebar.css'; // Optional: We will put some specific styles here

const Sidebar = () => {
  const { role } = useAppContext();

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-header">
        <div className="logo-icon">
          <HardHat size={28} color="var(--accent-primary)" />
        </div>
        <h1 className="logo-text">HDCONS</h1>
      </div>
      
      <nav className="sidebar-nav">
        <ul>
          <li>
            <NavLink to="/dashboard" end className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={20} />
              <span>Tổng quan</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/dashboard/construction" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <HardHat size={20} />
              <span>Thi công</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/dashboard/design" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <PenTool size={20} />
              <span>Thiết kế</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/dashboard/documents" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <FileText size={20} />
              <span>Tài liệu nội bộ</span>
            </NavLink>
          </li>
          
          {role === 'ADMIN' && (
            <li>
              <NavLink to="/dashboard/finance" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <DollarSign size={20} />
                <span>Tài chính</span>
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <NavLink to="/dashboard/settings" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <Settings size={20} />
          <span>Cài đặt chung</span>
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;

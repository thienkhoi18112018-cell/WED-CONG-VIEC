import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { HardHat } from 'lucide-react';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAppContext();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    // Kiểm tra thông tin đăng nhập
    if (username === 'hdcons' && password === 'hdcons') {
      login('ADMIN');
      navigate('/dashboard');
    } else if (username === 'nhanvien' && password === '123456') {
      login('EMPLOYEE');
      navigate('/dashboard');
    } else {
      setError('Tài khoản hoặc mật khẩu không chính xác!');
    }
  };

  return (
    <div className="page-container flex items-center justify-center" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <div className="flex flex-col items-center mb-8">
          <div className="logo-icon mb-4" style={{ width: 64, height: 64 }}>
            <HardHat size={32} color="var(--accent-primary)" />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>HDCONS Admin</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Đăng nhập hệ thống quản lý</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="input-group">
            <label className="input-label">Tên đăng nhập</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="VD: hdcons" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
          </div>
          <div className="input-group">
            <label className="input-label">Mật khẩu</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="Nhập mật khẩu" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', padding: '0.75rem' }}>
            Đăng nhập
          </button>
        </form>
        
        <div className="text-center mt-6">
          <button onClick={() => navigate('/')} className="btn btn-outline" style={{ width: '100%' }}>
            Quay lại Trang chủ
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

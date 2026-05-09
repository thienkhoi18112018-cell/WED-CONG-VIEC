import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

const initialProjects = [
  { 
    id: 1, name: 'Biệt thự Vinhomes Riverside', status: 'Đang thi công', progress: 0, manager: 'Nguyễn Văn A', 
    startDate: '2026-01-10', durationMonths: 6, totalValue: 5000000000, isCompleted: false,
    dailyLogs: [
      { id: 101, date: '2026-01-10', work: 'Động thổ, ép cọc', weather: 'Nắng', workers: 10, isWorking: true },
      { id: 102, date: '2026-01-11', work: 'Ép cọc nhồi', weather: 'Mưa', workers: 12, isWorking: true },
    ],
    transactions: [
      { id: 201, date: '2026-01-05', type: 'IN', amount: 1000000000, note: 'Tạm ứng đợt 1' },
      { id: 202, date: '2026-01-12', type: 'OUT', amount: 200000000, note: 'Thanh toán tiền cọc bê tông' },
    ]
  },
  { 
    id: 2, name: 'Tòa nhà văn phòng FPT', status: 'Hoàn thành', progress: 100, manager: 'Trần Thị B', 
    startDate: '2025-05-15', durationMonths: 12, totalValue: 12000000000, isCompleted: true,
    dailyLogs: [],
    transactions: [
      { id: 203, date: '2025-05-10', type: 'IN', amount: 5000000000, note: 'Thanh toán đợt 1' },
      { id: 204, date: '2025-08-10', type: 'IN', amount: 5000000000, note: 'Thanh toán đợt 2' },
      { id: 205, date: '2026-05-01', type: 'IN', amount: 2000000000, note: 'Quyết toán' },
    ]
  },
];

const initialDesigns = [
  { 
    id: 1, name: 'Thiết kế nội thất chung cư cao cấp', status: 'Đang thực hiện', progress: 80, manager: 'Phạm Văn D', 
    startDate: '2026-03-01', durationMonths: 2, totalValue: 150000000, isCompleted: false,
    transactions: [
      { id: 301, date: '2026-03-01', type: 'IN', amount: 50000000, note: 'Tạm ứng thiết kế' }
    ]
  },
];

const initialPastProjects = [
  { id: 1, year: '2025', name: 'Khu dân cư Sunrise', description: 'Thiết kế và thi công trọn gói 50 căn nhà phố.', image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=600&auto=format&fit=crop' },
  { id: 2, year: '2024', name: 'Trụ sở công ty ABC', description: 'Thi công cải tạo tòa nhà văn phòng 10 tầng.', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=600&auto=format&fit=crop' },
];

export const AppProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState('ADMIN'); // ADMIN or EMPLOYEE
  const [theme, setTheme] = useState('light');
  
  const [projects, setProjects] = useState(initialProjects);
  const [designs, setDesigns] = useState(initialDesigns);
  const [pastProjects, setPastProjects] = useState(initialPastProjects);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const savedAuth = localStorage.getItem('isAuthenticated') === 'true';
    const savedRole = localStorage.getItem('role') || 'ADMIN';
    if (savedAuth) {
      setIsAuthenticated(true);
      setRole(savedRole);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const login = (selectedRole) => {
    setIsAuthenticated(true);
    setRole(selectedRole);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('role', selectedRole);
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
  };

  const toggleRole = () => {
    const newRole = role === 'ADMIN' ? 'EMPLOYEE' : 'ADMIN';
    setRole(newRole);
    localStorage.setItem('role', newRole);
  };

  // --- QUẢN LÝ DỰ ÁN ---
  const addProject = (project) => {
    setProjects([...projects, { ...project, id: Date.now(), dailyLogs: [], transactions: [], isCompleted: false }]);
  };
  const updateProject = (id, updatedProject) => {
    setProjects(projects.map(p => p.id === id ? { ...p, ...updatedProject } : p));
  };
  const removeProject = (id) => {
    setProjects(projects.filter(p => p.id !== id));
  };

  // Logic Nhật ký
  const addDailyLog = (projectId, log) => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        return { ...p, dailyLogs: [...p.dailyLogs, { ...log, id: Date.now() }] };
      }
      return p;
    }));
  };
  const updateDailyLog = (projectId, logId, updatedLog) => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        return { ...p, dailyLogs: p.dailyLogs.map(l => l.id === logId ? { ...l, ...updatedLog } : l) };
      }
      return p;
    }));
  };
  const removeDailyLog = (projectId, logId) => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        return { ...p, dailyLogs: p.dailyLogs.filter(l => l.id !== logId) };
      }
      return p;
    }));
  };

  // Logic Sổ quỹ Thi Công
  const addTransaction = (projectId, transaction) => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        return { ...p, transactions: [...p.transactions, { ...transaction, id: Date.now() }] };
      }
      return p;
    }));
  };
  const updateTransaction = (projectId, transactionId, updatedTransaction) => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        return { ...p, transactions: p.transactions.map(t => t.id === transactionId ? { ...t, ...updatedTransaction } : t) };
      }
      return p;
    }));
  };
  const removeTransaction = (projectId, transactionId) => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        return { ...p, transactions: p.transactions.filter(t => t.id !== transactionId) };
      }
      return p;
    }));
  };

  // --- QUẢN LÝ THIẾT KẾ ---
  const addDesign = (design) => {
    setDesigns([...designs, { ...design, id: Date.now(), transactions: [], isCompleted: false }]);
  };
  const updateDesign = (id, updatedDesign) => {
    setDesigns(designs.map(d => d.id === id ? { ...d, ...updatedDesign } : d));
  };
  const removeDesign = (id) => {
    setDesigns(designs.filter(d => d.id !== id));
  };

  const addDesignTransaction = (designId, transaction) => {
    setDesigns(designs.map(d => {
      if (d.id === designId) {
        return { ...d, transactions: [...d.transactions, { ...transaction, id: Date.now() }] };
      }
      return d;
    }));
  };
  const updateDesignTransaction = (designId, transactionId, updatedTransaction) => {
    setDesigns(designs.map(d => {
      if (d.id === designId) {
        return { ...d, transactions: d.transactions.map(t => t.id === transactionId ? { ...t, ...updatedTransaction } : t) };
      }
      return d;
    }));
  };
  const removeDesignTransaction = (designId, transactionId) => {
    setDesigns(designs.map(d => {
      if (d.id === designId) {
        return { ...d, transactions: d.transactions.filter(t => t.id !== transactionId) };
      }
      return d;
    }));
  };

  return (
    <AppContext.Provider value={{ 
      isAuthenticated, login, logout, 
      role, toggleRole, 
      theme, toggleTheme,
      projects, addProject, updateProject, removeProject,
      addDailyLog, updateDailyLog, removeDailyLog, addTransaction, updateTransaction, removeTransaction,
      designs, addDesign, updateDesign, removeDesign,
      addDesignTransaction, updateDesignTransaction, removeDesignTransaction,
      pastProjects
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);

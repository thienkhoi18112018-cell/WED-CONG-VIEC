import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

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
  
  const [projects, setProjects] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [pastProjects, setPastProjects] = useState([]);



  // Lắng nghe dữ liệu realtime từ Firebase
  useEffect(() => {
    const unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
      setProjects(snapshot.docs.map(doc => doc.data()));
    });
    const unsubDesigns = onSnapshot(collection(db, 'designs'), (snapshot) => {
      setDesigns(snapshot.docs.map(doc => doc.data()));
    });
    const unsubPastProjects = onSnapshot(collection(db, 'pastProjects'), (snapshot) => {
      setPastProjects(snapshot.docs.map(doc => doc.data()));
    });

    return () => {
      unsubProjects();
      unsubDesigns();
      unsubPastProjects();
    };
  }, []);

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
  const addProject = async (project) => {
    const newId = Date.now().toString();
    await setDoc(doc(db, 'projects', newId), { ...project, id: newId, dailyLogs: [], transactions: [], isCompleted: false });
  };
  const updateProject = async (id, updatedProject) => {
    await updateDoc(doc(db, 'projects', id.toString()), updatedProject);
  };
  const removeProject = async (id) => {
    await deleteDoc(doc(db, 'projects', id.toString()));
  };

  // Logic Nhật ký
  const addDailyLog = async (projectId, log) => {
    const project = projects.find(p => p.id.toString() === projectId.toString());
    if (project) {
      const updatedLogs = [...(project.dailyLogs || []), { ...log, id: Date.now().toString() }];
      await updateDoc(doc(db, 'projects', projectId.toString()), { dailyLogs: updatedLogs });
    }
  };
  const updateDailyLog = async (projectId, logId, updatedLog) => {
    const project = projects.find(p => p.id.toString() === projectId.toString());
    if (project) {
      const updatedLogs = project.dailyLogs.map(l => l.id.toString() === logId.toString() ? { ...l, ...updatedLog } : l);
      await updateDoc(doc(db, 'projects', projectId.toString()), { dailyLogs: updatedLogs });
    }
  };
  const removeDailyLog = async (projectId, logId) => {
    const project = projects.find(p => p.id.toString() === projectId.toString());
    if (project) {
      const updatedLogs = project.dailyLogs.filter(l => l.id.toString() !== logId.toString());
      await updateDoc(doc(db, 'projects', projectId.toString()), { dailyLogs: updatedLogs });
    }
  };

  // Logic Sổ quỹ Thi Công
  const addTransaction = async (projectId, transaction) => {
    const project = projects.find(p => p.id.toString() === projectId.toString());
    if (project) {
      const updatedTrans = [...(project.transactions || []), { ...transaction, id: Date.now().toString() }];
      await updateDoc(doc(db, 'projects', projectId.toString()), { transactions: updatedTrans });
    }
  };
  const updateTransaction = async (projectId, transactionId, updatedTransaction) => {
    const project = projects.find(p => p.id.toString() === projectId.toString());
    if (project) {
      const updatedTrans = project.transactions.map(t => t.id.toString() === transactionId.toString() ? { ...t, ...updatedTransaction } : t);
      await updateDoc(doc(db, 'projects', projectId.toString()), { transactions: updatedTrans });
    }
  };
  const removeTransaction = async (projectId, transactionId) => {
    const project = projects.find(p => p.id.toString() === projectId.toString());
    if (project) {
      const updatedTrans = project.transactions.filter(t => t.id.toString() !== transactionId.toString());
      await updateDoc(doc(db, 'projects', projectId.toString()), { transactions: updatedTrans });
    }
  };

  // --- QUẢN LÝ THIẾT KẾ ---
  const addDesign = async (design) => {
    const newId = Date.now().toString();
    await setDoc(doc(db, 'designs', newId), { ...design, id: newId, transactions: [], isCompleted: false });
  };
  const updateDesign = async (id, updatedDesign) => {
    await updateDoc(doc(db, 'designs', id.toString()), updatedDesign);
  };
  const removeDesign = async (id) => {
    await deleteDoc(doc(db, 'designs', id.toString()));
  };

  const addDesignTransaction = async (designId, transaction) => {
    const design = designs.find(d => d.id.toString() === designId.toString());
    if (design) {
      const updatedTrans = [...(design.transactions || []), { ...transaction, id: Date.now().toString() }];
      await updateDoc(doc(db, 'designs', designId.toString()), { transactions: updatedTrans });
    }
  };
  const updateDesignTransaction = async (designId, transactionId, updatedTransaction) => {
    const design = designs.find(d => d.id.toString() === designId.toString());
    if (design) {
      const updatedTrans = design.transactions.map(t => t.id.toString() === transactionId.toString() ? { ...t, ...updatedTransaction } : t);
      await updateDoc(doc(db, 'designs', designId.toString()), { transactions: updatedTrans });
    }
  };
  const removeDesignTransaction = async (designId, transactionId) => {
    const design = designs.find(d => d.id.toString() === designId.toString());
    if (design) {
      const updatedTrans = design.transactions.filter(t => t.id.toString() !== transactionId.toString());
      await updateDoc(doc(db, 'designs', designId.toString()), { transactions: updatedTrans });
    }
  };

  // --- QUẢN LÝ DỰ ÁN ĐÃ THỰC HIỆN ---
  const addPastProject = async (project) => {
    const newId = Date.now().toString();
    await setDoc(doc(db, 'pastProjects', newId), { ...project, id: newId });
  };
  const updatePastProject = async (id, updatedProject) => {
    await updateDoc(doc(db, 'pastProjects', id.toString()), updatedProject);
  };
  const removePastProject = async (id) => {
    await deleteDoc(doc(db, 'pastProjects', id.toString()));
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
      pastProjects, addPastProject, updatePastProject, removePastProject
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);

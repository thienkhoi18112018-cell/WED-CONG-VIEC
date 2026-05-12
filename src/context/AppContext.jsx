import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

const AppContext = createContext();


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

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Building2, Plus, Edit, Trash2, Search, Filter, 
  Calendar, DollarSign, Wallet, ArrowDownRight, Tag 
} from 'lucide-react';

const EXPENSE_CATEGORIES = {
  LUONG: { label: 'Trả lương & Thưởng', badge: 'badge-primary', icon: '💼' },
  VAN_PHONG: { label: 'Văn phòng & Lặt vặt', badge: 'badge-info', icon: '☕' },
  MAT_BANG: { label: 'Mặt bằng, Điện, Nước, Net', badge: 'badge-warning', icon: '🏢' },
  TIEP_KHACH: { label: 'Tiếp khách & Đối ngoại', badge: 'badge-orange', icon: '🤝' },
  XANG_XE: { label: 'Xăng xe & Đi lại', badge: 'badge-secondary', icon: '🚗' },
  KHAC: { label: 'Chi phí khác', badge: 'badge-secondary', icon: '📦' }
};

const CompanyExpenses = () => {
  const { role, companyExpenses, addCompanyExpense, updateCompanyExpense, removeCompanyExpense } = useAppContext();

  // State Form
  const [editingId, setEditingId] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('VAN_PHONG');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [note, setNote] = useState('');

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Tính toán số liệu thống kê
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const currentYearStr = new Date().getFullYear().toString();

    let spentToday = 0;
    let spentMonth = 0;
    let spentYear = 0;
    let totalAll = 0;

    (companyExpenses || []).forEach(exp => {
      const expAmt = Number(exp.amount) || 0;
      totalAll += expAmt;

      if (exp.date === todayStr) {
        spentToday += expAmt;
      }
      if (exp.date && exp.date.startsWith(currentMonthStr)) {
        spentMonth += expAmt;
      }
      if (exp.date && exp.date.startsWith(currentYearStr)) {
        spentYear += expAmt;
      }
    });

    return { spentToday, spentMonth, spentYear, totalAll };
  }, [companyExpenses]);

  // Danh sách đã lọc
  const filteredExpenses = useMemo(() => {
    return [...(companyExpenses || [])]
      .filter(exp => {
        // Lọc tháng (nếu chọn)
        if (filterMonth && !exp.date?.startsWith(filterMonth)) return false;
        // Lọc danh mục
        if (filterCategory !== 'ALL' && exp.category !== filterCategory) return false;
        // Tìm kiếm theo từ khóa
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchNote = (exp.note || '').toLowerCase().includes(term);
          const matchRecipient = (exp.recipient || '').toLowerCase().includes(term);
          return matchNote || matchRecipient;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [companyExpenses, filterMonth, filterCategory, searchTerm]);

  // Tổng tiền trong danh sách hiển thị
  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [filteredExpenses]);

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setDate(item.date);
    setCategory(item.category || 'VAN_PHONG');
    setAmount(item.amount.toString());
    setRecipient(item.recipient || '');
    setNote(item.note || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDate(new Date().toISOString().slice(0, 10));
    setCategory('VAN_PHONG');
    setAmount('');
    setRecipient('');
    setNote('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = parseInt(amount.toString().replace(/\D/g, '')) || 0;
    if (parsedAmount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ lớn hơn 0');
      return;
    }

    const payload = {
      date,
      category,
      amount: parsedAmount,
      recipient: recipient.trim(),
      note: note.trim()
    };

    if (editingId) {
      await updateCompanyExpense(editingId, payload);
      setEditingId(null);
    } else {
      await addCompanyExpense(payload);
    }

    // Reset form
    setAmount('');
    setRecipient('');
    setNote('');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa khoản chi này?')) {
      await removeCompanyExpense(id);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header mb-6">
        <div className="flex items-center gap-3">
          <div style={{ 
            background: 'rgba(59, 130, 246, 0.1)', 
            padding: '10px', 
            borderRadius: '12px',
            color: 'var(--accent-primary)' 
          }}>
            <Building2 size={28} />
          </div>
          <div>
            <h1 className="page-title text-2xl font-bold">Chi Phí Hoạt Động Công Ty</h1>
            <p className="page-subtitle text-secondary">
              Quản lý chi trả lương, mặt bằng, văn phòng phẩm và các khoản chi tiêu lặt vặt tại văn phòng.
            </p>
          </div>
        </div>
      </div>

      {/* Thẻ Thống kê tổng quan */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-secondary text-sm font-medium">Chi Tháng Này</span>
            <Calendar size={18} className="text-primary" />
          </div>
          <div className="text-2xl font-bold text-primary">
            {stats.spentMonth.toLocaleString('vi-VN')} <span className="text-sm">VNĐ</span>
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-secondary text-sm font-medium">Chi Hôm Nay</span>
            <DollarSign size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>
            {stats.spentToday.toLocaleString('vi-VN')} <span className="text-sm">VNĐ</span>
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-secondary text-sm font-medium">Chi Năm {new Date().getFullYear()}</span>
            <ArrowDownRight size={18} className="text-danger" />
          </div>
          <div className="text-2xl font-bold text-danger">
            {stats.spentYear.toLocaleString('vi-VN')} <span className="text-sm">VNĐ</span>
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-secondary text-sm font-medium">Tổng Khoản Chi</span>
            <Wallet size={18} className="text-success" />
          </div>
          <div className="text-2xl font-bold text-success">
            {companyExpenses.length} <span className="text-sm font-normal text-secondary">mục</span>
          </div>
        </div>
      </div>

      {/* Khu vực Form nhập & Bảng danh sách */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột Trái: Form Thêm/Sửa */}
        <div className="lg:col-span-1">
          <div className="card" style={{ position: 'sticky', top: '20px' }}>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Plus size={18} className="text-primary" />
              {editingId ? 'Sửa Khoản Chi Công Ty' : 'Ghi Nhận Khoản Chi Mới'}
            </h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="input-group">
                <label className="input-label">Ngày chi</label>
                <input 
                  type="date" 
                  required 
                  className="input-field" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                />
              </div>

              <div className="input-group">
                <label className="input-label font-bold text-primary">Danh mục chi</label>
                <select 
                  className="input-field" 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="LUONG">💼 Trả lương & Thưởng nhân sự</option>
                  <option value="VAN_PHONG">☕ Văn phòng phẩm & Lặt vặt</option>
                  <option value="MAT_BANG">🏢 Mặt bằng, Điện, Nước, Net</option>
                  <option value="TIEP_KHACH">🤝 Tiếp khách & Đối ngoại</option>
                  <option value="XANG_XE">🚗 Xăng xe & Đi lại</option>
                  <option value="KHAC">📦 Chi phí khác</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Số tiền (VNĐ)</label>
                <input 
                  type="number" 
                  min="1" 
                  required 
                  className="input-field" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  placeholder="Nhập số tiền..." 
                />
              </div>

              <div className="input-group">
                <label className="input-label">Người nhận / Đơn vị thụ hưởng (nếu có)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={recipient} 
                  onChange={e => setRecipient(e.target.value)} 
                  placeholder="VD: Anh Nam KTS, Chủ nhà trọ, VinMart..." 
                />
              </div>

              <div className="input-group">
                <label className="input-label">Nội dung chi tiết</label>
                <textarea 
                  required 
                  rows={3}
                  className="input-field" 
                  value={note} 
                  onChange={e => setNote(e.target.value)} 
                  placeholder="VD: Trả lương tháng 9 cho Nam, Mua giấy in A4 và cafe tiếp khách..." 
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button type="submit" className="btn btn-primary w-full justify-center">
                  {editingId ? 'Lưu Thay Đổi' : 'Ghi Nhận Khoản Chi'}
                </button>
                {editingId && (
                  <button type="button" className="btn btn-outline" onClick={handleCancelEdit}>
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Cột Phải: Bảng danh sách & Bộ lọc */}
        <div className="lg:col-span-2">
          <div className="card mb-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between mb-4">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div style={{ position: 'relative', width: '100%', maxWidth: '260px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary)' }} />
                  <input 
                    type="text" 
                    placeholder="Tìm nội dung, người nhận..." 
                    className="input-field" 
                    style={{ paddingLeft: '32px', width: '100%' }}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-1">
                  <Filter size={16} className="text-secondary" />
                  <select 
                    className="input-field text-sm" 
                    value={filterCategory} 
                    onChange={e => setFilterCategory(e.target.value)}
                  >
                    <option value="ALL">Tất cả danh mục</option>
                    <option value="LUONG">Trả lương & Thưởng</option>
                    <option value="VAN_PHONG">Văn phòng & Lặt vặt</option>
                    <option value="MAT_BANG">Mặt bằng, Điện, Nước</option>
                    <option value="TIEP_KHACH">Tiếp khách & Đối ngoại</option>
                    <option value="XANG_XE">Xăng xe & Đi lại</option>
                    <option value="KHAC">Chi phí khác</option>
                  </select>
                </div>

                <input 
                  type="month" 
                  className="input-field text-sm" 
                  value={filterMonth} 
                  onChange={e => setFilterMonth(e.target.value)}
                  title="Lọc theo tháng"
                />
                {filterMonth && (
                  <button 
                    className="btn btn-outline text-xs" 
                    style={{ padding: '0.4rem 0.6rem' }}
                    onClick={() => setFilterMonth('')}
                    title="Xem tất cả các tháng"
                  >
                    Tất cả
                  </button>
                )}
              </div>
            </div>

            {/* Thông tin kết quả lọc */}
            <div className="flex justify-between items-center px-1 mb-3 text-sm text-secondary">
              <span>Đang hiển thị: <strong>{filteredExpenses.length}</strong> khoản chi</span>
              <span>Tổng cộng hiển thị: <strong className="text-danger">-{filteredTotal.toLocaleString('vi-VN')} VNĐ</strong></span>
            </div>

            {/* Bảng dữ liệu */}
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Danh mục</th>
                    <th>Người nhận</th>
                    <th>Nội dung chi</th>
                    <th className="text-right">Số tiền</th>
                    <th className="text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map(item => {
                    const catInfo = EXPENSE_CATEGORIES[item.category] || EXPENSE_CATEGORIES.KHAC;
                    return (
                      <tr 
                        key={item.id} 
                        style={{ background: editingId === item.id ? 'var(--bg-secondary)' : 'transparent' }}
                      >
                        <td style={{ whiteSpace: 'nowrap' }}>{item.date}</td>
                        <td>
                          <span className={`badge ${catInfo.badge}`}>
                            {catInfo.icon} {catInfo.label}
                          </span>
                        </td>
                        <td>{item.recipient || <span className="text-secondary italic">-</span>}</td>
                        <td style={{ maxWidth: '280px' }}>{item.note}</td>
                        <td className="text-right font-bold text-danger" style={{ whiteSpace: 'nowrap' }}>
                          -{Number(item.amount).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleStartEdit(item)} 
                              className="icon-btn text-info" 
                              title="Sửa"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(item.id)} 
                              className="icon-btn text-danger" 
                              title="Xóa"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center text-secondary py-8">
                        Chưa có khoản chi nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyExpenses;

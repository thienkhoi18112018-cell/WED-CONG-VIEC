export const EXPENSE_CATEGORIES = {
  THO_XAY: {
    label: 'Tiền thợ xây',
    shortLabel: 'Thợ xây',
    badge: 'badge-primary',
    icon: '🧱',
    color: 'var(--accent-primary)',
    reportTitle: 'BẢNG KÊ QUYẾT TOÁN & TẠM ỨNG TIỀN THỢ XÂY',
  },
  THO_DIEN: {
    label: 'Tiền thợ điện',
    shortLabel: 'Thợ điện',
    badge: 'badge-warning',
    icon: '⚡',
    color: '#f59e0b',
    reportTitle: 'BẢNG KÊ CHI PHÍ ĐỘI THỢ ĐIỆN',
  },
  THO_SON: {
    label: 'Tiền thợ sơn',
    shortLabel: 'Thợ sơn',
    badge: 'badge-info',
    icon: '🎨',
    color: '#0ea5e9',
    reportTitle: 'BẢNG KÊ CHI PHÍ ĐỘI THỢ SƠN',
  },
  THO_CO_KHI: {
    label: 'Tiền thợ cơ khí',
    shortLabel: 'Thợ cơ khí',
    badge: 'badge-orange',
    icon: '🔧',
    color: '#f97316',
    reportTitle: 'BẢNG KÊ CHI PHÍ ĐỘI THỢ CƠ KHÍ',
  },
  THO_NHOM_KINH: {
    label: 'Tiền thợ nhôm kính',
    shortLabel: 'Thợ nhôm kính',
    badge: 'badge-success',
    icon: '🪟',
    color: '#10b981',
    reportTitle: 'BẢNG KÊ CHI PHÍ ĐỘI THỢ NHÔM KÍNH',
  },
  THO_KHAC: {
    label: 'Tiền thợ khác',
    shortLabel: 'Thợ khác',
    badge: 'badge-secondary',
    icon: '🛠️',
    color: '#64748b',
    reportTitle: 'BẢNG KÊ CHI PHÍ ĐỘI THỢ KHÁC',
  },
  VAT_TU: {
    label: 'Tiền vật tư',
    shortLabel: 'Vật tư',
    badge: 'badge-orange',
    icon: '🏗️',
    color: 'var(--accent-secondary)',
    reportTitle: 'BẢNG KÊ CHI TIẾT CUNG CẤP VẬT TƯ CÔNG TRÌNH',
  },
  KHAC: {
    label: 'Tiền khác',
    shortLabel: 'Chi phí khác',
    badge: 'badge-secondary',
    icon: '📦',
    color: 'var(--text-secondary)',
    reportTitle: 'BẢNG KÊ CHI TIẾT CÁC KHOẢN CHI PHÍ KHÁC',
  },
};

export const SUB_CONTRACTOR_CATEGORIES = [
  'THO_DIEN',
  'THO_SON',
  'THO_CO_KHI',
  'THO_NHOM_KINH',
  'THO_KHAC',
];

export const EXPENSE_CATEGORY_LIST = [
  { key: 'THO_XAY', optionLabel: '🧱 Tiền thợ xây (Ứng thợ, tiền công)' },
  { key: 'THO_DIEN', optionLabel: '⚡ Tiền thợ điện (Đi dây, lắp thiết bị điện...)' },
  { key: 'THO_SON', optionLabel: '🎨 Tiền thợ sơn (Bả matit, sơn nước, sơn dầu...)' },
  { key: 'THO_CO_KHI', optionLabel: '🔧 Tiền thợ cơ khí (Cửa sắt, mái tôn, lan can...)' },
  { key: 'THO_NHOM_KINH', optionLabel: '🪟 Tiền thợ nhôm kính (Cửa nhôm, vách kính...)' },
  { key: 'THO_KHAC', optionLabel: '🛠️ Tiền thợ khác (Nước, thạch cao, đá hoa cương...)' },
  { key: 'VAT_TU', optionLabel: '🏗️ Tiền vật tư (Xi măng, cát, đá, sắt thép, gạch...)' },
  { key: 'KHAC', optionLabel: '📦 Tiền khác (Vận chuyển, máy móc, lặt vặt...)' },
];

export const getExpenseCategoryInfo = (categoryKey) => {
  return EXPENSE_CATEGORIES[categoryKey] || EXPENSE_CATEGORIES.KHAC;
};

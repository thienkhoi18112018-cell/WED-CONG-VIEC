export const YEAR_FILTER_OPTIONS = [
  { key: 'ALL', label: 'Tất cả các năm' },
  { key: '2026', label: 'Năm 2026' },
  { key: '2027', label: 'Năm 2027' },
  { key: 'OTHER', label: 'Các năm khác' },
];

/**
 * Extract integer year from a YYYY-MM-DD (or ISO) date string.
 */
export const getYearFromDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.trim().match(/^(\d{4})/);
  if (!match) return null;
  const parsed = parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Resolve the effective year of a project or design record,
 * preferring explicit `item.year` and falling back to `item.startDate`.
 */
export const getProjectYear = (item) => {
  if (!item) return null;
  if (item.year !== undefined && item.year !== null && item.year !== '') {
    const parsed = parseInt(item.year, 10);
    if (Number.isFinite(parsed) && parsed > 1900 && parsed < 3000) {
      return parsed;
    }
  }
  return getYearFromDate(item.startDate);
};

/**
 * Check whether an integer year matches a year filter key ('ALL' | '2026' | '2027' | 'OTHER').
 */
export const matchesYearFilter = (year, filterKey) => {
  if (!filterKey || filterKey === 'ALL') return true;
  if (filterKey === '2026') return year === 2026;
  if (filterKey === '2027') return year === 2027;
  if (filterKey === 'OTHER') return year !== 2026 && year !== 2027;
  return true;
};

export const getYearFilterLabel = (filterKey) => {
  const found = YEAR_FILTER_OPTIONS.find((opt) => opt.key === filterKey);
  return found ? found.label : 'Tất cả các năm';
};

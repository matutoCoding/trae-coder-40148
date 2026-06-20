export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getMonthDays = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

export const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month - 1, 1).getDay();
};

export const isSameDay = (date1: string, date2: string): boolean => {
  return formatDate(date1) === formatDate(date2);
};

export const isToday = (date: string): boolean => {
  return isSameDay(date, formatDate(new Date()));
};

export const addDays = (dateStr: string, days: number): string => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
};

export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const diffDays = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const isDateInRange = (date: string, startDate: string, endDate: string): boolean => {
  const d = new Date(date).getTime();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return d >= start && d <= end;
};

export const formatMoney = (amount: number): string => {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const getMonthName = (month: number): string => {
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  return months[month - 1] || '';
};

export const getWeekDayName = (day: number): string => {
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return days[day] || '';
};

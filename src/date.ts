const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (value: number) => String(value).padStart(2, '0');

export const formatLocalDate = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const formatLocalMonth = (date = new Date()) => formatLocalDate(date).slice(0, 7);

export const daysUntil = (dateString: string, today = new Date()) => {
  const [year, month, day] = dateString.split('-').map(Number);
  const targetUtc = Date.UTC(year, month - 1, day);
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((targetUtc - todayUtc) / DAY_MS);
};

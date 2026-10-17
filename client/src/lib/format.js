export const pkr = (n) => (n == null ? '—' : `PKR ${Math.round(n).toLocaleString('en-US')}`);

export const timePK = (iso) =>
  new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const datePK = (ymd) => {
  if (!ymd) return '—';
  const d = new Date(`${ymd}T00:00:00+05:00`);
  return isNaN(d) ? ymd : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' });
};

export const hasUrdu = (text) => /[؀-ۿ]/.test(text || '');

export const BILL_TYPE_LABEL = {
  electricity: 'Electricity bill',
  gas: 'Gas bill',
  water: 'Water bill',
  internet_phone: 'Internet / phone bill',
  fee_challan: 'Fee challan',
  government_challan: 'Government challan',
  other: 'Bill',
};

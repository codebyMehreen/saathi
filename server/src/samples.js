// Demo mode: when no GEMINI_API_KEY is set, the two sample bills (and a
// balance question) still work, with fixed answers that match what is printed
// on client/public/samples/*.svg. The page shows a "Demo mode" banner so this
// is never mistaken for the AI. With a key, the samples are read by Gemini
// like any other photo.

import { pkr } from './rules.js';

export const SAMPLE_BILLS = {
  electricity: {
    billerName: 'Chenab Electric Supply Co.',
    billType: 'electricity',
    reference: '07-13241-0567800',
    customerNameOnBill: 'Ayesha Raza',
    billingMonth: 'September 2026',
    dueDate: '2026-10-24',
    amountWithinDue: 8450,
    amountAfterDue: 9295,
  },
  challan: {
    billerName: 'Lyallpur Institute of Technology',
    billType: 'fee_challan',
    reference: '2026-0918-3374',
    customerNameOnBill: 'Ayesha Raza',
    billingMonth: 'Fall 2026 semester',
    dueDate: '2026-10-30',
    amountWithinDue: 85000,
    amountAfterDue: 86500,
  },
};

export function detectLanguage(text) {
  if (!text) return 'english';
  if (/[؀-ۿ]/.test(text)) return 'urdu';
  if (/\b(kar|karo|kardo|do|hai|ka|ki|ke|mera|meri|mujhe|ye|yeh|kitna|kya|bhai|jee|ji|shukriya)\b/i.test(text)) {
    return 'roman_urdu';
  }
  return 'english';
}

const REPLIES = {
  english: (b) => `I've read your ${b.billerName} bill. Please check the details below and tap Approve if they're right.`,
  roman_urdu: (b) => `Maine aap ka ${b.billerName} ka bill parh liya hai. Neeche details check kar ke Approve dabayein.`,
  urdu: (b) => `میں نے آپ کا ${b.billerName} کا بل پڑھ لیا ہے۔ نیچے تفصیل دیکھ کر منظور کریں دبائیں۔`,
};

const BALANCE = {
  english: (c) => `Your ${c.accountTitle} balance is ${pkr(c.balance)}.`,
  roman_urdu: (c) => `Aap ke ${c.accountTitle} mein ${pkr(c.balance)} hain.`,
  urdu: (c) => `آپ کے اکاؤنٹ میں ${pkr(c.balance)} موجود ہیں۔`,
};

export function sampleAnswer(sample, text, customer) {
  const language = detectLanguage(text);
  const bill = SAMPLE_BILLS[sample];
  if (bill) {
    return {
      language,
      intent: 'pay_bill',
      reply: REPLIES[language](bill),
      reason: `Demo mode: sample ${bill.billType.replace('_', ' ')} from ${bill.billerName}, ${pkr(bill.amountWithinDue)} due ${bill.dueDate}.`,
      bill: { ...bill },
      missing: [],
    };
  }
  if (!sample && text && /balance|بیلنس|paise|kitne/i.test(text)) {
    return {
      language,
      intent: 'balance',
      reply: BALANCE[language](customer),
      reason: 'Demo mode: customer asked for their balance.',
      bill: null,
      missing: [],
    };
  }
  return null;
}

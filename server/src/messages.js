// What Saathi tells the customer after a decision. Fixed wording, no AI call:
// status messages about money must say exactly what happened.

import { pkr as pkrPlain } from './rules.js';

// Inside Urdu (right-to-left) sentences, Latin text like "PKR 85,000" or a
// receipt number is wrapped in a left-to-right isolate so it doesn't scramble.
const ltr = (s) => `⁦${s}⁩`;
const pkr = pkrPlain;
const upkr = (n) => ltr(pkrPlain(n));

const T = {
  paid: {
    english: (p) => `Done. ${pkr(p.amount)} paid to ${p.billerName}. Receipt: ${p.receipt}.`,
    roman_urdu: (p) => `Ho gaya. ${p.billerName} ko ${pkr(p.amount)} ada kar diye gaye. Raseed: ${p.receipt}.`,
    urdu: (p) => `ادائیگی ہو گئی۔ ${ltr(p.billerName)} کو ${upkr(p.amount)} ادا کر دیے گئے۔ رسید: ${ltr(p.receipt)}`,
  },
  pending_review_daily: {
    english: (p) => `This would take you past today's self-approval limit, so I've sent ${pkr(p.amount)} to a bank officer. Nothing is paid until they approve.`,
    roman_urdu: (p) => `Is se aap aaj ki limit se aage nikal jayein ge, is liye ${pkr(p.amount)} bank officer ko review ke liye bhej diya hai. Un ki approval tak koi payment nahin hogi.`,
    urdu: (p) => `اس سے آپ آج کی حد سے آگے نکل جائیں گے، اس لیے ${upkr(p.amount)} بینک افسر کو جائزے کے لیے بھیج دیے ہیں۔ ان کی منظوری تک ادائیگی نہیں ہوگی۔`,
  },
  pending_review: {
    english: (p) => `${pkr(p.amount)} is above your self-approval limit, so I've sent it to a bank officer. Nothing is paid until they approve.`,
    roman_urdu: (p) => `${pkr(p.amount)} aap ki limit se zyada hai, is liye bank officer ko review ke liye bhej diya hai. Un ki approval tak koi payment nahin hogi.`,
    urdu: (p) => `${upkr(p.amount)} آپ کی حد سے زیادہ ہے، اس لیے بینک افسر کو جائزے کے لیے بھیج دیا ہے۔ ان کی منظوری تک ادائیگی نہیں ہوگی۔`,
  },
  rejected: {
    english: (p) => `The bank officer did not approve the ${pkr(p.amount)} payment to ${p.billerName}. Note: ${p.officerNote}`,
    roman_urdu: (p) => `Bank officer ne ${p.billerName} ki ${pkr(p.amount)} payment approve nahin ki. Note: ${p.officerNote}`,
    urdu: (p) => `بینک افسر نے ${ltr(p.billerName)} کی ${upkr(p.amount)} کی ادائیگی منظور نہیں کی۔ نوٹ: ${p.officerNote}`,
  },
  cancelled: {
    english: () => 'Cancelled. Nothing was paid.',
    roman_urdu: () => 'Cancel kar diya. Koi payment nahin hui.',
    urdu: () => 'منسوخ کر دیا۔ کوئی ادائیگی نہیں ہوئی۔',
  },
  error: {
    english: () => "Sorry, I couldn't reach my AI just now. Please try again in a moment. Nothing was prepared or paid.",
    roman_urdu: () => 'Maazrat, abhi AI se rabta nahin ho saka. Thori dair baad dobara koshish karein. Koi payment tayyar ya ada nahin hui.',
    urdu: () => 'معذرت، ابھی AI سے رابطہ نہیں ہو سکا۔ تھوڑی دیر بعد دوبارہ کوشش کریں۔ کوئی ادائیگی نہیں ہوئی۔',
  },
};

export function statusMessage(kind, payment, language = 'english') {
  const byLang = kind === 'pending_review' && payment?.routingKind === 'daily' ? T.pending_review_daily : T[kind];
  return (byLang[language] || byLang.english)(payment || {});
}

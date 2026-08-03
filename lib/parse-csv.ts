// Saf metin fonksiyonu — hem sunucuda (API route) hem tarayıcıda (toplu yükleme ekranı)
// kullanılır, bu yüzden Node'a veya DOM'a özel hiçbir şey içermez.
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  const clean = text.replace(/^﻿/, '');

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '"') {
      if (inQuotes && clean[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === ',' || ch === ';') && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(current.trim());
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      current = '';
    } else {
      current += ch;
    }
  }
  row.push(current.trim());
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

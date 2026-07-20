import type { LedgerResult } from '@/lib/ledger';

const tl = (n: number) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + ' \u20ba';
const d = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Istanbul' }).format(new Date(iso));
  } catch { return '-'; }
};
const esc = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildLedgerHtml(data: LedgerResult, opts?: { generatedFor?: string }): string {
  const { header, rows, summary, accountType } = data;
  const typeLabel = accountType === 'BUYER' ? 'Alıcı Cari Ekstresi' : accountType === 'SELLER' ? 'Satıcı Cari Ekstresi' : 'Platform Komisyon Ekstresi';

  let netColor = '#111';
  if (summary.netKind === 'debt') netColor = accountType === 'BUYER' ? '#b91c1c' : '#166534';
  else if (summary.netKind === 'credit') netColor = accountType === 'BUYER' ? '#166534' : '#b45309';

  const netSentence = accountType === 'BUYER'
    ? (summary.netKind === 'debt' ? `Bu alıcının <b>${tl(summary.netAbs)}</b> borcu var`
      : summary.netKind === 'credit' ? `Bu alıcıya <b>${tl(summary.netAbs)}</b> iade/avans borcumuz var`
      : 'Hesap kapalı — borç yok')
    : accountType === 'SELLER'
    ? (summary.netKind === 'debt' ? `Bu satıcıya <b>${tl(summary.netAbs)}</b> ödenecek`
      : summary.netKind === 'credit' ? `Bu satıcıdan <b>${tl(summary.netAbs)}</b> alacaklıyız`
      : 'Hesap kapalı — bakiye yok')
    : `Toplam komisyon geliri: <b>${tl(summary.totalAlacak)}</b>`;

  const rowsHtml = rows.map((r) => {
    const balColor = r.balance > 0 ? '#b91c1c' : r.balance < 0 ? '#166534' : '#111';
    return `<tr>
      <td>${d(r.date)}</td>
      <td><div class="desc">${esc(r.description)}</div>${r.sub ? `<div class="sub">${esc(r.sub)}</div>` : ''}${r.isManual ? '<span class="tag">Elle</span>' : ''}${r.isOverdue ? '<span class="tag over">Gecikmiş</span>' : ''}</td>
      <td class="num borc">${r.borc ? tl(r.borc) : ''}</td>
      <td class="num alacak">${r.alacak ? tl(r.alacak) : ''}</td>
      <td class="num" style="color:${balColor};font-weight:600">${tl(Math.abs(r.balance))} ${r.balance > 0 ? 'B' : r.balance < 0 ? 'A' : ''}</td>
    </tr>`;
  }).join('');

  const infoLines: string[] = [];
  if (header.name) infoLines.push(`<div><span>Hesap:</span> ${esc(header.name)}</div>`);
  if (header.contactName) infoLines.push(`<div><span>Yetkili:</span> ${esc(header.contactName)}</div>`);
  if (header.email) infoLines.push(`<div><span>E-posta:</span> ${esc(header.email)}</div>`);
  if (header.phone) infoLines.push(`<div><span>Telefon:</span> ${esc(header.phone)}</div>`);
  if (header.taxOffice || header.taxNumber) infoLines.push(`<div><span>Vergi:</span> ${esc(header.taxOffice || '')} ${esc(header.taxNumber || '')}</div>`);
  if (header.iban) infoLines.push(`<div><span>IBAN:</span> ${esc(header.iban)}</div>`);

  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"/>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; margin: 0; padding: 28px; font-size: 12px; }
    .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #d4af37; padding-bottom:14px; margin-bottom:16px; }
    .brand { font-size:22px; font-weight:800; letter-spacing:.5px; }
    .brand span { color:#d4af37; }
    .doc { text-align:right; }
    .doc .t { font-size:14px; font-weight:700; }
    .doc .dt { color:#666; font-size:11px; margin-top:4px; }
    .info { display:flex; flex-wrap:wrap; gap:6px 24px; background:#faf7ef; border:1px solid #eadfb8; border-radius:8px; padding:12px 14px; margin-bottom:14px; }
    .info div span { color:#888; }
    .net { background:#111; color:#fff; border-radius:10px; padding:16px 18px; margin-bottom:16px; }
    .net .lbl { font-size:11px; color:#d4af37; text-transform:uppercase; letter-spacing:1px; }
    .net .val { font-size:26px; margin-top:4px; color:${netColor === '#111' ? '#fff' : netColor}; }
    .cards { display:flex; gap:10px; margin-bottom:16px; }
    .card { flex:1; border:1px solid #eee; border-radius:8px; padding:10px 12px; }
    .card .k { color:#888; font-size:10px; text-transform:uppercase; }
    .card .v { font-size:15px; font-weight:700; margin-top:3px; }
    table { width:100%; border-collapse:collapse; }
    th { background:#111; color:#fff; text-align:left; padding:8px 10px; font-size:11px; }
    th.num, td.num { text-align:right; }
    td { padding:8px 10px; border-bottom:1px solid #eee; vertical-align:top; }
    .desc { font-weight:600; }
    .sub { color:#888; font-size:10px; margin-top:2px; }
    .num.borc { color:#b91c1c; }
    .num.alacak { color:#166534; }
    .tag { display:inline-block; background:#eef; color:#334; border-radius:4px; padding:1px 6px; font-size:9px; margin-top:4px; margin-right:4px; }
    .tag.over { background:#fee; color:#b91c1c; }
    tfoot td { border-top:2px solid #111; font-weight:700; }
    .foot { margin-top:22px; color:#999; font-size:10px; text-align:center; border-top:1px solid #eee; padding-top:10px; }
  </style></head><body>
  <div class="head">
    <div><div class="brand">Meza<span>thane</span></div><div style="color:#666;font-size:11px;margin-top:4px">Müzayede Platformu · mezathane.tr</div></div>
    <div class="doc"><div class="t">${typeLabel}</div><div class="dt">Düzenleme: ${d(new Date().toISOString())}</div></div>
  </div>
  <div class="info">${infoLines.join('')}</div>
  <div class="net"><div class="lbl">${esc(summary.netLabel)}</div><div class="val">${netSentence}</div></div>
  <div class="cards">
    <div class="card"><div class="k">Toplam Borç</div><div class="v" style="color:#b91c1c">${tl(summary.totalBorc)}</div></div>
    <div class="card"><div class="k">Toplam Alacak</div><div class="v" style="color:#166534">${tl(summary.totalAlacak)}</div></div>
    <div class="card"><div class="k">İşlem Sayısı</div><div class="v">${rows.length}</div></div>
  </div>
  <table>
    <thead><tr><th>Tarih</th><th>Açıklama</th><th class="num">Borç</th><th class="num">Alacak</th><th class="num">Bakiye</th></tr></thead>
    <tbody>${rowsHtml || '<tr><td colspan=5 style="text-align:center;color:#999;padding:24px">Henüz hareket yok</td></tr>'}</tbody>
    <tfoot><tr><td colspan=2>TOPLAM</td><td class="num borc">${tl(summary.totalBorc)}</td><td class="num alacak">${tl(summary.totalAlacak)}</td><td class="num">${tl(summary.netAbs)} ${summary.netBalance > 0 ? 'B' : summary.netBalance < 0 ? 'A' : ''}</td></tr></tfoot>
  </table>
  <div class="foot">Bu ekstre Mezathane sistemi tarafından otomatik oluşturulmuştur. B = Borç bakiyesi, A = Alacak bakiyesi.${opts?.generatedFor ? ' · ' + esc(opts.generatedFor) : ''}</div>
  </body></html>`;
}

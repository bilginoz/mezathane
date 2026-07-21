import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function htmlToPdfBuffer(
  html: string,
  options?: { margin?: { top?: string; bottom?: string; left?: string; right?: string } }
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: options?.margin?.top ?? '12mm',
        bottom: options?.margin?.bottom ?? '12mm',
        left: options?.margin?.left ?? '10mm',
        right: options?.margin?.right ?? '10mm',
      },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_SMTP_USER,
        pass: process.env.ZOHO_SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  senderName?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const info = await getTransporter().sendMail({
      from: `"${options.senderName ?? 'Mezathane.tr'}" <${process.env.ZOHO_SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
    });
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('SMTP send error:', error);
    return { success: false, error: error?.message };
  }
}

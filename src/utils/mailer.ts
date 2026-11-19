import nodemailer from 'nodemailer';
import { getDb } from '../db/initDb';

export async function getSmtpConfig() {
  try {
    const db = await getDb();
    const row = await db.get(`SELECT * FROM smtp_config WHERE id = 'default'`);
    return {
      host: row?.host || process.env.SMTP_HOST || 'mail.hosting.reg.ru',
      port: Number(row?.port || process.env.SMTP_PORT || '465'),
      user: row?.user || process.env.SMTP_USER || 'info@arenda-ropa.com',
      pass: row?.password || process.env.SMTP_PASSWORD || 'eV5?rW4?fEiP5*mC',
      senderName: row?.sender_name || process.env.SMTP_SENDER_NAME || 'ИИ Ревизор',
      senderEmail: row?.sender_email || process.env.SMTP_SENDER_EMAIL || 'info@arenda-ropa.com',
      resetSubject: row?.reset_subject || 'Восстановление пароля — ИИ Ревизор',
      resetTemplate: row?.reset_template || null,
      notificationTemplate: row?.notification_template || null
    };
  } catch (e) {
    return {
      host: process.env.SMTP_HOST || 'mail.hosting.reg.ru',
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      user: process.env.SMTP_USER || 'info@arenda-ropa.com',
      pass: process.env.SMTP_PASSWORD || 'eV5?rW4?fEiP5*mC',
      senderName: process.env.SMTP_SENDER_NAME || 'ИИ Ревизор',
      senderEmail: process.env.SMTP_SENDER_EMAIL || 'info@arenda-ropa.com',
      resetSubject: 'Восстановление пароля — ИИ Ревизор',
      resetTemplate: null,
      notificationTemplate: null
    };
  }
}

/**
  * Send Password Reset verification code to user email
  */
export async function sendPasswordResetEmail(recipientEmail: string, code: string, resetLink?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const cfg = await getSmtpConfig();

    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: {
        user: cfg.user,
        pass: cfg.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const defaultResetLinkButton = resetLink 
      ? `<div style="text-align: center; margin: 20px 0;">
          <a href="${resetLink}" target="_blank" style="background: linear-gradient(90deg, #F4EE8E 0%, #D99E41 100%); color: #0F0902; font-weight: bold; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 15px rgba(244, 238, 142, 0.3);">
            Нажмите здесь для сброса пароля →
          </a>
        </div>`
      : '';

    let htmlContent = cfg.resetTemplate || `
      <div style="font-family: Arial, sans-serif; background-color: #1A0F02; color: #FFFFFF; padding: 30px; border-radius: 16px; max-width: 500px; margin: 0 auto; border: 1px solid #E7C768;">
        <h2 style="color: #F4EE8E; margin-top: 0;">Восстановление пароля</h2>
        <p style="font-size: 14px; color: #E7C768;">Вы запросили сброс пароля в системе {SENDER_NAME} / RentRop.</p>
        
        {RESET_LINK_BUTTON}

        <p style="font-size: 13px; color: #E7C768; margin-top: 20px;">Или введите 6-значный код подтверждения вручную:</p>
        <div style="background-color: #140A01; border: 2px dashed #E7C768; padding: 15px; text-align: center; border-radius: 12px; margin: 15px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #F4EE8E;">{CODE}</span>
        </div>

        <p style="font-size: 12px; color: #A1A1AA;">Ссылка и код действительны в течение 15 минут. Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
        <hr style="border: 0; border-top: 1px solid rgba(231, 199, 104, 0.3); margin-top: 20px;" />
        <p style="font-size: 10px; color: #71717A; text-align: center;">© 2026 {SENDER_NAME}</p>
      </div>
    `;

    // Replace placeholders
    htmlContent = htmlContent
      .replace(/\{RESET_LINK_BUTTON\}/gi, defaultResetLinkButton)
      .replace(/\{RESET_LINK\}/gi, resetLink || '#')
      .replace(/\{CODE\}/gi, code)
      .replace(/\{SENDER_NAME\}/gi, cfg.senderName)
      .replace(/\{SENDER_EMAIL\}/gi, cfg.senderEmail)
      .replace(/\{HOST\}/gi, '')
      .replace(/mail\.hosting\.reg\.ru/gi, '');

    let subject = cfg.resetSubject || `Восстановление пароля — ${cfg.senderName}`;
    subject = subject.replace(/\{SENDER_NAME\}/gi, cfg.senderName)
      .replace(/\{HOST\}/gi, '')
      .replace(/mail\.hosting\.reg\.ru/gi, '');

    const mailOptions = {
      from: `"${cfg.senderName}" <${cfg.senderEmail}>`,
      to: recipientEmail,
      subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);

    // Save to PostgreSQL BD ProTalk smtp_sent_emails database
    try {
      const db = await getDb();
      await db.run(
        `INSERT INTO smtp_sent_emails (id, recipient, subject, body_preview, email_type, status, error_message, message_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          recipientEmail,
          subject,
          `Код: ${code}` + (resetLink ? ` | Ссылка: ${resetLink}` : ''),
          'reset_password',
          'sent',
          null,
          info.messageId || null,
          Date.now()
        ]
      );
    } catch (dbErr) {
      console.error('Error logging sent email to PostgreSQL BD ProTalk:', dbErr);
    }

    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error('SMTP Error sending password reset email:', err);

    // Save failed attempt to PostgreSQL BD ProTalk smtp_sent_emails database
    try {
      const db = await getDb();
      await db.run(
        `INSERT INTO smtp_sent_emails (id, recipient, subject, body_preview, email_type, status, error_message, message_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          recipientEmail,
          'Восстановление пароля',
          `Код: ${code}`,
          'reset_password',
          'failed',
          err.message || 'SMTP connection error',
          null,
          Date.now()
        ]
      );
    } catch (dbErr) {
      console.error('Error logging failed email to PostgreSQL BD ProTalk:', dbErr);
    }

    return { success: false, error: err.message || 'Ошибка отправки через SMTP' };
  }
}

/**
 * Send System Notification email
 */
export async function sendSystemNotificationEmail(recipientEmail: string, subject: string, bodyText: string) {
  try {
    const cfg = await getSmtpConfig();

    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: {
        user: cfg.user,
        pass: cfg.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    let htmlContent = cfg.notificationTemplate || `
      <div style="font-family: Arial, sans-serif; background-color: #1A0F02; color: #FFFFFF; padding: 25px; border-radius: 12px; max-width: 550px; border: 1px solid #E7C768;">
        <h3 style="color: #F4EE8E;">{SUBJECT}</h3>
        <p style="font-size: 14px; line-height: 1.6; color: #F4EE8E;">${bodyText}</p>
        <hr style="border: 0; border-top: 1px solid rgba(231, 199, 104, 0.3); margin-top: 20px;" />
        <p style="font-size: 10px; color: #71717A;">{SENDER_NAME} / {SENDER_EMAIL}</p>
      </div>
    `;

    htmlContent = htmlContent
      .replace(/\{SUBJECT\}/gi, subject)
      .replace(/\{BODY_TEXT\}/gi, bodyText)
      .replace(/\{SENDER_NAME\}/gi, cfg.senderName)
      .replace(/\{SENDER_EMAIL\}/gi, cfg.senderEmail)
      .replace(/\{HOST\}/gi, '')
      .replace(/mail\.hosting\.reg\.ru/gi, '');

    const mailOptions = {
      from: `"${cfg.senderName}" <${cfg.senderEmail}>`,
      to: recipientEmail,
      subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);

    // Save to PostgreSQL BD ProTalk smtp_sent_emails and system_notifications_log databases
    try {
      const db = await getDb();
      const now = Date.now();
      await db.run(
        `INSERT INTO smtp_sent_emails (id, recipient, subject, body_preview, email_type, status, error_message, message_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'msg_' + now + '_' + Math.random().toString(36).substr(2, 5),
          recipientEmail,
          subject,
          bodyText,
          'system_notification',
          'sent',
          null,
          info.messageId || null,
          now
        ]
      );

      await db.run(
        `INSERT INTO system_notifications_log (id, user_id, recipient_email, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'notif_' + now + '_' + Math.random().toString(36).substr(2, 5),
          null,
          recipientEmail,
          subject,
          bodyText,
          'system',
          0,
          now
        ]
      );
    } catch (dbErr) {
      console.error('Error logging notification to PostgreSQL BD ProTalk:', dbErr);
    }

    return info;
  } catch (err: any) {
    console.warn('System Notification Email failed:', err.message);

    // Save failed notification to PostgreSQL BD ProTalk databases
    try {
      const db = await getDb();
      const now = Date.now();
      await db.run(
        `INSERT INTO smtp_sent_emails (id, recipient, subject, body_preview, email_type, status, error_message, message_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'msg_' + now + '_' + Math.random().toString(36).substr(2, 5),
          recipientEmail,
          subject,
          bodyText,
          'system_notification',
          'failed',
          err.message || 'SMTP Error',
          null,
          now
        ]
      );
    } catch (dbErr) {
      console.error('Error logging failed notification:', dbErr);
    }
  }
}

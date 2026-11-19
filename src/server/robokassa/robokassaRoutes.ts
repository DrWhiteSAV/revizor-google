import { Router, Request, Response } from 'express';
import { getDb } from '../../db/initDb';
import {
  getRobokassaConfigForDomain,
  getNextInvoiceId,
  cleanDomain
} from './robokassaConfig';
import {
  generateRobokassaPaymentUrl,
  verifyResultSignature
} from './robokassaService';
import { sendTelegramMessage, getTelegramBotConfig } from '../telegram';

export const robokassaRouter = Router();

/**
 * Creates a direct Robokassa payment link based on domain, user, and items.
 */
robokassaRouter.post('/create-link', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      amount,
      itemType = 'topup',
      productName,
      months = 1,
      employeesCount = 10,
      domain: clientDomain,
      isRecurring = false,
      userEmail: clientEmail
    } = req.body || {};

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Некорректная сумма платежа' });
    }

    if (!userId) {
      return res.status(400).json({ success: false, error: 'Пользователь не авторизован' });
    }

    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE id = $1', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }

    // Determine current domain strictly from client or request host
    const effectiveDomain = clientDomain || req.get('host') || 'ii-rr.ru';
    const config = await getRobokassaConfigForDomain(effectiveDomain);

    const invId = await getNextInvoiceId();
    const paymentId = `pay_${invId}_${Date.now()}`;
    const userEmail = clientEmail || user.email || '';

    // Generate direct Robokassa URL with 54-FZ receipt and signature
    const paymentData = generateRobokassaPaymentUrl({
      config,
      invId,
      amount: numAmount,
      itemType: itemType === 'tariff' ? 'tariff' : 'topup',
      productName,
      months: Number(months) || 1,
      employeesCount: Number(employeesCount) || 10,
      userId,
      userEmail,
      isRecurring: Boolean(isRecurring)
    });

    // Save pending payment record in DB
    await db.run(
      `INSERT INTO payments (
        id, inv_id, user_id, domain, merchant_login, amount, item_type, product_label,
        months, employees_count, status, receipt_json, recurring_enabled, payment_url, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', $11, $12, $13, CURRENT_TIMESTAMP
      )`,
      [
        paymentId,
        invId,
        userId,
        config.domain,
        config.merchant_login,
        numAmount,
        itemType,
        productName || (itemType === 'tariff' ? 'Тариф ИИ Ревизор' : 'Виртуальная валюта RR'),
        Number(months) || 1,
        Number(employeesCount) || 10,
        paymentData.receiptJson,
        isRecurring ? 1 : 0,
        paymentData.paymentUrl
      ]
    );

    return res.json({
      success: true,
      paymentUrl: paymentData.paymentUrl,
      invId,
      outSum: paymentData.outSum,
      domain: config.domain,
      merchantLogin: config.merchant_login
    });
  } catch (err: any) {
    console.error('Error in /api/payments/robokassa/create-link:', err);
    return res.status(500).json({ success: false, error: err.message || 'Ошибка генерации ссылки на оплату' });
  }
});

/**
 * Robokassa Server Notification Result URL handler (POST & GET supported)
 * Verifies signature with Password 2, updates DB, credits balance / activates tariff,
 * and replies with OK{InvId}.
 */
const handleResultCallback = async (req: Request, res: Response) => {
  try {
    const params = { ...req.query, ...req.body };
    const outSum = String(params.OutSum || params.out_sum || '');
    const invId = String(params.InvId || params.inv_id || '');
    const receivedSignature = String(params.SignatureValue || params.signature || '');

    if (!outSum || !invId || !receivedSignature) {
      console.warn('Robokassa callback missing required parameters:', params);
      return res.status(400).send('bad request: missing parameters');
    }

    // Extract custom Shp_ parameters
    const shpParams: Record<string, string | number> = {};
    for (const key of Object.keys(params)) {
      if (key.startsWith('Shp_') || key.startsWith('shp_')) {
        const canonicalKey = 'Shp_' + key.substring(4);
        shpParams[canonicalKey] = params[key];
      }
    }

    // Resolve domain from custom parameter or host header
    const domainFromShp = shpParams['Shp_domain'] ? String(shpParams['Shp_domain']) : '';
    const hostHeader = req.get('host') || '';
    const config = await getRobokassaConfigForDomain(domainFromShp || hostHeader);

    // Verify Password 2 signature
    const isValidSignature = verifyResultSignature({
      outSum,
      invId,
      receivedSignature,
      password2: config.password_2,
      shpParams
    });

    if (!isValidSignature) {
      console.error(`Robokassa signature verification failed for InvId=${invId}, OutSum=${outSum}`);
      return res.status(400).send('bad sign');
    }

    const db = await getDb();
    const payment = await db.get('SELECT * FROM payments WHERE inv_id = $1', [Number(invId)]);

    if (!payment) {
      console.error(`Payment record for InvId=${invId} not found in database.`);
      // Return OK so Robokassa doesn't continuously re-deliver if payment was registered outside
      return res.send(`OK${invId}`);
    }

    // If already marked PAID, return OK immediately
    if (payment.status === 'PAID') {
      return res.send(`OK${invId}`);
    }

    const paidAmount = Number(outSum) || Number(payment.amount);
    const userId = payment.user_id;
    const user = await db.get('SELECT * FROM users WHERE id = $1', [userId]);

    // Update payment record to PAID
    await db.run(
      `UPDATE payments SET 
        status = 'PAID', 
        paid_at = CURRENT_TIMESTAMP,
        robokassa_op_id = $1,
        updated_at = CURRENT_TIMESTAMP 
      WHERE inv_id = $2`,
      [params.PaymentId || params.OpKey || 'online', Number(invId)]
    );

    if (payment.item_type === 'tariff') {
      // Tariff subscription activation
      const months = Number(payment.months) || 1;
      const employees = Number(payment.employees_count) || 10;
      const isRaport = (payment.product_label || '').toLowerCase().includes('рапорт');

      const now = new Date();
      now.setMonth(now.getMonth() + months);
      const paidUntil = now.toISOString().split('T')[0];

      if (isRaport) {
        await db.run(
          `UPDATE users SET 
            recruiter_paid_until = $1, 
            recruiter_seats = GREATEST(recruiter_seats, $2)
           WHERE id = $3`,
          [paidUntil, employees, userId]
        );
      } else {
        await db.run(
          `UPDATE users SET 
            revizor_paid_until = $1, 
            revizor_seats = GREATEST(revizor_seats, $2)
           WHERE id = $3`,
          [paidUntil, employees, userId]
        );
      }

      // Record transaction
      const txId = `tx_tariff_${invId}_${Date.now()}`;
      await db.run(
        `INSERT INTO transactions (
          id, user_id, amount_rr, amount_rub, type, status, description, created_at
        ) VALUES (
          $1, $2, $3, $4, 'PURCHASE', 'completed', $5, CURRENT_TIMESTAMP
        )`,
        [
          txId,
          userId,
          paidAmount,
          paidAmount,
          `Оплата подписки «${payment.product_label}» на ${months} мес. через Робокассу (Счет #${invId})`
        ]
      );
    } else {
      // Pure RR virtual currency token top-up
      const currentBalance = Number(user?.payment_balance) || 0;
      const nextBalance = currentBalance + paidAmount;

      await db.run(
        `UPDATE users SET payment_balance = $1 WHERE id = $2`,
        [nextBalance, userId]
      );

      // Record transaction
      const txId = `tx_topup_${invId}_${Date.now()}`;
      await db.run(
        `INSERT INTO transactions (
          id, user_id, amount_rr, amount_rub, type, status, description, created_at
        ) VALUES (
          $1, $2, $3, $4, 'TOPUP', 'completed', $5, CURRENT_TIMESTAMP
        )`,
        [
          txId,
          userId,
          paidAmount,
          paidAmount,
          `Пополнение счета на ${paidAmount} RR через Робокассу (Счет #${invId})`
        ]
      );
    }

    // Send Telegram alert
    try {
      const tgConfig = await getTelegramBotConfig();
      await sendTelegramMessage({
        chatId: tgConfig.adminTelegramId || '169262990',
        text: `💳 <b>Успешная оплата Робокасса</b>\n` +
          `• <b>Счет:</b> #${invId}\n` +
          `• <b>Сумма:</b> ${paidAmount.toLocaleString('ru-RU')} RR\n` +
          `• <b>Домен:</b> ${config.domain}\n` +
          `• <b>Тип:</b> ${payment.item_type === 'tariff' ? 'Тариф ' + payment.product_label : 'Пополнение баланса'}\n` +
          `• <b>Клиент:</b> ${user?.name || user?.email || userId}`
      });
    } catch (e) {
      // non-fatal
    }

    console.log(`✅ Robokassa payment #${invId} successfully confirmed and credited.`);
    return res.send(`OK${invId}`);
  } catch (err: any) {
    console.error('Error handling Robokassa result callback:', err);
    return res.status(500).send('internal error');
  }
};

robokassaRouter.post('/result', handleResultCallback);
robokassaRouter.get('/result', handleResultCallback);

/**
 * Log persistent user consent history for recurring payments and legal agreements
 */
robokassaRouter.post('/consent', async (req: Request, res: Response) => {
  try {
    const { userId, consentType = 'recurring_payments', domain, metadata } = req.body || {};
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const db = await getDb();
    const id = `cst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    await db.run(
      `INSERT INTO user_consents (
        id, user_id, consent_type, domain, ip_address, user_agent, metadata, agreed_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP
      )`,
      [
        id,
        userId,
        consentType,
        domain || cleanDomain(req.get('host')),
        String(ip),
        String(userAgent),
        typeof metadata === 'object' ? JSON.stringify(metadata) : (metadata || null)
      ]
    );

    return res.json({ success: true, consentId: id });
  } catch (err: any) {
    console.error('Error logging user consent:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Check payment status by invoice ID
 */
robokassaRouter.get('/status/:invId', async (req: Request, res: Response) => {
  try {
    const { invId } = req.params;
    const db = await getDb();
    const payment = await db.get('SELECT * FROM payments WHERE inv_id = $1', [Number(invId)]);

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Платеж не найден' });
    }

    return res.json({
      success: true,
      status: payment.status,
      amount: Number(payment.amount),
      paidAt: payment.paid_at,
      itemType: payment.item_type
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Public route to get shop parameters for active domain
 */
robokassaRouter.get('/config', async (req: Request, res: Response) => {
  try {
    const host = req.query.domain ? String(req.query.domain) : (req.get('host') || 'ii-rr.ru');
    const config = await getRobokassaConfigForDomain(host);

    return res.json({
      success: true,
      domain: config.domain,
      merchantLogin: config.merchant_login,
      resultUrl: config.result_url,
      successUrl: config.success_url,
      failUrl: config.fail_url,
      hashAlgo: config.hash_algo
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

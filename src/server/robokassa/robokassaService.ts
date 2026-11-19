import crypto from 'crypto';
import { RobokassaConfig } from './robokassaConfig';

export interface CreatePaymentParams {
  config: RobokassaConfig;
  invId: number;
  amount: number;
  itemType: 'topup' | 'tariff';
  productName?: string;
  months?: number;
  employeesCount?: number;
  userId: string;
  userEmail?: string;
  isRecurring?: boolean;
}

export interface PaymentUrlResult {
  paymentUrl: string;
  invId: number;
  signature: string;
  receiptJson: string;
  outSum: string;
  description: string;
}

/**
 * Builds the Fiscal 54-FZ Receipt JSON object according to the exact Robokassa nomenclature requirements
 * from the contract-oferta and Russian law (vat5 under OSN taxation for tariffs, null tax for virtual currency RR).
 */
export function buildReceiptJson(params: {
  itemType: 'topup' | 'tariff';
  amount: number;
  productName?: string;
  months?: number;
}): string {
  const isTariff = params.itemType === 'tariff';
  const outSum = Number(params.amount.toFixed(2));

  let itemName = 'Виртуальная валюта RR (RentRop Token)';
  let quantity = Math.round(params.amount);
  let tax: string | null = null; // Tax null for pure RR virtual currency token top-up

  if (isTariff) {
    itemName = params.productName || 'Подписка на тариф «ИИ Ревизор»';
    quantity = Math.max(1, params.months || 1);
    tax = 'vat5'; // 5% VAT under OSN taxation according to Oferta
  }

  const receipt = {
    items: [
      {
        name: itemName,
        quantity: quantity,
        sum: outSum,
        tax: tax
      }
    ]
  };

  return JSON.stringify(receipt);
}

/**
 * Formats Shp_ custom parameters into sorted string for Robokassa signature calculation:
 * e.g. "Shp_item=tariff:Shp_months=1:Shp_user=123"
 */
export function buildSortedShpString(shpParams: Record<string, string | number>): string {
  const keys = Object.keys(shpParams)
    .filter((k) => k.startsWith('Shp_'))
    .sort();

  return keys.map((k) => `${k}=${shpParams[k]}`).join(':');
}

/**
 * Computes MD5 signature for payment link initiation:
 * Formula: md5(MerchantLogin:OutSum:InvId:Receipt:Password1:Shp_...)
 * Note: Receipt must be raw unencoded JSON string inside the hash calculation!
 */
export function calculatePaymentSignature(params: {
  merchantLogin: string;
  outSum: string;
  invId: number;
  receiptJson: string;
  password1: string;
  shpParams?: Record<string, string | number>;
}): string {
  const { merchantLogin, outSum, invId, receiptJson, password1, shpParams = {} } = params;
  const sortedShp = buildSortedShpString(shpParams);

  let rawString = `${merchantLogin}:${outSum}:${invId}:${receiptJson}:${password1}`;
  if (sortedShp) {
    rawString += `:${sortedShp}`;
  }

  return crypto.createHash('md5').update(rawString, 'utf8').digest('hex');
}

/**
 * Generates the full redirect URL to Robokassa payment gateway (https://auth.robokassa.ru/Merchant/Index.aspx)
 */
export function generateRobokassaPaymentUrl(params: CreatePaymentParams): PaymentUrlResult {
  const {
    config,
    invId,
    amount,
    itemType,
    productName,
    months = 1,
    employeesCount = 10,
    userId,
    userEmail,
    isRecurring = false
  } = params;

  const outSum = amount.toFixed(2);
  const receiptJson = buildReceiptJson({
    itemType,
    amount,
    productName,
    months
  });

  const isTariff = itemType === 'tariff';
  const description = isTariff
    ? `${productName || 'Тариф ИИ Ревизор'} на ${months} мес. (${employeesCount} сотр.)`
    : `Пополнение счета на ${Math.round(amount)} RR`;

  // Custom parameters to pass through Robokassa
  const shpParams: Record<string, string | number> = {
    Shp_domain: config.domain,
    Shp_item: itemType,
    Shp_months: months,
    Shp_user: userId
  };

  if (isRecurring) {
    shpParams['Shp_recurring'] = '1';
  }

  const signature = calculatePaymentSignature({
    merchantLogin: config.merchant_login,
    outSum,
    invId,
    receiptJson,
    password1: config.password_1,
    shpParams
  });

  const queryParams = new URLSearchParams();
  queryParams.set('MerchantLogin', config.merchant_login);
  queryParams.set('OutSum', outSum);
  queryParams.set('InvId', String(invId));
  queryParams.set('Description', description);
  queryParams.set('SignatureValue', signature);
  queryParams.set('Receipt', receiptJson); // URLSearchParams automatically encodes this once as required
  queryParams.set('Culture', 'ru');

  if (userEmail) {
    queryParams.set('Email', userEmail);
  }

  if (isRecurring) {
    queryParams.set('Recurring', 'true');
  }

  // Append sorted custom Shp_ params
  const keys = Object.keys(shpParams).sort();
  for (const k of keys) {
    queryParams.set(k, String(shpParams[k]));
  }

  const paymentUrl = `https://auth.robokassa.ru/Merchant/Index.aspx?${queryParams.toString()}`;

  return {
    paymentUrl,
    invId,
    signature,
    receiptJson,
    outSum,
    description
  };
}

/**
 * Verifies server-to-server callback on Result URL (Password 2):
 * Standard Robokassa formula: md5(OutSum:InvId:Password2:Shp_...)
 */
export function verifyResultSignature(params: {
  outSum: string;
  invId: string | number;
  receivedSignature: string;
  password2: string;
  shpParams?: Record<string, string | number>;
}): boolean {
  const { outSum, invId, receivedSignature, password2, shpParams = {} } = params;
  const sortedShp = buildSortedShpString(shpParams);

  let rawString = `${outSum}:${invId}:${password2}`;
  if (sortedShp) {
    rawString += `:${sortedShp}`;
  }

  const expectedSignature = crypto.createHash('md5').update(rawString, 'utf8').digest('hex');
  return expectedSignature.toLowerCase() === (receivedSignature || '').toLowerCase();
}

/**
 * Verifies client return redirect on Success URL (Password 1):
 * Standard Robokassa formula: md5(OutSum:InvId:Password1:Shp_...)
 */
export function verifySuccessSignature(params: {
  outSum: string;
  invId: string | number;
  receivedSignature: string;
  password1: string;
  shpParams?: Record<string, string | number>;
}): boolean {
  const { outSum, invId, receivedSignature, password1, shpParams = {} } = params;
  const sortedShp = buildSortedShpString(shpParams);

  let rawString = `${outSum}:${invId}:${password1}`;
  if (sortedShp) {
    rawString += `:${sortedShp}`;
  }

  const expectedSignature = crypto.createHash('md5').update(rawString, 'utf8').digest('hex');
  return expectedSignature.toLowerCase() === (receivedSignature || '').toLowerCase();
}

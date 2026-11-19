import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, RefreshCw, HelpCircle, Shield } from 'lucide-react';

interface PaymentFailPageProps {
  onNavigate?: (path: string) => void;
}

export default function PaymentFailPage({ onNavigate }: PaymentFailPageProps) {
  const [invId, setInvId] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setInvId(params.get('InvId') || params.get('inv_id') || '');
    }
  }, []);

  const handleReturnToTariff = () => {
    if (onNavigate) {
      onNavigate('/cabinet');
    } else {
      window.location.href = '/cabinet';
    }
  };

  return (
    <div className="w-full min-h-screen text-amber-100/90 bg-[#140A01] font-sans selection:bg-[#E7C768] selection:text-amber-950 px-4 sm:px-6 py-16 flex items-center justify-center relative overflow-hidden" id="payment-fail-root">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.06),transparent_70%)]" />

      <div className="relative z-10 w-full max-w-lg bg-[#1A0F02]/90 backdrop-blur-xl border-2 border-amber-400/50 rounded-3xl p-6 sm:p-10 text-center space-y-6 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        {/* Cancel Icon */}
        <div className="w-20 h-20 rounded-full bg-amber-400/10 border-2 border-amber-400/50 flex items-center justify-center mx-auto text-[#E7C768] shadow-[0_0_25px_rgba(231,199,104,0.2)]">
          <AlertCircle size={44} className="text-[#E7C768]" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-[#F4EE8E] text-xs font-mono font-bold">
            <span>Операция отменена</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Оплата не была завершена
          </h1>

          <p className="text-sm text-amber-200/80 leading-relaxed">
            Платеж был прерван пользователем либо отклонен банком-эмитентом карты. Средства с вашей карты списаны не были. Вы можете повторить операцию в любое удобное время.
          </p>
        </div>

        {invId && (
          <div className="p-3 rounded-xl bg-black/40 border border-amber-400/30 text-xs font-mono text-amber-200/80">
            Идентификатор отмененного счета: #{invId}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={handleReturnToTariff}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] hover:brightness-110 text-amber-950 font-black text-sm tracking-wide shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw size={17} />
            <span>Вернуться к тарифам и балансу</span>
          </button>

          <a
            href="mailto:info@arenda-ropa.com"
            className="inline-flex items-center justify-center gap-1.5 text-xs text-[#E7C768] hover:underline pt-1"
          >
            <HelpCircle size={14} />
            <span>Написать в службу поддержки: info@arenda-ropa.com</span>
          </a>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight, ShieldCheck, FileText, Sparkles } from 'lucide-react';

interface PaymentSuccessPageProps {
  onNavigate?: (path: string) => void;
}

export default function PaymentSuccessPage({ onNavigate }: PaymentSuccessPageProps) {
  const [invId, setInvId] = useState<string>('');
  const [outSum, setOutSum] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setInvId(params.get('InvId') || params.get('inv_id') || '');
      setOutSum(params.get('OutSum') || params.get('out_sum') || '');
    }
  }, []);

  const handleGoCabinet = () => {
    if (onNavigate) {
      onNavigate('/cabinet');
    } else {
      window.location.href = '/cabinet';
    }
  };

  return (
    <div className="w-full min-h-screen text-amber-100/90 bg-[#140A01] font-sans selection:bg-[#E7C768] selection:text-amber-950 px-4 sm:px-6 py-16 flex items-center justify-center relative overflow-hidden" id="payment-success-root">
      {/* Golden glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(244,238,142,0.1),transparent_70%)]" />

      <div className="relative z-10 w-full max-w-lg bg-[#1A0F02]/90 backdrop-blur-xl border-2 border-amber-400/60 rounded-3xl p-6 sm:p-10 text-center space-y-6 shadow-[0_0_60px_rgba(244,238,142,0.25)]">
        {/* Success Icon */}
        <div className="w-20 h-20 rounded-full bg-amber-400/15 border-2 border-amber-400/80 flex items-center justify-center mx-auto text-[#F4EE8E] shadow-[0_0_30px_rgba(244,238,142,0.4)] animate-bounce">
          <CheckCircle2 size={44} className="text-[#F4EE8E]" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-[#F4EE8E] text-xs font-mono font-bold">
            <Sparkles size={13} />
            <span>Платеж подтвержден Робокассой</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Оплата успешно принята!
          </h1>

          <p className="text-sm text-amber-200/80 leading-relaxed">
            Средства поступили на ваш расчетный баланс RR, либо активирована выбранная подписка. Электронный чек 54-ФЗ с НДС 5% направлен на вашу электронную почту.
          </p>
        </div>

        {/* Invoice Summary Box */}
        {(invId || outSum) && (
          <div className="p-4 rounded-2xl bg-black/40 border border-amber-400/30 text-sm space-y-2 text-left font-mono">
            {invId && (
              <div className="flex justify-between items-center text-amber-200/90">
                <span>Номер счета:</span>
                <span className="font-bold text-[#F4EE8E]">#{invId}</span>
              </div>
            )}
            {outSum && (
              <div className="flex justify-between items-center text-amber-200/90 border-t border-amber-500/20 pt-2">
                <span>Сумма к зачислению:</span>
                <span className="font-bold text-[#F4EE8E] text-base">{Number(outSum).toLocaleString('ru-RU')} RR</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={handleGoCabinet}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] hover:brightness-110 text-amber-950 font-black text-sm tracking-wide shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Перейти в личный кабинет</span>
            <ArrowRight size={17} />
          </button>

          <a
            href="/oferta"
            className="inline-flex items-center justify-center gap-1.5 text-xs text-[#E7C768] hover:underline pt-1"
          >
            <ShieldCheck size={14} />
            <span>Условия оферты и регламент обслуживания</span>
          </a>
        </div>
      </div>
    </div>
  );
}

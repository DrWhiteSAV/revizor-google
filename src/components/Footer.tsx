import React from 'react';
import { ExternalLink, Shield } from 'lucide-react';
import { useAppVersion } from '../hooks/useAppVersion';

interface FooterProps {
  onNavigate: (path: string) => void;
}

interface ProductLink {
  title: string;
  url: string;
  isPrimary?: boolean;
}

const PRODUCT_LINKS: ProductLink[] = [
  { title: 'Робот Рекрутер', url: 'https://hr-rr.ru/' },
  { title: 'ИИ Ревизор', url: 'https://ii-rr.ru/' },
  { title: 'ИИSMM', url: 'https://iismm.ru/' },
  { title: 'ИИ-Викторины', url: 'https://qaiz.ru/' },
  { title: 'АлхимИИ', url: 'https://aihim.ru/' },
  { title: 'AI РОП', url: 'https://rent-rop.com/ii-dlya-otdela-prodazh/' },
  { title: 'Про Нейросети', url: 'https://t.me/SAV_AI' },
  { title: 'Продукт компании РентРоп', url: 'https://rent-rop.com/', isPrimary: true },
  { title: 'Связь с Dr.White', url: 'https://t.me/+Qr9hu55w7tEwNjZi', isPrimary: true }
];

export default function Footer({ onNavigate }: FooterProps) {
  const appVersion = useAppVersion();

  return (
    <footer className="w-full text-slate-300 py-10 px-4 sm:px-6 bg-transparent rounded-t-[24px] relative overflow-hidden" id="app-footer">
      {/* 100% Transparent Footer Golden Glowing Border */}
      <div className="footer-glow-container">
        <div className="footer-glow-shadow" />
        <div className="footer-glow-border" />
      </div>

      <div className="mx-auto max-w-7xl relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          
          {/* Logo & Platform Info */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <img 
                src="/file/36/rr-logo.png" 
                alt="RR Logo" 
                className="w-8 h-8 object-contain"
              />
              <span className="font-extrabold text-[#F4EE8E] text-base tracking-wide font-sans">ИИ Ревизор RR</span>
              
              {/* Dynamic App Version Badge */}
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-400/15 border border-amber-400/40 text-[#F4EE8E] shadow-[0_0_12px_rgba(244,238,142,0.25)]">
                {appVersion}
              </span>
            </div>
            <p className="text-sm text-slate-300/90 leading-relaxed font-sans">
              Умное ИИ-управление проектами и задачами с верификацией результатов и встроенной отчетностью ИИ Рапорт.
            </p>
          </div>

          {/* Operator Requisites */}
          <div className="flex flex-col gap-2.5 text-sm font-sans p-5 rounded-2xl border border-amber-400/40 bg-[#1A0F02]/70 dark:bg-[#1A0F02]/70 backdrop-blur-md shadow-[0_0_20px_rgba(244,238,142,0.1)]">
            <h5 className="font-bold text-[#F4EE8E] text-sm">Реквизиты оператора</h5>
            <p className="font-bold text-slate-200">ООО «РентРоп»</p>
            <p className="text-slate-300/80 leading-relaxed text-sm">
              Юридический адрес: 115191, г. Москва, пер. Духовской, д. 17, стр. 15, помещ. 11Н/2<br />
              ОГРН: 1217700234157 · ИНН: 7726477438
            </p>
            <p className="text-slate-300/80 text-sm mt-0.5">
              Электронная почта: <a href="mailto:info@arenda-ropa.com" className="text-[#E7C768] hover:underline">info@arenda-ropa.com</a>
            </p>
            <button 
              onClick={() => onNavigate('/oferta')}
              className="text-[#E7C768] hover:underline text-sm text-left mt-1 cursor-pointer flex items-center gap-1.5 font-sans"
            >
              <Shield size={15} />
              <span>Публичная оферта сервиса</span>
            </button>
          </div>

          {/* Ecosystem Products & Contacts Grid */}
          <div className="flex flex-col gap-3 w-full p-5 rounded-2xl border border-amber-400/40 bg-[#1A0F02]/70 dark:bg-[#1A0F02]/70 backdrop-blur-md shadow-[0_0_20px_rgba(244,238,142,0.1)]">
            <h5 className="font-bold text-[#F4EE8E] text-sm">Продукты экосистемы</h5>
            
            {/* Mobile-adaptive Flex-wrap container: buttons wrap, button text never clips */}
            <div className="flex flex-wrap items-center gap-2.5 w-full">
              {PRODUCT_LINKS.map((prod) => (
                <a
                  key={prod.url}
                  href={prod.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer shrink-0 ${
                    prod.isPrimary
                      ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-zinc-950 hover:brightness-110 shadow-amber-500/20'
                      : 'bg-zinc-900/80 hover:bg-zinc-800/90 text-[#F4EE8E] border border-amber-400/40 hover:border-amber-400/70'
                  }`}
                >
                  <span className="whitespace-nowrap select-none">{prod.title}</span>
                  <ExternalLink size={13} className={prod.isPrimary ? 'text-zinc-950 shrink-0' : 'text-[#E7C768] shrink-0'} />
                </a>
              ))}
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}

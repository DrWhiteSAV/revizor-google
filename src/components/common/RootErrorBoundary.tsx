import React, { Component, type ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class RootErrorBoundary extends Component<Props, State> {
  declare readonly props: Readonly<Props>;
  public state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: any): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Временный сбой загрузки или превышен лимит запросов'
    };
  }

  componentDidCatch(error: any, info: any) {
    console.error('[RootErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isLight =
      typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light');

    return (
      <div
        className={`min-h-screen w-full flex items-center justify-center p-4 font-sans ${
          isLight ? 'bg-[#FFFBF5] text-amber-950' : 'bg-[#140A01] text-amber-50'
        }`}
      >
        <div
          className={`w-full max-w-md rounded-3xl border p-6 space-y-4 backdrop-blur-xl ${
            isLight
              ? 'bg-transparent border-amber-900/40 text-amber-950 shadow-xl'
              : 'bg-transparent border-amber-400/50 text-amber-50 shadow-[0_0_30px_rgba(244,238,142,0.25)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shrink-0">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-snug">Соединение временно прервано</h2>
              <p className="text-sm opacity-80">Интерфейс защищен от белой страницы</p>
            </div>
          </div>

          <p className="text-sm leading-relaxed break-words opacity-90">
            {this.state.errorMessage}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold text-sm border border-amber-300/80 hover:brightness-105 cursor-pointer flex items-center justify-center gap-2 shadow-md"
          >
            <RefreshCw size={16} />
            <span>Обновить страницу</span>
          </button>
        </div>
      </div>
    );
  }
}

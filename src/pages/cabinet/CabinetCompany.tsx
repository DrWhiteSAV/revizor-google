import React, { useState } from 'react';
import { Sparkles, AlertCircle, Bot, Save, CheckCircle2, Building, Globe } from 'lucide-react';
import { CompanyInfo } from '../../types';
import { AiLoadingOverlay } from '../../components/common/AiLoadingOverlay';

interface CabinetCompanyProps {
  company: CompanyInfo;
  setCompany: (val: CompanyInfo) => void;
  improveFieldWithAI: (fieldKey: 'name' | 'productDescription' | 'workSystemDescription', text: string) => void;
  saveStateToServer?: (updatedState: any) => void;
}

export default function CabinetCompany({
  company,
  setCompany,
  improveFieldWithAI,
  saveStateToServer
}: CabinetCompanyProps) {
  const [protalkNotes, setProtalkNotes] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const isNameMissing = !company.name || company.name === 'Новая компания' || company.name.trim() === '';

  // RR AI generation for company
  const handleProTalkGenerate = async () => {
    if (!protalkNotes.trim()) {
      setAlertMessage('Пожалуйста, введите вводные сведения или заметки для ИИ Ревизора');
      return;
    }

    setIsGenerating(true);
    try {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('rr_user') : null;
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const effectiveUserId = currentUser?.id || '91827364501';

      const res = await fetch('/api/protalk/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'company',
          entity_type: 'company',
          prompt: protalkNotes.trim(),
          userId: effectiveUserId,
          companyId: company.id || (effectiveUserId ? `com-${effectiveUserId}` : 'flagship-main'),
          companyContext: company.name
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const result = data.data;
          const targetCompId = company.id || (effectiveUserId ? `com-${effectiveUserId}` : 'flagship-main');

          const rawWebsites = result.websites || result.website;
          let parsedWebsites: string[] = [];
          if (Array.isArray(rawWebsites)) {
            parsedWebsites = rawWebsites.map(s => String(s).trim()).filter(Boolean);
          } else if (typeof rawWebsites === 'string' && rawWebsites.trim()) {
            parsedWebsites = rawWebsites.split(',').map(s => s.trim()).filter(Boolean);
          }
          const primaryWebsite = parsedWebsites[0] || (typeof rawWebsites === 'string' ? rawWebsites.trim() : '');

          const updatedCompany: CompanyInfo = {
            ...company,
            name: result.name || company.name,
            productDescription: result.productDescription || result.description || result.products || company.productDescription,
            workSystemDescription: result.workSystemDescription || result.work_format || result.systemDescription || company.workSystemDescription,
            website: primaryWebsite || company.website || '',
            websites: parsedWebsites.length > 0 ? parsedWebsites : (company.websites || [])
          };
          setCompany(updatedCompany);
          if (saveStateToServer) saveStateToServer({ company: updatedCompany });

          // Also save to backend DB crm_companies / companies
          const saveRes = await fetch('/api/company/my', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: targetCompId,
              director_id: effectiveUserId,
              name: updatedCompany.name,
              product_description: updatedCompany.productDescription,
              work_system_description: updatedCompany.workSystemDescription,
              websites: parsedWebsites.length > 0 ? parsedWebsites.join(', ') : updatedCompany.website,
              protalk_notes: protalkNotes
            })
          });
          const saveComData = await saveRes.json();
          const savedComObj = saveComData?.company;
          if (savedComObj?.name && typeof window !== 'undefined') {
            localStorage.setItem('company_name', savedComObj.name);
            if (currentUser) {
              currentUser.company = savedComObj.name;
              localStorage.setItem('rr_user', JSON.stringify(currentUser));
            }
            window.dispatchEvent(new CustomEvent('company_updated', { detail: { name: savedComObj.name, companyId: savedComObj.id } }));
            window.dispatchEvent(new CustomEvent('db-company-updated', { detail: { name: savedComObj.name, companyId: savedComObj.id } }));
            window.dispatchEvent(new CustomEvent('db-updated'));
          }

          // Backend /api/protalk/generate has already synced company, departments, subdepartments, and employee distribution directly to PostgreSQL BD ProTalk.
          // Trigger real-time refresh in Org Builder & employees throughout cabinet
          window.dispatchEvent(new CustomEvent('db-employees-updated'));
          window.dispatchEvent(new CustomEvent('db-departments-updated'));
          window.dispatchEvent(new CustomEvent('db-structure-updated'));
          window.dispatchEvent(new CustomEvent('db-updated'));

          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        }
      }
    } catch (err) {
      console.error('RR AI generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualSave = async () => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('rr_user') : null;
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const directorId = currentUser?.id || '91827364501';

    if (saveStateToServer) {
      saveStateToServer({ company });
    }
    try {
      const res = await fetch('/api/company/my', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: company.id || (directorId ? `com-${directorId}` : 'flagship-main'),
          director_id: directorId,
          name: company.name,
          product_description: company.productDescription,
          work_system_description: company.workSystemDescription,
          websites: company.website,
          protalk_notes: protalkNotes
        })
      });
      const data = await res.json();
      const savedCom = data?.company;
      if (savedCom?.name && typeof window !== 'undefined') {
        localStorage.setItem('company_name', savedCom.name);
        if (currentUser) {
          currentUser.company = savedCom.name;
          localStorage.setItem('rr_user', JSON.stringify(currentUser));
        }
        window.dispatchEvent(new CustomEvent('company_updated', { detail: { name: savedCom.name, companyId: savedCom.id } }));
        window.dispatchEvent(new CustomEvent('db-company-updated', { detail: { name: savedCom.name, companyId: savedCom.id } }));
        window.dispatchEvent(new CustomEvent('db-updated'));
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to save company to DB:', e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans" id="panel-company">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41]">
            Карточка организации (Флагман)
          </h3>
          <p className="text-xs text-amber-200/80 mt-1">
            Главный профиль компании в базе данных. Модуль ИИ-Заполнения использует эти сведения для формулировки KPI и автогенерации рапортов.
          </p>
        </div>

        <button
          onClick={handleManualSave}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-xs shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Save size={16} />
          <span>{saveSuccess ? 'Сохранено в БД!' : 'Сохранить карточку'}</span>
        </button>
      </div>

      {/* Mandatory Name Enforcement Banner if name missing */}
      {isNameMissing && (
        <div className="p-4 rounded-2xl border-2 border-amber-400 bg-amber-500/10 backdrop-blur-md flex items-start gap-3 shadow-[0_0_30px_rgba(244,238,142,0.2)]">
          <Building size={22} className="text-amber-400 shrink-0 mt-0.5 animate-bounce" />
          <div className="space-y-1">
            <h4 className="text-sm font-black text-amber-300 uppercase tracking-wide">Требуется название компании</h4>
            <p className="text-xs text-amber-200">
              Вы вошли в систему как Директор. Для привязки отделов, базы данных и сотрудников укажите официальное или рабочее название вашей компании ниже.
            </p>
          </div>
        </div>
      )}

      {/* RR AI Prompt Assistant Box */}
      <div className="p-5 rounded-2xl border border-amber-400/40 bg-white/5 backdrop-blur-md space-y-3 shadow-lg">
        <div className="flex items-center gap-2 text-amber-300 font-black text-xs uppercase tracking-wider">
          <Bot size={18} className="text-amber-400" />
          <span>RR AI — Генерация профиля компании по заметкам</span>
        </div>
        <p className="text-xs text-amber-200/80">
          Напишите несколько тезисов о вашей компании (например: чем занимаетесь, какие услуги оказываете, система работы), и RR AI автоматически заполнит реквизиты и структуры в базе данных.
        </p>

        <textarea
          rows={3}
          value={protalkNotes}
          onChange={(e) => setProtalkNotes(e.target.value)}
          placeholder="Например: Компания разрабатывает ИИ-сервисы автоматизации отчетов. У нас 4 отдела, удаленный формат с ежедневной сдачей планов в Telegram..."
          className="w-full px-4 py-3 rounded-xl bg-black/40 border border-amber-400/30 text-white placeholder-amber-200/30 text-xs focus:outline-none focus:border-amber-400 resize-none font-sans"
        />

        <div className="flex justify-end">
          <button
            onClick={handleProTalkGenerate}
            disabled={isGenerating}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles size={16} className={isGenerating ? 'animate-spin' : ''} />
            <span>{isGenerating ? 'ИИ RR анализирует...' : 'Заполнить с помощью RR AI'}</span>
          </button>
        </div>
      </div>

      {/* Main Company Form Fields */}
      <div className="p-6 rounded-2xl border border-amber-400/30 bg-white/5 backdrop-blur-md space-y-6">
        {/* Field 1: Name */}
        <div className="space-y-1.5 relative">
          <label className="block text-xs text-amber-200 font-bold">Название организации *</label>
          <div className="relative flex items-center">
            <input 
              type="text"
              required
              value={company.name}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
              placeholder="Введите название компании (например: ООО «Инновация»)"
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-amber-400/30 text-white placeholder-amber-200/30 text-xs focus:outline-none focus:border-amber-400 font-bold"
            />
            {company.name.length >= 10 && (
              <button 
                onClick={() => improveFieldWithAI('name', company.name)}
                className="absolute right-3 p-1.5 rounded-lg bg-[#E7C768] text-slate-900 hover:brightness-110 active:scale-90 transition-all shadow cursor-pointer flex items-center justify-center"
                title="Улучшить название с помощью ИИ"
              >
                <Sparkles size={13} className="animate-pulse" />
              </button>
            )}
          </div>
        </div>

        {/* Field 2: Product Description */}
        <div className="space-y-1.5 relative">
          <label className="block text-xs text-amber-200 font-bold">Описание продукта или услуг *</label>
          <div className="relative flex items-center">
            <textarea 
              rows={3}
              value={company.productDescription}
              onChange={(e) => setCompany({ ...company, productDescription: e.target.value })}
              placeholder="Опишите ключевые продукты и ценность для клиентов..."
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-amber-400/30 text-white placeholder-amber-200/30 text-xs focus:outline-none focus:border-amber-400 resize-none font-sans"
            />
            {company.productDescription.length >= 10 && (
              <button 
                onClick={() => improveFieldWithAI('productDescription', company.productDescription)}
                className="absolute right-3 bottom-3 p-1.5 rounded-lg bg-[#E7C768] text-slate-900 hover:brightness-110 active:scale-90 transition-all shadow cursor-pointer flex items-center justify-center"
                title="Оптимизировать описание с помощью ИИ"
              >
                <Sparkles size={13} className="animate-pulse" />
              </button>
            )}
          </div>
        </div>

        {/* Field 3: Work Format */}
        <div className="space-y-1.5 relative">
          <label className="block text-xs text-amber-200 font-bold">Описание рабочего формата и системы обязанностей *</label>
          <div className="relative flex items-center">
            <textarea 
              rows={3}
              value={company.workSystemDescription}
              onChange={(e) => setCompany({ ...company, workSystemDescription: e.target.value })}
              placeholder="Принципы работы, система отчетности и регламенты..."
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-amber-400/30 text-white placeholder-amber-200/30 text-xs focus:outline-none focus:border-amber-400 resize-none font-sans"
            />
            {company.workSystemDescription.length >= 10 && (
              <button 
                onClick={() => improveFieldWithAI('workSystemDescription', company.workSystemDescription)}
                className="absolute right-3 bottom-3 p-1.5 rounded-lg bg-[#E7C768] text-slate-900 hover:brightness-110 active:scale-90 transition-all shadow cursor-pointer flex items-center justify-center"
                title="Улучшить систему с помощью ИИ"
              >
                <Sparkles size={13} className="animate-pulse" />
              </button>
            )}
          </div>
        </div>

        {/* Field 4: Website / Web-resource */}
        <div className="space-y-1.5 relative">
          <label className="block text-xs text-amber-200 font-bold">Сайт или веб-ресурс организации</label>
          <div className="relative flex items-center">
            <input 
              type="url"
              value={company.website || ''}
              onChange={(e) => setCompany({ ...company, website: e.target.value })}
              placeholder="Например: https://rent-rop.com"
              className="w-full px-4 py-3 pl-10 rounded-xl bg-black/40 border border-amber-400/30 text-white placeholder-amber-200/30 text-xs focus:outline-none focus:border-amber-400 font-medium"
            />
            <Globe size={16} className="absolute left-3.5 text-amber-400/70 pointer-events-none" />
          </div>
        </div>

        <div className="p-3 bg-amber-400/10 rounded-xl border border-amber-400/20 text-sm text-amber-200 leading-relaxed flex items-start gap-2 font-sans">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-amber-300" />
          <span>Данные карточки компании синхронизируются с PostgreSQL BD ProTalk в реальном времени. Все отделы и сотрудники автоматически наследуют эти настройки.</span>
        </div>
      </div>

      {/* AI Processing Overlay with Mascot & 0-120 seconds countdown */}
      <AiLoadingOverlay
        isOpen={isGenerating}
        title="ИИ Ревизор RR оформляет компанию"
        subtitle="Генерация названия, описания продуктов, регламентов отделов и подотделов..."
        maxSeconds={120}
        onCancel={() => setIsGenerating(false)}
      />

      {/* Custom Styled Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-[#1A0F02]/85 dark:bg-[#1A0F02]/90 border border-amber-400/50 shadow-[0_0_30px_rgba(244,238,142,0.3)] space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-[#F4EE8E]">
                <AlertCircle size={20} />
              </div>
              <h4 className="text-sm font-bold text-white">Внимание</h4>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed">{alertMessage}</p>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setAlertMessage(null)}
                className="px-4 py-2 rounded-xl font-bold text-xs bg-[#E7C768] hover:bg-[#F4EE8E] text-[#140A01] transition-colors cursor-pointer"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

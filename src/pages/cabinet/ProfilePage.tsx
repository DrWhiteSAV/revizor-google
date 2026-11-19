import React from 'react';
import { UserProfile, TariffState, Transaction } from '../../types';
import CabinetProfile from './CabinetProfile';
import CabinetReferral from './CabinetReferral';
import CabinetTariff from './CabinetTariff';
import CabinetSettings from './CabinetSettings';
import CabinetNotifications from './CabinetNotifications';

interface ProfilePageProps {
  activeTab: string;
  currentUser: UserProfile | null;
  onUpdateUser?: (user: UserProfile) => void;
  telegramHandle: string;
  setTelegramHandle: React.Dispatch<React.SetStateAction<string>>;
  userPosition: string;
  setUserPosition: React.Dispatch<React.SetStateAction<string>>;
  onSaveProfile: () => void;
  tariff: TariffState;
  setTariff: React.Dispatch<React.SetStateAction<TariffState>>;
  topUpSeats: number;
  setTopUpSeats: React.Dispatch<React.SetStateAction<number>>;
  handleTopUpTariff: (seats?: number) => void;
  setCashOutTab: React.Dispatch<React.SetStateAction<'withdraw' | 'transfer' | 'refund'>>;
  setWithdrawalAmount: React.Dispatch<React.SetStateAction<number>>;
  setIsCashOutModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  transactions: Transaction[];
  company: any;
  departments: any;
  templates: any;
  reports: any;
  notifications: any;
  setNotifications?: React.Dispatch<React.SetStateAction<any>>;
  crmCompanies: any;
  mockEmployees: UserProfile[];
  promptRecs: string;
  setPromptRecs: React.Dispatch<React.SetStateAction<string>>;
  promptSummary: string;
  setPromptSummary: React.Dispatch<React.SetStateAction<string>>;
  promptFastFill: string;
  setPromptFastFill: React.Dispatch<React.SetStateAction<string>>;
  promptManagerFeedback: string;
  setPromptManagerFeedback: React.Dispatch<React.SetStateAction<string>>;
  promptFieldsGeneration: string;
  setPromptFieldsGeneration: React.Dispatch<React.SetStateAction<string>>;
  onSavePrompts: () => void;
  saveStateToServer: (updated: any) => void;
  onNavigate?: (tab: string) => void;
}

export default function ProfilePage({
  activeTab,
  currentUser,
  onUpdateUser,
  telegramHandle,
  setTelegramHandle,
  userPosition,
  setUserPosition,
  onSaveProfile,
  onNavigate,
  tariff,
  setTariff,
  topUpSeats,
  setTopUpSeats,
  handleTopUpTariff,
  setCashOutTab,
  setWithdrawalAmount,
  setIsCashOutModalOpen,
  transactions,
  company,
  departments,
  templates,
  reports,
  notifications,
  setNotifications,
  crmCompanies,
  mockEmployees,
  promptRecs,
  setPromptRecs,
  promptSummary,
  setPromptSummary,
  promptFastFill,
  setPromptFastFill,
  promptManagerFeedback,
  setPromptManagerFeedback,
  promptFieldsGeneration,
  setPromptFieldsGeneration,
  onSavePrompts,
  saveStateToServer
}: ProfilePageProps) {
  const isDirector = ['director', 'super_admin', 'superadmin', 'admin'].includes(String(currentUser?.role).toLowerCase());

  return (
    <>
      {(activeTab === 'profile' || activeTab === 'profile_view_only') && (
        <CabinetProfile 
          currentUser={currentUser}
          viewOnly={activeTab === 'profile_view_only'}
          onUpdateUser={onUpdateUser}
          telegramHandle={telegramHandle}
          setTelegramHandle={setTelegramHandle}
          userPosition={userPosition}
          setUserPosition={setUserPosition}
          onSaveProfile={onSaveProfile}
          onNavigate={onNavigate}
          tariff={tariff}
          transactions={transactions}
          notifications={notifications}
          reports={reports}
          mockEmployees={mockEmployees}
          company={company}
        />
      )}

      {activeTab === 'profile_referral' && (
        isDirector ? (
          <CabinetReferral 
            currentUser={currentUser}
            setCashOutTab={setCashOutTab}
            setWithdrawalAmount={setWithdrawalAmount}
            setIsCashOutModalOpen={setIsCashOutModalOpen}
          />
        ) : (
          <div className="p-8 text-center space-y-4 rounded-2xl border border-amber-500/30 bg-[#1A0F02]/80 backdrop-blur-md max-w-lg mx-auto mt-6">
            <h3 className="text-base font-bold text-amber-200">Реферальная система доступна только Директорам</h3>
            <p className="text-sm text-amber-100/70">Управление реферальной сетью и бонусными выплатами открыто только для руководителей высшего звена.</p>
            <button 
              type="button"
              onClick={() => onNavigate?.('profile')} 
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-sm hover:brightness-110 cursor-pointer"
            >
              Вернуться в Мой Профиль
            </button>
          </div>
        )
      )}

      {(activeTab === 'profile_tariff' || activeTab === 'profile_billing' || activeTab === 'tariff') && (
        isDirector ? (
          <CabinetTariff 
            tariff={tariff}
            topUpSeats={topUpSeats}
            setTopUpSeats={setTopUpSeats}
            handleTopUpTariff={handleTopUpTariff}
            setTariff={setTariff}
            saveStateToServer={saveStateToServer}
            currentUser={currentUser}
            setCashOutTab={setCashOutTab}
            setWithdrawalAmount={setWithdrawalAmount}
            setIsCashOutModalOpen={setIsCashOutModalOpen}
            transactions={transactions}
            company={company}
            departments={departments}
            templates={templates}
            reports={reports}
            notifications={notifications}
            crmCompanies={crmCompanies}
            mockEmployees={mockEmployees}
            onUpdateUser={onUpdateUser}
          />
        ) : (
          <div className="p-8 text-center space-y-4 rounded-2xl border border-amber-500/30 bg-[#1A0F02]/80 backdrop-blur-md max-w-lg mx-auto mt-6">
            <h3 className="text-base font-bold text-amber-200">Управление тарифами и балансом доступно только Директорам</h3>
            <p className="text-sm text-amber-100/70">Просмотр и пополнение баланса компании, тарифов и пакетов сотрудников закреплены за Директором.</p>
            <button 
              type="button"
              onClick={() => onNavigate?.('profile')} 
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-sm hover:brightness-110 cursor-pointer"
            >
              Вернуться в Мой Профиль
            </button>
          </div>
        )
      )}

      {activeTab === 'settings' && (
        isDirector ? (
          <CabinetSettings 
            promptRecs={promptRecs}
            setPromptRecs={setPromptRecs}
            promptSummary={promptSummary}
            setPromptSummary={setPromptSummary}
            promptFastFill={promptFastFill}
            setPromptFastFill={setPromptFastFill}
            promptManagerFeedback={promptManagerFeedback}
            setPromptManagerFeedback={setPromptManagerFeedback}
            promptFieldsGeneration={promptFieldsGeneration}
            setPromptFieldsGeneration={setPromptFieldsGeneration}
            onSavePrompts={onSavePrompts}
          />
        ) : (
          <div className="p-8 text-center space-y-4 rounded-2xl border border-amber-500/30 bg-[#1A0F02]/80 backdrop-blur-md max-w-lg mx-auto mt-6">
            <h3 className="text-base font-bold text-amber-200">Системные промпты ИИ доступны только Директорам</h3>
            <p className="text-sm text-amber-100/70">Тонкая настройка системных инструкций и критериев нейросети открыта исключительно Директорам.</p>
            <button 
              type="button"
              onClick={() => onNavigate?.('profile')} 
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-sm hover:brightness-110 cursor-pointer"
            >
              Вернуться в Мой Профиль
            </button>
          </div>
        )
      )}

      {(activeTab === 'profile_notifications' || activeTab === 'raport_notifications' || activeTab === 'notifications') && (
        <CabinetNotifications 
          notifications={notifications}
          currentUser={currentUser}
          onNavigate={onNavigate}
          handleMarkAllNotificationsRead={() => {
            if (setNotifications) {
              setNotifications((prev: any[]) => prev.map(n => ({ ...n, read: true })));
            }
          }}
        />
      )}
    </>
  );
}

import React from 'react';
import { UserProfile, SubmittedReport } from '../../types';
import CabinetRevisor from './CabinetRevisor';
import CabinetExtendedFeatures from './CabinetExtendedFeatures';
import CabinetTaskIntegrations from '../../components/revisor/rules/CabinetTaskIntegrations';
import CabinetDoctorAnalytics from '../../components/revisor/doctor/CabinetDoctorAnalytics';
import CabinetTaskCardsPage from '../../components/revisor/cards/CabinetTaskCardsPage';
import CabinetTaskReview from './CabinetTaskReview';

interface RevisorPageProps {
  activeTab: string;
  currentUser: UserProfile | null;
  mockEmployees: UserProfile[];
  reports: SubmittedReport[];
  setReports: (val: SubmittedReport[]) => void;
  saveStateToServer: (updated: any) => void;
  company: any;
  departments: any;
  templates: any;
  transactions: any;
  notifications: any;
  tariff: any;
  crmCompanies: any;
  theme: 'dark' | 'light';
  handleTabClick?: (tabId: string) => void;
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export default function RevisorPage({
  activeTab,
  currentUser,
  mockEmployees,
  reports,
  setReports,
  saveStateToServer,
  company,
  departments,
  templates,
  transactions,
  notifications,
  tariff,
  crmCompanies,
  theme,
  handleTabClick,
  currentPath,
  onNavigate
}: RevisorPageProps) {
  const isRevisorTabGroup = 
    activeTab === 'revisor' || 
    activeTab.startsWith('revisor_projects_') ||
    activeTab.startsWith('revisor_tasks_') ||
    activeTab === 'revisor_kanban' || 
    activeTab === 'revisor_tasks' || 
    activeTab === 'revisor_gantt';

  return (
    <>
      {isRevisorTabGroup && (
        <CabinetRevisor 
          currentUser={currentUser}
          mockEmployees={mockEmployees}
          reports={reports}
          setReports={setReports}
          saveStateToServer={saveStateToServer}
          company={company}
          departments={departments}
          templates={templates}
          transactions={transactions}
          notifications={notifications}
          tariff={tariff}
          crmCompanies={crmCompanies}
          handleTabClick={handleTabClick}
          currentPath={currentPath}
          onNavigate={onNavigate}
          activeTab={activeTab}
          forcedSubTab={
            activeTab === 'revisor_projects_map'
              ? 'projects_map'
              : activeTab === 'revisor_projects_kanban'
              ? 'projects_kanban'
              : activeTab === 'revisor_projects_table'
              ? 'projects_table'
              : activeTab === 'revisor_tasks_map'
              ? 'tasks_map'
              : activeTab === 'revisor_tasks_kanban'
              ? 'tasks_kanban'
              : activeTab === 'revisor_tasks_table'
              ? 'tasks_table'
              : activeTab === 'revisor_gantt'
              ? 'gantt'
              : 'projects_map'
          }
          theme={theme}
        />
      )}

      {/* Task & Project Routing Rules / Integrations */}
      {activeTab === 'revisor_integrations' && (
        <CabinetTaskIntegrations
          currentUser={currentUser}
          theme={theme}
          employees={mockEmployees}
          departments={departments}
        />
      )}

      {/* Combined AI Revisor - Project Doctor & Analytics */}
      {(activeTab === 'revisor_doctor' || activeTab === 'revisor_analytics') && (
        <CabinetDoctorAnalytics
          currentUser={currentUser}
          mockEmployees={mockEmployees}
          reports={reports}
          theme={theme}
        />
      )}

      {/* Dedicated Manager Task Review Page */}
      {(activeTab === 'revisor_review' || Boolean(currentPath && currentPath.startsWith('/cabinet/revisor/review'))) && (
        <CabinetTaskReview
          currentUser={currentUser}
          employees={mockEmployees}
          onNavigate={onNavigate}
          theme={theme}
          currentPath={currentPath}
        />
      )}

      {/* Dedicated Task Cards Execution Page */}
      {activeTab === 'revisor_task_cards' && (
        <CabinetTaskCardsPage
          taskId={currentPath ? currentPath.replace(/^\/cabinet\/(revisor\/task\/|task)/, '').replace(/^\//, '') : undefined}
          onBack={() => {
            if (onNavigate) onNavigate('/cabinet/revisor/map');
            else if (handleTabClick) handleTabClick('revisor_projects_map');
          }}
          isDark={theme === 'dark'}
        />
      )}

      {(activeTab === 'raport_kpi' || activeTab === 'raport_templates') && (
        <CabinetExtendedFeatures 
          activeTab={activeTab}
          currentUser={currentUser}
          mockEmployees={mockEmployees}
          reports={reports}
          theme={theme}
        />
      )}
    </>
  );
}

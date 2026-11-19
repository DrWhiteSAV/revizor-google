import React from 'react';
import { UserProfile, SubmittedReport, ReportTemplate, NotificationItem } from '../../types';
import CabinetFillReport from './CabinetFillReport';
import CabinetCalendar from './CabinetCalendar';
import CabinetScheduleGantt from './CabinetScheduleGantt';
import CabinetAnalytics from './CabinetAnalytics';
import CabinetNotifications from './CabinetNotifications';
import CabinetIntegrations from './CabinetIntegrations';
import CabinetReportVerdict from './CabinetReportVerdict';
import CabinetReportReview from './CabinetReportReview';
import CabinetMotivation from '../motivation/CabinetMotivation';

interface RaportPageProps {
  activeTab: string;
  currentUser: UserProfile | null;
  templates: ReportTemplate[];
  setTemplates: (val: ReportTemplate[]) => void;
  reports: SubmittedReport[];
  setReports: (val: SubmittedReport[]) => void;
  notifications: NotificationItem[];
  setNotifications: (val: NotificationItem[]) => void;
  departments: any;
  triggerAI: any;
  saveStateToServer: (updated: any) => void;
  company: any;
  transactions: any;
  tariff: any;
  crmCompanies: any;
  mockEmployees: UserProfile[];
  promptRecs: string;
  promptFastFill: string;
  promptFieldsGeneration: string;
  promptManagerFeedback: string;
  promptSummary: string;
  handleMarkAllNotificationsRead: () => void;
  onNavigate?: (path: string) => void;
  theme?: 'dark' | 'light';
  currentPath?: string;
}

export default function RaportPage({
  activeTab,
  currentUser,
  templates,
  setTemplates,
  reports,
  setReports,
  notifications,
  setNotifications,
  departments,
  triggerAI,
  saveStateToServer,
  company,
  transactions,
  tariff,
  crmCompanies,
  mockEmployees,
  promptRecs,
  promptFastFill,
  promptFieldsGeneration,
  promptManagerFeedback,
  promptSummary,
  handleMarkAllNotificationsRead,
  onNavigate,
  theme = 'dark',
  currentPath
}: RaportPageProps) {
  // Extract report ID from currentPath if on verdict or individual report page
  const matchedVerdict = currentPath?.match(/\/cabinet\/raport\/(?:verdict\/|report\/)?(rep-[^\/\?]+|\d+)/);
  const pathReportId = matchedVerdict ? matchedVerdict[1] : '';
  const isVerdictView = activeTab === 'raport_verdict' || Boolean(currentPath && currentPath.includes('/verdict/'));

  // Extract report ID from currentPath if on review page
  const matchedReview = currentPath?.match(/\/cabinet\/(?:raport\/)?review\/?([^\/\?]+)?/);
  const pathReviewId = matchedReview && matchedReview[1] ? matchedReview[1] : '';
  const isReviewView = activeTab === 'raport_review' || Boolean(currentPath && (currentPath.includes('/raport/review') || currentPath.includes('/review/')));

  return (
    <>
      {isVerdictView && pathReportId && (
        <CabinetReportVerdict
          reportId={pathReportId}
          currentUser={currentUser}
          theme={theme}
          onNavigate={onNavigate}
          reports={reports}
        />
      )}

      {isReviewView && (
        <CabinetReportReview
          reportId={pathReviewId}
          currentUser={currentUser}
          reports={reports}
          setReports={setReports}
          templates={templates}
          notifications={notifications}
          setNotifications={setNotifications}
          departments={departments}
          onNavigate={onNavigate}
          theme={theme}
          currentPath={currentPath}
        />
      )}

      {(activeTab === 'fill_report' || activeTab === 'reports_builder' || activeTab === 'raport_builder') && !isVerdictView && !isReviewView && (
        <CabinetFillReport 
          currentUser={currentUser}
          templates={templates}
          setTemplates={setTemplates}
          reports={reports}
          setReports={setReports}
          notifications={notifications}
          setNotifications={setNotifications}
          departments={departments}
          triggerAI={triggerAI}
          saveStateToServer={saveStateToServer}
          company={company}
          transactions={transactions}
          tariff={tariff}
          crmCompanies={crmCompanies}
          mockEmployees={mockEmployees}
          promptRecs={promptRecs}
          promptFastFill={promptFastFill}
          defaultOpenCreateModal={activeTab === 'reports_builder' || activeTab === 'raport_builder'}
          onNavigate={onNavigate}
        />
      )}

      {(activeTab === 'calendar' || activeTab === 'raport_calendar') && !isVerdictView && !isReviewView && (
        <CabinetCalendar 
          reports={reports}
          setReports={setReports}
          departments={departments}
          mockEmployees={mockEmployees}
          currentUser={currentUser}
          triggerAI={triggerAI}
          saveStateToServer={saveStateToServer}
          company={company}
          templates={templates}
          transactions={transactions}
          notifications={notifications}
          tariff={tariff}
          crmCompanies={crmCompanies}
          promptManagerFeedback={promptManagerFeedback}
          theme={theme}
          onNavigate={onNavigate}
          currentPath={currentPath}
        />
      )}

      {(activeTab === 'schedules_builder') && (
        <CabinetScheduleGantt 
          currentUser={currentUser}
          mockEmployees={mockEmployees}
          reports={reports}
          onNavigate={onNavigate}
        />
      )}

      {(activeTab === 'analytics' || activeTab === 'raport_analytics' || activeTab === 'raport_kpi' || activeTab === 'raport_summaries' || activeTab === 'summaries') && (
        <CabinetAnalytics 
          reports={reports}
          departments={departments}
          currentUser={currentUser}
          triggerAI={triggerAI}
          mockEmployees={mockEmployees}
          promptSummary={promptSummary}
          theme={theme}
        />
      )}

      {(activeTab === 'raport_integrations' || activeTab === 'integrations') && (
        <CabinetIntegrations 
          reportTemplates={templates}
          onUpdateTemplate={(updatedTpl) => {
            const newTemplates = templates.map(t => t.id === updatedTpl.id ? updatedTpl : t);
            setTemplates(newTemplates);
            saveStateToServer({ templates: newTemplates });
          }}
          currentUser={currentUser}
          theme={theme}
          onNavigate={onNavigate}
          currentPath={currentPath}
        />
      )}

      {(activeTab === 'raport_motivation' || activeTab === 'raport_motivation_history') && !isVerdictView && !isReviewView && (
        <CabinetMotivation
          activeSubpage={activeTab === 'raport_motivation_history' ? 'history' : 'rules'}
          currentUser={currentUser}
          templates={templates}
          setTemplates={setTemplates}
          departments={departments}
          mockEmployees={mockEmployees}
          company={company}
          saveStateToServer={saveStateToServer}
          onNavigate={onNavigate}
          theme={theme}
        />
      )}
    </>
  );
}

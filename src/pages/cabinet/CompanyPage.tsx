import React from 'react';
import { UserProfile, CompanyInfo, Department } from '../../types';
import CabinetCompany from './CabinetCompany';
import CabinetDepartments from './CabinetDepartments';
import CabinetEmployees from './CabinetEmployees';
import CabinetScheduleGantt from './CabinetScheduleGantt';

interface CompanyPageProps {
  activeTab: string;
  currentUser: UserProfile | null;
  company: CompanyInfo;
  setCompany: React.Dispatch<React.SetStateAction<CompanyInfo>>;
  improveFieldWithAI: (fieldKey: 'name' | 'productDescription' | 'workSystemDescription', text: string) => void;
  departments: Department[];
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  saveStateToServer: (updated: any) => void;
  templates: any;
  reports: any;
  transactions: any;
  notifications: any;
  tariff: any;
  crmCompanies: any;
  mockEmployees: UserProfile[];
  setMockEmployees: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  triggerAI: any;
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export default function CompanyPage({
  activeTab,
  currentUser,
  company,
  setCompany,
  improveFieldWithAI,
  departments,
  setDepartments,
  saveStateToServer,
  templates,
  reports,
  transactions,
  notifications,
  tariff,
  crmCompanies,
  mockEmployees,
  setMockEmployees,
  triggerAI,
  currentPath,
  onNavigate
}: CompanyPageProps) {
  return (
    <>
      {(activeTab === 'company' || activeTab === 'departments' || activeTab === 'company_structure' || activeTab === 'company_about') && (
        <CabinetDepartments 
          departments={departments}
          setDepartments={setDepartments}
          saveStateToServer={saveStateToServer}
          company={company}
          setCompany={setCompany}
          improveFieldWithAI={improveFieldWithAI}
          templates={templates}
          reports={reports}
          transactions={transactions}
          notifications={notifications}
          tariff={tariff}
          crmCompanies={crmCompanies}
          mockEmployees={mockEmployees}
          setMockEmployees={setMockEmployees}
          currentPath={currentPath}
          onNavigate={onNavigate}
        />
      )}

      {(activeTab === 'employees' || activeTab === 'company_employees') && (
        <CabinetEmployees 
          currentUser={currentUser}
          mockEmployees={mockEmployees}
          setMockEmployees={(val) => {
            setMockEmployees(val);
            saveStateToServer({ 
              company, 
              departments, 
              templates, 
              reports, 
              transactions, 
              notifications, 
              tariff, 
              crmCompanies, 
              mockEmployees: val 
            });
          }}
          departments={departments}
          saveStateToServer={saveStateToServer}
          company={company}
          templates={templates}
          reports={reports}
          transactions={transactions}
          notifications={notifications}
          tariff={tariff}
          crmCompanies={crmCompanies}
          triggerAI={triggerAI}
          onNavigate={onNavigate}
        />
      )}

      {(activeTab === 'employee_schedule' || activeTab === 'schedule' || activeTab === 'company_schedule') && (
        <CabinetScheduleGantt 
          currentUser={currentUser}
          mockEmployees={mockEmployees}
          reports={reports}
          onNavigate={onNavigate}
        />
      )}
    </>
  );
}

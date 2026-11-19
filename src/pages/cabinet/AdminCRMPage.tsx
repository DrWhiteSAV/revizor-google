import React from 'react';
import CabinetCRM from './CabinetCRM';
import CabinetBlogPosts from './CabinetBlogPosts';

interface AdminCRMPageProps {
  activeTab: string;
  crmCompanies: any[];
  setCrmCompanies: React.Dispatch<React.SetStateAction<any[]>>;
  editingCrmCompany: any | null;
  setEditingCrmCompany: React.Dispatch<React.SetStateAction<any | null>>;
  saveStateToServer: (updated: any) => void;
  company: any;
  departments: any;
  templates: any;
  reports: any;
  transactions: any;
  notifications: any;
  tariff: any;
  mockEmployees: any[];
}

export default function AdminCRMPage({
  activeTab,
  crmCompanies,
  setCrmCompanies,
  editingCrmCompany,
  setEditingCrmCompany,
  saveStateToServer,
  company,
  departments,
  templates,
  reports,
  transactions,
  notifications,
  tariff,
  mockEmployees
}: AdminCRMPageProps) {
  return (
    <>
      {activeTab === 'crm' && (
        <CabinetCRM 
          crmCompanies={crmCompanies}
          setCrmCompanies={setCrmCompanies}
          editingCrmCompany={editingCrmCompany}
          setEditingCrmCompany={setEditingCrmCompany}
          saveStateToServer={saveStateToServer}
          company={company}
          departments={departments}
          templates={templates}
          reports={reports}
          transactions={transactions}
          notifications={notifications}
          tariff={tariff}
          mockEmployees={mockEmployees}
        />
      )}

      {activeTab === 'blog_posts' && (
        <CabinetBlogPosts />
      )}
    </>
  );
}

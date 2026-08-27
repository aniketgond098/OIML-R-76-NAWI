import React, { useState } from 'react';
import { AuthProvider } from './services/auth/authContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar, MainNavTab } from './components/common/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { InstrumentList } from './components/instruments/InstrumentList';
import { InstrumentDetail } from './components/instruments/InstrumentDetail';
import { NewInstrumentWizard } from './components/instruments/NewInstrumentWizard';
import { TestSessionList } from './components/testSession/TestSessionList';
import { TestSessionWorkflow } from './components/testSession/TestSessionWorkflow';
import { ReportList } from './components/reports/ReportList';
import { ReportViewer } from './components/reports/ReportViewer';
import { StandardsRuleView } from './components/standards/StandardsRuleView';
import { EquipmentRegistry } from './components/equipment/EquipmentRegistry';
import { AuditLogView } from './components/audit/AuditLogView';
import { MetrologyVerificationSuite } from './components/qa/MetrologyVerificationSuite';
import { NewTestSessionModal } from './components/testSession/NewTestSessionModal';
import { LoginModal } from './components/auth/LoginModal';
import { Instrument } from './types/instrument';
import { TestSession } from './types/testSession';

function AppContent() {
  const [activeTab, setActiveTab] = useState<MainNavTab>('dashboard');

  // Specific entity drill-down states
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string | null>(null);
  const [isRegisteringInstrument, setIsRegisteringInstrument] = useState(false);

  const [selectedTestSessionId, setSelectedTestSessionId] = useState<string | null>(null);
  const [isStartingNewTestModalOpen, setIsStartingNewTestModalOpen] = useState(false);
  const [preselectedInstrumentForNewTest, setPreselectedInstrumentForNewTest] = useState<string | undefined>(undefined);

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Navigation handlers
  const handleNavChange = (tab: MainNavTab) => {
    setActiveTab(tab);
    // Reset drill-downs when explicitly clicking top-level tabs
    setSelectedInstrumentId(null);
    setIsRegisteringInstrument(false);
    setSelectedTestSessionId(null);
    setSelectedReportId(null);
  };

  const handleSelectInstrument = (instId: string) => {
    setSelectedInstrumentId(instId);
    setActiveTab('instruments');
  };

  const handleStartNewTestFromInstrument = (instId: string) => {
    setPreselectedInstrumentForNewTest(instId);
    setIsStartingNewTestModalOpen(true);
  };

  const handleSelectTestSession = (sessionId: string) => {
    setSelectedTestSessionId(sessionId);
    setActiveTab('testSessions');
  };

  const handleSelectReport = (reportId: string) => {
    setSelectedReportId(reportId);
    setActiveTab('reports');
  };

  const handleTestSessionCreated = (session: TestSession) => {
    setIsStartingNewTestModalOpen(false);
    setSelectedTestSessionId(session.id);
    setActiveTab('testSessions');
  };

  const handleInstrumentRegistered = (inst: Instrument) => {
    setIsRegisteringInstrument(false);
    setSelectedInstrumentId(inst.id);
  };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-100 font-sans text-slate-900 antialiased selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Top Navigation */}
      <Navbar onOpenLoginModal={() => setIsLoginModalOpen(true)} />

      {/* Main Workspace Layout */}
      <div className="flex flex-row flex-1 min-h-0 min-w-0 w-full overflow-hidden items-stretch">
        {/* Left Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={handleNavChange} />

        {/* Content Viewport */}
        <main className="flex-1 min-h-0 min-w-0 h-full overflow-y-auto overflow-x-hidden bg-slate-100">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <DashboardView
              onNavigateToInstruments={() => handleNavChange('instruments')}
              onNavigateToNewInstrument={() => {
                setActiveTab('instruments');
                setIsRegisteringInstrument(true);
              }}
              onNavigateToTestSessions={() => handleNavChange('testSessions')}
              onNavigateToReports={() => handleNavChange('reports')}
              onSelectTestSession={handleSelectTestSession}
              onSelectReport={handleSelectReport}
            />
          )}

          {/* Instruments Tab */}
          {activeTab === 'instruments' && (
            <>
              {isRegisteringInstrument ? (
                <div className="p-8">
                  <NewInstrumentWizard
                    onCancel={() => setIsRegisteringInstrument(false)}
                    onSaved={handleInstrumentRegistered}
                  />
                </div>
              ) : selectedInstrumentId ? (
                <InstrumentDetail
                  instrumentId={selectedInstrumentId}
                  onBack={() => setSelectedInstrumentId(null)}
                  onStartNewTest={handleStartNewTestFromInstrument}
                  onSelectTestSession={handleSelectTestSession}
                  onSelectReport={handleSelectReport}
                />
              ) : (
                <InstrumentList
                  onSelectInstrument={handleSelectInstrument}
                  onStartNewTest={handleStartNewTestFromInstrument}
                  onOpenNewWizard={() => setIsRegisteringInstrument(true)}
                />
              )}
            </>
          )}

          {/* Test Sessions Tab */}
          {activeTab === 'testSessions' && (
            <>
              {selectedTestSessionId ? (
                <TestSessionWorkflow
                  sessionId={selectedTestSessionId}
                  onBack={() => setSelectedTestSessionId(null)}
                  onViewReport={handleSelectReport}
                />
              ) : (
                <TestSessionList
                  onSelectTestSession={handleSelectTestSession}
                  onOpenNewTestModal={() => {
                    setPreselectedInstrumentForNewTest(undefined);
                    setIsStartingNewTestModalOpen(true);
                  }}
                  onSelectReport={handleSelectReport}
                />
              )}
            </>
          )}

          {/* Reports Archive Tab */}
          {activeTab === 'reports' && (
            <>
              {selectedReportId ? (
                <ReportViewer
                  reportId={selectedReportId}
                  onBack={() => setSelectedReportId(null)}
                />
              ) : (
                <ReportList onSelectReport={handleSelectReport} />
              )}
            </>
          )}

          {/* Standards & Rule Registry Tab */}
          {activeTab === 'standards' && <StandardsRuleView />}

          {/* Equipment & Standard Weights Tab */}
          {activeTab === 'equipment' && <EquipmentRegistry />}

          {/* Audit Trail Tab */}
          {activeTab === 'audit' && <AuditLogView />}

          {/* Verification QA Suite Tab */}
          {activeTab === 'qa' && <MetrologyVerificationSuite />}
        </main>
      </div>

      {/* Global Action Modals */}
      <NewTestSessionModal
        isOpen={isStartingNewTestModalOpen}
        onClose={() => setIsStartingNewTestModalOpen(false)}
        onSessionCreated={handleTestSessionCreated}
        preselectedInstrumentId={preselectedInstrumentForNewTest}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

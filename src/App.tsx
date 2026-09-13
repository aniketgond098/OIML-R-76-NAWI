import React, { useState, useEffect } from 'react';
import { AuthProvider } from './services/auth/authContext';
import { Navbar } from './components/common/Navbar';
import { NetworkBanner } from './components/common/NetworkBanner';
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
import { PublicVerificationView } from './components/verification/PublicVerificationView';
import { QRScannerModal } from './components/verification/QRScannerModal';
import { Instrument } from './types/instrument';
import { TestSession } from './types/testSession';

function getVerificationIdFromUrl(): string | null {
  try {
    const pathMatch = window.location.pathname.match(/\/verify\/([^/?#]+)/i);
    if (pathMatch && pathMatch[1]) return decodeURIComponent(pathMatch[1]);
    const hashMatch = window.location.hash.match(/#\/?verify\/([^/?#]+)/i);
    if (hashMatch && hashMatch[1]) return decodeURIComponent(hashMatch[1]);
    const params = new URLSearchParams(window.location.search);
    const queryParam = params.get('verify') || params.get('p');
    if (queryParam) return queryParam;
  } catch {
    // Ignore URL parsing errors
  }
  return null;
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<MainNavTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Public QR Verification Route state
  const [publicVerificationId, setPublicVerificationId] = useState<string | null>(() =>
    getVerificationIdFromUrl()
  );
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  // Specific entity drill-down states
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string | null>(null);
  const [isRegisteringInstrument, setIsRegisteringInstrument] = useState(false);

  const [selectedTestSessionId, setSelectedTestSessionId] = useState<string | null>(null);
  const [isStartingNewTestModalOpen, setIsStartingNewTestModalOpen] = useState(false);
  const [preselectedInstrumentForNewTest, setPreselectedInstrumentForNewTest] = useState<string | undefined>(undefined);

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Sync browser back/forward history for QR verification URLs
  useEffect(() => {
    const handleLocationChange = () => {
      const id = getVerificationIdFromUrl();
      setPublicVerificationId(id);
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const handleNavigateToVerification = (publicId: string) => {
    setPublicVerificationId(publicId);
    try {
      if (typeof window !== 'undefined' && window.history?.pushState) {
        window.history.pushState({}, '', `/verify/${encodeURIComponent(publicId)}`);
      }
    } catch {
      // Ignore SecurityError in restricted iframe sandboxes
    }
  };

  const handleCloseVerification = () => {
    setPublicVerificationId(null);
    try {
      if (
        typeof window !== 'undefined' &&
        window.history?.pushState &&
        (window.location.pathname.includes('/verify') ||
          window.location.hash.includes('verify') ||
          window.location.search.includes('verify'))
      ) {
        window.history.pushState({}, '', '/');
      }
    } catch {
      // Ignore in restricted iframe sandboxes
    }
  };

  // Navigation handlers
  const handleNavChange = (tab: MainNavTab) => {
    setActiveTab(tab);
    setIsMobileSidebarOpen(false);
    // Reset drill-downs when explicitly clicking top-level tabs
    setSelectedInstrumentId(null);
    setIsRegisteringInstrument(false);
    setSelectedTestSessionId(null);
    setSelectedReportId(null);
  };

  const handleSelectInstrument = (instId: string) => {
    setSelectedInstrumentId(instId);
    setActiveTab('instruments');
    setIsMobileSidebarOpen(false);
  };

  const handleStartNewTestFromInstrument = (instId: string) => {
    setPreselectedInstrumentForNewTest(instId);
    setIsStartingNewTestModalOpen(true);
  };

  const handleSelectTestSession = (sessionId: string) => {
    setSelectedTestSessionId(sessionId);
    setActiveTab('testSessions');
    setIsMobileSidebarOpen(false);
  };

  const handleSelectReport = (reportId: string) => {
    setSelectedReportId(reportId);
    setActiveTab('reports');
    setIsMobileSidebarOpen(false);
  };

  const handleTestSessionCreated = (session: TestSession) => {
    setIsStartingNewTestModalOpen(false);
    setSelectedTestSessionId(session.id);
    setActiveTab('testSessions');
    setIsMobileSidebarOpen(false);
  };

  const handleInstrumentRegistered = (inst: Instrument) => {
    setIsRegisteringInstrument(false);
    setSelectedInstrumentId(inst.id);
    setIsMobileSidebarOpen(false);
  };

  // If public verification URL is accessed directly or navigated to:
  if (publicVerificationId) {
    return (
      <div id="public-verification-wrapper" className="h-screen w-full overflow-y-auto bg-slate-50">
        <PublicVerificationView
          publicInstrumentId={publicVerificationId}
          onBack={handleCloseVerification}
          onScanAnother={() => setIsQRScannerOpen(true)}
          onViewInternalInstrument={(internalId) => {
            handleCloseVerification();
            handleSelectInstrument(internalId);
          }}
        />

        {isQRScannerOpen && (
          <QRScannerModal
            onClose={() => setIsQRScannerOpen(false)}
            onScanSuccess={(scannedId) => {
              setIsQRScannerOpen(false);
              handleNavigateToVerification(scannedId);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-slate-100 font-sans text-slate-900 antialiased selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Top Navigation */}
      <Navbar
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenScanModal={() => setIsQRScannerOpen(true)}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
      />

      {/* Network Connectivity & Offline / Sync Alert Banner */}
      <NetworkBanner />

      {/* Main Workspace Layout */}
      <div className="flex flex-row flex-1 min-h-0 min-w-0 w-full overflow-hidden items-stretch">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleNavChange}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

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
                  onNavigateToVerification={handleNavigateToVerification}
                />
              ) : (
                <InstrumentList
                  onSelectInstrument={handleSelectInstrument}
                  onStartNewTest={handleStartNewTestFromInstrument}
                  onOpenNewWizard={() => setIsRegisteringInstrument(true)}
                  onOpenScanModal={() => setIsQRScannerOpen(true)}
                  onNavigateToVerification={handleNavigateToVerification}
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

      {/* Global QR Scanner Modal */}
      {isQRScannerOpen && (
        <QRScannerModal
          onClose={() => setIsQRScannerOpen(false)}
          onScanSuccess={(scannedId) => {
            setIsQRScannerOpen(false);
            handleNavigateToVerification(scannedId);
          }}
        />
      )}
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

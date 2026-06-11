import { useEffect, useState } from 'react';
import { AlertCircle, BrainCircuit, Calendar, Clock, Database, Home, Info, RefreshCw } from 'lucide-react';
import { AppState, Exam, StudyLog, StudyPlan } from './types';
import {
  fetchSpreadsheetData,
  syncExamsToSheet,
  syncLogsToSheet,
  syncPlansToSheet,
} from './sheets';
import Countdown from './components/Countdown';
import Planner from './components/Planner';
import SheetLink from './components/SheetLink';
import Stats from './components/Stats';
import Timer from './components/Timer';

type ActiveTab = 'dashboard' | 'timer' | 'planner' | 'database';
type SyncStatus = 'offline' | 'syncing' | 'synced' | 'error';
type ToastType = 'success' | 'info' | 'error';

const getConfiguredGasUrl = () => {
  const savedUrl = localStorage.getItem('study_tracker_gas_url');
  const envUrl = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL;
  return savedUrl || envUrl || null;
};

const today = () => new Date().toISOString().split('T')[0];
const thisMonth = () => new Date().toISOString().slice(0, 7);

const createInitialState = (): AppState => ({
  logs: [
    {
      id: 'sample-log-1',
      date: today(),
      subject: 'Math',
      duration: 45,
      notes: 'Sample study session',
    },
    {
      id: 'sample-log-2',
      date: today(),
      subject: 'English',
      duration: 60,
      notes: 'Vocabulary review',
    },
  ],
  plans: [
    {
      id: 'sample-plan-1',
      month: thisMonth(),
      subject: 'Math',
      targetHours: 20,
    },
    {
      id: 'sample-plan-2',
      month: thisMonth(),
      subject: 'English',
      targetHours: 35,
    },
  ],
  exams: [
    {
      id: 'sample-exam-1',
      name: 'Mock Exam',
      date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 35).toISOString().split('T')[0],
      pinned: true,
    },
  ],
});

const readStoredState = (): AppState => {
  const savedLogs = localStorage.getItem('study_tracker_logs');
  const savedPlans = localStorage.getItem('study_tracker_plans');
  const savedExams = localStorage.getItem('study_tracker_exams');
  const initialState = createInitialState();

  return {
    logs: savedLogs ? JSON.parse(savedLogs) : initialState.logs,
    plans: savedPlans ? JSON.parse(savedPlans) : initialState.plans,
    exams: savedExams ? JSON.parse(savedExams) : initialState.exams,
  };
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [gasUrl, setGasUrlState] = useState<string | null>(getConfiguredGasUrl);
  const [appState, setAppState] = useState<AppState>(readStoredState);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(gasUrl ? 'synced' : 'offline');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<ToastType>('info');

  const triggerToast = (msg: string, type: ToastType = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    window.setTimeout(() => setToastMessage(null), 4500);
  };

  const setGasUrl = (nextUrl: string | null) => {
    const normalizedUrl = nextUrl?.trim() || null;
    if (normalizedUrl) {
      localStorage.setItem('study_tracker_gas_url', normalizedUrl);
      setSyncStatus('synced');
    } else {
      localStorage.removeItem('study_tracker_gas_url');
      setSyncStatus('offline');
    }
    setGasUrlState(normalizedUrl);
  };

  useEffect(() => {
    const loadInitialSheetsData = async () => {
      if (!gasUrl) {
        setSyncStatus('offline');
        return;
      }

      setSyncStatus('syncing');
      try {
        const cloudData = await fetchSpreadsheetData(gasUrl);
        setAppState(cloudData);
        setSyncStatus('synced');
        triggerToast('Cloud data loaded from Google Apps Script.', 'success');
      } catch (err) {
        console.error('Initial GAS fetch failed:', err);
        setSyncStatus('error');
        triggerToast('Could not load cloud data. Check the GAS URL and deployment permissions.', 'error');
      }
    };

    loadInitialSheetsData();
  }, [gasUrl]);

  useEffect(() => {
    localStorage.setItem('study_tracker_logs', JSON.stringify(appState.logs));
  }, [appState.logs]);

  useEffect(() => {
    localStorage.setItem('study_tracker_plans', JSON.stringify(appState.plans));
  }, [appState.plans]);

  useEffect(() => {
    localStorage.setItem('study_tracker_exams', JSON.stringify(appState.exams));
  }, [appState.exams]);

  const uploadLogsIfConnected = async (logs: StudyLog[]) => {
    if (!gasUrl) return;

    setSyncStatus('syncing');
    try {
      await syncLogsToSheet(gasUrl, logs);
      setSyncStatus('synced');
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
      triggerToast('Study logs could not be synced.', 'error');
    }
  };

  const uploadPlansIfConnected = async (plans: StudyPlan[]) => {
    if (!gasUrl) return;

    setSyncStatus('syncing');
    try {
      await syncPlansToSheet(gasUrl, plans);
      setSyncStatus('synced');
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
      triggerToast('Study plans could not be synced.', 'error');
    }
  };

  const uploadExamsIfConnected = async (exams: Exam[]) => {
    if (!gasUrl) return;

    setSyncStatus('syncing');
    try {
      await syncExamsToSheet(gasUrl, exams);
      setSyncStatus('synced');
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
      triggerToast('Exam countdowns could not be synced.', 'error');
    }
  };

  const handleAddLog = (newLog: StudyLog) => {
    const updatedLogs = [newLog, ...appState.logs];
    setAppState((prev) => ({ ...prev, logs: updatedLogs }));
    triggerToast(`Saved ${newLog.subject} study record.`, 'success');
    uploadLogsIfConnected(updatedLogs);
  };

  const handleDeleteLog = (id: string) => {
    const updatedLogs = appState.logs.filter((log) => log.id !== id);
    setAppState((prev) => ({ ...prev, logs: updatedLogs }));
    triggerToast('Study record removed.', 'info');
    uploadLogsIfConnected(updatedLogs);
  };

  const handleAddPlan = (newPlan: StudyPlan) => {
    const updatedPlans = [...appState.plans, newPlan];
    setAppState((prev) => ({ ...prev, plans: updatedPlans }));
    triggerToast(`Added ${newPlan.month} plan for ${newPlan.subject}.`, 'success');
    uploadPlansIfConnected(updatedPlans);
  };

  const handleDeletePlan = (id: string) => {
    const updatedPlans = appState.plans.filter((plan) => plan.id !== id);
    setAppState((prev) => ({ ...prev, plans: updatedPlans }));
    triggerToast('Study plan removed.', 'info');
    uploadPlansIfConnected(updatedPlans);
  };

  const handleAddExam = (newExam: Exam) => {
    const updatedExams = [...appState.exams, newExam];
    setAppState((prev) => ({ ...prev, exams: updatedExams }));
    triggerToast(`Added countdown for ${newExam.name}.`, 'success');
    uploadExamsIfConnected(updatedExams);
  };

  const handleDeleteExam = (id: string) => {
    const updatedExams = appState.exams.filter((exam) => exam.id !== id);
    setAppState((prev) => ({ ...prev, exams: updatedExams }));
    triggerToast('Exam countdown removed.', 'info');
    uploadExamsIfConnected(updatedExams);
  };

  const handleUpdateExam = (updatedExam: Exam) => {
    const updatedExams = appState.exams.map((exam) => (exam.id === updatedExam.id ? updatedExam : exam));
    setAppState((prev) => ({ ...prev, exams: updatedExams }));
    triggerToast(`Updated countdown for ${updatedExam.name}.`, 'success');
    uploadExamsIfConnected(updatedExams);
  };

  return (
    <div className="min-h-screen bg-natural-bg font-sans text-natural-text flex flex-col items-center justify-center py-0 px-0 md:py-10 md:px-4" id="study-app-wrapper">
      <div
        className="relative w-full max-w-full md:max-w-[465px] h-screen md:h-[860px] bg-natural-card border-0 md:border border-natural-border rounded-none md:rounded-[38px] shadow-none md:shadow-lg flex flex-col overflow-hidden"
        id="applet-frame"
      >
        <div className="hidden md:flex absolute top-0 inset-x-0 h-6 bg-natural-light border-b border-natural-border/30 items-center justify-center z-45" id="frame-speaker-notch">
          <div className="w-24 h-2.5 bg-natural-border/60 rounded-b-md" />
        </div>

        <header className="bg-natural-light pt-4 md:pt-8 pb-4 px-6 flex items-center justify-between border-b border-natural-border" id="applet-header">
          <div className="flex items-center space-x-2">
            <div className="bg-natural-primary/10 text-natural-primary p-1.5 rounded-xl border border-natural-primary/15">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-serif italic text-natural-primary">Studio</h1>
              <span className="text-[9px] text-natural-text/60 block -mt-0.5 font-bold uppercase tracking-widest">StudyRecord</span>
            </div>
          </div>

          <div className="flex items-center space-x-1" id="sync-badge-wrapper">
            {syncStatus === 'syncing' ? (
              <div className="px-2 py-1 rounded-full bg-natural-secondary/15 border border-natural-secondary/20 text-[10px] text-natural-secondary flex items-center space-x-1 animate-pulse font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Syncing</span>
              </div>
            ) : syncStatus === 'synced' ? (
              <div className="px-2 py-0.5 rounded-full bg-natural-primary/15 border border-natural-primary/20 text-[10px] text-natural-primary flex items-center space-x-1 font-medium" title="Connected to Google Apps Script">
                <div className="w-1.5 h-1.5 bg-natural-primary rounded-full animate-pulse" />
                <span>GAS Ready</span>
              </div>
            ) : syncStatus === 'error' ? (
              <div className="px-2 py-0.5 rounded-full bg-red-100 border border-red-200 text-[10px] text-red-700 flex items-center space-x-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Sync Error</span>
              </div>
            ) : (
              <div className="px-2 py-0.5 rounded-full bg-natural-border/40 text-[10px] text-natural-text/70 flex items-center space-x-1 font-medium">
                <span>Local Only</span>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-5.5 py-5 no-scrollbar bg-natural-card pb-24" id="view-viewport">
          {activeTab === 'dashboard' && (
            <div className="space-y-5 animate-fade-in" id="dashboard-tab">
              <Stats logs={appState.logs} onDeleteLog={handleDeleteLog} />
            </div>
          )}

          {activeTab === 'timer' && (
            <Timer logs={appState.logs} onAddLog={handleAddLog} onDeleteLog={handleDeleteLog} />
          )}

          {activeTab === 'planner' && (
            <div className="flex flex-col space-y-6 bg-natural-card" id="planner-tab">
              <Countdown
                exams={appState.exams}
                onAddExam={handleAddExam}
                onDeleteExam={handleDeleteExam}
                onUpdateExam={handleUpdateExam}
              />
              <div className="border-t border-natural-border/40 pt-6">
                <Planner
                  plans={appState.plans}
                  logs={appState.logs}
                  onAddPlan={handleAddPlan}
                  onDeletePlan={handleDeletePlan}
                />
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-5 animate-fade-in" id="database-tab">
              <SheetLink
                gasUrl={gasUrl}
                setGasUrl={setGasUrl}
                localData={appState}
                setLocalData={setAppState}
                onSyncComplete={(msg, type) => triggerToast(msg, type || 'success')}
              />
            </div>
          )}
        </main>

        {toastMessage && (
          <div className="absolute top-18 inset-x-5 z-50 flex justify-center pointer-events-none animate-slide-up" id="global-toast">
            <div
              className={`px-4 py-2.5 rounded-full shadow-md border text-xs flex items-center space-x-2 ${
                toastType === 'success'
                  ? 'bg-natural-primary border-natural-primary text-white'
                  : toastType === 'error'
                    ? 'bg-natural-secondary border-natural-secondary text-white'
                    : 'bg-white border-natural-border text-natural-text'
              }`}
            >
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        <footer className="absolute bottom-0 inset-x-0 bg-natural-light/95 backdrop-blur-md border-t border-natural-border px-4 py-3 pb-5 flex justify-around items-center z-40 rounded-none md:rounded-b-[38px] shadow-sm" id="tabbar-root">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center space-y-1 transition-all cursor-pointer ${
              activeTab === 'dashboard' ? 'text-natural-primary font-bold scale-103' : 'text-natural-text/50 hover:text-natural-primary'
            }`}
            id="tab-btn-dashboard"
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Home</span>
          </button>

          <button
            onClick={() => setActiveTab('timer')}
            className={`flex flex-col items-center space-y-1 transition-all cursor-pointer ${
              activeTab === 'timer' ? 'text-natural-primary font-bold scale-103' : 'text-natural-text/50 hover:text-natural-primary'
            }`}
            id="tab-btn-timer"
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px]">Timer</span>
          </button>

          <button
            onClick={() => setActiveTab('planner')}
            className={`flex flex-col items-center space-y-1 transition-all cursor-pointer ${
              activeTab === 'planner' ? 'text-natural-primary font-bold scale-103' : 'text-natural-text/50 hover:text-natural-primary'
            }`}
            id="tab-btn-planner"
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px]">Plan</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex flex-col items-center space-y-1 transition-all cursor-pointer ${
              activeTab === 'database' ? 'text-natural-primary font-bold scale-103' : 'text-natural-text/50 hover:text-natural-primary'
            }`}
            id="tab-btn-database"
          >
            <Database className="w-5 h-5" />
            <span className="text-[10px]">Sync</span>
          </button>
        </footer>
      </div>

      <div className="mt-4 hidden md:block text-natural-text/50 text-[11px] font-sans text-center max-w-[420px]" id="desktop-footer">
        StudyRecord keeps local data first and syncs through your Google Apps Script Web App URL when configured.
      </div>
    </div>
  );
}

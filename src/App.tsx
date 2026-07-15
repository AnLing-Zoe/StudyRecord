import { useEffect, useState } from 'react';
import { BrainCircuit, Calendar, Clock, Home, Info } from 'lucide-react';
import { AppState, Exam, StudyLog, StudyPlan } from './types';
import Countdown from './components/Countdown';
import Stats from './components/Stats';
import Timer from './components/Timer';

type ActiveTab = 'dashboard' | 'timer' | 'planner';
type ToastType = 'success' | 'info' | 'error';

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
  const [appState, setAppState] = useState<AppState>(readStoredState);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<ToastType>('info');

  const triggerToast = (msg: string, type: ToastType = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    window.setTimeout(() => setToastMessage(null), 4500);
  };

  useEffect(() => {
    localStorage.setItem('study_tracker_logs', JSON.stringify(appState.logs));
  }, [appState.logs]);

  useEffect(() => {
    localStorage.setItem('study_tracker_plans', JSON.stringify(appState.plans));
  }, [appState.plans]);

  useEffect(() => {
    localStorage.setItem('study_tracker_exams', JSON.stringify(appState.exams));
  }, [appState.exams]);

  const handleAddLog = (newLog: StudyLog) => {
    const updatedLogs = [newLog, ...appState.logs];
    setAppState((prev) => ({ ...prev, logs: updatedLogs }));
    triggerToast(`Saved ${newLog.subject} study record.`, 'success');
  };

  const handleDeleteLog = (id: string) => {
    const updatedLogs = appState.logs.filter((log) => log.id !== id);
    setAppState((prev) => ({ ...prev, logs: updatedLogs }));
    triggerToast('Study record removed.', 'info');
  };

  const handleAddPlan = (newPlan: StudyPlan) => {
    const updatedPlans = [...appState.plans, newPlan];
    setAppState((prev) => ({ ...prev, plans: updatedPlans }));
    triggerToast(`Added ${newPlan.month} plan for ${newPlan.subject}.`, 'success');
  };

  const handleDeletePlan = (id: string) => {
    const updatedPlans = appState.plans.filter((plan) => plan.id !== id);
    setAppState((prev) => ({ ...prev, plans: updatedPlans }));
    triggerToast('Study plan removed.', 'info');
  };

  const handleAddExam = (newExam: Exam) => {
    const updatedExams = [...appState.exams, newExam];
    setAppState((prev) => ({ ...prev, exams: updatedExams }));
    triggerToast(`Added countdown for ${newExam.name}.`, 'success');
  };

  const handleDeleteExam = (id: string) => {
    const updatedExams = appState.exams.filter((exam) => exam.id !== id);
    setAppState((prev) => ({ ...prev, exams: updatedExams }));
    triggerToast('Exam countdown removed.', 'info');
  };

  const handleUpdateExam = (updatedExam: Exam) => {
    const updatedExams = appState.exams.map((exam) => (exam.id === updatedExam.id ? updatedExam : exam));
    setAppState((prev) => ({ ...prev, exams: updatedExams }));
    triggerToast(`Updated countdown for ${updatedExam.name}.`, 'success');
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

        <header className="pt-4 md:pt-8 pb-4 px-6 flex items-center justify-between" id="applet-header">
          <div className="flex items-center space-x-2">
            <div className="bg-natural-primary/10 text-natural-primary p-1.5 rounded-xl border border-natural-primary/15">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-serif italic text-natural-primary">Studio</h1>
              <span className="text-[9px] text-natural-text/60 block -mt-0.5 font-bold uppercase tracking-widest">StudyRecord</span>
            </div>
          </div>

        </header>

        <main className="flex-1 overflow-y-auto px-5.5 py-5 no-scrollbar bg-natural-card pb-24" id="view-viewport">
          {activeTab === 'dashboard' && (
            <div className="space-y-5 animate-view" id="dashboard-tab">
              <Stats logs={appState.logs} onDeleteLog={handleDeleteLog} />
            </div>
          )}

          {activeTab === 'timer' && (
            <Timer logs={appState.logs} onAddLog={handleAddLog} onDeleteLog={handleDeleteLog} />
          )}

          {activeTab === 'planner' && (
            <div className="flex flex-col space-y-6 bg-natural-card animate-view" id="planner-tab">
              <Countdown
                exams={appState.exams}
                onAddExam={handleAddExam}
                onDeleteExam={handleDeleteExam}
                onUpdateExam={handleUpdateExam}
              />
            </div>
          )}

        </main>

        {toastMessage && (
          <div className="absolute top-18 inset-x-5 z-50 flex justify-center pointer-events-none toast-enter" id="global-toast" role="status" aria-live="polite">
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

        <footer className="absolute bottom-0 inset-x-0 px-4 py-3 pb-5 flex justify-around items-center z-40 rounded-none md:rounded-b-[38px]" id="tabbar-root" aria-label="主要導覽">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`tab-button flex flex-col items-center space-y-1 cursor-pointer ${
              activeTab === 'dashboard' ? 'text-natural-primary font-bold scale-103' : 'text-natural-text/50 hover:text-natural-primary'
            }`}
            id="tab-btn-dashboard"
            aria-current={activeTab === 'dashboard' ? 'page' : undefined}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Home</span>
          </button>

          <button
            onClick={() => setActiveTab('timer')}
            className={`tab-button flex flex-col items-center space-y-1 cursor-pointer ${
              activeTab === 'timer' ? 'text-natural-primary font-bold scale-103' : 'text-natural-text/50 hover:text-natural-primary'
            }`}
            id="tab-btn-timer"
            aria-current={activeTab === 'timer' ? 'page' : undefined}
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px]">Timer</span>
          </button>

          <button
            onClick={() => setActiveTab('planner')}
            className={`tab-button flex flex-col items-center space-y-1 cursor-pointer ${
              activeTab === 'planner' ? 'text-natural-primary font-bold scale-103' : 'text-natural-text/50 hover:text-natural-primary'
            }`}
            id="tab-btn-planner"
            aria-current={activeTab === 'planner' ? 'page' : undefined}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px]">Plan</span>
          </button>

        </footer>
      </div>

      <div className="mt-4 hidden md:block text-natural-text/50 text-[11px] font-sans text-center max-w-[420px]" id="desktop-footer">
        StudyRecord keeps your data stored locally in your browser.
      </div>
    </div>
  );
}

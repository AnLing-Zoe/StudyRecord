import { useEffect, useRef, useState } from 'react';
import { BrainCircuit, Calendar, Clock, Home, Info, RefreshCw } from 'lucide-react';
import { mutateData, loadData } from './api';
import { AppState, Exam, StudyLog } from './types';
import Countdown from './components/Countdown';
import Stats from './components/Stats';
import Timer from './components/Timer';

type ActiveTab = 'dashboard' | 'timer' | 'planner';
type ToastType = 'success' | 'info' | 'error';

const emptyState: AppState = { logs: [], subjects: [], exams: [] };

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [appState, setAppState] = useState<AppState>(emptyState);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<ToastType>('info');
  const toastTimeoutRef = useRef<number | null>(null);

  const triggerToast = (message: string, type: ToastType = 'info') => {
    if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    setToastType(type);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 4500);
  };

  const refresh = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setAppState(await loadData());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '無法讀取 Google Sheets。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    return () => {
      if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const mutate = async (
    action: Parameters<typeof mutateData>[0],
    payload: Parameters<typeof mutateData>[1],
    successMessage: string,
  ) => {
    try {
      setAppState(await mutateData(action, payload));
      triggerToast(successMessage, 'success');
      return true;
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Google Sheets 操作失敗。', 'error');
      return false;
    }
  };

  const handleAddLog = (log: StudyLog) =>
    mutate('addLog', log, `已儲存「${log.subject}」讀書紀錄。`);

  const handleDeleteLog = (id: string) =>
    mutate('deleteLog', { id }, '已刪除讀書紀錄。');

  const handleAddSubject = (subject: string) =>
    mutate('addSubject', { subject }, `已新增「${subject}」科目。`);

  const handleDeleteSubject = (id: string) =>
    mutate('deleteSubject', { id }, '已刪除讀書科目。');

  const handleAddExam = (exam: Exam) =>
    mutate('addExam', exam, `已新增「${exam.name}」倒數。`);

  const handleDeleteExam = (id: string) =>
    mutate('deleteExam', { id }, '已刪除考試倒數。');

  const handleUpdateExam = (exam: Exam) =>
    mutate('updateExam', exam, `已更新「${exam.name}」倒數。`);

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
          <button
            type="button"
            onClick={() => void refresh()}
            className="p-2 rounded-xl text-natural-text/50 hover:text-natural-primary hover:bg-natural-primary/5 transition-ui cursor-pointer"
            aria-label="重新載入 Google Sheets 資料"
            title="重新載入資料"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-5.5 py-5 no-scrollbar bg-natural-card pb-24" id="view-viewport">
          {loadError && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700" role="alert">
              <p className="font-bold">無法連線 Google Sheets</p>
              <p className="mt-1 break-words">{loadError}</p>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-5 animate-view" id="dashboard-tab">
              <Stats logs={appState.logs} onDeleteLog={handleDeleteLog} />
            </div>
          )}

          {activeTab === 'timer' && (
            <Timer
              subjects={appState.subjects}
              onAddLog={handleAddLog}
              onAddSubject={handleAddSubject}
              onDeleteSubject={handleDeleteSubject}
            />
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
            <div className={`px-4 py-2.5 rounded-full shadow-md border text-xs flex items-center space-x-2 ${
              toastType === 'success'
                ? 'bg-natural-primary border-natural-primary text-white'
                : toastType === 'error'
                  ? 'bg-red-600 border-red-600 text-white'
                  : 'bg-white border-natural-border text-natural-text'
            }`}>
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        <footer className="absolute bottom-0 inset-x-0 px-4 py-3 pb-5 flex justify-around items-center z-40 rounded-none md:rounded-b-[38px]" id="tabbar-root" aria-label="主要導覽">
          {([
            ['dashboard', Home, '首頁'],
            ['timer', Clock, '計時'],
            ['planner', Calendar, '考程'],
          ] as const).map(([tab, Icon, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab-button flex flex-col items-center space-y-1 cursor-pointer ${
                activeTab === tab ? 'text-natural-primary font-bold scale-103' : 'text-natural-text/50 hover:text-natural-primary'
              }`}
              aria-current={activeTab === tab ? 'page' : undefined}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{label}</span>
            </button>
          ))}
        </footer>
      </div>

      <div className="mt-4 hidden md:block text-natural-text/50 text-[11px] font-sans text-center max-w-[420px]">
        資料由 Google Sheets 儲存與同步。
      </div>
    </div>
  );
}

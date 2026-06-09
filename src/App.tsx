import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { StudyLog, StudyPlan, Exam, AppState } from './types';
import { initAuth, setAccessToken } from './firebase';
import { fetchSpreadsheetData, syncAllDataToSheet } from './sheets';
import Timer from './components/Timer';
import Planner from './components/Planner';
import Countdown from './components/Countdown';
import Stats from './components/Stats';
import SheetLink from './components/SheetLink';
import { 
  Home, 
  Clock, 
  Calendar, 
  Database, 
  RefreshCw, 
  CloudCheck, 
  AlertCircle, 
  Info,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  BrainCircuit
} from 'lucide-react';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'timer' | 'planner'>('dashboard');

  // Auth and Sheets linkage
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setLocalAccessToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => {
    return localStorage.getItem('study_tracker_sheet_id');
  });

  // App core data state
  const [appState, setAppState] = useState<AppState>(() => {
    const savedLogs = localStorage.getItem('study_tracker_logs');
    const savedPlans = localStorage.getItem('study_tracker_plans');
    const savedExams = localStorage.getItem('study_tracker_exams');

    // Default mock initial data if there is absolutely nothing in local storage to guide new users nicely
    const initialLogs: StudyLog[] = [
      { id: '1', date: new Date().toISOString().split('T')[0], subject: '英文', duration: 45, notes: '背誦了英文考古題單字，以及閱讀了一篇外電' },
      { id: '2', date: new Date().toISOString().split('T')[0], subject: '數學', duration: 60, notes: '練習了三角函數的定理與微積分入門複習' }
    ];

    const initialPlans: StudyPlan[] = [
      { id: '1', month: new Date().toISOString().slice(0, 7), subject: '英文', targetHours: 20 },
      { id: '2', month: new Date().toISOString().slice(0, 7), subject: '數學', targetHours: 35 }
    ];

    const initialExams: Exam[] = [
      { id: '1', name: '全台模擬測驗 / 統測考試', date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 35).toISOString().split('T')[0] }
    ];

    return {
      logs: savedLogs ? JSON.parse(savedLogs) : initialLogs,
      plans: savedPlans ? JSON.parse(savedPlans) : initialPlans,
      exams: savedExams ? JSON.parse(savedExams) : initialExams,
    };
  });

  // UI States
  const [syncStatus, setSyncStatus] = useState<'offline' | 'syncing' | 'synced' | 'error'>('offline');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('info');

  // Toast trigger helper
  const triggerToast = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Sync state token handler
  const setAccessTokenWrapper = (token: string | null) => {
    setLocalAccessToken(token);
    setAccessToken(token);
  };

  // Initialize Auth state on mounted
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessTokenWrapper(token);
        setSyncStatus('synced');
        triggerToast(`歡迎回來，${currentUser.displayName || '讀書戰友'}！`, 'success');
      },
      () => {
        // Auth failed or logged out
        setUser(null);
        setAccessTokenWrapper(null);
        setSyncStatus('offline');
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch initial sheets data if user is logged in & spreadsheetId exists
  useEffect(() => {
    const loadInitialSheetsData = async () => {
      if (accessToken && spreadsheetId) {
        setSyncStatus('syncing');
        try {
          const cloudData = await fetchSpreadsheetData(spreadsheetId, accessToken);
          setAppState(cloudData);
          setSyncStatus('synced');
          triggerToast('讀書進度已順利同步線上試算表！', 'success');
        } catch (err: any) {
          console.error('Initial sheets fetch failed:', err);
          setSyncStatus('error');
          // If sheets fetch fails, we retain local storage mode
          triggerToast('試算表讀取失敗，已啟用本機暫存模式作戰。', 'error');
        }
      }
    };
    loadInitialSheetsData();
  }, [accessToken, spreadsheetId]);

  // Synchronize state changes to local storage
  useEffect(() => {
    localStorage.setItem('study_tracker_logs', JSON.stringify(appState.logs));
  }, [appState.logs]);

  useEffect(() => {
    localStorage.setItem('study_tracker_plans', JSON.stringify(appState.plans));
  }, [appState.plans]);

  useEffect(() => {
    localStorage.setItem('study_tracker_exams', JSON.stringify(appState.exams));
  }, [appState.exams]);


  // Helper: Triggers automatic Sheets upload
  const uploadToSheetsIfConnected = async (newState: AppState) => {
    if (spreadsheetId && accessToken) {
      setSyncStatus('syncing');
      try {
        await syncAllDataToSheet(spreadsheetId, accessToken, newState);
        setSyncStatus('synced');
      } catch (err: any) {
        console.error(err);
        setSyncStatus('error');
        triggerToast('雲端伺服器連線受限制，異動已安全備份至本機！', 'error');
      }
    }
  };

  // Log CRUD
  const handleAddLog = (newLog: StudyLog) => {
    const updatedLogs = [newLog, ...appState.logs];
    const newState = { ...appState, logs: updatedLogs };
    setAppState(newState);
    triggerToast(`成功記錄「${newLog.subject}」研讀時數！`, 'success');
    uploadToSheetsIfConnected(newState);
  };

  const handleDeleteLog = (id: string) => {
    const updatedLogs = appState.logs.filter(log => log.id !== id);
    const newState = { ...appState, logs: updatedLogs };
    setAppState(newState);
    triggerToast('已刪除此研讀記錄', 'info');
    uploadToSheetsIfConnected(newState);
  };

  // Plan CRUD
  const handleAddPlan = (newPlan: StudyPlan) => {
    const updatedPlans = [...appState.plans, newPlan];
    const newState = { ...appState, plans: updatedPlans };
    setAppState(newState);
    triggerToast(`成功新增 ${newPlan.month} 月之「${newPlan.subject}」讀書目標！`, 'success');
    uploadToSheetsIfConnected(newState);
  };

  const handleDeletePlan = (id: string) => {
    const updatedPlans = appState.plans.filter(p => p.id !== id);
    const newState = { ...appState, plans: updatedPlans };
    setAppState(newState);
    triggerToast('已移除該科目計畫目標', 'info');
    uploadToSheetsIfConnected(newState);
  };

  // Exam CRUD
  const handleAddExam = (newExam: Exam) => {
    const updatedExams = [...appState.exams, newExam];
    const newState = { ...appState, exams: updatedExams };
    setAppState(newState);
    triggerToast(`「${newExam.name}」已加入您的倒數計畫！`, 'success');
    uploadToSheetsIfConnected(newState);
  };

  const handleDeleteExam = (id: string) => {
    const updatedExams = appState.exams.filter(e => e.id !== id);
    const newState = { ...appState, exams: updatedExams };
    setAppState(newState);
    triggerToast('已刪除此考試考程。', 'info');
    uploadToSheetsIfConnected(newState);
  };

  const handleUpdateExam = (updatedExam: Exam) => {
    const updatedExams = appState.exams.map(e => e.id === updatedExam.id ? updatedExam : e);
    const newState = { ...appState, exams: updatedExams };
    setAppState(newState);
    triggerToast(`「${updatedExam.name}」已成功更新！`, 'success');
    uploadToSheetsIfConnected(newState);
  };

  // Calculate high-level stats for Dashboard
  const getExamCountdown = (): number | null => {
    if (appState.exams.length === 0) return null;
    const sortedActiveExams = appState.exams
      .map(e => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const examDate = new Date(e.date);
        examDate.setHours(0,0,0,0);
        return { ...e, diff: Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) };
      })
      .filter(e => e.diff >= 0)
      .sort((a,b) => a.diff - b.diff);

    return sortedActiveExams[0]?.diff ?? null;
  };

  const primaryExamName = (): string => {
    if (appState.exams.length === 0) return '倒數日';
    const sortedActiveExams = appState.exams
      .map(e => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const examDate = new Date(e.date);
        examDate.setHours(0,0,0,0);
        return { ...e, diff: Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) };
      })
      .filter(e => e.diff >= 0)
      .sort((a,b) => a.diff - b.diff);

    return sortedActiveExams[0]?.name ?? '讀書倒數';
  };

  const daysLeft = getExamCountdown();

  return (
    <div className="min-h-screen bg-natural-bg font-sans text-natural-text flex flex-col items-center justify-center py-0 px-0 md:py-10 md:px-4" id="study-app-wrapper">
      
      {/* Visual mobile app chassis wrapper */}
      <div 
        className="relative w-full max-w-full md:max-w-[465px] h-screen md:h-[860px] bg-natural-card border-0 md:border border-natural-border rounded-none md:rounded-[38px] shadow-none md:shadow-lg flex flex-col overflow-hidden"
        id="applet-frame"
      >
        {/* Notch container */}
        <div className="hidden md:flex absolute top-0 inset-x-0 h-6 bg-natural-light border-b border-natural-border/30 items-center justify-center z-45" id="frame-speaker-notch">
          <div className="w-24 h-2.5 bg-natural-border/60 rounded-b-md" />
        </div>

        {/* Header toolbar */}
        <header className="bg-natural-light pt-4 md:pt-8 pb-4 px-6 flex items-center justify-between border-b border-natural-border" id="applet-header">
          <div className="flex items-center space-x-2">
            <div className="bg-natural-primary/10 text-natural-primary p-1.5 rounded-xl border border-natural-primary/15">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-serif italic text-natural-primary">
                Studio
              </h1>
              <span className="text-[9px] text-natural-text/60 block -mt-0.5 font-bold uppercase tracking-widest">讀好書，上好學</span>
            </div>
          </div>

          {/* Sync indicator */}
          <div className="flex items-center space-x-1" id="sync-badge-wrapper">
            {syncStatus === 'syncing' ? (
              <div className="px-2 py-1 rounded-full bg-natural-secondary/15 border border-natural-secondary/20 text-[10px] text-natural-secondary flex items-center space-x-1 animate-pulse font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>同步中</span>
              </div>
            ) : syncStatus === 'synced' ? (
              <div className="px-2 py-0.5 rounded-full bg-natural-primary/15 border border-natural-primary/20 text-[10px] text-natural-primary flex items-center space-x-1 font-medium" title="試算表連線成功">
                <div className="w-1.5 h-1.5 bg-natural-primary rounded-full animate-pulse" />
                <span>已在雲端</span>
              </div>
            ) : syncStatus === 'error' ? (
              <div className="px-2 py-0.5 rounded-full bg-red-100 border border-red-200 text-[10px] text-red-700 flex items-center space-x-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>同步失敗</span>
              </div>
            ) : (
              <div className="px-2 py-0.5 rounded-full bg-natural-border/40 text-[10px] text-natural-text/70 flex items-center space-x-1 font-medium">
                <span>本機模式</span>
              </div>
            )}
          </div>
        </header>

        {/* Main interactive screen workspace */}
        <main className="flex-1 overflow-y-auto px-5.5 py-5 no-scrollbar bg-natural-card pb-24" id="view-viewport font-sans">
          {activeTab === 'dashboard' && (
            <div className="space-y-5 animate-fade-in" id="dashboard-tab">
              {/* Core Statistics Dash */}
              <Stats logs={appState.logs} onDeleteLog={handleDeleteLog} />
            </div>
          )}

          {activeTab === 'timer' && (
            <Timer 
              logs={appState.logs} 
              onAddLog={handleAddLog} 
              onDeleteLog={handleDeleteLog} 
            />
          )}

          {activeTab === 'planner' && (
            <div className="flex flex-col space-y-6 bg-natural-card" id="planner-tab">
              <Countdown 
                exams={appState.exams} 
                onAddExam={handleAddExam} 
                onDeleteExam={handleDeleteExam} 
                onUpdateExam={handleUpdateExam}
              />
            </div>
          )}
        </main>

        {/* Global Floating Toast Banner */}
        {toastMessage && (
          <div className="absolute top-18 inset-x-5 z-50 flex justify-center pointer-events-none animate-slide-up" id="global-toast">
            <div className={`px-4 py-2.5 rounded-full shadow-md border text-xs flex items-center space-x-2 ${
              toastType === 'success' 
                ? 'bg-natural-primary border-natural-primary text-white' 
                : toastType === 'error' 
                ? 'bg-natural-secondary border-natural-secondary text-white' 
                : 'bg-white border-natural-border text-natural-text'
            }`}>
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        {/* Bottom Tab Layout Frame */}
        <footer className="absolute bottom-0 inset-x-0 bg-natural-light/95 backdrop-blur-md border-t border-natural-border px-4 py-3 pb-5 flex justify-around items-center z-40 rounded-none md:rounded-b-[38px] shadow-sm" id="tabbar-root">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center space-y-1 transition-all cursor-pointer ${
              activeTab === 'dashboard' ? 'text-natural-primary font-bold scale-103' : 'text-natural-text/50 hover:text-natural-primary'
            }`}
            id="tab-btn-dashboard"
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">儀錶板</span>
          </button>

          <button
            onClick={() => setActiveTab('timer')}
            className={`flex flex-col items-center space-y-1 transition-all cursor-pointer ${
              activeTab === 'timer' ? 'text-natural-primary font-bold scale-103' : 'text-natural-text/50 hover:text-natural-primary'
            }`}
            id="tab-btn-timer"
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px]">番茄鐘</span>
          </button>

          <button
            onClick={() => setActiveTab('planner')}
            className={`flex flex-col items-center space-y-1 transition-all cursor-pointer ${
              activeTab === 'planner' ? 'text-natural-primary font-bold scale-103' : 'text-natural-text/50 hover:text-natural-primary'
            }`}
            id="tab-btn-planner"
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px]">To-Day</span>
          </button>
        </footer>
      </div>

      {/* Desktop Helper Sidebar panel indicator */}
      <div className="mt-4 hidden md:block text-natural-text/50 text-[11px] font-sans text-center max-w-[420px]" id="desktop-footer">
        建議將此頁面加入書籤或安裝為捷徑。本 App 專為<b>手機與平板</b>量身打造，您也可使用電腦或大螢幕網頁隨時同步閱讀考程與時數進度。
      </div>
    </div>
  );
}

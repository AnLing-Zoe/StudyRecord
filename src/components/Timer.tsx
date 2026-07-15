import React, { useState, useEffect, useRef } from 'react';
import { StudyLog } from '../types';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Save, 
  BookOpen, 
  Clock, 
  Compass, 
  ChevronRight, 
  CheckCircle,
  HelpCircle,
  FileText
} from 'lucide-react';

interface TimerProps {
  logs: StudyLog[];
  onAddLog: (log: StudyLog) => void;
  onDeleteLog: (id: string) => void;
}

export default function Timer({ logs, onAddLog, onDeleteLog }: TimerProps) {
  // Timer States
  const [timerMode, setTimerMode] = useState<'stopwatch' | 'pomodoro'>('stopwatch');
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [pomoMinutes, setPomoMinutes] = useState(25); // current setting
  const [pomoTimeLeft, setPomoTimeLeft] = useState(25 * 60); // in seconds
  const [activeSubject, setActiveSubject] = useState('國文');
  const [customSubject, setCustomSubject] = useState('');

  // Recording Logs State
  const [notes, setNotes] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveMinutes, setSaveMinutes] = useState(0);

  // Manual Log State
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualSubject, setManualSubject] = useState('國文');
  const [manualCustomSubject, setManualCustomSubject] = useState('');
  const [manualDuration, setManualDuration] = useState('');
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualNotes, setManualNotes] = useState('');

  // Refs for timers
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const elapsedAtStartRef = useRef<number>(0);
  const targetEndTimeRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);

  const subjectsPool = ['國文', '英文', '數學', '物理', '化學', '生物', '歷史', '地理', '程式設計', '專業科目', '其他'];

  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
      osc.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.log('Audio contextual alert failed');
    }
  };

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await (navigator.wakeLock as any).request('screen');
      }
    } catch (err) {
      console.log('Wake Lock request failed:', err);
    }
  };

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch (err) {
      console.log('Wake Lock release failed:', err);
    }
  };

  // Handle Tick and Wake Lock
  useEffect(() => {
    if (isPlaying) {
      // Setup initial timestamps
      if (timerMode === 'stopwatch') {
        startTimeRef.current = Date.now();
        elapsedAtStartRef.current = elapsedTime;
      } else {
        targetEndTimeRef.current = Date.now() + pomoTimeLeft * 1000;
      }

      requestWakeLock();

      const updateClocks = () => {
        if (timerMode === 'stopwatch') {
          if (startTimeRef.current !== null) {
            const secondsPassed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            setElapsedTime(elapsedAtStartRef.current + secondsPassed);
          }
        } else {
          if (targetEndTimeRef.current !== null) {
            const timeLeft = Math.max(0, Math.round((targetEndTimeRef.current - Date.now()) / 1000));
            setPomoTimeLeft(timeLeft);

            if (timeLeft <= 0) {
              setIsPlaying(false);
              releaseWakeLock();
              playAlertSound();
              alert('🍅 番茄鐘時間到！辛苦了，休息一下吧！');
              triggerSaveDialogue(pomoMinutes);
              setPomoTimeLeft(pomoMinutes * 60);
            }
          }
        }
      };

      // Also listen to visibility changes to sync clocks instantly and re-acquire wake lock
      const handleVisibilityChangeSync = () => {
        if (document.visibilityState === 'visible') {
          updateClocks();
          requestWakeLock();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChangeSync);

      intervalRef.current = setInterval(updateClocks, 500); // Check every 500ms for more precision

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        document.removeEventListener('visibilitychange', handleVisibilityChangeSync);
      };
    } else {
      releaseWakeLock();
      startTimeRef.current = null;
      targetEndTimeRef.current = null;
    }
  }, [isPlaying, timerMode, pomoMinutes]);

  // Clean-up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      releaseWakeLock();
    };
  }, []);

  // Format seconds to string HH:MM:SS / MM:SS
  const formatTimeStr = (totalSeconds: number): string => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const currentSubjectName = activeSubject === '其他' && customSubject.trim() ? customSubject.trim() : activeSubject;

  const handleStartPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    if (window.confirm('確定要歸零計時器嗎？目前累積的時間將不會被保存。')) {
      setIsPlaying(false);
      setElapsedTime(0);
      setPomoTimeLeft(pomoMinutes * 60);
    }
  };

  const triggerSaveDialogue = (mins: number) => {
    setSaveMinutes(mins);
    setShowSaveModal(true);
  };

  const handleStopwatchSave = () => {
    // Calculatelog duration
    const mins = Math.max(1, Math.round(elapsedTime / 60));
    setIsPlaying(false);
    triggerSaveDialogue(mins);
  };

  const handleSaveModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSubject = currentSubjectName;

    const log: StudyLog = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      subject: finalSubject,
      duration: saveMinutes,
      notes: notes.trim(),
    };

    onAddLog(log);
    setNotes('');
    setShowSaveModal(false);
    setElapsedTime(0);
    setPomoTimeLeft(pomoMinutes * 60);
  };

  // Manual logging submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSubject = manualSubject === '其他' && manualCustomSubject.trim() ? manualCustomSubject.trim() : manualSubject;
    const durMins = parseInt(manualDuration);

    if (isNaN(durMins) || durMins <= 0) {
      alert('請輸入有效的讀書時數。');
      return;
    }

    const log: StudyLog = {
      id: Math.random().toString(36).substr(2, 9),
      date: manualDate,
      subject: finalSubject,
      duration: durMins,
      notes: manualNotes.trim(),
    };

    onAddLog(log);
    setManualDuration('');
    setManualNotes('');
    setManualCustomSubject('');
    setIsManualMode(false);
  };

  return (
    <div className="flex flex-col space-y-4 animate-view text-sm text-natural-text" id="timer-screen">
      {/* Selector: Live timer vs Manual logger */}
      <div className="flex p-1 bg-natural-light border border-natural-border rounded-2xl" id="timer-toggle-bar">
        <button
          onClick={() => setIsManualMode(false)}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-ui cursor-pointer ${
            !isManualMode ? 'bg-natural-primary text-white shadow-sm' : 'text-natural-text/50 hover:text-natural-primary'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>碼錶 / 番茄鐘</span>
        </button>
        <button
          onClick={() => setIsManualMode(true)}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-ui cursor-pointer ${
            isManualMode ? 'bg-natural-primary text-white shadow-sm' : 'text-natural-text/50 hover:text-natural-primary'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>手動紀錄</span>
        </button>
      </div>

      {!isManualMode ? (
        /* LIVE TIMER MODULE */
        <div className="space-y-4" id="live-timer-module">
          {/* Main Ring Panel */}
          <div className="bg-white border border-natural-border p-6 rounded-[32px] flex flex-col items-center text-center space-y-5 shadow-sm" id="timer-console">
            {/* Stopwatch vs Pomodoro header selection */}
            <div className="flex bg-natural-bg border border-natural-border/80 p-0.5 rounded-xl text-xs" id="mode-picker">
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setTimerMode('stopwatch');
                }}
                className={`px-3.5 py-1.5 rounded-lg font-medium transition-ui cursor-pointer ${
                  timerMode === 'stopwatch' ? 'bg-white text-natural-primary border border-natural-border shadow-sm' : 'text-natural-text/55'
                }`}
              >
                標準碼錶
              </button>
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setTimerMode('pomodoro');
                  setPomoTimeLeft(pomoMinutes * 60);
                }}
                className={`px-3.5 py-1.5 rounded-lg font-medium transition-ui cursor-pointer ${
                  timerMode === 'pomodoro' ? 'bg-white text-natural-primary border border-natural-border shadow-sm' : 'text-natural-text/55'
                }`}
              >
                25分番茄鐘
              </button>
            </div>

            {/* Glowing Big Timer Output */}
            <div className="relative py-4 flex items-center justify-center min-h-[140px]" id="timer-digits-wrapper">
              <div className="text-5xl font-black font-serif tracking-tight tabular-nums text-natural-primary">
                {timerMode === 'stopwatch' ? formatTimeStr(elapsedTime) : formatTimeStr(pomoTimeLeft)}
              </div>
            </div>

            {/* Subject Selector within active timer */}
            <div className="w-full space-y-2 text-left" id="timer-subject-area">
              <label className="text-xs font-semibold text-natural-text flex items-center space-x-1">
                <BookOpen className="w-3.5 h-3.5 text-natural-primary" />
                <span>正在研讀科目</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5" id="subject-switches">
                {subjectsPool.slice(0, 8).map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setActiveSubject(sub)}
                    className={`py-1.5 rounded-xl text-xs font-semibold border transition-ui truncate cursor-pointer ${
                      activeSubject === sub 
                        ? 'bg-natural-primary border-natural-primary text-white shadow-md' 
                        : 'bg-natural-bg border-natural-border text-natural-text/70 hover:border-natural-border'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              {/* Subject selector expand */}
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveSubject('其他')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-ui cursor-pointer ${
                    activeSubject === '其他' 
                      ? 'bg-natural-primary border-natural-primary text-white shadow-md' 
                      : 'bg-natural-bg border-natural-border text-natural-text/70'
                  }`}
                >
                  其他自編
                </button>
                {activeSubject === '其他' && (
                  <input
                    type="text"
                    required
                    placeholder="輸入自編科目名稱"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="flex-1 bg-white border border-natural-border rounded-xl px-3 py-1.5 text-xs text-natural-text placeholder-natural-text/40 focus:outline-none focus:border-natural-primary"
                  />
                )}
              </div>
            </div>

            {/* Notes / Remarks Field under the stopwatch */}
            <div className="w-full space-y-2 text-left" id="timer-notes-area">
              <label className="text-xs font-semibold text-natural-text/70 flex items-center space-x-1">
                <FileText className="w-3.5 h-3.5 text-natural-primary" />
                <span>讀書備註 / 心得 (選填)</span>
              </label>
              <textarea
                placeholder="例如：訂正了錯題、背誦重點、寫了考古題 1 回"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-white border border-natural-border text-natural-text px-4 py-2 rounded-2xl text-xs placeholder-natural-text/40 focus:outline-none focus:border-natural-primary resize-none shadow-sm"
                id="live-timer-notes-input"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center space-x-4 w-full pt-2">
              <button
                onClick={handleReset}
                className="p-3 bg-natural-bg hover:bg-natural-light text-natural-text/50 hover:text-natural-text border border-natural-border rounded-full transition-ui cursor-pointer"
                title="歸零"
                id="timer-reset-btn"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                onClick={handleStartPause}
                className={`p-5 rounded-full transition-ui shadow-md cursor-pointer ${
                  isPlaying 
                    ? 'bg-natural-secondary text-white hover:bg-natural-secondary/90' 
                    : 'bg-natural-primary text-white hover:bg-natural-primary/95'
                }`}
                id="timer-play-pause-btn"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
              </button>

              {/* End logging button */}
              {timerMode === 'stopwatch' ? (
                <button
                  onClick={handleStopwatchSave}
                  disabled={elapsedTime < 5}
                  className="p-3 bg-natural-primary/10 hover:bg-natural-primary text-natural-primary hover:text-white border border-natural-primary/20 disabled:opacity-40 disabled:bg-natural-bg disabled:text-natural-text/40 rounded-full transition-ui cursor-pointer"
                  title="存檔此研讀段落"
                  id="timer-save-btn"
                >
                  <Save className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={() => triggerSaveDialogue(25)}
                  className="p-3 bg-natural-primary/10 hover:bg-natural-primary text-natural-primary hover:text-white border border-natural-primary/20 rounded-full transition-ui cursor-pointer"
                  title="將蕃茄鐘存入記錄"
                  id="pomo-save-btn"
                >
                  <Save className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* MANUAL LOG ENTRY MODULE */
        <form onSubmit={handleManualSubmit} className="bg-white border border-natural-border p-5 rounded-[32px] space-y-4 surface-enter shadow-sm" id="manual-form">
          <h3 className="font-semibold text-natural-text font-serif">手動建立讀書紀錄</h3>

          <div className="space-y-3.5">
            {/* Subject Selector */}
            <div>
              <label className="block text-xs font-semibold text-natural-text/70 mb-1.5 flex items-center space-x-1">
                <BookOpen className="w-3.5 h-3.5 text-natural-primary" />
                <span>讀書科目</span>
              </label>
              <select
                value={manualSubject}
                onChange={(e) => setManualSubject(e.target.value)}
                className="w-full bg-white border border-natural-border text-natural-text px-4 py-3 rounded-2xl text-xs focus:outline-none focus:border-natural-primary font-medium"
              >
                {subjectsPool.map((sub) => (
                  <option key={sub} value={sub}>
                     {sub}
                  </option>
                ))}
              </select>

              {manualSubject === '其他' && (
                <input
                  type="text"
                  required
                  placeholder="請輸入科目名稱"
                  value={manualCustomSubject}
                  onChange={(e) => setManualCustomSubject(e.target.value)}
                  className="w-full bg-white border border-natural-border text-natural-text px-4 py-3 rounded-2xl text-xs focus:outline-none focus:border-natural-primary mt-2"
                />
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-natural-text/70 mb-1.5">研讀日期</label>
              <input
                type="date"
                required
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full bg-white border border-natural-border text-natural-text px-4 py-3 rounded-2xl text-xs focus:outline-none focus:border-natural-primary font-medium"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-natural-text/70 mb-1.5">研讀長度 (分鐘)</label>
              <input
                type="number"
                required
                min="1"
                placeholder="例如：60"
                value={manualDuration}
                onChange={(e) => setManualDuration(e.target.value)}
                className="w-full bg-white border border-natural-border text-natural-text px-4 py-3 rounded-2xl text-xs placeholder-natural-text/40 focus:outline-none focus:border-natural-primary font-medium"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-natural-text/70 mb-1.5">讀書筆記 / 心得 (選填)</label>
              <textarea
                placeholder="例如：寫完了微積分 1.2 節習題、背熟了單字 100 個"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                rows={3}
                className="w-full bg-white border border-natural-border text-natural-text px-4 py-3 rounded-2xl text-xs placeholder-natural-text/40 focus:outline-none focus:border-natural-primary resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-natural-primary hover:bg-natural-primary/95 transition-ui text-white font-semibold py-3 rounded-2xl flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <span>儲存此筆紀錄</span>
          </button>
        </form>
      )}

      {/* SAVE RECORD NOTE MODAL */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-[#4a4a40]/30 backdrop-blur-sm flex items-center justify-center p-5 z-50 scrim-enter" id="save-log-modal">
          <form 
            onSubmit={handleSaveModalSubmit}
            className="bg-white border border-natural-border p-6 rounded-[32px] w-full max-w-[380px] space-y-4 shadow-2xl modal-enter text-left"
          >
            <div className="flex items-center space-x-2 text-natural-primary font-bold text-base mb-1 font-serif">
              <CheckCircle className="w-5 h-5" />
              <span>完美結束本次讀書！</span>
            </div>

            <div className="space-y-1 bg-natural-light p-3 rounded-2xl border border-natural-border text-xs text-natural-text/80 font-sans leading-relaxed">
              <p><b>科目：</b> <span className="text-natural-text font-bold">{currentSubjectName}</span></p>
              <p><b>總長度：</b> <span className="text-natural-text font-bold">{saveMinutes} 分鐘</span></p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-natural-text/70 mb-1.5">研讀摘要 / 心得筆記 (選填)</label>
              <textarea
                placeholder="例如：訂正了錯題、背誦重點、寫了考古題 1 回"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-white border border-natural-border text-natural-text px-4 py-3 rounded-2xl text-xs placeholder-natural-text/40 focus:outline-none focus:border-natural-primary resize-none"
              />
            </div>

            <div className="flex space-x-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="flex-1 bg-white hover:bg-neutral-50 border border-natural-border text-natural-text/70 py-3 rounded-2xl text-xs transition-ui cursor-pointer"
              >
                放棄研讀
              </button>
              <button
                type="submit"
                className="flex-1 bg-natural-primary hover:bg-natural-primary/95 text-white py-3 rounded-2xl text-xs font-bold transition-ui cursor-pointer shadow-sm"
              >
                確保留存
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

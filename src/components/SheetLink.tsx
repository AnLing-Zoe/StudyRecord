import React, { useState } from 'react';
import { googleSignIn, logout } from '../firebase';
import { createSpreadsheet, fetchSpreadsheetData, syncAllDataToSheet } from '../sheets';
import { User } from 'firebase/auth';
import { StudyLog, StudyPlan, Exam } from '../types';
import { 
  Database, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  GitBranch, 
  RefreshCw, 
  Check, 
  Copy, 
  ChevronRight,
  LogOut,
  Sparkles
} from 'lucide-react';

interface SheetLinkProps {
  user: User | null;
  setUser: (user: User | null) => void;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  spreadsheetId: string | null;
  setSpreadsheetId: (id: string | null) => void;
  localData: { logs: StudyLog[]; plans: StudyPlan[]; exams: Exam[] };
  setLocalData: (data: { logs: StudyLog[]; plans: StudyPlan[]; exams: Exam[] }) => void;
  onSyncComplete: (message: string) => void;
}

export default function SheetLink({
  user,
  setUser,
  accessToken,
  setAccessToken,
  spreadsheetId,
  setSpreadsheetId,
  localData,
  setLocalData,
  onSyncComplete,
}: SheetLinkProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customSheetId, setCustomSheetId] = useState('');
  const [copied, setCopied] = useState(false);

  // Authenticate user
  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        onSyncComplete('已成功登入 Google 帳號！');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '登入失敗，請重試。');
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      if (window.confirm('確定要登出 Google 帳號嗎？此操作將使試算表連線中斷。')) {
        await logout();
        setUser(null);
        setAccessToken(null);
        setSpreadsheetId(null);
        localStorage.removeItem('study_tracker_sheet_id');
        onSyncComplete('已登出 Google 帳號。');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Automatically create a new Spreadsheet
  const handleCreateNewSheet = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const id = await createSpreadsheet(accessToken);
      setSpreadsheetId(id);
      localStorage.setItem('study_tracker_sheet_id', id);

      // Now sync the existing local data to the sheet so we don't start with empty rows
      await syncAllDataToSheet(id, accessToken, localData);
      onSyncComplete('已在您的 Google 雲端硬碟建立全新讀書追蹤試算表，並成功同步！');
    } catch (err: any) {
      console.error(err);
      setError(err.message || '建立試算表失敗，請重試。');
    } finally {
      setLoading(false);
    }
  };

  // Link an existing Spreadsheet ID / URL
  const handleLinkExistingSheet = async () => {
    if (!accessToken || !customSheetId.trim()) return;
    setLoading(true);
    setError(null);

    let id = customSheetId.trim();
    // Support parsing raw sheet URLs
    if (id.includes('spreadsheets/d/')) {
      const match = id.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        id = match[1];
      }
    }

    try {
      // Validate sheet accessibility by trying to fetch its metadata and data
      const fetched = await fetchSpreadsheetData(id, accessToken);
      setSpreadsheetId(id);
      localStorage.setItem('study_tracker_sheet_id', id);

      // Offer option to merge or complete
      const confirmMerge = window.confirm(
        '已成功找到讀書試算表！\n\n是否要將「線上雲端資料」覆蓋您目前的「本機暫存資料」？\n按「確定」將使用線上資料，按「取消」將使用本機暫存資料覆寫線上。'
      );

      if (confirmMerge) {
        setLocalData(fetched);
        onSyncComplete('已成功串接試算表並載入線上資料！');
      } else {
        await syncAllDataToSheet(id, accessToken, localData);
        onSyncComplete('已成功串接試算表並使用本機資料覆寫線上！');
      }
    } catch (err: any) {
      console.error(err);
      setError('找不到或無法存取此試算表。請確認是否輸入正確的試算表 ID/網址，且此帳號有編輯權限。');
    } finally {
      setLoading(false);
    }
  };

  // Manual Trigger Synchronize All
  const handleManualSync = async () => {
    if (!spreadsheetId || !accessToken) return;
    setLoading(true);
    setError(null);
    try {
      // Pull and fetch current online data
      const response = await fetchSpreadsheetData(spreadsheetId, accessToken);
      
      const confirmSync = window.confirm(
        '雙向同步確認：\n\n按「確定」：將線上的資料與本機進行融合載入。\n按「取消」：僅將您本機最新的異動直接上傳並覆蓋線上 (若有其他裝置異動請點確定)。'
      );

      if (confirmSync) {
        // Merge or replace (here we replace local with online, which is standard Cloud-first approach)
        setLocalData(response);
        onSyncComplete('雙向同步完成！已從 Google 試算表載入最新進度。');
      } else {
        await syncAllDataToSheet(spreadsheetId, accessToken, localData);
        onSyncComplete('同步完成！本機進度已完全發布並覆寫至 Google 試算表。');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '同步失敗，請重試。');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!spreadsheetId) return;
    navigator.clipboard.writeText(spreadsheetId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col space-y-5 animate-fade-in text-sm text-natural-text" id="sheet-link-container">
      {/* Introduction Card */}
      <div className="bg-[#fcfcf9] border border-natural-border p-5 rounded-3xl shadow-sm" id="intro-card">
        <div className="flex items-center space-x-3 mb-3">
          <div className="bg-natural-primary/10 text-natural-primary p-2.5 rounded-2xl">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-natural-text font-serif text-base">Google 試算表整合</h3>
            <p className="text-xs text-natural-text/60">登入後即可將讀書時數與計畫存於線上</p>
          </div>
        </div>
        <p className="text-xs text-natural-text/75 leading-relaxed font-sans">
          整合 Google Sheets API！您不必擔心讀書記錄遺失。您對時數、倒數計畫的每次異動，
          都可即時或多對一儲存在專屬 Google 雲端試算表中。
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-3.5 rounded-2xl flex items-start space-x-2.5 text-red-700 text-xs shadow-sm" id="sheet-error">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Auth Control Block */}
      {!user ? (
        <div className="bg-white border border-natural-border p-6 rounded-3xl text-center space-y-4 shadow-sm" id="auth-inactive">
          <div className="w-12 h-12 bg-natural-light border border-natural-border rounded-full flex items-center justify-center mx-auto text-natural-primary/60">
            <Database className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold font-serif text-natural-text">未連接 Google 雲端帳號</h4>
            <p className="text-xs text-natural-text/60">目前為「本機暫存模式」，登入後即可開啟同步。</p>
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-natural-primary hover:bg-natural-primary/95 text-white active:scale-[0.98] transition-all font-semibold py-3 rounded-2xl flex items-center justify-center space-x-2 cursor-pointer shadow-sm text-xs"
            id="gsi-login-btn"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Database className="w-4 h-4" />
                <span>登入 Google 帳號</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4" id="auth-active">
          {/* Linked Status */}
          <div className="bg-white border border-natural-border p-5 rounded-3xl space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 bg-natural-primary rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-natural-text">Google 雲端已連線</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-natural-text/50 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-xl transition-all border border-natural-border bg-white shadow-xs cursor-pointer"
                title="登出帳號"
                id="gsi-logout-btn"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-3 border-t border-natural-border pt-3">
              {user.photoURL ? (
                <img referrerPolicy="no-referrer" src={user.photoURL} alt={user.displayName || 'user'} className="w-10 h-10 rounded-full border border-natural-border" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-natural-light flex items-center justify-center text-natural-text font-bold border border-natural-border">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-natural-text truncate text-sm font-serif">{user.displayName || '使用者'}</p>
                <p className="text-xs text-natural-text/50 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Sheet ID details / Bindings */}
          {!spreadsheetId ? (
            <div className="bg-white border border-natural-border p-5 rounded-3xl space-y-4 shadow-sm" id="sheet-no-bind">
              <div className="space-y-1">
                <h4 className="font-bold font-serif text-natural-text">設定您的讀書資料庫</h4>
                <p className="text-xs text-natural-text/65">
                  請選擇自動建立一個新試算表，或是綁定已有的 Sheets 試算表。
                </p>
              </div>

              {/* Action 1: Create Spreadsheet */}
              <button
                onClick={handleCreateNewSheet}
                disabled={loading}
                className="w-full bg-natural-light hover:bg-[#eae6db] border border-natural-border active:scale-[0.98] transition-all text-natural-text/90 font-semibold py-3 rounded-2xl flex items-center justify-center space-x-2 cursor-pointer shadow-sm text-xs"
                id="create-new-sheet-btn"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-natural-primary" />
                    <span>自動建立全新試算表</span>
                  </>
                )}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-natural-border"></div>
                <span className="flex-shrink mx-3 text-natural-text/40 text-[10px] uppercase font-bold tracking-wider">或 連結既有試算表</span>
                <div className="flex-grow border-t border-natural-border"></div>
              </div>

              {/* Action 2: Bind ID */}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="輸入試算表 ID 或完整 Sheets 網址"
                  value={customSheetId}
                  onChange={(e) => setCustomSheetId(e.target.value)}
                  className="w-full bg-white border border-natural-border text-natural-text px-4 py-3 rounded-2xl text-xs placeholder-natural-text/40 focus:outline-none focus:border-natural-primary shadow-inner"
                />
                <button
                  onClick={handleLinkExistingSheet}
                  disabled={loading || !customSheetId.trim()}
                  className="w-full bg-natural-primary hover:bg-natural-primary/95 active:scale-[0.98] transition-all text-white font-semibold py-2.5 rounded-2xl flex items-center justify-center space-x-1.5 disabled:opacity-55 disabled:scale-100 cursor-pointer shadow-sm"
                  id="link-existing-sheet-btn"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>連結此試算表</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-natural-border p-5 rounded-3xl space-y-4 shadow-sm" id="sheet-bound">
              <div className="flex items-center space-x-3">
                <div className="bg-natural-primary/10 text-natural-primary p-2.5 rounded-2xl">
                  <Database className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-natural-text font-serif truncate">讀書資料庫連結成功</h4>
                  <p className="text-xs text-natural-text/60 truncate animate-pulse">
                    Google 雲端試算表已完美對中
                  </p>
                </div>
              </div>

              {/* ID Actions */}
              <div className="bg-natural-bg border border-natural-border p-3 rounded-2xl flex items-center justify-between text-xs font-mono shadow-inner">
                <span className="text-natural-text/75 truncate mr-2 flex-1 select-all font-semibold">{spreadsheetId}</span>
                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <button
                    onClick={copyToClipboard}
                    className="p-1.5 bg-white border border-natural-border hover:bg-natural-light rounded-lg text-natural-text/60 hover:text-natural-text transition-all cursor-pointer shadow-sm"
                    title="複製 ID"
                    id="copy-sheet-id"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-natural-primary" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-white border border-natural-border hover:bg-natural-light rounded-lg text-natural-text/60 hover:text-natural-primary transition-all shadow-sm"
                    title="開啟試算表"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Synchronize controls */}
              <div className="flex space-x-2.5 pt-1">
                <button
                  onClick={handleManualSync}
                  disabled={loading}
                  className="flex-1 bg-natural-primary hover:bg-natural-primary/95 text-white active:scale-[0.98] py-3 rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm"
                  id="sync-now-btn"
                >
                  <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
                  <span className="text-xs font-semibold">手動資料同步</span>
                </button>

                <button
                  onClick={() => {
                    if (window.confirm('確定要切斷此試算表的連線嗎？資料將會保留在雲端，但將改回存於本機儲存體。')) {
                      setSpreadsheetId(null);
                      localStorage.removeItem('study_tracker_sheet_id');
                      onSyncComplete('已與此 Google 試算表中斷連線。');
                    }
                  }}
                  className="px-3.5 py-3 bg-white hover:bg-red-50 text-natural-text/50 hover:text-red-500 border border-natural-border rounded-2xl transition-all cursor-pointer shadow-sm"
                  title="斷開試算表"
                  id="disconnect-sheet-btn"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-natural-primary/10 rounded-2xl p-3.5 border border-natural-primary/15 text-[11px] text-natural-text/80 leading-relaxed font-sans">
                💡 <b>小提示：</b> 試算表中已自動規劃 <b>Logs</b> (時數記錄)、<b>Plans</b> (每月計畫) 與 <b>Exams</b> (考試時程) 三個工作表，您可以像使用一般 Excel 般隨意查閱您的資料！
              </div>
            </div>
          )}
        </div>
      )}

      {/* GitHub project notice */}
      <div className="bg-natural-light/60 border border-natural-border p-4.5 rounded-3xl shadow-sm" id="github-notice-card">
        <div className="flex space-x-3">
          <div className="bg-white text-natural-primary p-2.5 border border-natural-border rounded-2xl flex-shrink-0 shadow-sm">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h5 className="font-semibold text-natural-text font-serif text-xs">專案儲存庫 (Github)</h5>
            <p className="text-[11px] text-natural-text/60 mt-1 leading-relaxed font-sans">
              此專案已建立在 Google AI Studio 平台，內建 Git 原始碼。若要導出至您的 GitHub，請點擊右上角設定選單，點選 <b>Export to GitHub</b>，即可一件將本 App 頂級程式碼完整打包至您的個人儲存庫。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

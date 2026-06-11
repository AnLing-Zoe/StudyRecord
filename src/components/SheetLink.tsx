import { useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Copy,
  Database,
  ExternalLink,
  FileCode2,
  Link2,
  LogOut,
  RefreshCw,
  UploadCloud,
} from 'lucide-react';
import { AppState } from '../types';
import { fetchSpreadsheetData, syncAllDataToSheet } from '../sheets';

type ToastType = 'success' | 'info' | 'error';

interface SheetLinkProps {
  gasUrl: string | null;
  setGasUrl: (url: string | null) => void;
  localData: AppState;
  setLocalData: (data: AppState) => void;
  onSyncComplete: (message: string, type?: ToastType) => void;
}

const isLikelyGasUrl = (url: string) =>
  /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(\?.*)?$/.test(url.trim());

export default function SheetLink({
  gasUrl,
  setGasUrl,
  localData,
  setLocalData,
  onSyncComplete,
}: SheetLinkProps) {
  const [urlInput, setUrlInput] = useState(gasUrl || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const normalizedInput = urlInput.trim();
  const hasConfiguredUrl = Boolean(gasUrl);

  const saveUrl = async () => {
    if (!normalizedInput) {
      setError('Please paste your Google Apps Script Web App URL.');
      return;
    }

    if (!isLikelyGasUrl(normalizedInput)) {
      setError('The URL should look like https://script.google.com/macros/s/.../exec');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const cloudData = await fetchSpreadsheetData(normalizedInput);
      setGasUrl(normalizedInput);
      setLocalData(cloudData);
      onSyncComplete('GAS URL connected. Cloud data has been loaded.', 'success');
    } catch (err) {
      console.error(err);
      setError('Could not read data from this GAS URL. Check the deployment access and try again.');
      onSyncComplete('GAS connection failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const pullCloudData = async () => {
    if (!gasUrl) return;

    setLoading(true);
    setError(null);
    try {
      const cloudData = await fetchSpreadsheetData(gasUrl);
      setLocalData(cloudData);
      onSyncComplete('Cloud data loaded into this device.', 'success');
    } catch (err) {
      console.error(err);
      setError('Could not load cloud data from the configured GAS URL.');
      onSyncComplete('Cloud load failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const pushLocalData = async () => {
    if (!gasUrl) return;

    setLoading(true);
    setError(null);
    try {
      await syncAllDataToSheet(gasUrl, localData);
      onSyncComplete('Local data uploaded to Google Sheets.', 'success');
    } catch (err) {
      console.error(err);
      setError('Could not upload local data to the configured GAS URL.');
      onSyncComplete('Cloud upload failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    if (!window.confirm('Disconnect the current GAS URL? Your local records will stay on this device.')) {
      return;
    }

    setGasUrl(null);
    setUrlInput('');
    setError(null);
    onSyncComplete('GAS URL disconnected. StudyRecord is now local only.', 'info');
  };

  const copyUrl = async () => {
    if (!gasUrl) return;
    await navigator.clipboard.writeText(gasUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col space-y-5 animate-fade-in text-sm text-natural-text" id="sheet-link-container">
      <div className="bg-[#fcfcf9] border border-natural-border p-5 rounded-3xl shadow-sm" id="intro-card">
        <div className="flex items-center space-x-3 mb-3">
          <div className="bg-natural-primary/10 text-natural-primary p-2.5 rounded-2xl">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-natural-text font-serif text-base">Cloud Sync</h3>
            <p className="text-xs text-natural-text/60">Connect StudyRecord with a Google Apps Script Web App URL.</p>
          </div>
        </div>
        <p className="text-xs text-natural-text/75 leading-relaxed font-sans">
          StudyRecord no longer asks users to sign in with Google. The app talks to your spreadsheet through the deployed
          Google Apps Script URL, and that script reads or writes the Logs, Plans, and Exams sheets.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-3.5 rounded-2xl flex items-start space-x-2.5 text-red-700 text-xs shadow-sm" id="sheet-error">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white border border-natural-border p-5 rounded-3xl space-y-4 shadow-sm" id="gas-url-card">
        <div className="space-y-1">
          <h4 className="font-bold font-serif text-natural-text">Google Apps Script URL</h4>
          <p className="text-xs text-natural-text/65">
            Paste the deployed Web App URL ending in <span className="font-mono">/exec</span>. You can also set it as
            <span className="font-mono"> VITE_GOOGLE_APP_SCRIPT_URL</span> in your environment file.
          </p>
        </div>

        <div className="space-y-2">
          <input
            type="url"
            placeholder="https://script.google.com/macros/s/.../exec"
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
            className="w-full bg-white border border-natural-border text-natural-text px-4 py-3 rounded-2xl text-xs placeholder-natural-text/40 focus:outline-none focus:border-natural-primary shadow-inner"
            id="gas-url-input"
          />

          <button
            onClick={saveUrl}
            disabled={loading || !normalizedInput}
            className="w-full bg-natural-primary hover:bg-natural-primary/95 active:scale-[0.98] transition-all text-white font-semibold py-3 rounded-2xl flex items-center justify-center space-x-2 disabled:opacity-55 disabled:scale-100 cursor-pointer shadow-sm text-xs"
            id="save-gas-url-btn"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                <span>Save and Test URL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {hasConfiguredUrl && (
        <div className="bg-white border border-natural-border p-5 rounded-3xl space-y-4 shadow-sm" id="sheet-bound">
          <div className="flex items-center space-x-3">
            <div className="bg-natural-primary/10 text-natural-primary p-2.5 rounded-2xl">
              <Check className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-natural-text font-serif truncate">GAS sync is configured</h4>
              <p className="text-xs text-natural-text/60 truncate">Changes will upload through the configured Web App URL.</p>
            </div>
          </div>

          <div className="bg-natural-bg border border-natural-border p-3 rounded-2xl flex items-center justify-between text-xs font-mono shadow-inner">
            <span className="text-natural-text/75 truncate mr-2 flex-1 select-all font-semibold">{gasUrl}</span>
            <div className="flex items-center space-x-1.5 flex-shrink-0">
              <button
                onClick={copyUrl}
                className="p-1.5 bg-white border border-natural-border hover:bg-natural-light rounded-lg text-natural-text/60 hover:text-natural-text transition-all cursor-pointer shadow-sm"
                title="Copy GAS URL"
                id="copy-gas-url"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-natural-primary" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a
                href={gasUrl || undefined}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 bg-white border border-natural-border hover:bg-natural-light rounded-lg text-natural-text/60 hover:text-natural-primary transition-all shadow-sm"
                title="Open GAS URL"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={pullCloudData}
              disabled={loading}
              className="bg-natural-primary hover:bg-natural-primary/95 text-white active:scale-[0.98] py-3 rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm disabled:opacity-60"
              id="pull-cloud-btn"
            >
              <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
              <span className="text-xs font-semibold">Load Cloud</span>
            </button>

            <button
              onClick={pushLocalData}
              disabled={loading}
              className="bg-natural-light hover:bg-[#eae6db] text-natural-text border border-natural-border active:scale-[0.98] py-3 rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm disabled:opacity-60"
              id="push-local-btn"
            >
              <UploadCloud className="w-4 h-4 text-natural-primary" />
              <span className="text-xs font-semibold">Upload Local</span>
            </button>
          </div>

          <button
            onClick={disconnect}
            className="w-full bg-white hover:bg-red-50 text-natural-text/60 hover:text-red-500 border border-natural-border py-2.5 rounded-2xl transition-all cursor-pointer shadow-sm text-xs font-semibold flex items-center justify-center space-x-1.5"
            id="disconnect-gas-url-btn"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Disconnect URL</span>
          </button>
        </div>
      )}

      <div className="bg-natural-light/60 border border-natural-border p-4.5 rounded-3xl shadow-sm" id="gas-help-card">
        <div className="flex space-x-3">
          <div className="bg-white text-natural-primary p-2.5 border border-natural-border rounded-2xl flex-shrink-0 shadow-sm">
            <FileCode2 className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <h5 className="font-semibold text-natural-text font-serif text-xs">How to deploy the script</h5>
            <ol className="text-[11px] text-natural-text/65 leading-relaxed font-sans space-y-1 list-decimal pl-4">
              <li>Open your Google Sheet, then open Extensions / Apps Script.</li>
              <li>Paste the project file backend/Code.js into the Apps Script editor.</li>
              <li>Deploy it as a Web App, run as yourself, and allow access for anyone with the link.</li>
              <li>Copy the generated Web App URL and paste it here.</li>
            </ol>
            <div className="text-[11px] text-natural-text/70 bg-white border border-natural-border rounded-2xl p-3 flex items-start space-x-2">
              <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-natural-primary flex-shrink-0" />
              <span>The script automatically creates and maintains Logs, Plans, and Exams sheets.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

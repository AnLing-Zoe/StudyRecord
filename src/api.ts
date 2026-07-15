import { AppState, Exam, StudyLog } from './types';

const apiUrl = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL;

type Action =
  | 'addLog'
  | 'deleteLog'
  | 'addSubject'
  | 'deleteSubject'
  | 'addExam'
  | 'updateExam'
  | 'deleteExam';

interface ApiResponse extends AppState {
  ok: boolean;
  error?: string;
}

const parseResponse = async (response: Response): Promise<ApiResponse> => {
  const result = await response.json() as ApiResponse;
  if (!response.ok || !result.ok) throw new Error(result.error || 'Google Sheets 操作失敗。');
  return result;
};

export const loadData = async (): Promise<AppState> => {
  if (!apiUrl) throw new Error('尚未設定 VITE_GOOGLE_APP_SCRIPT_URL。');
  return parseResponse(await fetch(apiUrl, { cache: 'no-store' }));
};

export const mutateData = async (
  action: Action,
  payload: Partial<StudyLog & Exam> & { subject?: string },
): Promise<AppState> => {
  if (!apiUrl) throw new Error('尚未設定 VITE_GOOGLE_APP_SCRIPT_URL。');
  return parseResponse(await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload }),
  }));
};

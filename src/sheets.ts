import { AppState, Exam, StudyLog, StudyPlan } from './types';

type SyncAction = 'sync' | 'sync_logs' | 'sync_plans' | 'sync_exams';

const normalizeGasUrl = (gasUrl: string) => {
  const trimmed = gasUrl.trim();
  if (!trimmed) {
    throw new Error('Google Apps Script URL is required.');
  }
  return trimmed;
};

const buildGetUrl = (gasUrl: string) => {
  const url = new URL(normalizeGasUrl(gasUrl));
  url.searchParams.set('action', 'get');
  url.searchParams.set('_ts', Date.now().toString());
  return url.toString();
};

const postToGas = async (gasUrl: string, action: SyncAction, payload: Partial<AppState>) => {
  await fetch(normalizeGasUrl(gasUrl), {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify({
      action,
      ...payload,
    }),
  });
};

export async function fetchSpreadsheetData(gasUrl: string): Promise<AppState> {
  const res = await fetch(buildGetUrl(gasUrl), {
    method: 'GET',
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Google Apps Script responded with ${res.status}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return {
    logs: Array.isArray(data.logs) ? data.logs : [],
    plans: Array.isArray(data.plans) ? data.plans : [],
    exams: Array.isArray(data.exams) ? data.exams : [],
  };
}

export async function syncLogsToSheet(gasUrl: string, logs: StudyLog[]): Promise<void> {
  await postToGas(gasUrl, 'sync_logs', { logs });
}

export async function syncPlansToSheet(gasUrl: string, plans: StudyPlan[]): Promise<void> {
  await postToGas(gasUrl, 'sync_plans', { plans });
}

export async function syncExamsToSheet(gasUrl: string, exams: Exam[]): Promise<void> {
  await postToGas(gasUrl, 'sync_exams', { exams });
}

export async function syncAllDataToSheet(gasUrl: string, data: AppState): Promise<void> {
  await postToGas(gasUrl, 'sync', {
    logs: data.logs,
    plans: data.plans,
    exams: data.exams,
  });
}

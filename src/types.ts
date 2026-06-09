export interface StudyLog {
  id: string;
  date: string; // YYYY-MM-DD
  subject: string;
  duration: number; // in minutes
  notes: string;
}

export interface StudyPlan {
  id: string;
  month: string; // YYYY-MM
  subject: string;
  targetHours: number;
}

export interface Exam {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  pinned?: boolean;
}

export interface AppState {
  logs: StudyLog[];
  plans: StudyPlan[];
  exams: Exam[];
}

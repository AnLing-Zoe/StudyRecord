export interface StudyLog {
  id: string;
  date: string; // YYYY-MM-DD
  subject: string;
  duration: number; // in minutes
  notes: string;
}

export interface Exam {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  pinned: boolean;
}

export interface Subject {
  id: string;
  name: string;
}

export interface AppState {
  logs: StudyLog[];
  subjects: Subject[];
  exams: Exam[];
}

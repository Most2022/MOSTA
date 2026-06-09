export interface StudySession {
  startTime: string;
  endTime: string;
  totalStudyTime: string;
}

export interface Lecture {
  name: string;
  subject: string;
  duration: string;
}

export interface QuestionSources {
  moduleQuestions: number;
  dppQuestions: number;
  pyqQuestions: number;
  coachingSheetQuestions: number;
  testPaperQuestions: number;
}

export interface DashboardData {
  date: string; // Format: YYYY-MM-DD
  studySession: StudySession;
  summary: {
    lecturesCount: number;
    questionsSolvedCount: number;
    revisionTopicsCount: number;
    efficiency: string; // e.g. "92%"
  };
  lectures: Lecture[];
  questionSources: QuestionSources;
  revisionCompleted: string[];
  topicsCovered: string[];
  importantNotes: string[];
}

export interface HistoricalData {
  [date: string]: DashboardData;
}

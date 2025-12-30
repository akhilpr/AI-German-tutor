
export type UserTrack = 'general' | 'nursing' | 'academic';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

export interface User {
  name: string;
  email: string;
  photoUrl: string;
  track: UserTrack;
  role: 'student' | 'teacher';
  hasCompletedOnboarding: boolean; 
  xp: number;
  level: number;
  streak: number;
  lastSessionDate: string | null; // ISO string
  unlockedAchievements: string[]; // Array of achievement IDs
  completedSessionCount: number;
}

export interface FeedbackScores {
  fluency: number;
  pronunciation: number;
  grammar: number;
  overall: number;
}

export interface VocabularyItem {
  word: string;
  translation: string;
  context: string;
  status: 'new' | 'learning' | 'mastered';
}

export interface GrammarAnalysis {
  sentence: string;
  error: string;
  correction: string;
  reason:string;
  type: 'grammar' | 'vocabulary' | 'syntax';
}

export interface WordScore {
  word: string;
  status: 'perfect' | 'okay' | 'wrong';
}

export interface FeedbackReport {
  id: string;
  date: string;
  scores: FeedbackScores;
  grammarAnalysis: GrammarAnalysis[]; 
  pronunciationAnalysis: { turnIndex: number, words: WordScore[] }[];
  improvementTips: string[];
  newVocabulary: VocabularyItem[];
  transcript: ConversationTurn[];
  isExamCertificate?: boolean;
  examTopicTitle?: string;
  cefrLevel: string;
  dialectUsed?: string;
  xpEarned: number;
  scenarioId: string;
}

export interface ConversationTurn {
  speaker: 'user' | 'ai';
  text: string;
}

export interface WritingReportError {
  error: string;
  correction: string;
  explanation: string;
}

export interface WritingReport {
  id: string;
  date: string;
  imageUrl: string;
  transcribedText: string;
  score: number;
  errors: WritingReportError[];
  improvementTips: string[];
}

export interface ExamTopic {
  title: string;
  bulletPoints: string[]; 
  introText: string; 
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  emoji: string;
  systemPrompt: string;
  difficulty: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  track: UserTrack | 'all';
  colorFrom: string;
  colorTo: string;
  isExamPrep?: boolean;
  dynamicTopic?: ExamTopic;
}

export enum AppView {
  LOGIN,
  HOME,
  SPEAKING,
  WRITING,
  DASHBOARD,
  TEACHER_DASHBOARD,
}

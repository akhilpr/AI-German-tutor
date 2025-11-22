
export type UserTrack = 'general' | 'nursing' | 'academic';

export interface User {
  name: string;
  email: string;
  photoUrl: string;
  track: UserTrack;
  role: 'student' | 'teacher'; // Added role for B2B logic
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
  context: string; // Example sentence using the word
}

export interface FeedbackReport {
  id: string;
  date: string;
  scores: FeedbackScores;
  weakPoints: string[];
  improvementTips: string[];
  newVocabulary: VocabularyItem[]; // NEW: Auto-generated vocab list
  transcript: ConversationTurn[];
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
}

export enum AppView {
  LOGIN,
  CONVERSATION,
  PROGRESS,
  WRITING,
  TEACHER_DASHBOARD,
}


export type UserTrack = 'general' | 'nursing' | 'academic';

export interface User {
  name: string;
  email: string;
  photoUrl: string;
  track: UserTrack;
  role: 'student' | 'teacher';
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
}

// NEW: Structured Grammar Error
export interface GrammarAnalysis {
  sentence: string;
  error: string;
  correction: string;
  reason: string;
  type: 'grammar' | 'vocabulary' | 'syntax';
}

// NEW: Word-by-word pronunciation score
export interface WordScore {
  word: string;
  status: 'perfect' | 'okay' | 'wrong';
}

export interface FeedbackReport {
  id: string;
  date: string;
  scores: FeedbackScores;
  // Replaced simple weakPoints with detailed analysis
  grammarAnalysis: GrammarAnalysis[]; 
  // NEW: Heatmap data mapping transcript turns to word scores
  pronunciationAnalysis: { turnIndex: number, words: WordScore[] }[];
  improvementTips: string[];
  newVocabulary: VocabularyItem[];
  transcript: ConversationTurn[];
  isExamCertificate?: boolean;
  examTopicTitle?: string;
  cefrLevel: string; // NEW: e.g., "B1.2"
  dialectUsed?: string; // NEW
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
  CONVERSATION,
  PROGRESS,
  WRITING,
  TEACHER_DASHBOARD,
}

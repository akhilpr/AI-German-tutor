
// FIX: Removed self-import of `User` type that caused a conflict.

export interface User {
  name: string;
  email: string;
  photoUrl: string;
}

export interface FeedbackScores {
  fluency: number;
  pronunciation: number;
  grammar: number;
  overall: number;
}

export interface FeedbackReport {
  id: string;
  date: string;
  scores: FeedbackScores;
  weakPoints: string[];
  improvementTips: string[];
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
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  colorFrom: string;
  colorTo: string;
}

export enum AppView {
  LOGIN,
  CONVERSATION,
  PROGRESS,
  WRITING,
}

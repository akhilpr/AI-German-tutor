
import { Achievement } from '../types';

export const ALL_ACHIEVEMENTS: Achievement[] = [
    {
        id: 'session_1',
        title: 'Erste Schritte',
        description: 'Complete your first speaking session.',
        emoji: '👟'
    },
    {
        id: 'session_5',
        title: 'Stammgast',
        description: 'Complete 5 speaking sessions.',
        emoji: '☕'
    },
    {
        id: 'session_10',
        title: 'Fleißig',
        description: 'Complete 10 speaking sessions.',
        emoji: '🐝'
    },
    {
        id: 'streak_3',
        title: 'Am Ball bleiben',
        description: 'Maintain a 3-day streak.',
        emoji: '🔥'
    },
    {
        id: 'streak_7',
        title: 'Wochenheld',
        description: 'Maintain a 7-day streak.',
        emoji: '🗓️'
    },
    {
        id: 'level_5',
        title: 'Aufsteiger',
        description: 'Reach Level 5.',
        emoji: '🚀'
    },
    {
        id: 'level_10',
        title: 'Profi',
        description: 'Reach Level 10.',
        emoji: '🏆'
    },
    {
        id: 'vocab_10',
        title: 'Wortschatz',
        description: 'Learn 10 new vocabulary words.',
        emoji: '📚'
    },
    {
        id: 'grammar_perfect',
        title: 'Grammatik-Ass',
        description: 'Finish a session with zero grammar mistakes.',
        emoji: '🎯'
    },
    {
        id: 'dialect_master',
        title: 'Dialekt-Kenner',
        description: 'Try 3 different German dialects.',
        emoji: '🗣️'
    }
];

// XP required for each level (cumulative)
// Level n requires XP_THRESHOLDS[n-1] XP.
export const XP_THRESHOLDS = [
    0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000
    // Level 1: 0, Level 2: 100, Level 3: 250 etc.
];

export const getLevelFromXp = (xp: number): number => {
    for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= XP_THRESHOLDS[i]) {
            return i + 1;
        }
    }
    return 1;
};

export const getXpForNextLevel = (level: number): number => {
    if (level >= XP_THRESHOLDS.length) {
        return Infinity;
    }
    return XP_THRESHOLDS[level];
};

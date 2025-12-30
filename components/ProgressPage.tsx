
import React, { useState, useEffect } from 'react';
import { FeedbackReport, User, WritingReport, VocabularyItem, Achievement } from '../types';
import ProgressChart from './ProgressChart';
import { UserIcon, BookIcon, LogoutIcon } from './icons';
import useLocalStorage from '../hooks/useLocalStorage';
import { ALL_ACHIEVEMENTS, getLevelFromXp, getXpForNextLevel } from '../data/store';

type Tab = 'speaking' | 'writing' | 'vocab' | 'achievements';

const DashboardPage: React.FC<{ user: User, onLogout: () => void, onBack: () => void }> = ({ user, onLogout, onBack }) => {
  const [speakingReports] = useLocalStorage<FeedbackReport[]>('german_tutor_reports', []);
  const [writingReports] = useLocalStorage<WritingReport[]>('german_tutor_writing_reports', []);
  const [activeTab, setActiveTab] = useState<Tab>('speaking');
  const [vocabList, setVocabList] = useLocalStorage<VocabularyItem[]>('german_tutor_vocab', []);

  useEffect(() => {
    const allVocab = speakingReports.flatMap((r: FeedbackReport) => r.newVocabulary || []);
    setVocabList(prevList => {
      const existingWords = new Set(prevList.map(v => v.word));
      const newWords = allVocab.filter(v => !existingWords.has(v.word));
      return [...newWords.map(w => ({...w, status: 'new' as const})), ...prevList];
    });
  }, [speakingReports]);

  const cefrToNumber = (level: string) => {
      if (!level) return 0;
      const l = level.toUpperCase().substring(0, 2);
      const levelMap: Record<string, number> = {'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6};
      return levelMap[l] || 1;
  };

  const speakingChartData = speakingReports.map(report => ({
    name: new Date(report.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
    overall: report.scores.overall,
    cefrNum: cefrToNumber(report.cefrLevel),
  }));
  const speakingLines = [
    { dataKey: 'overall', name: 'Overall Score', stroke: '#a855f7', strokeWidth: 3 },
    { dataKey: 'cefrNum', name: 'CEFR Level (1-6)', stroke: '#ec4899', strokeWidth: 2 }
  ];

  const writingChartData = writingReports.map(report => ({
      name: new Date(report.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      score: report.score
  }));
  const writingLines = [{ dataKey: 'score', name: 'Score', stroke: '#22c55e', strokeWidth: 3 }];

  return (
    <div className="min-h-screen text-gray-100 pb-36 overflow-y-auto">
      <header className="sticky top-0 z-20 backdrop-blur-xl border-b border-white/5 bg-black/40">
        <div className="max-w-4xl mx-auto py-5 px-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
                 <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors p-2 -ml-2">
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>
                <div>
                    <h1 className="text-xl font-bold text-white">Dashboard</h1>
                    <p className="text-xs text-gray-400">Your Learning Hub</p>
                </div>
            </div>
            <button onClick={onLogout} className="text-gray-400 hover:text-red-400 transition-colors p-2" title="Log Out">
                <LogoutIcon className="w-5 h-5" />
            </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto pt-8 px-4 space-y-8 animate-fade-in-up">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Current Level" value={user.level} color="text-amber-400" />
            <StatCard label="Daily Streak" value={`${user.streak} 🔥`} color="text-orange-400" />
            <StatCard label="Total XP" value={user.xp} color="text-purple-400" />
            <StatCard label="Sessions" value={user.completedSessionCount} color="text-blue-400" />
        </div>

        <div className="flex p-1.5 bg-white/5 rounded-2xl w-full max-w-md mx-auto border border-white/5">
            {['speaking', 'writing', 'vocab', 'achievements'].map(tab => (
                <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as Tab)} 
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 capitalize ${activeTab === tab ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    {tab}
                </button>
            ))}
        </div>

        {activeTab === 'speaking' && (
             <div className="glass-card p-6 sm:p-8 rounded-[2rem]">
                <h2 className="text-lg font-bold text-gray-200 mb-8">Speaking Progress</h2>
                <ProgressChart data={speakingChartData} lines={speakingLines} />
                <p className="text-xs text-gray-500 text-center mt-4 italic">Chart tracks Overall Score (0-10) and CEFR Level estimate.</p>
            </div>
        )}
        
        {activeTab === 'writing' && (
            <div className="glass-card p-6 sm:p-8 rounded-[2rem]">
                 <h2 className="text-lg font-bold text-gray-200 mb-8">Writing Progress</h2>
                 <ProgressChart data={writingChartData} lines={writingLines} />
            </div>
        )}

        {activeTab === 'vocab' && <VocabularyDeck vocabList={vocabList} setVocabList={setVocabList} />}
        {activeTab === 'achievements' && <AchievementsGrid unlockedIds={user.unlockedAchievements} />}

      </main>
    </div>
  );
};

const StatCard: React.FC<{label: string, value: string|number, color: string}> = ({label, value, color}) => (
    <div className="bg-black/20 p-4 rounded-2xl border border-white/5 text-center">
        <div className={`text-3xl font-bold ${color}`}>{value}</div>
        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mt-1">{label}</div>
    </div>
);

const AchievementsGrid: React.FC<{unlockedIds: string[]}> = ({ unlockedIds }) => (
    <div className="glass-card p-6 sm:p-8 rounded-[2rem]">
        <h2 className="text-lg font-bold text-gray-200 mb-6">Your Awards</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ALL_ACHIEVEMENTS.map(ach => {
                const isUnlocked = unlockedIds.includes(ach.id);
                return (
                    <div key={ach.id} className={`p-4 rounded-2xl border transition-all duration-300 ${isUnlocked ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/5 border-white/10 opacity-60'}`}>
                        <div className={`text-4xl transition-transform duration-300 ${isUnlocked ? 'scale-100' : 'scale-90 grayscale'}`}>{ach.emoji}</div>
                        <h3 className={`mt-2 font-bold ${isUnlocked ? 'text-amber-300' : 'text-gray-300'}`}>{ach.title}</h3>
                        <p className="text-xs text-gray-400 mt-1">{ach.description}</p>
                    </div>
                );
            })}
        </div>
    </div>
);

const VocabularyDeck: React.FC<{vocabList: VocabularyItem[], setVocabList: Function}> = ({ vocabList, setVocabList }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    
    if (vocabList.length === 0) {
        return <div className="text-center py-16 text-gray-500 bg-white/5 rounded-[2rem] border border-dashed border-white/10">No vocabulary collected yet. Complete a speaking session!</div>;
    }

    const currentWord = vocabList[currentIndex];

    const handleNext = (status: 'learning' | 'mastered') => {
        setVocabList((prev: VocabularyItem[]) => 
            prev.map((item, index) => index === currentIndex ? { ...item, status } : item)
        );
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev + 1) % vocabList.length);
    };

    return (
        <div className="space-y-6">
            <div className="relative w-full max-w-md mx-auto aspect-[3/2] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
                <div className={`absolute inset-0 transition-transform duration-500 rounded-2xl flex flex-col items-center justify-center p-6 text-center bg-[#1a1a1a] border border-white/10 shadow-2xl ${isFlipped ? '[transform:rotateY(180deg)]' : '[transform:rotateY(0deg)]'}`} style={{ backfaceVisibility: 'hidden' }}>
                     <span className="text-xs text-amber-400 font-bold">DEUTSCH</span>
                     <h3 className="text-4xl font-bold text-white my-4">{currentWord.word}</h3>
                     <p className="text-sm text-gray-400 italic">"{currentWord.context}"</p>
                </div>
                 <div className={`absolute inset-0 transition-transform duration-500 rounded-2xl flex items-center justify-center p-6 bg-green-900/40 border border-green-500/20 shadow-2xl ${isFlipped ? '[transform:rotateY(0deg)]' : '[transform:rotateY(-180deg)]'}`} style={{ backfaceVisibility: 'hidden' }}>
                     <h3 className="text-4xl font-bold text-green-300">{currentWord.translation}</h3>
                </div>
            </div>
            <div className="flex justify-center gap-4">
                <button onClick={() => handleNext('learning')} className="px-8 py-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 font-bold hover:bg-red-500/30 transition-colors">Again</button>
                <button onClick={() => handleNext('mastered')} className="px-8 py-4 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300 font-bold hover:bg-green-500/30 transition-colors">Good</button>
            </div>
        </div>
    );
};

export default DashboardPage;

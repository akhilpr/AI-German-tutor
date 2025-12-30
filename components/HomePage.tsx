import React, { useState, useEffect, useCallback } from 'react';
import { User, Scenario, AppView } from '../types';
// FIX: Imported missing LoaderIcon component
import { LogoutIcon, ChartIcon, WritingIcon, LoaderIcon } from './icons';
import useLocalStorage from '../hooks/useLocalStorage';
import { getXpForNextLevel, getLevelFromXp } from '../data/store';
import { SCENARIOS } from '../data/scenarios';

interface HomePageProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: AppView) => void;
  onStartSpeaking: (scenario: Scenario) => void;
}

const getTargetCefrLevels = (level: number): Array<'A1'|'A2'|'B1'|'B2'|'C1'> => {
    if (level <= 2) return ['A1'];
    if (level <= 4) return ['A1', 'A2'];
    if (level <= 6) return ['A2', 'B1'];
    if (level <= 8) return ['B1', 'B2'];
    return ['B2', 'C1'];
};

const HomePage: React.FC<HomePageProps> = ({ user, onLogout, onNavigate, onStartSpeaking }) => {
    const [speakingReports] = useLocalStorage('german_tutor_reports', []);
    const [suggestedScenario, setSuggestedScenario] = useState<Scenario | null>(null);

    const freestyleScenario = SCENARIOS.find(s => s.id === 'freestyle_chat');

    const getNewSuggestion = useCallback(() => {
        const userLevels = getTargetCefrLevels(user.level);
        const recentScenarioIds = new Set(speakingReports.slice(-5).map((r: any) => r.scenarioId));

        const potentialScenarios = SCENARIOS.filter(s =>
            (s.track === user.track || s.track === 'all') &&
            userLevels.includes(s.difficulty) &&
            !s.isExamPrep &&
            s.id !== 'freestyle_chat'
        );

        const freshScenarios = potentialScenarios.filter(s => !recentScenarioIds.has(s.id));
        const pool = freshScenarios.length > 0 ? freshScenarios : potentialScenarios;

        if (pool.length > 0) {
            setSuggestedScenario(pool[Math.floor(Math.random() * pool.length)]);
        } else {
            // Fallback if no specific scenarios are available
            setSuggestedScenario(SCENARIOS.find(s => s.id === 'general_bakery')!);
        }
    }, [user.level, user.track, speakingReports]);

    useEffect(() => {
        getNewSuggestion();
    }, [getNewSuggestion]);
    
    const xpForNextLevel = getXpForNextLevel(user.level);
    const xpForCurrentLevel = getXpForNextLevel(user.level - 1);
    const currentLevelProgress = user.xp - xpForCurrentLevel;
    const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
    const progressPercentage = Math.min(xpNeededForLevel > 0 ? (currentLevelProgress / xpNeededForLevel) * 100 : 100, 100);

    return (
        <div className="min-h-screen pb-10">
             <header className="max-w-4xl mx-auto py-5 px-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 p-0.5">
                        <img className="h-full w-full rounded-full object-cover bg-black" src={user.photoUrl} alt={user.name} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Guten Tag, {user.name.split(' ')[0]}!</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-400 rounded-full" style={{width: `${progressPercentage}%`}}></div>
                            </div>
                            <span className="text-xs font-bold text-amber-400">LVL {user.level}</span>
                        </div>
                    </div>
                </div>
                <button onClick={onLogout} className="text-gray-400 hover:text-red-400 transition-colors p-2" title="Log Out">
                    <LogoutIcon className="w-5 h-5" />
                </button>
            </header>

            <main className="max-w-4xl mx-auto px-4 space-y-8 animate-fade-in-up">
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-purple-600/20 via-transparent to-blue-600/20 border border-white/10 shadow-2xl">
                    <h2 className="text-lg font-bold text-white">Today's Practice</h2>
                    <p className="text-sm text-gray-400 mb-6">Choose your path to fluency for today.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Suggested Scenario */}
                        {suggestedScenario ? (
                            <PracticeCard 
                                scenario={suggestedScenario} 
                                onStart={() => onStartSpeaking(suggestedScenario)} 
                                label="Suggested for you"
                                isFeatured={true}
                            />
                        ) : (
                             <div className="h-full min-h-[140px] bg-white/5 rounded-2xl flex items-center justify-center"><LoaderIcon className="w-6 h-6 animate-spin text-white"/></div>
                        )}

                        {/* Freestyle Conversation */}
                        {freestyleScenario && (
                            <PracticeCard 
                                scenario={freestyleScenario} 
                                onStart={() => onStartSpeaking(freestyleScenario)}
                                label="Open Chat"
                                isFeatured={false}
                            />
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard label="Daily Streak" value={`${user.streak} 🔥`} color="text-orange-400" />
                    <StatCard label="Sessions" value={user.completedSessionCount} color="text-blue-400" />
                    <button onClick={() => onNavigate(AppView.DASHBOARD)} className="glass-card p-4 rounded-2xl text-center flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                        <ChartIcon className="w-6 h-6 text-gray-300"/>
                        <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">Full Report</span>
                    </button>
                </div>
                
                <div>
                    <h3 className="text-base font-bold text-gray-200 px-2 mb-3 mt-8">Explore More Scenarios</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {SCENARIOS.filter(s => s.id !== 'freestyle_chat' && (s.track === user.track || s.track === 'all')).slice(0, 4).map(s => (
                           <ScenarioCard key={s.id} scenario={s} onSelect={onStartSpeaking} />
                        ))}
                    </div>
                </div>

            </main>
        </div>
    );
};

interface PracticeCardProps {
    scenario: Scenario;
    onStart: () => void;
    label: string;
    isFeatured: boolean;
}

const PracticeCard: React.FC<PracticeCardProps> = ({ scenario, onStart, label, isFeatured }) => (
    <div className={`bg-white/5 p-4 rounded-2xl border flex flex-col items-center gap-4 text-center ${isFeatured ? 'border-purple-500/50' : 'border-white/10'}`}>
        <div className="flex-1">
            <p className={`text-xs font-bold uppercase ${isFeatured ? 'text-purple-300' : 'text-gray-400'}`}>{label}</p>
            <div className={`w-16 h-16 my-3 rounded-xl flex items-center justify-center text-3xl mx-auto ${isFeatured ? 'bg-gradient-to-br from-purple-500 to-blue-500' : 'bg-gray-700'}`}>{scenario.emoji}</div>
            <h3 className="text-lg font-bold text-white">{scenario.title}</h3>
            <p className="text-xs text-gray-400 mt-1">{scenario.description}</p>
        </div>
        <button onClick={onStart} className={`w-full mt-4 px-8 py-3 rounded-xl text-white font-bold uppercase tracking-wider text-sm shadow-lg transition-colors active:scale-95 ${isFeatured ? 'bg-purple-600 shadow-purple-500/20 hover:bg-purple-500' : 'bg-white/10 hover:bg-white/20'}`}>
            Start
        </button>
    </div>
);


const StatCard: React.FC<{label: string, value: string|number, color: string}> = ({label, value, color}) => (
    <div className="glass-card p-4 rounded-2xl text-center">
        <div className={`text-3xl font-bold ${color}`}>{value}</div>
        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mt-1">{label}</div>
    </div>
);

const ScenarioCard: React.FC<{scenario: Scenario, onSelect: (s: Scenario) => void}> = ({ scenario, onSelect }) => (
    <button
      onClick={() => onSelect(scenario)}
      className={`group relative overflow-hidden p-4 rounded-2xl bg-white/5 border transition-all duration-300 text-left hover:bg-white/10 active:scale-[0.98] shadow-lg border-white/5`}
    >
        <div className="flex items-center gap-4">
            <span className="text-2xl">{scenario.emoji}</span>
            <div className="flex-1">
                <h3 className="font-bold text-white mb-1 leading-tight">{scenario.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{scenario.description}</p>
            </div>
        </div>
    </button>
);

export default HomePage;
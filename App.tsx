
import React, { useState, useEffect } from 'react';
import { User, AppView, FeedbackReport, VocabularyItem, Scenario } from './types';
import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import SpeakingPage from './components/SpeakingPage';
import WritingPage from './components/WritingPage';
import DashboardPage from './components/ProgressPage';
import TeacherDashboard from './components/TeacherDashboard';
import { LoaderIcon } from './components/icons';
import TrackWelcomeModal from './components/TrackWelcomeModal';
import useLocalStorage from './hooks/useLocalStorage';
import { getLevelFromXp } from './data/store';

// Helper to check if two dates are on consecutive days
const areConsecutiveDays = (date1Str: string, date2Str: string): boolean => {
    const d1 = new Date(date1Str);
    const d2 = new Date(date2Str);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
};

// Helper to check if two dates are on the same day
const isSameDay = (date1Str: string, date2Str: string): boolean => {
    const d1 = new Date(date1Str);
    const d2 = new Date(date2Str);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
};


const App: React.FC = () => {
  const [user, setUser] = useLocalStorage<User | null>('german_tutor_user', null);
  const [reports, setReports] = useLocalStorage<FeedbackReport[]>('german_tutor_reports', []);
  const [vocab, setVocab] = useLocalStorage<VocabularyItem[]>('german_tutor_vocab', []);
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'teacher') {
        setCurrentView(AppView.TEACHER_DASHBOARD);
      } else {
        setCurrentView(AppView.HOME);
        if (user.track === 'general' && !user.hasCompletedOnboarding) {
          setShowWelcomeModal(true);
        }
      }
    } else {
        setCurrentView(AppView.LOGIN);
    }
    setIsLoading(false);
  }, [user]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleOnboardingComplete = () => {
    if (user) {
      setUser({ ...user, hasCompletedOnboarding: true });
      setShowWelcomeModal(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setReports([]);
    setVocab([]);
    localStorage.removeItem('german_tutor_writing_reports');
    setCurrentView(AppView.LOGIN);
  };
  
  const handleStartSpeaking = (scenario: Scenario) => {
    setActiveScenario(scenario);
    setCurrentView(AppView.SPEAKING);
  };

  const handleSessionComplete = (report: FeedbackReport) => {
    if (!user) return;
    
    setReports(prev => [...prev, report]);

    const today = new Date().toISOString();
    let newStreak = user.streak;
    if (user.lastSessionDate) {
      if (!isSameDay(today, user.lastSessionDate)) {
        if (areConsecutiveDays(user.lastSessionDate, today)) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      }
    } else {
      newStreak = 1;
    }

    const newXp = user.xp + report.xpEarned;
    const newLevel = getLevelFromXp(newXp);
    
    const unlocked = [...user.unlockedAchievements];
    const newSessionCount = user.completedSessionCount + 1;

    if (!unlocked.includes('session_1')) unlocked.push('session_1');
    if (newSessionCount >= 5 && !unlocked.includes('session_5')) unlocked.push('session_5');
    if (newSessionCount >= 10 && !unlocked.includes('session_10')) unlocked.push('session_10');
    if (newStreak >= 3 && !unlocked.includes('streak_3')) unlocked.push('streak_3');
    if (newStreak >= 7 && !unlocked.includes('streak_7')) unlocked.push('streak_7');
    if (newLevel >= 5 && !unlocked.includes('level_5')) unlocked.push('level_5');
    if (newLevel >= 10 && !unlocked.includes('level_10')) unlocked.push('level_10');
    if (report.grammarAnalysis.length === 0 && !unlocked.includes('grammar_perfect')) unlocked.push('grammar_perfect');

    setUser({
      ...user,
      xp: newXp,
      level: newLevel,
      streak: newStreak,
      lastSessionDate: today,
      completedSessionCount: newSessionCount,
      unlockedAchievements: unlocked,
    });
  };

  const renderView = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[100dvh]">
          <LoaderIcon className="w-12 h-12 text-purple-400 animate-spin" />
        </div>
      );
    }

    if (currentView === AppView.LOGIN || !user) {
      return <LoginPage onLogin={handleLogin} />;
    }

    switch (currentView) {
      case AppView.HOME:
        return <HomePage user={user} onLogout={handleLogout} onNavigate={setCurrentView} onStartSpeaking={handleStartSpeaking} />;
      case AppView.SPEAKING:
        if (!activeScenario) {
            setCurrentView(AppView.HOME);
            return null;
        }
        return <SpeakingPage user={user} scenario={activeScenario} onSessionComplete={handleSessionComplete} onBack={() => setCurrentView(AppView.HOME)} />;
      case AppView.WRITING:
        return <WritingPage user={user} onLogout={handleLogout} onBack={() => setCurrentView(AppView.HOME)} />;
      case AppView.DASHBOARD:
        return <DashboardPage user={user} onLogout={handleLogout} onBack={() => setCurrentView(AppView.HOME)} />;
      // FIX: Corrected typo from AppVw to AppView
      case AppView.TEACHER_DASHBOARD:
        return <TeacherDashboard user={user} onLogout={handleLogout} />;
      default:
        return <HomePage user={user} onLogout={handleLogout} onNavigate={setCurrentView} onStartSpeaking={handleStartSpeaking} />;
    }
  };

  return (
    <div className="h-full w-full flex flex-col antialiased bg-black" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex-1 h-full w-full overflow-y-auto overflow-x-hidden relative scroll-smooth">
        {renderView()}
        {showWelcomeModal && user?.track === 'general' && (
          <TrackWelcomeModal user={user} onComplete={handleOnboardingComplete} />
        )}
      </div>
    </div>
  );
};

export default App;
import React, { useState, useEffect } from 'react';
import { User, AppView } from './types';
import LoginPage from './components/LoginPage';
import ConversationPage from './components/ConversationPage';
import ProgressPage from './components/ProgressPage';
import WritingPage from './components/WritingPage';
import TeacherDashboard from './components/TeacherDashboard';
import NavBar from './components/NavBar';
import { LoaderIcon } from './components/icons';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.CONVERSATION);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('german_tutor_user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        // Route based on role
        if (parsedUser.role === 'teacher') {
            setCurrentView(AppView.TEACHER_DASHBOARD);
        } else {
            setCurrentView(AppView.CONVERSATION);
        }
      } else {
        setCurrentView(AppView.LOGIN);
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('german_tutor_user');
      setCurrentView(AppView.LOGIN);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('german_tutor_user', JSON.stringify(loggedInUser));
    if (loggedInUser.role === 'teacher') {
        setCurrentView(AppView.TEACHER_DASHBOARD);
    } else {
        setCurrentView(AppView.CONVERSATION);
    }
  };

  const handleLogout = () => {
      setUser(null);
      localStorage.removeItem('german_tutor_user');
      setCurrentView(AppView.LOGIN);
  };

  const renderView = () => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoaderIcon className="w-12 h-12 text-purple-400 animate-spin" />
            </div>
        );
    }

    if (currentView === AppView.LOGIN || !user) {
      return <LoginPage onLogin={handleLogin} />;
    }

    switch (currentView) {
      case AppView.CONVERSATION:
        return <ConversationPage user={user} onLogout={handleLogout} />;
      case AppView.WRITING:
        return <WritingPage user={user} onLogout={handleLogout} />;
      case AppView.PROGRESS:
        return <ProgressPage user={user} onLogout={handleLogout} />;
      case AppView.TEACHER_DASHBOARD:
        return <TeacherDashboard user={user} onLogout={handleLogout} />;
      default:
        return <ConversationPage user={user} onLogout={handleLogout} />;
    }
  };

  return (
    <div className="h-[100dvh] w-screen flex flex-col antialiased bg-black" style={{ fontFamily: "'Inter', sans-serif" }}>
       <div className="flex-1 h-full w-full overflow-y-auto relative scroll-smooth">
        {renderView()}
      </div>
      {!isLoading && currentView !== AppView.LOGIN && user && user.role !== 'teacher' && (
        <NavBar currentView={currentView} onNavigate={setCurrentView} />
      )}
    </div>
  );
};

export default App;
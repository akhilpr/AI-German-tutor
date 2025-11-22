
import React, { useState } from 'react';
import { GoogleIcon } from './icons';
import { User, UserTrack } from '../types';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<UserTrack>('general');

  const handleLoginClick = () => {
    setIsAnimating(true);
    setTimeout(() => {
        const dummyUser: User = {
            name: 'Arjun Nair',
            email: 'arjun.nair@example.com',
            photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4`,
            track: selectedTrack,
            role: 'student'
        };
        onLogin(dummyUser);
    }, 1200);
  };

  // Hidden shortcut to login as a "Teacher" for demo purposes (Clicking the logo)
  const handleTeacherLogin = () => {
      setIsAnimating(true);
      setTimeout(() => {
          const dummyUser: User = {
              name: 'Frau Lakshmi',
              email: 'admin@institute.com',
              photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Zoey&backgroundColor=ffdfbf`,
              track: 'general',
              role: 'teacher'
          };
          onLogin(dummyUser);
      }, 1000);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] animate-pulse" style={{animationDelay: '1s'}}></div>

      <div className="w-full max-w-md relative z-10 glass-card p-8 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl animate-fade-in-up flex flex-col items-center">
        
        <div onClick={handleTeacherLogin} className="cursor-pointer w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 relative group">
            <div className="absolute inset-0 rounded-full border border-white/20 group-hover:border-white/40 transition-colors"></div>
            <span className="text-5xl">🇩🇪</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 text-center">
            Nova
        </h1>
        <p className="text-lg text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200 font-medium mb-8 text-center">
            German Fluency Accelerator
        </p>

        {/* Track Selector */}
        <div className="w-full mb-8 space-y-3">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-bold text-center mb-4">Select Your Goal</p>
            
            <button 
                onClick={() => setSelectedTrack('nursing')}
                className={`w-full p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 ${selectedTrack === 'nursing' ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
            >
                <div className="text-2xl">🩺</div>
                <div className="text-left">
                    <div className={`font-bold ${selectedTrack === 'nursing' ? 'text-white' : 'text-gray-300'}`}>Nursing (Pflege)</div>
                    <div className="text-xs text-gray-400">For B2 Pflege exams & Hospital work</div>
                </div>
            </button>

            <button 
                onClick={() => setSelectedTrack('academic')}
                className={`w-full p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 ${selectedTrack === 'academic' ? 'bg-purple-600/20 border-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
            >
                <div className="text-2xl">🎓</div>
                <div className="text-left">
                    <div className={`font-bold ${selectedTrack === 'academic' ? 'text-white' : 'text-gray-300'}`}>Study Abroad</div>
                    <div className="text-xs text-gray-400">University admission, TestDaF, Visa</div>
                </div>
            </button>

            <button 
                onClick={() => setSelectedTrack('general')}
                className={`w-full p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 ${selectedTrack === 'general' ? 'bg-green-600/20 border-green-500 shadow-[0_0_20px_rgba(22,163,74,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
            >
                <div className="text-2xl">🌍</div>
                <div className="text-left">
                    <div className={`font-bold ${selectedTrack === 'general' ? 'text-white' : 'text-gray-300'}`}>General Learning</div>
                    <div className="text-xs text-gray-400">Travel, A1-B1 Basics, Hobby</div>
                </div>
            </button>
        </div>

        <div className="w-full space-y-4">
            <button
                onClick={handleLoginClick}
                disabled={isAnimating}
                className={`w-full group relative flex items-center justify-center px-6 py-4 text-base font-bold text-white transition-all duration-300 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 active:scale-95 overflow-hidden ${isAnimating ? 'opacity-80' : ''}`}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {isAnimating ? (
                    <div className="flex items-center gap-3">
                        <svg className="animate-spin h-5 w-5 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Setting up Profile...</span>
                    </div>
                ) : (
                    <>
                        <GoogleIcon className="w-5 h-5 mr-3" />
                        <span>Start Learning</span>
                    </>
                )}
            </button>
        </div>
        
        <div className="mt-8 flex items-center justify-center gap-2 opacity-50">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce"></div>
            <div className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-bounce" style={{animationDelay: '0.2s'}}></div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

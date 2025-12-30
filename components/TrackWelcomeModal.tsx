
import React, { useState } from 'react';
import { User } from '../types';

interface TrackWelcomeModalProps {
    user: User;
    onComplete: () => void;
}

const TrackWelcomeModal: React.FC<TrackWelcomeModalProps> = ({ user, onComplete }) => {
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-lg animate-fade-in-up" role="dialog" aria-modal="true">
            <div className="w-full max-w-lg m-4 glass-card p-8 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col items-center text-center">
                <div className="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                    <span className="text-4xl">🚀</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
                    Welcome, {user.name.split(' ')[0]}!
                </h1>
                <p className="text-base sm:text-lg text-transparent bg-clip-text bg-gradient-to-r from-green-200 to-emerald-200 font-medium mb-8">
                    Start your Fluency Journey
                </p>

                <div className="w-full space-y-4 mb-8">
                    <p className="text-sm text-gray-400 font-medium mb-4">
                        This track is a guided curriculum from beginner to advanced.
                        <br/>
                        Where would you like to start?
                    </p>
                    
                    <button 
                        onClick={() => setSelectedLevel('A1/A2')}
                        className={`w-full p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 text-left ${selectedLevel === 'A1/A2' ? 'bg-green-600/20 border-green-500 shadow-[0_0_20px_rgba(22,163,74,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                    >
                        <div className="text-xl sm:text-2xl">🌱</div>
                        <div>
                            <div className="font-bold text-base text-white">Beginner (A1-A2)</div>
                            <div className="text-xs text-gray-400">"Eine Tasse Kaffee, bitte."</div>
                        </div>
                    </button>

                     <button 
                        onClick={() => setSelectedLevel('B1/B2')}
                        className={`w-full p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 text-left ${selectedLevel === 'B1/B2' ? 'bg-green-600/20 border-green-500 shadow-[0_0_20px_rgba(22,163,74,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                    >
                        <div className="text-xl sm:text-2xl">🔥</div>
                        <div>
                            <div className="font-bold text-base text-white">Intermediate (B1-B2)</div>
                            <div className="text-xs text-gray-400">"Ich bin der Meinung, dass..."</div>
                        </div>
                    </button>
                </div>

                 <button
                    onClick={onComplete}
                    disabled={!selectedLevel}
                    className="w-full max-w-xs py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-green-600 to-emerald-700 border border-green-500/50 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-xl transition-all flex items-center justify-center text-base"
                >
                    Let's Go!
                </button>
            </div>
        </div>
    );
};

export default TrackWelcomeModal;

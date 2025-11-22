import React from 'react';
import { AppView } from '../types';
import { MicIcon, WritingIcon, ChartIcon } from './icons';

interface NavBarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

const NavBar: React.FC<NavBarProps> = ({ currentView, onNavigate }) => {
  const items = [
      { id: AppView.CONVERSATION, label: 'Speak', icon: MicIcon },
      { id: AppView.WRITING, label: 'Write', icon: WritingIcon },
      { id: AppView.PROGRESS, label: 'Progress', icon: ChartIcon },
  ];

  return (
    <nav className="fixed bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="nav-glass px-3 py-3 rounded-full shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] flex items-center gap-2 pointer-events-auto transition-transform hover:scale-105 duration-300">
        {items.map((item) => {
            const isActive = currentView === item.id;
            return (
                <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`relative w-20 h-14 rounded-full flex flex-col items-center justify-center transition-all duration-500 group overflow-hidden ${isActive ? 'bg-white/10 shadow-inner border border-white/5' : ''}`}
                >
                    <div className={`absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'group-hover:opacity-30'}`}></div>
                    
                    <item.icon className={`w-6 h-6 mb-1 transition-all duration-300 z-10 ${isActive ? 'text-white scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]' : 'text-gray-400 group-hover:text-gray-200'}`} />
                    <span className={`text-[10px] font-semibold tracking-wide transition-colors duration-300 z-10 ${isActive ? 'text-white' : 'text-gray-500'}`}>{item.label}</span>
                </button>
            )
        })}
      </div>
    </nav>
  );
};

export default NavBar;
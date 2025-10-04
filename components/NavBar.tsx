import React from 'react';
import { AppView } from '../types';
import { MicIcon, WritingIcon, ChartIcon } from './icons';

interface NavBarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

const NavItem: React.FC<{
  label: string;
  view: AppView;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  children: React.ReactNode;
}> = ({ label, view, currentView, onNavigate, children }) => {
  const isActive = currentView === view;
  return (
    <button
      onClick={() => onNavigate(view)}
      className={`flex flex-col items-center justify-center w-full py-2 px-1 rounded-lg transition-colors duration-200 ${isActive ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <div className={`relative w-8 h-8 flex items-center justify-center`}>
        {isActive && <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-md"></div>}
        {children}
      </div>
      <span className="text-xs font-medium mt-1">{label}</span>
    </button>
  );
};

const NavBar: React.FC<NavBarProps> = ({ currentView, onNavigate }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 p-2 sm:p-3 z-20">
      <div className="max-w-xs sm:max-w-md mx-auto glass-card flex justify-around items-center p-1">
        <NavItem label="Speak" view={AppView.CONVERSATION} currentView={currentView} onNavigate={onNavigate}>
          <MicIcon className="w-6 h-6" />
        </NavItem>
        <NavItem label="Write" view={AppView.WRITING} currentView={currentView} onNavigate={onNavigate}>
          <WritingIcon className="w-6 h-6" />
        </NavItem>
        <NavItem label="Progress" view={AppView.PROGRESS} currentView={currentView} onNavigate={onNavigate}>
          <ChartIcon className="w-6 h-6" />
        </NavItem>
      </div>
    </nav>
  );
};

export default NavBar;
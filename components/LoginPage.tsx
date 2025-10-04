import React from 'react';
import { GoogleIcon } from './icons';
import { User } from '../types';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const handleLoginClick = () => {
    const dummyUser: User = {
      name: 'Ralph Edwards',
      email: 'ralph.edwards@example.com',
      photoUrl: `https://i.pravatar.cc/150?u=ralphedwards`,
    };
    onLogin(dummyUser);
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-sm p-6 sm:p-8 space-y-8 glass-card">
        <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Hallo!
            </h1>
            <p className="mt-3 text-base sm:text-lg text-gray-300">
                Welcome to your AI German Tutor.
            </p>
        </div>
        <div className="mt-8">
            <button
            onClick={handleLoginClick}
            className="w-full inline-flex items-center justify-center px-4 py-3 text-base font-semibold text-white bg-gray-700/50 border border-gray-600 rounded-xl shadow-sm hover:bg-gray-600/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-900 transition-colors"
            >
            <GoogleIcon className="w-6 h-6 mr-3" />
            Sign in with Google
            </button>
        </div>
        <p className="mt-6 text-xs text-center text-gray-400">
          Practice your conversation skills and get instant feedback.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
import React from 'react';
import { User } from '../types';
import { ChartIcon, UserIcon, LogoutIcon } from './icons';
import ProgressChart from './ProgressChart';

interface TeacherDashboardProps {
    user: User;
    onLogout: () => void;
}

// Mock Data for the dashboard
const STUDENT_DATA = [
    { id: 1, name: 'Anjali P.', track: 'Nursing', avgScore: 8.2, sessions: 12, lastActive: '2h ago', status: 'On Track' },
    { id: 2, name: 'Rahul K.', track: 'Academic', avgScore: 6.5, sessions: 8, lastActive: '1d ago', status: 'Needs Help' },
    { id: 3, name: 'Sneha M.', track: 'Nursing', avgScore: 9.1, sessions: 24, lastActive: '5m ago', status: 'Excelling' },
    { id: 4, name: 'Vivek R.', track: 'Academic', avgScore: 7.0, sessions: 5, lastActive: '3d ago', status: 'On Track' },
    { id: 5, name: 'Deepa S.', track: 'Nursing', avgScore: 5.8, sessions: 3, lastActive: '1w ago', status: 'At Risk' },
];

const BATCH_PERFORMANCE = [
    { name: 'Week 1', nursing: 5.5, academic: 6.0 },
    { name: 'Week 2', nursing: 6.2, academic: 6.3 },
    { name: 'Week 3', nursing: 6.8, academic: 6.5 },
    { name: 'Week 4', nursing: 7.5, academic: 7.0 },
    { name: 'Week 5', nursing: 8.1, academic: 7.2 },
];

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onLogout }) => {
    const chartLines = [
        { dataKey: 'nursing', name: 'Nursing Batch', stroke: '#10b981', strokeWidth: 3 },
        { dataKey: 'academic', name: 'Academic Batch', stroke: '#8b5cf6', strokeWidth: 3 },
    ];

    return (
        <div className="min-h-screen text-gray-100 pb-36 overflow-y-auto">
            <header className="sticky top-0 z-20 backdrop-blur-xl border-b border-white/5 bg-black/40">
                <div className="max-w-6xl mx-auto py-5 px-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-white">Institute Dashboard</h1>
                        <p className="text-xs text-gray-400">Batch Overview: Kerala Batch 2024</p>
                    </div>
                    <div className="flex items-center gap-4">
                         <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-white">{user.name}</div>
                            <div className="text-xs text-gray-400">Admin View</div>
                         </div>
                        <button 
                            onClick={onLogout}
                            className="text-gray-400 hover:text-red-400 transition-colors p-2"
                            title="Log Out"
                        >
                            <LogoutIcon className="w-5 h-5" />
                        </button>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 p-0.5">
                            <img className="h-full w-full rounded-full object-cover bg-black" src={user.photoUrl} alt="Admin" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto pt-8 px-4 space-y-8 animate-fade-in-up">
                
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-green-500">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Avg. Class Score</h3>
                        <div className="text-3xl font-bold text-white">7.8<span className="text-sm text-gray-500 font-normal">/10</span></div>
                        <div className="mt-2 text-green-400 text-xs flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            <span>+12% vs last week</span>
                        </div>
                    </div>
                     <div className="glass-card p-6 rounded-2xl border-l-4 border-l-blue-500">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Active Students</h3>
                        <div className="text-3xl font-bold text-white">24<span className="text-sm text-gray-500 font-normal">/30</span></div>
                         <div className="mt-2 text-blue-400 text-xs">
                            80% engagement rate
                        </div>
                    </div>
                     <div className="glass-card p-6 rounded-2xl border-l-4 border-l-purple-500">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Exam Readiness</h3>
                        <div className="text-3xl font-bold text-white">15</div>
                         <div className="mt-2 text-purple-400 text-xs">
                            Students predicted to pass B2
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="glass-card p-6 sm:p-8 rounded-[2rem]">
                    <h2 className="text-lg font-bold text-gray-200 mb-6">Track Performance</h2>
                    <ProgressChart data={BATCH_PERFORMANCE} lines={chartLines} />
                </div>

                {/* Student List */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-200 px-2">Student Roster</h2>
                    <div className="glass-card rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-400">
                                <thead className="bg-white/5 uppercase text-xs font-bold text-gray-300">
                                    <tr>
                                        <th className="px-6 py-4">Student</th>
                                        <th className="px-6 py-4">Track</th>
                                        <th className="px-6 py-4">Avg Score</th>
                                        <th className="px-6 py-4">Last Active</th>
                                        <th className="px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {STUDENT_DATA.map((student) => (
                                        <tr key={student.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                                                    <span className="text-xs">{student.name.charAt(0)}</span>
                                                </div>
                                                {student.name}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    student.track === 'Nursing' ? 'bg-green-500/10 text-green-400' : 'bg-purple-500/10 text-purple-400'
                                                }`}>
                                                    {student.track}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-white font-bold">{student.avgScore}</td>
                                            <td className="px-6 py-4">{student.lastActive}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                                    student.status === 'Excelling' ? 'bg-green-500/20 text-green-300' :
                                                    student.status === 'Needs Help' ? 'bg-yellow-500/20 text-yellow-300' :
                                                    student.status === 'At Risk' ? 'bg-red-500/20 text-red-300' :
                                                    'bg-blue-500/20 text-blue-300'
                                                }`}>
                                                    {student.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TeacherDashboard;
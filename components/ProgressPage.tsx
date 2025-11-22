
import React, { useState, useEffect } from 'react';
import { FeedbackReport, User, WritingReport, VocabularyItem } from '../types';
import ProgressChart from './ProgressChart';
import { UserIcon, BotIcon, BookIcon } from './icons';

type Tab = 'speaking' | 'writing' | 'vocab';

const ProgressPage: React.FC<{ user: User }> = ({ user }) => {
  const [speakingReports, setSpeakingReports] = useState<FeedbackReport[]>([]);
  const [writingReports, setWritingReports] = useState<WritingReport[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('speaking');
  const [vocabList, setVocabList] = useState<VocabularyItem[]>([]);

  useEffect(() => {
    try {
      const storedSpeaking = localStorage.getItem('german_tutor_reports');
      if (storedSpeaking) {
          const parsed = JSON.parse(storedSpeaking);
          setSpeakingReports(parsed);
          // Extract all vocabulary from all reports
          const allVocab = parsed.flatMap((r: FeedbackReport) => r.newVocabulary || []);
          setVocabList(allVocab.reverse()); // Newest first
      }
      const storedWriting = localStorage.getItem('german_tutor_writing_reports');
      if (storedWriting) setWritingReports(JSON.parse(storedWriting));
    } catch (error) {
      console.error("Failed to parse reports", error);
    }
  }, []);

  const speakingChartData = speakingReports.map(report => ({
    name: new Date(report.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
    overall: report.scores.overall,
    fluency: report.scores.fluency,
  }));
  
  const speakingLines = [
    { dataKey: 'overall', name: 'Overall', stroke: '#a855f7', strokeWidth: 3 },
    { dataKey: 'fluency', name: 'Fluency', stroke: '#3b82f6', strokeWidth: 2 }
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
            <div>
                <h1 className="text-xl font-bold text-white">Dashboard</h1>
                <p className="text-xs text-gray-400">Track your improvement</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 p-0.5">
                <img className="h-full w-full rounded-full object-cover bg-black" src={user.photoUrl} alt="User" />
            </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto pt-8 px-4 space-y-8 animate-fade-in-up">
        {/* Toggle */}
        <div className="flex p-1.5 bg-white/5 rounded-2xl w-full max-w-md mx-auto border border-white/5">
            <button 
                onClick={() => setActiveTab('speaking')} 
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'speaking' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
            >
                Speaking
            </button>
            <button 
                onClick={() => setActiveTab('writing')} 
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'writing' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
            >
                Writing
            </button>
            <button 
                onClick={() => setActiveTab('vocab')} 
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'vocab' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
            >
                Vocab
            </button>
        </div>

        {activeTab === 'speaking' && (
             <div className="space-y-8">
                <div className="glass-card p-6 sm:p-8 rounded-[2rem]">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-lg font-bold text-gray-200">Speaking Trends</h2>
                        <div className="text-right">
                             <div className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                                {speakingReports.length}
                             </div>
                             <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Sessions</div>
                        </div>
                    </div>
                    <ProgressChart data={speakingChartData} lines={speakingLines} />
                </div>
                
                <h2 className="text-lg font-bold text-gray-300 px-2 uppercase tracking-wide text-xs">Recent Sessions</h2>
                <div className="space-y-4">
                    {speakingReports.length > 0 ? (
                        speakingReports.slice().reverse().map(report => (
                            <div key={report.id} className="bg-white/5 p-6 rounded-3xl flex justify-between items-center hover:bg-white/10 transition-all border border-white/5 group">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                        <span className="font-bold text-white text-lg">{new Date(report.date).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'})}</span>
                                    </div>
                                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors flex items-center gap-2">
                                        <span>{new Date(report.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                        <span>{report.transcript.length} turns</span>
                                    </p>
                                </div>
                                <div className="text-right bg-black/20 px-4 py-2 rounded-2xl border border-white/5">
                                    <div className="text-2xl font-bold text-white">{report.scores.overall.toFixed(1)}</div>
                                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Score</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-16 text-gray-500 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                            No speaking sessions recorded yet.
                        </div>
                    )}
                </div>
            </div>
        )}
        
        {activeTab === 'writing' && (
            <div className="space-y-8">
                <div className="glass-card p-6 sm:p-8 rounded-[2rem]">
                    <div className="flex items-center justify-between mb-8">
                         <h2 className="text-lg font-bold text-gray-200">Writing Trends</h2>
                         <div className="text-right">
                             <div className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
                                {writingReports.length}
                             </div>
                             <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Docs Scanned</div>
                        </div>
                    </div>
                    <ProgressChart data={writingChartData} lines={writingLines} />
                </div>

                <h2 className="text-lg font-bold text-gray-300 px-2 uppercase tracking-wide text-xs">History</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {writingReports.length > 0 ? (
                        writingReports.slice().reverse().map(report => (
                            <div key={report.id} className="bg-white/5 p-5 rounded-3xl flex gap-5 hover:bg-white/10 transition-colors border border-white/5">
                                <img src={report.imageUrl} alt="writing" className="w-24 h-24 object-cover rounded-2xl bg-gray-800 border border-white/10" />
                                <div className="flex-1 flex flex-col justify-between py-1">
                                    <div>
                                        <p className="font-bold text-white mb-1">{new Date(report.date).toLocaleDateString()}</p>
                                        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed italic">"{report.transcribedText}"</p>
                                    </div>
                                    <div className="flex justify-between items-end mt-3">
                                        <span className={`text-xs px-2 py-1 rounded-lg ${report.errors.length === 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                            {report.errors.length} corrections
                                        </span>
                                        <span className="text-xl font-bold text-white">{report.score}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                         <div className="col-span-full text-center py-16 text-gray-500 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                            No writing submissions yet.
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'vocab' && (
            <div className="space-y-8 animate-fade-in-up">
                <div className="glass-card p-8 rounded-[2rem] bg-gradient-to-br from-amber-900/30 to-orange-900/30">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-amber-500/20 rounded-full">
                             <BookIcon className="w-6 h-6 text-amber-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Your Wortschatz</h2>
                    </div>
                    <p className="text-gray-400">Words collected from your mistakes and conversations.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {vocabList.length > 0 ? (
                        vocabList.map((item, idx) => (
                            <div key={idx} className="bg-[#1a1a1a] p-5 rounded-3xl border border-white/5 hover:border-amber-500/30 transition-all group hover:translate-y-[-2px]">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="text-xl font-bold text-white">{item.word}</h3>
                                    <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">DE</span>
                                </div>
                                <p className="text-gray-400 text-sm mb-4 italic">{item.translation}</p>
                                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                                    <p className="text-xs text-gray-300 leading-relaxed">"{item.context}"</p>
                                </div>
                            </div>
                        ))
                    ) : (
                         <div className="col-span-full text-center py-16 text-gray-500 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                            No vocabulary collected yet. Complete a speaking session to generate cards.
                        </div>
                    )}
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default ProgressPage;

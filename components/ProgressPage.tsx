import React, { useState, useEffect } from 'react';
import { FeedbackReport, User, WritingReport, WritingReportError } from '../types';
import ProgressChart from './ProgressChart';
import { UserIcon, BotIcon } from './icons';

type Tab = 'speaking' | 'writing';

const WritingReportModal: React.FC<{ report: WritingReport; onClose: () => void }> = ({ report, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-2" onClick={onClose}>
            <div className="relative w-full max-w-4xl max-h-[90vh] p-4 sm:p-8 m-2 glass-card overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:bg-gray-700 hover:text-white rounded-lg text-sm p-1.5" aria-label="Close modal">
                     <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                </button>
                <h3 className="text-xl sm:text-2xl font-bold mb-4 pr-8">Writing Feedback from {new Date(report.date).toLocaleDateString()}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-4">
                        <img src={report.imageUrl} alt="User's writing" className="rounded-lg border border-gray-700 max-h-80 w-full object-contain" />
                        <div className="p-4 bg-black/20 rounded-lg">
                            <h4 className="text-lg font-semibold mb-2">Transcribed Text</h4>
                            <p className="text-gray-300 whitespace-pre-wrap font-serif italic text-sm sm:text-base">"{report.transcribedText}"</p>
                        </div>
                    </div>
                     <div className="space-y-4">
                        <div className="p-4 bg-black/20 rounded-lg">
                            <h4 className="text-lg font-semibold mb-2">Corrections</h4>
                            <div className="space-y-3">
                               {report.errors.length > 0 ? report.errors.map((err, index) => (
                                    <div key={index} className="border-l-4 border-purple-500 pl-3">
                                        <p className="text-red-400 text-sm sm:text-base"><span className="line-through">{err.error}</span> → <span className="text-green-400 font-semibold">{err.correction}</span></p>
                                        <p className="text-gray-400 text-xs sm:text-sm mt-1">{err.explanation}</p>
                                    </div>
                                )) : <p className="text-gray-400">No errors found!</p>}
                            </div>
                        </div>
                         <div className="p-4 bg-black/20 rounded-lg">
                            <h4 className="text-lg font-semibold mb-2">Improvement Tips</h4>
                            <ul className="space-y-2 list-disc list-inside text-gray-300 text-sm sm:text-base">
                                {report.improvementTips.map((tip, index) => <li key={index}>{tip}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


const ProgressPage: React.FC<{ user: User }> = ({ user }) => {
  const [speakingReports, setSpeakingReports] = useState<FeedbackReport[]>([]);
  const [writingReports, setWritingReports] = useState<WritingReport[]>([]);
  const [selectedSpeakingReport, setSelectedSpeakingReport] = useState<FeedbackReport | null>(null);
  const [selectedWritingReport, setSelectedWritingReport] = useState<WritingReport | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('speaking');

  useEffect(() => {
    try {
      const storedSpeaking = localStorage.getItem('german_tutor_reports');
      if (storedSpeaking) setSpeakingReports(JSON.parse(storedSpeaking));
      const storedWriting = localStorage.getItem('german_tutor_writing_reports');
      if (storedWriting) setWritingReports(JSON.parse(storedWriting));
    } catch (error) {
      console.error("Failed to parse reports from localStorage", error);
    }
  }, []);

  const speakingChartData = speakingReports.map(report => ({
    name: new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    overall: report.scores.overall,
    fluency: report.scores.fluency,
  }));
  const speakingLines = [
    { dataKey: 'overall', name: 'Overall Score', stroke: '#c084fc', strokeWidth: 3 },
    { dataKey: 'fluency', name: 'Fluency', stroke: '#f472b6', strokeWidth: 1 }
  ];

  const writingChartData = writingReports.map(report => ({
      name: new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: report.score
  }));
  const writingLines = [{ dataKey: 'score', name: 'Writing Score', stroke: '#60a5fa', strokeWidth: 3 }];

  return (
    <div className="min-h-screen text-gray-100 pb-28">
      <header className="absolute top-0 left-0 right-0 z-10">
        <div className="max-w-7xl mx-auto py-4 px-4 flex justify-between items-center">
            <h1 className="text-xl sm:text-2xl font-bold">Your Progress</h1>
            <div className="flex items-center">
                <span className="mr-3 font-medium hidden sm:inline">{user.name}</span>
                <img className="h-10 w-10 rounded-full" src={user.photoUrl} alt="User" />
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto pt-20 py-8 px-4">
        <div className="mb-6">
            <div className="flex space-x-1 sm:space-x-2 border-b border-white/10">
                <button onClick={() => setActiveTab('speaking')} className={`px-3 sm:px-4 py-2 text-base sm:text-lg font-medium transition-colors ${activeTab === 'speaking' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}>Speaking</button>
                <button onClick={() => setActiveTab('writing')} className={`px-3 sm:px-4 py-2 text-base sm:text-lg font-medium transition-colors ${activeTab === 'writing' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}>Writing</button>
            </div>
        </div>

        {activeTab === 'speaking' && (
             <div className="space-y-6 sm:space-y-8">
                <div className="glass-card p-4 sm:p-6 lg:p-8">
                    <h2 className="text-lg sm:text-xl font-semibold mb-4">Speaking Score Trend</h2>
                    <ProgressChart data={speakingChartData} lines={speakingLines} />
                </div>
                <div className="glass-card p-4 sm:p-6 lg:p-8">
                    <h2 className="text-lg sm:text-xl font-semibold mb-4">Speaking Session History</h2>
                    <div className="space-y-4">
                        {speakingReports.length > 0 ? (
                            speakingReports.slice().reverse().map(report => (
                                <div key={report.id} className="p-4 bg-black/20 border border-white/10 rounded-xl cursor-pointer hover:bg-white/20 transition-colors" onClick={() => setSelectedSpeakingReport(report)}>
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                        <div>
                                            <p className="font-semibold text-base sm:text-lg text-purple-300">Session from {new Date(report.date).toLocaleString()}</p>
                                            <p className="text-sm text-gray-400">{report.transcript.length} turns in conversation</p>
                                        </div>
                                        <div className="text-left sm:text-right mt-2 sm:mt-0">
                                            <p className="font-bold text-xl sm:text-2xl">{report.scores.overall.toFixed(1)}</p>
                                            <p className="text-sm text-gray-400">Overall Score</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : <p className="text-center text-gray-400 py-8">No speaking history found.</p>}
                    </div>
                </div>
            </div>
        )}
        
        {activeTab === 'writing' && (
            <div className="space-y-6 sm:space-y-8">
                <div className="glass-card p-4 sm:p-6 lg:p-8">
                    <h2 className="text-lg sm:text-xl font-semibold mb-4">Writing Score Trend</h2>
                    <ProgressChart data={writingChartData} lines={writingLines} />
                </div>
                <div className="glass-card p-4 sm:p-6 lg:p-8">
                    <h2 className="text-lg sm:text-xl font-semibold mb-4">Writing Practice History</h2>
                     <div className="space-y-4">
                        {writingReports.length > 0 ? (
                            writingReports.slice().reverse().map(report => (
                                <div key={report.id} className="p-4 bg-black/20 border border-white/10 rounded-xl cursor-pointer hover:bg-white/20 transition-colors" onClick={() => setSelectedWritingReport(report)}>
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="flex items-center gap-4">
                                            <img src={report.imageUrl} alt="writing thumbnail" className="w-16 h-16 object-cover rounded-lg"/>
                                            <div>
                                                <p className="font-semibold text-base sm:text-lg text-blue-300">Submission from {new Date(report.date).toLocaleString()}</p>
                                                <p className="text-sm text-gray-400">View feedback and corrections</p>
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right w-full sm:w-auto mt-2 sm:mt-0">
                                            <p className="font-bold text-xl sm:text-2xl">{report.score.toFixed(1)}</p>
                                            <p className="text-sm text-gray-400">Score</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : <p className="text-center text-gray-400 py-8">No writing history found.</p>}
                    </div>
                </div>
            </div>
        )}

      </main>

      {selectedSpeakingReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-2" onClick={() => setSelectedSpeakingReport(null)}>
            <div className="relative w-full max-w-2xl max-h-[90vh] p-4 sm:p-8 m-2 glass-card overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                 <button onClick={() => setSelectedSpeakingReport(null)} className="absolute top-4 right-4 text-gray-400 hover:bg-gray-700 hover:text-white rounded-lg text-sm p-1.5" aria-label="Close transcript modal">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                </button>
                <h3 className="text-xl sm:text-2xl font-bold mb-4 pr-8">Transcript for {new Date(selectedSpeakingReport.date).toLocaleDateString()}</h3>
                <div className="space-y-4 pr-2">
                    {selectedSpeakingReport.transcript.map((turn, index) => (
                        <div key={index} className={`flex items-end gap-2 sm:gap-3 ${turn.speaker === 'user' ? 'justify-end' : ''}`}>
                             {turn.speaker === 'ai' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center mb-1"><BotIcon className="w-5 h-5 text-purple-300" /></div>}
                            <div className={`p-3 rounded-xl max-w-xs sm:max-w-md text-white ${ turn.speaker === 'user' ? 'bg-gradient-to-r from-pink-500 to-purple-600 rounded-br-none' : 'bg-gray-700/80 rounded-bl-none'}`}>
                                <p className="text-sm">{turn.text}</p>
                            </div>
                            {turn.speaker === 'user' && <img src={user.photoUrl} alt="You" className="flex-shrink-0 w-8 h-8 rounded-full mb-1" />}
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
      {selectedWritingReport && <WritingReportModal report={selectedWritingReport} onClose={() => setSelectedWritingReport(null)} />}
    </div>
  );
};

export default ProgressPage;
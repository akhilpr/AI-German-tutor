import React, { useEffect, useRef } from 'react';
import { FeedbackReport, WordScore } from '../types';
import { DownloadIcon, UserIcon, BotIcon, CertificateIcon } from './icons';

interface FeedbackModalProps {
  report: FeedbackReport;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ report, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const modalElement = modalRef.current;
    if (!modalElement) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); };
  }, [onClose]);

  const downloadTranscript = () => {
    const transcriptText = report.transcript.map(turn => `${turn.speaker === 'user' ? 'You' : 'Tutor'}: ${turn.text}`).join('\n\n');
    const blob = new Blob([transcriptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `german-practice-transcript-${report.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderScore = (label: string, score: number) => {
    const percentage = score * 10;
    return (
      <div>
        <div className="flex justify-between mb-1">
          <span className={`text-base font-medium ${report.isExamCertificate ? 'text-gray-700' : 'text-gray-200'}`}>{label}</span>
          <span className={`text-sm font-medium ${report.isExamCertificate ? 'text-black' : 'text-purple-300'}`}>{score} / 10</span>
        </div>
        <div className={`w-full rounded-full h-2.5 ${report.isExamCertificate ? 'bg-gray-300' : 'bg-gray-700'}`}>
          <div className={`h-2.5 rounded-full ${report.isExamCertificate ? 'bg-amber-600' : 'bg-gradient-to-r from-pink-500 to-purple-600'}`} style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
    );
  };

  // Helper to find the word analysis for a given turn index
  const getWordAnalysisForTurn = (transcriptIndex: number) => {
      if (!report.pronunciationAnalysis) return null;
      return report.pronunciationAnalysis.find(p => p.turnIndex === transcriptIndex);
  };

  const renderHeatmapWord = (wordData: WordScore, idx: number) => {
      let colorClass = "text-white";
      if (wordData.status === 'perfect') colorClass = "text-green-400";
      if (wordData.status === 'okay') colorClass = "text-yellow-400";
      if (wordData.status === 'wrong') colorClass = "text-red-400 decoration-red-400 underline decoration-wavy";

      return (
          <span key={idx} className={`${colorClass} mr-1.5 inline-block`}>
              {wordData.word}
          </span>
      );
  };

  // EXAM / INTERVIEW CERTIFICATE STYLE
  if (report.isExamCertificate) {
      const isInterview = report.examTopicTitle?.toLowerCase().includes('interview') || report.examTopicTitle?.toLowerCase().includes('vorstellungsgespräch');
      const title = isInterview ? 'Interview Result' : 'Zertifikat';
      const subtitle = isInterview ? 'Candidate Evaluation' : 'Mock Exam Report';
      const passThreshold = isInterview ? 7 : 6;
      const passed = report.scores.overall >= passThreshold;
      const resultText = passed ? (isInterview ? 'Recommended for Hire' : 'Passed (Bestanden)') : (isInterview ? 'Not Selected' : 'Failed (Nicht Bestanden)');
      const resultColorClass = passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black sm:bg-black/80 sm:backdrop-blur-md sm:p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div ref={modalRef} onClick={(e) => e.stopPropagation()} className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-3xl overflow-y-auto">
                <div className="bg-[#fffbf0] text-black p-6 sm:p-12 min-h-full sm:min-h-0 sm:rounded-lg shadow-2xl border-[16px] border-double border-amber-700/20 relative flex flex-col justify-center">
                    
                    {/* Ornamental Border */}
                    <div className="absolute top-4 left-4 right-4 bottom-4 border border-amber-700/10 pointer-events-none"></div>
                    
                    <button onClick={onClose} className="absolute top-2 right-2 p-2 text-amber-900/50 hover:text-amber-900 z-10 sm:hidden bg-amber-50 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>

                    <div className="text-center mb-8 pt-4 sm:pt-0">
                        <CertificateIcon className="w-16 h-16 text-amber-600 mx-auto mb-4" />
                        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-gray-900 tracking-widest uppercase mb-2">{title}</h1>
                        <p className="text-amber-800 font-medium uppercase tracking-wide">{subtitle}</p>
                    </div>

                    <div className="mb-8 text-center">
                        <p className="text-gray-600 italic">This certifies that the candidate completed the session</p>
                        <h2 className="text-2xl font-bold text-gray-900 my-2">"{report.examTopicTitle || 'B2 Examination'}"</h2>
                        <p className="text-gray-600">on {new Date(report.date).toLocaleDateString()}</p>
                        {report.cefrLevel && <div className="mt-2 inline-block px-4 py-1 bg-amber-800 text-white rounded-full font-bold text-sm">Level: {report.cefrLevel}</div>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                         <div>
                             <h3 className="font-bold text-amber-800 uppercase text-xs tracking-wider mb-4 border-b border-amber-200 pb-2">Scores</h3>
                             <div className="space-y-4">
                                {renderScore('Professional Fluency', report.scores.fluency)}
                                {renderScore('Pronunciation & Clarity', report.scores.pronunciation)}
                                {renderScore('Grammar & Accuracy', report.scores.grammar)}
                                <div className="pt-2 font-bold">{renderScore('Overall Rating', report.scores.overall)}</div>
                             </div>
                         </div>
                         <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                             <h3 className="font-bold text-amber-800 uppercase text-xs tracking-wider mb-2">Evaluator's Notes</h3>
                             <ul className="list-disc list-inside text-sm text-gray-800 space-y-2">
                                 {report.improvementTips?.slice(0,3).map((pt, i) => <li key={i}>{pt}</li>)}
                             </ul>
                             <div className={`mt-4 text-center px-4 py-2 rounded font-bold uppercase tracking-widest text-sm ${resultColorClass}`}>
                                 {resultText}
                             </div>
                         </div>
                    </div>

                    <button onClick={onClose} className="w-full py-4 bg-gray-900 text-white font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors rounded-xl shadow-lg">
                        Close Report
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // STANDARD FEEDBACK STYLE (MOBILE FIRST)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black sm:bg-black/70 sm:backdrop-blur-sm sm:p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div ref={modalRef} className="relative w-full h-full sm:h-auto sm:max-w-5xl sm:max-h-[90vh] glass-card overflow-y-auto sm:rounded-2xl flex flex-col bg-[#050505]" onClick={(e) => e.stopPropagation()}>
        {/* Sticky Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/5 bg-black/80 backdrop-blur-md sticky top-0 z-20">
            <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Performance Analysis</h2>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">Est. Level: <strong className="text-white">{report.cefrLevel}</strong></span>
                    {report.dialectUsed && <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20"><strong className="text-white">{report.dialectUsed}</strong></span>}
                </div>
            </div>
            <button ref={closeButtonRef} onClick={onClose} className="text-gray-400 hover:bg-gray-700 hover:text-white rounded-full bg-white/5 p-2 transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
            </button>
        </div>
        
        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 pb-10">
            <div className="space-y-6">
                {/* Scores */}
                <div className="p-5 bg-black/40 rounded-2xl border border-white/10">
                    <h3 className="text-lg font-semibold text-gray-100 mb-4">Core Metrics</h3>
                    <div className="space-y-4">
                        {renderScore('Fluency', report.scores.fluency)}
                        {renderScore('Pronunciation', report.scores.pronunciation)}
                        {renderScore('Grammar', report.scores.grammar)}
                        <div className="pt-2 border-t border-white/5 mt-4">{renderScore('Overall', report.scores.overall)}</div>
                    </div>
                </div>

                {/* Detailed Grammar Table - Card Style for Mobile */}
                <div className="p-5 bg-black/40 rounded-2xl border border-white/10">
                    <h3 className="text-lg font-semibold text-gray-100 mb-4">Grammar Corrections</h3>
                    {report.grammarAnalysis && report.grammarAnalysis.length > 0 ? (
                        <div className="space-y-4">
                            {report.grammarAnalysis.map((item, idx) => (
                                <div key={idx} className="bg-white/5 p-4 rounded-xl border-l-4 border-l-red-500 shadow-sm">
                                    <div className="text-red-300 text-sm line-through opacity-70 mb-1 leading-snug">"{item.error}"</div>
                                    <div className="text-green-400 font-bold text-base mb-3 leading-snug">"{item.correction}"</div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 bg-black/30 p-2 rounded">
                                        <span className="font-bold uppercase text-[10px] text-blue-300 bg-blue-900/30 px-1.5 py-0.5 rounded">{item.type}</span>
                                        <span>{item.reason}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 bg-green-500/10 rounded-xl border border-green-500/20">
                            <div className="text-2xl mb-2">🎉</div>
                            <p className="text-green-400 font-medium">Excellent grammar! No errors found.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {/* Transcript with Heatmap */}
                <div className="p-5 bg-black/40 rounded-2xl flex-1 flex flex-col border border-white/10 min-h-[400px]">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                             <h3 className="text-lg font-semibold text-gray-100">Pronunciation Heatmap</h3>
                             <div className="flex gap-3 text-[10px] mt-1 font-medium">
                                 <span className="text-green-400">● Perfect</span>
                                 <span className="text-yellow-400">● Okay</span>
                                 <span className="text-red-400">● Wrong</span>
                             </div>
                        </div>
                        <button onClick={downloadTranscript} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                            <DownloadIcon className="w-5 h-5 text-gray-300" />
                        </button>
                    </div>
                    <div className="space-y-6 flex-1 pr-1">
                        {report.transcript.map((turn, index) => {
                            const wordAnalysis = turn.speaker === 'user' ? getWordAnalysisForTurn(index) : null;

                            return (
                                <div key={index} className={`flex items-start gap-3 ${turn.speaker === 'user' ? 'flex-row-reverse' : ''}`}>
                                    {turn.speaker === 'ai' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mt-1"><BotIcon className="w-4 h-4 text-white" /></div>}
                                    <div className={`p-4 rounded-2xl max-w-[90%] text-base leading-7 shadow-sm ${
                                        turn.speaker === 'user' ? 'bg-[#1e1e1e] border border-white/10 rounded-tr-none' : 'bg-white/5 border border-white/5 rounded-tl-none text-gray-300'
                                    }`}>
                                        {turn.speaker === 'user' && wordAnalysis && wordAnalysis.words ? (
                                            <div className="flex flex-wrap">
                                                {wordAnalysis.words.map((w, i) => renderHeatmapWord(w, i))}
                                            </div>
                                        ) : (
                                            <p>{turn.text}</p>
                                        )}
                                    </div>
                                     {turn.speaker === 'user' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center mt-1"><UserIcon className="w-4 h-4 text-gray-300" /></div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                 {/* Vocab Added */}
                 <div className="p-5 bg-gradient-to-br from-amber-900/20 to-orange-900/20 rounded-2xl border border-amber-500/20">
                    <h3 className="text-lg font-semibold text-amber-100 mb-3">New Vocabulary</h3>
                    <div className="flex flex-wrap gap-2">
                        {report.newVocabulary && report.newVocabulary.map((v, i) => (
                            <div key={i} className="flex flex-col bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5">
                                <span className="text-amber-200 text-sm font-bold">{v.word}</span>
                                <span className="text-amber-500/70 text-[10px] italic">{v.translation}</span>
                            </div>
                        ))}
                        {(!report.newVocabulary || report.newVocabulary.length === 0) && (
                            <span className="text-sm text-gray-500 italic">No new words detected.</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
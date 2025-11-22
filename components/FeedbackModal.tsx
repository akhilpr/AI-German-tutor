
import React, { useEffect, useRef } from 'react';
import { FeedbackReport } from '../types';
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

  // EXAM / INTERVIEW CERTIFICATE STYLE
  if (report.isExamCertificate) {
      const isInterview = report.examTopicTitle?.toLowerCase().includes('interview') || report.examTopicTitle?.toLowerCase().includes('vorstellungsgespräch');
      const title = isInterview ? 'Interview Result' : 'Zertifikat';
      const subtitle = isInterview ? 'Candidate Evaluation' : 'Mock Exam Report';
      const passThreshold = isInterview ? 7 : 6; // Interviews are strictly graded
      const passed = report.scores.overall >= passThreshold;
      const resultText = passed ? (isInterview ? 'Recommended for Hire' : 'Passed (Bestanden)') : (isInterview ? 'Not Selected' : 'Failed (Nicht Bestanden)');
      const resultColorClass = passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-md" onClick={onClose} role="dialog" aria-modal="true">
            <div ref={modalRef} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4">
                <div className="bg-[#fffbf0] text-black p-8 sm:p-12 rounded-lg shadow-2xl border-[16px] border-double border-amber-700/20 relative">
                    
                    {/* Ornamental Border */}
                    <div className="absolute top-4 left-4 right-4 bottom-4 border border-amber-700/10 pointer-events-none"></div>

                    <div className="text-center mb-8">
                        <CertificateIcon className="w-16 h-16 text-amber-600 mx-auto mb-4" />
                        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-gray-900 tracking-widest uppercase mb-2">{title}</h1>
                        <p className="text-amber-800 font-medium uppercase tracking-wide">{subtitle}</p>
                    </div>

                    <div className="mb-8 text-center">
                        <p className="text-gray-600 italic">This certifies that the candidate completed the session</p>
                        <h2 className="text-2xl font-bold text-gray-900 my-2">"{report.examTopicTitle || 'B2 Examination'}"</h2>
                        <p className="text-gray-600">on {new Date(report.date).toLocaleDateString()}</p>
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
                                 {report.weakPoints.slice(0,3).map((pt, i) => <li key={i}>{pt}</li>)}
                             </ul>
                             <div className={`mt-4 text-center px-4 py-2 rounded font-bold uppercase tracking-widest text-sm ${resultColorClass}`}>
                                 {resultText}
                             </div>
                         </div>
                    </div>

                    <button onClick={onClose} className="w-full py-3 bg-gray-900 text-white font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors">
                        Close Report
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // STANDARD FEEDBACK STYLE
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
      <div ref={modalRef} className="relative w-full max-w-4xl max-h-[90vh] p-4 sm:p-8 m-2 glass-card overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button ref={closeButtonRef} onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:bg-gray-700 hover:text-white rounded-lg text-sm p-1.5 ml-auto inline-flex items-center transition-colors z-10">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
        </button>
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-6">Conversation Feedback</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="space-y-6">
                <div className="p-4 sm:p-6 bg-black/20 rounded-2xl">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-100 mb-4">Performance Scores</h3>
                    <div className="space-y-4">
                        {renderScore('Fluency', report.scores.fluency)}
                        {renderScore('Pronunciation', report.scores.pronunciation)}
                        {renderScore('Grammar', report.scores.grammar)}
                        <div className="pt-2">{renderScore('Overall', report.scores.overall)}</div>
                    </div>
                </div>
                <div className="p-4 sm:p-6 bg-black/20 rounded-2xl">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-100 mb-4">Weak Points</h3>
                    <ul className="space-y-2 list-disc list-inside text-gray-300">{report.weakPoints.map((point, index) => <li key={index}>{point}</li>)}</ul>
                </div>
                <div className="p-4 sm:p-6 bg-black/20 rounded-2xl">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-100 mb-4">Improvement Tips</h3>
                    <ul className="space-y-2 list-disc list-inside text-gray-300">{report.improvementTips.map((tip, index) => <li key={index}>{tip}</li>)}</ul>
                </div>
            </div>
            <div className="p-4 sm:p-6 bg-black/20 rounded-2xl min-h-[300px] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-100">Transcript</h3>
                    <button onClick={downloadTranscript} className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-gray-200 bg-gray-600/50 rounded-lg hover:bg-gray-500/50 transition-colors">
                        <DownloadIcon className="w-4 h-4 mr-2" /> Download
                    </button>
                </div>
                <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                    {report.transcript.map((turn, index) => (
                        <div key={index} className={`flex items-end gap-2 sm:gap-3 ${turn.speaker === 'user' ? 'justify-end' : ''}`}>
                            {turn.speaker === 'ai' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center mb-1"><BotIcon className="w-5 h-5 text-purple-300" /></div>}
                            <div className={`p-3 rounded-xl max-w-xs sm:max-w-sm text-white ${turn.speaker === 'user' ? 'bg-gradient-to-r from-pink-500 to-purple-600 rounded-br-none' : 'bg-gray-700/80 rounded-bl-none'}`}>
                                <p className="text-sm">{turn.text}</p>
                            </div>
                             {turn.speaker === 'user' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center mb-1"><UserIcon className="w-5 h-5 text-gray-300" /></div>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;

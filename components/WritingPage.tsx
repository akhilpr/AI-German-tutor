import React, { useState, useCallback } from 'react';
import { User, WritingReport } from '../types';
import { getFeedbackOnWriting } from '../services/geminiService';
import { LoaderIcon, WritingIcon, LogoutIcon } from './icons';

interface WritingPageProps {
  user: User;
  onLogout: () => void;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const WritingPage: React.FC<WritingPageProps> = ({ user, onLogout }) => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [report, setReport] = useState<WritingReport | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setReport(null);
            setError(null);
            setImageFile(file);
            setImageUrl(URL.createObjectURL(file));
        }
    };

    const handleAnalyze = useCallback(async () => {
        if (!imageFile) return;

        setIsLoading(true);
        setError(null);
        setReport(null);

        try {
            const base64Data = await fileToBase64(imageFile);
            const feedbackData = await getFeedbackOnWriting(base64Data, imageFile.type);
            const newReport: WritingReport = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                imageUrl: imageUrl!,
                ...feedbackData,
            };
            setReport(newReport);

            const storedReportsRaw = localStorage.getItem('german_tutor_writing_reports');
            const storedReports = storedReportsRaw ? JSON.parse(storedReportsRaw) : [];
            localStorage.setItem('german_tutor_writing_reports', JSON.stringify([...storedReports, newReport]));

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Analysis failed.");
        } finally {
            setIsLoading(false);
        }
    }, [imageFile, imageUrl]);
    
    return (
        <div className="flex flex-col h-full bg-transparent text-white pb-28">
            <header className="sticky top-0 z-20 backdrop-blur-xl border-b border-white/5 bg-black/40">
                <div className="max-w-3xl mx-auto py-5 px-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">Writing Lab</h1>
                        <p className="text-xs text-gray-400">Handwriting Analysis & Correction</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onLogout}
                            className="text-gray-400 hover:text-red-400 transition-colors p-2"
                            title="Log Out"
                        >
                            <LogoutIcon className="w-5 h-5" />
                        </button>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 p-0.5">
                            <img className="h-full w-full rounded-full object-cover bg-black" src={user.photoUrl} alt={user.name} />
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-3xl w-full mx-auto p-6 overflow-y-auto scroll-smooth">
                {!report && (
                    <div className="flex flex-col h-full justify-center items-center space-y-10 animate-fade-in-up">
                        <div className="text-center space-y-3">
                             <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-2xl">
                                <WritingIcon className="w-10 h-10 text-blue-400" />
                             </div>
                            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400">Scan & Correct</h2>
                            <p className="text-gray-400 max-w-sm mx-auto text-base leading-relaxed">Upload a photo of your German writing. Nova will transcribe it, check grammar, and explain corrections.</p>
                        </div>

                        <div className="w-full max-w-md">
                            <label className={`relative group block w-full aspect-video border-2 border-dashed border-gray-700 rounded-[2rem] cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-300 overflow-hidden shadow-2xl ${imageUrl ? 'border-none ring-2 ring-white/10' : ''}`}>
                                {imageUrl ? (
                                    <>
                                        <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                            <span className="text-white font-semibold bg-white/10 px-6 py-3 rounded-full border border-white/20 hover:bg-white/20 transition-colors">Change Image</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
                                        <div className="p-4 rounded-full bg-white/5 group-hover:bg-blue-500/20 transition-colors">
                                             <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-400 group-hover:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                                        </div>
                                        <span className="font-medium text-lg">Tap to Upload</span>
                                    </div>
                                )}
                                <input type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                            </label>
                        </div>

                        <button
                            onClick={handleAnalyze}
                            disabled={!imageFile || isLoading}
                            className="w-full max-w-xs h-14 rounded-2xl font-bold text-white bg-white/10 border border-white/10 hover:bg-white/20 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-xl transition-all flex items-center justify-center gap-3 text-lg"
                        >
                            {isLoading ? (
                                <><LoaderIcon className="w-6 h-6 animate-spin text-purple-400" /> <span className="text-gray-300">Analyzing...</span></>
                            ) : (
                                'Analyze Writing'
                            )}
                        </button>
                         {error && <p className="text-red-300 bg-red-900/30 px-6 py-3 rounded-xl border border-red-500/30 animate-fade-in-up">{error}</p>}
                    </div>
                )}
                
                {report && (
                    <div className="space-y-8 pb-10 animate-fade-in-up">
                        {/* Header Actions */}
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-white">Analysis Result</h2>
                            <button onClick={() => { setReport(null); setImageUrl(null); setImageFile(null);}} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium text-gray-300 transition-colors">
                                New Scan
                            </button>
                        </div>

                        {/* Score Card */}
                        <div className="glass-card p-8 rounded-[2rem] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-green-500/20 to-blue-500/20 blur-3xl rounded-full pointer-events-none"></div>
                             <div className="flex justify-between items-center relative z-10">
                                <div className="space-y-1">
                                    <p className="text-gray-400 text-sm uppercase tracking-wider font-bold">Overall Quality</p>
                                    <h2 className="text-5xl font-extrabold text-white">{report.score}<span className="text-2xl text-gray-500 font-medium">/10</span></h2>
                                </div>
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${report.score >= 8 ? 'border-green-500 text-green-400' : report.score >= 5 ? 'border-yellow-500 text-yellow-400' : 'border-red-500 text-red-400'}`}>
                                    <span className="text-2xl font-bold">{report.score >= 8 ? 'A' : report.score >= 5 ? 'B' : 'C'}</span>
                                </div>
                            </div>
                            <div className="mt-8 h-3 bg-gray-800 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-1000 ease-out ${report.score >= 8 ? 'bg-green-500' : report.score >= 5 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${report.score * 10}%` }}></div>
                            </div>
                        </div>

                        {/* Transcription */}
                        <div className="bg-white/5 border border-white/5 p-8 rounded-[2rem]">
                            <h3 className="text-lg font-bold text-gray-300 mb-4 flex items-center gap-2 uppercase tracking-wide text-xs">
                                Original Text
                            </h3>
                            <p className="text-xl font-medium text-white leading-relaxed font-serif">"{report.transcribedText}"</p>
                        </div>

                        {/* Errors */}
                        <div>
                             <h3 className="text-lg font-bold text-gray-300 mb-5 flex items-center gap-2 uppercase tracking-wide text-xs">
                                Corrections
                            </h3>
                             <div className="grid gap-4">
                                {report.errors.length === 0 ? (
                                    <div className="p-8 bg-green-500/10 border border-green-500/20 rounded-[2rem] text-center">
                                        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <h4 className="text-green-300 font-bold text-lg">Perfect!</h4>
                                        <p className="text-green-400/70">No grammar errors found.</p>
                                    </div>
                                ) : (
                                    report.errors.map((err, idx) => (
                                        <div key={idx} className="bg-[#111] p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
                                            <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between mb-4">
                                                <div className="bg-red-900/20 text-red-300 px-4 py-2 rounded-xl border border-red-500/20 inline-block line-through decoration-red-400/50">
                                                    {err.error}
                                                </div>
                                                <div className="hidden md:block text-gray-600">
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                                </div>
                                                <div className="bg-green-900/20 text-green-300 px-4 py-2 rounded-xl border border-green-500/20 inline-block font-bold shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                                                    {err.correction}
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3 mt-3 pt-3 border-t border-white/5">
                                                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <span className="text-xs text-blue-400 font-bold">i</span>
                                                </div>
                                                <p className="text-sm text-gray-400 leading-relaxed">{err.explanation}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                             </div>
                        </div>
                        
                        {/* Tips */}
                        <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-white/10 p-8 rounded-[2rem]">
                             <h3 className="text-lg font-bold text-gray-300 mb-4 flex items-center gap-2 uppercase tracking-wide text-xs">
                                Teacher's Notes
                            </h3>
                             <ul className="space-y-4">
                                {report.improvementTips.map((tip, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-gray-200">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
                                        <span className="text-base">{tip}</span>
                                    </li>
                                ))}
                             </ul>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default WritingPage;
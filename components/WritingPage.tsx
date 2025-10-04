import React, { useState, useCallback } from 'react';
import { User, WritingReport } from '../types';
import { getFeedbackOnWriting } from '../services/geminiService';
import { LoaderIcon } from './icons';

interface WritingPageProps {
  user: User;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const WritingPage: React.FC<WritingPageProps> = ({ user }) => {
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
                id: new Date().toISOString(),
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
            setError(err instanceof Error ? err.message : "An unknown error occurred during analysis.");
        } finally {
            setIsLoading(false);
        }
    }, [imageFile, imageUrl]);
    
    const renderScore = (score: number) => {
        const percentage = score * 10;
        return (
          <div className="p-4 sm:p-6 bg-black/20 rounded-2xl">
            <div className="flex justify-between items-center mb-1">
              <span className="text-lg sm:text-xl font-semibold text-gray-100">Overall Score</span>
              <span className="text-lg sm:text-xl font-bold text-purple-300">{score.toFixed(1)} / 10</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 mt-2">
              <div className="bg-gradient-to-r from-pink-500 to-purple-600 h-3 rounded-full" style={{ width: `${percentage}%` }}></div>
            </div>
          </div>
        );
      };

    return (
        <div className="flex flex-col h-full bg-transparent text-white">
            <header className="absolute top-0 left-0 right-0 z-10">
                <div className="max-w-4xl mx-auto py-4 px-4 flex justify-between items-center">
                    <div className="text-left">
                        <h1 className="text-lg sm:text-xl font-semibold">Writing Practice</h1>
                        <p className="text-sm text-gray-400">Get feedback on your handwriting</p>
                    </div>
                    <img className="h-10 w-10 rounded-full" src={user.photoUrl} alt={user.name} />
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center max-w-4xl w-full mx-auto pt-20 pb-28 px-4 overflow-y-auto">
                <div className="w-full">
                    {!report && (
                        <div className="space-y-6">
                            <label htmlFor="file-upload" className="relative block w-full h-56 sm:h-64 border-2 border-dashed border-gray-600 rounded-2xl cursor-pointer hover:border-purple-500 transition-colors">
                                {imageUrl ? (
                                    <img src={imageUrl} alt="Preview" className="w-full h-full object-contain rounded-2xl p-2" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center p-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" x2="12" y1="3" y2="15"></line></svg>
                                        <span className="mt-2 text-base sm:text-lg font-medium">Upload a picture of your writing</span>
                                        <span className="text-xs sm:text-sm">PNG, JPG, or WEBP</span>
                                    </div>
                                )}
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/png, image/jpeg, image/webp" onChange={handleImageChange} />
                            </label>

                            <div className="text-center">
                                <button
                                    onClick={handleAnalyze}
                                    disabled={!imageFile || isLoading}
                                    className="w-full max-w-xs h-12 sm:h-14 rounded-full flex items-center justify-center transition-all duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-purple-500/50 relative shadow-lg shadow-purple-500/30 bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg font-semibold"
                                >
                                    {isLoading ? <LoaderIcon className="w-7 h-7 sm:w-8 sm:h-8 animate-spin" /> : 'Analyze Writing'}
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 bg-red-800/80 border border-red-600 text-red-100 px-4 py-3 rounded-lg shadow-lg text-center" role="alert">
                            <p>{error}</p>
                        </div>
                    )}
                    
                    {report && (
                        <div className="space-y-6 animate-fade-in">
                            {renderScore(report.score)}
                            <div className="p-4 sm:p-6 bg-black/20 rounded-2xl">
                                <h3 className="text-lg sm:text-xl font-semibold text-gray-100 mb-4">Transcribed Text</h3>
                                <p className="text-gray-300 whitespace-pre-wrap font-serif italic">"{report.transcribedText}"</p>
                            </div>
                            <div className="p-4 sm:p-6 bg-black/20 rounded-2xl">
                                <h3 className="text-lg sm:text-xl font-semibold text-gray-100 mb-4">Corrections</h3>
                                <div className="space-y-4">
                                    {report.errors.length > 0 ? report.errors.map((err, index) => (
                                        <div key={index} className="border-l-4 border-purple-500 pl-4">
                                            <p className="text-red-400"><span className="line-through">{err.error}</span> → <span className="text-green-400 font-semibold">{err.correction}</span></p>
                                            <p className="text-gray-400 text-sm mt-1">{err.explanation}</p>
                                        </div>
                                    )) : <p className="text-gray-400">No errors found. Great job!</p>}
                                </div>
                            </div>
                             <div className="p-4 sm:p-6 bg-black/20 rounded-2xl">
                                <h3 className="text-lg sm:text-xl font-semibold text-gray-100 mb-4">Improvement Tips</h3>
                                <ul className="space-y-2 list-disc list-inside text-gray-300">
                                    {report.improvementTips.map((tip, index) => <li key={index}>{tip}</li>)}
                                </ul>
                            </div>
                             <div className="text-center">
                                <button onClick={() => { setReport(null); setImageUrl(null); setImageFile(null);}} className="text-purple-400 hover:text-purple-300 font-semibold">Analyze another writing</button>
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
};

export default WritingPage;
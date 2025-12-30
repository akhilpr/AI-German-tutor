
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { User, ConversationTurn, FeedbackReport, Scenario } from '../types';
import { MicIcon, StopIcon, BotIcon, UserIcon, CameraIcon } from './icons';
import { encode, decode, decodeAudioData } from '../utils/audio';
import { getFeedbackOnConversation } from '../services/geminiService';
import FeedbackModal from './FeedbackModal';

interface SpeakingPageProps {
  user: User;
  scenario: Scenario;
  onSessionComplete: (report: FeedbackReport) => void;
  onBack: () => void;
}

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const SCRIPT_PROCESSOR_BUFFER_SIZE = 4096;

const NovaOrb: React.FC<{ state: 'idle' | 'listening' | 'thinking' | 'speaking' }> = ({ state }) => (
    <div className="orb-container">
         <div className="ring-1 orb-ring"></div>
         <div className="ring-2 orb-ring"></div>
         <div className={`orb-core ${state}`}></div>
    </div>
);

const SpeakingPage: React.FC<SpeakingPageProps> = ({ user, scenario, onSessionComplete, onBack }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [aiState, setAiState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState<ConversationTurn[]>([]);
  const [feedbackReport, setFeedbackReport] = useState<FeedbackReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  
  const aiRef = useRef<GoogleGenAI | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());

  useEffect(() => {
    if (!process.env.API_KEY) {
      setError("API_KEY environment variable is not set.");
      return;
    }
    aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
    
    // Automatically start recording when the component mounts
    startRecording();

    return () => { stopRecording(false); };
  }, []);

  useEffect(() => {
    if (transcriptEndRef.current && showTranscript) {
        transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, showTranscript]);

  const handlePlayback = useCallback(async (base64EncodedAudioString: string) => {
    const outputAudioContext = outputAudioContextRef.current;
    if (!outputAudioContext) return;
    if (aiState === 'listening') return;
    setAiState('speaking');
    const currentTime = outputAudioContext.currentTime;
    if (nextStartTimeRef.current < currentTime) nextStartTimeRef.current = currentTime;
    try {
        const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), outputAudioContext, OUTPUT_SAMPLE_RATE, 1);
        const source = outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputAudioContext.destination);
        source.addEventListener('ended', () => { 
            audioSourcesRef.current.delete(source); 
            if(audioSourcesRef.current.size === 0) setAiState(isRecording ? 'listening' : 'idle');
        });
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
        audioSourcesRef.current.add(source);
    } catch (e) { console.error("Audio decode error", e); }
  }, [aiState, isRecording]);
  
  const stopPlayback = useCallback(() => {
    if (outputAudioContextRef.current) {
        for (const source of audioSourcesRef.current.values()) source.stop();
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;
    }
  }, []);

  const stopRecording = useCallback(async (shouldGetFeedback: boolean = true) => {
    if (!isRecording) return;
    setIsRecording(false);
    setAiState('thinking'); 

    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(track => track.stop()); mediaStreamRef.current = null; }
    if (mediaStreamSourceRef.current && scriptProcessorRef.current) {
        mediaStreamSourceRef.current.disconnect();
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current.onaudioprocess = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
    if (sessionPromiseRef.current) { (await sessionPromiseRef.current).close(); sessionPromiseRef.current = null; }
    
    stopPlayback();

    if (shouldGetFeedback && transcript.length > 1) {
      try {
        const feedbackData = await getFeedbackOnConversation(transcript);
        const xpGained = Math.round(feedbackData.scores.overall * 5 + transcript.length * 2);

        const newReport: FeedbackReport = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          ...feedbackData,
          transcript: [...transcript],
          isExamCertificate: scenario?.isExamPrep,
          examTopicTitle: scenario?.dynamicTopic?.title || scenario?.title,
          dialectUsed: 'Standard', // Placeholder
          xpEarned: xpGained,
          scenarioId: scenario.id,
        };
        
        onSessionComplete(newReport);
        setFeedbackReport(newReport);

      } catch (error) {
        setError("Feedback generation failed.");
      }
    } else {
       if (!shouldGetFeedback) setTranscript([]); 
    }
    setAiState('idle');
  }, [isRecording, transcript, stopPlayback, scenario, onSessionComplete]);

  const startRecording = useCallback(async () => {
    if (!aiRef.current || !scenario || isRecording) return;
    setError(null);
    setTranscript([]); 
    setIsRecording(true);
    setAiState('listening');
    setShowTranscript(false);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
        audioContextRef.current = inputAudioContext;
        const source = inputAudioContext.createMediaStreamSource(stream);
        mediaStreamSourceRef.current = source;
        const scriptProcessor = inputAudioContext.createScriptProcessor(SCRIPT_PROCESSOR_BUFFER_SIZE, 1, 1);
        scriptProcessorRef.current = scriptProcessor;

        let currentInputTranscription = '';
        let currentOutputTranscription = '';

        const callbacks = {
          onopen: () => {
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob: Blob = { data: encode(new Uint8Array(new Int16Array(inputData.map(f => f * 32768)).buffer)), mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` };
                sessionPromiseRef.current?.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) currentOutputTranscription += message.serverContent.outputTranscription.text;
            if (message.serverContent?.inputTranscription) currentInputTranscription += message.serverContent.inputTranscription.text;
            // FIX: Refactored transcript update to be type-safe and fix a logic bug with filter.
            if (message.serverContent?.turnComplete) {
              const finalUserInput = currentInputTranscription.trim();
              const finalModelOutput = currentOutputTranscription.trim();

              const newTurns: ConversationTurn[] = [];
              if (finalUserInput) {
                newTurns.push({ speaker: 'user', text: finalUserInput });
              }
              if (finalModelOutput) {
                newTurns.push({ speaker: 'ai', text: finalModelOutput });
              }

              if (newTurns.length > 0) {
                setTranscript(prev => [...prev, ...newTurns]);
              }
              
              currentInputTranscription = '';
              currentOutputTranscription = '';
            }
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) handlePlayback(base64Audio); 
            if (message.serverContent?.interrupted) { stopPlayback(); setAiState('listening'); currentOutputTranscription = ''; }
          },
          onerror: (e: ErrorEvent) => { setError("Connection lost."); stopRecording(false); },
          onclose: (e: CloseEvent) => { setAiState('idle'); },
      };
        
        sessionPromiseRef.current = aiRef.current.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks,
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction: scenario.systemPrompt,
            },
        });
    } catch (err) { setIsRecording(false); setAiState('idle'); }
  }, [handlePlayback, stopPlayback, stopRecording, scenario, isRecording]);
  
  return (
    <div className="flex flex-col h-full bg-transparent text-white relative overflow-hidden">
        <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
            <div className="max-w-4xl mx-auto py-4 px-4 flex justify-between items-center pointer-events-auto">
                <button onClick={() => {stopRecording(false); onBack();}} className="glass-panel px-3 py-2 rounded-full flex items-center gap-2 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white transition-colors text-xs font-bold uppercase tracking-wide active:scale-95">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back
                </button>
                <button onClick={() => setShowTranscript(!showTranscript)} className={`glass-panel p-2.5 rounded-full transition-all duration-300 active:scale-95 ${showTranscript ? 'bg-white/10 text-white' : 'hover:bg-white/10 text-gray-400'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2-2z"></path></svg>
                </button>
            </div>
        </header>

        <div className="absolute top-20 left-0 right-0 z-10 flex justify-center pointer-events-none">
            <div className="animate-fade-in-up bg-black/20 backdrop-blur-md px-5 py-2 rounded-full border border-white/5 flex items-center gap-3 shadow-xl">
                <span className="text-xl">{scenario.emoji}</span>
                <span className="text-sm font-semibold text-gray-200 truncate max-w-[200px]">{scenario.title}</span>
            </div>
        </div>

        <main className="flex-1 w-full relative flex flex-col items-center justify-between p-4 pt-24 pb-10 min-h-0">
            <div className="flex flex-col items-center justify-center text-center">
                <NovaOrb state={aiState} />
                <div className="mt-6 text-center h-6 transition-all duration-500">
                    {aiState === 'listening' && <p className="text-blue-400 text-sm font-bold tracking-widest uppercase animate-pulse">Listening</p>}
                    {aiState === 'thinking' && <p className="text-purple-400 text-sm font-bold tracking-widest uppercase animate-pulse">Thinking</p>}
                    {aiState === 'speaking' && <p className="text-pink-400 text-sm font-bold tracking-widest uppercase">Nova Speaking</p>}
                </div>
            </div>

            <div className={`transition-all duration-500 w-full flex flex-col items-center ${showTranscript ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                 <button
                    onClick={() => stopRecording(true)}
                    disabled={aiState === 'thinking' || !isRecording}
                    className="relative group flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 shadow-2xl active:scale-95 bg-red-500/10"
                >
                     <div className="absolute inset-0 rounded-full blur-xl bg-red-500/40 scale-110"></div>
                     <div className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center border bg-gradient-to-br from-red-500 to-red-600 border-red-400 text-white">
                        <StopIcon className="w-8 h-8 fill-current" />
                     </div>
                </button>
                <p className="text-center text-xs text-gray-400 mt-4 font-bold uppercase tracking-wider">Finish Session</p>
            </div>

             <div className={`absolute inset-x-0 bottom-0 max-h-[70%] bg-[#0a0a0a]/95 backdrop-blur-2xl z-30 transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) rounded-t-[2rem] border-t border-white/10 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] ${showTranscript ? 'translate-y-0' : 'translate-y-[110%]'}`}>
                 <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5 rounded-t-[2rem]">
                    <h3 className="font-bold text-base text-white">Live Transcript</h3>
                    <button onClick={() => setShowTranscript(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors active:scale-95">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300"><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-10">
                    {transcript.length === 0 && <p className="text-center text-gray-500 mt-10 italic text-sm">Start speaking to see the conversation...</p>}
                    {transcript.map((turn, index) => (
                        <div key={index} className={`flex items-start gap-3 ${turn.speaker === 'user' ? 'flex-row-reverse' : ''} animate-fade-in-up`}>
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${turn.speaker === 'ai' ? 'bg-gradient-to-br from-purple-600 to-indigo-600' : 'bg-gray-700'}`}>
                                {turn.speaker === 'ai' ? <BotIcon className="w-4 h-4 text-white" /> : <UserIcon className="w-4 h-4 text-gray-300" />}
                             </div>
                             <div className={`p-3 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-sm ${turn.speaker === 'user' ? 'bg-gradient-to-r from-blue-600/40 to-blue-500/40 border border-blue-500/20 text-blue-50 rounded-tr-none' : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none'}`}>
                                {turn.text}
                             </div>
                        </div>
                    ))}
                    <div ref={transcriptEndRef} />
                 </div>
            </div>
        </main>

      {error && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-red-500/20 backdrop-blur-xl border border-red-500/30 text-red-100 px-4 py-3 rounded-xl shadow-2xl text-center z-50 animate-fade-in-up text-sm">
                <p className="font-semibold">{error}</p>
            </div>
      )}

      {feedbackReport && <FeedbackModal report={feedbackReport} onClose={() => {setFeedbackReport(null); onBack();}} />}
    </div>
  );
};

export default SpeakingPage;
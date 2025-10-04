import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { User, ConversationTurn, AppView, FeedbackReport } from '../types';
import { MicIcon, StopIcon, LoaderIcon, BotIcon } from './icons';
import { encode, decode, decodeAudioData } from '../utils/audio';
import { getFeedbackOnConversation } from '../services/geminiService';
import FeedbackModal from './FeedbackModal';

interface ConversationPageProps {
  user: User;
}

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const SCRIPT_PROCESSOR_BUFFER_SIZE = 4096;

const WaveformVisualizer: React.FC<{ isListening: boolean; isSpeaking: boolean }> = ({ isListening, isSpeaking }) => {
    const activeClass = isListening ? 'listening' : isSpeaking ? 'speaking' : '';
    // A repeating wave pattern that is twice the width of the viewBox
    const wavePath = "M0,50 Q62.5,0 125,50 T250,50 Q312.5,100 375,50 T500,50";
    
    return (
        <div className={`waveform-container ${activeClass}`}>
            <svg width="100%" height="100%" viewBox="0 0 250 100" preserveAspectRatio="xMidYMid meet">
                <g className="wave-group">
                    <path className="wave wave1" d={wavePath} />
                    <path className="wave wave2" d={wavePath} />
                    <path className="wave wave3" d={wavePath} />
                </g>
            </svg>
        </div>
    );
};

const ConversationPage: React.FC<ConversationPageProps> = ({ user }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<ConversationTurn[]>([]);
  const [feedbackReport, setFeedbackReport] = useState<FeedbackReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const aiRef = useRef<GoogleGenAI | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());

  useEffect(() => {
    if (!process.env.API_KEY) {
      setError("API_KEY environment variable is not set. The application cannot function.");
      return;
    }
    aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });

    return () => {
      stopRecording(false);
    };
  }, []);

  useEffect(() => {
    if (transcriptContainerRef.current) {
        transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [transcript]);

  const handlePlayback = useCallback(async (base64EncodedAudioString: string) => {
    const outputAudioContext = outputAudioContextRef.current;
    if (!outputAudioContext) return;
    
    setIsAiSpeaking(true);
    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
    const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), outputAudioContext, OUTPUT_SAMPLE_RATE, 1);
    const source = outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outputAudioContext.destination);
    source.addEventListener('ended', () => { 
        audioSourcesRef.current.delete(source); 
        if(audioSourcesRef.current.size === 0) {
            setIsAiSpeaking(false);
        }
    });
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
    audioSourcesRef.current.add(source);
  }, []);
  
  const stopPlayback = useCallback(() => {
    if (outputAudioContextRef.current) {
        for (const source of audioSourcesRef.current.values()) {
            source.stop();
        }
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        setIsAiSpeaking(false);
    }
  }, []);

  const stopRecording = useCallback(async (shouldGetFeedback: boolean = true) => {
    if (!isRecording && !isProcessing) return;

    setIsRecording(false);

    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;

    if (mediaStreamSourceRef.current && scriptProcessorRef.current) {
        mediaStreamSourceRef.current.disconnect();
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current.onaudioprocess = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
    }
    
    if (sessionPromiseRef.current) {
        const session = await sessionPromiseRef.current;
        session.close();
        sessionPromiseRef.current = null;
    }
    
    stopPlayback();

    if (shouldGetFeedback && transcript.length > 1) {
      setIsProcessing(true);
      setError(null);
      try {
        const feedbackData = await getFeedbackOnConversation(transcript);
        const newReport: FeedbackReport = {
          id: new Date().toISOString(),
          date: new Date().toISOString(),
          ...feedbackData,
          transcript: transcript,
        };
        
        const storedReportsRaw = localStorage.getItem('german_tutor_reports');
        const storedReports = storedReportsRaw ? JSON.parse(storedReportsRaw) : [];
        localStorage.setItem('german_tutor_reports', JSON.stringify([...storedReports, newReport]));

        setFeedbackReport(newReport);
      } catch (error) {
        console.error("Failed to get feedback:", error);
        setError("Sorry, we couldn't generate feedback for this session.");
      } finally {
        setIsProcessing(false);
      }
    } else {
        if (!shouldGetFeedback) setTranscript([]);
    }
  }, [isRecording, isProcessing, transcript, stopPlayback]);

  const startRecording = useCallback(async () => {
    if (!aiRef.current) {
        setError("AI Service is not initialized.");
        return;
    }
    
    setError(null);
    setTranscript([]);
    setIsRecording(true);

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
                const l = inputData.length;
                const int16 = new Int16Array(l);
                for (let i = 0; i < l; i++) { int16[i] = inputData[i] * 32768; }
                const pcmBlob: Blob = {
                    data: encode(new Uint8Array(int16.buffer)),
                    mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
                };
                sessionPromiseRef.current?.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              currentOutputTranscription += message.serverContent.outputTranscription.text;
            }
            if (message.serverContent?.inputTranscription) {
              currentInputTranscription += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.turnComplete) {
              const finalUserInput = currentInputTranscription.trim();
              const finalModelOutput = currentOutputTranscription.trim();
              if (finalUserInput) { setTranscript(prev => [...prev, { speaker: 'user', text: finalUserInput }]); }
              if (finalModelOutput) { setTranscript(prev => [...prev, { speaker: 'ai', text: finalModelOutput }]); }
              currentInputTranscription = '';
              currentOutputTranscription = '';
            }
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) { handlePlayback(base64Audio); }
            if (message.serverContent?.interrupted) { stopPlayback(); }
          },
          onerror: (e: ErrorEvent) => {
              console.error('Session error:', e);
              setError("An error occurred with the conversation. Please try again.");
              stopRecording(false);
          },
          onclose: (e: CloseEvent) => {},
      };

        sessionPromiseRef.current = aiRef.current.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks,
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction: 'You are a friendly and patient German language tutor named Nova. Keep your responses concise and encourage the user to speak. Start the conversation by asking "Hallo! Wie geht es Ihnen heute?".',
            },
        });
        
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Could not access microphone. Please check your browser permissions.');
      setIsRecording(false);
    }
  }, [handlePlayback, stopPlayback, stopRecording]);
  
  const handleCloseModal = () => {
    setFeedbackReport(null);
    setTranscript([]);
  };

  const hasStarted = transcript.length > 0;

  return (
    <div className="flex flex-col h-full bg-transparent text-white">
        <header className="absolute top-0 left-0 right-0 z-10">
            <div className="max-w-4xl mx-auto py-4 px-4 flex justify-between items-center">
                <div className="text-left">
                    <h1 className="text-lg sm:text-xl font-semibold">Chat with Nova</h1>
                    <p className="text-sm text-gray-400">German Speaking Tutor</p>
                </div>
                <img className="h-10 w-10 rounded-full" src={user.photoUrl} alt={user.name} />
            </div>
        </header>

      <main className="flex-1 flex flex-col p-4 w-full mx-auto justify-end pb-28 sm:pb-32">
        <div ref={transcriptContainerRef} className="flex-1 overflow-y-auto space-y-4 mb-4" aria-live="polite" aria-atomic="false">
            <div className="flex-grow flex items-center justify-center">
                <div className="text-center text-gray-400">
                    <WaveformVisualizer isListening={isRecording} isSpeaking={isAiSpeaking} />
                     <div className="transition-opacity duration-500" style={{ opacity: hasStarted ? 0 : 1, height: hasStarted ? 0 : 'auto' }}>
                        <p className="mt-4 text-base sm:text-lg">
                          {isRecording ? "Listening..." : "Tap the mic to start speaking"}
                        </p>
                    </div>
                </div>
            </div>
            {transcript.map((turn, index) => (
                <div key={index} className={`flex items-end gap-2 sm:gap-3 w-full ${turn.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {turn.speaker === 'ai' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center mb-1"><BotIcon className="w-5 h-5 text-purple-300" /></div>}
                    <div className={`p-3 sm:p-4 rounded-2xl max-w-[80%] sm:max-w-md shadow-lg text-white ${
                        turn.speaker === 'user' 
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 rounded-br-none' 
                        : 'bg-gray-800/80 rounded-bl-none'
                    }`}>
                        <p className="text-sm sm:text-base">{turn.text}</p>
                    </div>
                    {turn.speaker === 'user' && <img src={user.photoUrl} alt="You" className="flex-shrink-0 w-8 h-8 rounded-full mb-1" />}
                </div>
            ))}
        </div>

        <div className="mt-auto pt-4">
            <div className="flex items-center justify-center relative">
                {isProcessing ? (
                     <div className="flex flex-col items-center space-y-2 text-center">
                        <LoaderIcon className="w-12 h-12 sm:w-16 sm:h-16 text-purple-400 animate-spin" />
                        <p className="text-gray-400 text-sm sm:text-base">Analyzing your conversation...</p>
                    </div>
                ) : (
                    <>
                        {isRecording && <button onClick={() => stopRecording(false)} className="absolute right-full mr-4 text-gray-400 hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>}
                        <button
                            onClick={isRecording ? () => stopRecording(true) : startRecording}
                            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-purple-500/50 relative shadow-2xl shadow-purple-500/40
                            bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700`}
                            disabled={isProcessing}
                            aria-label={isRecording ? 'Stop conversation' : 'Start conversation'}
                        >
                             {isRecording && <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse"></div>}
                             {isRecording ? <StopIcon className="w-7 h-7 sm:w-8 sm:h-8"/> : <MicIcon className="w-7 h-7 sm:w-8 sm:h-8"/>}
                        </button>
                    </>
                )}
            </div>
        </div>
      </main>

      {error && (
            <div className="fixed bottom-28 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-red-800/80 border border-red-600 text-red-100 px-4 py-3 rounded-lg shadow-lg text-center z-30" role="alert">
                <p>{error}</p>
            </div>
      )}

      {feedbackReport && <FeedbackModal report={feedbackReport} onClose={handleCloseModal} />}
    </div>
  );
};

export default ConversationPage;
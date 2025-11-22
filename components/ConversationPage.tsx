
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { User, ConversationTurn, FeedbackReport, Scenario, UserTrack } from '../types';
import { MicIcon, StopIcon, BotIcon, UserIcon, CameraIcon } from './icons';
import { encode, decode, decodeAudioData } from '../utils/audio';
import { getFeedbackOnConversation } from '../services/geminiService';
import FeedbackModal from './FeedbackModal';

interface ConversationPageProps {
  user: User;
}

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const SCRIPT_PROCESSOR_BUFFER_SIZE = 4096;
const VIDEO_FRAME_RATE = 1; // 1 FPS to save bandwidth for Indian market

// SCENARIO DATABASE - Tailored for Kerala Market / B2B Institutions
const SCENARIOS: Scenario[] = [
    // --- EXAM PREP (All Tracks) ---
    {
        id: 'exam_b2_planen',
        title: 'Exam Prep: Plan Together',
        description: 'Practice "Teil 3: Gemeinsam etwas planen". We must organize a surprise party for a colleague.',
        emoji: '📝',
        difficulty: 'B2',
        track: 'all',
        isExamPrep: true,
        colorFrom: 'from-red-500',
        colorTo: 'to-orange-600',
        systemPrompt: 'EXAM SIMULATION MODE (Goethe/Telc B2 - Teil 3). You are the exam partner. We need to plan a surprise party for a colleague "Müller". You must: 1. Disagree politely with some of the user suggestions to test their argumentation. 2. Suggest alternatives. 3. Ensure we cover: Food, Location, Gift, and Music. Keep the conversation flowing naturally but ensure the user speaks in full sentences.'
    },
    
    // --- NURSING TRACK (Pflege) ---
    {
        id: 'nurse_anamnese',
        title: 'Patient Admission (Anamnese)',
        description: 'Admit a new patient with stomach pain. Ask about pain level, history, and allergies.',
        emoji: '🏥',
        difficulty: 'B2',
        track: 'nursing',
        colorFrom: 'from-emerald-500',
        colorTo: 'to-teal-600',
        systemPrompt: 'Roleplay: You are Herr Weber, an elderly patient admitted to the hospital. You have severe stomach pain (lower right). You are anxious. The user is the Nurse (Pfleger/in). They must ask about: 1. Pain level (1-10). 2. When it started. 3. Previous surgeries. 4. Allergies. Speak with a slight elderly tremble but clear German. Use pain vocabulary (stechend, drückend).'
    },
    {
        id: 'nurse_uebergabe',
        title: 'Shift Handover (Übergabe)',
        description: 'Give a handover report to a colleague about a patient who fell earlier.',
        emoji: '📋',
        difficulty: 'B2',
        track: 'nursing',
        colorFrom: 'from-cyan-500',
        colorTo: 'to-blue-600',
        systemPrompt: 'Roleplay: You are the colleague coming for the night shift. The user is ending their shift. They must explain that patient "Frau Klein" fell down at 14:00. Ask clarifying questions: "Did you call the doctor?", "Is the family informed?", "Are the vitals stable?". Force the user to use Präteritum/Perfekt tense.'
    },

    // --- ACADEMIC TRACK (Student) ---
    {
        id: 'student_visa',
        title: 'Visa Interview Prep',
        description: 'Simulate the consulate interview. Explain why you want to study in Germany.',
        emoji: '🛂',
        difficulty: 'B1',
        track: 'academic',
        colorFrom: 'from-indigo-500',
        colorTo: 'to-purple-600',
        systemPrompt: 'Roleplay: You are the Beamter (officer) at the German Consulate. The user is applying for a student visa. Ask stern but fair questions: "Why Germany?", "How will you finance your studies?", "Where will you live?". Correct them if they are too informal. Ensure they use "Sie".'
    },
    {
        id: 'student_enrollment',
        title: 'University Registration',
        description: 'You are missing a document for enrollment. Negotiate with the secretary.',
        emoji: '🎓',
        difficulty: 'B2',
        track: 'academic',
        colorFrom: 'from-blue-500',
        colorTo: 'to-indigo-500',
        systemPrompt: 'Roleplay: You are the university secretary. The user wants to enroll (immatrikulieren) but is missing their health insurance proof (Krankenversicherungsnachweis). Be bureaucratic. Tell them it is impossible without it. Force them to convince you to give them a temporary extension.'
    },

    // --- GENERAL ---
    {
        id: 'free_talk',
        title: 'Casual Conversation',
        description: 'Relaxed practice about daily topics, hobbies, or news.',
        emoji: '☕',
        difficulty: 'A2',
        track: 'general',
        colorFrom: 'from-pink-500',
        colorTo: 'to-rose-500',
        systemPrompt: 'You are Nova, a friendly German tutor. Chat about hobbies, weather, or food. Keep it simple (A2 level). Correct major mistakes gently.'
    }
];

const NovaOrb: React.FC<{ state: 'idle' | 'listening' | 'thinking' | 'speaking' }> = ({ state }) => {
    return (
        <div className="orb-container">
             <div className="ring-1 orb-ring"></div>
             <div className="ring-2 orb-ring"></div>
             <div className={`orb-core ${state}`}></div>
        </div>
    );
};

const ConversationPage: React.FC<ConversationPageProps> = ({ user }) => {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [aiState, setAiState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState<ConversationTurn[]>([]);
  const [feedbackReport, setFeedbackReport] = useState<FeedbackReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  
  // Vision State
  const [isVisionEnabled, setIsVisionEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoIntervalRef = useRef<number | null>(null);
  
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

  // Filter Scenarios based on user track
  const filteredScenarios = SCENARIOS.filter(s => 
      s.track === 'all' || s.track === user.track || user.track === 'general'
  ).sort((a, b) => (a.isExamPrep === b.isExamPrep ? 0 : a.isExamPrep ? -1 : 1));

  useEffect(() => {
    if (!process.env.API_KEY) {
      setError("API_KEY environment variable is not set.");
      return;
    }
    aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });

    return () => {
      stopRecording(false);
    };
  }, []);

  useEffect(() => {
    if (transcriptEndRef.current && showTranscript) {
        transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, showTranscript]);

  // Helper to capture frame and send to Gemini
  const captureAndSendFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isSessionActive) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0) return;

    canvas.width = video.videoWidth / 2; // Downscale for performance
    canvas.height = video.videoHeight / 2;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1]; // Low quality JPEG
    
    sessionPromiseRef.current?.then((session) => {
        session.sendRealtimeInput({ 
            media: { 
                mimeType: 'image/jpeg', 
                data: base64Data 
            } 
        });
    });
  }, [isSessionActive]);

  // Enable/Disable Vision
  const toggleVision = async () => {
      if (isVisionEnabled) {
          // Turn off
          if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
          if (videoRef.current && videoRef.current.srcObject) {
              const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
              tracks.forEach(t => t.stop());
              videoRef.current.srcObject = null;
          }
          setIsVisionEnabled(false);
      } else {
          // Turn on
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
              if (videoRef.current) {
                  videoRef.current.srcObject = stream;
                  await videoRef.current.play();
                  setIsVisionEnabled(true);
                  
                  // Start sending frames if session is active
                  if (isSessionActive) {
                      videoIntervalRef.current = window.setInterval(captureAndSendFrame, 1000 / VIDEO_FRAME_RATE);
                  }
              }
          } catch (e) {
              console.error("Camera permission denied", e);
              setError("Could not access camera.");
          }
      }
  };

  useEffect(() => {
      // If vision is enabled but session stops, clear interval
      if (isVisionEnabled && isSessionActive && !videoIntervalRef.current) {
          videoIntervalRef.current = window.setInterval(captureAndSendFrame, 1000 / VIDEO_FRAME_RATE);
      } else if (!isSessionActive && videoIntervalRef.current) {
          clearInterval(videoIntervalRef.current);
          videoIntervalRef.current = null;
      }
      return () => {
          if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
      };
  }, [isSessionActive, isVisionEnabled, captureAndSendFrame]);


  // Audio Playback Logic
  const handlePlayback = useCallback(async (base64EncodedAudioString: string) => {
    const outputAudioContext = outputAudioContextRef.current;
    if (!outputAudioContext) return;
    
    if (aiState === 'listening') return;

    setAiState('speaking');
    
    const currentTime = outputAudioContext.currentTime;
    if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
    }

    try {
        const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), outputAudioContext, OUTPUT_SAMPLE_RATE, 1);
        const source = outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputAudioContext.destination);
        
        source.addEventListener('ended', () => { 
            audioSourcesRef.current.delete(source); 
            if(audioSourcesRef.current.size === 0) {
                if (isSessionActive) {
                    setAiState('listening');
                } else {
                    setAiState('idle');
                }
            }
        });

        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
        audioSourcesRef.current.add(source);
    } catch (e) {
        console.error("Audio decode error", e);
    }
  }, [aiState, isSessionActive]);
  
  const stopPlayback = useCallback(() => {
    if (outputAudioContextRef.current) {
        for (const source of audioSourcesRef.current.values()) {
            source.stop();
        }
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;
    }
  }, []);

  const stopRecording = useCallback(async (shouldGetFeedback: boolean = true) => {
    setIsRecording(false);
    setIsSessionActive(false);
    setAiState('thinking'); 

    // Stop vision stream
    if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(t => t.stop());
        videoRef.current.srcObject = null;
    }
    setIsVisionEnabled(false);

    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }

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

    if (shouldGetFeedback && transcript.length > 0) {
      try {
        const feedbackData = await getFeedbackOnConversation(transcript);
        const newReport: FeedbackReport = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          ...feedbackData,
          transcript: [...transcript],
        };
        
        const storedReportsRaw = localStorage.getItem('german_tutor_reports');
        const storedReports = storedReportsRaw ? JSON.parse(storedReportsRaw) : [];
        localStorage.setItem('german_tutor_reports', JSON.stringify([...storedReports, newReport]));

        setFeedbackReport(newReport);
      } catch (error) {
        console.error("Failed to get feedback:", error);
        setError("Feedback generation failed.");
      }
    } else {
       if (!shouldGetFeedback) setTranscript([]); 
    }
    setAiState('idle');
  }, [transcript, stopPlayback]);

  const startRecording = useCallback(async () => {
    if (!aiRef.current || !selectedScenario) return;
    
    setError(null);
    setTranscript([]); 
    setIsRecording(true);
    setIsSessionActive(true);
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
              
              if (finalUserInput || finalModelOutput) {
                 setTranscript(prev => {
                     const newTrans = [...prev];
                     if(finalUserInput) newTrans.push({ speaker: 'user', text: finalUserInput });
                     if(finalModelOutput) newTrans.push({ speaker: 'ai', text: finalModelOutput });
                     return newTrans;
                 });
              }
              currentInputTranscription = '';
              currentOutputTranscription = '';
            }
            
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) { 
                handlePlayback(base64Audio); 
            }
            
            if (message.serverContent?.interrupted) { 
                stopPlayback(); 
                setAiState('listening'); 
                currentOutputTranscription = '';
            }
          },
          onerror: (e: ErrorEvent) => {
              console.error('Session error:', e);
              setError("Connection lost.");
              stopRecording(false);
          },
          onclose: (e: CloseEvent) => {
              setAiState('idle');
          },
      };

        sessionPromiseRef.current = aiRef.current.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks,
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction: `
                    You are Nova, an expert German tutor preparing a student.
                    ${selectedScenario.systemPrompt}
                    
                    General Rules:
                    1. Speak clearly at a moderate pace suitable for ${selectedScenario.difficulty} level.
                    2. Correct grammar mistakes ONLY if they disrupt understanding or are very basic, otherwise focus on flow.
                    3. If the student is stuck, give a hint in English but switch back to German immediately.
                    4. VISION CAPABILITY: You have eyes. If the user enables the camera and shows you an object, medical tool, or document, describe it or help them name it in German.
                `,
            },
        });
        
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Microphone access denied.');
      setIsRecording(false);
      setAiState('idle');
    }
  }, [handlePlayback, stopPlayback, stopRecording, selectedScenario]);
  
  const handleCloseModal = () => {
    setFeedbackReport(null);
    setTranscript([]); 
    setSelectedScenario(null); 
  };

  const handleBackToMenu = () => {
      stopRecording(false);
      setSelectedScenario(null);
  };

  // SCENARIO SELECTION MENU
  if (!selectedScenario) {
      return (
          <div className="flex flex-col h-full overflow-y-auto pb-28">
              <div className="pt-8 px-6 pb-4 max-w-4xl mx-auto w-full">
                  <div className="mb-6">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-900/30 px-3 py-1 rounded-lg border border-blue-500/30">
                        Track: {user.track.charAt(0).toUpperCase() + user.track.slice(1)}
                    </span>
                    <h1 className="text-2xl font-bold text-white mt-2">Training Modules</h1>
                    <p className="text-gray-400">Select a scenario to practice.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredScenarios.map((scenario) => (
                          <button
                            key={scenario.id}
                            onClick={() => setSelectedScenario(scenario)}
                            className={`group relative overflow-hidden p-6 rounded-[2rem] bg-white/5 border transition-all duration-300 text-left hover:scale-[1.02] active:scale-95 shadow-lg ${scenario.isExamPrep ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-white/5 hover:border-white/20'}`}
                          >
                              <div className={`absolute inset-0 bg-gradient-to-br ${scenario.colorFrom} ${scenario.colorTo} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                              <div className="relative z-10">
                                  <div className="flex justify-between items-start mb-4">
                                      <span className="text-4xl">{scenario.emoji}</span>
                                      <div className="flex gap-2">
                                          {scenario.isExamPrep && (
                                               <span className="text-[10px] font-extrabold px-2 py-1 rounded-full bg-yellow-500 text-black uppercase">Exam Prep</span>
                                          )}
                                          <span className={`text-xs font-bold px-3 py-1 rounded-full bg-black/30 border border-white/10 text-gray-300`}>
                                              {scenario.difficulty}
                                          </span>
                                      </div>
                                  </div>
                                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-200 transition-colors">{scenario.title}</h3>
                                  <p className="text-sm text-gray-400 leading-relaxed">{scenario.description}</p>
                              </div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      );
  }

  // ACTIVE CONVERSATION VIEW
  return (
    <div className="flex flex-col h-full bg-transparent text-white relative overflow-hidden">
        <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
            <div className="max-w-4xl mx-auto py-6 px-6 flex justify-between items-center pointer-events-auto">
                <button 
                    onClick={handleBackToMenu}
                    className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white transition-colors text-xs font-bold uppercase tracking-wide"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Back
                </button>

                <div className="flex gap-3">
                     {/* VISION TOGGLE */}
                     <button 
                        onClick={toggleVision}
                        className={`glass-panel p-3 rounded-full transition-all duration-300 ${isVisionEnabled ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'hover:bg-white/10 text-gray-400'}`}
                    >
                        <CameraIcon className="w-5 h-5" />
                    </button>

                    <button 
                        onClick={() => setShowTranscript(!showTranscript)}
                        className={`glass-panel p-3 rounded-full transition-all duration-300 ${showTranscript ? 'bg-white/10 text-white' : 'hover:bg-white/10 text-gray-400'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2-2z"></path></svg>
                    </button>
                </div>
            </div>
        </header>

        <div className="absolute top-20 left-0 right-0 z-10 flex justify-center pointer-events-none">
            <div className="animate-fade-in-up bg-black/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/5 flex items-center gap-3">
                <span className="text-2xl">{selectedScenario.emoji}</span>
                <span className="text-sm font-semibold text-gray-200">{selectedScenario.title}</span>
            </div>
        </div>

        <main className="flex-1 flex flex-col items-center justify-center relative">
            <div className="relative z-10 flex flex-col items-center justify-center">
                {/* Nova Visualization */}
                <NovaOrb state={aiState} />
                
                {/* Vision Preview (PiP) */}
                <div className={`mt-8 transition-all duration-500 overflow-hidden rounded-2xl border border-white/20 shadow-2xl ${isVisionEnabled ? 'w-48 h-64 opacity-100 scale-100' : 'w-0 h-0 opacity-0 scale-50'}`}>
                    <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                <div className="mt-10 text-center h-8 transition-all duration-500">
                    {aiState === 'idle' && <p className="text-gray-400 text-sm font-medium tracking-wide uppercase animate-fade-in-up">Tap Mic to Start</p>}
                    {aiState === 'listening' && <p className="text-blue-400 text-sm font-bold tracking-widest uppercase animate-pulse">Listening</p>}
                    {aiState === 'thinking' && <p className="text-purple-400 text-sm font-bold tracking-widest uppercase animate-pulse">Thinking</p>}
                    {aiState === 'speaking' && <p className="text-pink-400 text-sm font-bold tracking-widest uppercase">Nova Speaking</p>}
                </div>
            </div>

            <div className={`absolute inset-x-0 bottom-0 max-h-[70%] bg-[#0a0a0a]/95 backdrop-blur-2xl z-30 transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) rounded-t-[2.5rem] border-t border-white/10 flex flex-col shadow-2xl ${showTranscript ? 'translate-y-0' : 'translate-y-[110%]'}`}>
                 <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 rounded-t-[2.5rem]">
                    <h3 className="font-bold text-lg text-white">Live Transcript</h3>
                    <button onClick={() => setShowTranscript(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300"><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {transcript.length === 0 && <p className="text-center text-gray-500 mt-10 italic">Start speaking to see the conversation...</p>}
                    {transcript.map((turn, index) => (
                        <div key={index} className={`flex items-start gap-4 ${turn.speaker === 'user' ? 'flex-row-reverse' : ''} animate-fade-in-up`}>
                             <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${turn.speaker === 'ai' ? 'bg-gradient-to-br from-purple-600 to-indigo-600' : 'bg-gray-700'}`}>
                                {turn.speaker === 'ai' ? <BotIcon className="w-5 h-5 text-white" /> : <UserIcon className="w-5 h-5 text-gray-300" />}
                             </div>
                             <div className={`p-4 rounded-2xl max-w-[85%] text-base leading-relaxed shadow-sm ${
                                turn.speaker === 'user' ? 'bg-gradient-to-r from-blue-600/40 to-blue-500/40 border border-blue-500/20 text-blue-50 rounded-tr-none' : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none'
                             }`}>
                                {turn.text}
                             </div>
                        </div>
                    ))}
                    <div ref={transcriptEndRef} />
                 </div>
            </div>
        </main>

        <div className={`absolute bottom-24 left-0 right-0 z-20 flex justify-center pb-8 transition-transform duration-500 ${showTranscript ? 'translate-y-[200%]' : 'translate-y-0'}`}>
            <button
                onClick={isRecording ? () => stopRecording(true) : startRecording}
                disabled={aiState === 'thinking'}
                className={`relative group flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 shadow-2xl ${isRecording ? 'bg-red-500/10' : 'bg-white/5'}`}
            >
                 <div className={`absolute inset-0 rounded-full blur-xl transition-all duration-500 ${isRecording ? 'bg-red-500/40 scale-110' : 'bg-blue-500/0 group-hover:bg-blue-500/40 group-hover:scale-110'}`}></div>
                 <div className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center border transition-all duration-300 ${
                     isRecording 
                     ? 'bg-gradient-to-br from-red-500 to-red-600 border-red-400 text-white' 
                     : 'bg-gradient-to-br from-gray-800 to-black border-white/20 text-gray-300 group-hover:border-blue-400/50 group-hover:text-white'
                 }`}>
                     {aiState === 'thinking' ? (
                         <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                     ) : isRecording ? (
                         <StopIcon className="w-8 h-8 fill-current" />
                     ) : (
                         <MicIcon className="w-8 h-8" />
                     )}
                 </div>
            </button>
        </div>

      {error && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-red-500/20 backdrop-blur-xl border border-red-500/30 text-red-100 px-6 py-4 rounded-2xl shadow-2xl text-center z-50 animate-fade-in-up">
                <p className="font-semibold">{error}</p>
            </div>
      )}

      {feedbackReport && <FeedbackModal report={feedbackReport} onClose={handleCloseModal} />}
    </div>
  );
};

export default ConversationPage;

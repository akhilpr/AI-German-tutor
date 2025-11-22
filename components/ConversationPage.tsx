
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { User, ConversationTurn, FeedbackReport, Scenario, UserTrack, ExamTopic } from '../types';
import { MicIcon, StopIcon, BotIcon, UserIcon, CameraIcon, LogoutIcon, SparklesIcon, CertificateIcon } from './icons';
import { encode, decode, decodeAudioData } from '../utils/audio';
import { getFeedbackOnConversation, generateDynamicExamTopic } from '../services/geminiService';
import FeedbackModal from './FeedbackModal';

interface ConversationPageProps {
  user: User;
  onLogout: () => void;
}

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const SCRIPT_PROCESSOR_BUFFER_SIZE = 4096;
const VIDEO_FRAME_RATE = 1;

// SCENARIO DATABASE
const SCENARIOS: Scenario[] = [
    {
        id: 'beginner_bakery',
        title: 'At the Bakery (A1)',
        description: 'Beginner: Buy bread and coffee. Simple polite phrases.',
        emoji: '🥐',
        difficulty: 'A1',
        track: 'general',
        colorFrom: 'from-yellow-400',
        colorTo: 'to-orange-400',
        systemPrompt: `
            ROLEPLAY: BAKERY (Bäckerei).
            Level: A1 (Beginner).
            You are a friendly bakery clerk. The user is a customer.
            1. Say "Guten Morgen/Tag! Was darf es sein?"
            2. Use very simple German. Speak slowly.
            3. Expect them to order simple items (Brötchen, Brot, Kaffee).
            4. Ask "Sonst noch etwas?" (Anything else?).
            5. Say the price at the end (e.g., "Das macht 3 Euro 50").
            6. Correct them only if they speak English or are unintelligible.
        `
    },
    {
        id: 'nurse_job_interview',
        title: 'Job Interview (Vorstellungsgespräch)',
        description: 'High-stakes interview simulation. Convince the Head Nurse to hire you.',
        emoji: '🤝',
        difficulty: 'C1',
        track: 'nursing',
        colorFrom: 'from-slate-600',
        colorTo: 'to-gray-700',
        isExamPrep: true,
        systemPrompt: `
            STRICT ROLEPLAY: JOB INTERVIEW (Vorstellungsgespräch).
            
            You are Frau Schneider, the Pflegedienstleitung (Head of Nursing) at a prestigious German hospital. 
            You are interviewing the user for a nursing position.
            
            BEHAVIOR:
            1. Start formally: "Guten Tag. Nehmen Sie Platz. Warum haben Sie sich bei uns beworben?"
            2. Be professional, demanding, and use the "Sie" form.
            3. Ask specifically about:
               - Motivation for working in Germany.
               - Handling stress (Stressresistenz).
               - A specific conflict situation with a colleague or patient in the past.
            4. If they make small mistakes, ignore them. If they make big mistakes, look confused ("Wie bitte?").
            5. Do NOT act as a teacher. Do NOT correct them. You are an employer.
            6. Conclude with: "Wir melden uns bei Ihnen" (We will contact you).
        `
    },
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

const ConversationPage: React.FC<ConversationPageProps> = ({ user, onLogout }) => {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [aiState, setAiState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState<ConversationTurn[]>([]);
  const [feedbackReport, setFeedbackReport] = useState<FeedbackReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  
  // Exam Generator State
  const [isGeneratingExam, setIsGeneratingExam] = useState(false);
  const [examLevel, setExamLevel] = useState<string>('B2');

  // Casual Chat State
  const [casualLevel, setCasualLevel] = useState<string>('A2');
  
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
    return () => { stopRecording(false); };
  }, []);

  useEffect(() => {
    if (transcriptEndRef.current && showTranscript) {
        transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, showTranscript]);

  const handleStartCasualChat = () => {
    const levelConfig: Record<string, string> = {
        'A1': 'Level: A1 (Beginner). Speak strictly in simple, short sentences. Use high-frequency words. Speak slowly.',
        'A2': 'Level: A2 (Elementary). Discuss daily topics. Use simple past tense. Clear articulation.',
        'B1': 'Level: B1 (Intermediate). Standard conversation. Share experiences and opinions.',
        'B2': 'Level: B2 (Upper Intermediate). Complex topics, abstract ideas. Normal conversational speed.',
        'C1': 'Level: C1 (Advanced). Sophisticated vocabulary, idioms, and fast/native pace.',
    };

    const scenario: Scenario = {
        id: `casual_${Date.now()}`,
        title: `Casual Conversation (${casualLevel})`,
        description: `Open-ended practice at ${casualLevel} level.`,
        emoji: '☕',
        difficulty: casualLevel as any,
        track: 'all',
        colorFrom: 'from-pink-500',
        colorTo: 'to-rose-600',
        systemPrompt: `
            You are Nova, a friendly and encouraging German conversation partner.
            ${levelConfig[casualLevel] || levelConfig['A2']}
            
            Mode: CASUAL CHAT (No specific topic).
            
            Instructions:
            1. Start by warmly greeting the user and asking "Wie geht es dir?" or "Was gibt es Neues?".
            2. Keep the conversation natural and open-ended.
            3. If the user makes a mistake, gentle correct them naturally in your reply, but do not interrupt the flow.
            4. If the conversation stalls, suggest a simple topic like hobbies, food, or weekend plans.
        `
    };
    setSelectedScenario(scenario);
  };

  const handleGenerateExam = async () => {
      setIsGeneratingExam(true);
      try {
          const topic = await generateDynamicExamTopic(user.track, examLevel);
          const dynamicScenario: Scenario = {
              id: `exam_generated_${Date.now()}`,
              title: `${examLevel} Exam Simulator`,
              description: `Strict mock exam mode (${examLevel}). Topic: ` + topic.title,
              emoji: '👨‍🏫',
              difficulty: examLevel as any,
              track: user.track,
              colorFrom: 'from-amber-600',
              colorTo: 'to-orange-700',
              isExamPrep: true,
              dynamicTopic: topic,
              systemPrompt: `
                CRITICAL ROLEPLAY INSTRUCTION:
                You are "Herr Müller", a STRICT German Language Examiner (Prüfer) for the ${examLevel} Exam.
                
                CONTEXT:
                The student must deliver a presentation (Vortrag) on the topic: "${topic.title}".
                Level: ${examLevel}.
                
                YOUR BEHAVIOR:
                1. Start by asking the student formally to begin their presentation.
                2. Listen silently for about 2-3 sentences. If they pause, gently prompt them.
                3. After they finish, ask 2 specific FOLLOW-UP QUESTIONS (Rückfragen) appropriate for ${examLevel}.
                4. Be professional, formal.
                5. Do not correct them during the exam. Save corrections for the feedback.
              `
          };
          setSelectedScenario(dynamicScenario);
      } catch (e) {
          setError("Failed to generate exam topic. Please try again.");
      } finally {
          setIsGeneratingExam(false);
      }
  };

  const captureAndSendFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isSessionActive) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || video.videoWidth === 0) return;
    canvas.width = video.videoWidth / 2; 
    canvas.height = video.videoHeight / 2;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
    sessionPromiseRef.current?.then((session) => {
        session.sendRealtimeInput({ media: { mimeType: 'image/jpeg', data: base64Data } });
    });
  }, [isSessionActive]);

  const toggleVision = async () => {
      if (isVisionEnabled) {
          if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
          if (videoRef.current && videoRef.current.srcObject) {
              const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
              tracks.forEach(t => t.stop());
              videoRef.current.srcObject = null;
          }
          setIsVisionEnabled(false);
      } else {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
              if (videoRef.current) {
                  videoRef.current.srcObject = stream;
                  await videoRef.current.play();
                  setIsVisionEnabled(true);
                  if (isSessionActive) videoIntervalRef.current = window.setInterval(captureAndSendFrame, 1000 / VIDEO_FRAME_RATE);
              }
          } catch (e) {
              setError("Could not access camera.");
          }
      }
  };

  useEffect(() => {
      if (isVisionEnabled && isSessionActive && !videoIntervalRef.current) {
          videoIntervalRef.current = window.setInterval(captureAndSendFrame, 1000 / VIDEO_FRAME_RATE);
      } else if (!isSessionActive && videoIntervalRef.current) {
          clearInterval(videoIntervalRef.current);
          videoIntervalRef.current = null;
      }
      return () => { if (videoIntervalRef.current) clearInterval(videoIntervalRef.current); };
  }, [isSessionActive, isVisionEnabled, captureAndSendFrame]);

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
            if(audioSourcesRef.current.size === 0) setAiState(isSessionActive ? 'listening' : 'idle');
        });
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
        audioSourcesRef.current.add(source);
    } catch (e) { console.error("Audio decode error", e); }
  }, [aiState, isSessionActive]);
  
  const stopPlayback = useCallback(() => {
    if (outputAudioContextRef.current) {
        for (const source of audioSourcesRef.current.values()) source.stop();
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;
    }
  }, []);

  const stopRecording = useCallback(async (shouldGetFeedback: boolean = true) => {
    setIsRecording(false);
    setIsSessionActive(false);
    setAiState('thinking'); 

    if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(t => t.stop());
        videoRef.current.srcObject = null;
    }
    setIsVisionEnabled(false);
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(track => track.stop()); mediaStreamRef.current = null; }
    if (mediaStreamSourceRef.current && scriptProcessorRef.current) {
        mediaStreamSourceRef.current.disconnect();
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current.onaudioprocess = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
    if (sessionPromiseRef.current) { (await sessionPromiseRef.current).close(); sessionPromiseRef.current = null; }
    
    stopPlayback();

    if (shouldGetFeedback && transcript.length > 0) {
      try {
        const feedbackData = await getFeedbackOnConversation(transcript);
        const newReport: FeedbackReport = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          ...feedbackData,
          transcript: [...transcript],
          isExamCertificate: selectedScenario?.isExamPrep,
          examTopicTitle: selectedScenario?.dynamicTopic?.title || selectedScenario?.title
        };
        
        const storedReportsRaw = localStorage.getItem('german_tutor_reports');
        const storedReports = storedReportsRaw ? JSON.parse(storedReportsRaw) : [];
        localStorage.setItem('german_tutor_reports', JSON.stringify([...storedReports, newReport]));

        setFeedbackReport(newReport);
      } catch (error) {
        setError("Feedback generation failed.");
      }
    } else {
       if (!shouldGetFeedback) setTranscript([]); 
    }
    setAiState('idle');
  }, [transcript, stopPlayback, selectedScenario]);

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
                const pcmBlob: Blob = { data: encode(new Uint8Array(int16.buffer)), mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` };
                sessionPromiseRef.current?.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) currentOutputTranscription += message.serverContent.outputTranscription.text;
            if (message.serverContent?.inputTranscription) currentInputTranscription += message.serverContent.inputTranscription.text;
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
                systemInstruction: `
                    ${selectedScenario.systemPrompt}
                    
                    General Rules:
                    1. Speak clearly.
                    2. If camera is enabled, describe what you see if asked.
                    3. For Exam/Interview Topics: Adhere strictly to the examiner/interviewer role.
                `,
            },
        });
    } catch (err) { setIsRecording(false); setAiState('idle'); }
  }, [handlePlayback, stopPlayback, stopRecording, selectedScenario]);
  
  if (!selectedScenario) {
      return (
          <div className="flex flex-col h-full overflow-y-auto pb-28">
              <div className="pt-6 px-4 pb-4 max-w-4xl mx-auto w-full">
                  <div className="mb-6 flex flex-row justify-between items-center gap-4">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-900/30 px-2 py-1 rounded-lg border border-blue-500/30">
                            {user.track.charAt(0).toUpperCase() + user.track.slice(1)} Track
                        </span>
                        <h1 className="text-xl font-bold text-white mt-1">Training</h1>
                    </div>
                    <button onClick={onLogout} className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-full text-xs font-medium text-gray-300 hover:text-red-400 transition-all">
                        <LogoutIcon className="w-3 h-3" />
                    </button>
                  </div>
                  
                  {/* Quick Start Section (Casual & Exam) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      {/* CASUAL CHAT CARD */}
                      <div className="group relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg p-0.5">
                          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="relative bg-[#121212] rounded-[1.4rem] p-5 h-full flex flex-col justify-between">
                                <div className="flex flex-col gap-4 mb-4">
                                     <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg flex-shrink-0">
                                            <div className="text-xl">☕</div>
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-base font-bold text-white">Casual Chat</h3>
                                            <p className="text-[10px] text-gray-400">Practice freely.</p>
                                        </div>
                                    </div>
                                    
                                    {/* Level Selector - Touch Friendly */}
                                    <div className="flex flex-wrap gap-2 bg-black/30 p-2 rounded-xl border border-white/10 justify-center sm:justify-start">
                                        {['A1', 'A2', 'B1', 'B2', 'C1'].map((lvl) => (
                                            <button 
                                                key={lvl}
                                                onClick={() => setCasualLevel(lvl)}
                                                className={`min-w-[2.5rem] h-10 rounded-lg text-sm font-bold transition-all active:scale-95 ${casualLevel === lvl ? 'bg-pink-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:text-gray-200 border border-white/5'}`}
                                            >
                                                {lvl}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button 
                                    onClick={handleStartCasualChat}
                                    className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-pink-300 font-bold uppercase tracking-wider text-xs transition-all flex justify-center items-center gap-2 active:scale-[0.98]"
                                >
                                    Start Chat
                                </button>
                          </div>
                      </div>

                      {/* EXAM GENERATOR CARD */}
                      <div className="group relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-amber-600 to-orange-700 shadow-lg p-0.5">
                          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="relative bg-[#121212] rounded-[1.4rem] p-5 h-full flex flex-col justify-between">
                                <div className="flex flex-col gap-4 mb-4">
                                     <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg flex-shrink-0">
                                            {isGeneratingExam ? <div className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></div> : <SparklesIcon className="w-5 h-5 text-white" />}
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-base font-bold text-white">Exam Simulator</h3>
                                            <p className="text-[10px] text-gray-400">Dynamic topics.</p>
                                        </div>
                                    </div>
                                    
                                    {/* Level Selector - Touch Friendly */}
                                    <div className="flex flex-wrap gap-2 bg-black/30 p-2 rounded-xl border border-white/10 justify-center sm:justify-start">
                                        {['A1', 'A2', 'B1', 'B2', 'C1'].map((lvl) => (
                                            <button 
                                                key={lvl}
                                                onClick={() => setExamLevel(lvl)}
                                                className={`min-w-[2.5rem] h-10 rounded-lg text-sm font-bold transition-all active:scale-95 ${examLevel === lvl ? 'bg-amber-500 text-black shadow-lg' : 'bg-white/5 text-gray-400 hover:text-gray-200 border border-white/5'}`}
                                            >
                                                {lvl}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button 
                                    onClick={handleGenerateExam}
                                    disabled={isGeneratingExam}
                                    className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-amber-400 font-bold uppercase tracking-wider text-xs transition-all flex justify-center items-center gap-2 active:scale-[0.98]"
                                >
                                    Generate & Start
                                </button>
                          </div>
                      </div>
                  </div>

                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Scenarios</h3>
                  <div className="flex flex-col gap-3 pb-6">
                      {filteredScenarios.map((scenario) => (
                          <button
                            key={scenario.id}
                            onClick={() => setSelectedScenario(scenario)}
                            className={`group relative overflow-hidden p-5 rounded-[1.5rem] bg-white/5 border transition-all duration-300 text-left hover:scale-[1.01] active:scale-[0.98] shadow-lg ${scenario.isExamPrep ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-white/5 hover:border-white/20'}`}
                          >
                              <div className={`absolute inset-0 bg-gradient-to-br ${scenario.colorFrom} ${scenario.colorTo} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                              <div className="relative z-10 flex items-start gap-4">
                                  <span className="text-3xl pt-1">{scenario.emoji}</span>
                                  <div className="flex-1">
                                      <div className="flex flex-wrap gap-2 mb-1">
                                          {scenario.isExamPrep && <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wide ${scenario.id === 'nurse_job_interview' ? 'bg-blue-500 text-white' : 'bg-yellow-500 text-black'}`}>{scenario.id === 'nurse_job_interview' ? 'Interview' : 'Exam Prep'}</span>}
                                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-black/40 border border-white/10 text-gray-300`}>{scenario.difficulty}</span>
                                      </div>
                                      <h3 className="text-lg font-bold text-white mb-1 leading-tight group-hover:text-white transition-colors">{scenario.title}</h3>
                                      <p className="text-xs text-gray-400 leading-relaxed group-hover:text-gray-100">{scenario.description}</p>
                                  </div>
                              </div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-transparent text-white relative overflow-hidden">
        <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
            <div className="max-w-4xl mx-auto py-4 px-4 flex justify-between items-center pointer-events-auto">
                <button onClick={() => {stopRecording(false); setSelectedScenario(null);}} className="glass-panel px-3 py-2 rounded-full flex items-center gap-2 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white transition-colors text-xs font-bold uppercase tracking-wide active:scale-95">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back
                </button>
                <div className="flex gap-2">
                     <button onClick={toggleVision} className={`glass-panel p-2.5 rounded-full transition-all duration-300 active:scale-95 ${isVisionEnabled ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'hover:bg-white/10 text-gray-400'}`}>
                        <CameraIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => setShowTranscript(!showTranscript)} className={`glass-panel p-2.5 rounded-full transition-all duration-300 active:scale-95 ${showTranscript ? 'bg-white/10 text-white' : 'hover:bg-white/10 text-gray-400'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2-2z"></path></svg>
                    </button>
                </div>
            </div>
        </header>

        {/* EXAM CARD OVERLAY */}
        {selectedScenario.dynamicTopic && !isRecording && aiState === 'idle' && (
            <div className="absolute top-20 left-4 right-4 z-10 max-w-md mx-auto animate-fade-in-up">
                <div className="bg-[#fffbf0] text-black p-6 rounded-lg shadow-2xl border-2 border-amber-500 rotate-1">
                     <div className="border-b-2 border-black pb-2 mb-4 flex justify-between items-center">
                         <h3 className="font-bold uppercase tracking-widest text-sm">Teil 1: Vortrag</h3>
                         <span className="bg-black text-white text-xs px-2 py-1 font-bold">{selectedScenario.difficulty}</span>
                     </div>
                     <h2 className="text-xl font-bold mb-2 leading-tight">{selectedScenario.dynamicTopic.title}</h2>
                     <p className="text-sm mb-4 italic text-gray-700">{selectedScenario.dynamicTopic.introText}</p>
                     <ul className="text-sm font-medium space-y-2 list-disc list-inside">
                         {selectedScenario.dynamicTopic.bulletPoints.map((pt, i) => <li key={i}>{pt}</li>)}
                     </ul>
                     <div className="mt-4 pt-4 border-t border-gray-300 text-center text-xs text-gray-500 uppercase font-bold">
                         Start recording to begin exam
                     </div>
                </div>
            </div>
        )}

        {!selectedScenario.dynamicTopic && (
            <div className="absolute top-20 left-0 right-0 z-10 flex justify-center pointer-events-none">
                <div className="animate-fade-in-up bg-black/20 backdrop-blur-md px-5 py-2 rounded-full border border-white/5 flex items-center gap-3 shadow-xl">
                    <span className="text-xl">{selectedScenario.emoji}</span>
                    <span className="text-sm font-semibold text-gray-200 truncate max-w-[200px]">{selectedScenario.title}</span>
                </div>
            </div>
        )}

        <main className="flex-1 flex flex-col items-center justify-center relative">
            <div className="relative z-10 flex flex-col items-center justify-center">
                <NovaOrb state={aiState} />
                <div className={`mt-8 transition-all duration-500 overflow-hidden rounded-2xl border border-white/20 shadow-2xl ${isVisionEnabled ? 'w-40 h-56 opacity-100 scale-100' : 'w-0 h-0 opacity-0 scale-50'}`}>
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
             {/* Transcript Panel */}
             <div className={`absolute inset-x-0 bottom-0 max-h-[70%] bg-[#0a0a0a]/95 backdrop-blur-2xl z-30 transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) rounded-t-[2rem] border-t border-white/10 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] ${showTranscript ? 'translate-y-0' : 'translate-y-[110%]'}`}>
                 <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5 rounded-t-[2rem]">
                    <h3 className="font-bold text-base text-white">Live Transcript</h3>
                    <button onClick={() => setShowTranscript(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
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
                             <div className={`p-3 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-sm ${
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

        <div className={`absolute bottom-24 left-0 right-0 z-20 flex justify-center pb-6 transition-transform duration-500 ${showTranscript ? 'translate-y-[200%]' : 'translate-y-0'}`}>
            <button
                onClick={isRecording ? () => stopRecording(true) : startRecording}
                disabled={aiState === 'thinking'}
                className={`relative group flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 shadow-2xl active:scale-95 ${isRecording ? 'bg-red-500/10' : 'bg-white/5'}`}
            >
                 <div className={`absolute inset-0 rounded-full blur-xl transition-all duration-500 ${isRecording ? 'bg-red-500/40 scale-110' : 'bg-blue-500/0 group-hover:bg-blue-500/40 group-hover:scale-110'}`}></div>
                 <div className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center border transition-all duration-300 ${
                     isRecording ? 'bg-gradient-to-br from-red-500 to-red-600 border-red-400 text-white' : 'bg-gradient-to-br from-gray-800 to-black border-white/20 text-gray-300 group-hover:border-blue-400/50 group-hover:text-white'
                 }`}>
                     {aiState === 'thinking' ? (
                         <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                     ) : isRecording ? <StopIcon className="w-6 h-6 fill-current" /> : <MicIcon className="w-6 h-6" />}
                 </div>
            </button>
        </div>

      {error && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-red-500/20 backdrop-blur-xl border border-red-500/30 text-red-100 px-4 py-3 rounded-xl shadow-2xl text-center z-50 animate-fade-in-up text-sm">
                <p className="font-semibold">{error}</p>
            </div>
      )}

      {feedbackReport && <FeedbackModal report={feedbackReport} onClose={() => {setFeedbackReport(null); setSelectedScenario(null);}} />}
    </div>
  );
};

export default ConversationPage;

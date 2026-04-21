import { useState, useRef, useEffect } from 'react';
import {
  Sparkles, Send, ImagePlus, Bot, User, CheckCircle2,
  XCircle, Package, MapPin, Building2, Brain, RotateCcw, AlertCircle,
  Mic, Paperclip, MicOff,
} from 'lucide-react';

type Condition = 'Good' | 'Worn' | 'Damaged';
type Stage = 'greeting' | 'details' | 'awaiting_image' | 'analyzing' | 'result_suitable' | 'result_unsuitable';

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text?: string;
  imageUrl?: string;
  type: 'text' | 'image' | 'analysis';
  condition?: Condition;
  suitable?: boolean;
}

const CONDITION_COLORS: Record<Condition, string> = {
  Good: 'bg-green-50 text-green-700 border-green-200',
  Worn: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Damaged: 'bg-red-50 text-[#da1a32] border-red-200',
};

const suggestedReceivers = [
  {
    name: 'Hope Orphanage',
    location: 'Kuala Lumpur • 2.5 km',
    allocation: 60,
    percent: 60,
    urgency: 'High',
    reason: ['High urgency — disaster-affected families', 'Higher daily demand', 'Fewer recent donations received'],
  },
  {
    name: 'Care Foundation',
    location: 'Petaling Jaya • 5.1 km',
    allocation: 40,
    percent: 40,
    urgency: 'Medium',
    reason: ['Consistent need pattern', 'Serves elderly community', 'Good delivery accessibility'],
  },
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function BotBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-[#da1a32] rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="max-w-[80%]">{children}</div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 justify-end">
      <div className="max-w-[80%]">{children}</div>
      <div className="w-8 h-8 bg-[#000000] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
        <User className="w-4 h-4 text-white" />
      </div>
    </div>
  );
}

export function AIDonation() {
  const [stage, setStage] = useState<Stage>('greeting');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'bot',
      type: 'text',
      text: "Hi there! 👋 I'm your AI Donation Assistant. Tell me what you'd like to donate today and I'll help find the best match for your contribution!",
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [detectedItem, setDetectedItem] = useState('Clothing / Mixed Items');
  const [isRecording, setIsRecording] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    // Cleanup voice recognition on unmount
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const addBotMessage = (text: string, extra?: Partial<ChatMessage>) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: 'bot', type: 'text', text, ...extra },
    ]);
  };

  const addUserMessage = (text: string, extra?: Partial<ChatMessage>) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: 'user', type: 'text', text, ...extra },
    ]);
  };

  const simulateBotResponse = (text: string, delay = 1200, extra?: Partial<ChatMessage>) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addBotMessage(text, extra);
    }, delay);
  };

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    // Detect item type from user message
    const lower = trimmed.toLowerCase();
    if (lower.includes('food') || lower.includes('rice') || lower.includes('pack')) setDetectedItem('Food Packs');
    else if (lower.includes('cloth') || lower.includes('shirt') || lower.includes('wear')) setDetectedItem('Clothing');
    else if (lower.includes('book') || lower.includes('school') || lower.includes('suppli')) setDetectedItem('School Supplies');
    else if (lower.includes('blank') || lower.includes('pillow') || lower.includes('bed')) setDetectedItem('Blankets & Bedding');
    else if (lower.includes('medic') || lower.includes('drug')) setDetectedItem('Medical Supplies');

    addUserMessage(trimmed);
    setInputText('');

    if (stage === 'greeting') {
      setStage('details');
      simulateBotResponse(
        "Thanks for sharing! 📝 To assess your donation properly, I have a few quick follow-up questions:\n\n📦 How many items do you have?\n📍 What's your pickup / drop-off location?\n📸 Could you upload a photo of the item so I can assess its condition and suitability?",
        1400,
      );
    } else if (stage === 'details') {
      setStage('awaiting_image');
      simulateBotResponse(
        "Got it! Now please upload a photo of the item using the 📎 button below so I can verify its condition.",
        1200,
      );
    } else if (stage === 'awaiting_image') {
      simulateBotResponse(
        "Please upload a photo of the item first so I can assess its condition. 📸 Use the image button below!",
        900,
      );
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || stage === 'result_suitable' || stage === 'result_unsuitable') return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const imageUrl = ev.target?.result as string;
      addUserMessage('', { type: 'image', imageUrl });

      setStage('analyzing');
      setIsTyping(true);

      // Simulate AI analysis (2.5 seconds)
      setTimeout(() => {
        setIsTyping(false);

        // Determine condition (deterministic based on file name for demo)
        const fname = file.name.toLowerCase();
        let condition: Condition = 'Good';
        if (fname.includes('damage') || fname.includes('broken') || fname.includes('torn')) {
          condition = 'Damaged';
        } else if (fname.includes('worn') || fname.includes('old')) {
          condition = 'Worn';
        } else {
          // Random for demo: 65% Good, 25% Worn, 10% Damaged
          const r = Math.random();
          condition = r < 0.65 ? 'Good' : r < 0.90 ? 'Worn' : 'Damaged';
        }

        const suitable = condition !== 'Damaged';

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'bot',
            type: 'analysis',
            condition,
            suitable,
          },
        ]);

        if (suitable) {
          setStage('result_suitable');
          setTimeout(() => {
            addBotMessage(
              "✅ Great news! Your item is suitable for donation. I've identified the best receivers for you below. Review the allocation and confirm when ready!",
            );
          }, 600);
        } else {
          setStage('result_unsuitable');
          setTimeout(() => {
            addBotMessage(
              "❌ Unfortunately, this item is not suitable for donation because it appears to be damaged or unusable. Receiving organisations require items in at least fair condition to ensure safety and quality for recipients. Please consider donating items in better condition — even worn or gently used items are welcome!",
            );
          }, 600);
        }
      }, 2500);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleReset = () => {
    setStage('greeting');
    setDetectedItem('Clothing / Mixed Items');
    setMessages([
      {
        id: '0',
        role: 'bot',
        type: 'text',
        text: "Hi there! 👋 I'm your AI Donation Assistant. Tell me what you'd like to donate today and I'll help find the best match for your contribution!",
      },
    ]);
    setInputText('');
    setIsTyping(false);
    setAttachedFiles([]);
    setIsRecording(false);
    setMicPermissionError(null);
    recognitionRef.current?.stop();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  const handleVoiceInput = async () => {
    // Check browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setMicPermissionError('Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.');
      setTimeout(() => setMicPermissionError(null), 5000);
      return;
    }

    if (isRecording) {
      // Stop recording
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    setMicPermissionError(null);

    // Check microphone permission status first
    if (navigator.permissions) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('Microphone permission status:', permissionStatus.state);

        if (permissionStatus.state === 'denied') {
          setMicPermissionError('🎤 Microphone denied. Go to browser settings → Site Settings → Microphone → Allow');
          setTimeout(() => setMicPermissionError(null), 10000);
          return;
        }
      } catch (e) {
        console.log('Permission query not supported, proceeding anyway');
      }
    }

    try {
      // Start speech recognition directly (it will handle permissions)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('✅ Voice recognition started successfully - speak now!');
        setIsRecording(true);
        setMicPermissionError(null);
      };

      recognition.onresult = (event: any) => {
        console.log('✅ Voice recognition result received:', event.results);
        const transcript = event.results[0][0].transcript;
        console.log('✅ Transcript:', transcript);
        setInputText(transcript);
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        console.error('❌ Speech recognition error:', event.error, event);
        setIsRecording(false);
        if (event.error === 'no-speech') {
          setMicPermissionError('No speech detected. Speak louder and try again.');
          setTimeout(() => setMicPermissionError(null), 4000);
        } else if (event.error === 'not-allowed') {
          setMicPermissionError('Permission denied. To enable: Click lock icon in address bar → Microphone → Allow → Refresh page. Or continue typing without voice input.');
          // Don't auto-dismiss permission errors - let user dismiss manually
        } else if (event.error === 'aborted') {
          // User stopped recording, no error needed
        } else if (event.error === 'audio-capture') {
          setMicPermissionError('Microphone in use by another app. Close other apps and try again.');
          setTimeout(() => setMicPermissionError(null), 6000);
        } else if (event.error === 'network') {
          setMicPermissionError('No internet connection. Voice recognition needs internet.');
          setTimeout(() => setMicPermissionError(null), 5000);
        } else if (event.error === 'service-not-allowed') {
          setMicPermissionError('Voice service blocked. Try using HTTPS or Chrome/Edge browser.');
          setTimeout(() => setMicPermissionError(null), 6000);
        } else {
          setMicPermissionError(`Error: ${event.error}. Try refreshing the page.`);
          setTimeout(() => setMicPermissionError(null), 5000);
        }
      };

      recognition.onend = () => {
        console.log('Voice recognition ended');
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      console.log('🎤 Starting voice recognition...');
      recognition.start();
    } catch (err: any) {
      console.error('❌ Voice input initialization error:', err);
      setMicPermissionError('Cannot start voice input. Try refreshing page or using Chrome browser.');
      setTimeout(() => setMicPermissionError(null), 5000);
    }
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files]);
      // Auto-send message with attachments
      const fileNames = files.map(f => f.name).join(', ');
      addUserMessage(`📎 Attached: ${fileNames}`);

      if (stage === 'greeting') {
        setStage('details');
        simulateBotResponse(
          "Thanks for sharing! 📝 To assess your donation properly, I have a few quick follow-up questions:\n\n📦 How many items do you have?\n📍 What's your pickup / drop-off location?\n📸 Could you upload a photo of the item so I can assess its condition and suitability?",
          1400,
        );
      } else if (stage === 'details') {
        setStage('awaiting_image');
        simulateBotResponse(
          "Got it! Now please upload a photo of the item using the 📎 button below so I can verify its condition.",
          1200,
        );
      }
    }
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl mb-1 text-[#000000] font-bold">AI Donation Assistant</h1>
          <p className="text-gray-500">Chat with our AI to find the best match for your donation</p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 border-2 border-[#e5e5e5] rounded-xl text-sm text-[#000000] hover:border-[#da1a32] hover:text-[#da1a32] transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Microphone Info - Only show once */}
      {micPermissionError && micPermissionError.includes('Permission denied') && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-yellow-900 mb-1">Voice Input Unavailable</h3>
              <p className="text-xs text-yellow-800 mb-2">
                Your browser has blocked microphone access. You can continue using the chat by typing.
              </p>
              <button
                onClick={() => setMicPermissionError(null)}
                className="text-xs text-yellow-700 hover:text-yellow-900 underline font-medium"
              >
                Dismiss this message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Window */}
      <div className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-sm overflow-hidden flex flex-col" style={{ height: '65vh' }}>
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-[#000000] flex-shrink-0">
          <div className="w-9 h-9 bg-[#da1a32] rounded-full flex items-center justify-center shadow">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-white font-medium text-sm">DonateAI Assistant</div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-white opacity-60">Online</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 bg-[#edf2f4] bg-opacity-30">
          {messages.map((msg) => {
            if (msg.role === 'user') {
              return (
                <UserBubble key={msg.id}>
                  {msg.type === 'image' && msg.imageUrl ? (
                    <div className="bg-[#000000] rounded-2xl rounded-tr-sm overflow-hidden shadow-sm">
                      <img src={msg.imageUrl} alt="uploaded" className="max-w-[220px] rounded-t-2xl" />
                      <p className="text-xs text-white opacity-60 px-3 py-1.5">Photo uploaded</p>
                    </div>
                  ) : (
                    <div className="bg-[#000000] text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-sm text-sm leading-relaxed whitespace-pre-line">
                      {msg.text}
                    </div>
                  )}
                </UserBubble>
              );
            }

            // Bot message
            if (msg.type === 'analysis') {
              const cond = msg.condition!;
              return (
                <BotBubble key={msg.id}>
                  <div className="bg-white border-2 border-[#e5e5e5] rounded-2xl rounded-tl-sm p-4 shadow-sm w-full min-w-[280px]">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="w-4 h-4 text-[#da1a32]" />
                      <span className="text-sm font-medium text-[#000000]">AI Analysis Result</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Item Detected</span>
                        <span className="text-xs font-medium text-[#000000] flex items-center gap-1">
                          <Package className="w-3 h-3" /> {detectedItem}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Condition</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${CONDITION_COLORS[cond]}`}>
                          {cond}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Suitability</span>
                        {msg.suitable ? (
                          <span className="text-xs font-medium text-green-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Suitable for Donation
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-[#da1a32] flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Not Suitable
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </BotBubble>
              );
            }

            return (
              <BotBubble key={msg.id}>
                <div className="bg-white border border-[#e5e5e5] text-[#000000] px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm text-sm leading-relaxed whitespace-pre-line">
                  {msg.text}
                </div>
              </BotBubble>
            );
          })}

          {isTyping && (
            <BotBubble>
              <div className="bg-white border border-[#e5e5e5] rounded-2xl rounded-tl-sm shadow-sm">
                <TypingDots />
              </div>
            </BotBubble>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="flex-shrink-0 px-4 py-3 bg-white border-t border-[#e5e5e5]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={stage === 'greeting' || stage === 'result_suitable' || stage === 'result_unsuitable'}
              className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-[#e5e5e5] text-gray-400 hover:border-[#da1a32] hover:text-[#da1a32] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
              title="Upload item photo"
            >
              <ImagePlus className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              onClick={() => attachInputRef.current?.click()}
              disabled={stage === 'result_suitable' || stage === 'result_unsuitable' || stage === 'analyzing'}
              className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-[#e5e5e5] text-gray-400 hover:border-[#da1a32] hover:text-[#da1a32] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
              title="Attach files"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              ref={attachInputRef}
              type="file"
              accept="*/*"
              multiple
              className="hidden"
              onChange={handleFileAttach}
            />
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isRecording
                  ? 'Listening...'
                  : stage === 'awaiting_image'
                  ? 'Upload an image to continue...'
                  : stage === 'result_suitable' || stage === 'result_unsuitable'
                  ? 'Start a new chat to donate again'
                  : 'Type your message...'
              }
              disabled={stage === 'result_suitable' || stage === 'result_unsuitable' || stage === 'analyzing' || isRecording}
              className="flex-1 px-4 py-2.5 border-2 border-[#e5e5e5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleVoiceInput}
              disabled={stage === 'result_suitable' || stage === 'result_unsuitable' || stage === 'analyzing'}
              className={`w-10 h-10 flex items-center justify-center rounded-xl border-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 ${
                isRecording
                  ? 'border-[#da1a32] bg-[#da1a32] text-white animate-pulse'
                  : 'border-[#e5e5e5] text-gray-400 hover:border-[#da1a32] hover:text-[#da1a32]'
              }`}
              title={isRecording ? 'Click to stop recording' : 'Voice input (optional - typing also works)'}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || stage === 'result_suitable' || stage === 'result_unsuitable' || stage === 'analyzing'}
              className="w-10 h-10 bg-[#da1a32] text-white rounded-xl flex items-center justify-center hover:bg-[#b01528] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {stage === 'awaiting_image' && !micPermissionError && !isRecording && (
            <p className="text-xs text-[#da1a32] mt-1.5 ml-12">📸 Upload a photo of your item to continue</p>
          )}
          {isRecording && (
            <p className="text-xs text-[#da1a32] mt-1.5 ml-12 animate-pulse">🎤 Listening... Speak now</p>
          )}
          {micPermissionError && !micPermissionError.includes('Permission denied') && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#da1a32] flex-shrink-0" />
                <p className="text-xs text-[#da1a32] leading-relaxed">{micPermissionError}</p>
              </div>
              <button
                onClick={() => setMicPermissionError(null)}
                className="text-[#da1a32] hover:text-[#b01528] flex-shrink-0"
                title="Dismiss"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Allocation Results (shown below chat when suitable) */}
      {stage === 'result_suitable' && (
        <div className="mt-6 space-y-5">
          {/* Receiver Cards */}
          <div>
            <h2 className="text-xl font-bold text-[#000000] mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#da1a32]" />
              AI-Recommended Allocation
            </h2>
            <div className="space-y-4">
              {suggestedReceivers.map((r, i) => (
                <div
                  key={i}
                  className={`bg-white rounded-2xl p-6 border-2 shadow-sm ${i === 0 ? 'border-[#da1a32]' : 'border-[#e5e5e5]'}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-[#da1a32] rounded-xl flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-lg font-bold text-[#000000]">{r.name}</h3>
                          <span className="px-2 py-0.5 bg-[#edf2f4] text-[#000000] text-xs rounded-full border border-[#e5e5e5]">AI Matched</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full border font-medium ${r.urgency === 'High' ? 'bg-red-50 text-[#da1a32] border-red-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                            {r.urgency} Priority
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {r.location}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-bold text-[#da1a32]">{r.allocation}%</div>
                      <div className="text-xs text-gray-500">of total allocation</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-[#edf2f4] rounded-full mb-4 overflow-hidden">
                    <div
                      className="h-full bg-[#da1a32] rounded-full transition-all"
                      style={{ width: `${r.percent}%` }}
                    />
                  </div>

                  {/* AI Explanation Panel */}
                  <div className="bg-[#edf2f4] rounded-xl p-4 border border-[#e5e5e5]">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-[#da1a32]" />
                      <span className="text-sm font-medium text-[#000000]">Allocated to {r.name} because:</span>
                    </div>
                    <ul className="space-y-1">
                      {r.reason.map((point, j) => (
                        <li key={j} className="text-sm text-gray-600 flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Confirm Button */}
          <button className="w-full bg-[#da1a32] text-white py-3.5 rounded-xl hover:bg-[#b01528] transition-all shadow-lg font-medium flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Confirm Donation & Proceed
          </button>
        </div>
      )}

      {/* Not Suitable Result */}
      {stage === 'result_unsuitable' && (
        <div className="mt-6 bg-red-50 border-2 border-red-100 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#da1a32] rounded-xl flex items-center justify-center flex-shrink-0">
              <XCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#da1a32] mb-1">Item Not Suitable for Donation</h3>
              <p className="text-sm text-red-700 mb-3">
                This item is not suitable for donation because it is damaged or unusable. Receiving organisations require items in at least fair condition to ensure safety and dignity for recipients.
              </p>
              <div className="flex items-start gap-2 bg-white border border-red-100 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-[#da1a32] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600">
                  Please consider donating items that are in <strong>Good</strong> or <strong>Worn</strong> condition. Even gently used items can make a huge difference!
                </p>
              </div>
              <button
                onClick={handleReset}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-[#000000] text-white rounded-xl text-sm font-medium hover:bg-[#da1a32] transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Try Another Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

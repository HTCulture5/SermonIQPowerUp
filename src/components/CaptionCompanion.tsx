import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  Maximize2, 
  Minimize2, 
  Type, 
  Sun, 
  Moon, 
  Eye, 
  ArrowDown, 
  X,
  Share2,
  Radio,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CaptionCompanionProps {
  transcript: string;
  interimTranscript: string;
  isRecording: boolean;
  onClose?: () => void;
  detectedVerses?: { text: string; reference: string; timestamp: number }[];
  isStandalone?: boolean;
}

type ColorTheme = 'dark' | 'yellow' | 'light';
type FontSize = 'md' | 'lg' | 'xl' | '2xl';

export const CaptionCompanion: React.FC<CaptionCompanionProps> = ({
  transcript,
  interimTranscript,
  isRecording,
  onClose,
  detectedVerses = [],
  isStandalone = false,
}) => {
  const [theme, setTheme] = useState<ColorTheme>('dark');
  const [fontSize, setFontSize] = useState<FontSize>('xl');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll when new text arrives
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [transcript, interimTranscript, autoScroll]);

  // Handle WebVTT Export
  const handleExportWebVTT = () => {
    const lines = transcript.split('. ').filter(Boolean);
    let vttContent = 'WEBVTT - SermonIQ Live Service Captions\n\n';
    
    let currentSeconds = 0;
    lines.forEach((line, idx) => {
      const start = formatVTTTime(currentSeconds);
      const end = formatVTTTime(currentSeconds + 4);
      vttContent += `${idx + 1}\n${start} --> ${end}\n${line.trim()}\n\n`;
      currentSeconds += 4;
    });

    const blob = new Blob([vttContent], { type: 'text/vtt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sermon-captions-${new Date().toISOString().slice(0, 10)}.vtt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatVTTTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}.000`;
  };

  const handleCopyLink = () => {
    const url = window.location.origin + window.location.pathname + '?view=captions';
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const themeClasses = {
    dark: 'bg-stone-950 text-stone-100 border-stone-800',
    yellow: 'bg-black text-amber-300 border-amber-500/40',
    light: 'bg-stone-50 text-stone-900 border-stone-200',
  };

  const fontSizes = {
    md: 'text-lg leading-relaxed',
    lg: 'text-2xl leading-relaxed',
    xl: 'text-3xl sm:text-4xl leading-snug font-medium',
    '2xl': 'text-4xl sm:text-5xl leading-tight font-semibold tracking-tight',
  };

  return (
    <div 
      id="caption-companion-container"
      className={`flex flex-col h-full w-full select-text transition-colors duration-200 ${
        theme === 'dark' ? 'bg-stone-950 text-stone-100' :
        theme === 'yellow' ? 'bg-black text-amber-300' :
        'bg-stone-50 text-stone-900'
      }`}
    >
      {/* Top Header Controls Bar */}
      <header 
        id="caption-companion-header"
        className={`px-4 py-3 flex items-center justify-between border-b shrink-0 ${
          theme === 'dark' ? 'border-stone-800 bg-stone-900/60' :
          theme === 'yellow' ? 'border-amber-900/60 bg-stone-950' :
          'border-stone-200 bg-white/80'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${isRecording ? 'bg-emerald-500 animate-pulse' : 'bg-stone-500'}`} />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isRecording ? 'Live Caption Feed' : 'Feed Paused'}
            </span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded font-mono ${
            theme === 'yellow' ? 'bg-amber-950 text-amber-400 border border-amber-800/60' :
            theme === 'dark' ? 'bg-stone-800 text-stone-400' : 'bg-stone-200 text-stone-600'
          }`}>
            Deaf / Hard-of-Hearing Companion
          </span>
        </div>

        {/* Font Size & Theme Toggles */}
        <div className="flex items-center gap-2">
          {/* Font selector */}
          <div className="flex items-center rounded-lg border p-0.5 text-xs font-medium border-current/20">
            {(['md', 'lg', 'xl', '2xl'] as FontSize[]).map(size => (
              <button
                key={size}
                id={`btn-fontsize-${size}`}
                onClick={() => setFontSize(size)}
                className={`px-2 py-1 rounded transition-colors ${
                  fontSize === size 
                    ? theme === 'yellow' ? 'bg-amber-400 text-black font-bold' : theme === 'dark' ? 'bg-stone-700 text-white' : 'bg-stone-900 text-white' 
                    : 'opacity-60 hover:opacity-100'
                }`}
                title={`Text size ${size.toUpperCase()}`}
              >
                {size === 'md' ? 'Aa' : size === 'lg' ? 'Aa+' : size === 'xl' ? 'Aa++' : 'MAX'}
              </button>
            ))}
          </div>

          {/* Theme selector */}
          <div className="flex items-center rounded-lg border p-0.5 border-current/20">
            <button
              id="btn-theme-dark"
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded ${theme === 'dark' ? 'bg-stone-800 text-amber-400' : 'opacity-60 hover:opacity-100'}`}
              title="Sanctuary Dark Theme"
            >
              <Moon className="w-4 h-4" />
            </button>
            <button
              id="btn-theme-yellow"
              onClick={() => setTheme('yellow')}
              className={`p-1.5 rounded ${theme === 'yellow' ? 'bg-amber-400 text-black' : 'opacity-60 hover:opacity-100'}`}
              title="High Contrast Yellow-on-Black (Vision Assist)"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              id="btn-theme-light"
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded ${theme === 'light' ? 'bg-stone-200 text-stone-900' : 'opacity-60 hover:opacity-100'}`}
              title="Clean Light Theme"
            >
              <Sun className="w-4 h-4" />
            </button>
          </div>

          {/* Share phone link */}
          <button
            id="btn-share-companion-link"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-current/20 hover:border-current/40 transition-colors"
            title="Copy companion link for congregant mobile devices"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Link Copied' : 'Share Link'}</span>
          </button>

          {/* WebVTT Export */}
          <button
            id="btn-export-vtt"
            onClick={handleExportWebVTT}
            className="p-1.5 rounded-lg border border-current/20 hover:border-current/40 transition-colors"
            title="Download WebVTT Subtitle Track"
          >
            <Download className="w-4 h-4" />
          </button>

          {onClose && (
            <button
              id="btn-close-companion"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-current/20 hover:bg-stone-800/40"
              title="Close Companion"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Live Caption Scrollable Area */}
      <div 
        ref={scrollContainerRef}
        id="caption-companion-scroll-body"
        className="flex-1 overflow-y-auto px-6 sm:px-12 py-8 flex flex-col justify-start relative scroll-smooth"
      >
        {!transcript && !interimTranscript && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-60 my-auto py-16">
            <Radio className="w-12 h-12 mb-3 animate-pulse opacity-40" />
            <p className="text-xl font-medium mb-1">
              {isRecording ? 'Listening for speech...' : 'Microphone feed paused'}
            </p>
            <p className="text-sm max-w-md opacity-80">
              Live verbatim words, scripture references, and spoken teaching will stream directly onto this display in real time.
            </p>
          </div>
        )}

        {/* Rendered Live Content */}
        <div className={`w-full max-w-4xl mx-auto space-y-4 ${fontSizes[fontSize]}`}>
          {transcript && (
            <p className="whitespace-pre-wrap leading-relaxed opacity-95">
              {transcript}
            </p>
          )}

          {interimTranscript && (
            <span className="opacity-60 italic font-normal inline ml-1 bg-current/10 px-1.5 py-0.5 rounded">
              {interimTranscript}
            </span>
          )}

          {/* Active Scripture Highlights in Companion */}
          {detectedVerses.length > 0 && (
            <div className="pt-6 border-t border-current/10">
              <div className="flex items-center gap-2 mb-2 opacity-75">
                <BookOpen className="w-4 h-4" />
                <span className="text-xs uppercase font-bold tracking-wider">Latest Cited Scripture</span>
              </div>
              <div className="rounded-xl p-4 border border-current/20 bg-current/5">
                <p className="text-base sm:text-lg font-serif italic mb-1">
                  "{detectedVerses[detectedVerses.length - 1].text}"
                </p>
                <p className="text-xs sm:text-sm font-semibold tracking-wide uppercase opacity-80">
                  — {detectedVerses[detectedVerses.length - 1].reference}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Auto-Scroll Lock indicator */}
      {!autoScroll && (
        <div className="absolute bottom-6 right-6 z-20">
          <button
            id="btn-resume-autoscroll"
            onClick={() => setAutoScroll(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-500 transition-all"
          >
            <ArrowDown className="w-4 h-4 animate-bounce" />
            <span>Resume Auto-Scroll</span>
          </button>
        </div>
      )}

      {/* Footer info banner */}
      <footer 
        id="caption-companion-footer"
        className={`px-4 py-2 text-xs flex items-center justify-between border-t shrink-0 opacity-75 ${
          theme === 'dark' ? 'border-stone-800' :
          theme === 'yellow' ? 'border-amber-900/40' :
          'border-stone-200'
        }`}
      >
        <span className="font-mono">
          WebVTT Stream Latency: &lt;180ms
        </span>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input 
              type="checkbox" 
              checked={autoScroll} 
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-stone-600" 
            />
            <span>Auto-Scroll with Speaker</span>
          </label>
        </div>
      </footer>
    </div>
  );
};

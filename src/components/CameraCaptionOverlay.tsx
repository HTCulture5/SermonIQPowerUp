import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  VideoOff, 
  Subtitles, 
  Maximize2, 
  Minimize2, 
  AlertTriangle, 
  Settings2, 
  Check,
  ShieldCheck
} from 'lucide-react';

interface CameraCaptionOverlayProps {
  transcript: string;
  interimTranscript: string;
  isRecording: boolean;
}

export const CameraCaptionOverlay: React.FC<CameraCaptionOverlayProps> = ({
  transcript,
  interimTranscript,
  isRecording,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [overlayEnabled, setOverlayEnabled] = useState<boolean>(() => {
    return localStorage.getItem('sermoniq_caption_overlay_active') !== 'false';
  });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [captionPosition, setCaptionPosition] = useState<'bottom' | 'top'>('bottom');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Toggle persistent overlay preference
  const toggleOverlay = () => {
    const nextVal = !overlayEnabled;
    setOverlayEnabled(nextVal);
    localStorage.setItem('sermoniq_caption_overlay_active', nextVal.toString());
  };

  // Start Camera Stream
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false, // Audio handled by primary mic pipeline
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access unavailable or declined:', err);
      setCameraError(err?.message || 'No camera / AV feed detected');
      setCameraActive(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraError(null);
  };

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.error(err));
      setIsFullscreen(false);
    }
  };

  // Extract the latest 2-3 spoken sentences for on-screen lower third
  const getDisplayCaption = () => {
    if (interimTranscript) {
      return interimTranscript;
    }
    if (!transcript) return '';
    const sentences = transcript.trim().split('. ');
    return sentences.slice(-2).join('. ') + (sentences.length > 0 ? '' : '');
  };

  const activeCaption = getDisplayCaption();

  return (
    <div 
      ref={containerRef}
      id="camera-caption-overlay-wrapper" 
      className="relative rounded-2xl overflow-hidden border border-stone-800 bg-stone-950 flex flex-col items-center justify-center min-h-[220px] transition-all"
    >
      {/* Active Camera Video Output */}
      {cameraActive ? (
        <video
          ref={videoRef}
          id="church-av-live-video"
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover rounded-xl"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 opacity-80">
          <div className="w-12 h-12 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-400">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-200">Church AV / Livestream Camera (Additive)</p>
            <p className="text-xs text-stone-400 max-w-sm mt-1">
              Optional camera feed for on-screen caption overlay. Audio metrics run independently on the primary microphone.
            </p>
          </div>
          <button
            id="btn-connect-av-camera"
            onClick={startCamera}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 flex items-center gap-2 transition-all"
          >
            <Video className="w-4 h-4 text-emerald-400" />
            <span>Connect Sanctuary Camera Feed</span>
          </button>
          {cameraError && (
            <p className="text-xs text-amber-400 font-mono">
              Note: {cameraError} (Running in mic-only mode)
            </p>
          )}
        </div>
      )}

      {/* Floating On-Screen Caption Lower-Third Overlay */}
      {overlayEnabled && cameraActive && activeCaption && (
        <div 
          id="onscreen-vtt-caption-banner"
          className={`absolute ${captionPosition === 'bottom' ? 'bottom-4' : 'top-4'} left-4 right-4 z-20 flex justify-center pointer-events-none`}
        >
          <div className="bg-black/85 backdrop-blur-md text-amber-300 border border-amber-500/30 px-6 py-3 rounded-xl shadow-2xl max-w-3xl text-center">
            <p className="text-base sm:text-xl font-medium tracking-wide leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {activeCaption}
            </p>
          </div>
        </div>
      )}

      {/* Controls Overlay Bar when camera is active */}
      {cameraActive && (
        <div 
          id="camera-overlay-controls" 
          className="absolute top-3 right-3 z-30 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs text-stone-300"
        >
          <button
            id="btn-toggle-caption-overlay"
            onClick={toggleOverlay}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
              overlayEnabled ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-stone-400 hover:text-white'
            }`}
            title="Toggle On-Screen WebVTT Caption Overlay"
          >
            <Subtitles className="w-3.5 h-3.5" />
            <span>{overlayEnabled ? 'Captions ON' : 'Captions OFF'}</span>
          </button>

          <button
            id="btn-fullscreen-camera"
            onClick={toggleFullscreen}
            className="p-1 rounded hover:text-white transition-colors"
            title="Fullscreen Video"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-stop-camera"
            onClick={stopCamera}
            className="p-1 rounded text-rose-400 hover:text-rose-300 transition-colors"
            title="Disconnect Camera"
          >
            <VideoOff className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Privacy Notice pill */}
      {cameraActive && (
        <div className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5 text-[10px] text-stone-400 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/5">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Local Passthrough Feed (Church AV Consent Scope)</span>
        </div>
      )}
    </div>
  );
};

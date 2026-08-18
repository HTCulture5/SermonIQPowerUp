import { useState, useEffect, useRef, useCallback } from 'react';

export interface AcousticEvent {
  id: string;
  type: 'applause' | 'laughter' | 'weeping';
  timestamp: number;
  intensity: number; // 0 to 100
  label: string;
}

export interface AcousticMetrics {
  currentLoudness: number; // 0-100
  unisonRate: number; // 0.0 to 1.0 (approximated via spectral bandwidth and peak dispersion)
  activeEvent: AcousticEvent | null;
  recentEvents: AcousticEvent[];
  counts: {
    applause_events: number;
    laughter_events: number;
    weeping_events: number;
  };
  isMicActive: boolean;
  micError: string | null;
}

export function useAcousticClassifier(isRecording: boolean) {
  const [metrics, setMetrics] = useState<AcousticMetrics>({
    currentLoudness: 0,
    unisonRate: 0.72,
    activeEvent: null,
    recentEvents: [],
    counts: {
      applause_events: 0,
      laughter_events: 0,
      weeping_events: 0,
    },
    isMicActive: false,
    micError: null,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const timeDomainArrayRef = useRef<Uint8Array | null>(null);

  // Classification debouncing refs
  const lastEventTimeRef = useRef<{ applause: number; laughter: number; weeping: number }>({
    applause: 0,
    laughter: 0,
    weeping: 0,
  });

  const historyBufferRef = useRef<number[]>([]);
  const energyVariancesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!isRecording) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      setMetrics(prev => ({
        ...prev,
        currentLoudness: 0,
        isMicActive: false,
        activeEvent: null,
      }));
      return;
    }

    let isSubscribed = true;

    const initAcousticEngine = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          } 
        });

        if (!isSubscribed) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        mediaStreamRef.current = stream;
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.4;
        analyserRef.current = analyser;

        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        const freqBins = analyser.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(freqBins);
        timeDomainArrayRef.current = new Uint8Array(freqBins);

        setMetrics(prev => ({
          ...prev,
          isMicActive: true,
          micError: null,
        }));

        let frameCounter = 0;

        const processAudioFrame = () => {
          if (!analyserRef.current || !dataArrayRef.current || !timeDomainArrayRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          analyserRef.current.getByteTimeDomainData(timeDomainArrayRef.current);

          const freqData = dataArrayRef.current;
          const timeData = timeDomainArrayRef.current;
          const length = freqData.length;

          // 1. Compute overall RMS Amplitude & Volume
          let sumSquares = 0;
          for (let i = 0; i < length; i++) {
            sumSquares += freqData[i] * freqData[i];
          }
          const rms = Math.sqrt(sumSquares / length);
          const loudness = Math.min(100, Math.round((rms / 128) * 100));

          // 2. Multi-band Energy Extraction
          // Low: 0-300Hz (approx bins 0-7), Mid: 300-2000Hz (bins 8-47), High: 2000-8000Hz (bins 48-180)
          let lowEnergy = 0;
          let midEnergy = 0;
          let highEnergy = 0;

          for (let i = 0; i < length; i++) {
            if (i <= 7) lowEnergy += freqData[i];
            else if (i <= 47) midEnergy += freqData[i];
            else highEnergy += freqData[i];
          }

          lowEnergy = lowEnergy / 8;
          midEnergy = midEnergy / 40;
          highEnergy = highEnergy / Math.max(1, length - 48);

          // Spectral dispersion / Unison approximation (spike shape & width across bin spread)
          let activeBins = 0;
          for (let i = 0; i < length; i++) {
            if (freqData[i] > 35) activeBins++;
          }
          const binSpreadRatio = activeBins / length;
          const unisonApprox = Math.min(0.98, Math.max(0.45, 0.4 + binSpreadRatio * 0.6));

          // 3. Acoustic Event Detection (Distinct spectral signatures)
          const now = Date.now();
          frameCounter++;

          let detectedEvent: AcousticEvent | null = null;

          // A. Applause signature: High broad spectral energy (highEnergy > 45, high/mid ratio high, loudness > 40)
          if (highEnergy > 40 && highEnergy > midEnergy * 0.8 && loudness > 38) {
            if (now - lastEventTimeRef.current.applause > 3500) {
              lastEventTimeRef.current.applause = now;
              detectedEvent = {
                id: `applause_${now}`,
                type: 'applause',
                timestamp: now,
                intensity: Math.min(100, Math.round(highEnergy * 1.3)),
                label: 'Congregational Applause',
              };
            }
          }

          // B. Laughter signature: Modulated bursts in mid-frequency (midEnergy prominent, rhythmic pulsation)
          else if (midEnergy > 50 && midEnergy > lowEnergy * 1.2 && highEnergy < 35 && loudness > 35) {
            if (now - lastEventTimeRef.current.laughter > 4000) {
              lastEventTimeRef.current.laughter = now;
              detectedEvent = {
                id: `laughter_${now}`,
                type: 'laughter',
                timestamp: now,
                intensity: Math.min(100, Math.round(midEnergy * 1.2)),
                label: 'Congregational Laughter',
              };
            }
          }

          // C. Weeping / Tremor signature: Low-mid vocal tremor at low-moderate overall volume (grief/reverent response)
          else if (lowEnergy > 30 && lowEnergy > midEnergy * 1.4 && highEnergy < 15 && loudness >= 18 && loudness <= 45) {
            if (now - lastEventTimeRef.current.weeping > 6000) {
              lastEventTimeRef.current.weeping = now;
              detectedEvent = {
                id: `weeping_${now}`,
                type: 'weeping',
                timestamp: now,
                intensity: Math.min(100, Math.round(lowEnergy * 1.1)),
                label: 'Reverent Weeping / Solemn Emotion',
              };
            }
          }

          // Update state every 6 frames (~100ms) for smooth responsive UI without overhead
          if (frameCounter % 6 === 0) {
            setMetrics(prev => {
              let nextActive = prev.activeEvent;
              // Clear active event after 2.5 seconds
              if (nextActive && now - nextActive.timestamp > 2500) {
                nextActive = null;
              }

              let newCounts = { ...prev.counts };
              let newRecent = [...prev.recentEvents];

              if (detectedEvent) {
                nextActive = detectedEvent;
                if (detectedEvent.type === 'applause') newCounts.applause_events += 1;
                if (detectedEvent.type === 'laughter') newCounts.laughter_events += 1;
                if (detectedEvent.type === 'weeping') newCounts.weeping_events += 1;

                newRecent = [detectedEvent, ...newRecent.slice(0, 19)];
              }

              return {
                ...prev,
                currentLoudness: loudness,
                unisonRate: parseFloat(unisonApprox.toFixed(2)),
                activeEvent: nextActive,
                recentEvents: newRecent,
                counts: newCounts,
                isMicActive: true,
                micError: null,
              };
            });
          }

          rafRef.current = requestAnimationFrame(processAudioFrame);
        };

        rafRef.current = requestAnimationFrame(processAudioFrame);
      } catch (err: any) {
        console.warn('Microphone acoustic classifier stream notice:', err);
        if (isSubscribed) {
          setMetrics(prev => ({
            ...prev,
            isMicActive: false,
            micError: err?.message || 'Microphone access is not enabled',
          }));
        }
      }
    };

    initAcousticEngine();

    return () => {
      isSubscribed = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [isRecording]);

  const resetMetrics = useCallback(() => {
    setMetrics({
      currentLoudness: 0,
      unisonRate: 0.72,
      activeEvent: null,
      recentEvents: [],
      counts: {
        applause_events: 0,
        laughter_events: 0,
        weeping_events: 0,
      },
      isMicActive: false,
      micError: null,
    });
  }, []);

  return { ...metrics, resetMetrics };
}

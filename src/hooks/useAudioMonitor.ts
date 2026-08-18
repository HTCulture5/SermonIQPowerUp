import { useState, useEffect, useRef } from 'react';

export function useAudioMonitor(isRecording: boolean) {
  const [loudness, setLoudness] = useState(0);
  const [band, setBand] = useState('Silent / Pre-service');
  const [stats, setStats] = useState({
    peak: 0,
    average: 0,
    timeInBands: {
      'Silent / Pre-service': 0,
      'Low Engagement': 0,
      'Moderate Engagement': 0,
      'High Engagement': 0,
      'Peak Engagement': 0,
    }
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);
  const rollingScoresRef = useRef<number[]>([]);
  const lastUpdateTimeRef = useRef<number>(Date.now());

  const getEngagementBand = (score: number) => {
    if (score <= 20) return 'Silent / Pre-service';
    if (score <= 40) return 'Low Engagement';
    if (score <= 60) return 'Moderate Engagement';
    if (score <= 80) return 'High Engagement';
    return 'Peak Engagement';
  };

  useEffect(() => {
    if (!isRecording) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setLoudness(0);
      return;
    }

    const startAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 512;
        analyserRef.current.smoothingTimeConstant = 0.5;

        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);

        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

        const update = () => {
          if (!analyserRef.current || !dataArrayRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          
          // Compute RMS root mean square amplitude
          let sumSquares = 0;
          for (let i = 0; i < dataArrayRef.current.length; i++) {
            sumSquares += dataArrayRef.current[i] * dataArrayRef.current[i];
          }
          const rms = Math.sqrt(sumSquares / dataArrayRef.current.length);
          const rawScore = Math.round((rms / 128) * 100); // 128 is a reasonable mid-range for byte values
          const score = Math.max(1, Math.min(100, rawScore));

          setLoudness(score);
          const currentBand = getEngagementBand(score);
          setBand(currentBand);

          // Update stats every 200ms
          const now = Date.now();
          if (now - lastUpdateTimeRef.current >= 200) {
            setStats(prev => {
              const newTimeInBands = { ...prev.timeInBands };
              newTimeInBands[currentBand as keyof typeof newTimeInBands] += 0.2;
              
              const newPeak = Math.max(prev.peak, score);
              
              // Rolling 10s average (50 samples at 200ms)
              rollingScoresRef.current.push(score);
              if (rollingScoresRef.current.length > 50) {
                rollingScoresRef.current.shift();
              }
              
              const avg = rollingScoresRef.current.reduce((a, b) => a + b, 0) / rollingScoresRef.current.length;

              return {
                peak: newPeak,
                average: Math.round(avg),
                timeInBands: newTimeInBands
              };
            });
            lastUpdateTimeRef.current = now;
          }

          rafRef.current = requestAnimationFrame(update);
        };

        update();
      } catch (err) {
        console.warn('Microphone audio stream could not be acquired:', err);
      }
    };

    startAudio();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [isRecording]);

  return { loudness, band, stats };
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { BibleVerse, BreakthroughMoment, VerseCitationMetric, ResponseDensityPoint } from '../types';
import { AcousticEvent } from './useAcousticClassifier';

export type LiveEnergyState = 'HIGH' | 'RISING' | 'STEADY' | 'QUIET' | 'REVERENT';

export interface KeywordEvent {
  id: string;
  type: 'amen' | 'alleluia' | 'affirmation';
  word: string;
  timestamp: number;
}

export interface ActiveVerseTracking {
  reference: string;
  verseText: string;
  startTime: number;
  remainingSeconds: number;
  responseCount: number;
  status: 'active' | 'completed';
}

export interface LiveMetricsEngineState {
  energyState: LiveEnergyState;
  energyExplanation: string;
  rollingCounts: {
    amen: number;
    alleluia: number;
    affirmation: number;
    applause: number;
    laughter: number;
    weeping: number;
    totalResponses1m: number;
  };
  responseDensityCurve: ResponseDensityPoint[];
  currentResponseRate: number; // responses per minute
  activeBreakthrough: BreakthroughMoment | null;
  breakthroughHistory: BreakthroughMoment[];
  activeVerseWindow: ActiveVerseTracking | null;
  verseCitationsTracked: VerseCitationMetric[];
  recentKeywordEvents: KeywordEvent[];
}

// Regex for spotting spoken affirmations
const AMEN_REGEX = /\b(amen|amen amen|amen praise god)\b/gi;
const ALLELUIA_REGEX = /\b(alleluia|hallelujah|halelujah|halleluyah)\b/gi;
const AFFIRMATION_REGEX = /\b(praise the lord|praise god|glory to god|thank you jesus|yes lord|that's right|glory|glory hallelujah|lord have mercy|preach it)\b/gi;

export function useLiveMetricsEngine(
  isRecording: boolean,
  transcript: string,
  interimTranscript: string,
  loudness: number,
  activeAcousticEvent: AcousticEvent | null,
  recentAcousticEvents: AcousticEvent[],
  detectedVerses: BibleVerse[]
) {
  const [engineState, setEngineState] = useState<LiveMetricsEngineState>({
    energyState: 'STEADY',
    energyExplanation: 'Congregation attentive and centered',
    rollingCounts: {
      amen: 0,
      alleluia: 0,
      affirmation: 0,
      applause: 0,
      laughter: 0,
      weeping: 0,
      totalResponses1m: 0,
    },
    responseDensityCurve: [{ minute: 1, responses: 0 }],
    currentResponseRate: 0,
    activeBreakthrough: null,
    breakthroughHistory: [],
    activeVerseWindow: null,
    verseCitationsTracked: [],
    recentKeywordEvents: [],
  });

  // Track processed transcript length to avoid re-spotting past keywords
  const processedLengthRef = useRef<number>(0);
  const keywordEventsRef = useRef<KeywordEvent[]>([]);
  const densityPointsRef = useRef<ResponseDensityPoint[]>([{ minute: 1, responses: 0 }]);
  const minuteBucketRef = useRef<number>(1);
  const minuteResponsesCountRef = useRef<number>(0);
  const serviceStartTimeRef = useRef<number>(Date.now());
  const lastBreakthroughTimeRef = useRef<number>(0);
  const activeVerseRef = useRef<ActiveVerseTracking | null>(null);
  const lastProcessedVerseRef = useRef<string | null>(null);

  // 1. Keyword Spotting on transcript stream
  useEffect(() => {
    if (!isRecording || !transcript) {
      if (!isRecording) {
        processedLengthRef.current = 0;
      }
      return;
    }

    const currentText = transcript;
    if (currentText.length <= processedLengthRef.current) return;

    const newSnippet = currentText.substring(processedLengthRef.current);
    processedLengthRef.current = currentText.length;

    const now = Date.now();
    const newKeywords: KeywordEvent[] = [];

    // Check Amen
    let match;
    while ((match = AMEN_REGEX.exec(newSnippet)) !== null) {
      newKeywords.push({
        id: `amen_${now}_${Math.random()}`,
        type: 'amen',
        word: match[0],
        timestamp: now,
      });
      minuteResponsesCountRef.current += 1;
    }

    // Check Alleluia
    while ((match = ALLELUIA_REGEX.exec(newSnippet)) !== null) {
      newKeywords.push({
        id: `alleluia_${now}_${Math.random()}`,
        type: 'alleluia',
        word: match[0],
        timestamp: now,
      });
      minuteResponsesCountRef.current += 1;
    }

    // Check Affirmations
    while ((match = AFFIRMATION_REGEX.exec(newSnippet)) !== null) {
      newKeywords.push({
        id: `aff_${now}_${Math.random()}`,
        type: 'affirmation',
        word: match[0],
        timestamp: now,
      });
      minuteResponsesCountRef.current += 1;
    }

    if (newKeywords.length > 0) {
      keywordEventsRef.current = [...newKeywords, ...keywordEventsRef.current].slice(0, 50);
      
      // Update verse window if active
      if (activeVerseRef.current && activeVerseRef.current.status === 'active') {
        activeVerseRef.current.responseCount += newKeywords.length;
      }
    }
  }, [isRecording, transcript]);

  // 2. Track when a new verse citation is recognized -> start 30s response tracking window
  useEffect(() => {
    if (!isRecording || detectedVerses.length === 0) return;

    const latestVerse = detectedVerses[detectedVerses.length - 1];
    if (!latestVerse || latestVerse.reference === lastProcessedVerseRef.current) return;

    lastProcessedVerseRef.current = latestVerse.reference;
    const now = Date.now();

    activeVerseRef.current = {
      reference: latestVerse.reference,
      verseText: latestVerse.text,
      startTime: now,
      remainingSeconds: 30,
      responseCount: 0,
      status: 'active',
    };

    setEngineState(prev => ({
      ...prev,
      activeVerseWindow: activeVerseRef.current,
    }));
  }, [detectedVerses, isRecording]);

  // 3. Main Metrics Engine interval (runs every 1s for live dashboard push)
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      const fiveSecondsAgo = now - 5000;

      // Filter rolling 1m keywords
      const active1mKeywords = keywordEventsRef.current.filter(k => k.timestamp >= oneMinuteAgo);
      const amen1m = active1mKeywords.filter(k => k.type === 'amen').length;
      const alleluia1m = active1mKeywords.filter(k => k.type === 'alleluia').length;
      const aff1m = active1mKeywords.filter(k => k.type === 'affirmation').length;

      // Filter rolling 1m acoustic events
      const applause1m = recentAcousticEvents.filter(e => e.type === 'applause' && e.timestamp >= oneMinuteAgo).length;
      const laughter1m = recentAcousticEvents.filter(e => e.type === 'laughter' && e.timestamp >= oneMinuteAgo).length;
      const weeping1m = recentAcousticEvents.filter(e => e.type === 'weeping' && e.timestamp >= oneMinuteAgo).length;

      const totalResponses1m = amen1m + alleluia1m + aff1m + applause1m + laughter1m;

      // Update Active Verse Window
      let currentActiveVerse = activeVerseRef.current;
      if (currentActiveVerse && currentActiveVerse.status === 'active') {
        const elapsedSec = Math.floor((now - currentActiveVerse.startTime) / 1000);
        const remaining = Math.max(0, 30 - elapsedSec);

        if (remaining <= 0) {
          // Window closed! Archive citation metric
          const finalScore = Math.min(100, Math.round(50 + currentActiveVerse.responseCount * 10));
          const metricItem: VerseCitationMetric = {
            reference: currentActiveVerse.reference,
            timestamp_seconds: Math.floor((currentActiveVerse.startTime - serviceStartTimeRef.current) / 1000),
            response_window_score: finalScore,
          };

          setEngineState(prev => ({
            ...prev,
            verseCitationsTracked: [metricItem, ...prev.verseCitationsTracked],
            activeVerseWindow: null,
          }));
          activeVerseRef.current = null;
        } else {
          currentActiveVerse.remainingSeconds = remaining;
        }
      }

      // Check Peak / Breakthrough Moment Flag (2+ signal types spike within 5s)
      const recent5sKeywords = keywordEventsRef.current.filter(k => k.timestamp >= fiveSecondsAgo);
      const recent5sAcoustic = recentAcousticEvents.filter(e => e.timestamp >= fiveSecondsAgo);
      const hasLoudSignal = loudness >= 55;

      const signalTypes = new Set<string>();
      if (recent5sKeywords.some(k => k.type === 'amen')) signalTypes.add('Amen / Affirmation');
      if (recent5sKeywords.some(k => k.type === 'alleluia')) signalTypes.add('Alleluia');
      if (recent5sAcoustic.some(e => e.type === 'applause')) signalTypes.add('Applause');
      if (recent5sAcoustic.some(e => e.type === 'laughter')) signalTypes.add('Laughter');
      if (hasLoudSignal) signalTypes.add('Sustained Volume');

      let newBreakthrough: BreakthroughMoment | null = null;
      if (signalTypes.size >= 2 && now - lastBreakthroughTimeRef.current > 15000) {
        lastBreakthroughTimeRef.current = now;
        const moment: BreakthroughMoment = {
          timestamp_seconds: Math.max(1, Math.floor((now - serviceStartTimeRef.current) / 1000)),
          signals: Array.from(signalTypes),
        };
        newBreakthrough = moment;
      }

      // Compute 1-second glance Energy State
      let calculatedEnergy: LiveEnergyState = 'STEADY';
      let explanation = 'Congregation attentive and centered';

      if (totalResponses1m >= 14 || loudness >= 65) {
        calculatedEnergy = 'HIGH';
        explanation = 'Vibrant congregational momentum & collective affirmations';
      } else if (totalResponses1m >= 7 || (activeAcousticEvent && activeAcousticEvent.type === 'applause')) {
        calculatedEnergy = 'RISING';
        explanation = 'Ascending verbal response and active resonance';
      } else if (weeping1m > 0 || (loudness <= 25 && totalResponses1m <= 1)) {
        if (weeping1m > 0) {
          calculatedEnergy = 'REVERENT';
          explanation = 'Solemn, contemplative posture / sacred reverence';
        } else {
          calculatedEnergy = 'QUIET';
          explanation = 'Deep listening / quiet teaching posture';
        }
      }

      // Roll density curve every 60s
      const elapsedTotalMin = Math.max(1, Math.floor((now - serviceStartTimeRef.current) / 60000) + 1);
      if (elapsedTotalMin !== minuteBucketRef.current) {
        densityPointsRef.current = [
          ...densityPointsRef.current,
          { minute: elapsedTotalMin, responses: minuteResponsesCountRef.current }
        ].slice(-20);
        minuteBucketRef.current = elapsedTotalMin;
        minuteResponsesCountRef.current = 0;
      }

      setEngineState(prev => ({
        energyState: calculatedEnergy,
        energyExplanation: explanation,
        rollingCounts: {
          amen: amen1m,
          alleluia: alleluia1m,
          affirmation: aff1m,
          applause: applause1m,
          laughter: laughter1m,
          weeping: weeping1m,
          totalResponses1m,
        },
        responseDensityCurve: densityPointsRef.current,
        currentResponseRate: totalResponses1m,
        activeBreakthrough: newBreakthrough || (prev.activeBreakthrough && (now - lastBreakthroughTimeRef.current < 8000) ? prev.activeBreakthrough : null),
        breakthroughHistory: newBreakthrough ? [newBreakthrough, ...prev.breakthroughHistory.slice(0, 9)] : prev.breakthroughHistory,
        activeVerseWindow: activeVerseRef.current,
        verseCitationsTracked: prev.verseCitationsTracked,
        recentKeywordEvents: active1mKeywords,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, loudness, activeAcousticEvent, recentAcousticEvents]);

  const resetEngine = useCallback(() => {
    processedLengthRef.current = 0;
    keywordEventsRef.current = [];
    densityPointsRef.current = [{ minute: 1, responses: 0 }];
    minuteBucketRef.current = 1;
    minuteResponsesCountRef.current = 0;
    serviceStartTimeRef.current = Date.now();
    lastBreakthroughTimeRef.current = 0;
    activeVerseRef.current = null;
    lastProcessedVerseRef.current = null;

    setEngineState({
      energyState: 'STEADY',
      energyExplanation: 'Congregation attentive and centered',
      rollingCounts: {
        amen: 0,
        alleluia: 0,
        affirmation: 0,
        applause: 0,
        laughter: 0,
        weeping: 0,
        totalResponses1m: 0,
      },
      responseDensityCurve: [{ minute: 1, responses: 0 }],
      currentResponseRate: 0,
      activeBreakthrough: null,
      breakthroughHistory: [],
      activeVerseWindow: null,
      verseCitationsTracked: [],
      recentKeywordEvents: [],
    });
  }, []);

  return { ...engineState, resetEngine };
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Mic, 
  Square, 
  FileText, 
  LayoutDashboard, 
  History, 
  TrendingUp, 
  BookOpen, 
  Hash,
  AlertCircle,
  Download,
  Loader2,
  ChevronLeft,
  Settings,
  Bell,
  Search,
  Plus,
  Heart,
  Copy,
  Check,
  Printer,
  X,
  Flame,
  ShieldAlert,
  Mail,
  Cloud,
  Database,
  BookmarkCheck,
  Trash2,
  Church,
  User,
  ShieldCheck,
  Activity,
  Maximize2,
  Rss,
  LogIn,
  LogOut,
  Sparkles,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

import { useAudioMonitor } from './hooks/useAudioMonitor';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { analyzeTranscriptSnippet, generateServiceReport } from './services/geminiService';
import { scanForVerses, fetchVerse, VERSE_REGEX } from './services/scriptureService';
import { 
  ServiceAnalysisSnippet, 
  BibleVerse, 
  EngagementMoment, 
  ServiceReport, 
  SavedServiceReport,
  ServiceMomentType, 
  EmotionalTone,
  RssFeedItem
} from './types';
import { 
  saveServiceReport, 
  fetchServiceReports, 
  deleteServiceReport, 
  subscribeServiceReports 
} from './services/firestoreService';
import { auth, googleSignIn, logout, hasCreatedProfile, setCreatedProfile } from './services/authService';
import { cn } from './lib/utils';
import { LandingPage } from './components/LandingPage';
import { DonationDashboard } from './components/DonationDashboard';
import { CareChat } from './components/CareChat';
import { DemoRequestModal } from './components/DemoRequestModal';
import { ChurchSignupModal } from './components/ChurchSignupModal';
import { SermonIQLogo } from './components/SermonIQLogo';
import { GmailManager } from './components/GmailManager';
import ProfileSettingsPage from './components/ProfileSettingsPage';
import { RssFeedView } from './components/RssFeedView';

// --- MAIN APP COMPONENT ---

export default function SermonIQ() {
  const [view, setView] = useState<'landing' | 'dashboard' | 'chat' | 'donation' | 'gmail' | 'profile' | 'rss'>('landing');
  const [feedToDiscussInChat, setFeedToDiscussInChat] = useState<RssFeedItem | null>(null);
  const [gmailReportDraft, setGmailReportDraft] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [engagementTimeline, setEngagementTimeline] = useState<EngagementMoment[]>([]);
  const [minuteScores, setMinuteScores] = useState<{ minute: number, score: number }[]>([]);
  const [bibleVerses, setBibleVerses] = useState<BibleVerse[]>([]);
  const [currentVerse, setCurrentVerse] = useState<BibleVerse | null>(null);
  const [manualSearch, setManualSearch] = useState('');
  const [isSearchingVerse, setIsSearchingVerse] = useState(false);
  const [analysis, setAnalysis] = useState<ServiceAnalysisSnippet>({
    keywords: [],
    topic: 'Waiting for service...',
    momentType: 'Transition',
    emotionalTone: 'Reverent'
  });
  const [momentHistory, setMomentHistory] = useState<{ time: string, type: ServiceMomentType }[]>([]);
  const [report, setReport] = useState<ServiceReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showPromptTemplateView, setShowPromptTemplateView] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isChurchSignupOpen, setIsChurchSignupOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  
  // Firebase Firestore State
  const [savedReports, setSavedReports] = useState<SavedServiceReport[]>([]);
  const [isSavingToFirestore, setIsSavingToFirestore] = useState(false);
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false);
  const [user, setUser] = useState<any>(auth.currentUser);
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isDashboardMobileMenuOpen, setIsDashboardMobileMenuOpen] = useState(false);

  const { loudness, band, stats } = useAudioMonitor(isRecording);
  const { transcript, interimTranscript, fullTranscript, permissionDenied } = useSpeechRecognition(isRecording);

  // Subscribe to Firebase Auth and Firestore service reports in real-time
  useEffect(() => {
    let unsubscribeReports = () => {};
    
    const updateAuthState = (currentUser: any) => {
      setUser(currentUser);
      const profileCreated = hasCreatedProfile() || Boolean(currentUser);
      setHasProfile(profileCreated);
      if (currentUser && !hasCreatedProfile()) {
        setCreatedProfile(true);
      }
    };

    const unbindAuth = auth.onAuthStateChanged((currentUser) => {
      updateAuthState(currentUser);
      if (currentUser) {
        unsubscribeReports = subscribeServiceReports((reports) => {
          setSavedReports(reports);
        });
      } else {
        setSavedReports([]);
      }
    });

    const handleCustomAuthChange = () => {
      setUser(auth.currentUser);
      setHasProfile(hasCreatedProfile() || Boolean(auth.currentUser));
    };

    window.addEventListener('sermoniq-auth-change', handleCustomAuthChange);
    window.addEventListener('storage', handleCustomAuthChange);

    // Initial sync
    updateAuthState(auth.currentUser);

    return () => {
      unbindAuth();
      unsubscribeReports();
      window.removeEventListener('sermoniq-auth-change', handleCustomAuthChange);
      window.removeEventListener('storage', handleCustomAuthChange);
    };
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setCreatedProfile(true);
        setHasProfile(true);
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Mock historical data for past 8 sessions
  const historicalSessions = [
    { name: 'Apr 02', score: 65 },
    { name: 'Apr 09', score: 72 },
    { name: 'Apr 16', score: 48 },
    { name: 'Apr 23', score: 85 },
    { name: 'Apr 30', score: 62 },
    { name: 'May 07', score: 55 },
    { name: 'May 14', score: 78 },
    { name: 'Today', score: stats.average || 0 }
  ];

  const keywordData = analysis.keywords.map(k => ({
    name: k,
    value: Math.floor(Math.random() * 40) + 10 // Mock frequency
  })).sort((a, b) => b.value - a.value);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      if (!startTime) setStartTime(Date.now());
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording, startTime]);

  // Engagement Timeline update (every 1s)
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setEngagementTimeline(prev => [
          ...prev.slice(-30), // keep last 30s
          { timestamp: Date.now(), score: loudness, band }
        ]);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRecording, loudness, band]);

  // Minute Aggregation logic
  useEffect(() => {
    if (isRecording && elapsedTime > 0 && elapsedTime % 60 === 0) {
      setMinuteScores(prev => [
        ...prev,
        { minute: Math.floor(elapsedTime / 60), score: stats.average }
      ]);
    }
  }, [elapsedTime, isRecording, stats.average]);

  // AI Analysis Loop (every 30s)
  const lastAnalyzedIndexRef = useRef(0);
  useEffect(() => {
    if (isRecording && fullTranscript.length > 0 && elapsedTime % 30 === 0) {
      const runAnalysis = async () => {
        setIsAnalyzing(true);
        const newText = fullTranscript.slice(lastAnalyzedIndexRef.current).map(t => t.text).join(' ');
        lastAnalyzedIndexRef.current = fullTranscript.length;
        
        const result = await analyzeTranscriptSnippet(newText);
        setAnalysis(prev => ({
          ...result,
          keywords: Array.from(new Set([...prev.keywords, ...result.keywords])).slice(-15)
        }));
        
        setMomentHistory(prev => [
          ...prev,
          { time: format(new Date(), 'HH:mm:ss'), type: result.momentType }
        ]);
        setIsAnalyzing(false);
      };
      runAnalysis();
    }
  }, [elapsedTime, isRecording, fullTranscript]);

  // Bible Verse Detection (on fullTranscript change)
  useEffect(() => {
    if (isRecording && fullTranscript.length > 0) {
      const latest = fullTranscript[fullTranscript.length - 1];
      scanForVerses(latest.text, (verse) => {
        setBibleVerses(prev => [verse, ...prev]);
        setCurrentVerse(verse);
        // Engagement keyword boost
        setAnalysis(prev => ({
          ...prev,
          keywords: Array.from(new Set([...prev.keywords, verse.reference])).slice(-15)
        }));
      });
    }
  }, [fullTranscript, isRecording]);

  const handleManualVerseSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!manualSearch.trim() || isSearchingVerse) return;
    
    setIsSearchingVerse(true);
    const verse = await fetchVerse(manualSearch, '🔍 Manual');
    if (verse) {
      setBibleVerses(prev => [verse, ...prev]);
      setCurrentVerse(verse);
      setManualSearch('');
    }
    setIsSearchingVerse(false);
  };

  const handleQuickVerse = async (ref: string) => {
    const verse = await fetchVerse(ref, '⚡ Quick');
    if (verse) {
      setBibleVerses(prev => [verse, ...prev]);
      setCurrentVerse(verse);
    }
  };

  const handleStartStop = () => {
    if (isRecording) {
      setIsRecording(false);
      // Auto-generate report if session is valid (> 30s)
      if (elapsedTime >= 30) {
        handleGenerateReport();
      }
    } else {
      setIsRecording(true);
      setStartTime(Date.now());
      setElapsedTime(0);
      setEngagementTimeline([]);
      setBibleVerses([]);
      setMinuteScores([]);
      setMomentHistory([]);
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    const sessionData = {
      transcript: fullTranscript.map(t => t.text).join(' '),
      engagementTimeline,
      minuteScores,
      stats,
      verses: bibleVerses,
      momentHistory,
      analysis,
      elapsedTime
    };

    // Calculate trailing 4-week average from saved reports
    let trailingAverage = undefined;
    if (savedReports.length > 0) {
      const recentReports = savedReports.slice(0, 4);
      const scores = recentReports.map(r => r.overallScore || r.averageEngagement || 75);
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      trailingAverage = {
        trailing_4_week_score: avg,
        previous_services_count: savedReports.length,
        average_unison_rate: 0.72,
        typical_momentum: "building"
      };
    }

    const churchName = (user as any)?.churchName || user?.displayName ? `${user.displayName}'s Ministry` : "Sanctuary Church";
    const serviceDate = format(new Date(), 'EEEE, MMMM dd, yyyy');

    const result = await generateServiceReport(sessionData, {
      churchName,
      serviceDate,
      trailingAverage
    });
    setReport(result);
    setIsGeneratingReport(false);
  };

  const handlePrintReport = () => {
    const printable = document.getElementById('report-content');
    if (!printable) return;
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.write(`
        <html>
          <head>
            <title>SermonIQ Service Intelligence Report</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
              body {
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                color: #0c0a09;
                background: #ffffff;
                line-height: 1.6;
                padding: 40px;
                margin: 0;
              }
              h1, h2, h3, h4 {
                color: #0a0e2a;
              }
              .font-serif {
                font-family: 'Playfair Display', Georgia, serif;
              }
              .text-4xl { font-size: 2.25rem; font-weight: 900; }
              .text-xl { font-size: 1.25rem; font-weight: 500; }
              .text-xs { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #a1a1aa; }
              .grid { display: grid; }
              .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .gap-8 { gap: 2rem; }
              .gap-4 { gap: 1rem; }
              .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
              .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
              .bg-gray-50 { background-color: #f8fafc; }
              .rounded-xl { border-radius: 0.75rem; }
              .border { border: 1px solid #e2e8f0; }
              .border-b { border-bottom: 1px solid #e1e8ed; }
              .pb-8 { padding-bottom: 2rem; }
              .text-center { text-align: center; }
              .max-w-2xl { max-width: 42rem; margin-left: auto; margin-right: auto; }
              .space-y-12 > * + * { margin-top: 3rem; }
              .space-y-4 > * + * { margin-top: 1rem; }
              .text-4xl.font-mono { font-family: monospace; font-size: 2.25rem; }
              .prose { max-width: 65ch; }
              .italic { font-style: italic; }
              .border-l-4 { border-left: 4px solid #d4af37; padding-left: 1.5rem; }
              .bg-orange-50 { background-color: #fffaf0; border: 1px solid #ffedd5; border-radius: 0.75rem; padding: 1.5rem; }
              .text-orange-950 { color: #431407; }
              @media print {
                body { padding: 0px; }
              }
            </style>
          </head>
          <body>
            <div class="max-w-2xl">
              ${printable.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();
      
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  };

  const getFormattedReportText = () => {
    if (!report) return '';
    if (report.rawPastorReportText) {
      return `SERMONIQ ENGAGEMENT REPORT
Generated: ${format(new Date(), 'EEEE, MMMM dd, yyyy')}
Church: ${(user as any)?.churchName || user?.displayName || 'Sanctuary Church'}

${report.rawPastorReportText}

=========================================
OBSERVABLE TELEMETRY CONTEXT
=========================================
Duration: ${formatTime(elapsedTime || 3600)}
Response Ratio: ${((report.metricsData?.unison_response_rate || 0.72) * 100).toFixed(0)}% Unison
Momentum: ${report.metricsData?.momentum || 'Building'}
`;
    }

    return `SERMONIQ SERVICE ENGAGEMENT REPORT
Generated on: ${format(new Date(), 'MMMM dd, yyyy')}

=========================================
01 / OVERALL ENGAGEMENT SCORE
=========================================
Score: ${report.overallScore || stats.average || 75}/100
${report.scoreExplanation || 'Weighs verbal/applause frequency (35%), unison/duration (25%), verse impact (25%), and momentum (15%).'}

=========================================
02 / THIS WEEK'S HIGHLIGHTS
=========================================
${report.highlights || report.summary}

=========================================
03 / SCRIPTURE IMPACT
=========================================
${report.verseImpact || report.scripture}

=========================================
04 / MOMENT WORTH REVISITING
=========================================
${report.momentWorthRevisiting || 'No convergence flag triggered (continuous steady engagement).'}

=========================================
05 / TREND NOTE
=========================================
${report.trendNote || 'Tracking within expected range.'}

=========================================
06 / HONEST OBSERVATION
=========================================
${report.honestObservation || report.recommendations}
`;
  };

  const handleCopyReportText = () => {
    if (!report) return;
    const text = getFormattedReportText();

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyPromptTemplate = () => {
    if (!report?.metricsData) return;
    const promptText = `SYSTEM PROMPT:
You are generating a post-service engagement report for a pastor, based on
congregational response data captured during their sermon. The audience for
this report is the pastor themselves, reviewing their own service — write
with the warmth and respect that deserves, not the tone of an analytics
dashboard.

WHAT THIS DATA IS AND ISN'T
You are analyzing observable congregational response: verbal affirmations,
applause, laughter, weeping, response timing, and patterns around specific
verses. This is real signal about how a congregation outwardly responded to
a service.

This data does NOT measure spiritual depth, the presence or move of the
Holy Spirit, or the sincerity of anyone's worship. A quiet, reverent
congregation can be deeply moved without making sound. A loud response can
be habit as much as conviction. Never state or imply that a high score
means the Spirit was "more present," that a quiet service was spiritually
lesser, or that this system can detect anything beyond outward, audible
response. If you notice a moment where multiple signals converged (flagged
in the input as a "breakthrough moment"), describe it as what it is — a
concentration of congregational response worth revisiting — not as a
theological claim about what happened.

If the input data is sparse, contradictory, or shows a mostly-quiet
service, say so plainly rather than manufacturing enthusiasm the data
doesn't support. A pastor will trust this tool more, not less, for being
honest about a quiet week.

SCORING METHODOLOGY
Compute a single 0–100 overall engagement score as a weighted composite:
- Response frequency & intensity (Amen/Alleluia/affirmation counts,
  applause, laughter — weeping is tracked but excluded from the numeric
  score; grief responses shouldn't be scored as "low engagement," so
  surface them in the narrative instead) — 35%
- Response breadth & duration (unison rate, sustained-response duration,
  stillness distinguished from disengagement) — 25%
- Verse impact (scripture-response correlation, theme-response mapping) — 25%
- Momentum (whether energy built toward a climax or was front-loaded and
  faded) — 15%

State the score, then immediately explain in one sentence what it is
weighing — never present it as a bare number with no context. If this is
not the church's first service on record, compare against their own
trailing 4-week average, not against any other church — this is a
personal trend tool, not a leaderboard.

OUTPUT FORMAT
Return the report in this structure, using plain, warm, pastoral language
throughout — avoid words like "metrics," "data points," or "algorithm" in
the report body itself:

1. Overall Engagement Score (0–100, one-sentence explanation of the weighting)
2. This Week's Highlights (2–4 sentences on the strongest response moments,
   named by approximate timestamp so the pastor can find them in the
   recording)
3. Verse Impact (which cited verses drew the strongest response, and
   whether that tracks with what the pastor might expect)
4. A Moment Worth Revisiting (if a breakthrough-moment flag is present in
   the input — describe it plainly, with the epistemic care specified
   above; omit this section entirely if no flag fired rather than forcing
   one)
5. Trend Note (one sentence comparing to the trailing average, only if
   prior-week data is present in the input)
6. One Honest Observation (a single, specific, non-generic note)

Keep the whole report under 300 words.

==================================================
USER PROMPT:
Generate this week's engagement report.

Service date: ${format(new Date(), 'EEEE, MMMM dd, yyyy')}
Church: ${(user as any)?.churchName || user?.displayName || 'Sanctuary Church'}

Metrics data:
${JSON.stringify(report.metricsData, null, 2)}

Trailing 4-week average (omit trend section if not provided):
${report.trailingAverageData ? JSON.stringify(report.trailingAverageData, null, 2) : 'None provided'}`;

    navigator.clipboard.writeText(promptText).then(() => {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    });
  };

  const handleEmailReportViaGmail = () => {
    if (!report) return;
    const text = getFormattedReportText();
    setGmailReportDraft(text);
    setReport(null);
    setView('gmail');
  };

  const handleSaveReportToFirestore = async () => {
    if (!report) return;
    setIsSavingToFirestore(true);
    try {
      if (!auth.currentUser) {
        await googleSignIn();
      }
      await saveServiceReport({
        overallScore: report.overallScore || stats.average || 75,
        scoreExplanation: report.scoreExplanation || '',
        highlights: report.highlights || report.summary,
        verseImpact: report.verseImpact || report.scripture,
        momentWorthRevisiting: report.momentWorthRevisiting,
        trendNote: report.trendNote,
        honestObservation: report.honestObservation || report.recommendations,
        rawPastorReportText: report.rawPastorReportText,
        metricsData: report.metricsData,
        trailingAverageData: report.trailingAverageData,
        summary: report.summary,
        engagementAnalysis: report.engagementAnalysis,
        themes: report.themes,
        scripture: report.scripture,
        congregationResponse: report.congregationResponse,
        recommendations: report.recommendations,
        serviceTitle: analysis.topic || 'Sunday Sanctuary Intelligence',
        averageEngagement: report.overallScore || stats.average || 75,
        peakEngagement: stats.peak || 92,
        durationSeconds: elapsedTime || 3600,
        versesCount: bibleVerses.length
      });
      setSavedSuccessMessage('Dossier saved to Firebase Firestore!');
      setTimeout(() => setSavedSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error archiving to Firestore:', err);
    } finally {
      setIsSavingToFirestore(false);
    }
  };

  const handleOpenSavedReport = (saved: SavedServiceReport) => {
    setReport({
      overallScore: saved.overallScore || saved.averageEngagement,
      scoreExplanation: saved.scoreExplanation,
      highlights: saved.highlights,
      verseImpact: saved.verseImpact,
      momentWorthRevisiting: saved.momentWorthRevisiting,
      trendNote: saved.trendNote,
      honestObservation: saved.honestObservation,
      rawPastorReportText: saved.rawPastorReportText,
      metricsData: saved.metricsData,
      trailingAverageData: saved.trailingAverageData,
      summary: saved.summary,
      engagementAnalysis: saved.engagementAnalysis,
      themes: saved.themes,
      scripture: saved.scripture,
      congregationResponse: saved.congregationResponse,
      recommendations: saved.recommendations
    });
    setIsHistoryModalOpen(false);
  };

  const handleDeleteSavedReport = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this archived service report from Firebase?')) {
      try {
        await deleteServiceReport(reportId);
      } catch (err) {
        console.error('Failed to delete report:', err);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  return (
    <div className="min-h-screen bg-[#0A0E2A] text-white font-sans selection:bg-[#D4AF37] selection:text-[#0A0E2A]">
      <AnimatePresence mode="wait">
        {view === 'profile' ? (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen"
          >
            <ProfileSettingsPage
              onBackToDashboard={() => setView('dashboard')}
              onNavigateToView={(target) => setView(target)}
            />
          </motion.div>
        ) : view === 'landing' ? (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LandingPage 
              onStart={() => setView('dashboard')} 
              onOpenChat={() => setView('chat')} 
              onOpenDonation={() => setView('donation')} 
              onOpenGmail={() => setView('gmail')} 
              onOpenChurchSignup={() => setIsChurchSignupOpen(true)}
              onOpenProfile={() => setView('profile')}
              onOpenRssFeed={() => setView('rss')}
            />
          </motion.div>
        ) : view === 'gmail' ? (
          <motion.div
            key="gmail"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="h-dvh-screen h-[100dvh] flex flex-col"
          >
            <GmailManager 
              initialReportText={gmailReportDraft}
              onClose={() => {
                setGmailReportDraft('');
                setView('dashboard');
              }}
            />
          </motion.div>
        ) : view === 'donation' ? (
          <motion.div
            key="donation"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pb-20"
          >
            {/* DONATION HEADER */}
            <header className="border-b border-white/10 bg-[#0A0E2A]/90 backdrop-blur-md sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <button onClick={() => setView('landing')} className="p-1.5 sm:p-2 hover:bg-white/5 rounded-lg transition-all text-white/40 hover:text-white cursor-pointer shrink-0">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#D4AF37] rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.3)] shrink-0">
                    <TrendingUp className="text-[#0A0E2A] w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-sm sm:text-xl font-bold tracking-tight text-[#D4AF37] truncate">Generosity Workspace</h1>
                    <p className="text-[8px] sm:text-[10px] uppercase tracking-widest text-white/50 font-mono truncate">Anonymous Tithes & Offerings</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    onClick={() => setView('rss')}
                    className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Rss className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">RSS Feeds</span>
                  </button>
                  <button
                    onClick={() => setView('gmail')}
                    className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white/5 border border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Gmail</span>
                  </button>
                  <button
                    onClick={() => setView('chat')}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/5 border border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Heart className="w-3.5 h-3.5 fill-current" />
                    <span className="hidden xs:inline">Pastoral Chat</span>
                  </button>
                </div>
              </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
               <div className="bg-[#0D1236]/30 border border-white/5 rounded-2xl p-6 sm:p-8 mb-8 text-center max-w-2xl mx-auto space-y-4 animate-fade-in">
                  <span className="text-[9px] font-bold font-mono tracking-widest text-[#D4AF37] uppercase bg-[#D4AF37]/10 px-3 py-1 rounded-full">
                     SECURE TRANSACTION GATEWAY
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black">Support the Mission</h2>
                  <p className="text-white/60 text-xs sm:text-sm leading-relaxed">
                     Your offerings support physical and digital ministry reach. Choose what fund your gesture is designated for — General sanctuary overhead, missionary travels, children/youth studies, or discrete benevolence checks.
                  </p>
               </div>
               
               <div className="h-[650px] max-w-3xl mx-auto shadow-2xl">
                 <DonationDashboard onOpenChat={() => setView('chat')} />
               </div>
            </main>
          </motion.div>
        ) : view === 'rss' ? (
          <motion.div
            key="rss"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen bg-[#070B1E]"
          >
            <RssFeedView 
              onBackToDashboard={() => setView('landing')}
              onOpenDashboard={() => setView('dashboard')}
              onSelectFeedForChat={(item) => {
                setFeedToDiscussInChat(item);
                setView('chat');
              }}
              onOpenChat={() => setView('chat')}
              onDonateClick={() => setView('donation')}
            />
          </motion.div>
        ) : view === 'chat' ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="h-screen h-[100dvh] flex flex-col overflow-hidden bg-[#0A0E2A]"
          >
            {/* CHAT HEADER - Mobile-Friendly Responsive */}
            <header className="border-b border-white/10 bg-[#0A0E2A]/95 backdrop-blur-md sticky top-0 z-50 shrink-0">
              <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <button 
                    onClick={() => setView('landing')} 
                    className="p-1.5 sm:p-2 hover:bg-white/5 rounded-lg transition-all text-white/50 hover:text-white cursor-pointer shrink-0"
                    aria-label="Back to Landing"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#FFF2A3] via-[#E2B13C] to-[#BD8825] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.25)] shrink-0">
                    <Heart className="text-[#0A0E2A] w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xs sm:text-base font-bold tracking-tight text-[#D4AF37] truncate">Pastoral Sanctuary</h1>
                    <p className="text-[7px] sm:text-[8px] uppercase tracking-widest text-white/40 font-mono font-medium truncate">
                      End-to-end encrypted spiritual counseling
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    onClick={() => setView('rss')}
                    className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                    title="Switch to RSS Feed"
                  >
                    <Rss className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">RSS Feed</span>
                  </button>
                  <button
                    onClick={() => setView('dashboard')}
                    className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </button>
                  <button
                    onClick={() => setView('donation')}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-[#FFF2A3] via-[#E2B13C] to-[#BD8825] hover:brightness-110 text-[#0A0E2A] rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.25)] flex items-center gap-1"
                  >
                    <Heart className="w-3 h-3 fill-current sm:hidden" />
                    <span>Donation</span>
                  </button>
                </div>
              </div>
            </header>

            {/* EXPANDED FULL-HEIGHT MOBILE-RESPONSIVE WHATSAPP CHAT CONTAINER */}
            <main className="flex-1 w-full h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-4rem)] overflow-hidden flex flex-col">
              <div className="flex-1 h-full w-full overflow-hidden flex flex-col">
                <CareChat 
                  onDonateClick={() => setView('donation')} 
                  onOpenRssFeed={() => setView('rss')}
                  initialFeedToDiscuss={feedToDiscussInChat}
                  onClearInitialFeed={() => setFeedToDiscussInChat(null)}
                />
              </div>
            </main>
          </motion.div>
        ) : (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pb-20"
          >
            {/* RESPONSIVE DASHBOARD HEADER */}
            <header className="border-b border-white/10 bg-[#0A0E2A]/95 backdrop-blur-md sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 md:h-20 flex items-center justify-between gap-2 sm:gap-4">
                
                {/* Brand & Left Controls */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <button 
                    onClick={() => setView('landing')} 
                    className="p-1.5 sm:p-2 hover:bg-white/5 rounded-lg transition-all text-white/40 hover:text-white cursor-pointer shrink-0" 
                    aria-label="Back to Landing"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <SermonIQLogo id="dashboard-nav-logo" size="sm" theme="dark" variant="full" />
                </div>

                {/* Center Duration Pill (Visible on md+) */}
                <div className="hidden lg:flex flex-col items-center px-3 py-1 bg-white/[0.03] border border-white/5 rounded-full">
                  <span className="text-[9px] uppercase tracking-widest text-[#D4AF37] font-semibold">Service Duration</span>
                  <span className="text-lg font-mono font-bold">{formatTime(elapsedTime)}</span>
                </div>

                {/* Right Actions Toolbar */}
                <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                  
                  {/* Small Duration indicator on Mobile */}
                  <div className="flex flex-col items-end lg:hidden pr-1">
                    <span className="text-[8px] uppercase tracking-wider text-[#D4AF37] font-semibold">Duration</span>
                    <span className="text-xs sm:text-sm font-mono font-bold text-white">{formatTime(elapsedTime)}</span>
                  </div>

                  {/* Desktop Quick Nav Links (Visible on xl+ or md+ with compact styling) */}
                  <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
                    <button
                      id="dashboard-nav-archives-btn"
                      onClick={() => setIsHistoryModalOpen(true)}
                      className="px-2.5 lg:px-3.5 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/10 rounded-full transition-all cursor-pointer flex items-center gap-1"
                      title="Cloud Archives"
                    >
                      <Database className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span className="hidden xl:inline">Archives</span>
                      {savedReports.length > 0 && (
                        <span className="px-1.5 py-0.2 bg-[#D4AF37] text-[#0A0E2A] text-[9px] font-black rounded-full">
                          {savedReports.length}
                        </span>
                      )}
                    </button>

                    <button
                      id="dashboard-nav-rss-btn"
                      onClick={() => setView('rss')}
                      className="px-2.5 lg:px-3.5 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-300 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 rounded-full transition-all cursor-pointer flex items-center gap-1"
                      title="Ministry RSS Feeds"
                    >
                      <Rss className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden xl:inline">RSS Feeds</span>
                    </button>

                    <button
                      id="dashboard-nav-gmail-btn"
                      onClick={() => setView('gmail')}
                      className="px-2.5 lg:px-3.5 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/10 rounded-full transition-all cursor-pointer flex items-center gap-1"
                      title="Gmail Ministry Communications"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span className="hidden xl:inline">Gmail Hub</span>
                    </button>

                    <button
                      onClick={() => setView('donation')}
                      className="px-2.5 lg:px-3.5 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/10 rounded-full transition-all cursor-pointer hidden lg:inline-block"
                    >
                      Donation
                    </button>

                    {/* Auth profile snippet for desktop */}
                    {user ? (
                      <div className="flex items-center gap-1.5">
                        <div 
                          id="dashboard-user-avatar"
                          onClick={() => setView('profile')}
                          className="flex items-center gap-1 px-1.5 py-1 bg-white/5 border border-[#D4AF37]/30 rounded-full cursor-pointer hover:border-[#D4AF37] transition-all group"
                          title={user.displayName || user.email || 'Pastor Leader'}
                        >
                          {user.photoURL ? (
                            <img 
                              src={user.photoURL} 
                              alt={user.displayName || 'Pastor'} 
                              className="w-5 h-5 rounded-full border border-[#D4AF37] object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F3E5AB] text-[#0A0E2A] font-bold text-[9px] flex items-center justify-center">
                              {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'P'}
                            </div>
                          )}
                        </div>

                        <button
                          id="dashboard-nav-profile-btn"
                          onClick={() => setView('profile')}
                          className="p-2 text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/10 rounded-full transition-all cursor-pointer"
                          title="Settings"
                        >
                          <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                        </button>
                      </div>
                    ) : (
                      <button
                        id="dashboard-nav-signin-btn"
                        onClick={handleSignIn}
                        disabled={isSigningIn}
                        className="px-3 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#0A0E2A] bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] rounded-full transition-all cursor-pointer flex items-center gap-1 active:scale-95 disabled:opacity-50"
                      >
                        {isSigningIn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5 text-[#0A0E2A]" />}
                        <span className="hidden lg:inline">Sign In</span>
                      </button>
                    )}
                  </div>

                  {/* Primary Service Recording & Report CTAs */}
                  <button 
                    onClick={handleStartStop}
                    className={cn(
                      "flex items-center justify-center gap-1 sm:gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-md active:scale-95",
                      isRecording 
                        ? "bg-red-500 text-white hover:bg-red-600 shadow-red-500/20"
                        : "bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-[#0A0E2A] hover:brightness-110 shadow-[#D4AF37]/20"
                    )}
                  >
                    {isRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{isRecording ? 'Stop' : 'Start'}</span>
                  </button>

                  <button 
                    onClick={handleGenerateReport}
                    disabled={elapsedTime < 30 || isGeneratingReport}
                    className="flex items-center justify-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-white/10 text-white border border-white/15 hover:bg-white/20 transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isGeneratingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                    <span className="hidden xs:inline">Report</span>
                  </button>

                  {/* Mobile Drawer Hamburger Button */}
                  <button
                    onClick={() => setIsDashboardMobileMenuOpen(!isDashboardMobileMenuOpen)}
                    className="p-2 md:hidden bg-white/5 border border-white/10 rounded-lg text-white/80 hover:text-white transition-all cursor-pointer"
                    aria-label="Toggle Dashboard Menu"
                  >
                    {isDashboardMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                  </button>

                </div>
              </div>

              {/* Mobile Dashboard Navigation Dropdown */}
              <AnimatePresence>
                {isDashboardMobileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="md:hidden border-t border-white/10 bg-[#080B22] overflow-hidden"
                  >
                    <div className="px-4 py-5 space-y-2.5 flex flex-col">
                      {user && (
                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-[#D4AF37]/20 mb-2">
                          {user.photoURL ? (
                            <img 
                              src={user.photoURL} 
                              alt={user.displayName || 'Pastor'} 
                              className="w-9 h-9 rounded-full border border-[#D4AF37] object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F3E5AB] text-[#0A0E2A] font-bold text-xs flex items-center justify-center">
                              {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'P'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white truncate">{user.displayName || 'Pastor Leader'}</p>
                            <p className="text-[10px] text-white/50 truncate font-mono">{user.email}</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setIsDashboardMobileMenuOpen(false);
                            setIsHistoryModalOpen(true);
                          }}
                          className="p-3 bg-white/5 border border-[#D4AF37]/20 text-[#D4AF37] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Database className="w-4 h-4" />
                          <span>Archives ({savedReports.length})</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsDashboardMobileMenuOpen(false);
                            setView('rss');
                          }}
                          className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Rss className="w-4 h-4 text-amber-400" />
                          <span>RSS Feeds</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsDashboardMobileMenuOpen(false);
                            setView('gmail');
                          }}
                          className="p-3 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Mail className="w-4 h-4 text-[#D4AF37]" />
                          <span>Gmail Hub</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsDashboardMobileMenuOpen(false);
                            setView('donation');
                          }}
                          className="p-3 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Heart className="w-4 h-4 text-[#D4AF37]" />
                          <span>Donation</span>
                        </button>
                      </div>

                      {user ? (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => {
                              setIsDashboardMobileMenuOpen(false);
                              setView('profile');
                            }}
                            className="p-3 bg-white/5 border border-[#D4AF37]/30 text-[#D4AF37] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <User className="w-4 h-4" />
                            <span>Settings</span>
                          </button>

                          <button
                            onClick={() => {
                              setIsDashboardMobileMenuOpen(false);
                              handleSignOut();
                            }}
                            className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-1">
                          <button
                            onClick={() => {
                              setIsDashboardMobileMenuOpen(false);
                              setIsChurchSignupOpen(true);
                            }}
                            className="w-full py-3 bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-[#0A0E2A] rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
                          >
                            <Church className="w-4 h-4" />
                            <span>Church Sign Up</span>
                          </button>

                          <button
                            onClick={() => {
                              setIsDashboardMobileMenuOpen(false);
                              handleSignIn();
                            }}
                            disabled={isSigningIn}
                            className="w-full py-3 bg-white/5 border border-[#D4AF37]/30 text-[#D4AF37] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <LogIn className="w-4 h-4" />
                            <span>Sign In</span>
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setIsDashboardMobileMenuOpen(false);
                          setIsDemoOpen(true);
                        }}
                        className="w-full py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs font-semibold text-white/50 hover:text-white transition-colors cursor-pointer text-center"
                      >
                        Request Demonstration
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </header>

            <main className="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              
              {/* TOP LEFT: ENGAGEMENT GAUGE */}
              <section className="bg-[#0D1236] rounded-2xl border border-white/5 p-6 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden group min-h-[350px] sm:min-h-[400px]">
                <div className="absolute top-4 left-6 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
                  <h2 className="text-xs uppercase tracking-widest text-white/40 font-bold">Engagement Engine</h2>
                </div>

                <div className="relative w-64 h-64 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="128"
                      cy="128"
                      r="120"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      strokeDasharray={`${(loudness / 100) * 754} 754`}
                      className={cn(
                        "transition-all duration-300 ease-out",
                        loudness <= 33 ? "text-blue-500" : loudness <= 66 ? "text-[#D4AF37]" : "text-orange-500"
                      )}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span key={loudness} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-6xl font-bold font-mono">
                      {loudness}
                    </motion.span>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Live Flow</span>
                  </div>
                </div>

                <div className="mt-8 text-center space-y-1">
                  <div className={cn(
                     "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border",
                     loudness <= 33 ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : 
                     loudness <= 66 ? "bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20" : 
                     "bg-orange-500/10 text-orange-500 border-orange-500/20"
                  )}>
                    {band}
                  </div>
                </div>

                <div className="absolute bottom-6 left-6 right-6 grid grid-cols-3 divide-x divide-white/5 border-t border-white/5 pt-4">
                  <div className="px-4 text-center">
                    <span className="block text-[10px] text-white/30 uppercase font-bold">Peak</span>
                    <span className="text-sm font-mono text-[#D4AF37]">{stats.peak}</span>
                  </div>
                  <div className="px-4 text-center">
                    <span className="block text-[10px] text-white/30 uppercase font-bold">Average</span>
                    <span className="text-sm font-mono text-[#D4AF37]">{stats.average}</span>
                  </div>
                  <div className="px-4 text-center">
                    <span className="block text-[10px] text-white/30 uppercase font-bold">Active</span>
                    <span className="text-sm font-mono text-[#D4AF37] font-bold tracking-tighter">{Math.floor(elapsedTime / 60)}m</span>
                  </div>
                </div>
              </section>

              {/* TOP RIGHT: SCRIPTURE INTELLIGENCE */}
              <section className="bg-[#0D1236] rounded-2xl border border-white/5 p-4 sm:p-6 flex flex-col min-h-[350px] sm:min-h-[400px]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                    <h2 className="text-xs uppercase tracking-widest text-white/40 font-bold">Scripture Intelligence</h2>
                  </div>
                  {isAnalyzing && <div className="flex items-center gap-2 text-[10px] text-[#D4AF37] animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> AI Analyzing</div>}
                </div>

                {/* Manual Search */}
                <form onSubmit={handleManualVerseSearch} className="relative mb-6">
                  <input 
                    type="text" 
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    placeholder="Search verse (e.g. John 3:16)..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-base focus:outline-none focus:border-[#D4AF37]/50 transition-all font-sans"
                  />
                  <button 
                    type="submit"
                    disabled={isSearchingVerse}
                    className="absolute right-2 top-2 p-1.5 bg-[#D4AF37] text-[#0A0E2A] rounded-lg hover:bg-[#D4AF37]/80 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSearchingVerse ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                </form>

                {/* Quick Refs */}
                <div className="flex flex-wrap gap-2 mb-6">
                   {["John 3:16", "Psalm 23:1", "Romans 8:28", "Phil 4:13"].map(ref => (
                     <button 
                      key={ref}
                      onClick={() => handleQuickVerse(ref)}
                      className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[9px] font-bold uppercase tracking-widest text-white/40 hover:bg-white/10 hover:text-[#D4AF37] transition-all"
                     >
                       {ref}
                     </button>
                   ))}
                </div>

                <div className="flex-1 space-y-6 overflow-hidden">
                  <AnimatePresence mode="popLayout">
                    {currentVerse ? (
                      <motion.div 
                        key={currentVerse.reference + currentVerse.timestamp} 
                        initial={{ y: 20, opacity: 0 }} 
                        animate={{ y: 0, opacity: 1 }} 
                        exit={{ y: -20, opacity: 0 }} 
                        className="bg-[#D4AF37]/10 border-l-4 border-[#D4AF37] rounded-r-xl p-5 relative group"
                      >
                         <div className="flex items-center justify-between mb-2">
                           <span className="text-[#D4AF37] font-bold text-base">{currentVerse.reference}</span>
                           <span className="px-2 py-0.5 bg-[#0A0E2A]/50 text-[#D4AF37] text-[8px] font-black uppercase rounded border border-[#D4AF37]/20">
                             {currentVerse.source || '🔍 Manual'} · {currentVerse.translation || 'KJV'}
                           </span>
                         </div>
                         <p className="text-white italic leading-relaxed mb-3 text-sm font-serif">"{currentVerse.text}"</p>
                         <p className="text-white/40 text-[10px] font-medium border-t border-white/5 pt-3 leading-tight">{currentVerse.context}</p>
                      </motion.div>
                    ) : (
                      <div className="h-32 flex items-center justify-center border border-dashed border-white/5 rounded-xl bg-white/1">
                         <p className="text-white/10 text-xs italic">Awaiting citations...</p>
                      </div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-3 pt-4">
                    <div className="flex items-center gap-2 px-2">
                      <History className="w-3 h-3 text-white/30" />
                      <h4 className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Session Verse Log</h4>
                    </div>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                      {bibleVerses.length === 0 && <p className="text-white/10 text-[10px] text-center py-4">No verses cited yet.</p>}
                      {bibleVerses.map((v, i) => (
                        <button 
                          key={v.reference + v.timestamp} 
                          onClick={() => setCurrentVerse(v)}
                          className="w-full flex items-center justify-between text-xs p-3 rounded bg-white/2 border border-white/5 hover:bg-white/5 hover:border-[#D4AF37]/30 transition-all text-left"
                        >
                          <div className="flex flex-col">
                            <span className="text-[#D4AF37] font-bold">{v.reference}</span>
                            <span className="text-[8px] text-white/20 uppercase font-black tracking-tighter">{v.source}</span>
                          </div>
                          <span className="text-white/20 font-mono text-[9px]">{format(v.timestamp, 'HH:mm:ss')}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* MIDDLE LEFT: TRANSCRIPT */}
              <section className="bg-[#0D1236] rounded-2xl border border-white/5 p-4 sm:p-6 flex flex-col h-[400px] sm:h-[500px]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-[#D4AF37]" />
                    <h2 className="text-xs uppercase tracking-widest text-white/40 font-bold">Transcription Feed</h2>
                  </div>
                  <div className="bg-white/5 px-3 py-1 rounded-full flex items-center gap-2">
                     <div className={cn("w-1.5 h-1.5 rounded-full", isRecording ? "bg-red-500 animate-pulse" : "bg-white/20")} />
                     <span className="text-[10px] font-bold uppercase text-white/50">{isRecording ? 'Listening' : 'Standby'}</span>
                  </div>
                </div>
                <div className="flex-1 bg-[#0A0E2A]/50 rounded-xl p-4 overflow-y-auto mb-4 flex flex-col-reverse custom-scrollbar border border-white/5">
                  <div className="space-y-4">
                    {fullTranscript.slice().reverse().map((line, i) => {
                      const matches = line.text.match(VERSE_REGEX);
                      const parts = matches ? line.text.split(new RegExp(`(${VERSE_REGEX.source})`, 'gi')) : [line.text];
                      
                      return (
                        <div key={i} className="flex gap-3 group px-3 py-1 hover:bg-white/2 rounded-lg transition-all border-l-2 border-transparent hover:border-[#D4AF37]">
                          <span className="text-[9px] font-mono text-white/10 group-hover:text-white/30 pt-1 shrink-0">
                            {format(line.timestamp, 'HH:mm:ss')}
                          </span>
                          <p className="text-sm text-white/70 leading-relaxed">
                            {parts.map((part, pi) => (
                              VERSE_REGEX.test(part) ? (
                                <button 
                                  key={pi} 
                                  onClick={() => handleQuickVerse(part)}
                                  className="text-[#D4AF37] font-bold bg-[#D4AF37]/10 px-1 rounded hover:bg-[#D4AF37] hover:text-[#0A0E2A] transition-all"
                                >
                                  {part}
                                </button>
                              ) : part
                            ))}
                          </p>
                        </div>
                      );
                    })}
                    {interimTranscript && (
                      <div className="flex gap-3 px-3 py-1 opacity-50 italic">
                         <span className="text-[9px] font-mono text-white/10 pt-1 shrink-0">--:--:--</span>
                         <p className="text-sm text-[#D4AF37]/80">{interimTranscript}...</p>
                      </div>
                    )}
                    {fullTranscript.length === 0 && !interimTranscript && (
                      <div className="flex flex-col items-center justify-center py-20 text-white/40 space-y-3 px-4 text-center">
                        <Mic className={cn("w-10 h-10 stroke-[1.5px]", permissionDenied ? "text-amber-400/80" : "text-white/20")} />
                        {permissionDenied ? (
                          <div className="space-y-1 max-w-xs">
                            <p className="text-xs font-semibold text-amber-300">Microphone Permission Notice</p>
                            <p className="text-[11px] text-white/50 leading-relaxed">
                              Live audio transcription requires browser mic access. Enable permissions in your browser URL bar or open in a new window.
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs italic text-white/40">Speech-to-text live display (Awaiting audio)</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {analysis.keywords.map((word, i) => (
                    <span key={i} className="px-2 py-1 bg-white/5 text-white/60 text-[9px] font-bold uppercase tracking-widest border border-white/10 rounded">#{word}</span>
                  ))}
                </div>
              </section>

              {/* MIDDLE RIGHT: DASHBOARD & ANALYTICS */}
              <section className="bg-[#0D1236] rounded-2xl border border-white/5 p-4 sm:p-6 flex flex-col h-auto sm:h-[500px]">
                <div className="flex justify-between mb-4">
                   <h2 className="text-xs uppercase tracking-widest text-white/40 font-bold">Analytics & Flow</h2>
                   <div className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-tighter">Rolling 10s Window</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                   <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <span className="block text-[9px] text-white/30 uppercase font-bold mb-1">Service Moment</span>
                      <p className="text-sm font-black text-[#D4AF37] uppercase tracking-wider">{analysis.momentType}</p>
                   </div>
                   <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <span className="block text-[9px] text-white/30 uppercase font-bold mb-1">Spiritual Tone</span>
                      <p className="text-sm font-black text-[#D4AF37] uppercase tracking-wider">{analysis.emotionalTone}</p>
                   </div>
                </div>

                <div className="flex-1 w-full space-y-6 overflow-hidden">
                   <div className="h-40 w-full bg-white/2 rounded-xl p-2 border border-white/5">
                      <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={engagementTimeline}>
                           <defs>
                             <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4}/>
                               <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                             </linearGradient>
                           </defs>
                           <Area type="monotone" dataKey="score" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#colorMain)" animationDuration={300} />
                         </AreaChart>
                      </ResponsiveContainer>
                   </div>

                   <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <h4 className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Keyword Intensity</h4>
                         <span className="text-[9px] text-white/20 uppercase">Top 5 frequency</span>
                      </div>
                      <div className="h-32 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={keywordData} layout="vertical">
                               <XAxis type="number" hide />
                               <YAxis dataKey="name" type="category" width={80} stroke="#ffffff30" fontSize={10} axisLine={false} tickLine={false} />
                               <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                  {keywordData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#D4AF37' : '#D4AF3740'} />
                                  ))}
                               </Bar>
                            </BarChart>
                         </ResponsiveContainer>
                      </div>
                   </div>
                </div>
              </section>

              {/* FINAL ROW: HISTORICAL ANALYTICS */}
              <section className="lg:col-span-2 bg-[#0D1236] rounded-2xl border border-white/5 p-4 sm:p-8">
                 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                    <div>
                       <h2 className="text-lg font-bold text-white">Historical Engagement</h2>
                       <p className="text-xs text-white/40">Average dashboard scores from the last 8 weekly sessions</p>
                    </div>
                    <div className="flex gap-4">
                       <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#D4AF37] rounded" /><span className="text-[10px] uppercase font-bold text-white/50">Engagement</span></div>
                       <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white/10 rounded" /><span className="text-[10px] uppercase font-bold text-white/50">Benchmark</span></div>
                    </div>
                 </div>
                 <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={historicalSessions} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="name" stroke="#ffffff20" fontSize={12} axisLine={false} tickLine={false} />
                          <YAxis stroke="#ffffff20" fontSize={12} axisLine={false} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0D1236', border: '1px solid #ffffff10', borderRadius: '8px' }}
                            itemStyle={{ color: '#D4AF37' }}
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          />
                          <Bar dataKey="score" radius={[8, 8, 0, 0]} barSize={40}>
                             {historicalSessions.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.name === 'Today' ? '#D4AF37' : '#ffffff10'} />
                             ))}
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </section>

            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REPORT MODAL */}
      <AnimatePresence>
        {report && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.96, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#0A0E2A] border border-white/10 rounded-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Header block with Premium actions */}
              <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0D1236]">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-2.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">Pastoral Engagement Intelligence</h2>
                    <p className="text-[11px] text-white/50 font-medium">Post-service engagement scoring and pastoral debrief</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="bg-black/40 p-1 rounded-xl border border-white/10 flex items-center gap-1 text-xs">
                    <button
                      onClick={() => setShowPromptTemplateView(false)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        !showPromptTemplateView 
                          ? 'bg-[#D4AF37] text-[#0A0E2A] shadow-sm' 
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Pastor Report
                    </button>
                    <button
                      onClick={() => setShowPromptTemplateView(true)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                        showPromptTemplateView 
                          ? 'bg-[#D4AF37] text-[#0A0E2A] shadow-sm' 
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      AI Scoring Prompt
                    </button>
                  </div>

                  <button 
                    id="report-save-cloud-btn"
                    onClick={handleSaveReportToFirestore}
                    disabled={isSavingToFirestore}
                    className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0 disabled:opacity-50"
                  >
                    {isSavingToFirestore ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Cloud className="w-3.5 h-3.5" />
                        Save Cloud
                      </>
                    )}
                  </button>

                  <button 
                    onClick={showPromptTemplateView ? handleCopyPromptTemplate : handleCopyReportText}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0"
                  >
                    {(showPromptTemplateView ? copiedPrompt : copied) ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                        {showPromptTemplateView ? 'Copy Prompt' : 'Copy Report'}
                      </>
                    )}
                  </button>

                  <button 
                    id="report-email-gmail-btn"
                    onClick={handleEmailReportViaGmail}
                    className="px-3 py-1.5 bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#D4AF37] hover:bg-[#D4AF37]/25 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0 shadow-[0_0_10px_rgba(212,175,55,0.15)]"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email Gmail
                  </button>

                  <button 
                    onClick={handlePrintReport}
                    className="px-3 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-[#D4AF37] hover:bg-[#D4AF37]/20 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print PDF
                  </button>

                  <button 
                    onClick={() => setReport(null)}
                    className="p-1.5 sm:p-2 hover:bg-white/5 text-white/40 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* View 1: AI Prompt Template & Pipeline Inspector */}
              {showPromptTemplateView ? (
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#070b22] text-slate-200 font-sans space-y-6">
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="bg-[#0e1438] border border-[#D4AF37]/30 rounded-2xl p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Sparkles className="w-24 h-24 text-[#D4AF37]" />
                      </div>
                      <div className="flex items-center gap-2.5 text-[#D4AF37] text-xs font-mono font-bold uppercase tracking-widest mb-2">
                        <Sparkles className="w-4 h-4" />
                        Gemini 3.7 / Vertex AI Post-Service Pipeline
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">SermonIQ Engagement Report — AI Scoring Prompt</h3>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                        This model-agnostic prompt template consumes post-service tier metrics and delivers a warm, respectful, pastor-facing debrief within 30 minutes of service close without technical jargon or spiritual overreach.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={handleCopyPromptTemplate}
                          className="px-4 py-2 bg-[#D4AF37] text-[#0A0E2A] font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                        >
                          {copiedPrompt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copiedPrompt ? 'Prompt & Payloads Copied!' : 'Copy Full Vertex AI Prompt Package'}
                        </button>
                      </div>
                    </div>

                    {/* System Prompt View */}
                    <div className="bg-[#0b102f] border border-white/10 rounded-2xl p-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#D4AF37]">01 / System Prompt Specification</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">Model Agnostic</span>
                      </div>
                      <div className="p-4 bg-black/60 rounded-xl border border-white/5 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
{`You are generating a post-service engagement report for a pastor, based on
congregational response data captured during their sermon. The audience for
this report is the pastor themselves, reviewing their own service — write
with the warmth and respect that deserves, not the tone of an analytics
dashboard.

WHAT THIS DATA IS AND ISN'T
You are analyzing observable congregational response: verbal affirmations,
applause, laughter, weeping, response timing, and patterns around specific
verses. This is real signal about how a congregation outwardly responded to
a service.

This data does NOT measure spiritual depth, the presence or move of the
Holy Spirit, or the sincerity of anyone's worship. A quiet, reverent
congregation can be deeply moved without making sound. A loud response can
be habit as much as conviction. Never state or imply that a high score
means the Spirit was "more present," that a quiet service was spiritually
lesser, or that this system can detect anything beyond outward, audible
response. If you notice a moment where multiple signals converged (flagged
in the input as a "breakthrough moment"), describe it as what it is — a
concentration of congregational response worth revisiting — not as a
theological claim about what happened.

If the input data is sparse, contradictory, or shows a mostly-quiet
service, say so plainly rather than manufacturing enthusiasm the data
doesn't support. A pastor will trust this tool more, not less, for being
honest about a quiet week.

SCORING METHODOLOGY
Compute a single 0–100 overall engagement score as a weighted composite:
- Response frequency & intensity (35%)
- Response breadth & duration (25%)
- Verse impact (25%)
- Momentum (15%)

Keep the whole report under 300 words.`}
                      </div>
                    </div>

                    {/* Populated Metrics JSON */}
                    <div className="bg-[#0b102f] border border-white/10 rounded-2xl p-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#D4AF37]">02 / Injected Telemetry Payload {'{{METRICS_JSON}}'}</span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Live Computed</span>
                      </div>
                      <div className="p-4 bg-black/60 rounded-xl border border-white/5 font-mono text-xs text-emerald-300 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                        {JSON.stringify(report.metricsData || { stats, verses: bibleVerses, duration: elapsedTime }, null, 2)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* View 2: Pastor Engagement Dossier */
                <div className="flex-1 flex overflow-hidden">
                  {/* LEFT INDEX MENU: Interactive Jump Links */}
                  <div className="hidden md:flex w-64 bg-[#080c25] border-r border-white/5 flex-col p-6 overflow-y-auto shrink-0 justify-between">
                    <div className="space-y-6">
                      <div>
                        <span className="text-[9px] uppercase tracking-widest text-[#D4AF37]/60 font-mono font-bold block mb-1">Sanctuary Registry</span>
                        <h4 className="text-xs font-bold text-white/95 truncate">{(user as any)?.churchName || user?.displayName || 'Sanctuary Church'}</h4>
                        <p className="text-[10px] font-mono text-white/40 mt-0.5">Session IQ-{Math.abs((elapsedTime || 3600) * 77).toString(16).toUpperCase()}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] uppercase tracking-widest text-white/40 font-mono font-bold block mb-2">Report Sections</span>
                        {[
                          { id: 'section-score', numeral: '01', title: 'Overall Score (0-100)' },
                          { id: 'section-highlights', numeral: '02', title: "This Week's Highlights" },
                          { id: 'section-verse-impact', numeral: '03', title: 'Verse Impact & Biblical Resonance' },
                          { id: 'section-revisiting', numeral: '04', title: 'Moment Worth Revisiting' },
                          { id: 'section-trend', numeral: '05', title: 'Trailing 4-Week Trend' },
                          { id: 'section-observation', numeral: '06', title: 'Pastoral Takeaway' },
                        ].map((sec) => (
                          <button
                            key={sec.id}
                            onClick={() => {
                              const elem = document.getElementById(sec.id);
                              if (elem) {
                                elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2.5 cursor-pointer active:scale-95"
                          >
                            <span className="font-mono text-[9px] text-[#D4AF37] opacity-70">{sec.numeral}</span>
                            <span className="truncate">{sec.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 space-y-4">
                      <div>
                        <span className="text-[9px] text-white/40 uppercase font-bold tracking-widest font-mono">Theological Boundary</span>
                        <p className="text-[10px] text-white/50 leading-relaxed mt-1">Measures audible response signal without claiming spiritual discernment or depth.</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-[8px] font-black text-emerald-400 uppercase font-mono tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-md w-fit">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Pastoral Debrief Ready
                      </div>
                    </div>
                  </div>

                  {/* RIGHT DOC VIEW: Dynamic Paper Report */}
                  <div id="report-content" className="flex-1 overflow-y-auto p-6 sm:p-12 bg-white text-[#0A0E2A] selection:bg-[#D4AF37]/30">
                    <div className="max-w-2xl mx-auto space-y-10">
                      {/* Letterhead */}
                      <div className="text-center border-b border-[#0A0E2A]/10 pb-8 relative flex flex-col items-center">
                        <div className="mb-4">
                          <SermonIQLogo id="report-letterhead-logo" size="md" theme="light" variant="full" />
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-serif font-black uppercase tracking-tighter mb-2 text-[#0A0E2A]">Engagement Intelligence Report</h1>
                        <p className="text-xs font-mono text-gray-500">{format(new Date(), 'EEEE, MMMM dd, yyyy')} • {(user as any)?.churchName || user?.displayName || 'Sanctuary Church'}</p>
                        
                        <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1 text-[10px] text-gray-500 font-mono font-bold uppercase">
                          <span>Duration: {formatTime(elapsedTime || 3600)}</span>
                          <span>Scriptures: {bibleVerses.length}</span>
                          <span>Unison Ratio: {((report.metricsData?.unison_response_rate || 0.72) * 100).toFixed(0)}%</span>
                          <span>Momentum: {report.metricsData?.momentum || 'Building'}</span>
                        </div>
                      </div>

                      {/* 01 / Overall Engagement Score Hero */}
                      <section id="section-score" className="space-y-4 scroll-mt-6">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold font-mono text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-0.5 rounded-full">01</span>
                          <h3 className="text-xs uppercase tracking-[0.25em] font-black text-gray-400">Overall Engagement Score</h3>
                        </div>

                        <div className="bg-gradient-to-br from-slate-900 to-[#0A0E2A] text-white p-6 sm:p-8 rounded-2xl shadow-md space-y-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                            <div className="flex items-baseline gap-3">
                              <span className="text-5xl sm:text-6xl font-serif font-black text-[#D4AF37]">
                                {report.overallScore || stats.average || 78}
                              </span>
                              <span className="text-lg font-mono text-white/50">/100</span>
                            </div>
                            <div className="text-left sm:text-right">
                              <span className="inline-block px-3 py-1 bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-mono font-bold uppercase rounded-full">
                                {report.overallScore && report.overallScore >= 80 ? 'Vibrant Response' : report.overallScore && report.overallScore >= 65 ? 'Steady Engagement' : 'Reverent Flow'}
                              </span>
                            </div>
                          </div>

                          <p className="text-sm sm:text-base font-serif text-slate-200 leading-relaxed italic">
                            "{report.scoreExplanation || 'Weighs response frequency and intensity (35%), response breadth and duration (25%), scripture resonance (25%), and congregational momentum (15%).'}"
                          </p>

                          {/* 4 Weight Pillars */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                              <span className="block text-[10px] font-mono text-[#D4AF37] font-bold">35% Weight</span>
                              <span className="block text-xs font-bold text-white mt-0.5">Frequency</span>
                              <span className="block text-[9px] text-white/40 mt-1">Affirmations & praise</span>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                              <span className="block text-[10px] font-mono text-[#D4AF37] font-bold">25% Weight</span>
                              <span className="block text-xs font-bold text-white mt-0.5">Breadth</span>
                              <span className="block text-[9px] text-white/40 mt-1">Unison & duration</span>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                              <span className="block text-[10px] font-mono text-[#D4AF37] font-bold">25% Weight</span>
                              <span className="block text-xs font-bold text-white mt-0.5">Verse Impact</span>
                              <span className="block text-[9px] text-white/40 mt-1">Scripture mapping</span>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                              <span className="block text-[10px] font-mono text-[#D4AF37] font-bold">15% Weight</span>
                              <span className="block text-xs font-bold text-white mt-0.5">Momentum</span>
                              <span className="block text-[9px] text-white/40 mt-1">Climax progression</span>
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* 02 / This Week's Highlights */}
                      <section id="section-highlights" className="space-y-4 scroll-mt-6">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold font-mono text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-0.5 rounded-full">02</span>
                          <h3 className="text-xs uppercase tracking-[0.25em] font-black text-gray-400">This Week's Highlights</h3>
                        </div>
                        <div className="prose prose-sm max-w-none text-gray-800 font-serif leading-relaxed text-base sm:text-lg border-l-4 border-[#D4AF37] pl-5 py-2 bg-slate-50 rounded-r-xl">
                          <ReactMarkdown>{report.highlights || report.summary}</ReactMarkdown>
                        </div>
                      </section>

                      {/* 03 / Verse Impact */}
                      <section id="section-verse-impact" className="space-y-4 scroll-mt-6">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold font-mono text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-0.5 rounded-full">03</span>
                          <h3 className="text-xs uppercase tracking-[0.25em] font-black text-gray-400">Verse Impact & Biblical Resonance</h3>
                        </div>
                        {bibleVerses.length > 0 && (
                          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                            {bibleVerses.map((v, i) => (
                              <div key={i} className="p-4 bg-gray-50 border border-gray-100 rounded-xl transition-all hover:bg-slate-50">
                                <div className="flex items-center gap-2 text-[#D4AF37] mb-1">
                                  <BookOpen className="w-3.5 h-3.5" />
                                  <span className="font-bold text-xs truncate">{v.reference}</span>
                                </div>
                                <p className="text-xs text-gray-600 italic leading-relaxed line-clamp-3">"{v.text}"</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="prose prose-sm max-w-none text-gray-700 font-serif leading-relaxed text-sm sm:text-base">
                          <ReactMarkdown>{report.verseImpact || report.scripture}</ReactMarkdown>
                        </div>
                      </section>

                      {/* 04 / A Moment Worth Revisiting (when present) */}
                      {report.momentWorthRevisiting && (
                        <section id="section-revisiting" className="space-y-4 scroll-mt-6">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold font-mono text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">04</span>
                            <h3 className="text-xs uppercase tracking-[0.25em] font-black text-amber-800">A Moment Worth Revisiting</h3>
                          </div>
                          <div className="bg-amber-50/70 border border-amber-200/80 p-6 rounded-2xl space-y-3">
                            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider font-mono">
                              <Sparkles className="w-4 h-4 text-amber-600" />
                              Concentration of Congregational Response
                            </div>
                            <p className="text-sm sm:text-base font-serif text-amber-950 leading-relaxed">
                              {report.momentWorthRevisiting}
                            </p>
                            <p className="text-[11px] text-amber-800/80 font-sans italic border-t border-amber-200/50 pt-3">
                              Note: Evaluated with pastoral epistemic care as a high-signal concentration of audible congregational response.
                            </p>
                          </div>
                        </section>
                      )}

                      {/* 05 / Trend Note */}
                      {report.trendNote && (
                        <section id="section-trend" className="space-y-4 scroll-mt-6">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold font-mono text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-0.5 rounded-full">05</span>
                            <h3 className="text-xs uppercase tracking-[0.25em] font-black text-gray-400">Trailing 4-Week Trend</h3>
                          </div>
                          <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-800 font-serif text-sm sm:text-base leading-relaxed">
                            {report.trendNote}
                          </div>
                        </section>
                      )}

                      {/* 06 / One Honest Observation */}
                      <section id="section-observation" className="space-y-4 pb-16 scroll-mt-6">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold font-mono text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">06</span>
                          <h3 className="text-xs uppercase tracking-[0.25em] font-black text-indigo-900">One Honest Observation</h3>
                        </div>
                        <div className="bg-indigo-50/50 border border-indigo-100 p-6 rounded-2xl prose prose-sm max-w-none text-indigo-950 font-serif text-sm sm:text-base leading-relaxed">
                          <ReactMarkdown>{report.honestObservation || report.recommendations}</ReactMarkdown>
                        </div>
                      </section>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CLOUD ARCHIVES MODAL */}
      <AnimatePresence>
        {isHistoryModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0A0E2A] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#0D1236]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-white">Firebase Cloud Archives</h2>
                    <p className="text-[11px] text-white/40 font-medium">Real-time synchronized service dossiers in Firestore</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="p-2 hover:bg-white/5 text-white/40 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search & Filter Bar */}
              <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-3">
                <Search className="w-4 h-4 text-white/40" />
                <input 
                  type="text"
                  placeholder="Filter archived dossiers by title, keywords or scripture..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="bg-transparent border-none text-base text-white placeholder-white/30 focus:outline-none w-full"
                />
              </div>

              {/* Archives Content List */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                {savedReports.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto text-white/40">
                      <Cloud className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-white/80">No Archived Dossiers Yet</p>
                    <p className="text-xs text-white/40 max-w-sm mx-auto">
                      Generate a Service Intelligence Report and click "Save to Cloud" to persist it securely to your Firestore database.
                    </p>
                  </div>
                ) : (
                  savedReports
                    .filter(r => 
                      !historySearchQuery ||
                      (r.serviceTitle || '').toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                      r.summary.toLowerCase().includes(historySearchQuery.toLowerCase())
                    )
                    .map((r) => (
                      <div
                        key={r.id}
                        onClick={() => handleOpenSavedReport(r)}
                        className="p-5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-[#D4AF37]/40 rounded-xl transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#D4AF37] tracking-tight">
                              {r.serviceTitle || 'Sanctuary Service'}
                            </span>
                            <span className="text-[10px] font-mono text-white/40">
                              {format(new Date(r.createdAt), 'MMM dd, yyyy · h:mm a')}
                            </span>
                          </div>
                          <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">
                            {r.summary}
                          </p>
                          <div className="flex items-center gap-3 pt-1 text-[10px] text-white/40 font-mono">
                            {r.averageEngagement !== undefined && (
                              <span>Avg Engagement: <strong className="text-white/80">{r.averageEngagement}%</strong></span>
                            )}
                            {r.peakEngagement !== undefined && (
                              <span>Peak: <strong className="text-white/80">{r.peakEngagement}%</strong></span>
                            )}
                            {r.durationSeconds !== undefined && (
                              <span>Duration: <strong className="text-white/80">{formatTime(r.durationSeconds)}</strong></span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSavedReport(r);
                            }}
                            className="px-3 py-1.5 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/30 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            Open Dossier
                          </button>
                          <button
                            onClick={(e) => handleDeleteSavedReport(r.id, e)}
                            className="p-1.5 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                            title="Delete from Firestore"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING PASTORAL CARE CHAT LAUNCHER & EXPANDABLE DRAWER */}
      {view !== 'chat' && (
        <div className="fixed bottom-6 right-6 z-[110]">
          <AnimatePresence>
            {isFloatingChatOpen ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-[92vw] sm:w-[460px] h-[600px] max-h-[82vh] bg-[#0A0E2A] border border-[#D4AF37]/30 rounded-3xl shadow-[0_15px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
              >
                {/* Floating Chat Modal Top Bar */}
                <div className="bg-[#0E163B] border-b border-white/10 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FFF2A3] to-[#BD8825] flex items-center justify-center text-sm shadow-md">
                      🕊️
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                        Pastoral Care Chat
                      </h3>
                      <span className="text-[10px] text-[#D4AF37] font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Anonymous & Encrypted
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setIsFloatingChatOpen(false);
                        setView('chat');
                      }}
                      title="Expand to Full View"
                      className="p-1.5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsFloatingChatOpen(false)}
                      title="Minimize Chat"
                      className="p-1.5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Floating Chat Body */}
                <div className="flex-1 overflow-hidden">
                  <CareChat 
                    onDonateClick={() => {
                      setIsFloatingChatOpen(false);
                      setView('donation');
                    }}
                    onOpenRssFeed={() => {
                      setIsFloatingChatOpen(false);
                      setView('rss');
                    }}
                    initialFeedToDiscuss={feedToDiscussInChat}
                    onClearInitialFeed={() => setFeedToDiscussInChat(null)}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setIsFloatingChatOpen(true)}
                className="group relative flex items-center gap-3 bg-gradient-to-r from-[#0E163B] via-[#0A0E2A] to-[#121A47] border-2 border-[#D4AF37]/50 hover:border-[#D4AF37] text-white pl-2.5 pr-5 py-2.5 rounded-full shadow-[0_8px_30px_rgba(212,175,55,0.35)] cursor-pointer transition-all"
                aria-label="Open Pastoral Care Chat"
              >
                {/* Larger Glowing Golden Icon */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FFF2A3] via-[#E2B13C] to-[#BD8825] p-0.5 shadow-[0_0_20px_rgba(212,175,55,0.6)] flex items-center justify-center">
                    <div className="w-full h-full bg-[#0A0E2A] rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      🕊️
                    </div>
                  </div>
                  {/* Subtle Pulse Ring */}
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-[#0A0E2A]"></span>
                  </span>
                </div>

                <div className="text-left">
                  <div className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                    <span>Pastoral Care</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <span className="text-[10px] text-[#D4AF37] font-bold block">
                    Anonymous AI Counsel
                  </span>
                </div>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* SAVED SUCCESS TOAST NOTIFICATION */}
      <AnimatePresence>
        {savedSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[120] bg-[#0A0E2A] border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-medium"
          >
            <BookmarkCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{savedSuccessMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS CUSTOM CLASSES for scrollbars */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 175, 55, 0.4);
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #report-content, #report-content * {
            visibility: visible;
          }
          #report-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      {/* DEMO REQUEST FORM MODAL */}
      <DemoRequestModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />

      {/* CHURCH SIGNUP LEADS MODAL */}
      <ChurchSignupModal 
        isOpen={isChurchSignupOpen} 
        onClose={() => setIsChurchSignupOpen(false)}
        onEnterDashboard={() => {
          setView('dashboard');
          setIsChurchSignupOpen(false);
        }}
        onOpenProfile={() => {
          setView('profile');
          setIsChurchSignupOpen(false);
        }}
      />
    </div>
  );
}

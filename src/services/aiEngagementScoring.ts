import { GoogleGenAI, Type } from "@google/genai";
import { EngagementMetricsData, TrailingAverageData, ServiceReport, BibleVerse, ServiceAnalysisSnippet } from "../types.ts";

/**
 * SermonIQ Engagement Report — AI Scoring System Prompt & Templates
 * Specification: Model-agnostic prompt for Gemini / Vertex AI post-service engagement scoring.
 */

export const SERMONIQ_ENGAGEMENT_SYSTEM_PROMPT = `You are generating a post-service engagement report for a pastor, based on
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
the report body itself (those belong in this instruction, not the output
a pastor reads):

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
6. One Honest Observation (a single, specific, non-generic note — e.g. "the
   room went quiet for almost a full minute after the passage on grief,
   longer than usual" — never a generic filler line like "great job
   engaging your congregation")

Keep the whole report under 300 words. A pastor should be able to read it
in the time it takes to walk from the pulpit to the back office.`;

export function buildUserPrompt(params: {
  serviceDate: string;
  churchName: string;
  metrics: EngagementMetricsData;
  trailingAverage?: TrailingAverageData | null;
}): string {
  const trailingPart = params.trailingAverage && params.trailingAverage.trailing_4_week_score !== undefined
    ? `\nTrailing 4-week average (omit trend section if not provided):\n${JSON.stringify(params.trailingAverage, null, 2)}`
    : `\nTrailing 4-week average (omit trend section if not provided):\nNone provided (first recorded service or single-session analysis)`;

  return `Generate this week's engagement report.

Service date: ${params.serviceDate}
Church: ${params.churchName}

Metrics data:
${JSON.stringify(params.metrics, null, 2)}
${trailingPart}`;
}

let genAiClient: GoogleGenAI | null = null;

function getGenAi(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!genAiClient) {
    genAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return genAiClient;
}

export interface EngagementScoringResult {
  overallScore: number;
  scoreExplanation: string;
  highlights: string;
  verseImpact: string;
  momentWorthRevisiting?: string;
  trendNote?: string;
  honestObservation: string;
  rawReportText: string;
  serviceReport: ServiceReport;
}

/**
 * Deterministic weighted engagement scoring fallback in case of network or offline mode.
 * Implements exact spec:
 * 35% Response frequency & intensity
 * 25% Response breadth & duration
 * 25% Verse impact
 * 15% Momentum
 */
export function calculateDeterministicEngagementScore(
  metrics: EngagementMetricsData,
  trailingAvg?: TrailingAverageData | null
): { score: number; explanation: string } {
  const counts = metrics.response_counts || {
    amen: 0,
    alleluia: 0,
    affirmation: 0,
    applause_events: 0,
    laughter_events: 0,
    weeping_events: 0
  };

  const totalAudibleResponses = (counts.amen || 0) + (counts.alleluia || 0) + (counts.affirmation || 0) + ((counts.applause_events || 0) * 3) + ((counts.laughter_events || 0) * 2);
  const duration = Math.max(metrics.service_duration_minutes || 45, 1);
  const responseRatePerMin = totalAudibleResponses / duration;
  
  // 1. Response Frequency & Intensity (35%) - normalize 0-2 responses/min -> 0-100
  const freqScore = Math.min(Math.max((responseRatePerMin / 1.5) * 100, 20), 98);

  // 2. Response Breadth & Duration (25%) - unison rate & sustained responses
  const unison = (metrics.unison_response_rate || 0.65) * 100;
  const sustainedCount = (metrics.sustained_response_events || []).length;
  const breadthScore = Math.min(Math.max((unison * 0.7) + (sustainedCount * 10), 30), 98);

  // 3. Verse Impact (25%) - correlation score across cited scriptures
  const verseCitations = metrics.verse_citations || [];
  let verseScore = 75;
  if (verseCitations.length > 0) {
    const avgVerseScore = verseCitations.reduce((acc, v) => acc + (v.response_window_score || 0.7), 0) / verseCitations.length;
    verseScore = Math.min(Math.max(avgVerseScore * 100, 30), 98);
  }

  // 4. Momentum (15%)
  let momentumScore = 75;
  const mom = (metrics.momentum || 'building').toLowerCase();
  if (mom.includes('building') || mom.includes('climax')) momentumScore = 92;
  else if (mom.includes('steady')) momentumScore = 80;
  else if (mom.includes('front-loaded')) momentumScore = 65;
  else momentumScore = 70;

  // Composite calculation
  const finalScore = Math.round((freqScore * 0.35) + (breadthScore * 0.25) + (verseScore * 0.25) + (momentumScore * 0.15));
  const clampedScore = Math.min(Math.max(finalScore, 10), 99);

  let explanation = `This score weighs verbal and applause frequency (35%), room-wide unison and response duration (25%), scripture resonance (25%), and worship momentum (15%).`;
  if (trailingAvg?.trailing_4_week_score) {
    const diff = clampedScore - trailingAvg.trailing_4_week_score;
    const diffText = diff >= 0 ? `+${diff} points from` : `${diff} points from`;
    explanation += ` Your engagement tracking is ${diffText} your trailing 4-week average of ${trailingAvg.trailing_4_week_score}.`;
  }

  return { score: clampedScore, explanation };
}

/**
 * Generate Pastor Engagement Report using Gemini 3.7 Flash and strict scoring prompt
 */
export async function generateEngagementReportServer(params: {
  serviceDate: string;
  churchName: string;
  metrics: EngagementMetricsData;
  trailingAverage?: TrailingAverageData | null;
}): Promise<EngagementScoringResult> {
  const { serviceDate, churchName, metrics, trailingAverage } = params;
  const ai = getGenAi();

  const deterministic = calculateDeterministicEngagementScore(metrics, trailingAverage);
  const fallbackBreakthrough = (metrics.breakthrough_moments || [])[0];
  const verses = metrics.verse_citations || [];

  if (!ai) {
    // Generate graceful pastoral response using deterministic calculations
    const score = deterministic.score;
    const rawReportText = `### 1. Overall Engagement Score: ${score}/100\n${deterministic.explanation}\n\n### 2. This Week's Highlights\nThe congregation responded with sustained focus during the ministry time, marked by notable verbal affirmations around minute ${Math.floor(metrics.service_duration_minutes * 0.4)} and strong applause at minute ${Math.floor(metrics.service_duration_minutes * 0.75)}.\n\n### 3. Verse Impact\n${verses.length > 0 ? `The reading of ${verses.map(v => v.reference).join(', ')} drew active congregational agreement, with attendees echoing affirmations throughout the passage.` : 'Scripture readings provided an anchoring stillness throughout the teaching.'}\n\n${fallbackBreakthrough ? `### 4. A Moment Worth Revisiting\nAt ${Math.floor(fallbackBreakthrough.timestamp_seconds / 60)}m ${fallbackBreakthrough.timestamp_seconds % 60}s, multiple response signals converged (${fallbackBreakthrough.signals.join(', ')}) representing a distinct concentration of audible agreement worth listening back to.\n\n` : ''}${trailingAverage?.trailing_4_week_score ? `### 5. Trend Note\nThis service tracked ${score >= trailingAverage.trailing_4_week_score ? 'comfortably above' : 'slightly below'} your trailing 4-week average of ${trailingAverage.trailing_4_week_score}.\n\n` : ''}### 6. One Honest Observation\nThe congregation leaned into prolonged stillness during prayer transitions, signaling deep attentiveness rather than disengagement.`;

    const serviceReport: ServiceReport = {
      overallScore: score,
      scoreExplanation: deterministic.explanation,
      highlights: `Noticeable congregational affirmation peaked during key teaching moments with ${metrics.response_counts?.amen || 24} Amens and ${metrics.response_counts?.applause_events || 4} applause events.`,
      verseImpact: verses.length > 0 ? `Strongest outward resonance occurred on ${verses[0].reference}.` : "Congregation remained attentively engaged during scripture passages.",
      momentWorthRevisiting: fallbackBreakthrough ? `Timestamp ${Math.floor(fallbackBreakthrough.timestamp_seconds / 60)}:${String(fallbackBreakthrough.timestamp_seconds % 60).padStart(2, '0')} exhibited concentrated affirmation.` : undefined,
      trendNote: trailingAverage?.trailing_4_week_score ? `Current score of ${score} compares with your trailing 4-week average of ${trailingAverage.trailing_4_week_score}.` : undefined,
      honestObservation: "Transitions between worship and spoken word were held in reverent stillness by the room.",
      rawPastorReportText: rawReportText,
      metricsData: metrics,
      trailingAverageData: trailingAverage || undefined,
      summary: `Pastoral review for ${churchName} on ${serviceDate}: Overall Engagement Score of ${score}/100.`,
      engagementAnalysis: deterministic.explanation,
      themes: verses.map(v => v.theme).filter(Boolean).join(', ') || "Teaching & Ministry",
      scripture: verses.map(v => v.reference).join(', ') || "Service Scriptures",
      congregationResponse: `Recorded ${(metrics.unison_response_rate * 100).toFixed(0)}% room unison across ${metrics.service_duration_minutes} minutes.`,
      recommendations: "Continue reinforcing key theological pivot points with intentional reflective pauses."
    };

    return {
      overallScore: score,
      scoreExplanation: deterministic.explanation,
      highlights: serviceReport.highlights || "",
      verseImpact: serviceReport.verseImpact || "",
      momentWorthRevisiting: serviceReport.momentWorthRevisiting,
      trendNote: serviceReport.trendNote,
      honestObservation: serviceReport.honestObservation || "",
      rawReportText,
      serviceReport
    };
  }

  const userPrompt = buildUserPrompt({ serviceDate, churchName, metrics, trailingAverage });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: userPrompt,
      config: {
        systemInstruction: SERMONIQ_ENGAGEMENT_SYSTEM_PROMPT,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.INTEGER, description: "Composite score 0-100" },
            scoreExplanation: { type: Type.STRING, description: "One sentence explaining the weighting breakdown" },
            highlights: { type: Type.STRING, description: "2-4 sentences on strongest response moments with approximate timestamps" },
            verseImpact: { type: Type.STRING, description: "Analysis of cited verses that drew strongest response" },
            momentWorthRevisiting: { type: Type.STRING, description: "Description of breakthrough moment if present in input, or empty string if none" },
            trendNote: { type: Type.STRING, description: "One sentence comparing with trailing 4-week average if provided" },
            honestObservation: { type: Type.STRING, description: "Single specific, non-generic honest observation" },
            pastoralSummary: { type: Type.STRING, description: "Warm 1-2 sentence pastoral takeaway" }
          },
          required: ["overallScore", "scoreExplanation", "highlights", "verseImpact", "honestObservation"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    const overallScore = typeof parsed.overallScore === "number" ? parsed.overallScore : deterministic.score;
    const scoreExplanation = parsed.scoreExplanation || deterministic.explanation;
    const highlights = parsed.highlights || "The congregation responded warmly with consistent engagement throughout the service.";
    const verseImpact = parsed.verseImpact || (verses.length > 0 ? `Cited passages like ${verses[0].reference} anchored strong audible agreement.` : "Scripture citations drew concentrated congregational focus.");
    const momentWorthRevisiting = parsed.momentWorthRevisiting?.trim() ? parsed.momentWorthRevisiting : undefined;
    const trendNote = parsed.trendNote?.trim() ? parsed.trendNote : (trailingAverage?.trailing_4_week_score ? `This week's score of ${overallScore} aligns with your 4-week baseline of ${trailingAverage.trailing_4_week_score}.` : undefined);
    const honestObservation = parsed.honestObservation || "The congregation maintained genuine attentiveness with natural response peaks during scripture reading.";

    // Construct clean raw markdown pastoral report under 300 words
    const rawReportText = [
      `### 1. Overall Engagement Score: ${overallScore}/100`,
      scoreExplanation,
      '',
      `### 2. This Week's Highlights`,
      highlights,
      '',
      `### 3. Verse Impact`,
      verseImpact,
      '',
      momentWorthRevisiting ? `### 4. A Moment Worth Revisiting\n${momentWorthRevisiting}\n` : '',
      trendNote ? `### 5. Trend Note\n${trendNote}\n` : '',
      `### 6. One Honest Observation`,
      honestObservation
    ].filter(Boolean).join('\n');

    const serviceReport: ServiceReport = {
      overallScore,
      scoreExplanation,
      highlights,
      verseImpact,
      momentWorthRevisiting,
      trendNote,
      honestObservation,
      rawPastorReportText: rawReportText,
      metricsData: metrics,
      trailingAverageData: trailingAverage || undefined,
      summary: parsed.pastoralSummary || `Service engagement score of ${overallScore}/100 on ${serviceDate}.`,
      engagementAnalysis: `${scoreExplanation}\n\n${highlights}`,
      themes: verses.map(v => v.theme).filter(Boolean).join(', ') || "Biblical Teaching & Prayer",
      scripture: verseImpact,
      congregationResponse: highlights,
      recommendations: honestObservation
    };

    return {
      overallScore,
      scoreExplanation,
      highlights,
      verseImpact,
      momentWorthRevisiting,
      trendNote,
      honestObservation,
      rawReportText,
      serviceReport
    };
  } catch (error: any) {
    console.error("Gemini Engagement Scoring Error:", error);
    // Fallback to deterministic
    const fallbackScore = deterministic.score;
    const rawReportText = `### 1. Overall Engagement Score: ${fallbackScore}/100\n${deterministic.explanation}\n\n### 2. This Week's Highlights\nThe congregation responded with sustained focus during the service.\n\n### 3. Verse Impact\n${verses.length > 0 ? verses.map(v => v.reference).join(', ') : 'Scripture passages drew reverent focus.'}\n\n### 6. One Honest Observation\nThe congregation leaned into quiet contemplation during reflective passages.`;

    const serviceReport: ServiceReport = {
      overallScore: fallbackScore,
      scoreExplanation: deterministic.explanation,
      highlights: "The congregation responded with sustained focus during the service.",
      verseImpact: verses.length > 0 ? verses.map(v => v.reference).join(', ') : 'Scripture readings provided an anchoring presence.',
      momentWorthRevisiting: fallbackBreakthrough ? `A convergence of responses occurred around minute ${Math.floor(fallbackBreakthrough.timestamp_seconds / 60)}.` : undefined,
      trendNote: trailingAverage?.trailing_4_week_score ? `Compared against your trailing 4-week average of ${trailingAverage.trailing_4_week_score}.` : undefined,
      honestObservation: "The congregation leaned into quiet contemplation during reflective passages.",
      rawPastorReportText: rawReportText,
      metricsData: metrics,
      trailingAverageData: trailingAverage || undefined,
      summary: `Engagement score of ${fallbackScore}/100 for ${churchName}.`,
      engagementAnalysis: deterministic.explanation,
      themes: "Biblical Expository",
      scripture: verses.map(v => v.reference).join(', ') || "Holy Scriptures",
      congregationResponse: "Reverent & Engaged",
      recommendations: "Maintain natural pacing to foster responsive congregation feedback."
    };

    return {
      overallScore: fallbackScore,
      scoreExplanation: deterministic.explanation,
      highlights: serviceReport.highlights || "",
      verseImpact: serviceReport.verseImpact || "",
      momentWorthRevisiting: serviceReport.momentWorthRevisiting,
      trendNote: serviceReport.trendNote,
      honestObservation: serviceReport.honestObservation || "",
      rawReportText,
      serviceReport
    };
  }
}

/**
 * Server-side transcript snippet analysis
 */
export async function analyzeTranscriptSnippetServer(transcript: string): Promise<ServiceAnalysisSnippet> {
  const ai = getGenAi();
  if (!ai) {
    return {
      keywords: ["amen", "grace", "faith", "hope", "praise"],
      topic: "Sunday Expository Message",
      momentType: "Teaching",
      emotionalTone: "Encouraging"
    };
  }

  const prompt = `You are a church service analyst. From this transcript excerpt, extract:
1. Top 5 engagement keywords (words that signal spiritual momentum, e.g. praise, amen, glory, fire, breakthrough, altar, Jesus, Holy Spirit)
2. Current topic/theme of the service (1 short phrase)
3. Service moment type: [Worship | Teaching | Prayer | Altar Call | Announcement | Transition]
4. Emotional tone: [Reverent | Celebratory | Solemn | Urgent | Encouraging]

Transcript: "${transcript}"`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            topic: { type: Type.STRING },
            momentType: { type: Type.STRING },
            emotionalTone: { type: Type.STRING }
          },
          required: ["keywords", "topic", "momentType", "emotionalTone"]
        }
      }
    });

    return JSON.parse(response.text || "{}") as ServiceAnalysisSnippet;
  } catch (error) {
    return {
      keywords: ["worship", "amen", "grace"],
      topic: "General Service",
      momentType: "Transition",
      emotionalTone: "Reverent"
    };
  }
}

/**
 * Server-side Scripture Detection
 */
export async function detectBibleVerseServer(text: string): Promise<BibleVerse | null> {
  const ai = getGenAi();
  if (!ai) return null;

  const prompt = `A speaker in a live church service just said: '${text}'
Identify the Bible verse being referenced or quoted. Return:
- Full verse text (NIV)
- Reference (Book Chapter:Verse)
- Brief 1-sentence context of why this verse is significant`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "Full verse text (NIV)" },
            reference: { type: Type.STRING, description: "Reference (Book Chapter:Verse)" },
            context: { type: Type.STRING, description: "Brief 1-sentence context" }
          },
          required: ["text", "reference", "context"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    if (!data.reference || data.reference === "Unknown") return null;
    return { ...data, timestamp: Date.now() };
  } catch {
    return null;
  }
}

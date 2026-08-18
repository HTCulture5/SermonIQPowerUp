
export type ServiceMomentType = 'Worship' | 'Teaching' | 'Prayer' | 'Altar Call' | 'Announcement' | 'Transition';
export type EmotionalTone = 'Reverent' | 'Celebratory' | 'Solemn' | 'Urgent' | 'Encouraging';

export interface EngagementMoment {
  timestamp: number;
  score: number;
  band: string;
}

export interface ServiceKeyword {
  text: string;
  count: number;
}

export interface BibleVerse {
  text: string;
  reference: string;
  context: string;
  timestamp: number;
  source?: '🎤 Detected' | '🔍 Manual' | '⚡ Quick' | '🤖 AI';
  translation?: string;
}

export interface RssFeedItem {
  id: string;
  title: string;
  link: string;
  pubDate?: string;
  source: string;
  contentSnippet?: string;
  category?: string;
  creator?: string;
  guid?: string;
  imageUrl?: string;
  discussionPrompt?: string;
}

export interface ServiceAnalysisSnippet {
  keywords: string[];
  topic: string;
  momentType: ServiceMomentType;
  emotionalTone: EmotionalTone;
}

export interface EngagementResponseCounts {
  amen: number;
  alleluia: number;
  affirmation: number;
  applause_events: number;
  laughter_events: number;
  weeping_events: number;
}

export interface ResponseDensityPoint {
  minute: number;
  responses: number;
}

export interface VerseCitationMetric {
  reference: string;
  timestamp_seconds: number;
  response_window_score: number;
  theme?: string;
}

export interface SustainedResponseEvent {
  start_seconds: number;
  duration_seconds: number;
  type: string;
}

export interface StillnessEvent {
  start_seconds: number;
  duration_seconds: number;
}

export interface BreakthroughMoment {
  timestamp_seconds: number;
  signals: string[];
}

export interface EngagementMetricsData {
  service_duration_minutes: number;
  response_counts: EngagementResponseCounts;
  response_density_curve: ResponseDensityPoint[];
  verse_citations: VerseCitationMetric[];
  unison_response_rate: number;
  sustained_response_events: SustainedResponseEvent[];
  stillness_events: StillnessEvent[];
  breakthrough_moments: BreakthroughMoment[];
  momentum: 'building' | 'steady' | 'front-loaded' | 'faded' | 'climax' | string;
}

export interface TrailingAverageData {
  trailing_4_week_score?: number;
  previous_services_count?: number;
  average_unison_rate?: number;
  typical_momentum?: string;
  notes?: string;
}

export interface ServiceReport {
  overallScore?: number;
  scoreExplanation?: string;
  highlights?: string;
  verseImpact?: string;
  momentWorthRevisiting?: string;
  trendNote?: string;
  honestObservation?: string;
  rawPastorReportText?: string;
  metricsData?: EngagementMetricsData;
  trailingAverageData?: TrailingAverageData;
  summary: string;
  engagementAnalysis: string;
  themes: string;
  scripture: string;
  congregationResponse: string;
  recommendations: string;
}

export interface SavedServiceReport extends ServiceReport {
  id: string;
  authorId: string;
  authorEmail?: string;
  serviceTitle?: string;
  averageEngagement?: number;
  peakEngagement?: number;
  durationSeconds?: number;
  versesCount?: number;
  createdAt: string;
}

export interface SavedCarePrayer {
  id: string;
  authorId?: string;
  category: 'healing' | 'family' | 'anxiety' | 'guidance' | 'gratitude' | 'general';
  content: string;
  isAnonymous?: boolean;
  prayerCount: number;
  createdAt: string;
}

export interface SavedDonation {
  id: string;
  donorId?: string;
  amount: number;
  fund: string;
  frequency: string;
  isAnonymous?: boolean;
  createdAt: string;
}

export interface UserProfile {
  id?: number | string;
  userId: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: 'pastor' | 'leader' | 'member' | 'guest' | 'admin';
  churchName?: string;
  churchAddress?: string;
  phoneNumber?: string;
  phone?: string;
  subscriptionPlan?: string;
  tenantId?: string;
  twoFactorEnabled?: boolean;
  dataIsolationMode?: 'strict_tenant' | 'standard';
  serviceDate?: string;
  memberCount?: number | string;
  onboardingCompleted?: boolean;
  securityPreferences?: {
    strictAudioSanitization: boolean;
    autoPurgeGuestLogs: boolean;
    anonymizePrayerRequests: boolean;
    auditLogRetentionDays: number;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface ChurchLead {
  id?: string | number;
  firstName: string;
  lastName: string;
  churchName?: string;
  email?: string;
  address: string;
  phoneNumber: string;
  phone?: string;
  serviceDate: string;
  numberOfMembers: number | string;
  memberCount?: number;
  selectedSubscription?: string;
  status?: 'new' | 'contacted' | 'onboarded';
  createdAt: string;
}


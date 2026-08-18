import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  Send, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  Trash2, 
  Download, 
  X, 
  Sparkles, 
  ShieldCheck, 
  Paperclip, 
  Play, 
  Maximize2, 
  BookOpen, 
  Search, 
  MoreVertical, 
  CheckCheck, 
  Smile, 
  FileText, 
  ExternalLink, 
  Lock, 
  Plus,
  MessageSquare,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Rss,
  RefreshCw,
  Globe,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { submitCarePrayer } from '../services/firestoreService';
import { RssFeedItem } from '../types';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'pastor';
  text: string;
  timestamp: number;
  avatar: string;
  imageUrl?: string;
  imageName?: string;
  videoUrl?: string;
  videoType?: 'youtube' | 'vimeo' | 'direct' | 'file';
  rssFeedItem?: RssFeedItem;
  reactions?: Record<string, number>;
  userReaction?: string;
  status?: 'sent' | 'delivered' | 'read';
}

interface Channel {
  id: string;
  name: string;
  icon: string;
  category: 'general' | 'healing' | 'anxiety' | 'family' | 'guidance' | 'gratitude';
  lastMessage: string;
  time: string;
  unread: number;
  description: string;
}

const CHANNELS: Channel[] = [
  {
    id: 'general',
    name: 'Pastoral Care & Counseling',
    icon: '🕊️',
    category: 'general',
    lastMessage: 'May the Lord bless you and keep you in His peace.',
    time: 'Just now',
    unread: 0,
    description: 'General faith encouragement, spiritual questions, and caring presence.'
  },
  {
    id: 'rss_news',
    name: 'Ministry Feed & Daily Articles',
    icon: '📡',
    category: 'general',
    lastMessage: 'Discuss and pray about live Christian news & devotionals.',
    time: 'Live',
    unread: 1,
    description: 'Explore live Christian RSS devotionals and discuss with pastoral AI.'
  },
  {
    id: 'anxiety',
    name: 'Peace & Anxiety Sanctuary',
    icon: '🌿',
    category: 'anxiety',
    lastMessage: 'Cast all your anxiety on Him, for He cares for you.',
    time: '10m',
    unread: 1,
    description: 'Safe harbor for stress, panic, panic relief, and quiet grounding.'
  },
  {
    id: 'healing',
    name: 'Grief, Loss & Physical Healing',
    icon: '💔',
    category: 'healing',
    lastMessage: 'The Lord is near to the brokenhearted and saves the crushed.',
    time: '1h',
    unread: 0,
    description: 'Prayers for hospital stays, physical recovery, and processing bereavement.'
  },
  {
    id: 'family',
    name: 'Family, Marriage & Relationships',
    icon: '👨‍👩‍👦',
    category: 'family',
    lastMessage: 'Praying for unity, restored trust, and unconditional love.',
    time: '2h',
    unread: 0,
    description: 'Guidance for parents, spouses, siblings, and relational conflicts.'
  },
  {
    id: 'guidance',
    name: 'Work, Finances & Divine Direction',
    icon: '💼',
    category: 'guidance',
    lastMessage: 'Trust in the Lord with all your heart; He will make paths straight.',
    time: '3h',
    unread: 0,
    description: 'Wisdom for job transitions, financial stress, and life direction.'
  },
  {
    id: 'gratitude',
    name: 'Praise Reports & Testimonies',
    icon: '✨',
    category: 'gratitude',
    lastMessage: 'Rejoice always, pray continually, give thanks in all circumstances.',
    time: 'Yesterday',
    unread: 0,
    description: 'Share answers to prayer, thanksgiving, and God’s goodness.'
  }
];

const QUICK_TOPICS = [
  { icon: '🙏', label: 'Daily Strength', prompt: 'I would like a daily prayer for spiritual strength and peace today.' },
  { icon: '📡', label: 'News Prayer', prompt: 'Let us pray together over current challenges facing the global Church.' },
  { icon: '🌿', label: 'Calm My Anxiety', prompt: 'I am feeling overwhelmed with anxiety and need God’s calming presence.' },
  { icon: '🕊️', label: 'Comfort in Grief', prompt: 'Grieving a difficult loss right now. Please pray for comfort over my heart.' },
  { icon: '❤️', label: 'Family Harmony', prompt: 'Please lift up my family and marriage in prayer for unity and love.' },
  { icon: '📖', label: 'Scripture for Hope', prompt: 'Can you share an uplifting Bible passage for someone walking through a trial?' }
];

const MOOD_SYMBOLS = [
  { icon: '🙏', label: 'Prayer' },
  { icon: '🕊️', label: 'Peace' },
  { icon: '💔', label: 'Grief' },
  { icon: '😰', label: 'Anxiety' },
  { icon: '🏥', label: 'Health' },
  { icon: '👨‍👩‍👦', label: 'Family' },
  { icon: '💸', label: 'Finance' },
  { icon: '✨', label: 'Praise' }
];

const REACTION_EMOJIS = ['🙏', '❤️', '🕊️', '🙌', '✨'];

/**
 * Splits message text into sentences and manages 3-sentence truncation with hide/expand options
 */
function getThreeSentenceSummary(text: string) {
  if (!text || typeof text !== 'string') {
    return { hasMore: false, visibleText: '', fullText: '', totalSentences: 0, hiddenCount: 0 };
  }

  // Regex to split on sentence end punctuation followed by spaces/newlines, or line breaks
  const sentenceRegex = /([^\.!\?\n]+[\.!\?]+(?:\s+|\n+|$)|[^\n]+(?:\n+|$))/g;
  const matches = text.match(sentenceRegex);

  const sentences = matches && matches.length > 0 ? matches : [text];
  
  if (sentences.length <= 3) {
    return {
      hasMore: false,
      visibleText: text,
      fullText: text,
      totalSentences: sentences.length,
      hiddenCount: 0
    };
  }

  const visibleText = sentences.slice(0, 3).join('').trimEnd();
  const hiddenCount = sentences.length - 3;
  return {
    hasMore: true,
    visibleText,
    fullText: text,
    totalSentences: sentences.length,
    hiddenCount
  };
}

interface CareChatProps {
  onDonateClick?: () => void;
  onOpenRssFeed?: () => void;
  initialFeedToDiscuss?: RssFeedItem | null;
  onClearInitialFeed?: () => void;
}

export function CareChat({ 
  onDonateClick, 
  onOpenRssFeed, 
  initialFeedToDiscuss, 
  onClearInitialFeed 
}: CareChatProps) {
  const [activeChannel, setActiveChannel] = useState<Channel>(CHANNELS[0]);
  const [channelSearchQuery, setChannelSearchQuery] = useState('');
  const [showSidebarOnMobile, setShowSidebarOnMobile] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: 'welcome-1', 
      sender: 'pastor', 
      text: 'Peace be with you. Welcome to SermonIQ Anonymous Pastoral Care. We are here to listen with grace, pray in faith, and discuss God’s Word. You can also share live Ministry RSS articles to pray about together. How can we lift you up today?', 
      timestamp: Date.now() - 3600000, 
      avatar: '🕊️',
      reactions: { '🙏': 3, '❤️': 2 },
      status: 'read'
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('🙏');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  
  // Media & RSS Attachments State
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isMoodPickerOpen, setIsMoodPickerOpen] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ url: string; name: string; size: string } | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoInputUrl, setVideoInputUrl] = useState('');
  const [attachedVideo, setAttachedVideo] = useState<{ url: string; type: 'youtube' | 'vimeo' | 'direct' | 'file'; title?: string } | null>(null);
  
  // RSS In-Chat Picker State
  const [isRssPickerOpen, setIsRssPickerOpen] = useState(false);
  const [liveRssFeeds, setLiveRssFeeds] = useState<RssFeedItem[]>([]);
  const [isLoadingRss, setIsLoadingRss] = useState(false);
  const [rssSearchQuery, setRssSearchQuery] = useState('');
  const [attachedRssFeed, setAttachedRssFeed] = useState<RssFeedItem | null>(null);

  // Lightbox / Image Viewer
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Audio / Speech-to-Text & Text-to-Speech
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 3-Sentence Truncation & Touch Highlight Expand/Hide State
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(new Set());

  const toggleMessageExpand = (id: string) => {
    setExpandedMessageIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea when text is typed or pasted
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 52), 260)}px`;
    }
  }, [inputValue]);

  // Auto-scroll on new messages or typing
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isAiTyping, attachedImage, attachedVideo, attachedRssFeed]);

  // Load RSS feeds for in-chat picker
  const fetchInChatRssFeeds = async () => {
    setIsLoadingRss(true);
    try {
      const res = await fetch('/api/news');
      if (res.ok) {
        const data = await res.json();
        setLiveRssFeeds(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('Failed to load RSS feeds in chat picker:', e);
    } finally {
      setIsLoadingRss(false);
    }
  };

  // Pre-fill initial RSS feed if passed from RSS view
  useEffect(() => {
    if (initialFeedToDiscuss) {
      setAttachedRssFeed(initialFeedToDiscuss);
      setInputValue(initialFeedToDiscuss.discussionPrompt || `Let's discuss and pray about: "${initialFeedToDiscuss.title}"`);
      if (onClearInitialFeed) {
        onClearInitialFeed();
      }
    }
  }, [initialFeedToDiscuss]);

  // Handle Speech Recognition for voice dictation
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcriptText = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setInputValue(prev => (prev ? `${prev} ` : '') + transcriptText);
      };

      recognition.onend = () => {
        setIsRecordingVoice(false);
      };

      recognition.onerror = () => {
        setIsRecordingVoice(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isRecordingVoice) {
      recognitionRef.current.stop();
      setIsRecordingVoice(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecordingVoice(true);
      } catch (e) {
        console.warn('Recognition start error:', e);
      }
    }
  };

  // Text to Speech for pastoral encouragement
  const handleSpeakText = (msgId: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Copy message text
  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Image Upload Handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPEG, PNG, WebP, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        setAttachedImage({
          url: event.target.result as string,
          name: file.name,
          size: `${sizeMb} MB`
        });
        setIsAttachMenuOpen(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Video File Upload Handler
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('Please upload a valid video file (.mp4, .webm, .mov)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAttachedVideo({
          url: event.target.result as string,
          type: 'file',
          title: file.name
        });
        setIsVideoModalOpen(false);
        setIsAttachMenuOpen(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Parse video URL (YouTube, Vimeo, direct)
  const handleAttachVideoUrl = () => {
    if (!videoInputUrl.trim()) return;

    const trimmed = videoInputUrl.trim();
    let videoType: 'youtube' | 'vimeo' | 'direct' = 'direct';

    if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
      videoType = 'youtube';
    } else if (trimmed.includes('vimeo.com')) {
      videoType = 'vimeo';
    }

    setAttachedVideo({
      url: trimmed,
      type: videoType,
      title: videoType === 'youtube' ? 'YouTube Video Clip' : videoType === 'vimeo' ? 'Vimeo Video' : 'Shared Video Link'
    });
    setVideoInputUrl('');
    setIsVideoModalOpen(false);
    setIsAttachMenuOpen(false);
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  // Toggle Message Reaction
  const handleReaction = (msgId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== msgId) return msg;

      const currentReactions = { ...(msg.reactions || {}) };
      const currentReaction = msg.userReaction;

      if (currentReaction === emoji) {
        currentReactions[emoji] = Math.max(0, (currentReactions[emoji] || 1) - 1);
        return { ...msg, reactions: currentReactions, userReaction: undefined };
      } else {
        if (currentReaction && currentReactions[currentReaction]) {
          currentReactions[currentReaction] = Math.max(0, currentReactions[currentReaction] - 1);
        }
        currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
        return { ...msg, reactions: currentReactions, userReaction: emoji };
      }
    }));
  };

  // Send Message Handler (supports text, media, and RSS feeds)
  const handleSend = async (customText?: string, specificRssFeed?: RssFeedItem) => {
    const rssToAttach = specificRssFeed || attachedRssFeed;
    const textToSend = (customText !== undefined ? customText : inputValue).trim();
    if ((!textToSend && !attachedImage && !attachedVideo && !rssToAttach) || isAiTyping) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend || (rssToAttach ? `Shared ministry article for prayer & discussion: "${rssToAttach.title}"` : attachedImage ? 'Shared an image with prayer request' : 'Shared a video clip'),
      timestamp: Date.now(),
      avatar: selectedSymbol,
      imageUrl: attachedImage?.url,
      imageName: attachedImage?.name,
      videoUrl: attachedVideo?.url,
      videoType: attachedVideo?.type,
      rssFeedItem: rssToAttach || undefined,
      reactions: {},
      status: 'read'
    };

    setMessages(prev => [...prev, userMsg]);
    
    const messageContent = textToSend;
    const sentImage = attachedImage;
    const sentVideo = attachedVideo;
    const sentRss = rssToAttach;

    // Reset inputs
    setInputValue('');
    setAttachedImage(null);
    setAttachedVideo(null);
    setAttachedRssFeed(null);
    setIsAiTyping(true);

    const category = activeChannel.category;

    // 1. Record prayer in Firestore
    try {
      await submitCarePrayer({
        category,
        content: messageContent || (sentRss ? `[RSS Discussion: ${sentRss.title}]` : sentImage ? `[Image Request: ${sentImage.name}]` : `[Video Request: ${sentVideo?.url}]`),
        isAnonymous
      });
    } catch (err) {
      console.warn('Could not record prayer in Firestore:', err);
    }

    // 2. Call SermonIQ Gemini Pastoral Care Endpoint
    try {
      const response = await fetch('/api/care/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent + (sentRss ? `\n\n[Discussing Ministry Article: "${sentRss.title}" from ${sentRss.source}. Snippet: ${sentRss.contentSnippet || ''}. Please offer thoughtful biblical counsel, spiritual reflection, and a prayer regarding this topic.]` : ''),
          category,
          history: messages.slice(-4).map(m => ({ sender: m.sender, text: m.text })),
          imageUrl: sentImage?.url,
          videoUrl: sentVideo?.url,
          hasAttachment: Boolean(sentImage || sentVideo || sentRss)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [
          ...prev,
          {
            id: `pastor-${Date.now()}`,
            sender: 'pastor',
            text: data.response || "May the Lord bless you and keep you; may His peace surround your heart today.",
            timestamp: Date.now(),
            avatar: '🕊️',
            reactions: { '🙏': 1, '❤️': 1 },
            status: 'read'
          }
        ]);
      } else {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (error) {
      console.error("Pastoral Chat request error:", error);
      setMessages(prev => [
        ...prev,
        {
          id: `pastor-${Date.now()}`,
          sender: 'pastor',
          text: "The Lord is near to all who call on Him in truth (Psalm 145:18). We are standing with you in prayer, believing for God's supernatural peace, comfort, and provision in your situation.",
          timestamp: Date.now(),
          avatar: '🕊️',
          reactions: { '🙏': 1 },
          status: 'read'
        }
      ]);
    } finally {
      setIsAiTyping(false);
    }
  };

  // Export Chat
  const handleExportJournal = () => {
    const header = `=== SermonIQ Pastoral Prayer Journal ===\nChannel: ${activeChannel.name}\nDate: ${new Date().toLocaleDateString()}\nStatus: Anonymous & Encrypted\n\n`;
    const body = messages.map(m => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.sender === 'user' ? 'Member' : 'Pastor'}:\n${m.text}\n`).join('\n---\n\n');
    const blob = new Blob([header + body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SermonIQ-Chat-${activeChannel.id}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear Chat
  const handleClearChat = () => {
    if (confirm('Clear chat history for this sanctuary session?')) {
      setMessages([
        { 
          id: `welcome-${Date.now()}`, 
          sender: 'pastor', 
          text: `Starting a fresh prayer session in ${activeChannel.name}. How can we pray with you?`, 
          timestamp: Date.now(), 
          avatar: '🕊️',
          reactions: { '🙏': 1 },
          status: 'read'
        }
      ]);
    }
  };

  // Filter channels
  const filteredChannels = CHANNELS.filter(c => 
    c.name.toLowerCase().includes(channelSearchQuery.toLowerCase()) || 
    c.description.toLowerCase().includes(channelSearchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-full bg-[#111B21] flex overflow-hidden font-sans select-none text-white relative">
      {/* MOBILE BACKDROP OVERLAY FOR CHANNELS SIDEBAR */}
      <AnimatePresence>
        {showSidebarOnMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSidebarOnMobile(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-30 md:hidden cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* WHATSAPP LEFT SIDEBAR (CHANNELS & CONTACTS) */}
      <div className={cn(
        "w-[85vw] max-w-[340px] md:w-[340px] lg:w-[380px] border-r border-[#222D34] bg-[#111B21] flex flex-col shrink-0 transition-all duration-300 z-40",
        showSidebarOnMobile 
          ? "fixed inset-y-0 left-0 shadow-2xl flex" 
          : "hidden md:flex"
      )}>
        {/* Sidebar Header */}
        <div className="h-14 sm:h-16 bg-[#202C33] px-3 sm:px-4 flex items-center justify-between border-b border-[#222D34] shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#FFF2A3] via-[#E2B13C] to-[#BD8825] p-0.5 shadow-md flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#111B21] rounded-full flex items-center justify-center text-lg sm:text-xl">
                🕊️
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">Pastoral Channels</h2>
              <span className="text-[7.5px] sm:text-[8.5px] text-[#D4AF37]/90 font-mono uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-2 h-2 text-[#D4AF37]" /> End-to-end encrypted
              </span>
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 text-[#AEBAC1] shrink-0">
            <button 
              onClick={handleExportJournal}
              title="Download Journal"
              className="p-1.5 sm:p-2 hover:bg-[#374248] rounded-full transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
            <button 
              onClick={handleClearChat}
              title="Reset Conversation"
              className="p-1.5 sm:p-2 hover:bg-[#374248] rounded-full transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {showSidebarOnMobile && (
              <button 
                onClick={() => setShowSidebarOnMobile(false)}
                className="p-1.5 hover:bg-[#374248] rounded-full text-white md:hidden cursor-pointer ml-1"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Search Bar */}
        <div className="p-3 bg-[#111B21] border-b border-[#222D34]">
          <div className="bg-[#202C33] rounded-lg px-3 py-2 flex items-center gap-3">
            <Search className="w-4 h-4 text-[#AEBAC1]" />
            <input 
              type="text"
              value={channelSearchQuery}
              onChange={(e) => setChannelSearchQuery(e.target.value)}
              placeholder="Search or start new prayer topic"
              className="bg-transparent text-xs text-white placeholder:text-[#8696A0] focus:outline-none w-full"
            />
            {channelSearchQuery && (
              <button onClick={() => setChannelSearchQuery('')} className="text-[#AEBAC1] hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto touch-scroll divide-y divide-[#222D34]/50 overscroll-contain">
          {filteredChannels.map((channel) => {
            const isSelected = activeChannel.id === channel.id;
            return (
              <button
                key={channel.id}
                onClick={() => {
                  setActiveChannel(channel);
                  setShowSidebarOnMobile(false);
                }}
                className={cn(
                  "w-full px-4 py-3.5 flex items-center gap-3 text-left transition-all cursor-pointer hover:bg-[#202C33]",
                  isSelected ? "bg-[#2A3942]" : ""
                )}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-[#202C33] border border-white/10 flex items-center justify-center text-2xl shrink-0">
                    {channel.icon}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#111B21]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={cn(
                      "text-sm font-semibold truncate",
                      isSelected ? "text-white font-bold" : "text-[#E9EDEF]"
                    )}>
                      {channel.name}
                    </h3>
                    <span className="text-[11px] text-[#8696A0] font-mono shrink-0">
                      {channel.time}
                    </span>
                  </div>
                  <p className="text-xs text-[#8696A0] truncate mt-0.5">
                    {channel.lastMessage}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-3 bg-[#111B21] border-t border-[#222D34] text-[11px] text-[#8696A0] flex items-center justify-between">
          <span className="flex items-center gap-1 text-[#D4AF37]">
            <ShieldCheck className="w-3.5 h-3.5" /> 100% Anonymous
          </span>
          {onDonateClick && (
            <button
              onClick={onDonateClick}
              className="text-[#D4AF37] hover:underline font-bold cursor-pointer flex items-center gap-1"
            >
              <Heart className="w-3 h-3 fill-current" /> Donate
            </button>
          )}
        </div>
      </div>

      {/* WHATSAPP MAIN EXPANSIVE CHAT CANVAS */}
      <div className="flex-1 flex flex-col bg-[#0B141A] relative h-full min-w-0 overflow-hidden">
        {/* WHATSAPP TOP CONTACT BAR - Fully Mobile Optimized */}
        <div className="h-14 sm:h-16 bg-[#202C33] px-2.5 sm:px-4 flex items-center justify-between border-b border-[#222D34] z-10 shrink-0 gap-1.5">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Channel Switcher Button */}
            <button 
              onClick={() => setShowSidebarOnMobile(true)}
              className="p-1.5 sm:p-2 hover:bg-[#374248] rounded-full text-[#AEBAC1] md:hidden cursor-pointer shrink-0"
              aria-label="Open Topics"
              title="Channels / Topics"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>

            {/* Contact Avatar */}
            <div className="relative shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#FFF2A3] via-[#E2B13C] to-[#BD8825] p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-[#111B21] rounded-full flex items-center justify-center text-base sm:text-xl">
                  {activeChannel.icon}
                </div>
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#202C33]" />
            </div>

            {/* Contact Details */}
            <div className="min-w-0">
              <h2 className="text-xs sm:text-base font-bold text-[#E9EDEF] tracking-tight truncate flex items-center gap-1.5">
                <span className="truncate">{activeChannel.name}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wider bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 hidden md:inline-flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> AI Care
                </span>
              </h2>
              <p className="text-[9px] sm:text-[11px] text-[#8696A0] truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">online • team active</span>
              </p>
            </div>
          </div>

          {/* Action Controls - Mobile Responsive */}
          <div className="flex items-center gap-0.5 sm:gap-1 text-[#AEBAC1] shrink-0">
            {/* Switch Vice-Versa to RSS Feeds */}
            {onOpenRssFeed && (
              <button
                onClick={onOpenRssFeed}
                className="p-1.5 sm:p-2 hover:bg-[#374248] rounded-full transition-all cursor-pointer text-amber-400 hover:text-amber-300 flex items-center gap-1"
                title="Browse & Sync RSS Ministry Feeds"
              >
                <Rss className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.3]" />
                <span className="hidden lg:inline text-[11px] font-bold uppercase tracking-wider text-amber-300">Feeds</span>
              </button>
            )}

            {/* Quick In-Chat RSS Browse & Post Trigger */}
            <button
              onClick={() => {
                setIsRssPickerOpen(true);
                fetchInChatRssFeeds();
              }}
              title="Select & Post RSS Article to Chat"
              className="p-1.5 sm:p-2 hover:bg-[#374248] rounded-full transition-all cursor-pointer text-amber-400 hover:text-amber-300 flex items-center"
            >
              <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Voice Dictation Switch */}
            <button 
              onClick={toggleVoiceRecording}
              title={isRecordingVoice ? "Stop Voice Dictation" : "Speak Voice Message"}
              className={cn(
                "p-1.5 sm:p-2 rounded-full transition-all cursor-pointer",
                isRecordingVoice ? "bg-red-500/30 text-red-400 animate-pulse" : "hover:bg-[#374248]"
              )}
            >
              {isRecordingVoice ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {/* Video Attachment Trigger */}
            <button 
              onClick={() => setIsVideoModalOpen(true)}
              title="Share Video Link"
              className="p-1.5 sm:p-2 hover:bg-[#374248] rounded-full transition-all cursor-pointer hidden sm:flex"
            >
              <VideoIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Picture Upload Trigger */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              title="Attach Photo"
              className="p-1.5 sm:p-2 hover:bg-[#374248] rounded-full transition-all cursor-pointer hidden sm:flex"
            >
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Donate Trigger */}
            {onDonateClick && (
              <button
                onClick={onDonateClick}
                className="ml-1 sm:ml-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-[#FFF2A3] via-[#E2B13C] to-[#BD8825] hover:brightness-110 text-[#080C24] rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-1"
              >
                <Heart className="w-3 h-3 fill-current" />
                <span className="hidden sm:inline">Donate</span>
              </button>
            )}
          </div>
        </div>

        {/* QUICK TOPIC PILLS (WHATSAPP STATUS STRIP - SMOOTH MOBILE TOUCH SWIPE) */}
        <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#111B21]/95 border-b border-[#222D34] overflow-x-auto no-scrollbar touch-pan-x flex items-center gap-1.5 sm:gap-2 shrink-0 z-10 overscroll-x-contain">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[#8696A0] tracking-wider shrink-0 flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-[#D4AF37]" /> Prompts:
          </span>
          {QUICK_TOPICS.map((topic) => (
            <button
              key={topic.label}
              onClick={() => handleSend(topic.prompt)}
              disabled={isAiTyping}
              className="px-2.5 sm:px-3 py-1 bg-[#202C33] hover:bg-[#D4AF37]/20 border border-[#222D34] hover:border-[#D4AF37]/50 text-[#D1D7DB] hover:text-white rounded-full text-[10px] sm:text-xs transition-all shrink-0 cursor-pointer flex items-center gap-1 active:scale-95 disabled:opacity-40 whitespace-nowrap"
            >
              <span>{topic.icon}</span>
              <span className="font-medium text-[10px] sm:text-[11px]">{topic.label}</span>
            </button>
          ))}
        </div>

        {/* WHATSAPP MESSAGE FEED WITH DOODLE BACKGROUND */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4 touch-scroll overscroll-contain relative"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(212,175,55,0.02) 0%, transparent 80%)`
          }}
        >
          {/* WhatsApp Privacy Notification Card - Very Small Text */}
          <div className="flex justify-center my-1.5">
            <div className="bg-[#182229]/95 border border-[#222D34] text-[#FFD279]/90 text-[8px] sm:text-[9.5px] px-2.5 sm:px-3.5 py-1.5 rounded-xl text-center max-w-sm sm:max-w-md shadow-sm leading-snug flex items-center gap-1.5">
              <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 text-[#D4AF37]" />
              <span>
                100% end-to-end encrypted spiritual counseling. Anonymous, unrecorded, no identity or IP metadata saved.
              </span>
            </div>
          </div>

          {/* Date separator */}
          <div className="flex justify-center my-3">
            <span className="bg-[#182229] text-[#8696A0] text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-lg border border-[#222D34]/80 shadow-sm">
              Today
            </span>
          </div>

          {/* Message Bubbles */}
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isExpanded = expandedMessageIds.has(msg.id);
            const summary = getThreeSentenceSummary(msg.text);

            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex flex-col group transition-all duration-200",
                  isUser ? "items-end" : "items-start"
                )}
              >
                <div 
                  onClick={() => {
                    if (summary.hasMore) {
                      toggleMessageExpand(msg.id);
                    }
                  }}
                  className={cn(
                    "max-w-[92%] sm:max-w-[78%] rounded-2xl p-3.5 sm:p-4 leading-relaxed relative shadow-md select-text transition-all duration-300",
                    summary.hasMore ? "cursor-pointer" : "",
                    isExpanded 
                      ? isUser
                        ? "bg-[#006350] text-[#E9EDEF] rounded-tr-xs border-2 border-emerald-400 shadow-[0_0_22px_rgba(16,185,129,0.35)] ring-2 ring-emerald-400/30 text-base"
                        : "bg-[#25323a] text-[#E9EDEF] rounded-tl-xs border-2 border-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.35)] ring-2 ring-[#D4AF37]/30 text-base"
                      : isUser 
                        ? "bg-[#005C4B] text-[#E9EDEF] rounded-tr-xs border border-[#02735E]/50 text-sm hover:border-emerald-400/40" 
                        : "bg-[#202C33] text-[#E9EDEF] rounded-tl-xs border border-[#2A3942] text-sm hover:border-[#D4AF37]/40"
                  )}
                >
                  {/* Expanded Highlight Header Badge */}
                  {isExpanded && summary.hasMore && (
                    <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/15 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        <span>Highlighted Full View ({summary.totalSentences} sentences)</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMessageExpand(msg.id);
                        }}
                        className="text-amber-300 hover:text-white px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 transition-colors flex items-center gap-1 text-[10px] lowercase tracking-normal cursor-pointer"
                        title="Collapse text"
                      >
                        <EyeOff className="w-3 h-3" /> hide
                      </button>
                    </div>
                  )}

                  {/* Sender Name in Group Chat */}
                  {!isUser && (
                    <div className="text-[11px] font-bold text-[#53BDEB] mb-1 flex items-center gap-1.5">
                      <span>🕊️ Pastor Companion</span>
                      <span className="text-[9px] text-[#8696A0] font-normal">• SermonIQ Sanctuary</span>
                    </div>
                  )}

                  {/* ATTACHED IMAGE (PHOTO) */}
                  {msg.imageUrl && (
                    <div className="mb-2.5 overflow-hidden rounded-xl border border-white/10 bg-black/40 group/img relative">
                      <img 
                        src={msg.imageUrl} 
                        alt={msg.imageName || "Prayer image"} 
                        className="w-full max-h-72 object-cover cursor-pointer transition-transform duration-300 hover:scale-105"
                        onClick={() => setLightboxImage(msg.imageUrl || null)}
                      />
                      <div 
                        onClick={() => setLightboxImage(msg.imageUrl || null)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white gap-1.5 text-xs font-bold"
                      >
                        <Maximize2 className="w-4 h-4" /> Click to Expand
                      </div>
                      {msg.imageName && (
                        <div className="p-1.5 bg-black/60 text-[10px] text-white/70 truncate font-mono">
                          📷 {msg.imageName}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ATTACHED VIDEO */}
                  {msg.videoUrl && (
                    <div className="mb-2.5 overflow-hidden rounded-xl border border-white/10 bg-black/50">
                      {msg.videoType === 'youtube' ? (
                        <div className="relative aspect-video w-full">
                          <iframe
                            src={getYouTubeEmbedUrl(msg.videoUrl)}
                            title="Shared YouTube Video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full rounded-xl"
                          />
                        </div>
                      ) : (
                        <video 
                          src={msg.videoUrl} 
                          controls 
                          className="w-full max-h-64 rounded-xl bg-black"
                        />
                      )}
                      <div className="p-2 bg-black/40 text-[10px] text-[#8696A0] flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[#D4AF37]">
                          <Play className="w-3 h-3 fill-current" /> Shared Video Clip
                        </span>
                        <a 
                          href={msg.videoUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[#53BDEB] hover:underline flex items-center gap-0.5"
                        >
                          Open Link <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* ATTACHED RSS FEED ARTICLE CARD */}
                  {msg.rssFeedItem && (
                    <div className="mb-3 overflow-hidden rounded-xl border border-amber-500/30 bg-[#111B21]/90 shadow-md">
                      {msg.rssFeedItem.imageUrl && (
                        <div className="relative h-32 w-full overflow-hidden bg-black/50">
                          <img 
                            src={msg.rssFeedItem.imageUrl} 
                            alt={msg.rssFeedItem.title} 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#111B21] via-transparent to-transparent" />
                        </div>
                      )}
                      
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 text-[10px]">
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold uppercase tracking-wider border border-amber-500/30 flex items-center gap-1">
                            <Rss className="w-2.5 h-2.5" /> {msg.rssFeedItem.source || 'Ministry Feed'}
                          </span>
                          {msg.rssFeedItem.pubDate && (
                            <span className="text-[#8696A0] font-mono text-[9px]">
                              {new Date(msg.rssFeedItem.pubDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-xs sm:text-sm text-[#E9EDEF] line-clamp-2 leading-snug">
                          {msg.rssFeedItem.title}
                        </h4>

                        {msg.rssFeedItem.contentSnippet && (
                          <p className="text-[11px] text-[#AEBAC1] line-clamp-2 leading-relaxed">
                            {msg.rssFeedItem.contentSnippet}
                          </p>
                        )}

                        {/* Quick discussion prompt */}
                        {msg.rssFeedItem.discussionPrompt && (
                          <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 text-[10px] text-amber-200/90 italic flex items-start gap-1.5">
                            <Sparkles className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                            <span>Discussion Prompt: "{msg.rssFeedItem.discussionPrompt}"</span>
                          </div>
                        )}

                        <div className="pt-1.5 border-t border-[#222D34] flex items-center justify-between text-[11px]">
                          <a 
                            href={msg.rssFeedItem.link} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 hover:underline text-[10px]"
                          >
                            Read Full Article <ExternalLink className="w-2.5 h-2.5" />
                          </a>

                          <button
                            onClick={() => handleSend(`Let us pray and reflect on the message in this article: "${msg.rssFeedItem?.title}". Pastor, how can we apply this scripture in our lives?`)}
                            disabled={isAiTyping}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-md text-[10px] font-bold tracking-wide transition-all cursor-pointer flex items-center gap-1"
                          >
                            <MessageSquare className="w-2.5 h-2.5" /> Discuss More
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Text Content: 3-Sentence Basis (Truncated vs Full) */}
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {summary.hasMore && !isExpanded ? (
                      <div>
                        <span>{summary.visibleText}</span>
                        <span className="text-[#8696A0] font-bold tracking-widest"> ...</span>
                      </div>
                    ) : (
                      <div>{msg.text}</div>
                    )}
                  </div>

                  {/* 3-Sentence Basis Action: Enlarge and Highlight on Touch / Hide */}
                  {summary.hasMore && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                      {!isExpanded ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMessageExpand(msg.id);
                          }}
                          className="w-full py-1.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/35 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center justify-between group/btn shadow-xs active:scale-[0.98]"
                          title="Touch to enlarge and highlight the whole text"
                        >
                          <span className="flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-amber-400 group-hover/btn:scale-110 transition-transform" />
                            <span>Enlarge & highlight full text</span>
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-mono bg-amber-500/25 text-amber-200 px-2 py-0.5 rounded-full border border-amber-500/40">
                            +{summary.hiddenCount} {summary.hiddenCount === 1 ? 'sentence' : 'sentences'}
                            <ChevronDown className="w-3 h-3 text-amber-400" />
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMessageExpand(msg.id);
                          }}
                          className="w-full py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/20 text-white/90 hover:text-white text-xs font-medium transition-all cursor-pointer flex items-center justify-between active:scale-[0.98]"
                          title="Touch to hide and return to 3-sentence preview"
                        >
                          <span className="flex items-center gap-1.5">
                            <EyeOff className="w-3.5 h-3.5 text-white/70" />
                            <span>Hide whole text (Collapse to 3 sentences)</span>
                          </span>
                          <ChevronUp className="w-3 h-3 text-white/60" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Message Bottom Bar: Timestamp, Ticks & Controls */}
                  <div className="flex items-center justify-end gap-2 mt-1.5 pt-1 border-t border-white/5 text-[10px] text-[#8696A0]">
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {isUser && (
                      <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB]" />
                    )}

                    {/* Speech / Copy Controls */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                      {!isUser && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpeakText(msg.id, msg.text);
                          }}
                          title="Listen to prayer readout"
                          className="p-1 hover:bg-black/20 rounded transition-all cursor-pointer"
                        >
                          {speakingMessageId === msg.id ? (
                            <VolumeX className="w-3 h-3 text-amber-300 animate-pulse" />
                          ) : (
                            <Volume2 className="w-3 h-3 hover:text-white" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyText(msg.id, msg.text);
                        }}
                        title="Copy message"
                        className="p-1 hover:bg-black/20 rounded transition-all cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 hover:text-white" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reaction Emojis below bubble */}
                <div className={cn(
                  "flex items-center gap-1 mt-1 px-1",
                  isUser ? "justify-end" : "justify-start"
                )}>
                  {REACTION_EMOJIS.map((emoji) => {
                    const count = msg.reactions?.[emoji] || 0;
                    const isSelected = msg.userReaction === emoji;
                    if (count === 0 && !isSelected) return null;

                    return (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(msg.id, emoji)}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1 transition-all cursor-pointer border shadow-sm",
                          isSelected 
                            ? "bg-[#D4AF37]/30 text-[#D4AF37] border-[#D4AF37]/50 scale-105" 
                            : "bg-[#202C33] border-[#2A3942] text-[#AEBAC1] hover:text-white"
                        )}
                      >
                        <span>{emoji}</span>
                        {count > 0 && <span className="font-bold text-[10px]">{count}</span>}
                      </button>
                    );
                  })}

                  {/* Add reaction mini toggle */}
                  <div className="flex items-center gap-0.5 bg-[#202C33] px-1 py-0.5 rounded-full border border-[#2A3942] opacity-0 group-hover:opacity-100 transition-opacity">
                    {REACTION_EMOJIS.slice(0, 3).map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(msg.id, emoji)}
                        className="hover:scale-125 transition-transform text-xs cursor-pointer p-0.5"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* AI Typing Indicator */}
          {isAiTyping && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 text-[#8696A0] text-xs pl-1"
            >
              <div className="w-8 h-8 rounded-full bg-[#202C33] border border-[#2A3942] flex items-center justify-center text-sm shadow">
                🕊️
              </div>
              <div className="bg-[#202C33] px-4 py-2.5 rounded-2xl rounded-tl-xs border border-[#2A3942] flex items-center gap-2 shadow">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce [animation-delay:0.4s]" />
                <span className="text-[11px] font-bold text-[#E9EDEF] pl-1 tracking-wide">
                  Pastor is preparing scripture prayer...
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* ATTACHMENT PREVIEW DRAWER */}
        <AnimatePresence>
          {(attachedImage || attachedVideo || attachedRssFeed) && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-2 bg-[#202C33] border-t border-[#222D34] flex flex-wrap items-center gap-3 z-10 shrink-0"
            >
              {attachedRssFeed && (
                <div className="flex items-center gap-2.5 bg-[#111B21] border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs text-white shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                    <Rss className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0 max-w-[200px] sm:max-w-[320px]">
                    <span className="font-bold text-[11px] truncate text-amber-200">{attachedRssFeed.title}</span>
                    <span className="text-[9px] text-[#8696A0] truncate">{attachedRssFeed.source} • Ready to post & discuss</span>
                  </div>
                  <button 
                    onClick={() => setAttachedRssFeed(null)}
                    className="p-1 hover:bg-white/10 rounded-full text-[#AEBAC1] hover:text-white cursor-pointer ml-1"
                    title="Remove RSS Article"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {attachedImage && (
                <div className="flex items-center gap-2.5 bg-[#111B21] border border-[#2A3942] px-3 py-1.5 rounded-xl text-xs text-white">
                  <img src={attachedImage.url} alt="preview" className="w-8 h-8 rounded-lg object-cover border border-white/20" />
                  <div className="flex flex-col">
                    <span className="font-bold text-[11px] max-w-[150px] truncate">{attachedImage.name}</span>
                    <span className="text-[9px] text-[#8696A0]">{attachedImage.size}</span>
                  </div>
                  <button 
                    onClick={() => setAttachedImage(null)}
                    className="p-1 hover:bg-white/10 rounded-full text-[#AEBAC1] hover:text-white cursor-pointer ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {attachedVideo && (
                <div className="flex items-center gap-2.5 bg-[#111B21] border border-[#2A3942] px-3 py-1.5 rounded-xl text-xs text-white">
                  <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                    <Play className="w-4 h-4 fill-current" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[11px] max-w-[180px] truncate">{attachedVideo.title || attachedVideo.url}</span>
                    <span className="text-[9px] text-[#D4AF37] uppercase font-mono">{attachedVideo.type}</span>
                  </div>
                  <button 
                    onClick={() => setAttachedVideo(null)}
                    className="p-1 hover:bg-white/10 rounded-full text-[#AEBAC1] hover:text-white cursor-pointer ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* WHATSAPP EXPANDABLE BOTTOM INPUT BAR & SYNCHRONIZED TOOLBAR */}
        <div className="p-2 sm:p-3 bg-[#202C33] border-t border-[#222D34] flex flex-col shrink-0 z-20 relative shadow-2xl space-y-2">
          {/* Synchronized Composer Container */}
          <div className="bg-[#141E24] border border-[#2A3942] focus-within:border-[#D4AF37]/60 rounded-2xl p-2 sm:p-3 shadow-inner flex flex-col transition-all">
            {/* Expansive Multi-line Textarea */}
            <textarea 
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={2}
              placeholder={isRecordingVoice ? "Listening to your prayer... Speak freely." : "Type a prayer, question, or share what's on your heart... (Press Enter to send, Shift+Enter for new line)"}
              className="w-full bg-transparent text-[#E9EDEF] placeholder:text-[#8696A0] text-sm sm:text-base resize-none focus:outline-none leading-relaxed min-h-[52px] max-h-[260px] overflow-y-auto px-1 py-1"
            />

            {/* SYNCHRONIZED BOTTOM ROW: Prayer Symbol, RSS Feed, Attached Media & Send */}
            <div className="pt-2 mt-1 border-t border-[#222D34]/80 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
              {/* Left Action Toolbar */}
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                {/* 1. Prayer Symbol / Emotion Picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsMoodPickerOpen(!isMoodPickerOpen)}
                    title="Prayer Emotion & Symbol"
                    className="px-2 sm:px-2.5 py-1.5 bg-[#202C33] hover:bg-[#2A3942] border border-[#2A3942] hover:border-[#D4AF37]/50 rounded-xl text-xs text-[#E9EDEF] transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-xs"
                  >
                    <span className="text-base sm:text-lg leading-none">{selectedSymbol}</span>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-[#AEBAC1] hidden xs:inline">Prayer Symbol</span>
                    <ChevronDown className="w-3 h-3 text-[#8696A0]" />
                  </button>

                  {/* Mood Popup Tray */}
                  <AnimatePresence>
                    {isMoodPickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                        className="absolute bottom-12 left-0 bg-[#202C33] border border-[#2A3942] rounded-2xl p-3 shadow-2xl z-50 w-64 max-w-[calc(100vw-24px)] space-y-2"
                      >
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#8696A0] px-1">
                          Select Prayer Emotion
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {MOOD_SYMBOLS.map((s) => (
                            <button
                              key={s.label}
                              type="button"
                              onClick={() => {
                                setSelectedSymbol(s.icon);
                                setIsMoodPickerOpen(false);
                              }}
                              className={cn(
                                "p-2 rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer border",
                                selectedSymbol === s.icon 
                                  ? "bg-[#D4AF37]/30 border-[#D4AF37] text-white shadow-sm" 
                                  : "bg-[#111B21] border-[#2A3942] hover:bg-[#2A3942]"
                              )}
                            >
                              <span className="text-xl">{s.icon}</span>
                              <span className="text-[9px] text-[#AEBAC1] truncate">{s.label}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 2. Ministry RSS Feed Symbol */}
                <button
                  type="button"
                  onClick={() => {
                    setIsRssPickerOpen(true);
                    fetchInChatRssFeeds();
                  }}
                  title="Browse & Attach Ministry RSS Feed Devotional"
                  className="px-2 sm:px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-400/50 rounded-xl text-xs text-amber-300 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-xs"
                >
                  <Rss className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] sm:text-[11px] font-bold tracking-tight">RSS Feed</span>
                </button>

                {/* 3. Photo / Picture Attach Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach Photo / Image"
                  className="p-1.5 sm:px-2.5 sm:py-1.5 bg-[#202C33] hover:bg-[#2A3942] border border-[#2A3942] hover:border-blue-500/40 rounded-xl text-xs text-blue-300 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-xs"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[10px] sm:text-[11px] font-medium hidden sm:inline">Photo</span>
                </button>

                {/* 4. Video / Link Attach Button */}
                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(true)}
                  title="Attach Video / Clip Link"
                  className="p-1.5 sm:px-2.5 sm:py-1.5 bg-[#202C33] hover:bg-[#2A3942] border border-[#2A3942] hover:border-red-500/40 rounded-xl text-xs text-red-300 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-xs"
                >
                  <VideoIcon className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[10px] sm:text-[11px] font-medium hidden sm:inline">Video</span>
                </button>

                {/* 5. Voice Dictation */}
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  title={isRecordingVoice ? "Stop Voice Recording" : "Speak Voice Message"}
                  className={cn(
                    "p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 border shadow-xs",
                    isRecordingVoice 
                      ? "bg-red-500/20 border-red-500/50 text-red-300 animate-pulse" 
                      : "bg-[#202C33] hover:bg-[#2A3942] border-[#2A3942] text-emerald-300 hover:border-emerald-500/40"
                  )}
                >
                  {isRecordingVoice ? <MicOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                  <span className="text-[10px] sm:text-[11px] font-medium hidden sm:inline">{isRecordingVoice ? "Recording..." : "Voice"}</span>
                </button>

                {/* 6. Paperclip Menu */}
                <div className="relative">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <button
                    type="button"
                    onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                    title="More Attachments"
                    className="p-1.5 sm:p-2 bg-[#202C33] hover:bg-[#2A3942] border border-[#2A3942] rounded-xl text-[#AEBAC1] hover:text-white transition-all cursor-pointer flex items-center justify-center active:scale-95"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>

                  <AnimatePresence>
                    {isAttachMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                        className="absolute bottom-12 left-0 bg-[#202C33] border border-[#2A3942] rounded-2xl p-2 shadow-2xl z-50 w-56 max-w-[calc(100vw-24px)] space-y-1"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setIsRssPickerOpen(true);
                            fetchInChatRssFeeds();
                            setIsAttachMenuOpen(false);
                          }}
                          className="w-full px-3 py-2 rounded-xl hover:bg-[#2A3942] flex items-center gap-3 text-xs text-white transition-all cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center">
                            <Rss className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="font-semibold text-xs">Ministry RSS Feed</span>
                            <span className="text-[9px] text-[#8696A0]">Pick article to discuss</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            fileInputRef.current?.click();
                            setIsAttachMenuOpen(false);
                          }}
                          className="w-full px-3 py-2 rounded-xl hover:bg-[#2A3942] flex items-center gap-3 text-xs text-white transition-all cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                            <ImageIcon className="w-3.5 h-3.5" />
                          </div>
                          <span>Photo / Picture</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsVideoModalOpen(true);
                            setIsAttachMenuOpen(false);
                          }}
                          className="w-full px-3 py-2 rounded-xl hover:bg-[#2A3942] flex items-center gap-3 text-xs text-white transition-all cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                            <VideoIcon className="w-3.5 h-3.5" />
                          </div>
                          <span>Video / Link</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            toggleVoiceRecording();
                            setIsAttachMenuOpen(false);
                          }}
                          className="w-full px-3 py-2 rounded-xl hover:bg-[#2A3942] flex items-center gap-3 text-xs text-white transition-all cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <Mic className="w-3.5 h-3.5" />
                          </div>
                          <span>Voice Dictation</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right Action: Send Button with Multi-Line Hint */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[9px] text-[#8696A0] hidden lg:inline font-mono">
                  Enter ↵ to send • Shift+Enter for new line
                </span>
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={(!inputValue.trim() && !attachedImage && !attachedVideo && !attachedRssFeed) || isAiTyping}
                  className="px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:grayscale shrink-0 active:scale-95 shadow-md"
                  title="Send Message (Enter)"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* IN-CHAT RSS SELECTOR MODAL */}
      <AnimatePresence>
        {isRssPickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#202C33] border border-[#2A3942] rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[85vh] text-white overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 bg-[#111B21] border-b border-[#222D34] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-amber-500/20 text-amber-300 rounded-xl flex items-center justify-center shrink-0">
                    <Rss className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-[#E9EDEF] leading-tight truncate">Live Ministry RSS Feeds</h3>
                    <p className="text-[11px] sm:text-xs text-[#8696A0] mt-0.5 leading-normal truncate">Pick faith articles to discuss & pray in chat</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={fetchInChatRssFeeds}
                    className="p-2 hover:bg-[#202C33] rounded-lg text-[#AEBAC1] hover:text-white transition-all cursor-pointer shrink-0"
                    title="Refresh Feeds"
                  >
                    <RefreshCw className={cn("w-4 h-4", isLoadingRss && "animate-spin text-amber-400")} />
                  </button>
                  <button 
                    onClick={() => setIsRssPickerOpen(false)}
                    className="p-2 hover:bg-[#202C33] rounded-lg text-[#AEBAC1] hover:text-white cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="p-3 bg-[#182229] border-b border-[#222D34]">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#8696A0] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    value={rssSearchQuery}
                    onChange={(e) => setRssSearchQuery(e.target.value)}
                    placeholder="Search articles by title, topic, or source..."
                    className="w-full bg-[#111B21] text-xs text-[#E9EDEF] pl-10 pr-4 py-2.5 rounded-xl border border-[#2A3942] focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              {/* Feed List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 touch-scroll">
                {isLoadingRss ? (
                  <div className="py-12 text-center text-xs text-[#8696A0] space-y-2">
                    <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mx-auto" />
                    <p>Loading live Christian articles...</p>
                  </div>
                ) : liveRssFeeds.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#8696A0] space-y-3">
                    <Rss className="w-8 h-8 text-[#8696A0]/40 mx-auto" />
                    <p>No RSS articles currently loaded.</p>
                    <button
                      onClick={fetchInChatRssFeeds}
                      className="px-3 py-1.5 bg-amber-500/20 text-amber-300 rounded-lg font-bold"
                    >
                      Fetch Feeds
                    </button>
                  </div>
                ) : (
                  liveRssFeeds
                    .filter(item => 
                      !rssSearchQuery.trim() || 
                      item.title.toLowerCase().includes(rssSearchQuery.toLowerCase()) ||
                      item.source?.toLowerCase().includes(rssSearchQuery.toLowerCase()) ||
                      item.contentSnippet?.toLowerCase().includes(rssSearchQuery.toLowerCase())
                    )
                    .map((item) => (
                      <div 
                        key={item.id}
                        className="p-3.5 bg-[#111B21] hover:bg-[#182229] border border-[#2A3942] hover:border-amber-500/50 rounded-xl transition-all flex flex-col sm:flex-row gap-3.5 items-start sm:items-center justify-between"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {item.imageUrl ? (
                            <img 
                              src={item.imageUrl} 
                              alt={item.title} 
                              className="w-16 h-16 rounded-lg object-cover border border-white/10 shrink-0 hidden sm:block" 
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                              <Rss className="w-5 h-5" />
                            </div>
                          )}

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                                {item.source}
                              </span>
                              {item.category && (
                                <span className="text-[#8696A0] uppercase font-mono text-[9px]">
                                  {item.category}
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs sm:text-sm font-bold text-[#E9EDEF] line-clamp-1">
                              {item.title}
                            </h4>
                            {item.contentSnippet && (
                              <p className="text-[11px] text-[#8696A0] line-clamp-2">
                                {item.contentSnippet}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#222D34]">
                          <button
                            onClick={() => {
                              setAttachedRssFeed(item);
                              setInputValue(`Let's discuss and pray about this article: "${item.title}"`);
                              setIsRssPickerOpen(false);
                            }}
                            className="px-3 py-1.5 bg-[#202C33] hover:bg-[#2A3942] text-[#E9EDEF] border border-[#2A3942] rounded-lg text-xs font-semibold cursor-pointer transition-all"
                          >
                            Attach to Input
                          </button>
                          <button
                            onClick={() => {
                              setIsRssPickerOpen(false);
                              handleSend(`Let us pray and reflect on the message in this article: "${item.title}". Pastor, how can we apply this scripture in our lives?`, item);
                            }}
                            className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow-md transition-all flex items-center gap-1"
                          >
                            <Share2 className="w-3 h-3" /> Post to Chat
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-[#111B21] border-t border-[#222D34] flex items-center justify-between text-xs text-[#8696A0]">
                <span>Switch between RSS Hub and Sanctuary chat at any time.</span>
                {onOpenRssFeed && (
                  <button
                    onClick={() => {
                      setIsRssPickerOpen(false);
                      onOpenRssFeed();
                    }}
                    className="text-amber-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    Open Full RSS Newsroom <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIDEO MODAL */}
      <AnimatePresence>
        {isVideoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#202C33] border border-[#2A3942] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between border-b border-[#222D34] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center">
                    <VideoIcon className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold">Share Video Clip</h3>
                </div>
                <button 
                  onClick={() => setIsVideoModalOpen(false)}
                  className="p-1 hover:bg-[#374248] rounded-lg text-[#AEBAC1] hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider mb-1.5">
                    Option 1: Paste Video Link (YouTube, Vimeo, MP4)
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="url" 
                      value={videoInputUrl}
                      onChange={(e) => setVideoInputUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="flex-1 bg-[#111B21] border border-[#2A3942] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                    <button
                      onClick={handleAttachVideoUrl}
                      disabled={!videoInputUrl.trim()}
                      className="px-4 py-2.5 bg-[#00A884] hover:bg-[#009070] text-[#111B21] rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all disabled:opacity-40 cursor-pointer"
                    >
                      Attach
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 my-2">
                  <div className="h-px bg-[#222D34] flex-1" />
                  <span className="text-[10px] text-[#8696A0] uppercase font-mono">OR</span>
                  <div className="h-px bg-[#222D34] flex-1" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider mb-1.5">
                    Option 2: Upload Video File
                  </label>
                  <input 
                    type="file" 
                    ref={videoFileInputRef}
                    onChange={handleVideoFileChange}
                    accept="video/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => videoFileInputRef.current?.click()}
                    className="w-full py-3 border border-dashed border-[#2A3942] hover:border-[#D4AF37] rounded-xl bg-[#111B21] hover:bg-[#2A3942] text-white flex items-center justify-center gap-2 cursor-pointer transition-all font-bold text-xs"
                  >
                    <VideoIcon className="w-4 h-4 text-[#D4AF37]" /> Select Video File (.mp4, .webm, .mov)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL-SCREEN IMAGE LIGHTBOX */}
      <AnimatePresence>
        {lightboxImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="relative max-w-4xl w-full flex flex-col items-center">
              <div className="absolute -top-12 right-0 flex items-center gap-3">
                <a 
                  href={lightboxImage} 
                  download="SermonIQ-Prayer-Photo.jpg"
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
                <button 
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <img 
                src={lightboxImage} 
                alt="Enlarged prayer photo" 
                className="max-h-[85vh] max-w-full rounded-2xl border border-white/20 object-contain shadow-2xl"
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

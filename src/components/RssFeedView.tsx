import React, { useState, useEffect, useMemo } from 'react';
import { 
  Rss, 
  MessageSquare, 
  RefreshCw, 
  ExternalLink, 
  Search, 
  Sparkles, 
  Heart, 
  BookOpen, 
  Send, 
  Plus, 
  Check, 
  Filter, 
  Share2, 
  ChevronRight,
  TrendingUp,
  Globe,
  Clock,
  ChevronLeft,
  LayoutDashboard,
  X,
  Volume2,
  VolumeX,
  BookMarked,
  ArrowRight,
  Flame,
  Calendar,
  User,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RssFeedItem } from '../types';
import { cn } from '../lib/utils';

interface RssFeedViewProps {
  onSelectFeedForChat: (feedItem: RssFeedItem) => void;
  onOpenChat: () => void;
  onBackToDashboard?: () => void;
  onOpenDashboard?: () => void;
  onDonateClick?: () => void;
}

const CATEGORIES = [
  'All Feeds',
  'Devotionals',
  'Church News',
  'Spiritual Growth',
  'Culture & Faith',
  'Family & Marriage',
  'Outreach & Mission'
];

export function RssFeedView({ 
  onSelectFeedForChat, 
  onOpenChat, 
  onBackToDashboard,
  onOpenDashboard,
  onDonateClick 
}: RssFeedViewProps) {
  const [feeds, setFeeds] = useState<RssFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Feeds');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customFeedUrl, setCustomFeedUrl] = useState('');
  const [isAddingFeed, setIsAddingFeed] = useState(false);
  const [customFeedStatus, setCustomFeedStatus] = useState<string | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<Date>(new Date());
  
  // Selected Article for Mobile-Friendly Reader Sheet
  const [activeArticle, setActiveArticle] = useState<RssFeedItem | null>(null);
  const [readerFontSize, setReaderFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Fetch RSS feeds from backend proxy
  const fetchFeeds = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/news');
      if (res.ok) {
        const data = await res.json();
        setFeeds(Array.isArray(data) ? data : []);
        setLastSyncedTime(new Date());
      }
    } catch (err) {
      console.error('Failed to load RSS feeds:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeds();
  }, []);

  // Cleanup audio if active
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Handle Custom RSS URL Add
  const handleAddCustomFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFeedUrl.trim()) return;

    setCustomFeedStatus('Fetching and verifying RSS feed...');
    try {
      const res = await fetch('/api/rss/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: customFeedUrl.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          setFeeds(prev => [...data.items, ...prev]);
          setCustomFeedStatus(`Added ${data.items.length} items from ${data.title}!`);
          setTimeout(() => {
            setIsAddingFeed(false);
            setCustomFeedStatus(null);
            setCustomFeedUrl('');
          }, 1500);
        } else {
          setCustomFeedStatus('No items found in this feed.');
        }
      } else {
        const errData = await res.json();
        setCustomFeedStatus(errData.error || 'Failed to parse RSS feed.');
      }
    } catch (err: any) {
      setCustomFeedStatus(err.message || 'Error connecting to RSS URL.');
    }
  };

  // Universal Share / Copy Link
  const handleShare = async (item: RssFeedItem) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: `Check out this devotional: "${item.title}" from ${item.source}`,
          url: item.link,
        });
        return;
      } catch (err) {
        // User cancelled or fallback to clipboard
      }
    }
    navigator.clipboard.writeText(`${item.title}\n${item.link}`);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // TTS Read Aloud for Devotional
  const handleToggleSpeech = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
    }
  };

  // Filtered & Sorted feeds
  const filteredFeeds = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const result = feeds.filter(item => {
      const matchesSearch = 
        !query ||
        item.title.toLowerCase().includes(query) ||
        (item.contentSnippet && item.contentSnippet.toLowerCase().includes(query)) ||
        item.source.toLowerCase().includes(query) ||
        (item.category && item.category.toLowerCase().includes(query));

      const matchesCategory = 
        selectedCategory === 'All Feeds' || 
        (item.category && item.category.toLowerCase().includes(selectedCategory.toLowerCase())) ||
        (selectedCategory === 'Devotionals' && (item.title.toLowerCase().includes('peace') || item.title.toLowerCase().includes('prayer') || item.title.toLowerCase().includes('scripture') || item.title.toLowerCase().includes('god'))) ||
        (selectedCategory === 'Church News' && (item.source.includes('Post') || item.source.includes('Press') || item.source.includes('News')));

      return matchesSearch && matchesCategory;
    });

    return result.sort((a, b) => {
      const dateA = new Date(a.pubDate || 0).getTime();
      const dateB = new Date(b.pubDate || 0).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [feeds, searchQuery, selectedCategory, sortOrder]);

  return (
    <div className="min-h-screen bg-[#070B1E] text-white flex flex-col font-sans select-none pb-12">
      {/* TOP HEADER WITH CHAT SYNC TOGGLE */}
      <header className="border-b border-white/10 bg-[#0A0E2A]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 w-full sm:w-auto">
            {onBackToDashboard && (
              <button 
                onClick={onBackToDashboard}
                className="p-1.5 sm:p-2 hover:bg-white/5 rounded-lg transition-all text-white/50 hover:text-white cursor-pointer shrink-0"
                title="Back to Dashboard"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)] shrink-0">
              <Rss className="text-[#0A0E2A] w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.5]" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-white leading-tight truncate">
                  Ministry RSS Feed & Articles
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400/15 text-amber-300 border border-amber-400/30 inline-flex items-center gap-1 shrink-0">
                  <Globe className="w-2.5 h-2.5" /> Live Synced
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-white/50 font-mono mt-0.5 leading-normal truncate">
                Live Christian News • Devotionals • Discussion Hub
              </p>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto w-full sm:w-auto justify-end">
            <button
              onClick={fetchFeeds}
              disabled={isLoading}
              title="Refresh Feeds"
              className="p-1.5 sm:p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-xl transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isLoading && "animate-spin text-[#D4AF37]")} />
            </button>

            {/* Pastoral Chat Switcher Button (Compact & Finger-friendly) */}
            <button
              onClick={onOpenChat}
              className="px-2.5 sm:px-3 py-1.5 bg-[#00A884] hover:bg-[#009070] text-[#111B21] rounded-full text-[11px] font-bold uppercase tracking-wide transition-all cursor-pointer shadow-sm flex items-center gap-1.5 active:scale-95 shrink-0"
              title="Open Pastoral Care Chat"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-current shrink-0" />
              <span className="whitespace-nowrap">Pastoral Chat</span>
            </button>

            {onOpenDashboard && (
              <button
                onClick={onOpenDashboard}
                className="hidden md:flex px-2.5 sm:px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer items-center gap-1.5 shrink-0"
              >
                <LayoutDashboard className="w-3 h-3 text-[#D4AF37] shrink-0" />
                <span className="whitespace-nowrap">Dashboard</span>
              </button>
            )}

            {onDonateClick && (
              <button
                onClick={onDonateClick}
                className="hidden md:flex px-2.5 sm:px-3 py-1.5 bg-[#D4AF37]/20 border border-[#D4AF37]/40 hover:bg-[#D4AF37]/30 text-[#D4AF37] rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer items-center gap-1.5 shrink-0"
              >
                <Heart className="w-3 h-3 fill-current shrink-0" />
                <span className="whitespace-nowrap">Donation</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* SUB-HEADER / MOBILE-FRIENDLY CONTROLS & SEARCH */}
      <div className="bg-[#0A0E2A]/80 border-b border-white/5 py-3 sm:py-4 px-3.5 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          {/* Top Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Search Input Field */}
            <div className="relative flex-1 max-w-full sm:max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search devotionals, scripture, topics..."
                className="w-full bg-[#111638] border border-white/10 rounded-full pl-10 pr-9 py-2 text-sm sm:text-base text-white placeholder:text-white/40 focus:outline-none focus:border-[#D4AF37]/70 transition-all shadow-inner"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 rounded-full text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Actions & Sorting */}
            <div className="flex items-center gap-2 justify-between sm:justify-end">
              <div className="flex items-center gap-1.5 bg-[#111638] border border-white/10 rounded-full px-2.5 py-1 text-xs text-white/70">
                <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="bg-transparent text-white/90 text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="newest" className="bg-[#111638] text-white">Latest Feeds</option>
                  <option value="oldest" className="bg-[#111638] text-white">Oldest Feeds</option>
                </select>
              </div>

              <button
                onClick={() => setIsAddingFeed(!isAddingFeed)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border",
                  isAddingFeed 
                    ? "bg-amber-500/20 text-amber-300 border-amber-400/40" 
                    : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10"
                )}
              >
                <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="whitespace-nowrap">{isAddingFeed ? 'Close' : 'Add Custom RSS'}</span>
              </button>
            </div>
          </div>

          {/* Custom RSS Input Expansion */}
          <AnimatePresence>
            {isAddingFeed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <form onSubmit={handleAddCustomFeed} className="bg-[#111638] border border-amber-400/30 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center">
                  <div className="flex-1 relative">
                    <Rss className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400" />
                    <input
                      type="url"
                      required
                      value={customFeedUrl}
                      onChange={(e) => setCustomFeedUrl(e.target.value)}
                      placeholder="Enter church RSS feed URL (e.g. https://yourchurch.org/feed)"
                      className="w-full bg-[#0A0E2A] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:brightness-110 text-[#0A0E2A] font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0 shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Import RSS</span>
                  </button>
                </form>
                {customFeedStatus && (
                  <p className="text-xs text-amber-300 font-mono mt-1.5 px-2">
                    {customFeedStatus}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile-Friendly Category Pills Strip (Swipeable) */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer border whitespace-nowrap active:scale-95",
                    isSelected
                      ? "bg-[#D4AF37] text-[#0A0E2A] border-[#D4AF37] font-bold shadow-[0_0_10px_rgba(212,175,55,0.35)]"
                      : "bg-[#111638] text-white/60 hover:text-white border-white/5 hover:border-white/20"
                  )}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* FEED CARDS GRID */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8">
        {isLoading && feeds.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center animate-spin">
              <RefreshCw className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-sm font-semibold text-white/70">Syncing live Christian ministry feeds...</p>
          </div>
        ) : filteredFeeds.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-[#0E1538]/40 border border-white/5 rounded-2xl sm:rounded-3xl p-6 sm:p-8">
            <BookOpen className="w-10 h-10 text-white/30 mx-auto" />
            <h3 className="text-base font-bold text-white">No feed articles found</h3>
            <p className="text-xs text-white/50 max-w-md mx-auto leading-relaxed">
              Try adjusting your search query or switch categories to browse other ministry channels.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All Feeds');
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-full transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredFeeds.map((item, idx) => (
              <motion.div
                key={item.id || idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                className="bg-[#0E163B] border border-white/10 hover:border-[#D4AF37]/50 rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg transition-all duration-200 group"
              >
                <div>
                  {/* Article Thumbnail Image (if present) */}
                  {item.imageUrl && (
                    <div 
                      onClick={() => setActiveArticle(item)}
                      className="relative h-40 sm:h-44 w-full overflow-hidden bg-[#0A0E2A] cursor-pointer"
                    >
                      <img 
                        src={item.imageUrl} 
                        alt={item.title} 
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0E163B] via-transparent to-black/30" />
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-black/70 backdrop-blur-md text-amber-300 border border-amber-400/30">
                        {item.category || 'Devotional'}
                      </span>
                    </div>
                  )}

                  {/* Header & Source */}
                  <div className="p-4 sm:p-5 pb-3">
                    {!item.imageUrl && (
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-400/10 text-amber-300 border border-amber-400/20">
                          {item.category || 'Devotional'}
                        </span>
                        <span className="text-[10px] text-white/40 font-mono">
                          {item.pubDate ? new Date(item.pubDate).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                    )}

                    <div className="text-[11px] font-bold text-[#D4AF37] tracking-wider uppercase mb-1 flex items-center gap-1.5">
                      <Rss className="w-3 h-3 shrink-0" />
                      <span className="truncate">{item.source}</span>
                    </div>

                    <h3 
                      onClick={() => setActiveArticle(item)}
                      className="text-sm sm:text-base font-bold text-white leading-snug group-hover:text-amber-200 transition-colors line-clamp-2 cursor-pointer"
                    >
                      {item.title}
                    </h3>

                    {item.contentSnippet && (
                      <p className="text-xs text-white/60 mt-2 line-clamp-3 leading-relaxed">
                        {item.contentSnippet}
                      </p>
                    )}
                  </div>
                </div>

                {/* BOTTOM ACTION BAR */}
                <div className="p-3.5 sm:p-4 pt-2 border-t border-white/5 bg-[#090E28]/70 flex flex-col gap-2">
                  {/* Quick Reader Button for full description */}
                  <button
                    onClick={() => setActiveArticle(item)}
                    className="w-full py-1.5 px-3 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-white/5"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Read Description & Devotional</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60 ml-auto" />
                  </button>

                  <div className="flex items-center gap-2">
                    {/* PRIMARY ACTION: POST TO CHAT FOR DISCUSSION */}
                    <button
                      onClick={() => onSelectFeedForChat(item)}
                      className="flex-1 py-2 px-3 bg-[#00A884] hover:bg-[#009070] text-[#091119] rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <MessageSquare className="w-3.5 h-3.5 fill-current shrink-0" />
                      <span className="truncate">Discuss in Chat</span>
                    </button>

                    {/* External Article Link */}
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      title="Read Original Source"
                      className="p-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-xs transition-all border border-white/10 cursor-pointer shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {/* Share / Copy Link */}
                    <button
                      onClick={() => handleShare(item)}
                      title="Share Article"
                      className="p-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-xs transition-all border border-white/10 cursor-pointer shrink-0"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* MOBILE-FRIENDLY FULL ARTICLE DESCRIPTION & DEVOTIONAL READER MODAL / DRAWER */}
      <AnimatePresence>
        {activeArticle && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[#0E163B] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col text-white overflow-hidden shadow-2xl"
            >
              {/* Modal Top Bar */}
              <div className="p-4 bg-[#0A0E2A] border-b border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                    <BookMarked className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1 truncate">
                      {activeArticle.source} • {activeArticle.category || 'Devotional Reflection'}
                    </span>
                    <p className="text-xs text-white/50 font-mono truncate">
                      {activeArticle.pubDate ? new Date(activeArticle.pubDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent Feed'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* TTS Speech Reader Button */}
                  <button
                    onClick={() => handleToggleSpeech(`${activeArticle.title}. ${activeArticle.contentSnippet || ''}`)}
                    className={cn(
                      "p-2 rounded-xl text-xs transition-all cursor-pointer border",
                      isPlayingAudio
                        ? "bg-amber-400 text-[#0A0E2A] border-amber-400 font-bold animate-pulse"
                        : "bg-white/5 hover:bg-white/10 text-white/70 border-white/10"
                    )}
                    title={isPlayingAudio ? "Stop Audio" : "Listen to Devotional"}
                  >
                    {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  {/* Font Size Selector */}
                  <button
                    onClick={() => {
                      if (readerFontSize === 'normal') setReaderFontSize('large');
                      else if (readerFontSize === 'large') setReaderFontSize('xlarge');
                      else setReaderFontSize('normal');
                    }}
                    className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-xs font-mono border border-white/10 transition-all cursor-pointer"
                    title="Change font size"
                  >
                    A{readerFontSize === 'normal' ? '1' : readerFontSize === 'large' ? '2' : '3'}
                  </button>

                  {/* Close button */}
                  <button
                    onClick={() => {
                      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                      setIsPlayingAudio(false);
                      setActiveArticle(null);
                    }}
                    className="p-2 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body / Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
                {activeArticle.imageUrl && (
                  <div className="relative h-48 sm:h-56 w-full rounded-2xl overflow-hidden bg-black/40 shadow-inner">
                    <img 
                      src={activeArticle.imageUrl} 
                      alt={activeArticle.title}
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0E163B] via-transparent to-transparent" />
                  </div>
                )}

                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
                    {activeArticle.title}
                  </h2>
                  {activeArticle.creator && (
                    <p className="text-xs text-white/50 mt-1 flex items-center gap-1.5">
                      <User className="w-3 h-3 text-amber-400" />
                      <span>By {activeArticle.creator}</span>
                    </p>
                  )}
                </div>

                {/* Article Description Body */}
                <div className={cn(
                  "text-white/80 leading-relaxed space-y-3 font-normal",
                  readerFontSize === 'normal' && "text-sm",
                  readerFontSize === 'large' && "text-base sm:text-lg",
                  readerFontSize === 'xlarge' && "text-lg sm:text-xl"
                )}>
                  {activeArticle.contentSnippet ? (
                    <p className="whitespace-pre-line leading-relaxed">
                      {activeArticle.contentSnippet}
                    </p>
                  ) : (
                    <p className="italic text-white/50">
                      Summary preview not available in RSS feed. Tap "Read Original Article" below to view complete text.
                    </p>
                  )}
                </div>

                {/* AI-Powered Pastoral Reflection & Scripture Prompt Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121E4B] to-[#0A1230] border border-amber-400/30 space-y-2.5 shadow-lg">
                  <div className="flex items-center gap-2 text-[#D4AF37] font-bold text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    <span>Pastoral Prayer & Discussion Starter</span>
                  </div>
                  <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed italic">
                    "{activeArticle.discussionPrompt || `How does this message reflect God's call to love, peace, and spiritual renewal today?`}"
                  </p>
                  <p className="text-[11px] text-white/50 leading-normal">
                    Bring this article directly into the SermonIQ Pastoral Care Chat to receive personalized scripture pairings and guided prayers.
                  </p>
                </div>
              </div>

              {/* Modal Sticky Bottom Action Footer */}
              <div className="p-3.5 sm:p-4 bg-[#0A0E2A] border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <button
                  onClick={() => {
                    const item = activeArticle;
                    setActiveArticle(null);
                    onSelectFeedForChat(item);
                  }}
                  className="flex-1 py-2.5 px-4 bg-[#00A884] hover:bg-[#009070] text-[#091119] rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-95"
                >
                  <MessageSquare className="w-4 h-4 fill-current shrink-0" />
                  <span>Discuss in Pastoral Chat</span>
                </button>

                <div className="flex items-center gap-2">
                  <a
                    href={activeArticle.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-initial py-2.5 px-3.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-xl text-xs font-semibold transition-all border border-white/10 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Original Source</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>

                  <button
                    onClick={() => handleShare(activeArticle)}
                    className="p-2.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-xl text-xs transition-all border border-white/10 cursor-pointer shrink-0"
                    title="Share Article"
                  >
                    {copiedId === activeArticle.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


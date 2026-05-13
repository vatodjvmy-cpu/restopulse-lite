import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, RadialBarChart, RadialBar
} from 'recharts';
import { 
  Menu, X, AlertTriangle, CheckCircle, MessageSquare, Star, Users, 
  Bell, Settings, Plus, Upload, RefreshCw, Send, ChevronDown, MapPin,
  Sliders, FileText, Image as ImageIcon, Mail, User, Shield, Crown,
  Edit, Trash2, Eye, EyeOff, Filter, Search, Download, Share2
} from 'lucide-react';
import { format, subDays } from 'date-fns';

import { Branch, Review, ResponseTemplate, StaffMember, Notification, DashboardStats } from './types';
import { storage, getDefaultSettings } from './utils/storage';
import { 
  processReview, 
  generateResponseDraft, 
  calculateStats, 
  fetchDineplanReviews,
  autoScanAllBranches,
  filterReviewsByDate,
  findMatchingTemplate 
} from './utils/reviewEngine';

// NeoCard Component with gradient border
const NeoCard = ({ children, className = '', critical = false, gradient = 'blue-purple-pink' }: { 
  children: React.ReactNode; className?: string; critical?: boolean; gradient?: string 
}) => {
  const gradientClasses: Record<string, string> = {
    'blue-purple-pink': 'shadow-[0_0_0_1px_rgba(59,130,246,0.3),0_0_0_2px_rgba(139,92,246,0.2),0_0_0_3px_rgba(236,72,153,0.1)]',
    'cyan-blue': 'shadow-[0_0_0_1px_rgba(6,182,212,0.3),0_0_0_2px_rgba(59,130,246,0.2)]',
    'purple-pink': 'shadow-[0_0_0_1px_rgba(139,92,246,0.3),0_0_0_2px_rgba(236,72,153,0.2)]',
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 border border-slate-700/50 ${gradientClasses[gradient] || ''} ${critical ? 'neo-critical border-red-500/50' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
};

// Glowing Button Component
const GlowButton = ({ children, onClick, className = '', variant = 'cyan', disabled = false }: { 
  children: React.ReactNode; onClick?: () => void; className?: string; variant?: 'cyan' | 'blue' | 'red'; disabled?: boolean 
}) => {
  const variants: Record<string, string> = {
    cyan: 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.4)]',
    blue: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.4)]',
    red: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.4)]',
  };
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl font-medium transition-all ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      {children}
    </motion.button>
  );
};

// Rating Stars Component
const RatingStars = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(star => (
      <Star key={star} size={14} className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'} />
    ))}
  </div>
);

// Critical Badge with Flashing Animation
const CriticalBadge = ({ flashing = false }: { flashing?: boolean }) => (
  <motion.span 
    animate={flashing ? { boxShadow: ['0 0 0 0 rgba(239,68,68,0.4)', '0 0 0 12px rgba(239,68,68,0)', '0 0 0 0 rgba(239,68,68,0.4)'] } : {}}
    transition={{ duration: 2, repeat: flashing ? Infinity : 0 }}
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/30"
  >
    <AlertTriangle size={12} />
    URGENT
  </motion.span>
);

// Main App Component
export default function App() {
  // State Management
  const [branches, setBranches] = useState<Branch[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState(getDefaultSettings());
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reviews' | 'staff' | 'settings'>('dashboard');
  const [showAddReview, setShowAddReview] = useState(false);
  const [newReview, setNewReview] = useState<Partial<Review>>({});
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [responseDraft, setResponseDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [autoScanEnabled, setAutoScanEnabled] = useState(false);
  const [scanProgress, setScanProgress] = useState<string>('');
  const [criticalReviews, setCriticalReviews] = useState<Review[]>([]);
  const [responseMode, setResponseMode] = useState<'auto' | 'manual'>('auto');
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const [emailAddress, setEmailAddress] = useState('john@lifegrandcafe.com');
  const [authorizedResponders, setAuthorizedResponders] = useState([
    { email: 'john@lifegrandcafe.com', role: 'owner', canEdit: true, canRespond: true },
    { email: 'jeanel@lifegrandcafe.com', role: 'responder', canEdit: false, canRespond: true },
  ]);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string; date: string }[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    const loadData = () => {
      setBranches(storage.getBranches());
      setReviews(storage.getReviews());
      setTemplates(storage.getTemplates());
      setStaff(storage.getStaff());
      setNotifications(storage.getNotifications());
      setSettings(storage.getSettings());
      setAutoScanEnabled(storage.getSettings().autoScanEnabled);
    };
    loadData();
  }, []);

  // Save data when it changes
  useEffect(() => { storage.setReviews(reviews); }, [reviews]);
  useEffect(() => { storage.setTemplates(templates); }, [templates]);
  useEffect(() => { storage.setStaff(staff); }, [staff]);
  useEffect(() => { storage.setNotifications(notifications); }, [notifications]);
  useEffect(() => { storage.setSettings(settings); }, [settings]);

  // Auto-scan polling effect
  useEffect(() => {
    let interval: ReturnType<typeof setTimeout> | undefined;
    if (autoScanEnabled) {
      interval = setInterval(async () => {
        setScanProgress('🔄 Auto-scanning reviews...');
        const result = await autoScanAllBranches(branches, setScanProgress, (newReviews) => {
          if (newReviews.length > 0) {
            const critical = newReviews.filter(r => r.isCritical);
            if (critical.length > 0) {
              setCriticalReviews(prev => [...critical, ...prev].slice(0, 10));
              critical.forEach(review => {
                const notification: Notification = {
                  id: `auto-${Date.now()}-${Math.random()}`,
                  type: 'critical_review',
                  message: `🚨 Critical: ${review.author} - ${review.title}`,
                  reviewId: review.id,
                  timestamp: new Date().toISOString(),
                  read: false,
                };
                setNotifications(prev => [notification, ...prev]);
              });
            }
            setReviews(prev => [...newReviews, ...prev]);
          }
        });
        setScanProgress(result.success ? '✓ Scan complete' : `⚠ ${result.errors.length} errors`);
        setTimeout(() => setScanProgress(''), 4000);
      }, settings.scanIntervalMinutes * 60000);
    }
    return () => clearInterval(interval);
  }, [autoScanEnabled, branches, settings.scanIntervalMinutes]);

  // Filter reviews to selected branch + 7 days
  const filteredReviews = filterReviewsByDate(
    reviews.filter(r => selectedBranch === 'all' || r.branchId === selectedBranch),
    settings.reviewAgeDays
  );

  // Calculate stats
  const stats = calculateStats(
    selectedBranch === 'all' ? reviews : reviews.filter(r => r.branchId === selectedBranch),
    branches
  );

  // Chart data
  const sentimentData = [
    { name: 'Positive', value: stats.sentimentBreakdown.positive, color: '#22c55e' },
    { name: 'Neutral', value: stats.sentimentBreakdown.neutral, color: '#f59e0b' },
    { name: 'Negative', value: stats.sentimentBreakdown.negative, color: '#ef4444' },
  ];

  const platformData = Object.entries(stats.reviewsByPlatform).map(([platform, count]) => ({
    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
    count,
  }));

  const trendData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayReviews = reviews.filter(r => 
      format(new Date(r.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    return {
      date: format(date, 'MMM d'),
      reviews: dayReviews.length,
      rating: dayReviews.length > 0 
        ? parseFloat((dayReviews.reduce((s, r) => s + r.rating, 0) / dayReviews.length).toFixed(1))
        : 0,
    };
  });

  // Handlers
  const handleAddReview = () => {
    if (!newReview.branchId || !newReview.content) return;
    const review = processReview({
      id: `review-${Date.now()}`,
      branchId: newReview.branchId,
      platform: newReview.platform || 'manual',
      rating: newReview.rating || 3,
      title: newReview.title || '',
      content: newReview.content,
      author: newReview.author || 'Anonymous',
      date: new Date().toISOString(),
      staffMentioned: [],
    } as any, settings.criticalKeywords);
    
    setReviews(prev => [review, ...prev]);
    if (review.isCritical) {
      setCriticalReviews(prev => [review, ...prev].slice(0, 10));
      const notification: Notification = {
        id: `notif-${Date.now()}`,
        type: 'critical_review',
        message: `🚨 Critical review from ${review.author}`,
        reviewId: review.id,
        timestamp: new Date().toISOString(),
        read: false,
      };
      setNotifications(prev => [notification, ...prev]);
    }
    setShowAddReview(false);
    setNewReview({});
  };

  const handleGenerateResponse = (review: Review) => {
    const draft = generateResponseDraft(review, templates.filter(t => t.branchId === review.branchId), settings.contactEmail, settings.contactPhone);
    setResponseDraft(draft);
    setSelectedReview(review);
  };

  const handleSendResponse = async () => {
    if (!selectedReview) return;
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 600));
    setReviews(prev => prev.map(r => 
      r.id === selectedReview.id 
        ? { ...r, responded: true, responseText: responseDraft, responseDate: new Date().toISOString() }
        : r
    ));
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      type: 'response_sent',
      message: `✅ Response sent to ${selectedReview.author}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [notification, ...prev]);
    setSelectedReview(null);
    setResponseDraft('');
    setLoading(false);
  };

  const handleSeedData = () => {
    const data = storage.seedDemoData();
    setBranches(data.branches);
    setReviews(data.reviews);
    setTemplates(data.templates);
    setStaff(data.staff);
    setSettings(data.settings);
    setCriticalReviews(data.reviews.filter(r => r.isCritical));
  };

  const handleFetchReviews = async (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;
    setLoading(true);
    const fetched = await fetchDineplanReviews(branch);
    const newReviews = fetched.map(f => processReview({
      id: `fetched-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      branchId: branch.id,
      platform: 'dineplan',
      rating: f.rating || 3,
      title: f.title || '',
      content: f.content || '',
      author: f.author || 'Dineplan User',
      date: new Date().toISOString(),
      staffMentioned: [],
    } as any, settings.criticalKeywords));
    if (newReviews.length > 0) {
      setReviews(prev => [...newReviews, ...prev]);
      const critical = newReviews.filter(r => r.isCritical);
      if (critical.length > 0) {
        setCriticalReviews(prev => [...critical, ...prev].slice(0, 10));
        critical.forEach(review => {
          const notification: Notification = {
            id: `notif-${Date.now()}-${Math.random()}`,
            type: 'critical_review',
            message: `🚨 Critical: "${review.title}"`,
            reviewId: review.id,
            timestamp: new Date().toISOString(),
            read: false,
          };
          setNotifications(prev => [notification, ...prev]);
        });
      }
    }
    setLoading(false);
    storage.setLastSync(new Date().toISOString());
  };

  const handleAutoScanToggle = () => {
    const enabled = !autoScanEnabled;
    setAutoScanEnabled(enabled);
    setSettings(prev => ({ ...prev, autoScanEnabled: enabled }));
    if (enabled) {
      setScanProgress('🔄 Starting auto-scan...');
      autoScanAllBranches(branches, setScanProgress, (newReviews) => {
        if (newReviews.length > 0) {
          const critical = newReviews.filter(r => r.isCritical);
          if (critical.length > 0) {
            setCriticalReviews(prev => [...critical, ...prev].slice(0, 10));
            critical.forEach(review => {
              const notification: Notification = {
                id: `auto-${Date.now()}-${Math.random()}`,
                type: 'critical_review',
                message: `🚨 Auto-detected: ${review.author}`,
                reviewId: review.id,
                timestamp: new Date().toISOString(),
                read: false,
              };
              setNotifications(prev => [notification, ...prev]);
            });
          }
          setReviews(prev => [...newReviews, ...prev]);
        }
        setTimeout(() => setScanProgress(''), 3000);
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'excel' | 'pdf' | 'image') => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFiles(prev => [...prev, {
        name: file.name,
        type: type,
        date: new Date().toLocaleDateString(),
      }]);
    }
  };

  const handleSendEmailReport = () => {
    const subject = encodeURIComponent('RestoPulse Analytics Report');
    const body = encodeURIComponent(`
RestoPulse - Weekly Analytics Report
Generated: ${new Date().toLocaleDateString()}

📊 Key Metrics:
• Total Reviews (7d): ${stats.totalReviews}
• Average Rating: ${stats.averageRating}⭐
• Response Rate: ${stats.responseRate}%
• Critical Alerts: ${stats.criticalCount}

📈 Sentiment Breakdown:
• Positive: ${stats.sentimentBreakdown.positive}
• Neutral: ${stats.sentimentBreakdown.neutral}
• Negative: ${stats.sentimentBreakdown.negative}

🏢 Reviews by Branch:
${branches.map(b => `• ${b.shortName}: ${stats.reviewsByBranch[b.id] || 0}`).join('\n')}

View full dashboard: https://restopulse-lite.pages.dev
    `.trim());
    
    window.location.href = `mailto:${emailAddress}?subject=${subject}&body=${body}`;
    setShowEmailPopup(false);
  };

  const addAuthorizedResponder = (email: string) => {
    if (email && !authorizedResponders.find(r => r.email === email)) {
      setAuthorizedResponders(prev => [...prev, { 
        email, 
        role: 'responder', 
        canEdit: false, 
        canRespond: true 
      }]);
    }
  };

  const removeAuthorizedResponder = (email: string) => {
    setAuthorizedResponders(prev => prev.filter(r => r.email !== email));
  };

  // Sidebar Navigation Items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart size={18} /> },
    { id: 'reviews', label: 'Reviews', icon: <MessageSquare size={18} /> },
    { id: 'staff', label: 'Staff', icon: <Users size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Global Styles for Flashing Animation */}
      <style>{`
        @keyframes criticalPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4), 0 0 0 1px rgba(59,130,246,0.3), 0 0 0 2px rgba(139,92,246,0.2), 0 0 0 3px rgba(236,72,153,0.1); }
          50% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0), 0 0 0 1px rgba(59,130,246,0.3), 0 0 0 2px rgba(139,92,246,0.2), 0 0 0 3px rgba(236,72,153,0.1); }
        }
        .neo-critical {
          animation: criticalPulse 2s infinite;
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #1e293b; }
        ::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #64748b; }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger */}
            <motion.button 
              whileTap={{ scale: 0.95 }}
              className="md:hidden p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </motion.button>
            
            <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              RestoPulse
            </h1>
            <span className="hidden sm:inline text-slate-400 text-xs">Life Grand Cafe</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Branch Filter */}
            <div className="relative hidden sm:block">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none cursor-pointer"
              >
                <option value="all">All Branches</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.shortName}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            
            {/* Mobile Branch Pills */}
            <div className="flex sm:hidden gap-1">
              {['all', 'waterfall', 'mos', 'vaw'].map(branch => (
                <button
                  key={branch}
                  onClick={() => setSelectedBranch(branch)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedBranch === branch 
                      ? 'bg-cyan-500/30 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.4)]' 
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                  }`}
                >
                  {branch === 'all' ? 'All' : branch === 'waterfall' ? 'WF' : branch === 'mos' ? 'MOS' : 'V&A'}
                </button>
              ))}
            </div>
            
            {/* Notifications */}
            <motion.button 
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:text-cyan-400 transition-colors relative"
            >
              <Bell size={18} />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center border-2 border-slate-900">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </motion.button>
            
            {/* Add Review */}
            <GlowButton onClick={() => setShowAddReview(true)} className="hidden sm:flex items-center gap-1.5 text-sm">
              <Plus size={14} />
              <span>Add</span>
            </GlowButton>
          </div>
        </div>
        
        {/* Scan Progress Toast */}
        <AnimatePresence>
          {scanProgress && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-4 py-2 bg-cyan-500/10 text-cyan-400 text-xs text-center border-b border-cyan-500/20"
            >
              {scanProgress}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Sidebar */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 z-50 p-4 md:hidden overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-slate-200">Menu</h2>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X size={18} />
                </motion.button>
              </div>
              
              {/* Navigation */}
              <nav className="space-y-1 mb-6">
                {navItems.map(item => (
                  <motion.button
                    key={item.id}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setActiveTab(item.id as any); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      activeTab === item.id 
                        ? 'bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-500/30' 
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    {item.icon}
                    <span className="text-sm font-medium">{item.label}</span>
                  </motion.button>
                ))}
              </nav>
              
              {/* Critical Alerts Preview */}
              {criticalReviews.length > 0 && (
                <NeoCard gradient="purple-pink" className="p-3">
                  <h3 className="font-medium text-red-400 text-xs flex items-center gap-1.5 mb-2">
                    <AlertTriangle size={12} />
                    Critical ({criticalReviews.length})
                  </h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {criticalReviews.slice(0, 3).map(review => (
                      <div 
                        key={review.id}
                        className="text-xs p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 cursor-pointer hover:bg-slate-700/50 transition-colors"
                        onClick={() => { setSelectedReview(review); handleGenerateResponse(review); setSidebarOpen(false); }}
                      >
                        <p className="font-medium text-slate-200 truncate">{review.title}</p>
                        <p className="text-slate-400 truncate">{review.content}</p>
                      </div>
                    ))}
                  </div>
                </NeoCard>
              )}
              
              {/* Auto-Scan Toggle */}
              <div className="mt-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Auto-Scan</span>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAutoScanToggle}
                    className={`relative w-10 h-5 rounded-full transition-colors ${autoScanEnabled ? 'bg-cyan-500' : 'bg-slate-700'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${autoScanEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-20 lg:w-56 bg-slate-900/80 backdrop-blur-xl border-r border-slate-700/50 fixed left-0 top-16 bottom-0 z-30">
        <nav className="flex-1 py-4 px-2 lg:px-4 space-y-1">
          {navItems.map(item => (
            <motion.button
              key={item.id}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-3 lg:px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-500/30' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              {item.icon}
              <span className="hidden lg:inline text-sm font-medium">{item.label}</span>
            </motion.button>
          ))}
        </nav>
        
        {/* Auto-Scan Toggle (Desktop) */}
        <div className="p-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between">
            <span className="hidden lg:inline text-xs text-slate-400">Auto-Scan</span>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleAutoScanToggle}
              className={`relative w-10 h-5 rounded-full transition-colors ${autoScanEnabled ? 'bg-cyan-500' : 'bg-slate-700'}`}
              title="Toggle auto-scan"
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${autoScanEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </motion.button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`pt-4 pb-8 px-4 transition-all duration-300 ${sidebarOpen ? 'md:ml-20 lg:ml-56' : 'md:ml-20 lg:ml-56'}`}>
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            
            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <NeoCard gradient="blue-purple-pink" className="text-center p-3">
                    <div className="text-2xl font-bold text-cyan-400">{stats.averageRating}</div>
                    <div className="text-slate-400 text-xs mt-0.5">Avg Rating</div>
                    <RatingStars rating={Math.round(stats.averageRating)} />
                  </NeoCard>
                  <NeoCard gradient="blue-purple-pink" className="text-center p-3">
                    <div className="text-2xl font-bold text-blue-400">{stats.totalReviews}</div>
                    <div className="text-slate-400 text-xs mt-0.5">Reviews (7d)</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{branches.length} branches</div>
                  </NeoCard>
                  <NeoCard gradient="blue-purple-pink" className="text-center p-3">
                    <div className="text-2xl font-bold text-green-400">{stats.responseRate}%</div>
                    <div className="text-slate-400 text-xs mt-0.5">Response Rate</div>
                  </NeoCard>
                  <NeoCard gradient="blue-purple-pink" critical={stats.criticalCount > 0} className="text-center p-3">
                    <div className={`text-2xl font-bold ${stats.criticalCount > 0 ? 'text-red-400' : 'text-slate-200'}`}>{stats.criticalCount}</div>
                    <div className="text-slate-400 text-xs mt-0.5 flex items-center justify-center gap-1">
                      <AlertTriangle size={12} /> Critical
                    </div>
                    {stats.criticalCount > 0 && <div className="text-[10px] text-red-400 mt-0.5 animate-pulse">Action Required</div>}
                  </NeoCard>
                </div>

                {/* Charts Row */}
                <div className="grid lg:grid-cols-2 gap-4">
                  {/* Sentiment Chart */}
                  <NeoCard gradient="cyan-blue" className="p-4">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-slate-200">
                      <MessageSquare size={16} className="text-cyan-400" />
                      Sentiment Analysis
                    </h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                            {sentimentData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-2">
                      {sentimentData.map(item => (
                        <div key={item.name} className="flex items-center gap-1.5 text-xs">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-400">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </NeoCard>

                  {/* Platform Chart */}
                  <NeoCard gradient="cyan-blue" className="p-4">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-slate-200">
                      <Star size={16} className="text-blue-400" />
                      Reviews by Platform
                    </h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={platformData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis type="number" stroke="#64748b" fontSize={10} />
                          <YAxis dataKey="platform" type="category" stroke="#64748b" fontSize={10} width={60} />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                          <Bar dataKey="count" fill="url(#platformGradient)" radius={[0, 4, 4, 0]} />
                          <defs>
                            <linearGradient id="platformGradient" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#06b6d4" />
                              <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </NeoCard>
                </div>

                {/* Critical Alerts + Trend */}
                <div className="grid lg:grid-cols-3 gap-4">
                  {/* Critical Reviews Box */}
                  <NeoCard gradient="purple-pink" critical className="lg:col-span-1 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm flex items-center gap-2 text-red-400">
                        <AlertTriangle size={16} />
                        Critical Reviews
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">7d</span>
                    </div>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {criticalReviews.length === 0 ? (
                        <div className="text-center py-6 text-slate-500">
                          <CheckCircle size={24} className="mx-auto mb-2 text-green-400" />
                          <p className="text-xs">No critical alerts</p>
                        </div>
                      ) : (
                        criticalReviews.map(review => {
                          const branch = branches.find(b => b.id === review.branchId);
                          return (
                            <motion.div 
                              key={review.id}
                              whileHover={{ scale: 1.02 }}
                              className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 cursor-pointer hover:bg-red-500/10 transition-colors neo-critical"
                              onClick={() => { setSelectedReview(review); handleGenerateResponse(review); }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-300`}>
                                      {branch?.shortName}
                                    </span>
                                    <span className="text-[10px] text-slate-500">{review.platform.toUpperCase()}</span>
                                  </div>
                                  <p className="text-xs font-medium text-slate-200 mb-0.5">{review.title}</p>
                                  <p className="text-[10px] text-slate-400 line-clamp-2">{review.content}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <RatingStars rating={review.rating} />
                                    {review.criticalKeywords.length > 0 && (
                                      <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                        {review.criticalKeywords[0]}
                                      </span>
                                    )}
                                  </div>
                                  {!review.responded && (
                                    <GlowButton variant="red" className="text-[10px] py-1 mt-2 w-full">
                                      Respond →
                                    </GlowButton>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </NeoCard>

                  {/* 7-Day Trend */}
                  <NeoCard gradient="cyan-blue" className="lg:col-span-2 p-4">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-slate-200">
                      <RefreshCw size={16} className="text-cyan-400" />
                      7-Day Review Trend
                    </h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                          <YAxis yAxisId="left" stroke="#64748b" fontSize={10} />
                          <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                          <Line yAxisId="left" type="monotone" dataKey="reviews" stroke="#06b6d4" strokeWidth={2} dot={false} name="Reviews" />
                          <Line yAxisId="right" type="monotone" dataKey="rating" stroke="#22c55e" strokeWidth={2} dot={false} name="Rating" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </NeoCard>
                </div>

                {/* Quick Actions */}
                <NeoCard gradient="blue-purple-pink" className="p-4">
                  <h3 className="font-semibold text-sm mb-3 text-slate-200">Quick Actions</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <GlowButton onClick={handleSeedData} className="flex items-center justify-center gap-1.5 text-xs py-2">
                      <Upload size={14} /> Seed Data
                    </GlowButton>
                    <GlowButton onClick={() => handleFetchReviews(selectedBranch === 'all' ? branches[0]?.id : selectedBranch)} disabled={loading} className="flex items-center justify-center gap-1.5 text-xs py-2">
                      <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {loading ? '...' : 'Fetch'}
                    </GlowButton>
                    <GlowButton onClick={() => setActiveTab('reviews')} className="flex items-center justify-center gap-1.5 text-xs py-2">
                      <MessageSquare size={14} /> Reviews
                    </GlowButton>
                    <GlowButton onClick={() => setShowAddReview(true)} className="flex items-center justify-center gap-1.5 text-xs py-2">
                      <Plus size={14} /> Manual
                    </GlowButton>
                  </div>
                </NeoCard>
              </motion.div>
            )}

            {/* REVIEWS TAB */}
            {activeTab === 'reviews' && (
              <motion.div key="reviews" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-200">All Reviews</h2>
                  <span className="text-slate-400 text-xs">{filteredReviews.length} review{filteredReviews.length !== 1 ? 's' : ''} (past {settings.reviewAgeDays}d)</span>
                </div>
                
                {filteredReviews.length === 0 ? (
                  <NeoCard gradient="blue-purple-pink" className="text-center py-10">
                    <MessageSquare size={40} className="mx-auto text-slate-600 mb-3" />
                    <h3 className="font-semibold text-slate-300 mb-1">No reviews in the past {settings.reviewAgeDays} days</h3>
                    <p className="text-slate-500 text-xs mb-4">Add reviews manually or enable auto-scan.</p>
                    <div className="flex gap-2 justify-center">
                      <GlowButton onClick={handleSeedData}>Seed Demo</GlowButton>
                      <GlowButton onClick={() => setShowAddReview(true)} variant="blue">Add Manual</GlowButton>
                    </div>
                  </NeoCard>
                ) : (
                  <div className="space-y-3">
                    {filteredReviews.map(review => {
                      const branch = branches.find(b => b.id === review.branchId);
                      const template = findMatchingTemplate(review, templates.filter(t => t.branchId === review.branchId));
                      return (
                        <NeoCard key={review.id} gradient="blue-purple-pink" critical={review.isCritical && !review.responded} className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800/50 text-slate-300 border border-slate-700/50`}>
                                    {branch?.shortName}
                                  </span>
                                  <span className="text-[10px] text-slate-500 bg-slate-800/30 px-2 py-0.5 rounded">{review.platform.toUpperCase()}</span>
                                  {review.isCritical && !review.responded && <CriticalBadge flashing />}
                                  {review.responded && <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/30">Responded</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <RatingStars rating={review.rating} />
                                  <span className="text-[10px] text-slate-500">{format(new Date(review.date), 'MMM d')}</span>
                                </div>
                              </div>
                              <h4 className="font-semibold text-sm text-slate-200 mb-1">{review.title || 'No title'}</h4>
                              <p className="text-slate-400 text-xs mb-3 line-clamp-3">{review.content}</p>
                              {review.criticalKeywords.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {review.criticalKeywords.map(kw => (
                                    <span key={kw} className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
                                      {kw}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {review.responded && review.responseText && (
                                <div className="mt-3 p-3 rounded-xl bg-green-500/5 border border-green-500/20">
                                  <p className="text-xs text-slate-400">
                                    <span className="font-medium text-green-400">Your response:</span> {review.responseText}
                                  </p>
                                  <p className="text-[10px] text-slate-500 mt-1">Sent {format(new Date(review.responseDate!), 'MMM d, h:mm a')}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex sm:flex-col gap-2 sm:w-32">
                              {!review.responded ? (
                                <>
                                  {template && (
                                    <GlowButton onClick={() => handleGenerateResponse(review)} className="text-xs py-1.5">
                                      ✨ Auto
                                    </GlowButton>
                                  )}
                                  <GlowButton onClick={() => { setSelectedReview(review); handleGenerateResponse(review); }} className="text-xs py-1.5">
                                    Reply
                                  </GlowButton>
                                </>
                              ) : (
                                <GlowButton onClick={() => { setSelectedReview(review); setResponseDraft(review.responseText || ''); setResponseMode('manual'); }} className="text-xs py-1.5">
                                  Edit
                                </GlowButton>
                              )}
                            </div>
                          </div>
                        </NeoCard>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* STAFF TAB */}
            {activeTab === 'staff' && (
              <motion.div key="staff" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-200">Staff Performance</h2>
                  <GlowButton onClick={() => document.getElementById('staff-upload')?.click()} className="text-xs py-1.5">
                    <Upload size={14} /> Import Excel
                  </GlowButton>
                  <input id="staff-upload" type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => handleFileUpload(e, 'excel')} />
                </div>
                
                {staff.length === 0 ? (
                  <NeoCard gradient="blue-purple-pink" className="text-center py-10">
                    <Users size={40} className="mx-auto text-slate-600 mb-3" />
                    <h3 className="font-semibold text-slate-300 mb-1">No staff data yet</h3>
                    <p className="text-slate-500 text-xs mb-4">Upload staff Excel or wait for reviews to mention team members.</p>
                    <GlowButton onClick={() => document.getElementById('staff-upload')?.click()}>Upload Staff List</GlowButton>
                  </NeoCard>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {staff.map(member => {
                      const branch = branches.find(b => b.id === member.branchId);
                      const ratio = member.compliments + member.complaints > 0 
                        ? member.compliments / (member.compliments + member.complaints) 
                        : 0.5;
                      return (
                        <NeoCard key={member.id} gradient="blue-purple-pink" className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-slate-200">{member.name}</h3>
                              <p className="text-xs text-slate-400">{member.role}</p>
                            </div>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800/50 text-slate-300 border border-slate-700/50`}>
                              {branch?.shortName}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-green-400">👍 Compliments</span>
                                <span className="font-medium text-slate-200">{member.compliments}</span>
                              </div>
                              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${ratio * 100}%` }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-red-400">👎 Complaints</span>
                                <span className="font-medium text-slate-200">{member.complaints}</span>
                              </div>
                              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${(1 - ratio) * 100}%` }} />
                              </div>
                            </div>
                            {member.lastMentioned && (
                              <p className="text-[10px] text-slate-500">
                                Last mentioned: {format(new Date(member.lastMentioned), 'MMM d')}
                              </p>
                            )}
                          </div>
                        </NeoCard>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <h2 className="text-lg font-bold text-slate-200">Settings & Maintenance</h2>
                
                {/* Authorized Responders */}
                <NeoCard gradient="blue-purple-pink" className="p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-slate-200">
                    <Shield size={16} className="text-cyan-400" />
                    Authorized Responders
                  </h3>
                  <div className="space-y-3">
                    {authorizedResponders.map(responder => (
                      <div key={responder.email} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${responder.role === 'owner' ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                            {responder.role === 'owner' ? <Crown size={14} /> : <User size={14} />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-200">{responder.email}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${responder.role === 'owner' ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'} border ${responder.role === 'owner' ? 'border-purple-500/30' : 'border-cyan-500/30'}`}>
                              {responder.role === 'owner' ? 'Owner' : 'Respond Only'}
                            </span>
                          </div>
                        </div>
                        {responder.role !== 'owner' && (
                          <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onClick={() => removeAuthorizedResponder(responder.email)}
                            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 size={14} />
                          </motion.button>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input 
                        type="email" 
                        placeholder="Add responder email..." 
                        className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value) {
                            addAuthorizedResponder(e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <GlowButton onClick={() => {
                        const input = document.querySelector('input[placeholder="Add responder email..."]') as HTMLInputElement;
                        if (input?.value) {
                          addAuthorizedResponder(input.value);
                          input.value = '';
                        }
                      }} className="text-xs py-2">
                        Add
                      </GlowButton>
                    </div>
                  </div>
                </NeoCard>

                {/* File Uploads */}
                <NeoCard gradient="cyan-blue" className="p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-slate-200">
                    <FileText size={16} className="text-cyan-400" />
                    File Management
                  </h3>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {/* Excel Upload */}
                    <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText size={16} className="text-green-400" />
                        <span className="text-sm font-medium text-slate-200">Staff Excel</span>
                      </div>
                      <input type="file" accept=".xlsx,.csv" className="hidden" id="excel-upload" onChange={(e) => handleFileUpload(e, 'excel')} />
                      <label htmlFor="excel-upload" className="block w-full text-center py-2 rounded-lg bg-slate-700/50 text-slate-300 text-xs cursor-pointer hover:bg-slate-700 transition-colors">
                        Choose File
                      </label>
                    </div>
                    
                    {/* PDF Upload */}
                    <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText size={16} className="text-red-400" />
                        <span className="text-sm font-medium text-slate-200">PDF Documents</span>
                      </div>
                      <input type="file" accept=".pdf" className="hidden" id="pdf-upload" onChange={(e) => handleFileUpload(e, 'pdf')} />
                      <label htmlFor="pdf-upload" className="block w-full text-center py-2 rounded-lg bg-slate-700/50 text-slate-300 text-xs cursor-pointer hover:bg-slate-700 transition-colors">
                        Choose File
                      </label>
                    </div>
                    
                    {/* Image Upload */}
                    <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <ImageIcon size={16} className="text-purple-400" />
                        <span className="text-sm font-medium text-slate-200">Images/Logo</span>
                      </div>
                      <input type="file" accept="image/*" className="hidden" id="image-upload" onChange={(e) => handleFileUpload(e, 'image')} />
                      <label htmlFor="image-upload" className="block w-full text-center py-2 rounded-lg bg-slate-700/50 text-slate-300 text-xs cursor-pointer hover:bg-slate-700 transition-colors">
                        Choose File
                      </label>
                    </div>
                  </div>
                  
                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                      <p className="text-xs text-slate-400 mb-2">Uploaded Files:</p>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {uploadedFiles.map((file, i) => (
                          <div key={i} className="flex items-center justify-between text-xs p-2 rounded bg-slate-800/30">
                            <span className="text-slate-300 truncate">{file.name}</span>
                            <span className="text-slate-500">{file.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </NeoCard>

                {/* Email Analytics */}
                <NeoCard gradient="purple-pink" className="p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-slate-200">
                    <Mail size={16} className="text-purple-400" />
                    Email Analytics Report
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Send report to:</label>
                      <input 
                        type="email" 
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      />
                    </div>
                    <GlowButton onClick={() => setShowEmailPopup(true)} variant="blue" className="w-full">
                      <Share2 size={14} className="mr-1" /> Send Report
                    </GlowButton>
                    <p className="text-[10px] text-slate-500">Opens your email app with pre-filled analytics</p>
                  </div>
                </NeoCard>

                {/* Critical Keywords */}
                <NeoCard gradient="blue-purple-pink" className="p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-slate-200">
                    <AlertTriangle size={16} className="text-red-400" />
                    Critical Alert Keywords
                  </h3>
                  <p className="text-xs text-slate-400 mb-3">Reviews containing these words trigger urgent alerts</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {settings.criticalKeywords.map((kw, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-xs border border-red-500/30">
                        {kw}
                        <motion.button 
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setSettings(prev => ({ ...prev, criticalKeywords: prev.criticalKeywords.filter((_, idx) => idx !== i) }))}
                          className="hover:text-red-300"
                        >
                          <X size={10} />
                        </motion.button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Add keyword..." 
                      className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          setSettings(prev => ({ ...prev, criticalKeywords: [...prev.criticalKeywords, e.currentTarget.value] }));
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <GlowButton onClick={() => {
                      const input = document.querySelector('input[placeholder="Add keyword..."]') as HTMLInputElement;
                      if (input?.value) {
                        setSettings(prev => ({ ...prev, criticalKeywords: [...prev.criticalKeywords, input.value] }));
                        input.value = '';
                      }
                    }} variant="red" className="text-xs py-2">
                      Add
                    </GlowButton>
                  </div>
                </NeoCard>

                {/* Response Templates */}
                <NeoCard gradient="cyan-blue" className="p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-slate-200">
                    <MessageSquare size={16} className="text-cyan-400" />
                    Response Templates
                  </h3>
                  <div className="space-y-4">
                    {branches.map(branch => (
                      <div key={branch.id} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <h4 className="font-medium text-sm mb-3 flex items-center gap-2 text-slate-200">
                          <span className={`w-2 h-2 rounded-full bg-${branch.color.replace('-500', '-400')}`} />
                          {branch.shortName}
                        </h4>
                        <div className="space-y-3">
                          {templates.filter(t => t.branchId === branch.id).map(template => (
                            <div key={template.id} className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                      template.triggerType === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                      template.triggerType === 'complaint' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                      'bg-green-500/20 text-green-400 border border-green-500/30'
                                    }`}>
                                      {template.triggerType}
                                    </span>
                                    <span className="text-[10px] text-slate-500">{template.keywords.slice(0, 3).join(', ')}{template.keywords.length > 3 ? '...' : ''}</span>
                                  </div>
                                  <p className="text-xs text-slate-400">{template.template}</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={template.isActive}
                                    onChange={(e) => setTemplates(prev => prev.map(t => t.id === template.id ? { ...t, isActive: e.target.checked } : t))}
                                    className="sr-only peer"
                                  />
                                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </NeoCard>

                {/* Contact Info */}
                <NeoCard gradient="blue-purple-pink" className="p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-slate-200">
                    <User size={16} className="text-blue-400" />
                    Contact Information
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Contact Email</label>
                      <input 
                        type="email" 
                        value={settings.contactEmail}
                        onChange={(e) => setSettings(prev => ({ ...prev, contactEmail: e.target.value }))}
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Contact Phone</label>
                      <input 
                        type="tel" 
                        value={settings.contactPhone}
                        onChange={(e) => setSettings(prev => ({ ...prev, contactPhone: e.target.value }))}
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                  </div>
                </NeoCard>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* Add Review Modal */}
      <AnimatePresence>
        {showAddReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddReview(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="NeoCard w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900/95 border border-slate-700/50 rounded-2xl p-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg text-slate-200">Add New Review</h3>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400"
                  onClick={() => setShowAddReview(false)}
                >
                  <X size={18} />
                </motion.button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Branch</label>
                  <select
                    value={newReview.branchId || ''}
                    onChange={(e) => setNewReview(prev => ({ ...prev, branchId: e.target.value }))}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none"
                    required
                  >
                    <option value="">Select branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Platform</label>
                    <select
                      value={newReview.platform || 'manual'}
                      onChange={(e) => setNewReview(prev => ({ ...prev, platform: e.target.value as any }))}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none"
                    >
                      <option value="manual">Manual Entry</option>
                      <option value="google">Google</option>
                      <option value="dineplan">Dineplan</option>
                      <option value="tripadvisor">TripAdvisor</option>
                      <option value="instagram">Instagram</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Rating</label>
                    <select
                      value={newReview.rating || 3}
                      onChange={(e) => setNewReview(prev => ({ ...prev, rating: Number(e.target.value) }))}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none"
                    >
                      {[1,2,3,4,5].map(r => <option key={r} value={r}>{r} Star{r>1?'s':''}</option>)}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Author</label>
                  <input
                    type="text"
                    value={newReview.author || ''}
                    onChange={(e) => setNewReview(prev => ({ ...prev, author: e.target.value }))}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="Customer name or username"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Title (Optional)</label>
                  <input
                    type="text"
                    value={newReview.title || ''}
                    onChange={(e) => setNewReview(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="Brief summary"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Review Content *</label>
                  <textarea
                    value={newReview.content || ''}
                    onChange={(e) => setNewReview(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 min-h-[100px]"
                    placeholder="Paste or type the review text..."
                    required
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <GlowButton onClick={() => setShowAddReview(false)} className="flex-1">Cancel</GlowButton>
                  <GlowButton onClick={handleAddReview} disabled={!newReview.branchId || !newReview.content} className="flex-1">
                    Add Review
                  </GlowButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Response Modal */}
      <AnimatePresence>
        {selectedReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedReview(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="NeoCard w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900/95 border border-slate-700/50 rounded-2xl p-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg text-slate-200">Respond to Review</h3>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400"
                  onClick={() => setSelectedReview(null)}
                >
                  <X size={18} />
                </motion.button>
              </div>
              
              {/* Review Preview */}
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800/50 text-slate-300 border border-slate-700/50`}>
                    {branches.find(b=>b.id===selectedReview.branchId)?.shortName}
                  </span>
                  <RatingStars rating={selectedReview.rating} />
                  <span className="text-[10px] text-slate-500">{selectedReview.platform.toUpperCase()}</span>
                </div>
                <p className="font-medium text-slate-200">{selectedReview.title}</p>
                <p className="text-slate-400 text-sm mt-1">{selectedReview.content}</p>
                {selectedReview.isCritical && (
                  <div className="mt-2 flex items-center gap-2 text-red-400 text-xs">
                    <AlertTriangle size={14} />
                    <span>Critical: {selectedReview.criticalKeywords.join(', ')}</span>
                  </div>
                )}
              </div>
              
              {/* Response Mode Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-4">
                <span className="text-sm font-medium text-slate-200">Response Mode</span>
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setResponseMode('auto')}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      responseMode === 'auto' 
                        ? 'bg-cyan-500/30 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.4)] border border-cyan-500/30' 
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    ✨ Auto
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setResponseMode('manual')}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      responseMode === 'manual' 
                        ? 'bg-cyan-500/30 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.4)] border border-cyan-500/30' 
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    ✍️ Manual
                  </motion.button>
                </div>
              </div>
              
              {/* Response Editor */}
              <div className="mb-4">
                <label className="block text-xs text-slate-400 mb-1">Your Response</label>
                <textarea
                  value={responseDraft}
                  onChange={(e) => setResponseDraft(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 min-h-[120px]"
                  placeholder={responseMode === 'auto' ? 'Auto-suggestion will appear below...' : 'Type your custom response...'}
                />
              </div>
              
              {/* Auto-Suggestion Panel */}
              {responseMode === 'auto' && findMatchingTemplate(selectedReview, templates.filter(t => t.branchId === selectedReview.branchId)) && (
                <div className="mb-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                  <p className="text-xs font-medium text-cyan-400 mb-2">✨ Suggested Template:</p>
                  <p className="text-xs text-slate-400">
                    {findMatchingTemplate(selectedReview, templates.filter(t => t.branchId === selectedReview.branchId))?.template}
                  </p>
                  <GlowButton 
                    onClick={() => setResponseDraft(generateResponseDraft(selectedReview, templates.filter(t => t.branchId === selectedReview.branchId), settings.contactEmail, settings.contactPhone))}
                    className="mt-2 text-xs py-1.5"
                  >
                    Use This Template
                  </GlowButton>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-700/50">
                <GlowButton onClick={() => setSelectedReview(null)} className="flex-1">Cancel</GlowButton>
                <GlowButton onClick={handleSendResponse} disabled={loading || !responseDraft.trim()} className="flex-1 flex items-center justify-center gap-1.5">
                  {loading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Send Response
                    </>
                  )}
                </GlowButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Popup Modal */}
      <AnimatePresence>
        {showEmailPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEmailPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="NeoCard w-full max-w-md bg-slate-900/95 border border-slate-700/50 rounded-2xl p-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg text-slate-200">Send Analytics Report</h3>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400"
                  onClick={() => setShowEmailPopup(false)}
                >
                  <X size={18} />
                </motion.button>
              </div>
              
              <p className="text-sm text-slate-400 mb-4">
                This will open your email app with a pre-filled report containing:
              </p>
              
              <ul className="text-xs text-slate-300 space-y-1.5 mb-4 ml-4 list-disc">
                <li>Total reviews & average rating (past 7 days)</li>
                <li>Response rate & critical alert count</li>
                <li>Sentiment breakdown (positive/neutral/negative)</li>
                <li>Reviews by branch and platform</li>
                <li>Link to full dashboard</li>
              </ul>
              
              <div className="mb-4">
                <label className="block text-xs text-slate-400 mb-1">Send to:</label>
                <input 
                  type="email" 
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              
              <div className="flex gap-3">
                <GlowButton onClick={() => setShowEmailPopup(false)} className="flex-1">Cancel</GlowButton>
                <GlowButton onClick={handleSendEmailReport} variant="purple" className="flex-1 flex items-center justify-center gap-1.5">
                  <Mail size={14} />
                  Open Email App
                </GlowButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 z-40">
        <div className="flex justify-around py-2">
          {navItems.map(item => (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'text-cyan-400' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label.slice(0, 8)}</span>
            </motion.button>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <footer className="hidden md:block border-t border-slate-700/50 mt-8 py-4 text-center text-slate-500 text-xs">
        <p>RestoPulse • Life Grand Cafe Reputation Manager</p>
        <p className="mt-1">Contact: {settings.contactEmail} • {settings.contactPhone}</p>
      </footer>
    </div>
  );
}
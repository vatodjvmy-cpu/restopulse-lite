import { Branch, Review, ResponseTemplate, StaffMember, Notification, DashboardStats } from '../types';

const STORAGE_KEYS = {
  BRANCHES: 'restopulse_branches',
  REVIEWS: 'restopulse_reviews',
  TEMPLATES: 'restopulse_templates',
  STAFF: 'restopulse_staff',
  NOTIFICATIONS: 'restopulse_notifications',
  LAST_SYNC: 'restopulse_last_sync',
  SETTINGS: 'restopulse_settings',
} as const;

// Life Grand Cafe branches with real URLs
export const getDefaultBranches = (): Branch[] => [
  {
    id: 'waterfall',
    name: 'Life Grand Cafe - Waterfall',
    shortName: 'Waterfall',
    dineplanUrl: 'https://www.dineplan.com/restaurants/life-grand-cafe-waterfall',
    googleUrl: 'https://share.google/An5zZlkkAmMy2J2sd',
    color: 'blue-500',
  },
  {
    id: 'mos',
    name: 'Life Grand Cafe - Mall of the South',
    shortName: 'Mall of the South',
    dineplanUrl: 'https://www.dineplan.com/restaurants/life-grand-cafe-mall-of-the-south',
    googleUrl: 'https://share.google/Vpuen1QNiBgUdpD65',
    color: 'emerald-500',
  },
  {
    id: 'vaw',
    name: 'Life Grand Cafe - V&A Waterfront',
    shortName: 'V&A Waterfront',
    dineplanUrl: 'https://www.dineplan.com/restaurants/life-grand-cafe-waterfront',
    googleUrl: 'https://share.google/6gE0MRBzIPlnexWTK',
    color: 'purple-500',
  },
];

// Response templates with john@lifegrandcafe.com contact
export const getDefaultTemplates = (branchId: string): ResponseTemplate[] => [
  {
    id: `${branchId}-slow-service`,
    branchId,
    triggerType: 'complaint',
    keywords: ['slow', 'wait', 'long time', 'patient', 'forever', 'delayed'],
    template: 'Thank you for your feedback. We sincerely apologize for the wait time you experienced at Life Grand Cafe. We are reviewing our service flow to ensure faster attention to all our valued guests. We hope to welcome you back for a much-improved experience. - Management | Contact: john@lifegrandcafe.com',
    isActive: true,
  },
  {
    id: `${branchId}-food-quality`,
    branchId,
    triggerType: 'complaint',
    keywords: ['cold', 'undercooked', 'wrong order', 'mistake', 'not fresh', 'taste', 'bland'],
    template: 'We are truly sorry your meal did not meet our standards at Life Grand Cafe. This is not the experience we want for our guests. Please contact us directly at john@lifegrandcafe.com or +27 21 421 4999 so we can make this right. Your feedback helps us improve. - The Team',
    isActive: true,
  },
  {
    id: `${branchId}-staff-compliment`,
    branchId,
    triggerType: 'compliment',
    keywords: ['friendly', 'amazing', 'excellent', 'wonderful', 'best', 'love', 'thank you', 'attentive', 'helpful'],
    template: 'Thank you so much for your kind words about Life Grand Cafe! We are thrilled you enjoyed your visit. We will share your praise with our team – it means the world to us. We can\'t wait to serve you again soon! ❤️ | Contact: john@lifegrandcafe.com',
    isActive: true,
  },
  {
    id: `${branchId}-critical`,
    branchId,
    triggerType: 'critical',
    keywords: ['allergic', 'allergy', 'sick', 'ill', 'poison', 'health', 'safety', 'hygiene', 'dirty', 'manager', 'complaint', 'refund', 'never again', 'worst', 'disgusting', 'report', 'legal', 'lawyer'],
    template: 'We take your concern very seriously and sincerely apologize for this experience at Life Grand Cafe. This requires immediate attention from our management team. Please contact John directly at john@lifegrandcafe.com or +27 21 421 4999 so we can address this personally and ensure it never happens again.',
    isActive: true,
  },
  {
    id: `${branchId}-reservation`,
    branchId,
    triggerType: 'complaint',
    keywords: ['booking', 'reservation', 'table', 'no show', 'lost', 'double booked'],
    template: 'We apologize for the confusion with your reservation at Life Grand Cafe. We value every guest and want to ensure smooth bookings. Please contact john@lifegrandcafe.com with your details so we can investigate and prevent this in future. Thank you for your patience.',
    isActive: true,
  },
  {
    id: `${branchId}-pricing`,
    branchId,
    triggerType: 'complaint',
    keywords: ['expensive', 'overpriced', 'cost', 'price', 'bill', 'charge', 'money'],
    template: 'Thank you for sharing your thoughts on pricing at Life Grand Cafe. We strive to offer exceptional quality and experience that reflects our value. We\'d love to hear more about your visit - please reach out to john@lifegrandcafe.com. We appreciate your feedback.',
    isActive: true,
  },
];

// Critical keywords for urgent alerts (customizable)
export const getDefaultCriticalKeywords = (): string[] => [
  'allergic', 'allergy', 'sick', 'ill', 'poison', 'food poisoning', 
  'health', 'safety', 'hygiene', 'dirty', 'contaminated', 'foreign',
  'manager', 'complaint', 'refund', 'never again', 'worst', 'disgusting', 
  'report', 'legal', 'lawyer', 'sue', 'lawsuit', 'health department',
  'vomiting', 'nausea', 'hospital', 'emergency', 'dangerous'
];

// Default app settings
export const getDefaultSettings = () => ({
  autoScanEnabled: false,
  scanIntervalMinutes: 60,
  criticalKeywords: getDefaultCriticalKeywords(),
  contactEmail: 'john@lifegrandcafe.com',
  contactPhone: '+27 21 421 4999',
  reviewAgeDays: 7, // Only show past 7 days
  branches: ['waterfall', 'mos', 'vaw'],
});

// Storage helpers with 7-day filter
export const storage = {
  get: <T>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  },
  
  set: (key: string, value: unknown): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage error:', error);
    }
  },
  
  getBranches: () => storage.get<Branch[]>(STORAGE_KEYS.BRANCHES, getDefaultBranches()),
  setBranches: (branches: Branch[]) => storage.set(STORAGE_KEYS.BRANCHES, branches),
  
  getReviews: () => {
    const all = storage.get<Review[]>(STORAGE_KEYS.REVIEWS, []);
    const settings = storage.get(STORAGE_KEYS.SETTINGS, getDefaultSettings());
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - settings.reviewAgeDays);
    
    return all.filter(r => new Date(r.date) >= cutoff);
  },
  setReviews: (reviews: Review[]) => storage.set(STORAGE_KEYS.REVIEWS, reviews),
  
  getAllReviews: () => storage.get<Review[]>(STORAGE_KEYS.REVIEWS, []), // Unfiltered
  
  getTemplates: (branchId?: string) => {
    const all = storage.get<ResponseTemplate[]>(STORAGE_KEYS.TEMPLATES, []);
    return branchId ? all.filter(t => t.branchId === branchId) : all;
  },
  setTemplates: (templates: ResponseTemplate[]) => storage.set(STORAGE_KEYS.TEMPLATES, templates),
  
  getStaff: () => storage.get<StaffMember[]>(STORAGE_KEYS.STAFF, []),
  setStaff: (staff: StaffMember[]) => storage.set(STORAGE_KEYS.STAFF, staff),
  
  getNotifications: () => storage.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []),
  setNotifications: (notifications: Notification[]) => storage.set(STORAGE_KEYS.NOTIFICATIONS, notifications),
  
  getSettings: () => storage.get(STORAGE_KEYS.SETTINGS, getDefaultSettings()),
  setSettings: (settings: any) => storage.set(STORAGE_KEYS.SETTINGS, settings),
  
  getLastSync: () => storage.get<string>(STORAGE_KEYS.LAST_SYNC, ''),
  setLastSync: (timestamp: string) => storage.set(STORAGE_KEYS.LAST_SYNC, timestamp),
  
  // Seed demo data with realistic 7-day spread
  seedDemoData: () => {
    const branches = getDefaultBranches();
    const templates = branches.flatMap(b => getDefaultTemplates(b.id));
    const settings = getDefaultSettings();
    
    const now = Date.now();
    const demoReviews: Review[] = [
      {
        id: 'demo-1',
        branchId: 'waterfall',
        platform: 'dineplan',
        rating: 2,
        title: 'Disappointing wait time',
        content: 'We waited over 45 minutes for our main course. The staff were friendly but seemed overwhelmed. Food was cold when it arrived.',
        author: 'Sarah M.',
        date: new Date(now - 2 * 86400000).toISOString(), // 2 days ago
        sentiment: 'negative',
        isCritical: false,
        criticalKeywords: ['cold'],
        responded: false,
        staffMentioned: [],
      },
      {
        id: 'demo-2',
        branchId: 'mos',
        platform: 'google',
        rating: 5,
        title: 'Amazing Sunday brunch!',
        content: 'The staff were so friendly and attentive. Our server James went above and beyond. The eggs benedict was exceptional. Will definitely return!',
        author: 'Michael T.',
        date: new Date(now - 1 * 86400000).toISOString(), // 1 day ago
        sentiment: 'positive',
        isCritical: false,
        criticalKeywords: [],
        responded: true,
        responseText: 'Thank you so much for your kind words! We are thrilled you enjoyed your visit. We will share your praise with our team – it means the world to us. We can\'t wait to serve you again soon! ❤️ | Contact: john@lifegrandcafe.com',
        responseDate: new Date(now - 20 * 3600000).toISOString(),
        staffMentioned: ['James'],
      },
      {
        id: 'demo-3',
        branchId: 'vaw',
        platform: 'tripadvisor',
        rating: 1,
        title: 'Allergic reaction - serious concern',
        content: 'I informed staff about my nut allergy but my dessert contained nuts. I had a mild allergic reaction. This is a serious health and safety issue that needs immediate attention.',
        author: 'Priya K.',
        date: new Date(now - 5 * 3600000).toISOString(), // 5 hours ago
        sentiment: 'negative',
        isCritical: true,
        criticalKeywords: ['allergic', 'allergy', 'health', 'safety'],
        responded: false,
        staffMentioned: [],
      },
      {
        id: 'demo-4',
        branchId: 'waterfall',
        platform: 'instagram',
        rating: 4,
        title: 'Great ambiance, slow service',
        content: 'Beautiful setting and delicious coffee. Service was a bit slow but the staff were lovely and apologetic. The waterfront view is stunning.',
        author: '@capetownfoodie',
        date: new Date(now - 3 * 86400000).toISOString(), // 3 days ago
        sentiment: 'positive',
        isCritical: false,
        criticalKeywords: ['slow'],
        responded: true,
        responseText: 'Thank you so much for your kind words! We are thrilled you enjoyed your visit. We will share your praise with our team – it means the world to us. We can\'t wait to serve you again soon! ❤️ | Contact: john@lifegrandcafe.com',
        responseDate: new Date(now - 2.5 * 86400000).toISOString(),
        staffMentioned: [],
      },
      {
        id: 'demo-5',
        branchId: 'mos',
        platform: 'dineplan',
        rating: 3,
        title: 'Mixed experience',
        content: 'Food was good but the reservation system seems broken. We had a booking but still waited 20 minutes. Staff tried to help.',
        author: 'David L.',
        date: new Date(now - 6 * 86400000).toISOString(), // 6 days ago
        sentiment: 'neutral',
        isCritical: false,
        criticalKeywords: ['reservation', 'booking'],
        responded: false,
        staffMentioned: [],
      },
    ];
    
    const demoStaff: StaffMember[] = [
      { id: 'james-mos', name: 'James', branchId: 'mos', role: 'Server', compliments: 12, complaints: 1, lastMentioned: new Date(now - 1 * 86400000).toISOString() },
      { id: 'thandi-vaw', name: 'Thandi', branchId: 'vaw', role: 'Manager', compliments: 8, complaints: 3, lastMentioned: new Date(now - 5 * 3600000).toISOString() },
      { id: 'kyle-waterfall', name: 'Kyle', branchId: 'waterfall', role: 'Chef', compliments: 5, complaints: 2, lastMentioned: new Date(now - 3 * 86400000).toISOString() },
      { id: 'zanele-mos', name: 'Zanele', branchId: 'mos', role: 'Host', compliments: 15, complaints: 0, lastMentioned: new Date(now - 1 * 86400000).toISOString() },
    ];
    
    storage.setBranches(branches);
    storage.setReviews(demoReviews);
    storage.setTemplates(templates);
    storage.setStaff(demoStaff);
    storage.setSettings(settings);
    storage.setLastSync(new Date().toISOString());
    
    return { branches, reviews: demoReviews, templates, staff: demoStaff, settings };
  },
  
  // Import reviews from CSV (Dineplan export format)
  importReviewsFromCSV: (csvText: string, branchId: string): Review[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const reviews: Review[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const review: any = { branchId };
      
      headers.forEach((header, idx) => {
        if (header === 'date') {
          review.date = new Date(values[idx]).toISOString();
        } else if (header === 'rating') {
          review.rating = parseInt(values[idx]) || 3;
        } else if (header === 'platform') {
          review.platform = values[idx].toLowerCase();
        } else if (header === 'author' || header === 'reviewer') {
          review.author = values[idx];
        } else if (header === 'title') {
          review.title = values[idx];
        } else if (header === 'content' || header === 'review' || header === 'comment') {
          review.content = values[idx];
        }
      });
      
      if (review.content) {
        reviews.push({
          id: `imported-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          ...review,
          sentiment: 'neutral',
          isCritical: false,
          criticalKeywords: [],
          responded: false,
          staffMentioned: [],
        });
      }
    }
    
    return reviews;
  },
};
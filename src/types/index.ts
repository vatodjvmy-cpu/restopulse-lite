export type Branch = {
  id: string;
  name: string;
  shortName: string;
  dineplanUrl: string;
  googleUrl?: string;
  color: string;
};

export type Review = {
  id: string;
  branchId: string;
  platform: 'google' | 'yelp' | 'tripadvisor' | 'dineplan' | 'instagram';
  rating: number;
  title: string;
  content: string;
  author: string;
  date: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  isCritical: boolean;
  criticalKeywords: string[];
  responded: boolean;
  responseText?: string;
  responseDate?: string;
  staffMentioned?: string[];
};

export type ResponseTemplate = {
  id: string;
  branchId: string;
  triggerType: 'complaint' | 'compliment' | 'critical';
  keywords: string[];
  template: string;
  isActive: boolean;
};

export type StaffMember = {
  id: string;
  name: string;
  branchId: string;
  role: string;
  compliments: number;
  complaints: number;
  lastMentioned?: string;
};

export type Notification = {
  id: string;
  type: 'critical_review' | 'new_review' | 'response_sent';
  message: string;
  reviewId?: string;
  timestamp: string;
  read: boolean;
};

export type DashboardStats = {
  totalReviews: number;
  averageRating: number;
  responseRate: number;
  criticalCount: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  reviewsByPlatform: Record<string, number>;
  reviewsByBranch: Record<string, number>;
};
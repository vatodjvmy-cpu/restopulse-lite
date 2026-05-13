import { StaffMember } from '../types';
import { Review, ResponseTemplate, Branch } from '../types';
import { storage, getDefaultCriticalKeywords } from './storage';

// Simple keyword-based sentiment analysis (zero API cost)
export const analyzeSentiment = (text: string): 'positive' | 'neutral' | 'negative' => {
  const lower = text.toLowerCase();
  
  const positiveWords = [
    'amazing', 'excellent', 'wonderful', 'fantastic', 'love', 'best', 
    'friendly', 'attentive', 'delicious', 'perfect', 'great', 'thank',
    'recommend', 'happy', 'pleased', 'impressed', 'outstanding', 'brilliant',
    'superb', 'lovely', 'beautiful', 'stunning', 'exceptional'
  ];
  
  const negativeWords = [
    'terrible', 'awful', 'worst', 'disappointing', 'slow', 'cold', 
    'rude', 'dirty', 'overpriced', 'mistake', 'wrong', 'never',
    'complaint', 'refund', 'angry', 'frustrated', 'waste', 'poor',
    'bad', 'horrible', 'disgusting', 'unacceptable', 'regret'
  ];
  
  const positiveCount = positiveWords.filter(word => lower.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lower.includes(word)).length;
  
  if (positiveCount > negativeCount + 1) return 'positive';
  if (negativeCount > positiveCount + 1) return 'negative';
  return 'neutral';
};

// Check for critical keywords (customizable)
export const checkCritical = (text: string, customKeywords?: string[]): { isCritical: boolean; keywords: string[] } => {
  const lower = text.toLowerCase();
  const keywords = customKeywords || getDefaultCriticalKeywords();
  const found = keywords.filter(keyword => lower.includes(keyword.toLowerCase()));
  return {
    isCritical: found.length > 0,
    keywords: found,
  };
};

// Find matching response template
export const findMatchingTemplate = (
  review: Review, 
  templates: ResponseTemplate[]
): ResponseTemplate | undefined => {
  const lowerContent = (review.title + ' ' + review.content).toLowerCase();
  
  // Priority: critical > complaint > compliment
  const criticalTemplates = templates.filter(t => 
    t.isActive && t.triggerType === 'critical' && 
    t.keywords.some(k => lowerContent.includes(k.toLowerCase()))
  );
  if (criticalTemplates.length > 0) return criticalTemplates[0];
  
  const complaintTemplates = templates.filter(t => 
    t.isActive && t.triggerType === 'complaint' && 
    review.sentiment === 'negative' &&
    t.keywords.some(k => lowerContent.includes(k.toLowerCase()))
  );
  if (complaintTemplates.length > 0) return complaintTemplates[0];
  
  const complimentTemplates = templates.filter(t => 
    t.isActive && t.triggerType === 'compliment' && 
    review.sentiment === 'positive' &&
    t.keywords.some(k => lowerContent.includes(k.toLowerCase()))
  );
  if (complimentTemplates.length > 0) return complimentTemplates[0];
  
  return undefined;
};

// Generate response draft with contact info
export const generateResponseDraft = (review: Review, templates: ResponseTemplate[], contactEmail: string, contactPhone: string): string => {
  const template = findMatchingTemplate(review, templates);
  if (template) {
    return template.template
      .replace('[PHONE]', contactPhone)
      .replace('[EMAIL]', contactEmail)
      .replace('[BRANCH]', review.branchId.toUpperCase());
  }
  
  // Fallback generic response
  return review.sentiment === 'negative' 
    ? `Thank you for your feedback. We apologize for not meeting your expectations at Life Grand Cafe and would appreciate the opportunity to make this right. Please contact us directly at ${contactEmail} so we can address your concerns. - Management`
    : `Thank you for taking the time to share your experience at Life Grand Cafe! We are delighted you enjoyed your visit and look forward to welcoming you back soon. - The Team | Contact: ${contactEmail}`;
};

// Process new review (auto-analyze and flag)
export const processReview = (
  review: Omit<Review, 'sentiment' | 'isCritical' | 'criticalKeywords'>,
  customKeywords?: string[]
): Review => {
  const sentiment = analyzeSentiment(review.title + ' ' + review.content);
  const { isCritical, keywords: criticalKeywords } = checkCritical(review.title + ' ' + review.content, customKeywords);
  
  return {
    ...review,
    sentiment,
    isCritical,
    criticalKeywords,
    responded: false,
  };
};

// Filter reviews to past N days
export const filterReviewsByDate = (reviews: Review[], days: number = 7): Review[] => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return reviews.filter(r => new Date(r.date) >= cutoff);
};

// Simulate fetching from Dineplan (for demo - replace with real API/worker later)
export const fetchDineplanReviews = async (branch: Branch): Promise<Partial<Review>[]> => {
  console.log(`🔍 Fetching reviews for ${branch.name} from ${branch.dineplanUrl}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  // In production: Use Cloudflare Worker to scrape or call Dineplan API
  // For now: Return empty - user imports via CSV or adds manually
  return [];
};

// Auto-scan all branches for past 7 days
export const autoScanAllBranches = async (
  branches: Branch[], 
  onProgress?: (msg: string) => void,
  onComplete?: (newReviews: Review[]) => void
): Promise<{ success: boolean; newReviews: Review[]; errors: string[] }> => {
  const results: Review[] = [];
  const errors: string[] = [];
  const settings = storage.getSettings();
  
  onProgress?.('Starting automated scan...');
  
  for (const branch of branches) {
    try {
      onProgress?.(`Scanning ${branch.shortName}...`);
      
      // Fetch from each platform (simulated)
      const fetched = await fetchDineplanReviews(branch);
      
      // Process and add new reviews
      const processed = fetched.map(f => processReview({
        id: `auto-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        branchId: branch.id,
        platform: 'dineplan',
        rating: f.rating || 3,
        title: f.title || '',
        content: f.content || '',
        author: f.author || 'Dineplan User',
        date: new Date().toISOString(),
        staffMentioned: [],
      } as any, settings.criticalKeywords));
      
      // Filter to past 7 days
      const recent = filterReviewsByDate(processed, 7);
      
      if (recent.length > 0) {
        results.push(...recent);
        onProgress?.(`Found ${recent.length} new reviews for ${branch.shortName}`);
      }
    } catch (error) {
      errors.push(`Failed to scan ${branch.shortName}: ${error}`);
      console.error(error);
    }
  }
  
  onComplete?.(results);
  onProgress?.(`Scan complete: ${results.length} new reviews found`);
  
  return { success: errors.length === 0, newReviews: results, errors };
};

// Calculate dashboard stats (7-day filtered)
export const calculateStats = (reviews: Review[], branches: Branch[]): import('../types').DashboardStats => {
  // Filter to past 7 days
  const recentReviews = filterReviewsByDate(reviews, 7);
  
  const totalReviews = recentReviews.length;
  const averageRating = totalReviews > 0 
    ? parseFloat((recentReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(2))
    : 0;
    
  const responseRate = totalReviews > 0
    ? parseFloat((recentReviews.filter(r => r.responded).length / totalReviews * 100).toFixed(1))
    : 0;
    
  const criticalCount = recentReviews.filter(r => r.isCritical).length;
  
  const sentimentBreakdown = {
    positive: recentReviews.filter(r => r.sentiment === 'positive').length,
    neutral: recentReviews.filter(r => r.sentiment === 'neutral').length,
    negative: recentReviews.filter(r => r.sentiment === 'negative').length,
  };
  
  const reviewsByPlatform = recentReviews.reduce((acc, r) => {
    acc[r.platform] = (acc[r.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const reviewsByBranch = branches.reduce((acc, b) => {
    acc[b.id] = recentReviews.filter(r => r.branchId === b.id).length;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    totalReviews,
    averageRating,
    responseRate,
    criticalCount,
    sentimentBreakdown,
    reviewsByPlatform,
    reviewsByBranch,
  };
};

// Extract staff names from review text (simple keyword matching)
export const extractStaffMentions = (content: string, staff: StaffMember[]): string[] => {
  const lower = content.toLowerCase();
  return staff
    .filter(s => lower.includes(s.name.toLowerCase()))
    .map(s => s.name);
};
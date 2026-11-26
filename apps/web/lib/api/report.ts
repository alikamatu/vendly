import { api } from './index';

export type ReportTargetType = 'PRODUCT' | 'SELLER';

export type ReportReason =
  | 'COUNTERFEIT'
  | 'MISLEADING'
  | 'PROHIBITED_ITEM'
  | 'SCAM_FRAUD'
  | 'HARASSMENT'
  | 'SPAM'
  | 'OFFENSIVE_CONTENT'
  | 'INACCURATE_PRICING'
  | 'OTHER';

export interface CreateReportInput {
  target_type: ReportTargetType;
  product_id?: string;
  seller_id?: string;
  reason: ReportReason;
  details?: string;
  evidence_urls?: string[];
}

export const PRODUCT_REPORT_REASONS: Array<{
  value: ReportReason;
  label: string;
  hint: string;
}> = [
  {
    value: 'COUNTERFEIT',
    label: 'Counterfeit or fake item',
    hint: 'Replica, unauthorized brand claim, or knock-off goods',
  },
  {
    value: 'MISLEADING',
    label: 'Misleading photos or description',
    hint: 'Listing does not match what is actually being sold',
  },
  {
    value: 'PROHIBITED_ITEM',
    label: 'Prohibited or illegal item',
    hint: 'Restricted, unsafe, or unlawful merchandise',
  },
  {
    value: 'INACCURATE_PRICING',
    label: 'Fake or bait pricing',
    hint: 'Suspicious GH₵ 0 / GH₵ 1 price or hidden off-platform fees',
  },
  {
    value: 'SCAM_FRAUD',
    label: 'Suspected scam or fraud',
    hint: 'Asking for off-platform payment or deceptive behavior',
  },
  {
    value: 'OFFENSIVE_CONTENT',
    label: 'Offensive or inappropriate content',
    hint: 'Abusive, graphic, or inappropriate images or copy',
  },
  {
    value: 'SPAM',
    label: 'Duplicate or spam listing',
    hint: 'Repeated or irrelevant spam posts',
  },
  {
    value: 'OTHER',
    label: 'Other policy issue',
    hint: 'Something else our Trust & Safety team should check',
  },
];

export const SELLER_REPORT_REASONS: Array<{
  value: ReportReason;
  label: string;
  hint: string;
}> = [
  {
    value: 'SCAM_FRAUD',
    label: 'Scam or fraudulent seller',
    hint: 'Taking money off-platform, ghosting buyers, or fake deliveries',
  },
  {
    value: 'COUNTERFEIT',
    label: 'Selling counterfeit goods',
    hint: 'Store repeatedly lists fake or unauthorized branded products',
  },
  {
    value: 'HARASSMENT',
    label: 'Harassment or abusive behavior',
    hint: 'Threats, insults, or disrespectful conduct toward buyers',
  },
  {
    value: 'MISLEADING',
    label: 'Impersonation or fake business info',
    hint: 'False identity, stolen store photos, or misleading location',
  },
  {
    value: 'PROHIBITED_ITEM',
    label: 'Selling prohibited items',
    hint: 'Store offers banned or unlawful goods on Verndly',
  },
  {
    value: 'SPAM',
    label: 'Spam store or fake listings',
    hint: 'Flooding the marketplace with junk or duplicate listings',
  },
  {
    value: 'OTHER',
    label: 'Other concern',
    hint: 'Any other trust & safety concern about this seller',
  },
];

export const reportApi = {
  submitReport: async (input: CreateReportInput) => {
    const res = await api.post<{ message: string; report: any }>('/reports', input);
    return res.data;
  },
  getMyReports: async () => {
    const res = await api.get<any[]>('/reports/mine');
    return res.data;
  },
};

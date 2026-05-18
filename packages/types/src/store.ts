export type SocialLinks = {
  instagram?: string;
  twitter?: string;
  facebook?: string;
  tiktok?: string;
};

export type SellerProfile = {
  id: string;
  user_id: string;
  store_name: string;
  store_link: string;
  logo_url?: string;
  bio?: string;
  whatsapp_number?: string;
  location?: string;
  area?: string;
  delivery_policies?: string;
  business_hours?: string;
  social_links?: SocialLinks;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

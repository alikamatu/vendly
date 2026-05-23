import type { Metadata } from 'next';
import StoresBrowser from '@/components/stores-browser/StoresBrowser';

export const metadata: Metadata = {
  title: 'Discover Stores · Vendly',
  description:
    'Explore, filter and search verified vendor stores on Vendly. Support young local entrepreneurs, check active product showcases, and visit curated storefronts.',
};

export default function StoresPage() {
  return <StoresBrowser />;
}

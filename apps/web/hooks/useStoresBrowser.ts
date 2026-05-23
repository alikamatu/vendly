'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { storeApi, BrowseStoresParams, BrowseStore } from '@/lib/api/store';

const DEFAULT_LIMIT = 12;
const SEARCH_DEBOUNCE_MS = 320;

export interface StoresBrowserState {
  search: string;
  setSearch: (v: string) => void;
  location: string | null;
  setLocation: (v: string | null) => void;
  isProOnly: boolean;
  setIsProOnly: (v: boolean) => void;
  sort: string;
  setSort: (v: string) => void;
  page: number;
  setPage: (v: number) => void;

  activeChips: ActiveChip[];
  clearAll: () => void;

  data: BrowseStore[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  reload: () => void;
}

export interface ActiveChip {
  key: string;
  label: string;
  onClear: () => void;
}

export function useStoresBrowser(): StoresBrowserState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read URL params once on load
  const initial = useMemo(() => readParams(searchParams), []);

  const [search, setSearchValue] = useState(initial.search);
  const [location, setLocation] = useState<string | null>(initial.location);
  const [isProOnly, setIsProOnly] = useState(initial.isProOnly);
  const [sort, setSort] = useState(initial.sort);
  const [page, setPageValue] = useState(initial.page);

  // Debounced search term
  const [committedSearch, setCommittedSearch] = useState(initial.search);
  useEffect(() => {
    const t = setTimeout(() => setCommittedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const resetPage = useCallback(() => setPageValue(1), []);

  const setSearch = useCallback(
    (v: string) => {
      setSearchValue(v);
      resetPage();
    },
    [resetPage],
  );

  const wrap =
    <T>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      resetPage();
    };

  // Sync state to URL
  useEffect(() => {
    const qs = new URLSearchParams();
    if (committedSearch) qs.set('q', committedSearch);
    if (location) qs.set('location', location);
    if (isProOnly) qs.set('is_pro', 'true');
    if (sort !== 'default') qs.set('sort', sort);
    if (page > 1) qs.set('page', String(page));

    const s = qs.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }, [committedSearch, location, isProOnly, sort, page, pathname, router]);

  // Data fetching
  const [data, setData] = useState<BrowseStore[]>([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: DEFAULT_LIMIT,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const firstFetch = useRef(true);

  useEffect(() => {
    let cancelled = false;

    const params: BrowseStoresParams = {
      search: committedSearch || undefined,
      location: location || undefined,
      is_pro: isProOnly ? true : undefined,
      sort: sort as any,
      page,
      limit: DEFAULT_LIMIT,
    };

    if (firstFetch.current) setIsLoading(true);
    else setIsRefreshing(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);

    storeApi
      .browseStores(params)
      .then((res) => {
        if (cancelled) return;
        setData(res.stores);
        setMeta({
          total: res.total,
          page: res.page,
          limit: res.limit,
          totalPages: res.totalPages,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load stores');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
        setIsRefreshing(false);
        firstFetch.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [committedSearch, location, isProOnly, sort, page, reloadTick]);

  // Filter chips
  const activeChips: ActiveChip[] = useMemo(() => {
    const chips: ActiveChip[] = [];
    if (committedSearch) {
      chips.push({
        key: 'search',
        label: `"${committedSearch}"`,
        onClear: () => setSearch(''),
      });
    }
    if (location) {
      chips.push({
        key: 'location',
        label: location,
        onClear: () => wrap(setLocation)(null),
      });
    }
    if (isProOnly) {
      chips.push({
        key: 'is_pro',
        label: 'PRO badge only',
        onClear: () => wrap(setIsProOnly)(false),
      });
    }
    return chips;
  }, [committedSearch, location, isProOnly, setSearch, wrap]);

  const clearAll = useCallback(() => {
    setSearchValue('');
    setCommittedSearch('');
    setLocation(null);
    setIsProOnly(false);
    setSort('default');
    setPageValue(1);
  }, []);

  return {
    search,
    setSearch,
    location,
    setLocation: wrap(setLocation),
    isProOnly,
    setIsProOnly: wrap(setIsProOnly),
    sort,
    setSort: wrap(setSort),
    page,
    setPage: setPageValue,
    activeChips,
    clearAll,
    data,
    meta,
    isLoading,
    isRefreshing,
    error,
    reload: () => setReloadTick((t) => t + 1),
  };
}

function readParams(sp: URLSearchParams) {
  return {
    search: sp.get('q') ?? '',
    location: sp.get('location'),
    isProOnly: sp.get('is_pro') === 'true',
    sort: sp.get('sort') || 'default',
    page: Math.max(1, Number(sp.get('page')) || 1),
  };
}

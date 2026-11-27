'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { recordShoppingHabit } from '@/lib/cookies/shopping-habits';
import {
  productApi,
  BrowseProductsParams,
  BrowseProductsResponse,
  BrowseSort,
  ServiceAreaFilter,
  DeliveryTimeFilter,
} from '@/lib/api/product';

const DEFAULT_LIMIT = 24;
const SEARCH_DEBOUNCE_MS = 320;

const VALID_SORTS: readonly BrowseSort[] = [
  'featured',
  'newest',
  'oldest',
  'price_asc',
  'price_desc',
  'popular',
  'discount_desc',
];

export interface ProductsBrowserState {
  // Filters / query
  search: string;
  setSearch: (v: string) => void;
  category: string | null;
  setCategory: (v: string | null) => void;
  subcategory: string | null;
  setSubcategory: (v: string | null) => void;
  brand: string | null;
  setBrand: (v: string | null) => void;
  minPrice: number | null;
  maxPrice: number | null;
  setPrice: (min: number | null, max: number | null) => void;
  condition: string | null;
  setCondition: (v: string | null) => void;
  inStock: boolean;
  setInStock: (v: boolean) => void;
  hasVideo: boolean;
  setHasVideo: (v: boolean) => void;
  hasDiscount: boolean;
  setHasDiscount: (v: boolean) => void;
  region: string | null;
  setRegion: (v: string | null) => void;
  cityId: string | null;
  setCityId: (v: string | null) => void;
  serviceArea: ServiceAreaFilter | null;
  setServiceArea: (v: ServiceAreaFilter | null) => void;
  deliveryTime: DeliveryTimeFilter | null;
  setDeliveryTime: (v: DeliveryTimeFilter | null) => void;
  sort: BrowseSort;
  setSort: (v: BrowseSort) => void;
  page: number;
  setPage: (v: number) => void;

  // Derived
  activeChips: ActiveChip[];
  clearAll: () => void;

  // Data & Endless Scroll
  data: BrowseProductsResponse['data'];
  meta: BrowseProductsResponse['meta'];
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMoreError: string | null;
  loadMore: () => void;
  retryLoadMore: () => void;
  reload: () => void;
}

export interface ActiveChip {
  key: string;
  label: string;
  onClear: () => void;
}

export interface InitialProductsBrowserData {
  data?: BrowseProductsResponse['data'];
  meta?: BrowseProductsResponse['meta'];
}

export function useProductsBrowser(
  initialServer?: InitialProductsBrowserData,
): ProductsBrowserState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize from URL
  const searchParamsKey = searchParams.toString();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => readParams(searchParams), []);
  const lastPushedQuery = useRef<string | null>(null);

  const [search, setSearchValue] = useState(initial.search);
  const [category, setCategory] = useState<string | null>(initial.category);
  const [subcategory, setSubcategory] = useState<string | null>(initial.subcategory);
  const [brand, setBrand] = useState<string | null>(initial.brand);
  const [minPrice, setMinPrice] = useState<number | null>(initial.minPrice);
  const [maxPrice, setMaxPrice] = useState<number | null>(initial.maxPrice);
  const [condition, setCondition] = useState<string | null>(initial.condition);
  const [inStock, setInStock] = useState(initial.inStock);
  const [hasVideo, setHasVideo] = useState(initial.hasVideo);
  const [hasDiscount, setHasDiscount] = useState(initial.hasDiscount);
  const [region, setRegion] = useState<string | null>(initial.region);
  const [cityId, setCityId] = useState<string | null>(initial.cityId);
  const [serviceArea, setServiceArea] = useState<ServiceAreaFilter | null>(initial.serviceArea);
  const [deliveryTime, setDeliveryTime] = useState<DeliveryTimeFilter | null>(initial.deliveryTime);
  const [sort, setSort] = useState<BrowseSort>(initial.sort);
  const [page, setPageValue] = useState(1);

  // Debounced search → committed value (drives the fetch and resets page once committed)
  const [committedSearch, setCommittedSearch] = useState(initial.search);
  useEffect(() => {
    const t = setTimeout(() => {
      setCommittedSearch((prev) => {
        if (prev !== search) {
          setPageValue(1);
        }
        return search;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  // Re-sync local filter state when the user navigates externally (e.g. clicking
  // "Products" in the header after viewing `/products?category=Fashion`, or
  // clicking another category link).
  useEffect(() => {
    if (lastPushedQuery.current !== null && searchParamsKey === lastPushedQuery.current) {
      return;
    }
    const next = readParams(new URLSearchParams(searchParamsKey));
    setSearchValue(next.search);
    setCommittedSearch(next.search);
    setCategory(next.category);
    setSubcategory(next.subcategory);
    setBrand(next.brand);
    setMinPrice(next.minPrice);
    setMaxPrice(next.maxPrice);
    setCondition(next.condition);
    setInStock(next.inStock);
    setHasVideo(next.hasVideo);
    setHasDiscount(next.hasDiscount);
    setRegion(next.region);
    setCityId(next.cityId);
    setServiceArea(next.serviceArea);
    setDeliveryTime(next.deliveryTime);
    setSort(next.sort);
    setPageValue(1);
    lastPushedQuery.current = searchParamsKey;
  }, [searchParamsKey]);

  const setPrice = useCallback((min: number | null, max: number | null) => {
    setMinPrice(min);
    setMaxPrice(max);
    setPageValue(1);
  }, []);

  const resetPage = useCallback(() => setPageValue(1), []);
  const setSearch = useCallback((v: string) => {
    setSearchValue(v);
  }, []);

  // Wrap setters to also reset page to 1
  const wrap =
    <T>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      resetPage();
    };

  // Sync filter state -> URL (shallow, replace; omit `page` so endless scrolling
  // never mutates browser history or query params).
  useEffect(() => {
    const qs = new URLSearchParams();
    if (committedSearch) qs.set('q', committedSearch);
    if (category) qs.set('category', category);
    if (subcategory) qs.set('subcategory', subcategory);
    if (brand) qs.set('brand', brand);
    if (minPrice != null) qs.set('min_price', String(minPrice));
    if (maxPrice != null) qs.set('max_price', String(maxPrice));
    if (condition) qs.set('condition', condition);
    if (inStock) qs.set('in_stock', '1');
    if (hasVideo) qs.set('has_video', '1');
    if (hasDiscount) qs.set('has_discount', '1');
    if (region) qs.set('region', region);
    if (cityId) qs.set('city_id', cityId);
    if (serviceArea) qs.set('service_area', serviceArea);
    if (deliveryTime) qs.set('avg_delivery_time', deliveryTime);
    if (sort !== 'featured') qs.set('sort', sort);
    const s = qs.toString();
    if (s === searchParamsKey) {
      lastPushedQuery.current = s;
      return;
    }
    lastPushedQuery.current = s;
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }, [
    committedSearch,
    category,
    subcategory,
    brand,
    minPrice,
    maxPrice,
    condition,
    inStock,
    hasVideo,
    hasDiscount,
    region,
    cityId,
    serviceArea,
    deliveryTime,
    sort,
    pathname,
    router,
    searchParamsKey,
  ]);

  // Learn shopper preferences in lightweight first-party cookies when browsing categories/search
  useEffect(() => {
    if (committedSearch && committedSearch.trim().length >= 2) {
      recordShoppingHabit('search', {
        query: committedSearch,
        category: category || null,
        subcategory: subcategory || null,
        brand: brand || null,
      });
    } else if (category || subcategory || brand) {
      recordShoppingHabit('browse_category', {
        category: category || null,
        subcategory: subcategory || null,
        brand: brand || null,
      });
    }
  }, [committedSearch, category, subcategory, brand]);

  // Fetch & Endless Scroll Accumulation
  const hasServerInitial = Boolean(initialServer?.data && initialServer.data.length > 0);
  const [data, setData] = useState<BrowseProductsResponse['data']>(initialServer?.data ?? []);
  const [meta, setMeta] = useState<BrowseProductsResponse['meta']>(
    initialServer?.meta ?? {
      total: 0,
      page: 1,
      limit: DEFAULT_LIMIT,
      totalPages: 1,
    },
  );
  const [reachedEnd, setReachedEnd] = useState<boolean>(() => {
    if (!initialServer?.meta) return false;
    return initialServer.meta.page >= initialServer.meta.totalPages;
  });
  const [isLoading, setIsLoading] = useState(!hasServerInitial);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [retryMoreTick, setRetryMoreTick] = useState(0);
  const firstFetch = useRef(!hasServerInitial);

  const filterKey = useMemo(
    () =>
      JSON.stringify([
        committedSearch,
        category,
        brand,
        minPrice,
        maxPrice,
        condition,
        inStock,
        hasVideo,
        hasDiscount,
        region,
        cityId,
        serviceArea,
        deliveryTime,
        sort,
        reloadTick,
      ]),
    [
      committedSearch,
      category,
      brand,
      minPrice,
      maxPrice,
      condition,
      inStock,
      hasVideo,
      hasDiscount,
      region,
      cityId,
      serviceArea,
      deliveryTime,
      sort,
      reloadTick,
    ],
  );

  const prevFilterKeyRef = useRef(filterKey);

  useEffect(() => {
    let cancelled = false;

    const filterChanged = prevFilterKeyRef.current !== filterKey;
    prevFilterKeyRef.current = filterKey;

    const targetPage = filterChanged ? 1 : page;
    if (filterChanged && page !== 1) {
      setPageValue(1);
    }

    const isAppending = targetPage > 1 && !filterChanged;

    const params: BrowseProductsParams = {
      search: committedSearch || undefined,
      category: category || undefined,
      subcategory: subcategory || undefined,
      brand: brand || undefined,
      min_price: minPrice ?? undefined,
      max_price: maxPrice ?? undefined,
      condition: condition || undefined,
      in_stock: inStock || undefined,
      has_video: hasVideo || undefined,
      min_discount: hasDiscount ? 1 : undefined,
      region: region || undefined,
      city_id: cityId || undefined,
      service_area: serviceArea || undefined,
      avg_delivery_time: deliveryTime || undefined,
      sort,
      page: targetPage,
      limit: DEFAULT_LIMIT,
    };

    if (isAppending) {
      setIsLoadingMore(true);
      setLoadMoreError(null);
    } else {
      if (firstFetch.current) setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);
      setLoadMoreError(null);
      setReachedEnd(false);
    }

    productApi
      .browseProducts(params)
      .then((res) => {
        if (cancelled) return;
        if (isAppending) {
          setData((prev) => {
            const seen = new Set(prev.map((item) => String(item.id)));
            const incoming = res.data.filter((item) => !seen.has(String(item.id)));
            return incoming.length > 0 ? [...prev, ...incoming] : prev;
          });
        } else {
          setData(res.data);
        }
        setMeta(res.meta);
        setReachedEnd(res.data.length === 0 || res.meta.page >= res.meta.totalPages);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err?.message || 'Failed to load products';
        if (isAppending) {
          setLoadMoreError(message);
        } else {
          setError(message);
        }
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
        firstFetch.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [
    filterKey,
    committedSearch,
    category,
    subcategory,
    brand,
    minPrice,
    maxPrice,
    condition,
    inStock,
    hasVideo,
    hasDiscount,
    region,
    cityId,
    serviceArea,
    deliveryTime,
    sort,
    page,
    retryMoreTick,
  ]);

  const hasMore =
    !isLoading && !reachedEnd && meta.page < meta.totalPages && data.length < meta.total;

  const loadMore = useCallback(() => {
    if (isLoading || isRefreshing || isLoadingMore || loadMoreError || !hasMore) {
      return;
    }
    setPageValue((prev) => prev + 1);
  }, [isLoading, isRefreshing, isLoadingMore, loadMoreError, hasMore]);

  const retryLoadMore = useCallback(() => {
    if (isLoadingMore) return;
    setLoadMoreError(null);
    setRetryMoreTick((t) => t + 1);
  }, [isLoadingMore]);

  const activeChips: ActiveChip[] = useMemo(() => {
    const chips: ActiveChip[] = [];
    if (committedSearch)
      chips.push({
        key: 'search',
        label: `"${committedSearch}"`,
        onClear: () => setSearchValue(''),
      });
    if (category)
      chips.push({
        key: 'category',
        label: category,
        onClear: () => {
          setCategory(null);
          setSubcategory(null);
          resetPage();
        },
      });
    if (subcategory)
      chips.push({
        key: 'subcategory',
        label: subcategory,
        onClear: () => wrap(setSubcategory)(null),
      });
    if (brand) chips.push({ key: 'brand', label: brand, onClear: () => wrap(setBrand)(null) });
    if (condition)
      chips.push({
        key: 'condition',
        label: titleCase(condition),
        onClear: () => wrap(setCondition)(null),
      });
    if (minPrice != null || maxPrice != null) {
      const label =
        minPrice != null && maxPrice != null
          ? `GH₵${minPrice}–${maxPrice}`
          : minPrice != null
            ? `≥ GH₵${minPrice}`
            : `≤ GH₵${maxPrice}`;
      chips.push({ key: 'price', label, onClear: () => setPrice(null, null) });
    }
    if (inStock)
      chips.push({ key: 'stock', label: 'In stock', onClear: () => wrap(setInStock)(false) });
    if (hasVideo)
      chips.push({ key: 'video', label: 'Has video', onClear: () => wrap(setHasVideo)(false) });
    if (hasDiscount)
      chips.push({ key: 'discount', label: 'On sale', onClear: () => wrap(setHasDiscount)(false) });
    if (region) chips.push({ key: 'region', label: region, onClear: () => wrap(setRegion)(null) });
    if (cityId)
      chips.push({ key: 'city', label: 'Selected city', onClear: () => wrap(setCityId)(null) });
    if (serviceArea)
      chips.push({
        key: 'service_area',
        label: SERVICE_AREA_LABEL[serviceArea],
        onClear: () => wrap(setServiceArea)(null),
      });
    if (deliveryTime)
      chips.push({
        key: 'delivery_time',
        label: DELIVERY_TIME_LABEL[deliveryTime],
        onClear: () => wrap(setDeliveryTime)(null),
      });
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    committedSearch,
    category,
    subcategory,
    brand,
    condition,
    minPrice,
    maxPrice,
    inStock,
    hasVideo,
    hasDiscount,
    region,
    cityId,
    serviceArea,
    deliveryTime,
  ]);

  const clearAll = useCallback(() => {
    setSearchValue('');
    setCommittedSearch('');
    setCategory(null);
    setSubcategory(null);
    setBrand(null);
    setMinPrice(null);
    setMaxPrice(null);
    setCondition(null);
    setInStock(false);
    setHasVideo(false);
    setHasDiscount(false);
    setRegion(null);
    setCityId(null);
    setServiceArea(null);
    setDeliveryTime(null);
    setSort('featured');
    setPageValue(1);
  }, []);

  return {
    search,
    setSearch,
    category,
    setCategory: wrap((v: string | null) => {
      setCategory(v);
      setSubcategory(null);
    }),
    subcategory,
    setSubcategory: wrap(setSubcategory),
    brand,
    setBrand: wrap(setBrand),
    minPrice,
    maxPrice,
    setPrice,
    condition,
    setCondition: wrap(setCondition),
    inStock,
    setInStock: wrap(setInStock),
    hasVideo,
    setHasVideo: wrap(setHasVideo),
    hasDiscount,
    setHasDiscount: wrap(setHasDiscount),
    region,
    setRegion: wrap((v: string | null) => {
      setRegion(v);
      // Clear city when region changes (city no longer in region)
      setCityId(null);
    }),
    cityId,
    setCityId: wrap(setCityId),
    serviceArea,
    setServiceArea: wrap(setServiceArea),
    deliveryTime,
    setDeliveryTime: wrap(setDeliveryTime),
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
    isLoadingMore,
    hasMore,
    error,
    loadMoreError,
    loadMore,
    retryLoadMore,
    reload: () => {
      setPageValue(1);
      setReloadTick((t) => t + 1);
    },
  };
}

function readParams(sp: URLSearchParams) {
  const num = (v: string | null) => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const sa = sp.get('service_area');
  const dt = sp.get('avg_delivery_time');
  const rawSort = sp.get('sort');
  const sort: BrowseSort =
    rawSort && (VALID_SORTS as readonly string[]).includes(rawSort)
      ? (rawSort as BrowseSort)
      : 'featured';

  return {
    search: sp.get('q') ?? '',
    category: sp.get('category'),
    subcategory: sp.get('subcategory'),
    brand: sp.get('brand'),
    minPrice: num(sp.get('min_price')),
    maxPrice: num(sp.get('max_price')),
    condition: sp.get('condition'),
    inStock: sp.get('in_stock') === '1',
    hasVideo: sp.get('has_video') === '1',
    hasDiscount: sp.get('has_discount') === '1',
    region: sp.get('region'),
    cityId: sp.get('city_id'),
    serviceArea:
      sa && (['SAME_CITY', 'NEARBY_STATES', 'NATIONWIDE'] as const).includes(sa as any)
        ? (sa as ServiceAreaFilter)
        : null,
    deliveryTime:
      dt &&
      (
        [
          'SAME_DAY',
          'NEXT_DAY',
          'TWO_TO_THREE_DAYS',
          'FOUR_TO_SEVEN_DAYS',
          'MORE_THAN_ONE_WEEK',
        ] as const
      ).includes(dt as any)
        ? (dt as DeliveryTimeFilter)
        : null,
    sort,
  };
}

export const SERVICE_AREA_LABEL: Record<ServiceAreaFilter, string> = {
  SAME_CITY: 'Same city only',
  NEARBY_STATES: 'Nearby areas',
  NATIONWIDE: 'Delivery set by seller',
};

export const DELIVERY_TIME_LABEL: Record<DeliveryTimeFilter, string> = {
  SAME_DAY: 'Same day',
  NEXT_DAY: 'Next day',
  TWO_TO_THREE_DAYS: '2–3 days',
  FOUR_TO_SEVEN_DAYS: '4–7 days',
  MORE_THAN_ONE_WEEK: '1+ week',
};

function titleCase(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

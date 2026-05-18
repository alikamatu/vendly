"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  productApi,
  BrowseProductsParams,
  BrowseProductsResponse,
  BrowseSort,
  ServiceAreaFilter,
  DeliveryTimeFilter,
} from "@/lib/api/product";

const DEFAULT_LIMIT = 24;
const SEARCH_DEBOUNCE_MS = 320;

export interface ProductsBrowserState {
  // Filters / query
  search: string;
  setSearch: (v: string) => void;
  category: string | null;
  setCategory: (v: string | null) => void;
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

  // Data
  data: BrowseProductsResponse["data"];
  meta: BrowseProductsResponse["meta"];
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

export function useProductsBrowser(): ProductsBrowserState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize from URL on mount only
  const initial = useMemo(() => readParams(searchParams), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const [search, setSearchValue] = useState(initial.search);
  const [category, setCategory] = useState<string | null>(initial.category);
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
  const [page, setPageValue] = useState(initial.page);

  // Debounced search → committed value (drives the fetch)
  const [committedSearch, setCommittedSearch] = useState(initial.search);
  useEffect(() => {
    const t = setTimeout(() => setCommittedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const setPrice = useCallback((min: number | null, max: number | null) => {
    setMinPrice(min);
    setMaxPrice(max);
    setPageValue(1);
  }, []);

  // Reset to page 1 whenever a filter (other than page itself) changes
  const resetPage = useCallback(() => setPageValue(1), []);
  const setSearch = useCallback((v: string) => {
    setSearchValue(v);
    resetPage();
  }, [resetPage]);

  // Wrap setters to also reset page
  const wrap = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    resetPage();
  };

  // Sync state -> URL (shallow, replace so back-button still works between sessions)
  useEffect(() => {
    const qs = new URLSearchParams();
    if (committedSearch) qs.set("q", committedSearch);
    if (category) qs.set("category", category);
    if (brand) qs.set("brand", brand);
    if (minPrice != null) qs.set("min_price", String(minPrice));
    if (maxPrice != null) qs.set("max_price", String(maxPrice));
    if (condition) qs.set("condition", condition);
    if (inStock) qs.set("in_stock", "1");
    if (hasVideo) qs.set("has_video", "1");
    if (hasDiscount) qs.set("has_discount", "1");
    if (region) qs.set("region", region);
    if (cityId) qs.set("city_id", cityId);
    if (serviceArea) qs.set("service_area", serviceArea);
    if (deliveryTime) qs.set("avg_delivery_time", deliveryTime);
    if (sort !== "newest") qs.set("sort", sort);
    if (page > 1) qs.set("page", String(page));
    const s = qs.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }, [
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
    page,
    pathname,
    router,
  ]);

  // Fetch
  const [data, setData] = useState<BrowseProductsResponse["data"]>([]);
  const [meta, setMeta] = useState<BrowseProductsResponse["meta"]>({
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

    const params: BrowseProductsParams = {
      search: committedSearch || undefined,
      category: category || undefined,
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
      page,
      limit: DEFAULT_LIMIT,
    };

    if (firstFetch.current) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    productApi
      .browseProducts(params)
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        setMeta(res.meta);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Failed to load products");
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
  }, [
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
    page,
    reloadTick,
  ]);

  const activeChips: ActiveChip[] = useMemo(() => {
    const chips: ActiveChip[] = [];
    if (committedSearch)
      chips.push({
        key: "search",
        label: `"${committedSearch}"`,
        onClear: () => setSearch(""),
      });
    if (category)
      chips.push({ key: "category", label: category, onClear: () => wrap(setCategory)(null) });
    if (brand)
      chips.push({ key: "brand", label: brand, onClear: () => wrap(setBrand)(null) });
    if (condition)
      chips.push({ key: "condition", label: titleCase(condition), onClear: () => wrap(setCondition)(null) });
    if (minPrice != null || maxPrice != null) {
      const label =
        minPrice != null && maxPrice != null
          ? `GH₵${minPrice}–${maxPrice}`
          : minPrice != null
            ? `≥ GH₵${minPrice}`
            : `≤ GH₵${maxPrice}`;
      chips.push({ key: "price", label, onClear: () => setPrice(null, null) });
    }
    if (inStock)
      chips.push({ key: "stock", label: "In stock", onClear: () => wrap(setInStock)(false) });
    if (hasVideo)
      chips.push({ key: "video", label: "Has video", onClear: () => wrap(setHasVideo)(false) });
    if (hasDiscount)
      chips.push({ key: "discount", label: "On sale", onClear: () => wrap(setHasDiscount)(false) });
    if (region)
      chips.push({ key: "region", label: region, onClear: () => wrap(setRegion)(null) });
    if (cityId)
      chips.push({ key: "city", label: "Selected city", onClear: () => wrap(setCityId)(null) });
    if (serviceArea)
      chips.push({
        key: "service_area",
        label: SERVICE_AREA_LABEL[serviceArea],
        onClear: () => wrap(setServiceArea)(null),
      });
    if (deliveryTime)
      chips.push({
        key: "delivery_time",
        label: DELIVERY_TIME_LABEL[deliveryTime],
        onClear: () => wrap(setDeliveryTime)(null),
      });
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    committedSearch,
    category,
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
    setSearchValue("");
    setCommittedSearch("");
    setCategory(null);
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
    setSort("newest");
    setPageValue(1);
  }, []);

  return {
    search,
    setSearch,
    category,
    setCategory: wrap(setCategory),
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
    error,
    reload: () => setReloadTick((t) => t + 1),
  };
}

function readParams(sp: URLSearchParams) {
  const num = (v: string | null) => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const sa = sp.get("service_area");
  const dt = sp.get("avg_delivery_time");
  return {
    search: sp.get("q") ?? "",
    category: sp.get("category"),
    brand: sp.get("brand"),
    minPrice: num(sp.get("min_price")),
    maxPrice: num(sp.get("max_price")),
    condition: sp.get("condition"),
    inStock: sp.get("in_stock") === "1",
    hasVideo: sp.get("has_video") === "1",
    hasDiscount: sp.get("has_discount") === "1",
    region: sp.get("region"),
    cityId: sp.get("city_id"),
    serviceArea:
      sa && (["SAME_CITY", "NEARBY_STATES", "NATIONWIDE"] as const).includes(sa as any)
        ? (sa as ServiceAreaFilter)
        : null,
    deliveryTime:
      dt &&
      ([
        "SAME_DAY",
        "NEXT_DAY",
        "TWO_TO_THREE_DAYS",
        "FOUR_TO_SEVEN_DAYS",
        "MORE_THAN_ONE_WEEK",
      ] as const).includes(dt as any)
        ? (dt as DeliveryTimeFilter)
        : null,
    sort: (sp.get("sort") as BrowseSort) || "newest",
    page: Math.max(1, Number(sp.get("page")) || 1),
  };
}

export const SERVICE_AREA_LABEL: Record<ServiceAreaFilter, string> = {
  SAME_CITY: "Same city only",
  NEARBY_STATES: "Nearby states",
  NATIONWIDE: "Nationwide",
};

export const DELIVERY_TIME_LABEL: Record<DeliveryTimeFilter, string> = {
  SAME_DAY: "Same day",
  NEXT_DAY: "Next day",
  TWO_TO_THREE_DAYS: "2–3 days",
  FOUR_TO_SEVEN_DAYS: "4–7 days",
  MORE_THAN_ONE_WEEK: "1+ week",
};

function titleCase(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

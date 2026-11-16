import React, { useEffect } from 'react';
import { Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemeColors } from '@/components/ui';
import { estimateHeightRatio } from '@/lib/image-ratio';

/**
 * Shared pulse driver so every skeleton on screen breathes in sync
 * (one animation loop instead of one per block).
 */
const pulse = new Animated.Value(0);
let subscribers = 0;
let loop: Animated.CompositeAnimation | null = null;

function usePulse() {
  useEffect(() => {
    subscribers += 1;
    if (!loop) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 750,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 750,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
    }
    return () => {
      subscribers -= 1;
      if (subscribers <= 0 && loop) {
        loop.stop();
        loop = null;
        subscribers = 0;
      }
    };
  }, []);
  return pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
}

export function Skeleton({
  width,
  height,
  radius = 10,
  style,
}: {
  width?: ViewStyle['width'];
  height?: ViewStyle['height'];
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();
  const opacity = usePulse();
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.dark ? '#1f1f1f' : '#eceef1',
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Mirrors ProductCard: variable-height image + title + price + seller row. */
export function ProductCardSkeleton({ heightRatio = 1.2 }: { heightRatio?: number }) {
  return (
    <View>
      <Skeleton width="100%" radius={20} style={{ aspectRatio: 1 / heightRatio }} />
      <View style={{ gap: 6, paddingHorizontal: 4, paddingTop: 8 }}>
        <Skeleton width="85%" height={11} radius={6} />
        <Skeleton width="40%" height={11} radius={6} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Skeleton width={16} height={16} radius={8} />
          <Skeleton width="45%" height={9} radius={5} />
        </View>
      </View>
    </View>
  );
}

/** Two staggered columns of card skeletons, Pinterest style. */
export function MasonrySkeleton({ count = 6, gap = 12 }: { count?: number; gap?: number }) {
  const left: number[] = [];
  const right: number[] = [];
  for (let i = 0; i < count; i++) {
    const ratio = estimateHeightRatio(`skeleton-${i}`);
    (i % 2 === 0 ? left : right).push(ratio);
  }
  return (
    <View style={{ flexDirection: 'row', gap }}>
      {[left, right].map((col, c) => (
        <View key={c} style={{ flex: 1, gap: 18 }}>
          {col.map((ratio, i) => (
            <ProductCardSkeleton key={i} heightRatio={ratio} />
          ))}
        </View>
      ))}
    </View>
  );
}

export function StoreCardSkeleton({ width }: { width?: number }) {
  const colors = useThemeColors();
  return (
    <View
      style={{
        width,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
    >
      <Skeleton width="100%" height={80} radius={0} />
      <View style={{ padding: 16, gap: 8 }}>
        <Skeleton width={56} height={56} radius={16} style={{ marginTop: -44 }} />
        <Skeleton width="60%" height={13} radius={6} />
        <Skeleton width="35%" height={10} radius={5} />
        <Skeleton width="90%" height={10} radius={5} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={undefined} radius={12} style={{ flex: 1, aspectRatio: 1 }} />
          ))}
        </View>
        <Skeleton width="100%" height={38} radius={12} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

export function StoreListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 16, padding: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <StoreCardSkeleton key={i} />
      ))}
    </View>
  );
}

/** Generic row list (orders, notifications, addresses…). */
export function ListSkeleton({ rows = 6, count }: { rows?: number; count?: number }) {
  const colors = useThemeColors();
  const total = count ?? rows;
  return (
    <View style={{ flex: 1, gap: 10, padding: 16, backgroundColor: colors.background }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            gap: 12,
            alignItems: 'center',
            padding: 14,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Skeleton width={44} height={44} radius={12} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="70%" height={11} radius={6} />
            <Skeleton width="45%" height={9} radius={5} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function ProductDetailSkeleton({ width }: { width: number }) {
  const colors = useThemeColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Skeleton width={width} height={width} radius={0} />
      <View style={{ padding: 20, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Skeleton width={70} height={22} radius={11} />
          <Skeleton width={56} height={22} radius={11} />
        </View>
        <Skeleton width="80%" height={18} radius={6} />
        <Skeleton width="55%" height={18} radius={6} />
        <Skeleton width="35%" height={24} radius={6} style={{ marginTop: 4 }} />
        <Skeleton width="100%" height={72} radius={16} style={{ marginTop: 12 }} />
        <Skeleton width="40%" height={13} radius={6} style={{ marginTop: 12 }} />
        <Skeleton width="100%" height={10} radius={5} />
        <Skeleton width="95%" height={10} radius={5} />
        <Skeleton width="70%" height={10} radius={5} />
      </View>
    </View>
  );
}

/** Home screen: hero + category tiles + store rail + masonry. */
export function HomeSkeleton() {
  return (
    <View style={{ padding: 16, gap: 24 }}>
      <Skeleton width="100%" height={210} radius={24} />
      <View style={{ gap: 12 }}>
        <Skeleton width="45%" height={14} radius={6} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="48%" height={110} radius={18} />
          ))}
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <Skeleton width="40%" height={14} radius={6} />
        <MasonrySkeleton count={6} />
      </View>
    </View>
  );
}

/** Storefront screen: banner + avatar + bio + masonry catalog. */
export function StorefrontSkeleton() {
  const colors = useThemeColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Skeleton width="100%" height={144} radius={0} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}>
        <View
          style={{
            marginTop: -44,
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <Skeleton width={88} height={88} radius={24} />
          <Skeleton width={130} height={38} radius={20} />
        </View>
        <Skeleton width="55%" height={18} radius={6} />
        <Skeleton width="30%" height={12} radius={5} />
        <Skeleton width="85%" height={12} radius={5} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <Skeleton width={90} height={26} radius={13} />
          <Skeleton width={110} height={26} radius={13} />
        </View>
        <Skeleton width="100%" height={40} radius={16} style={{ marginTop: 12 }} />
        <View style={{ marginTop: 8 }}>
          <MasonrySkeleton count={4} />
        </View>
      </View>
    </View>
  );
}

/** Categories screen skeleton */
export function CategoriesSkeleton() {
  const colors = useThemeColors();
  return (
    <View style={{ padding: 16, gap: 16, backgroundColor: colors.background }}>
      <Skeleton width="45%" height={16} radius={6} />
      <Skeleton width="75%" height={12} radius={5} />
      <Skeleton width="100%" height={44} radius={16} style={{ marginTop: 4 }} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        {[70, 90, 80, 100].map((w, i) => (
          <Skeleton key={i} width={w} height={32} radius={16} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} width="48%" height={150} radius={20} />
        ))}
      </View>
    </View>
  );
}

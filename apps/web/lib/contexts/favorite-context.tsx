"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { favoriteApi } from "@/lib/api/favorite";
import { useAuth } from "@/lib/contexts/auth-context";

interface FavoriteContextType {
  favorites: string[];
  toggleFavorite: (productId: string) => Promise<void>;
  isFavorited: (productId: string) => boolean;
  isLoading: boolean;
}

const FavoriteContext = createContext<FavoriteContextType | undefined>(undefined);

export function FavoriteProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadFavorites();
    } else {
      setFavorites([]);
      setIsLoading(false);
    }
  }, [user]);

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      const ids = await favoriteApi.getFavoriteIds();
      setFavorites(ids.map(id => String(id)));

    } catch (err) {
      console.error("Failed to load favorites", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (productId: string) => {
    if (!user) return;

    // Optimistic update
    const isCurrentlyFavorited = favorites.includes(productId);
    setFavorites(prev => 
      isCurrentlyFavorited 
        ? prev.filter(id => id !== productId) 
        : [...prev, productId]
    );

    try {
      await favoriteApi.toggleFavorite(productId);
    } catch (err) {
      // Rollback on error
      setFavorites(prev => 
        isCurrentlyFavorited 
          ? [...prev, productId] 
          : prev.filter(id => id !== productId)
      );
      console.error("Failed to toggle favorite", err);
    }
  };

  const isFavorited = (productId: string) => favorites.includes(productId);

  return (
    <FavoriteContext.Provider value={{ favorites, toggleFavorite, isFavorited, isLoading }}>
      {children}
    </FavoriteContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoriteContext);
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoriteProvider");
  }
  return context;
}

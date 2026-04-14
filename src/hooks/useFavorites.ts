import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "erp_sidebar_favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = useCallback((url: string) => {
    setFavorites(prev =>
      prev.includes(url) ? prev.filter(f => f !== url) : [...prev, url]
    );
  }, []);

  const isFavorite = useCallback((url: string) => favorites.includes(url), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}

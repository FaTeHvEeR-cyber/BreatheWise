import { useEffect, useRef, useState } from 'react';
import type { CityLocation } from '../types';
import { searchIndianAndGlobalCities } from '../services/aqiService';

export interface UseCitySearchReturn {
  query: string;
  setQuery: (value: string) => void;
  results: CityLocation[];
  searching: boolean;
  searchError: string | null;
  clearSearch: () => void;
}

/** Debounced Open-Meteo city geocoding search hook with request cancellation. */
export function useCitySearch(): UseCitySearchReturn {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<CityLocation[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    const timer = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setSearching(true);
      setSearchError(null);

      searchIndianAndGlobalCities(trimmed, controller.signal)
        .then((cities) => {
          if (!controller.signal.aborted) {
            setResults(cities);
            setSearching(false);
          }
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setSearchError(err instanceof Error ? err.message : 'City lookup failed.');
          setResults([]);
          setSearching(false);
        });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSearchError(null);
  };

  return { query, setQuery, results, searching, searchError, clearSearch };
}

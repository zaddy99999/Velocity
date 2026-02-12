'use client';

import { useRef, useEffect } from 'react';
import useSWR from 'swr';
import type { CoinMarketData, GlobalData, FearGreedData, NewsItem, DeFiProtocol, ChainData } from './types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function useLastUpdated<T>(data: T | undefined) {
  const lastUpdated = useRef<string | null>(null);

  useEffect(() => {
    if (data !== undefined) {
      lastUpdated.current = new Date().toISOString();
    }
  }, [data]);

  return lastUpdated.current;
}

interface GasData {
  low: number;
  average: number;
  fast: number;
}

interface GlobalMetricsData {
  global: GlobalData;
  fearGreed: FearGreedData;
  gas: GasData;
}

export function useCryptoPrices() {
  const { data, error, isLoading, mutate } = useSWR<CoinMarketData[]>(
    '/api/crypto/prices',
    fetcher,
    {
      refreshInterval: 60000, // Refresh every 60 seconds
      dedupingInterval: 30000,
      revalidateOnFocus: false,
    }
  );
  const lastUpdated = useLastUpdated(data);

  return {
    prices: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
    lastUpdated,
  };
}

export function useGlobalMetrics() {
  const { data, error, isLoading, mutate } = useSWR<GlobalMetricsData>(
    '/api/crypto/global',
    fetcher,
    {
      refreshInterval: 60000,
      dedupingInterval: 30000,
      revalidateOnFocus: false,
    }
  );
  const lastUpdated = useLastUpdated(data);

  return {
    global: data?.global,
    fearGreed: data?.fearGreed,
    gas: data?.gas,
    isLoading,
    isError: error,
    refresh: mutate,
    lastUpdated,
  };
}

export function useNews() {
  const { data, error, isLoading, mutate } = useSWR<NewsItem[]>(
    '/api/crypto/news',
    fetcher,
    {
      refreshInterval: 120000, // Refresh every 2 minutes
      dedupingInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  return {
    news: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

export function useFinanceNews() {
  const { data, error, isLoading, mutate } = useSWR<NewsItem[]>(
    '/api/finance/news',
    fetcher,
    {
      refreshInterval: 120000, // Refresh every 2 minutes
      dedupingInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  return {
    news: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

export function useTVL() {
  const { data, error, isLoading, mutate } = useSWR<DeFiProtocol[]>(
    '/api/crypto/tvl',
    fetcher,
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      dedupingInterval: 60000,
      revalidateOnFocus: false,
    }
  );

  return {
    protocols: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

export function useChains() {
  const { data, error, isLoading, mutate } = useSWR<ChainData[]>(
    '/api/crypto/chains',
    fetcher,
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      dedupingInterval: 60000,
      revalidateOnFocus: false,
    }
  );
  const lastUpdated = useLastUpdated(data);

  return {
    chains: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
    lastUpdated,
  };
}

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { FeatureMap } from '../types';

interface FeaturesState {
  features: FeatureMap | null;
  loading: boolean;
  error: unknown;
  refresh: () => Promise<void>;
}

const FeaturesContext = createContext<FeaturesState>(null!);

export const useFeatures = () => useContext(FeaturesContext);

export function FeaturesProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<FeatureMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.features();
      setFeatures(response.features);
    } catch (requestError) {
      setError(requestError);
      throw requestError;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  return (
    <FeaturesContext.Provider value={{ features, loading, error, refresh }}>
      {children}
    </FeaturesContext.Provider>
  );
}

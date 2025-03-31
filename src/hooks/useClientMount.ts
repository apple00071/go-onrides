import { useState, useEffect, useCallback } from 'react';

export function useClientMount() {
  const [isMounted, setIsMounted] = useState(false);

  const mount = useCallback(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    mount();
    return () => setIsMounted(false);
  }, [mount]);

  return isMounted;
} 
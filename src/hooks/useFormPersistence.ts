import { useState, useEffect, useCallback, useRef } from 'react';

interface PersistedData<T> {
  data: T;
  timestamp: number;
}

const EXPIRATION_DAYS = 7;
const DEBOUNCE_MS = 500;

export function useFormPersistence<T extends Record<string, any>>(
  key: string,
  initialData: T,
  enabled: boolean = true
): [T, React.Dispatch<React.SetStateAction<T>>, () => void, boolean] {
  const [formData, setFormDataInternal] = useState<T>(initialData);
  const [hasRestoredData, setHasRestoredData] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitialMount = useRef(true);

  // Restore data on mount
  useEffect(() => {
    if (!enabled || !isInitialMount.current) return;
    isInitialMount.current = false;

    try {
      const stored = localStorage.getItem(`form_${key}`);
      if (stored) {
        const parsed: PersistedData<T> = JSON.parse(stored);
        const ageInDays = (Date.now() - parsed.timestamp) / (1000 * 60 * 60 * 24);
        
        if (ageInDays < EXPIRATION_DAYS) {
          setFormDataInternal(parsed.data);
          setHasRestoredData(true);
        } else {
          // Data expired, remove it
          localStorage.removeItem(`form_${key}`);
        }
      }
    } catch (error) {
      console.error('Error restoring form data:', error);
    }
  }, [key, enabled]);

  // Save data to localStorage with debounce
  useEffect(() => {
    if (!enabled || isInitialMount.current) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for saving
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const dataToSave: PersistedData<T> = {
          data: formData,
          timestamp: Date.now(),
        };
        localStorage.setItem(`form_${key}`, JSON.stringify(dataToSave));
      } catch (error) {
        console.error('Error saving form data:', error);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, key, enabled]);

  // Clear persisted data
  const clearPersistedData = useCallback(() => {
    try {
      localStorage.removeItem(`form_${key}`);
      setHasRestoredData(false);
    } catch (error) {
      console.error('Error clearing persisted data:', error);
    }
  }, [key]);

  // Cleanup old persisted data on unmount
  useEffect(() => {
    return () => {
      // Clean up expired data from all forms
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(k => {
          if (k.startsWith('form_')) {
            try {
              const stored = localStorage.getItem(k);
              if (stored) {
                const parsed: PersistedData<any> = JSON.parse(stored);
                const ageInDays = (Date.now() - parsed.timestamp) / (1000 * 60 * 60 * 24);
                if (ageInDays >= EXPIRATION_DAYS) {
                  localStorage.removeItem(k);
                }
              }
            } catch {}
          }
        });
      } catch (error) {
        console.error('Error cleaning up expired data:', error);
      }
    };
  }, []);

  return [formData, setFormDataInternal, clearPersistedData, hasRestoredData];
}

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchDonorEmergencyModeUi } from '@/lib/supabase/donor-profile';

interface DonorContextType {
  emergencyMode: boolean;
  setEmergencyMode: (v: boolean) => void;
  language: string;
  setLanguage: (v: string) => void;
  notifCount: number;
  setNotifCount: (v: number) => void;
}

const DonorContext = createContext<DonorContextType>({
  emergencyMode: false,
  setEmergencyMode: () => {},
  language: 'English',
  setLanguage: () => {},
  notifCount: 3,
  setNotifCount: () => {},
});

export function DonorProvider({ children }: { children: ReactNode }) {
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [language, setLanguage] = useState('English');
  const [notifCount, setNotifCount] = useState(3);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const on = await fetchDonorEmergencyModeUi();
        if (!cancelled) setEmergencyMode(on);
      } catch {
        /* guest / no session */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DonorContext.Provider value={{ emergencyMode, setEmergencyMode, language, setLanguage, notifCount, setNotifCount }}>
      {children}
    </DonorContext.Provider>
  );
}

export const useDonorContext = () => useContext(DonorContext);
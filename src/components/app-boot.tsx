import { useEffect, useState, ReactNode } from "react";
import { SplashScreen } from "@/components/splash-screen";

const KEY = "qm-splash-shown-v2";

export function AppBoot({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      // Show splash once per browser session
      const seen = sessionStorage.getItem(KEY);
      if (!seen) {
        setShow(true);
        sessionStorage.setItem(KEY, "1");
      }
    } catch { /* ignore */ }
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <>
      {show && <SplashScreen onDone={() => setShow(false)} />}
      {children}
    </>
  );
}

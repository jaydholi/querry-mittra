import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type FontSize = "sm" | "md" | "lg";

type Settings = {
  fontSize: FontSize;
  soundOn: boolean;
  enterToSend: boolean;
  showTimestamps: boolean;
};

type SettingsCtx = Settings & {
  setFontSize: (s: FontSize) => void;
  setSoundOn: (b: boolean) => void;
  setEnterToSend: (b: boolean) => void;
  setShowTimestamps: (b: boolean) => void;
};

const KEY = "qm-settings";
const defaults: Settings = {
  fontSize: "md",
  soundOn: false,
  enterToSend: true,
  showTimestamps: true,
};

const Ctx = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(defaults);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS({ ...defaults, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch { /* ignore */ }
  }, [s]);

  return (
    <Ctx.Provider
      value={{
        ...s,
        setFontSize: (fontSize) => setS((p) => ({ ...p, fontSize })),
        setSoundOn: (soundOn) => setS((p) => ({ ...p, soundOn })),
        setEnterToSend: (enterToSend) => setS((p) => ({ ...p, enterToSend })),
        setShowTimestamps: (showTimestamps) => setS((p) => ({ ...p, showTimestamps })),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSettings() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSettings must be inside SettingsProvider");
  return v;
}

export function playBeep() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 660;
    o.type = "sine";
    g.gain.value = 0.05;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.08);
    setTimeout(() => ctx.close(), 200);
  } catch { /* ignore */ }
}

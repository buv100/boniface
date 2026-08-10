import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import t, { Lang } from "@/lib/translations";

const LANG_KEY = "@bar_tips_lang";

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => Promise<void>;
  tr: typeof t.ru;
  isRTL: boolean;
}

const LangContext = createContext<LangContextType | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("he");

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((v) => {
      if (v === "ru" || v === "en" || v === "he") setLangState(v);
    });
  }, []);

  const setLang = useCallback(async (l: Lang) => {
    setLangState(l);
    await AsyncStorage.setItem(LANG_KEY, l);
  }, []);

  const tr = t[lang];
  const isRTL = lang === "he";

  return (
    <LangContext.Provider value={{ lang, setLang, tr, isRTL }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}

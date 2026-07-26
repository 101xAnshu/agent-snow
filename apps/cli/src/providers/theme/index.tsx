import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { SyntaxStyle } from "@opentui/core";
import { THEMES, DEFAULT_THEME, type Theme } from "../../themes/index.js";
import type { ThemeColors, SyntaxStyle as SyntaxStyleType } from "../../themes/index.js";

type ThemeContextValue = {
  colors: ThemeColors;
  currentTheme: string;
  setTheme: (name: string) => void;
  syntaxStyle: SyntaxStyle;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const PREFS_PATH = `${process.env.HOME ?? process.env.USERPROFILE}/.snow/preferences.json`;

async function loadSavedTheme(): Promise<string> {
  try {
    const file = Bun.file(PREFS_PATH);
    if (!(await file.exists())) return DEFAULT_THEME.name;
    const data = (await file.json()) as { theme?: string };
    return data.theme ?? DEFAULT_THEME.name;
  } catch {
    return DEFAULT_THEME.name;
  }
}

async function saveTheme(name: string): Promise<void> {
  try {
    await Bun.write(PREFS_PATH, JSON.stringify({ theme: name }, null, 2));
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState(DEFAULT_THEME.name);

  useEffect(() => {
    loadSavedTheme().then(setThemeName);
  }, []);

  const setTheme = useCallback((name: string) => {
    setThemeName(name);
    saveTheme(name);
  }, []);

  const theme = useMemo(
    () => THEMES.find((t) => t.name === themeName) ?? DEFAULT_THEME,
    [themeName],
  );

  const syntaxStyle = useMemo(
    () =>
      SyntaxStyle.fromStyles({
        keyword: { fg: theme.syntaxStyle.keyword },
        string: { fg: theme.syntaxStyle.string },
        number: { fg: theme.syntaxStyle.number },
        comment: { fg: theme.syntaxStyle.comment },
        function: { fg: theme.syntaxStyle.function },
        type: { fg: theme.syntaxStyle.type },
        default: {},
        "markup.raw": { fg: theme.colors.info },
        "markup.strong": { fg: theme.colors.primary, bold: true },
        "markup.italic": { italic: true },
        "markup.strikethrough": { dim: true },
        "markup.link": { fg: theme.colors.selection },
        "markup.link.label": { fg: theme.colors.primary },
        "markup.link.url": { fg: theme.colors.selection, underline: true },
        "markup.heading": { fg: theme.colors.primary, bold: true },
        conceal: { fg: theme.colors.dimSeparator, dim: true },
      }),
    [theme],
  );

  const value = useMemo(
    () => ({ colors: theme.colors, currentTheme: themeName, setTheme, syntaxStyle }),
    [theme.colors, themeName, setTheme, syntaxStyle],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

export type ThemeColors = {
  name: string;
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  surface: string;
  border: string;
  muted: string;
  syntax: {
    keyword: string;
    string: string;
    number: string;
    comment: string;
    function: string;
    type: string;
  };
};

export const THEMES: ThemeColors[] = [
  {
    name: "Nightfox",
    background: "#1a1b26",
    foreground: "#c0caf5",
    primary: "#7aa2f7",
    secondary: "#565f89",
    accent: "#bb9af7",
    success: "#9ece6a",
    warning: "#e0af68",
    error: "#f7768e",
    surface: "#24283b",
    border: "#33467c",
    muted: "#565f89",
    syntax: {
      keyword: "#bb9af7",
      string: "#9ece6a",
      number: "#ff9e64",
      comment: "#565f89",
      function: "#7aa2f7",
      type: "#2ac3de",
    },
  },
  {
    name: "Catppuccin Mocha",
    background: "#1e1e2e",
    foreground: "#cdd6f4",
    primary: "#89b4fa",
    secondary: "#585b70",
    accent: "#cba6f7",
    success: "#a6e3a1",
    warning: "#f9e2af",
    error: "#f38ba8",
    surface: "#313244",
    border: "#45475a",
    muted: "#585b70",
    syntax: {
      keyword: "#cba6f7",
      string: "#a6e3a1",
      number: "#fab387",
      comment: "#585b70",
      function: "#89b4fa",
      type: "#89dceb",
    },
  },
  {
    name: "Dracula",
    background: "#282a36",
    foreground: "#f8f8f2",
    primary: "#bd93f9",
    secondary: "#6272a4",
    accent: "#ff79c6",
    success: "#50fa7b",
    warning: "#f1fa8c",
    error: "#ff5555",
    surface: "#44475a",
    border: "#6272a4",
    muted: "#6272a4",
    syntax: {
      keyword: "#ff79c6",
      string: "#f1fa8c",
      number: "#bd93f9",
      comment: "#6272a4",
      function: "#50fa7b",
      type: "#8be9fd",
    },
  },
  {
    name: "Tokyo Night",
    background: "#0f1419",
    foreground: "#b7c5d3",
    primary: "#7590db",
    secondary: "#545c7e",
    accent: "#c099ff",
    success: "#8bd49c",
    warning: "#e6c384",
    error: "#ec7279",
    surface: "#1a1f2e",
    border: "#2e3c5a",
    muted: "#545c7e",
    syntax: {
      keyword: "#c099ff",
      string: "#8bd49c",
      number: "#e6c384",
      comment: "#545c7e",
      function: "#7590db",
      type: "#6cb6eb",
    },
  },
];

export const DEFAULT_THEME: ThemeColors = THEMES[0];

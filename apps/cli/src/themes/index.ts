export type ThemeColors = {
  primary: string;
  planMode: string;
  selection: string;
  thinking: string;
  success: string;
  error: string;
  info: string;
  background: string;
  surface: string;
  dialogSurface: string;
  thinkingBorder: string;
  dimSeparator: string;
  foreground: string;
  border: string;
};

export type SyntaxStyle = {
  keyword: string;
  string: string;
  number: string;
  comment: string;
  function: string;
  type: string;
};

export type Theme = {
  name: string;
  colors: ThemeColors;
  syntaxStyle: SyntaxStyle;
};

export const THEMES: Theme[] = [
  {
    name: "Nightfox",
    colors: {
      primary: "#56D6C2",
      planMode: "#CF8EF4",
      selection: "#89B4FA",
      thinking: "#CF8EF4",
      success: "#82E0AA",
      error: "#E74C5E",
      info: "#56D6C2",
      background: "#0D0D12",
      surface: "#1A1A24",
      dialogSurface: "#0A0A10",
      thinkingBorder: "#34344A",
      dimSeparator: "#4E4E66",
      foreground: "#C0CAF5",
      border: "#33467C",
    },
    syntaxStyle: {
      keyword: "#BB9AF7",
      string: "#9ECE6A",
      number: "#FF9E64",
      comment: "#565F89",
      function: "#7AA2F7",
      type: "#2AC3DE",
    },
  },
  {
    name: "Catppuccin Mocha",
    colors: {
      primary: "#E0AF68",
      planMode: "#9D7CD8",
      selection: "#B4A4E8",
      thinking: "#9D7CD8",
      success: "#73DACA",
      error: "#F7768E",
      info: "#7AA2F7",
      background: "#11111B",
      surface: "#1E1E2E",
      dialogSurface: "#13131D",
      thinkingBorder: "#45475A",
      dimSeparator: "#585B70",
      foreground: "#CDD6F4",
      border: "#45475A",
    },
    syntaxStyle: {
      keyword: "#CBA6F7",
      string: "#A6E3A1",
      number: "#FAB387",
      comment: "#585B70",
      function: "#89B4FA",
      type: "#89DCEB",
    },
  },
  {
    name: "Dracula",
    colors: {
      primary: "#BD93F9",
      planMode: "#FF79C6",
      selection: "#6272A4",
      thinking: "#FF79C6",
      success: "#50FA7B",
      error: "#FF5555",
      info: "#8BE9FD",
      background: "#282A36",
      surface: "#343746",
      dialogSurface: "#21222C",
      thinkingBorder: "#6272A4",
      dimSeparator: "#44475A",
      foreground: "#F8F8F2",
      border: "#6272A4",
    },
    syntaxStyle: {
      keyword: "#FF79C6",
      string: "#F1FA8C",
      number: "#BD93F9",
      comment: "#6272A4",
      function: "#50FA7B",
      type: "#8BE9FD",
    },
  },
  {
    name: "Tokyo Night",
    colors: {
      primary: "#7AA2F7",
      planMode: "#BB9AF7",
      selection: "#7AA2F7",
      thinking: "#BB9AF7",
      success: "#9ECE6A",
      error: "#F7768E",
      info: "#7DCFFF",
      background: "#1A1B26",
      surface: "#24283B",
      dialogSurface: "#16161E",
      thinkingBorder: "#3B4261",
      dimSeparator: "#565F89",
      foreground: "#B7C5D3",
      border: "#2E3C5A",
    },
    syntaxStyle: {
      keyword: "#C099FF",
      string: "#8BD49C",
      number: "#E6C384",
      comment: "#545C7E",
      function: "#7590DB",
      type: "#6CB6EB",
    },
  },
];

export const DEFAULT_THEME: Theme = THEMES[0];

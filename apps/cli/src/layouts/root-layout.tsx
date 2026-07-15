import { Outlet } from "react-router";
import { ThemeProvider } from "../providers/theme/index.js";
import { ErrorBoundary } from "../components/error-boundary.js";
import { ThemedRoot } from "./themed-root.js";

export function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ThemedRoot>
          <Outlet />
        </ThemedRoot>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

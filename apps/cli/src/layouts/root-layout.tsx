import { Outlet } from "react-router";
import { ThemeProvider } from "../providers/theme/index.js";
import { ToastProvider } from "../providers/toast/index.js";
import { DialogProvider } from "../providers/dialog/index.js";
import { KeyboardLayerProvider } from "../providers/keyboard-layer/index.js";
import { PromptConfigProvider } from "../providers/prompt-config/index.js";
import { ErrorBoundary } from "../components/error-boundary.js";
import { ThemedRoot } from "./themed-root.js";

export function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <KeyboardLayerProvider>
            <DialogProvider>
              <PromptConfigProvider>
                <ThemedRoot>
                  <Outlet />
                </ThemedRoot>
              </PromptConfigProvider>
            </DialogProvider>
          </KeyboardLayerProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <box
            width="100%"
            height="100%"
            justifyContent="center"
            alignItems="center"
          >
            <text fg="red">
              <b>Something went wrong</b>
            </text>
            <text fg="gray">Press Ctrl+C to exit</text>
          </box>
        )
      );
    }
    return this.props.children;
  }
}

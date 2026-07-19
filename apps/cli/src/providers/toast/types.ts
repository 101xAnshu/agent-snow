export type ToastVariant = "success" | "error" | "info";
export type ToastOptions = { variant?: ToastVariant; duration?: number };
export const DEFAULT_DURATION = 3000;

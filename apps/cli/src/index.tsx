import { createRoot } from "@opentui/react";
import { createCliRenderer } from "@opentui/core";
import { createMemoryRouter, RouterProvider } from "react-router";
import { RootLayout } from "./layouts/root-layout.js";
import { Home } from "./screens/home.js";
import { NewSession } from "./screens/new-session.js";
import { Session } from "./screens/session.js";

const renderer = await createCliRenderer({ targetFps: 60, exitOnCtrlC: false });

const router = createMemoryRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/sessions/new", element: <NewSession /> },
      { path: "/sessions/:id", element: <Session /> },
    ],
  },
]);

const root = createRoot(renderer);
root.render(<RouterProvider router={router} />);

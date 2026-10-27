import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ToastProvider } from "@/components/toast";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

export const metadata: Metadata = {
  title: "Group Portal",
  description: "Track tasks, habits, study sessions, and chat with your group.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Group Portal",
  },
  other: {
    // Next emits `mobile-web-app-capable`; iOS still looks for the apple-prefixed
    // tag when deciding whether to open the installed app without Safari chrome.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#171513" },
  ],
};

// Runs before paint so the saved theme and accent never flash the defaults.
// Keep the accent list in sync with ACCENTS in components/theme-control.tsx.
const themeScript = `
(function () {
  try {
    var root = document.documentElement;
    var t = localStorage.getItem("theme");
    if (t === "dark" || ((!t || t === "system") && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      root.classList.add("dark");
    }
    var accents = ["indigo", "violet", "emerald", "teal", "amber", "rose", "slate"];
    var a = localStorage.getItem("theme-accent");
    if (a && accents.indexOf(a) !== -1) root.setAttribute("data-accent", a);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ToastProvider>
          <ServiceWorkerRegister />
          {children}
          <Analytics />
        </ToastProvider>
      </body>
    </html>
  );
}

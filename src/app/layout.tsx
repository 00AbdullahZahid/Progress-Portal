import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/toast";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

export const metadata: Metadata = {
  title: "Group Portal",
  description: "Track tasks, habits, study sessions, and chat with your group.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport = {
  themeColor: "#2563eb",
};

const themeScript = `
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t === "dark" || (!t && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    }
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
        </ToastProvider>
      </body>
    </html>
  );
}

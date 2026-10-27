"use client";

import { useEffect, useState } from "react";

const LIGHT_ICON = "/icon-light-192.png";
const DARK_ICON = "/icon-dark-192.png";

export function SidebarLogo({ size = 32 }: { size?: number }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    function apply() {
      setDark(document.documentElement.classList.contains("dark"));
    }

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <img
      src={dark ? DARK_ICON : LIGHT_ICON}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-xl"
      draggable={false}
    />
  );
}

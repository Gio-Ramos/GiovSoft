import { useEffect, useState } from "react";

export function useSiteTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const storedTheme = window.localStorage.getItem("site-theme");

    return storedTheme === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    window.localStorage.setItem("site-theme", theme);
  }, [theme]);

  const isDark = theme === "dark";

  const toggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => void;
    };

    if (transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition(() => setTheme(nextTheme));
      return;
    }

    setTheme(nextTheme);
  };

  return { isDark, toggleTheme };
}

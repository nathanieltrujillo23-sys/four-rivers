import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Jumps to the top of the page on every route change. Without this, clicking
 * Next/Previous on a module (or any nav link) while scrolled down leaves the
 * reader dropped into the middle of the next page instead of its start.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

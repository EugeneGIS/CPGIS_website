"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function BackToTop() {
  const pageTopRef = useRef<HTMLDivElement | null>(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const pageTop = pageTopRef.current;
    if (!pageTop) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      const handleScroll = () => setShowButton(window.scrollY > 0);
      handleScroll();
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }

    const observer = new IntersectionObserver(([entry]) => {
      setShowButton(!entry.isIntersecting);
    });
    observer.observe(pageTop);

    return () => observer.disconnect();
  }, []);

  function scrollToTop() {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <>
      <div ref={pageTopRef} className="h-px" aria-hidden="true" />
      {showButton ? (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-5 right-5 z-[1000] inline-flex items-center gap-2 rounded-full bg-cpgis-ink px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(15,23,42,0.3)] transition hover:bg-cpgis-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cpgis-globe"
          aria-label="Back to top"
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Back to top</span>
        </button>
      ) : null}
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

// Renders the ROQIT logo from /roqit-logo.png. Until that file is uploaded to
// the repo's public/ folder, it falls back to a clean "ROQIT" wordmark instead
// of a broken-image icon. We check both onError and (for failures that happen
// before hydration attaches the handler) the image's load state on mount.
export function BrandLogo({ className = "h-6 w-auto" }: { className?: string }) {
  const [errored, setErrored] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setErrored(true);
  }, []);

  if (errored) {
    return <span className="text-lg font-extrabold tracking-tight text-fg">ROQIT</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src="/roqit-logo.png" alt="ROQIT" className={className} onError={() => setErrored(true)} />
  );
}

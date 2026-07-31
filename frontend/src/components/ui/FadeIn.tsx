import { useState, useEffect } from "react";

interface FadeInProps {
  show: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * FadeIn component provides a smooth fade & slide-up animation
 * for elements toggling visiblity.
 */
export function FadeIn({ show, children, className = "" }: FadeInProps) {
  const [mounted, setMounted] = useState(show);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(t);
  }, [show]);

  if (!mounted) return null;
  return (
    <div
      className={`transition-all duration-300 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default FadeIn;

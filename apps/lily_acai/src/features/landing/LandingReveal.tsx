import { useEffect, useRef, useState, type ReactNode } from "react";

export function LandingReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [visible, setVisible] = useState(false);
  const element = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <section ref={element} className={`landing-reveal${visible ? " is-visible" : ""} ${className}`}>{children}</section>;
}

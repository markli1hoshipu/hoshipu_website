"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function RouteChangeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    setIsChanging(true);
    const timer = setTimeout(() => {
      setIsChanging(false);
    }, 10);
    
    return () => clearTimeout(timer);
  }, [pathname]);

  if (isChanging) {
    return <div style={{ opacity: 0 }} />;
  }

  return <>{children}</>;
}

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 2, staleTime: 15_000, refetchOnWindowFocus: true } }
  }));
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

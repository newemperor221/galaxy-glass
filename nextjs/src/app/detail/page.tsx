"use client";

import { Suspense } from "react";
import DetailContent from "./DetailContent";

export default function DetailPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center text-white/35">
          <div className="flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-white/10 border-t-emerald-400 rounded-full animate-spin" />
            <span>加载节点数据…</span>
          </div>
        </div>
      }
    >
      <DetailContent />
    </Suspense>
  );
}

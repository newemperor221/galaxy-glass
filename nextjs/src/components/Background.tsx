"use client";

import { useEffect, useRef } from "react";

export default function Background() {
  const posterRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const poster = posterRef.current;
    const video = videoRef.current;
    if (!poster || !video) return;

    poster.src = "https://img.357561.xyz/image-wallpaper2.png";
    video.src = "https://img.357561.xyz/wallpaper1.mp4";

    video.play().then(() => {
      video.style.opacity = "1";
      poster.style.opacity = "0";
    }).catch(() => {
      poster.style.opacity = "1";
    });
  }, []);

  return (
    <div className="fixed inset-0 z-0 bg-[#0e152e]">
      <img
        ref={posterRef}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        style={{ opacity: 0 }}
      />
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        style={{ opacity: 0 }}
      />
    </div>
  );
}

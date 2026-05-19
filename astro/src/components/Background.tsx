"use client";

import { useEffect, useRef } from "react";

const POSTER = "https://img.357561.xyz/image-wallpaper2.png";
const VIDEO = "https://img.357561.xyz/wallpaper1.mp4";

export default function Background() {
  const posterRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const poster = posterRef.current;
    const video = videoRef.current;
    if (!poster || !video) return;

    poster.src = POSTER;
    video.src = VIDEO;

    const playVideo = () => {
      video.play().then(() => {
        video.style.opacity = "1";
        poster.style.opacity = "0";
      }).catch(() => {
        // Auto-play blocked — keep poster visible
        poster.style.opacity = "1";
      });
    };

    // Try playing immediately, fall back to user interaction
    playVideo();

    // Retry on first user interaction if autoplay was blocked
    const onInteraction = () => {
      if (video.style.opacity !== "1") {
        playVideo();
      }
      document.removeEventListener("click", onInteraction);
      document.removeEventListener("touchstart", onInteraction);
    };
    document.addEventListener("click", onInteraction, { once: true });
    document.addEventListener("touchstart", onInteraction, { once: true });

    return () => {
      document.removeEventListener("click", onInteraction);
      document.removeEventListener("touchstart", onInteraction);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0" style={{ background: "var(--bg-deep)" }}>
      <img ref={posterRef} alt="" className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
        style={{ opacity: 0, filter: "brightness(0.6)" }} />
      <video ref={videoRef} autoPlay loop muted playsInline
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
        style={{ opacity: 0, filter: "brightness(0.6)" }} />
    </div>
  );
}

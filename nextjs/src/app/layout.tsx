"use client";

import "./globals.css";
import { SquircleNoScript } from "@squircle-js/react";

export default function RootLayout({ children }: { children: React.ReactNode }) {

  return (
    <html lang="zh-CN" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        {/* Background wallpaper */}
        <div className="fixed inset-0 z-0" style={{background: "var(--color-bg-deep)"}}>
          <img id="poster" src="https://img.357561.xyz/image-wallpaper2.png" alt="" className="absolute inset-0 w-full h-full object-cover" style={{opacity: 0, transition: "opacity 0.6s ease", filter: "brightness(0.8)"}} />
          <video id="bg-video" autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{opacity: 1, transition: "opacity 0.6s ease", filter: "brightness(0.8)"}}>
            <source src="https://img.357561.xyz/wallpaper1.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col min-h-full">{children}</div>

        <SquircleNoScript />

        {/* Poster fallback */}
        <script dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', function() {
              var video = document.getElementById('bg-video');
              var poster = document.getElementById('poster');
              if (video && poster) {
                video.play().then(function() {
                  poster.style.opacity = '0';
                  video.style.opacity = '1';
                }).catch(function() {
                  poster.style.opacity = '1';
                  video.style.opacity = '0';
                });
              }
            });
          `
        }} />
      </body>
    </html>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { NewsMedia } from "@/lib/news";

export function NewsSlideshow({ images, media, title }: { images: string[]; media?: NewsMedia[]; title: string }) {
  const slides = media?.length ? media : images.map((src) => ({ type: "image" as const, src }));
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    if (slides[activeIndex]?.type === "video") {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 4200);

    return () => window.clearInterval(interval);
  }, [activeIndex, slides]);

  return (
    <section className="overflow-hidden border-b border-[#363d45]/70">
      <div className="relative aspect-[16/9] min-h-[320px] w-full bg-black md:min-h-[520px]">
        {slides.map((slide, index) =>
          slide.type === "video" ? (
            <video
              key={slide.src}
              src={slide.src}
              controls
              playsInline
              preload="metadata"
              className={`absolute inset-0 h-full w-full bg-black object-contain transition-opacity duration-700 ${
                index === activeIndex ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            />
          ) : (
            <Image
              key={slide.src}
              src={slide.src}
              alt={`${title} photo ${index + 1}`}
              fill
              priority={index === 0}
              sizes="100vw"
              className={`object-cover transition-opacity duration-700 ${
                index === activeIndex ? "opacity-100" : "opacity-0"
              }`}
            />
          )
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6 md:p-10">
          <div className="flex gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.src}
                type="button"
                aria-label={`Show ${slide.type} ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                className={`h-1.5 w-10 rounded-full transition ${
                  index === activeIndex ? "bg-white" : "bg-white/35 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

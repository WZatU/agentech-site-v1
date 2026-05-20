"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function NewsSlideshow({ images, title }: { images: string[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, 4200);

    return () => window.clearInterval(interval);
  }, [images.length]);

  return (
    <section className="overflow-hidden border-b border-[#363d45]/70">
      <div className="relative aspect-[16/9] min-h-[320px] w-full bg-black md:min-h-[520px]">
        {images.map((image, index) => (
          <Image
            key={image}
            src={image}
            alt={`${title} photo ${index + 1}`}
            fill
            priority={index === 0}
            sizes="100vw"
            className={`object-cover transition-opacity duration-700 ${
              index === activeIndex ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6 md:p-10">
          <div className="flex gap-2">
            {images.map((image, index) => (
              <button
                key={image}
                type="button"
                aria-label={`Show photo ${index + 1}`}
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

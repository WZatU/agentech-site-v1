"use client";

import { useEffect } from "react";

export function AccountShootingStars() {
  useEffect(() => {
    function updateStarsVisibility() {
      document.body.classList.toggle("account-stars-revealed", window.scrollY > 24);
    }

    updateStarsVisibility();
    window.addEventListener("scroll", updateStarsVisibility, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateStarsVisibility);
      document.body.classList.remove("account-stars-revealed");
    };
  }, []);

  return <div className="account-shooting-stars-layer" aria-hidden="true" />;
}

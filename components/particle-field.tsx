const particles = [
  { left: "8%", top: "18%", size: 2, delay: "0s", duration: "4.8s" },
  { left: "17%", top: "32%", size: 3, delay: "0.6s", duration: "5.4s" },
  { left: "24%", top: "14%", size: 2, delay: "1.1s", duration: "4.2s" },
  { left: "34%", top: "38%", size: 2, delay: "1.8s", duration: "5.8s" },
  { left: "42%", top: "22%", size: 3, delay: "0.9s", duration: "4.6s" },
  { left: "53%", top: "12%", size: 2, delay: "1.5s", duration: "5.2s" },
  { left: "61%", top: "30%", size: 2, delay: "0.4s", duration: "4.9s" },
  { left: "70%", top: "18%", size: 3, delay: "1.3s", duration: "5.6s" },
  { left: "78%", top: "36%", size: 2, delay: "0.8s", duration: "4.4s" },
  { left: "88%", top: "24%", size: 2, delay: "1.7s", duration: "5.1s" }
];

export function ParticleField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,_rgba(124,196,255,0.12),_transparent_54%)]" />
      {particles.map((particle, index) => (
        <span
          key={index}
          className="particle"
          style={{
            left: particle.left,
            top: particle.top,
            width: `${particle.size * 4}px`,
            height: `${particle.size * 4}px`,
            animationDelay: particle.delay,
            animationDuration: particle.duration
          }}
        />
      ))}
    </div>
  );
}

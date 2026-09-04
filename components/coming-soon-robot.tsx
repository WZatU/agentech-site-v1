import "./coming-soon-robot.css";

export type ComingSoonRobotProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  compact?: boolean;
  className?: string;
};

export function ComingSoonRobot({
  eyebrow = "COMING SOON",
  title = "I'M STILL BUILDING THIS PAGE.",
  description = "ONE MORE BOLT... THEN MAYBE TWO.",
  compact = false,
  className = ""
}: ComingSoonRobotProps) {
  return (
    <section
      data-coming-soon-robot
      data-compact={compact ? "true" : "false"}
      className={className}
    >
      <div
        data-coming-soon-scene
        tabIndex={0}
        role="button"
        aria-label="Interactive robot assembling this page. Hover, focus, or tap to see it wave."
      />

      <div data-coming-soon-workshop aria-hidden="true">
        <div data-coming-soon-frame data-coming-soon-action="base" />
        <div data-coming-soon-frame data-coming-soon-overlay data-coming-soon-action="assembly" />
        <div data-coming-soon-frame data-coming-soon-overlay data-coming-soon-action="wave-one" />
        <div data-coming-soon-frame data-coming-soon-overlay data-coming-soon-action="wave-two" />
      </div>

      <div data-coming-soon-copy data-coming-soon-blackboard>
        <p data-coming-soon-board-kicker>BEEP. WHIRR. CLICK.</p>
        <p data-coming-soon-eyebrow>{eyebrow}</p>
        <h1 className="font-display">{title}</h1>
        <p data-coming-soon-description>{description}</p>
        <p data-coming-soon-voice>
          <span>{"OH, HI! YOU CAUGHT ME BUILDING."}</span>
        </p>
        <div data-coming-soon-progress role="status" aria-label="Repair in progress">
          <span aria-hidden="true" />
          <b>REPAIR MODE // ACTIVE</b>
        </div>
      </div>
    </section>
  );
}

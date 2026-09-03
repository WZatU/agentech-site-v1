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
  title = "Building at full speed.",
  description = "Our little engineer is wiring up this page. Check back soon.",
  compact = false,
  className = ""
}: ComingSoonRobotProps) {
  return (
    <section
      data-coming-soon-robot
      data-compact={compact ? "true" : "false"}
      className={className}
    >
      <div data-coming-soon-copy>
        <p data-coming-soon-eyebrow>{eyebrow}</p>
        <h1 className="font-display">{title}</h1>
        <p>{description}</p>
        <div data-coming-soon-progress aria-hidden="true">
          <span />
          <span />
          <span />
          <b>ASSEMBLING</b>
        </div>
      </div>

      <div
        data-coming-soon-scene
        tabIndex={0}
        role="img"
        aria-label="Wireframe robot building this page"
      >
        <p data-coming-soon-speech>Oh—hi! You caught me building.</p>
        <div data-coming-soon-machine aria-hidden="true">
          <div data-coming-soon-illustration />

          <svg
            data-coming-soon-overlay
            viewBox="0 0 1254 1254"
            aria-hidden="true"
            focusable="false"
          >
            <g data-coming-soon-orbit>
              <ellipse cx="815" cy="424" rx="84" ry="31" />
              <ellipse cx="815" cy="424" rx="54" ry="20" />
              <path d="M728 424h174M815 389v70" />
              <circle cx="882" cy="407" r="7" />
            </g>

            <g data-coming-soon-workbench>
              <path d="M35 974 777 880l453 211-820 145Z" />
              <path d="m35 974 8 62 365 181 822-146v20L411 1241 43 1053" />
              <path d="M84 1026 613 955l172 92-551 103Z" />
              <path d="m235 1150 2 29 551-105-3-27" />
              <path d="m108 1061 517-70M147 1091l520-72M190 1120l521-73" />
              <path d="M733 947 895 925l133 62-167 30Z" />
              <path d="m861 1017 1 22 168-31-2-21" />
              <path
                data-coming-soon-draft-path
                d="m201 1092 54-35 49 20 45-46 53 23 60-45 62 17 47-31"
              />
              <path data-coming-soon-scanner d="m91 1062 621-84" />
            </g>

            <g data-coming-soon-status-light>
              <circle cx="1047" cy="850" r="9" />
              <circle cx="1047" cy="850" r="19" />
            </g>

            <g data-coming-soon-sparks>
              <path d="m550 1018-20-20M559 1009l-2-31M569 1018l22-24M574 1028l31-2" />
            </g>

            <g data-coming-soon-depth-marks>
              <path d="M55 174h78M94 135v78M1110 242h68M1144 208v68" />
              <circle cx="94" cy="174" r="8" />
              <circle cx="1144" cy="242" r="8" />
              <path d="M83 174h22M1144 231v22" />
            </g>
          </svg>

          <div data-coming-soon-hud>
            <span>BUILD SEQUENCE</span>
            <b>FRAME / 084</b>
            <i><em /></i>
          </div>
        </div>
      </div>
    </section>
  );
}

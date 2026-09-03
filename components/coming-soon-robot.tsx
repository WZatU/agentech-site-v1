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
        <svg viewBox="0 0 760 620" aria-hidden="true" focusable="false">
          <g data-coming-soon-grid>
            <path d="M36 86H724M36 166H724M36 246H724M36 326H724M36 406H724M36 486H724" />
            <path d="M92 38V576M188 38V576M284 38V576M380 38V576M476 38V576M572 38V576M668 38V576" />
            <circle cx="92" cy="166" r="4" />
            <circle cx="668" cy="406" r="4" />
          </g>

          <g data-coming-soon-blueprint>
            <path d="M86 452 565 428 689 528 196 574Z" />
            <path d="m139 469 379-18 99 64-389 35Z" />
            <rect
              x="252"
              y="473"
              width="174"
              height="54"
              rx="8"
              transform="rotate(-3 252 473)"
            />
            <path d="m278 492 54-3M278 504l111-6M278 516l82-4" />
            <path data-coming-soon-scanner d="m149 487 421-22" />
          </g>

          <g data-coming-soon-robot-body>
            <g data-coming-soon-head>
              <path d="M258 86Q258 42 304 28H433Q482 42 490 88L477 224Q469 252 438 260H304Q271 250 263 222Z" />
              <path
                data-coming-soon-visor
                d="M286 98Q292 75 318 70H427Q454 78 458 103L450 179Q446 199 424 204H319Q296 199 291 178Z"
              />
              <path d="M306 55Q369 29 442 57M276 132H258M489 132H471M296 219Q370 239 454 217" />
              <path d="M315 42V67M347 34V66M381 31V65M415 35V68M447 47V72" />
              <g data-coming-soon-eyes>
                <path d="M332 118v32M412 118v32" />
              </g>
            </g>

            <g data-coming-soon-torso>
              <path d="M289 265Q371 234 455 265L490 387Q445 421 373 423Q300 421 250 388Z" />
              <path d="M305 278Q373 256 439 279L461 365Q421 386 373 388Q323 386 280 364Z" />
              <path d="M324 297H423M307 328H440M294 357H451" />
              <circle data-coming-soon-status-light cx="373" cy="333" r="12" />
              <path d="M332 399v34M414 399v34M332 417h82" />
            </g>

            <g data-coming-soon-drawing-arm>
              <circle cx="273" cy="281" r="38" />
              <path d="M251 300 199 368Q190 384 204 397L235 413Q249 419 259 405L300 334" />
              <circle cx="226" cy="403" r="27" />
              <path d="m214 421-23 56 18 8 29-55M203 475l-7 34M214 480l-2 34M226 481l5 29" />
              <path data-coming-soon-stylus d="m185 508 90-33" />
            </g>

            <g data-coming-soon-wave-arm>
              <circle cx="469" cy="281" r="38" />
              <path d="M485 306 526 376Q534 390 523 402L494 421Q480 429 469 413L443 344" />
              <circle cx="507" cy="415" r="27" />
              <path d="m516 432 27 42-16 11-32-42M543 473l22 28M532 481l14 31M520 485l5 32" />
            </g>

            <g data-coming-soon-joints>
              <circle cx="273" cy="281" r="22" />
              <circle cx="469" cy="281" r="22" />
              <circle cx="226" cy="403" r="14" />
              <circle cx="507" cy="415" r="14" />
            </g>
          </g>

          <g data-coming-soon-sparks>
            <path d="m204 500-17-9M207 494l-3-18M214 499l13-13" />
          </g>
        </svg>
      </div>
    </section>
  );
}

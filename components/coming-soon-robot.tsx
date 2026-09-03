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
          <svg
            viewBox="0 0 1100 900"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <linearGradient id="coming-soon-shell-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" className="coming-soon-shell-highlight" />
                <stop offset="0.48" className="coming-soon-shell-mid" />
                <stop offset="1" className="coming-soon-shell-shadow" />
              </linearGradient>
              <linearGradient id="coming-soon-limb-gradient" x1="0.08" y1="0" x2="0.9" y2="1">
                <stop offset="0" className="coming-soon-limb-highlight" />
                <stop offset="0.56" className="coming-soon-limb-mid" />
                <stop offset="1" className="coming-soon-limb-shadow" />
              </linearGradient>
              <radialGradient id="coming-soon-joint-gradient" cx="38%" cy="30%" r="78%">
                <stop offset="0" className="coming-soon-joint-highlight" />
                <stop offset="0.52" className="coming-soon-joint-mid" />
                <stop offset="1" className="coming-soon-joint-shadow" />
              </radialGradient>
              <linearGradient id="coming-soon-table-gradient" x1="0" y1="0" x2="0.72" y2="1">
                <stop offset="0" className="coming-soon-table-highlight" />
                <stop offset="1" className="coming-soon-table-shadow" />
              </linearGradient>
              <linearGradient id="coming-soon-visor-gradient" x1="0.08" y1="0" x2="0.92" y2="1">
                <stop offset="0" className="coming-soon-visor-highlight" />
                <stop offset="0.5" className="coming-soon-visor-mid" />
                <stop offset="1" className="coming-soon-visor-shadow" />
              </linearGradient>
            </defs>

            <g data-coming-soon-grid data-line="grid">
              <path d="M38 170h1020M38 292h1020M38 414h1020M38 536h1020" />
              <path d="M122 80v520M294 48v536M466 32v526M638 32v506M810 48v470M982 80v418" />
              <path d="M30 742 638 520l437 131M86 790 667 544l363 128M172 838 704 568l286 124" />
              <circle cx="122" cy="292" r="5" />
              <circle cx="982" cy="414" r="5" />
              <path d="M102 292h40M122 272v40M962 414h40M982 394v40" />
            </g>

            <g data-coming-soon-workbench>
              <path
                data-coming-soon-table-top
                data-fill="table"
                d="M42 610 760 514 1065 657 278 808Z"
              />
              <path
                data-coming-soon-table-edge
                data-fill="edge"
                d="m42 610 8 47 227 185 788-153v-32L278 808Z"
              />
              <path data-line="detail" d="m50 657 228 166 787-148M278 808v34" />
              <path data-line="detail" d="m83 681 197 143 748-145M119 711l161 116M178 759l102 72" />
              <path data-line="mesh" d="m356 824 649-126M452 806l520-101M552 787l384-75" />
              <path data-line="mesh" d="m109 631 702-91M174 678l706-98M240 727l708-105M327 780l692-122" />
              <path data-line="mesh" d="M151 595 374 790M286 576l224 188M427 557l224 179M568 538l230 171M708 520l239 161" />

              <g data-coming-soon-blueprint>
                <path data-fill="paper" d="m294 637 460-61 171 89-501 96Z" />
                <path data-line="detail" d="m315 650 429-57 144 73-459 81Z" />
                <path data-line="blueprint" d="m380 683 134-18 42 22-143 25ZM598 629l104-14 67 34-112 20Z" />
                <path data-line="blueprint" d="m448 728 243-46M486 713l-32-17 28-21M683 680l26 14-42 22" />
                <path data-line="blueprint" d="m773 684 75-14M782 695l54-10M791 706l39-7" />
                <path data-line="blueprint" d="m711 725 119-23M722 736l89-17M734 746l58-11" />
                <path
                  data-coming-soon-draft-path
                  data-line="accent"
                  d="m362 704 42-32 43 18 51-39 47 23 63-48 55 22 66-42"
                />
                <path data-coming-soon-scanner data-line="scanner" d="m322 741 511-101" />
              </g>
            </g>

            <g data-coming-soon-engineer>
              <g data-coming-soon-torso>
                <path
                  data-fill="shell"
                  d="M401 321Q452 282 531 273L674 283Q752 296 796 351L774 488Q731 545 640 557L493 540Q416 515 378 454Z"
                />
                <path data-line="detail" d="M413 348Q514 306 651 315Q734 321 779 362" />
                <path data-line="detail" d="M393 404Q489 360 613 374Q711 384 783 426" />
                <path data-line="detail" d="M391 454Q482 416 600 426Q697 434 772 470" />
                <path data-line="mesh" d="M458 318q-18 109 8 203M514 290q-19 128 6 247M573 278q-10 145 8 269M636 279q10 151-1 274M696 294q25 130 3 244M750 319q30 97 7 181" />
                <path data-line="mesh" d="M405 378q175-72 376 15M390 429q188-66 388 22M407 486q181-45 341 14" />
                <path data-fill="deep" d="m507 381 156 10 38 92-104 46-111-49Z" />
                <path data-line="detail" d="m520 400 128 8 23 61-79 34-79-35Z" />
                <circle data-coming-soon-status-light data-fill="accent" cx="593" cy="447" r="15" />
                <circle data-line="accent" cx="593" cy="447" r="31" />
                <path data-line="accent" d="M576 447h34M593 430v34" />
                <path data-line="detail" d="m437 474 36 27M729 493l33-27M515 526l17 40M662 538l-4 38" />
                <path data-line="major" d="m428 365 25-24 31-13M714 326l35 19 24 27" />
                <path data-line="detail" d="m431 389 34-18 28-4M711 370l31 10 27 21" />
                <path data-line="mesh" d="m440 346 305 20M423 365l338 25M407 389l371 30M397 414l386 32M397 441l381 31M406 468l355 28M424 495l307 27" />
                <circle data-line="detail" cx="450" cy="457" r="7" />
                <circle data-line="detail" cx="740" cy="466" r="7" />
                <path data-line="accent" d="m469 332 32-8M689 326l31 10" />
              </g>

              <g data-coming-soon-neck>
                <path data-fill="deep" d="m508 278 17-67 132 5 30 78Z" />
                <path data-line="major" d="M533 270v-49M559 274l-2-57M585 276v-59M614 278l2-60M643 283l4-61M669 291l10-57" />
                <path data-line="detail" d="m525 239 132 5M518 257l151 8" />
                <path data-line="accent" d="m548 269 12-38M630 273l-2-41" />
                <path data-line="detail" d="m531 229 18-19M652 232l20-17" />
              </g>

              <g data-coming-soon-head>
                <path
                  data-fill="helmet"
                  d="M468 84Q491 39 555 25L638 33Q693 47 713 100L703 219Q691 258 646 275L548 267Q493 255 473 211Z"
                />
                <path data-line="mesh" d="M510 58q-14 94 3 178M548 37q-14 111 5 221M590 29q-6 123 5 235M633 34q11 122 4 231M671 50q23 105 10 193" />
                <path data-line="mesh" d="M489 85q100-45 207 7M477 124q111-48 229 6M473 167q116-43 234 6M481 208q111-32 215 8" />
                <path data-line="detail" d="m482 96 20-40M694 95l-26-44M475 191l18 43M699 204l-26 39" />
                <path data-coming-soon-face data-fill="visor" d="M490 114Q575 77 683 111L684 193Q659 228 609 239L535 225Q502 212 487 184Z" />
                <path data-line="detail" d="M504 128q82-31 165-6M502 153q80-25 173-4M506 180q82-17 168-1M521 205q67-9 137 2" />
                <path data-line="mesh" d="M531 111q-10 55 4 114M568 99q-7 74 5 132M608 96q5 77 3 143M648 103q14 65 8 121" />
                <path data-line="accent" d="M528 150q18-12 37 2M619 147q19-11 37 4" />
                <path data-fill="accent" d="M541 149q6-4 12 1l-1 15q-6 5-12-1ZM632 147q6-3 12 2l-1 15q-6 5-12-1Z" />
                <path data-line="visor-glint" d="M509 126q35-17 67-19M516 135q22-10 42-12" />
                <path data-line="major" d="m521 237 8 20M673 224l-8 29" />
                <ellipse data-line="major" cx="703" cy="168" rx="28" ry="46" />
                <ellipse data-line="detail" cx="703" cy="168" rx="17" ry="29" />
                <circle data-line="accent" cx="703" cy="168" r="7" />
                <circle data-line="detail" cx="493" cy="98" r="6" />
                <circle data-line="detail" cx="686" cy="101" r="6" />
              </g>

              <g data-coming-soon-helper-arm>
                <ellipse data-fill="joint" cx="396" cy="347" rx="55" ry="61" transform="rotate(-18 396 347)" />
                <ellipse data-line="detail" cx="396" cy="347" rx="37" ry="43" transform="rotate(-18 396 347)" />
                <circle data-line="accent" cx="386" cy="349" r="12" />
                <ellipse data-line="mesh" cx="396" cy="347" rx="47" ry="52" transform="rotate(-18 396 347)" />
                <path data-line="detail" d="m352 326 29 10M409 294l-2 23M438 339l-22 10M415 389l-11-22" />
                <path data-fill="limb" d="m369 389-43 12-54 130 42 27 74-117Z" />
                <path data-line="mesh" d="m352 397-54 146M337 402l-51 133M322 416l52 20M306 449l52 20M291 483l50 21M278 516l45 19" />
                <ellipse data-fill="joint" cx="292" cy="548" rx="34" ry="38" transform="rotate(34 292 548)" />
                <circle data-line="detail" cx="292" cy="548" r="19" />
                <path data-line="accent" d="m275 533 30 31" />
                <path data-fill="limb" d="m270 565-31-3-64 73 25 28 83-58Z" />
                <path data-line="mesh" d="m257 569-68 82M244 568l-64 73M223 586l40 20M204 608l40 18M187 629l35 16" />
                <g data-coming-soon-helper-hand>
                  <path data-fill="joint" d="m183 630-23 1-32 28 14 25 42-18 24-28Z" />
                  <path data-line="major" d="m146 665-39 17M154 674l-35 22M164 679l-29 26M176 680l-21 30" />
                  <circle data-line="detail" cx="145" cy="665" r="7" />
                  <circle data-line="detail" cx="154" cy="674" r="7" />
                  <circle data-line="detail" cx="164" cy="679" r="7" />
                </g>
              </g>

              <g data-coming-soon-drawing-arm>
                <ellipse data-fill="joint" cx="790" cy="357" rx="61" ry="67" transform="rotate(18 790 357)" />
                <ellipse data-line="detail" cx="790" cy="357" rx="41" ry="47" transform="rotate(18 790 357)" />
                <circle data-line="accent" cx="799" cy="358" r="13" />
                <ellipse data-line="mesh" cx="790" cy="357" rx="52" ry="58" transform="rotate(18 790 357)" />
                <path data-line="detail" d="m754 316 22 13M811 300l-3 24M837 345l-24 9M815 402l-12-23" />
                <path data-fill="limb" d="m812 407 42 17-18 142-49 4-20-139Z" />
                <path data-line="mesh" d="m829 416-18 151M844 427l-20 139M779 446l64 5M783 480l57 6M788 515l48 6M792 548l41 6" />
                <ellipse data-fill="joint" cx="811" cy="575" rx="37" ry="40" transform="rotate(38 811 575)" />
                <circle data-line="detail" cx="811" cy="575" r="21" />
                <path data-line="accent" d="m795 558 31 32" />
                <path data-fill="limb" d="m786 588-27-12-136 74 18 44 147-54Z" />
                <path data-line="mesh" d="m773 586-139 91M761 582l-137 80M736 600l18 56M704 617l18 52M672 634l17 46M644 648l16 37" />
                <g data-coming-soon-drawing-hand>
                  <path data-fill="joint" d="m640 646-35-4-57 22-7 30 42 18 64-28Z" />
                  <path data-line="major" d="m584 668-69 22M591 678l-67 28M598 688l-58 31M608 696l-44 31" />
                  <circle data-line="detail" cx="584" cy="668" r="8" />
                  <circle data-line="detail" cx="591" cy="678" r="8" />
                  <circle data-line="detail" cx="598" cy="688" r="8" />
                  <path data-line="mesh" d="m557 654 27 57M572 650l24 52M590 646l20 45M607 646l15 36" />
                  <path data-coming-soon-pen data-line="accent" d="m573 670-74 91" />
                  <path data-fill="accent" d="m494 766 4-18 12 10Z" />
                </g>
              </g>
            </g>

            <g data-coming-soon-tool-cup>
              <path data-fill="tool" d="M92 604q52-18 105 0l-8 109q-43 18-89 0Z" />
              <ellipse data-fill="deep" cx="145" cy="604" rx="53" ry="17" />
              <ellipse data-line="detail" cx="145" cy="604" rx="39" ry="10" />
              <path data-line="mesh" d="M112 619v85M132 620v89M154 619v92M176 615v91" />
              <path data-line="detail" d="M100 646q46 16 94-1M98 677q46 17 94-1" />
              <g data-coming-soon-tools>
                <path data-line="accent" d="m120 602-7-77M142 600l8-99M166 603l24-73" />
                <path data-fill="accent" d="m107 525 10-1 2-21-15 2ZM144 501l13 2 5-24-18-2ZM185 531l12 5 9-20-16-5Z" />
              </g>
            </g>

            <g data-coming-soon-sparks data-line="spark">
              <path d="m502 760-24-18M511 753l-5-30M520 756l18-27M525 765l31-8" />
            </g>

            <g data-coming-soon-bench-tools>
              <path data-line="major" d="m807 594 48-12 31 16-50 13-9 22-15-8 9-21Z" />
              <path data-line="detail" d="m832 601 24-6M842 615l27-7" />
              <circle data-line="accent" cx="821" cy="621" r="5" />
              <path data-line="major" d="m248 699 34-7 30 15-35 7-18 27-14-8 18-25Z" />
              <circle data-line="detail" cx="253" cy="730" r="8" />
            </g>

            <g data-coming-soon-hud>
              <path data-fill="hud" d="m846 94 196 0 0 105-196 0Z" />
              <path data-line="accent" d="M862 117h86M862 137h151M862 158h119M862 179h55" />
              <circle data-fill="accent" cx="1013" cy="178" r="8" />
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}

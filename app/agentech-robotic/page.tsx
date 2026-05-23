import Image from "next/image";

const products = [
  {
    name: "AEGIS PRO",
    price: "$4,490",
    package: "NO SKILL PACKAGE",
    image: "/assets/products/aegis-pro.png",
    accent: "cyan"
  },
  {
    name: "AEGIS ULTRA",
    price: "$9,990",
    package: "+ $3,000 SKILL PACKAGE",
    image: "/assets/products/aegis-ultra.png",
    accent: "cyan"
  },
  {
    name: "MASTER EDU",
    price: "$27,990",
    package: "+ $10,000 SKILL PACKAGE",
    image: "/assets/master-edu.png",
    accent: "violet"
  },
  {
    name: "MASTER ULTRA",
    price: "$49,990",
    package: "+ $15,000 SKILL PACKAGE",
    image: "/assets/master-ultra.png",
    accent: "violet"
  }
] as const;

const showPreorderButtons = false;

const sections = [
  {
    title: "MECHANICAL",
    rows: [
      ["FORM", "QUAD", "QUAD", "HUMANOID", "HUMANOID"],
      ["DIMENSIONS", "-", "-", "131 x 46 x 21 CM", "131 x 46 x 21 CM"],
      ["WEIGHT", "15 KG", "16 KG", "35 KG", "39 KG"],
      ["MATERIALS", "-", "-", "MG ALLOY + AI + POLYURETHANE", "MG ALLOY + AI + POLYURETHANE"],
      ["DOF", "12 DOF", "12 DOF", "25 DOF / NOT INCL. HAND", "30 DOF"],
      ["PAYLOAD", "8 KG", "10 KG", "MAX 3 KG", "MAX 3 KG"],
      ["MAX SPEED", "3.7 M/S", "5 M/S", "1.8 M/S", "1.8 M/S"],
      ["PEAK TORQUE", "-", "-", "120 N*M", "120 N*M"],
      ["STAIR CLIMB", "16 CM", "16 CM", "-", "-"],
      ["OBSTACLE", "35 CM", "35 CM", "-", "-"],
      ["PROTECTION LEVEL", "IP32", "IP54", "-", "-"],
      ["SLOPE", "30\u00b0", "30-40\u00b0", "-", "-"]
    ]
  },
  {
    title: "POWER",
    rows: [
      ["BATTERY", "216 WH", "216 WH", "\u2265500 WH", "\u2265500 WH"],
      ["RUNTIME", "1-2 H", "1-2 H", "2 H WALKING", "2 H WALKING"],
      ["CHARGE", "1 H", "1 H", "\u2264 1.5 H / DIRECT + SWAP", "\u2264 1.5 H / AUTO-DOCK OPTION"],
      ["CONNECTIVITY", "-", "-", "WI-FI, BLUETOOTH", "WI-FI, BLUETOOTH, 4G/5G"],
      ["MOBILE APP", "-", "-", "UNDER DEV", "UNDER DEV"],
      ["VR TELEOPERATION", "-", "-", "-", "YES"]
    ]
  },
  {
    title: "INTELLIGENCE",
    rows: [
      ["CAMERA", "4K WIDE", "4K WIDE", "RGB CAMERA", "INTERACTIVE + DUAL RGB + REAR + RGB-D"],
      ["LIDAR", "-", "-", "-", "3D LIDAR"],
      ["DISPLAY", "-", "-", "SCREEN + LIGHTS", "SCREEN + LIGHTS"],
      ["IMU", "-", "-", "6-AXIS", "6-AXIS"],
      ["SDK/DEV", "NO", "YES", "-", "-"]
    ]
  },
  {
    title: "CONTROLS & ACCESSORIES",
    rows: [
      ["CONTROLLER", "YES", "YES", "YES", "YES"],
      ["APP CONTROL", "YES", "YES", "UNDER DEV", "UNDER DEV"],
      ["COSTUME", "YES", "YES", "-", "-"],
      ["EXPANSION", "-", "ETH,USB,SBUS,UART", "-", "-"]
    ]
  },
  {
    title: "INTELLIGENCE & PLATFORM",
    rows: [
      ["COMPUTING", "-", "-", "-", "ORIN NX 16G / 157 TOPS"],
      ["II & LM PLATFORM", "-", "-", "YES", "YES"],
      ["OTA UPDATES", "-", "-", "YES", "YES"],
      ["SECONDARY DEV", "-", "-", "-", "SDK / APIS"],
      ["FACE RECOGNITION", "-", "-", "UNDER DEV", "UNDER DEV"]
    ]
  },
  {
    title: "PORTS & EXPANSION",
    rows: [
      ["USB", "-", "-", "TYPE-Ax1 + TYPE-Cx1", "TYPE-Ax2 + TYPE-Cx2"],
      ["LAN", "-", "-", "-", "RJ45 x 2"],
      ["VIDEO OUTPUT", "-", "-", "-", "MINI DP x 1"]
    ]
  },
] as const;

const accentText = {
  cyan: "text-[#1fb7ff]",
  violet: "text-[#bd65ff]"
} as const;

const accentBorder = {
  cyan: "border-[#1fb7ff]/80 shadow-[0_0_40px_rgba(31,183,255,0.12)]",
  violet: "border-[#bd65ff]/80 shadow-[0_0_40px_rgba(189,101,255,0.12)]"
} as const;

export default function AgentechRoboticPage() {
  return (
    <>
      <div id="top" />
      <section className="border-b border-[#363d45]/70">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
          <Image
            src="/assets/Agentech Robotic.png"
            alt="Agentech Robotic"
            width={1000}
            height={247}
            className="h-auto w-full max-w-3xl"
            priority
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 py-10 font-[var(--font-brand)] text-white sm:px-5 md:px-6 lg:px-8 lg:py-20">
        <div className="overflow-x-auto bg-[#020509] shadow-[0_0_90px_rgba(31,183,255,0.08)]">
          <div className="min-w-[900px] lg:min-w-0">
          <div className="grid grid-cols-4 border border-[#1b5f91]/70">
            {products.map((product) => (
              <article
                key={product.name}
                className={`relative flex min-h-[23rem] flex-col items-center border-l border-[#1b5f91]/70 bg-[radial-gradient(circle_at_center,rgba(31,183,255,0.12),transparent_35%),linear-gradient(180deg,rgba(8,18,27,0.72),rgba(1,3,7,0.96))] px-4 pb-6 pt-5 text-center first:border-l-0 lg:min-h-[28rem] lg:px-6 lg:pb-8 lg:pt-7 ${accentBorder[product.accent]}`}
              >
                <div className="relative h-40 w-full lg:h-56">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(min-width: 1024px) 25vw, 225px"
                    className="object-contain"
                    priority={product.name === "AEGIS PRO"}
                  />
                </div>
                <div className="relative z-10 mt-7 lg:mt-10">
                  <h2 className={`text-2xl tracking-[0.04em] lg:text-4xl ${accentText[product.accent]}`}>
                    {product.name}
                  </h2>
                  <p className="mt-4 text-xl tracking-[0.03em] text-white lg:mt-5 lg:text-2xl">{product.price}</p>
                  <p className={`mt-3 text-xs tracking-[0.04em] lg:text-sm ${accentText[product.accent]}`}>
                    {product.package}
                  </p>
                  {showPreorderButtons ? (
                    <a
                      href={`/login?next=${encodeURIComponent(`/preorder?product=${encodeURIComponent(product.name)}`)}`}
                      className={`mt-6 inline-flex border px-6 py-2.5 text-base tracking-[0.05em] transition hover:bg-white/10 lg:mt-7 lg:px-8 lg:py-3 lg:text-lg ${accentText[product.accent]} ${accentBorder[product.accent]}`}
                    >
                      PRE-ORDER
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <div className="border-x border-b border-[#1b5f91]/70">
            {sections.map((section) => (
              <section key={section.title} className="border-t border-[#1b5f91]/70 first:border-t-0">
                <h2 className="border-b border-white/15 px-5 py-4 text-base tracking-[0.06em] text-[#1fb7ff] lg:px-8 lg:py-6 lg:text-xl">
                  {section.title}
                </h2>
                <div>
                  <table className="w-full border-collapse text-left">
                    <tbody>
                      {section.rows.map(([label, aegisPro, aegisUltra, masterEdu, masterUltra]) => (
                        <tr key={label} className="border-b border-white/15 last:border-b-0">
                          <th className="w-1/5 px-5 py-4 text-sm font-medium tracking-[0.03em] text-white lg:px-8 lg:py-5 lg:text-lg">
                            {label}
                          </th>
                          <td className="w-1/5 border-l border-white/15 px-4 py-4 text-center text-sm tracking-[0.02em] text-[#1fb7ff] lg:px-6 lg:py-5 lg:text-base">
                            {aegisPro}
                          </td>
                          <td className="w-1/5 border-l border-white/15 px-4 py-4 text-center text-sm tracking-[0.02em] text-[#1fb7ff] lg:px-6 lg:py-5 lg:text-base">
                            {aegisUltra}
                          </td>
                          <td className="w-1/5 border-l border-white/15 px-4 py-4 text-center text-sm tracking-[0.02em] text-[#bd65ff] lg:px-6 lg:py-5 lg:text-base">
                            {masterEdu}
                          </td>
                          <td className="w-1/5 border-l border-white/15 px-4 py-4 text-center text-sm tracking-[0.02em] text-[#bd65ff] lg:px-6 lg:py-5 lg:text-base">
                            {masterUltra}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
          </div>
        </div>
      </section>
      <a
        href="#top"
        aria-label="Back to top"
        className="fixed right-4 z-[60] grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/80 text-xs font-semibold tracking-[0.16em] text-white shadow-[0_16px_45px_rgba(0,0,0,0.45)] backdrop-blur transition hover:bg-white hover:text-black sm:right-6"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
      >
        TOP
      </a>
    </>
  );
}

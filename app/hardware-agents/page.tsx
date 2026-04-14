import Image from "next/image";

export default function HardwareAgentsPage() {
  return (
    <>
      <section className="border-b border-[#363d45]/70">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">Hard Agents</h1>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
        <div className="space-y-20 md:space-y-28">
          <div className="flex justify-center">
            <div className="relative w-full max-w-[88rem] overflow-hidden rounded-[24px]">
              <Image
                src="/assets/agents/hardware-agent-1.png"
                alt="Hardware Agents visual 1"
                width={2400}
                height={1400}
                className="h-auto w-full"
                priority
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          </div>

          <div className="flex justify-end">
            <div className="relative w-full max-w-5xl overflow-hidden rounded-[24px]">
              <Image
                src="/assets/agents/hardware-agent-2.png"
                alt="Hardware Agents visual 2"
                width={2400}
                height={1400}
                className="h-auto w-full"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

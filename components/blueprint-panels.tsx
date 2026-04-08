type PanelProps = {
  label: string;
  children: React.ReactNode;
  tall?: boolean;
};

function FrameCorners() {
  return (
    <>
      <span className="absolute left-4 top-4 h-7 w-7 border-l border-t border-[#58cbff]/55" />
      <span className="absolute right-4 top-4 h-7 w-7 border-r border-t border-[#58cbff]/55" />
      <span className="absolute bottom-4 left-4 h-7 w-7 border-b border-l border-[#58cbff]/55" />
      <span className="absolute bottom-4 right-4 h-7 w-7 border-b border-r border-[#58cbff]/55" />
    </>
  );
}

export function BlueprintPanel({ label, children, tall = false }: PanelProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[30px] border border-[#173245] bg-black ${
        tall ? "h-80" : "h-72"
      } shadow-[0_0_40px_rgba(31,137,255,0.08)]`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(93,205,255,0.08),transparent_55%)]" />
      <div className="absolute inset-0 opacity-30 [background:repeating-linear-gradient(to_bottom,transparent_0,transparent_26px,rgba(90,203,255,0.06)_27px,transparent_54px)]" />
      <FrameCorners />
      <div className="absolute left-6 top-5 text-[10px] uppercase tracking-[0.24em] text-[#76d6ff]">
        {label}
      </div>
      <div className="absolute bottom-5 right-6 text-[10px] uppercase tracking-[0.24em] text-slate">
        Active
      </div>
      {children}
    </div>
  );
}

export function DroneBlueprint() {
  return (
    <BlueprintPanel label="Flight System">
      <div className="absolute inset-0">
        <span className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-[30px] border border-[#64d0ff]/45" />
        <span className="absolute left-1/2 top-[28%] h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#64d0ff]/65" />
        <span className="absolute left-[26%] top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#64d0ff]/65" />
        <span className="absolute left-1/2 top-[72%] h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#64d0ff]/65" />
        <span className="absolute left-[74%] top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#64d0ff]/65" />
        <span className="absolute left-1/2 top-1/2 h-[1px] w-[48%] -translate-x-1/2 bg-[#64d0ff]/55" />
        <span className="absolute left-1/2 top-1/2 h-[48%] w-[1px] -translate-y-1/2 bg-[#64d0ff]/55" />
        <span className="absolute left-1/2 top-[28%] h-[22%] w-[1px] -translate-x-1/2 bg-[#64d0ff]/35" />
        <span className="absolute left-[26%] top-1/2 h-[1px] w-[22%] bg-[#64d0ff]/35" />
        <span className="absolute left-1/2 top-[72%] h-[22%] w-[1px] -translate-x-1/2 bg-[#64d0ff]/35" />
        <span className="absolute right-[26%] top-1/2 h-[1px] w-[22%] bg-[#64d0ff]/35" />
        <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#dff7ff]" />
      </div>
    </BlueprintPanel>
  );
}

export function RobotBlueprint() {
  return (
    <BlueprintPanel label="Domestic Robot">
      <div className="absolute inset-0">
        <span className="absolute left-1/2 top-[34%] h-24 w-28 -translate-x-1/2 -translate-y-1/2 rounded-[26px] border border-[#64d0ff]/55" />
        <span className="absolute left-[44%] top-[34%] h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#64d0ff]/70" />
        <span className="absolute left-[56%] top-[34%] h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#64d0ff]/70" />
        <span className="absolute left-1/2 top-[64%] h-32 w-24 -translate-x-1/2 -translate-y-1/2 rounded-[34px] border border-[#64d0ff]/55" />
        <span className="absolute left-1/2 top-[53%] h-5 w-[1px] -translate-x-1/2 bg-[#64d0ff]/45" />
        <span className="absolute left-1/2 top-[68%] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#64d0ff]/28" />
        <span className="absolute left-[28%] top-[64%] h-[1px] w-[18%] bg-[#64d0ff]/28" />
        <span className="absolute right-[28%] top-[64%] h-[1px] w-[18%] bg-[#64d0ff]/28" />
      </div>
    </BlueprintPanel>
  );
}

export function ProfileBlueprint({ code }: { code: string }) {
  return (
    <BlueprintPanel label="Profile Space" tall>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-44 w-32 rounded-[28px] border border-dashed border-[#57c8ff]/35">
          <span className="absolute left-1/2 top-1/2 h-[1px] w-24 -translate-x-1/2 bg-[#57c8ff]/28" />
          <span className="absolute left-1/2 top-1/2 h-24 w-[1px] -translate-y-1/2 bg-[#57c8ff]/28" />
          <div className="absolute inset-x-0 bottom-8 text-center font-[var(--font-display)] text-2xl tracking-[0.18em] text-[#dff7ff]">
            {code}
          </div>
        </div>
      </div>
    </BlueprintPanel>
  );
}

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "center";
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left"
}: SectionHeadingProps) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">{title}</h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate md:text-lg">{description}</p>
    </div>
  );
}

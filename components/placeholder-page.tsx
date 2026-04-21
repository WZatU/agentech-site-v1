type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-7xl items-center px-6 py-16 lg:px-8 lg:py-24">
      <div className="space-y-6">
        <p className="text-sm uppercase tracking-[0.24em] text-slate">{title}</p>
        <h1 className="text-4xl font-semibold uppercase tracking-[0.22em] text-white md:text-6xl">
          UNDER CONSTRUCTION
        </h1>
      </div>
    </section>
  );
}

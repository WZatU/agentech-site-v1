type EmailCaptureFormProps = {
  buttonLabel?: string;
  placeholder?: string;
  helperText?: string;
  label?: string;
};

export function EmailCaptureForm({
  buttonLabel = "Leave Your Email",
  placeholder = "name@company.com",
  helperText = "Placeholder wiring: connect this field to your email collection workflow later.",
  label = "Email"
}: EmailCaptureFormProps) {
  return (
    <form className="space-y-5 rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-panel md:p-8">
      <label className="space-y-2">
        <span className="text-sm font-medium text-white">{label}</span>
        <input className="field" type="email" name="email" placeholder={placeholder} />
      </label>

      <div className="rounded-2xl border border-dashed border-white/12 bg-black/20 p-4 text-sm leading-6 text-slate">
        {helperText}
      </div>

      <button
        type="submit"
        className="rounded-full bg-white px-5 py-3 text-sm font-medium text-ink transition hover:bg-mist"
      >
        {buttonLabel}
      </button>
    </form>
  );
}

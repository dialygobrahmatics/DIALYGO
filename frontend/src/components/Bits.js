import { ArrowDown, ArrowUp, Minus } from "lucide-react";

export const Panel = ({ title, hint, right, children, testId, className = "" }) => (
  <section data-testid={testId} className={`bg-white border border-slate-200 rounded-md shadow-sm ${className}`}>
    <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5">
      <div>
        <h3 className="font-head text-base md:text-lg font-bold">{title}</h3>
        {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      </div>
      {right}
    </div>
    <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-4">{children}</div>
  </section>
);

export const Metric = ({ label, value, unit, sub, testId, tone = "default" }) => {
  const toneCls = { default: "text-slate-900", alert: "text-red-700", warn: "text-amber-700", ok: "text-emerald-700" }[tone];
  return (
    <div data-testid={testId} className="min-w-0">
      <p className="overline truncate">{label}</p>
      <p className={`metric-num text-xl font-semibold mt-1 ${toneCls}`}>
        {value ?? "—"}
        {unit && <span className="text-xs font-medium text-slate-500 ml-1">{unit}</span>}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
};

export const TrendBadge = ({ direction, pct }) => {
  const map = {
    rising: { cls: "bg-amber-50 text-amber-800 border-amber-200", Icon: ArrowUp },
    falling: { cls: "bg-red-50 text-red-700 border-red-200", Icon: ArrowDown },
    stable: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: Minus },
    insufficient: { cls: "bg-slate-50 text-slate-600 border-slate-200", Icon: Minus },
  }[direction] || { cls: "bg-slate-50 text-slate-600 border-slate-200", Icon: Minus };
  const { cls, Icon } = map;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded border ${cls}`}>
      <Icon className="h-3 w-3" /> {direction}
      {pct !== undefined && pct !== null && direction !== "insufficient" ? ` ${pct > 0 ? "+" : ""}${pct}%` : ""}
    </span>
  );
};

export const ContextLine = ({ ctx, unit, label = "Previous 10-session range" }) => {
  if (!ctx?.range) return <p className="text-xs text-slate-500 mt-1">No prior data — verify with patient</p>;
  const cls =
    ctx.status === "below" ? "text-red-700" : ctx.status === "above" ? "text-amber-700" : ctx.status === "within" ? "text-emerald-700" : "text-slate-500";
  return (
    <p className="text-xs mt-1">
      <span className="text-slate-500">
        {label}: {ctx.range.min}–{ctx.range.max} {unit} (mean {ctx.range.mean})
      </span>
      {ctx.status !== "unknown" && (
        <span className={`font-semibold ml-1.5 ${cls}`}>
          · {ctx.status} range{ctx.delta !== null ? ` (${ctx.delta > 0 ? "+" : ""}${ctx.delta})` : ""}
        </span>
      )}
    </p>
  );
};

export const Field = ({ label, children, hint }) => (
  <label className="block">
    <span className="overline">{label}</span>
    <div className="mt-1.5">{children}</div>
    {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
  </label>
);

export const EmptyState = ({ text }) => (
  <div className="border border-dashed border-slate-300 rounded-md p-6 text-center">
    <p className="text-sm text-slate-500">{text}</p>
  </div>
);

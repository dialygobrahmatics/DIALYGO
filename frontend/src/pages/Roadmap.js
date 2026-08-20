import { Rocket, Lock } from "lucide-react";
import { Panel } from "@/components/Bits";
import { roadmapItems } from "@/data/adminData";

const groups = ["Data capture", "Integration", "Analytics", "Imaging", "Access"];

export default function Roadmap() {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6">
        <p className="overline">Beyond Phase-I</p>
        <h1 className="font-head text-3xl sm:text-4xl font-extrabold mt-1">Future Roadmap</h1>
        <p className="text-sm text-slate-600 mt-3 max-w-3xl">
          The capabilities below are not part of the Phase-I prototype. Phase-I is deliberately rule-based, illustrative and
          mock-data driven, with all clinical decisions remaining with qualified healthcare professionals.
        </p>
        <p className="text-sm text-slate-600 mt-2 max-w-3xl">
          Genomic or hereditary personalisation is out of scope for Dialyso and is not on this roadmap.
        </p>
      </div>

      {groups.map((g) => {
        const items = roadmapItems.filter((r) => r.group === g);
        if (!items.length) return null;
        return (
          <Panel key={g} title={g} hint="Future Release – Not Available in Phase I" testId={`roadmap-group-${g.toLowerCase().replace(/\s/g, "-")}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((r) => (
                <div key={r.title} className="border border-dashed border-slate-300 rounded-md p-4 bg-slate-50" data-testid={`roadmap-item-${r.title.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                  <div className="flex items-start gap-2.5">
                    <Rocket className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">{r.title}</p>
                      <p className="text-xs text-slate-600 mt-1.5">{r.detail}</p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white border border-slate-300 rounded px-2 py-0.5 mt-3">
                        <Lock className="h-3 w-3" /> Future Release – Not Available in Phase I
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

import { useState } from "react";
import { toast } from "sonner";
import { Cpu, Check, Loader2, ArrowRight } from "lucide-react";
import { Panel } from "@/components/Bits";
import { Button } from "@/components/ui/button";
import { useApp } from "@/context/AppContext";

const steps = [
  "Loading demographics, diagnosis and comorbidities",
  "Reconstructing historical dialysis sessions and parameters",
  "Consolidating historical complications and alarms",
  "Building vascular-access history and cannulation record",
  "Reading latest laboratory data and adequacy markers",
  "Loading previous clinical visits and clinician notes",
  "Comparing current pre-session data against longitudinal baseline",
  "Deriving trend analysis, risk flags and goal checks",
];

export default function CoreEngineRunner({ patient, onComplete, ctaLabel = "Review prescription report" }) {
  const { engineRuns, recordEngineRun } = useApp();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const lastRun = engineRuns[patient.id];

  const run = () => {
    setRunning(true);
    setDone(0);
    steps.forEach((_, i) => {
      setTimeout(() => {
        setDone(i + 1);
        if (i === steps.length - 1) {
          setRunning(false);
          recordEngineRun(patient.id);
          toast.success("Core engine run complete", { description: "Prototype analysis · decision support only · requires qualified clinical review." });
        }
      }, 260 * (i + 1));
    });
  };

  return (
    <Panel
      testId="core-engine-panel"
      title="Rule-Based Core Engine"
      hint="Consolidates the patient's longitudinal evidence and compares it with the current session. Prototype analysis — decision support only."
      right={
        <Button data-testid="run-core-engine-btn" onClick={run} disabled={running} className="bg-blue-600 hover:bg-blue-700">
          {running ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Running</> : <><Cpu className="h-4 w-4 mr-1.5" /> Run core engine</>}
        </Button>
      }
    >
      <ol className="space-y-2" data-testid="core-engine-steps">
        {steps.map((s, i) => {
          const complete = done > i || (!!lastRun && !running && done === 0);
          return (
            <li key={i} className={`flex items-center gap-2.5 text-sm rounded px-3 py-2 border transition-colors ${complete ? "border-emerald-200 bg-emerald-50 text-emerald-800" : running && done === i ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600"}`}>
              {complete ? <Check className="h-4 w-4 shrink-0" /> : running && done === i ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <span className="h-4 w-4 shrink-0 rounded-full border border-slate-300" />}
              {s}
            </li>
          );
        })}
      </ol>

      {(lastRun || done === steps.length) && (
        <div className="mt-5 rounded-md border border-blue-200 bg-blue-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between" data-testid="core-engine-result">
          <div>
            <p className="text-sm font-bold text-blue-900">Consolidation complete — output passed to the reporting layer</p>
            <p className="text-xs text-blue-800 mt-1">
              Last run {lastRun ? new Date(lastRun).toLocaleString() : "just now"} · Prototype Analysis · Decision Support Only · Requires Qualified Clinical Review
            </p>
          </div>
          {onComplete && (
            <Button data-testid="engine-goto-report-btn" variant="outline" onClick={onComplete}>
              {ctaLabel} <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          )}
        </div>
      )}
    </Panel>
  );
}

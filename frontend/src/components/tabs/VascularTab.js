import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { Panel, Metric, TrendBadge } from "@/components/Bits";
import { levelColor } from "@/lib/engine";

const typeStyle = {
  creation: { dot: "bg-navy", label: "Creation" },
  maturation: { dot: "bg-emerald-600", label: "Maturation" },
  infiltration: { dot: "bg-red-600", label: "Infiltration" },
  bleeding: { dot: "bg-red-600", label: "Bleeding" },
  infection: { dot: "bg-orange-600", label: "Infection" },
  stenosis: { dot: "bg-amber-600", label: "Stenosis" },
  thrombosis: { dot: "bg-red-700", label: "Thrombosis" },
  intervention: { dot: "bg-sky-brand", label: "Intervention" },
  observation: { dot: "bg-slate-600", label: "Operator observation" },
  flow: { dot: "bg-indigo-600", label: "Flow measurement" },
};

export default function VascularTab({ patient, insight }) {
  const v = patient.vascular;
  const events = [...v.timeline].reverse();
  const cannulation = patient.sessions.slice(-10).map((s) => ({
    name: `#${s.sessionNo}`,
    attempts: s.cannulationAttempts,
    infiltration: s.infiltration ? 1 : 0,
    vp: s.venousPressure,
  }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <Panel testId="vascular-profile-panel" title="Vascular Access Profile" hint="Consolidated access record, Phase-1 manual + historical entry">
        <div className={`rounded-xl border p-4 ${levelColor(insight.accessStatus.level)}`}>
          <p className="overline">Access status check</p>
          <p className="text-sm font-semibold mt-1">{insight.accessStatus.objective}</p>
          <p className="text-sm mt-1">{insight.accessStatus.status}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-5">
          <Metric label="Access type" value={v.type} />
          <Metric label="Location / side" value={`${v.site}`} sub={`${v.side} arm`} />
          <Metric label="Created on" value={v.createdOn} />
          <Metric label="Matured on" value={v.maturedOn || "N/A"} />
          <Metric label="Access age" value={v.accessAgeMonths} unit="months" />
          <Metric label="Patency" value={v.patency} />
          <Metric label="Needle / technique" value={v.needle} />
          <Metric label="Last intervention" value={v.lastIntervention} />
        </div>
        <div className="mt-5 pt-5 border-t border-slate-100">
          <p className="overline">Current operator-documented condition</p>
          <p className="text-sm text-slate-700 mt-1.5">{v.currentCondition}</p>
        </div>
      </Panel>

      <Panel
        testId="access-flow-panel"
        title="Access Flow Surveillance"
        hint="Threshold 600 mL/min for AVF/AVG (illustrative)"
        right={<TrendBadge direction={insight.vascularTrend.direction} pct={insight.vascularTrend.pct} />}
      >
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={v.flowSeries} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
              <ReferenceLine y={600} stroke="#dc2626" strokeDasharray="4 4" label={{ value: "600", fontSize: 10, fill: "#dc2626" }} />
              <Line type="monotone" dataKey="flow" stroke="#0a3d62" strokeWidth={2.5} dot={{ r: 3 }} name="Flow mL/min" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-700 mt-4">{insight.vascularTrend.detail}</p>

        <p className="overline mt-6">Cannulation record — last 10 sessions</p>
        <div className="h-36 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cannulation} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
              <Line type="stepAfter" dataKey="attempts" stroke="#f59e0b" strokeWidth={2} dot={false} name="Attempts" />
              <Line type="stepAfter" dataKey="infiltration" stroke="#dc2626" strokeWidth={2} dot={false} name="Infiltration" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel testId="vascular-timeline-panel" title="Vascular Access Timeline" hint="Most recent first — no need to search old records">
        <ol className="relative border-l-2 border-slate-200 ml-2" data-testid="vascular-timeline">
          {events.map((e, i) => {
            const st = typeStyle[e.type] || typeStyle.observation;
            return (
              <li key={i} className="ml-5 pb-6 last:pb-0" data-testid={`timeline-event-${i}`}>
                <span className={`absolute -left-[7px] h-3 w-3 rounded-full ring-2 ring-white ${st.dot}`} />
                <p className="metric-num text-xs text-slate-500">{e.date}</p>
                <p className="font-semibold text-sm mt-0.5">{e.title}</p>
                <p className="text-sm text-slate-600 mt-1">{e.detail}</p>
                <p className="overline mt-1.5">{st.label}</p>
              </li>
            );
          })}
        </ol>
      </Panel>
    </div>
  );
}

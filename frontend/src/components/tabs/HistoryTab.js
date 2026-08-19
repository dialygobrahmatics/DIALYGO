import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { FileText, Download } from "lucide-react";
import { Panel, Metric, EmptyState } from "@/components/Bits";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HistoryTab({ patient }) {
  const labSeries = [...patient.labs].reverse().map((l) => ({ date: l.date.slice(5), hb: l.hb, k: l.potassium, ktv: l.ktv, po4: l.phosphate }));
  const sessions = [...patient.sessions].reverse();

  return (
    <Panel testId="history-panel" title="Patient Historical Evidence" hint="Full reconstructed record — sessions, labs, medications, admissions, documents and notes">
      <Tabs defaultValue="sessions">
        <TabsList className="flex flex-wrap h-auto justify-start gap-1" data-testid="history-subtabs">
          <TabsTrigger value="sessions" data-testid="hist-tab-sessions">Sessions</TabsTrigger>
          <TabsTrigger value="labs" data-testid="hist-tab-labs">Labs &amp; trends</TabsTrigger>
          <TabsTrigger value="meds" data-testid="hist-tab-meds">Medications</TabsTrigger>
          <TabsTrigger value="admissions" data-testid="hist-tab-admissions">Admissions &amp; procedures</TabsTrigger>
          <TabsTrigger value="docs" data-testid="hist-tab-docs">Documents</TabsTrigger>
          <TabsTrigger value="notes" data-testid="hist-tab-notes">Clinical notes</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="all-sessions-table">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  {["#", "Date", "Dur", "Qb", "Qd", "Pre wt", "Post wt", "UF tgt/ach", "Pre BP", "Post BP", "Ven P", "Art P", "TMP", "Cann.", "Access", "Alarms", "Complications"].map((h) => (
                    <th key={h} className="overline py-2 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.sessionNo} className="border-b border-slate-100 hover:bg-slate-50 transition-colors align-top">
                    <td className="metric-num py-2.5 pr-4">{s.sessionNo}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">{s.date}</td>
                    <td className="metric-num py-2.5 pr-4">{s.durationMin}</td>
                    <td className="metric-num py-2.5 pr-4">{s.bloodFlow}</td>
                    <td className="metric-num py-2.5 pr-4">{s.dialysateFlow}</td>
                    <td className="metric-num py-2.5 pr-4">{s.preWeight}</td>
                    <td className="metric-num py-2.5 pr-4">{s.postWeight}</td>
                    <td className="metric-num py-2.5 pr-4">{s.ufTarget}/{s.ufAchieved}</td>
                    <td className="metric-num py-2.5 pr-4">{s.preBP}</td>
                    <td className="metric-num py-2.5 pr-4">{s.postBP}</td>
                    <td className="metric-num py-2.5 pr-4">{s.venousPressure}</td>
                    <td className="metric-num py-2.5 pr-4">{s.arterialPressure}</td>
                    <td className="metric-num py-2.5 pr-4">{s.tmp}</td>
                    <td className="metric-num py-2.5 pr-4">{s.cannulationAttempts}{s.infiltration ? " + infil" : ""}</td>
                    <td className="py-2.5 pr-4 text-xs min-w-[150px]">{s.accessCondition}</td>
                    <td className="py-2.5 pr-4 text-xs">{s.alarms.join(", ") || "—"}</td>
                    <td className="py-2.5 pr-4 text-xs min-w-[160px] text-red-700">{s.complications.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="labs" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <p className="overline mb-2">Haemoglobin &amp; potassium trend</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={labSeries} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                    <Line type="monotone" dataKey="hb" stroke="#2563eb" strokeWidth={2} name="Hb g/dL" />
                    <Line type="monotone" dataKey="k" stroke="#dc2626" strokeWidth={2} name="K mmol/L" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <p className="overline mb-2">Adequacy (Kt/V) &amp; phosphate trend</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={labSeries} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                    <Line type="monotone" dataKey="ktv" stroke="#10b981" strokeWidth={2} name="Kt/V" />
                    <Line type="monotone" dataKey="po4" stroke="#f59e0b" strokeWidth={2} name="PO4 mg/dL" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto mt-6">
            <table className="w-full text-sm" data-testid="labs-table">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  {["Date", "Hb", "K", "Creatinine", "Urea", "Albumin", "Ca", "PO4", "Kt/V", "URR", "CRP"].map((h) => (
                    <th key={h} className="overline py-2 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patient.labs.map((l) => (
                  <tr key={l.date} className="border-b border-slate-100">
                    <td className="py-2.5 pr-4 whitespace-nowrap">{l.date}</td>
                    {["hb", "potassium", "creatinine", "urea", "albumin", "calcium", "phosphate", "ktv", "urr", "crp"].map((k) => (
                      <td key={k} className="metric-num py-2.5 pr-4">{l[k]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="meds" className="mt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="medications-list">
            {patient.medications.map((m, i) => (
              <div key={i} className="border border-slate-200 rounded-md p-4">
                <p className="font-semibold text-sm">{m.name}</p>
                <p className="metric-num text-sm text-slate-700 mt-1">{m.dose} · {m.route}</p>
                <p className="text-xs text-slate-500 mt-1">{m.freq} · since {m.since}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="admissions" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <p className="overline mb-3">Hospitalisation history</p>
              {patient.hospitalizations.length ? (
                <ul className="space-y-3" data-testid="hospitalizations-list">
                  {patient.hospitalizations.map((h, i) => (
                    <li key={i} className="border border-slate-200 rounded-md p-4">
                      <p className="metric-num text-xs text-slate-500">{h.date}</p>
                      <p className="text-sm font-semibold mt-0.5">{h.reason}</p>
                      <p className="text-xs text-slate-600 mt-1">{h.days} days · {h.unit}</p>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState text="No prior admissions recorded — verify with patient" />}
            </div>
            <div>
              <p className="overline mb-3">Previous procedures</p>
              <ul className="space-y-3" data-testid="procedures-list">
                {patient.procedures.map((p, i) => (
                  <li key={i} className="border border-slate-200 rounded-md p-4">
                    <p className="metric-num text-xs text-slate-500">{p.date}</p>
                    <p className="text-sm font-semibold mt-0.5">{p.name}</p>
                    <p className="text-xs text-slate-600 mt-1">{p.by}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="docs" className="mt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="documents-list">
            {patient.documents.map((d, i) => (
              <div key={i} className="border border-slate-200 rounded-md p-4 flex items-start gap-3">
                <div className="h-9 w-9 rounded bg-blue-50 border border-blue-200 grid place-items-center shrink-0">
                  <FileText className="h-4 w-4 text-blue-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{d.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{d.type} · {d.date} · {d.pages} pages</p>
                  <span className="text-xs text-slate-400 inline-flex items-center gap-1 mt-1.5">
                    <Download className="h-3 w-3" /> Retrieval available in Phase-2
                  </span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-5">
          <ul className="space-y-3" data-testid="notes-list">
            {patient.notes.map((n, i) => (
              <li key={i} className="border-l-2 border-blue-600 pl-4 py-1">
                <p className="metric-num text-xs text-slate-500">{n.date} · {n.by}</p>
                <p className="text-sm text-slate-700 mt-1">{n.text}</p>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100">
        <Metric label="Total sessions on record" value={patient.sessions.length} />
        <Metric label="Dialysis vintage" value={patient.dialysisVintageMonths} unit="months" />
        <Metric label="Comorbidities" value={patient.comorbidities.length} sub={patient.comorbidities.join(", ")} />
        <Metric label="Documents on file" value={patient.documents.length} />
      </div>
    </Panel>
  );
}

import React, { useMemo, useState } from "react";
import { CalendarDays, Eye, FlaskConical, Search, X } from "lucide-react";
import { LabOrderRecord } from "../../lib/mockDataStore";
import { formatPKTDateAndDay, getTodayPKTString, toPKTDateString } from "../../lib/dateUtils";

type ReportPeriod = "DAILY" | "WEEKLY" | "MONTHLY";

interface AdminLabReportsProps {
  labOrders: LabOrderRecord[];
}

function readReportResults(order: LabOrderRecord): Array<{ testName: string; results: Record<string, unknown>; remarks?: string }> {
  const reportText = order.resultsV2 || order.resultsV1;
  if (!reportText) return [];

  try {
    const parsed = JSON.parse(reportText);
    const tests = parsed?.__labTests;
    if (tests && typeof tests === "object") {
      return Object.entries(tests).map(([testCode, value]: [string, any], index) => ({
        testName: order.tests[index] || testCode,
        results: Array.isArray(value?.evaluated)
          ? Object.fromEntries(value.evaluated.map((entry: any) => [entry.name || entry.parameterName || entry.parameterId, entry]))
          : value?.results && typeof value.results === "object" ? value.results : value,
        remarks: value?.remarks,
      }));
    }
    return [{ testName: order.tests.join(", ") || "Lab result", results: parsed && typeof parsed === "object" ? parsed : { Result: parsed } }];
  } catch {
    return [{ testName: order.tests.join(", ") || "Lab result", results: { Notes: reportText } }];
  }
}

function getPeriodBounds(period: ReportPeriod, today: string): { start: string; end: string } {
  if (period === "DAILY") return { start: today, end: today };
  if (period === "MONTHLY") return { start: `${today.slice(0, 7)}-01`, end: today };

  const todayAtNoonUtc = new Date(`${today}T12:00:00Z`);
  const monday = new Date(todayAtNoonUtc);
  monday.setUTCDate(todayAtNoonUtc.getUTCDate() - ((todayAtNoonUtc.getUTCDay() + 6) % 7));
  return { start: monday.toISOString().slice(0, 10), end: today };
}

export const AdminLabReports: React.FC<AdminLabReportsProps> = ({ labOrders }) => {
  const [period, setPeriod] = useState<ReportPeriod>("DAILY");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<LabOrderRecord | null>(null);
  const today = getTodayPKTString();
  const { start, end } = getPeriodBounds(period, today);

  const visibleOrders = useMemo(() => labOrders
    .filter((order) => {
      const orderDate = toPKTDateString(order.requestDate || order.createdAt);
      const matchesDate = orderDate >= start && orderDate <= end;
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || [order.patientName, order.mrNumber, order.orderNumber, ...order.tests]
        .some((value) => String(value || "").toLowerCase().includes(query));
      return matchesDate && matchesSearch;
    })
    .sort((a, b) => toPKTDateString(b.requestDate || b.createdAt).localeCompare(toPKTDateString(a.requestDate || a.createdAt))),
  [labOrders, search, start, end]);

  const completedCount = visibleOrders.filter((order) => Boolean(order.resultsV1 || order.resultsV2)).length;
  const reportSections = selectedOrder ? readReportResults(selectedOrder) : [];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
              <FlaskConical className="h-5 w-5 text-amber-500" /> Laboratory Tests & Reports
            </h2>
            <p className="mt-1 text-xs text-slate-500">Review ordered tests and patient report results by date range.</p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Lab report period">
            {(["DAILY", "WEEKLY", "MONTHLY"] as ReportPeriod[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPeriod(option)}
                aria-pressed={period === option}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${period === option ? "bg-brand-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}
              >
                {option.charAt(0) + option.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Selected period</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><CalendarDays className="h-4 w-4 text-brand-500" />{formatPKTDateAndDay(start)}{start !== end ? ` — ${formatPKTDateAndDay(end)}` : ""}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Lab orders</div>
            <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">{visibleOrders.length}</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Results available</div>
            <div className="mt-1 text-xl font-black text-emerald-700 dark:text-emerald-400">{completedCount}</div>
          </div>
        </div>

        <label className="relative mt-4 block">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search patient, MRN, order number, or test name"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </label>
      </section>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[900px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800">
              <th className="px-4 py-3">Patient details</th>
              <th className="px-4 py-3">Test name(s)</th>
              <th className="px-4 py-3">Date & day</th>
              <th className="px-4 py-3">Order number</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Report result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibleOrders.map((order) => {
              const hasResult = Boolean(order.resultsV1 || order.resultsV2);
              return (
                <tr key={order.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                    {order.patientName || "Patient name unavailable"}
                    <span className="mt-1 block font-mono text-[10px] font-semibold text-slate-500">MRN: {order.mrNumber || "—"}</span>
                  </td>
                  <td className="max-w-xs px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{order.tests?.length ? order.tests.join(", ") : "Lab test"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{formatPKTDateAndDay(order.requestDate || order.createdAt)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-amber-700 dark:text-amber-400">{order.orderNumber}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${hasResult ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"}`}>{order.status.replaceAll("_", " ")}</span></td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => setSelectedOrder(order)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-brand-500">
                      <Eye className="h-3.5 w-3.5" /> {hasResult ? "View result" : "View order"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {visibleOrders.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No lab tests found for this period and search.</td></tr>}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="admin-lab-report-title">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h3 id="admin-lab-report-title" className="text-base font-black text-slate-900 dark:text-white">Lab report result</h3>
                <p className="mt-1 text-xs text-slate-500">{selectedOrder.patientName} · {selectedOrder.mrNumber} · {selectedOrder.orderNumber}</p>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)} aria-label="Close report" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60"><span className="text-slate-500">Test(s)</span><p className="mt-1 font-bold text-slate-900 dark:text-white">{selectedOrder.tests.join(", ") || "Lab test"}</p></div>
                <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60"><span className="text-slate-500">Date & day</span><p className="mt-1 font-bold text-slate-900 dark:text-white">{formatPKTDateAndDay(selectedOrder.requestDate || selectedOrder.createdAt)}</p></div>
              </div>
              {reportSections.length ? reportSections.map((section, index) => (
                <section key={`${section.testName}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white">{section.testName}</h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Object.entries(section.results || {}).map(([name, result]) => {
                      const values = result && typeof result === "object" ? result as Record<string, unknown> : null;
                      const value = values ? values.value ?? values.result ?? values.observedValue ?? JSON.stringify(result) : String(result ?? "—");
                      const unit = values?.unit ? ` ${String(values.unit)}` : "";
                      const reference = values?.referenceRange || values?.reference || values?.normalRange;
                      return <div key={name} className="grid grid-cols-1 gap-1 px-4 py-2.5 text-xs sm:grid-cols-[1fr_1fr_1fr] sm:gap-3"><span className="font-semibold text-slate-700 dark:text-slate-300">{name}</span><span className="font-bold text-slate-900 dark:text-white">{String(value)}{unit}</span><span className="text-slate-500">{reference ? `Reference: ${String(reference)}` : ""}</span></div>;
                    })}
                  </div>
                  {section.remarks && <p className="border-t border-slate-200 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300"><strong>Remarks:</strong> {section.remarks}</p>}
                </section>
              )) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                  No finalized result is available yet. Current order status: <strong>{selectedOrder.status.replaceAll("_", " ")}</strong>.
                </div>
              )}
              {selectedOrder.attachedPdfName && <p className="text-xs text-slate-500">Saved report: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedOrder.attachedPdfName}</span></p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
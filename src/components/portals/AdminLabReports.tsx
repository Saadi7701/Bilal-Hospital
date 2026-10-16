import React, { useMemo, useState } from "react";
import { CalendarDays, Eye, FlaskConical, Printer, RefreshCw, Search, X } from "lucide-react";
import { LabOrderRecord } from "../../lib/mockDataStore";
import { formatPKTDateAndDay, getTodayPKTString, toPKTDateString } from "../../lib/dateUtils";
import { getTemplateByCode } from "../../lib/labTemplateRegistry";

type ReportPeriod = "DAILY" | "WEEKLY" | "MONTHLY";

interface AdminLabReportsProps {
  labOrders: LabOrderRecord[];
}

function readReportResults(order: LabOrderRecord): Array<{ testName: string; testCode: string; results: Record<string, unknown>; remarks?: string }> {
  const reportText = order.resultsV2 || order.resultsV1;
  if (!reportText) return [];

  try {
    const parsed = JSON.parse(reportText);
    const tests = parsed?.__labTests;
    if (tests && typeof tests === "object") {
      return Object.entries(tests).map(([testCode, value]: [string, any], index) => ({
        testName: order.tests[index] || testCode,
        testCode,
        results: Array.isArray(value?.evaluated)
          ? Object.fromEntries(value.evaluated.map((entry: any) => [entry.name || entry.parameterName || entry.parameterId, entry]))
          : value?.results && typeof value.results === "object" ? value.results : value,
        remarks: value?.remarks,
      }));
    }
    return [{ testName: order.tests.join(", ") || "Lab result", testCode: order.tests[0] || "", results: parsed && typeof parsed === "object" ? parsed : { Result: parsed } }];
  } catch {
    return [{ testName: order.tests.join(", ") || "Lab result", testCode: order.tests[0] || "", results: { Notes: reportText } }];
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
  const [allOrders, setAllOrders] = useState<LabOrderRecord[]>(labOrders);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [loadError, setLoadError] = useState("");
  const today = getTodayPKTString();
  const { start, end } = getPeriodBounds(period, today);

  const loadAllOrders = React.useCallback(async () => {
    setIsLoadingOrders(true);
    setLoadError("");
    try {
      const response = await fetch("/api/lab-orders?period=all", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Lab orders request failed (${response.status}).`);
      if (!Array.isArray(data.labOrders)) throw new Error("The lab orders response was not in the expected format.");

      const fetchedOrders: LabOrderRecord[] = data.labOrders.map((order: any) => ({
        id: order.id || order._id,
        orderNumber: order.orderNumber || order.labOrderNumber || `LAB-${order.id || order._id}`,
        patientId: order.patientId || "",
        patientName: order.patientName || order.patient?.fullName || "",
        mrNumber: order.mrNumber || order.patient?.mrNumber || "",
        cnic: order.cnic || order.patient?.cnic || "",
        age: order.age || order.patient?.age || 35,
        gender: order.gender || order.patient?.gender || "Male",
        visitId: order.visitId || "",
        consultantId: order.consultantId || "",
        consultantName: order.consultantName || "Doctor",
        testCategory: order.testCategory || order.category || "General Pathology",
        tests: Array.isArray(order.items) && order.items.length
          ? order.items.map((item: any) => item.testName || item.testCode || "Lab test")
          : Array.isArray(order.tests) ? order.tests : [order.testName || "Lab test"],
        totalFee: Number(order.totalFee || order.fee) || 0,
        priority: order.priority === "URGENT" ? "URGENT" : "NORMAL",
        status: order.status || "ORDERED",
        requestDate: toPKTDateString(order.requestDate || order.createdAt),
        createdAt: order.createdAt || order.requestDate,
        currentVersion: Number(order.currentVersion) || 1,
        resultsV1: order.resultsV1,
        resultsV2: order.resultsV2,
        revisionReason: order.revisionReason,
        revisionComment: order.revisionComment,
        attachedPdfName: order.attachedPdfName,
        attachedPdfUrl: order.attachedPdfUrl,
        attachedImageBase64: order.attachedImageBase64,
      }));
      setAllOrders(fetchedOrders);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load lab orders.");
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  React.useEffect(() => {
    void loadAllOrders();
  }, [loadAllOrders]);

  React.useEffect(() => {
    if (labOrders.length > 0) setAllOrders(labOrders);
  }, [labOrders]);

  const visibleOrders = useMemo(() => allOrders
    .filter((order) => {
      const orderDate = toPKTDateString(order.requestDate || order.createdAt);
      const matchesDate = orderDate >= start && orderDate <= end;
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || [order.patientName, order.mrNumber, order.orderNumber, ...order.tests]
        .some((value) => String(value || "").toLowerCase().includes(query));
      return matchesDate && matchesSearch;
    })
    .sort((a, b) => toPKTDateString(b.requestDate || b.createdAt).localeCompare(toPKTDateString(a.requestDate || a.createdAt))),
  [allOrders, search, start, end]);

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
            <button type="button" onClick={() => void loadAllOrders()} disabled={isLoadingOrders} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingOrders ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {loadError && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">Unable to load lab orders: {loadError}</div>}

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
            {visibleOrders.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">{isLoadingOrders ? "Loading lab orders…" : loadError ? "Could not load lab tests. Check the error above and try Refresh." : allOrders.length === 0 ? "No lab orders were returned by the server." : `No lab tests found between ${start} and ${end}. Try another period or search.`}</td></tr>}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="admin-lab-report-title">
          <div className="admin-lab-report-modal max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="admin-lab-report-toolbar sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h3 id="admin-lab-report-title" className="text-base font-black text-slate-900 dark:text-white">Lab report result</h3>
                <p className="mt-1 text-xs text-slate-500">{selectedOrder.patientName} · {selectedOrder.mrNumber} · {selectedOrder.orderNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                {reportSections.length > 0 && <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-500"><Printer className="h-4 w-4" /> Print report</button>}
                <button type="button" onClick={() => setSelectedOrder(null)} aria-label="Close report" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div id="admin-lab-report-print" className="mx-auto max-w-3xl space-y-5 bg-white p-5 text-slate-900 sm:p-8">
              {reportSections.length ? (
                <>
                  <header className="border-b-2 border-slate-800 pb-4 text-center">
                    <div className="text-xl font-black tracking-wide text-slate-900">BILAL HOSPITAL</div>
                    <div className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Pathology & Diagnostic Laboratory</div>
                    <div className="mt-4 inline-block rounded border border-slate-300 px-5 py-1.5 text-sm font-black uppercase tracking-wider">Laboratory Report</div>
                  </header>

                  <section className="grid grid-cols-1 gap-x-8 gap-y-2 border-b border-slate-300 pb-4 text-xs sm:grid-cols-2">
                    <p><span className="font-bold text-slate-500">Patient name:</span> <strong>{selectedOrder.patientName || "—"}</strong></p>
                    <p><span className="font-bold text-slate-500">MR number:</span> <strong>{selectedOrder.mrNumber || "—"}</strong></p>
                    <p><span className="font-bold text-slate-500">Age / Gender:</span> <strong>{selectedOrder.age || "—"} years / {selectedOrder.gender || "—"}</strong></p>
                    <p><span className="font-bold text-slate-500">Consultant:</span> <strong>{selectedOrder.consultantName || "—"}</strong></p>
                    <p><span className="font-bold text-slate-500">Lab order:</span> <strong>{selectedOrder.orderNumber}</strong></p>
                    <p><span className="font-bold text-slate-500">Sample date:</span> <strong>{formatPKTDateAndDay(selectedOrder.requestDate || selectedOrder.createdAt)}</strong></p>
                    <p><span className="font-bold text-slate-500">Report version:</span> <strong>{selectedOrder.currentVersion || 1}</strong></p>
                    <p><span className="font-bold text-slate-500">Report status:</span> <strong>{selectedOrder.status.replaceAll("_", " ")}</strong></p>
                  </section>

                  {reportSections.map((section, index) => (
                    <section key={`${section.testName}-${index}`} className="space-y-2">
                      <h4 className="border-b border-slate-400 pb-1 text-sm font-black uppercase tracking-wide">{section.testName}</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead><tr className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600"><th className="border border-slate-300 px-3 py-2">Test parameter</th><th className="border border-slate-300 px-3 py-2">Result</th><th className="border border-slate-300 px-3 py-2">Unit</th><th className="border border-slate-300 px-3 py-2">Reference range</th></tr></thead>
                          <tbody>
                            {Object.entries(section.results || {}).map(([name, result]) => {
                              const values = result && typeof result === "object" ? result as Record<string, unknown> : null;
                              const template = getTemplateByCode(section.testCode);
                              const parameter = template?.parameters.find((item) =>
                                item.parameterId === String(values?.parameterId || name) ||
                                item.name.toLowerCase() === name.toLowerCase()
                              );
                              const value = values ? values.value ?? values.result ?? values.observedValue ?? JSON.stringify(result) : String(result ?? "—");
                              const unit = values?.unit || parameter?.unit || "—";
                              const reference = values?.referenceRange || values?.reference || values?.normalRange || parameter?.referenceRange || "—";
                              const flag = values?.flag ? String(values.flag) : "";
                              return <tr key={name} className={flag && flag !== "NORMAL" ? "bg-rose-50" : ""}><td className="border border-slate-300 px-3 py-2 font-semibold">{parameter?.name || name}</td><td className={`border border-slate-300 px-3 py-2 font-bold ${flag && flag !== "NORMAL" ? "text-rose-700" : ""}`}>{String(value)}{flag && flag !== "NORMAL" ? ` (${flag})` : ""}</td><td className="border border-slate-300 px-3 py-2">{String(unit)}</td><td className="whitespace-pre-line border border-slate-300 px-3 py-2">{String(reference)}</td></tr>;
                            })}
                          </tbody>
                        </table>
                      </div>
                      {section.remarks && <p className="text-xs"><strong>Remarks:</strong> {section.remarks}</p>}
                    </section>
                  ))}

                  <footer className="border-t border-slate-300 pt-3 text-[10px] text-slate-500">
                    Computer-generated laboratory report · Version {selectedOrder.currentVersion || 1} · Please correlate results clinically.
                  </footer>
                </>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                  No finalized result is available yet. Current order status: <strong>{selectedOrder.status.replaceAll("_", " ")}</strong>.
                </div>
              )}
            </div>
          </div>
          <style>{`@media print { body * { visibility: hidden !important; } #admin-lab-report-print, #admin-lab-report-print * { visibility: visible !important; } #admin-lab-report-print { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 12mm !important; color: #111827 !important; background: #fff !important; } #admin-lab-report-print table { page-break-inside: auto; } #admin-lab-report-print tr { page-break-inside: avoid; page-break-after: auto; } .admin-lab-report-modal { max-height: none !important; overflow: visible !important; border: 0 !important; box-shadow: none !important; } .admin-lab-report-toolbar { display: none !important; } @page { size: A4 portrait; margin: 8mm; } }`}</style>
        </div>
      )}
    </div>
  );
};
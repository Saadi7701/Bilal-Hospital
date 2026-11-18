import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, DollarSign, FileText, Plus, Printer, Radio, Receipt, Search, TrendingDown, TrendingUp } from "lucide-react";
import { StatCard } from "../ui/StatCard";
import { Badge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import { CashTransactionRecord, PatientRecord, UltrasoundOrderRecord } from "../../lib/mockDataStore";
import { createPatientApi } from "../../lib/apiClient";
import { DEFAULT_ULTRASOUND_TEMPLATES, UltrasoundTemplateDef } from "../../lib/ultrasoundTemplateRegistry";
import { toPKTDateString } from "../../lib/dateUtils";

interface Props {
  activeTab: string;
  ultrasoundOrders: UltrasoundOrderRecord[];
  patients?: PatientRecord[];
  onAddUltrasoundOrder?: (order: UltrasoundOrderRecord) => Promise<UltrasoundOrderRecord | null>;
  onSubmitUltrasoundResult: (orderId: string, findings: string, impression: string) => Promise<void> | void;
  onUpdateUltrasoundOrderStatus?: (orderId: string, status: UltrasoundOrderRecord["status"]) => void;
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char] || char));

const mapCashTransaction = (transaction: any): CashTransactionRecord => {
  const dateValue = transaction.transactionDate || transaction.date;
  const transactionDate = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(transactionDate.getTime())) throw new Error("A cash transaction has an invalid date.");

  return {
    id: String(transaction.id || transaction._id || transaction.transactionNumber),
    transactionNumber: transaction.transactionNumber || "—",
    transactionType: transaction.transactionType,
    category: transaction.category || "Ultrasound Expense",
    department: transaction.department || "Ultrasound Department",
    amount: Number(transaction.amount) || 0,
    paymentMethod: transaction.paymentMethod || "CASH",
    description: transaction.description || "—",
    date: toPKTDateString(transactionDate),
    time: new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" }).format(transactionDate),
    createdBy: transaction.createdBy || transaction.enteredBy || "Ultrasound Staff",
  };
};

export const UltrasoundPortal: React.FC<Props> = ({ activeTab, ultrasoundOrders, patients = [], onAddUltrasoundOrder, onSubmitUltrasoundResult, onUpdateUltrasoundOrderStatus }) => {
  const [templates, setTemplates] = useState<UltrasoundTemplateDef[]>(DEFAULT_ULTRASOUND_TEMPLATES);
  const [selected, setSelected] = useState<UltrasoundOrderRecord | null>(null);
  const [sections, setSections] = useState<Record<string, string>>({});
  const [impression, setImpression] = useState("");
  const [patientQuery, setPatientQuery] = useState("");
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [patientName, setPatientName] = useState("");
  const [cnic, setCnic] = useState("");
  const [age, setAge] = useState("35");
  const [gender, setGender] = useState("Male");
  const [consultant, setConsultant] = useState("Dr. Self / Direct Ultrasound Request");
  const [templateCode, setTemplateCode] = useState("");
  const [fee, setFee] = useState("3000");
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<UltrasoundTemplateDef | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("General");
  const [templateSource, setTemplateSource] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateSectionsText, setTemplateSectionsText] = useState("");
  const [templateSaveError, setTemplateSaveError] = useState("");
  const [financeExpenses, setFinanceExpenses] = useState<CashTransactionRecord[]>([]);
  const [dailyCashTransactions, setDailyCashTransactions] = useState<CashTransactionRecord[]>([]);
  const [isLoadingFinance, setIsLoadingFinance] = useState(false);
  const [financeError, setFinanceError] = useState("");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState("Ultrasound Supplies & Consumables");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expensePaymentMethod, setExpensePaymentMethod] = useState("CASH");
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  useEffect(() => {
    fetch("/api/ultrasound-templates", { cache: "no-store" }).then((r) => r.json()).then((data) => {
      if (Array.isArray(data.templates) && data.templates.length) setTemplates(data.templates);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (activeTab !== "us_finance") return;
    let isCurrent = true;
    setIsLoadingFinance(true);
    setFinanceError("");

    Promise.all([
      fetch("/api/cash?period=all&department=Ultrasound%20Department"),
      fetch("/api/cash?period=today&department=Ultrasound%20Department"),
    ])
      .then(async ([allResponse, todayResponse]) => {
        const [allData, todayData] = await Promise.all([allResponse.json(), todayResponse.json()]);
        if (!allResponse.ok) throw new Error(allData.error || "Could not load ultrasound expenses.");
        if (!todayResponse.ok) throw new Error(todayData.error || "Could not load today's ultrasound cash activity.");
        return { allData, todayData };
      })
      .then(({ allData, todayData }) => {
        if (!isCurrent) return;
        const isUltrasoundDepartment = (transaction: any) =>
          String(transaction.department || "").trim().toLowerCase() === "ultrasound department";
        const allTransactions = Array.isArray(allData.transactions) ? allData.transactions : [];
        const todayTransactions = Array.isArray(todayData.transactions) ? todayData.transactions : [];
        setFinanceExpenses(allTransactions.filter((transaction: any) =>
          transaction.transactionType === "EXPENSE" && isUltrasoundDepartment(transaction)
        ).map(mapCashTransaction));
        setDailyCashTransactions(todayTransactions.filter((transaction: any) =>
          isUltrasoundDepartment(transaction) && ["INCOME", "EXPENSE"].includes(transaction.transactionType)
        ).map(mapCashTransaction));
      })
      .catch((reason) => {
        if (isCurrent) setFinanceError(reason.message || "Could not load ultrasound finance data.");
      })
      .finally(() => {
        if (isCurrent) setIsLoadingFinance(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [activeTab]);

  const template = templates.find((item) => item.code === selected?.templateCode)
    || templates.find((item) => item.name === selected?.requestedExam)
    || templates[0];
  useEffect(() => {
    if (!selected || !template) return;
    let saved: Record<string, string> = {};
    try { saved = JSON.parse(selected.currentVersion > 1 ? selected.findingsV2 || "{}" : selected.findingsV1 || "{}").sections || {}; } catch { /* old plain text */ }
    setSections(Object.fromEntries(template.sections.map((title) => [title, saved[title] || ""])));
    setImpression((selected.currentVersion > 1 ? selected.impressionV2 : selected.impressionV1) || "");
    setError("");
  }, [selected?.id, selected?.currentVersion, templates]);

  const searchedPatients = useMemo(() => patients.filter((item) => patientQuery.trim() && [item.fullName, item.mrNumber, item.cnic || "", item.phone].some((value) => value.toLowerCase().includes(patientQuery.toLowerCase()))), [patients, patientQuery]);
  const pending = ultrasoundOrders.filter((order) => ["ORDERED", "PROCESSING", "REVISION_REQUESTED"].includes(order.status));
  const filtered = ultrasoundOrders.filter((order) => !query.trim() || [order.patientName, order.mrNumber, order.orderNumber, order.requestedExam].some((value) => value?.toLowerCase().includes(query.toLowerCase())));

  const startNew = (chosen?: UltrasoundTemplateDef) => {
    setPatientQuery(""); setPatient(null); setPatientName(""); setCnic(""); setAge("35"); setGender("Male");
    setConsultant("Dr. Self / Direct Ultrasound Request"); setTemplateCode(chosen?.code || ""); setFee("3000"); setShowNew(true);
  };

  const openTemplateEditor = (item?: UltrasoundTemplateDef) => {
    setEditingTemplate(item || null);
    setTemplateCode(item?.code || "");
    setTemplateName(item?.name || "");
    setTemplateCategory(item?.category || "General");
    setTemplateSource(item?.sourceFileName || "");
    setTemplateDescription(item?.description || "");
    setTemplateSectionsText(item?.sections.join("\n") || "");
    setTemplateSaveError("");
    setTemplateEditorOpen(true);
  };

  const saveTemplate = async () => {
    const response = await fetch("/api/ultrasound-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: templateCode,
        name: templateName,
        category: templateCategory,
        sourceFileName: templateSource,
        description: templateDescription,
        sections: templateSectionsText.split("\n").map((line) => line.trim()).filter(Boolean),
      }),
    });
    const data = await response.json();
    if (!response.ok) { setTemplateSaveError(data.error || "Could not save this template."); return; }
    setTemplates((current) => [...current.filter((item) => item.code !== data.template.code), data.template]);
    setTemplateEditorOpen(false);
  };

  const createOrder = async () => {
    const chosen = templates.find((item) => item.code === templateCode);
    const name = patient?.fullName || patientName.trim();
    const amount = Number(fee);
    if (!name || !chosen || !Number.isFinite(amount) || amount < 0 || !onAddUltrasoundOrder) { alert("Enter/select a patient, ultrasound exam, and valid fee."); return; }
    setSaving(true);
    try {
      let patientId = patient?.id || ""; let mrNumber = patient?.mrNumber || "";
      let finalAge = patient?.age || Number(age) || 35; let finalGender = patient?.gender || gender; let finalCnic = patient?.cnic || cnic.trim();
      if (!patient) {
        const registered = await createPatientApi({ id: "", mrNumber: "", fullName: name, fatherHusbandName: "", age: finalAge, gender: finalGender, phone: "0300-0000000", cnic: finalCnic, bloodGroup: "UNKNOWN", registrationDate: toPKTDateString(new Date()) });
        if (!registered) return;
        patientId = registered.id; mrNumber = registered.mrNumber; finalCnic = registered.cnic || finalCnic;
      }
      const now = new Date();
      const draft: UltrasoundOrderRecord = {
        id: `us-${Date.now()}`, orderNumber: `US-${Date.now().toString().slice(-8)}`, patientId, patientName: name, mrNumber, cnic: finalCnic,
        age: finalAge, gender: finalGender, visitId: "", consultantId: "", consultantName: consultant.trim() || "Direct Ultrasound Request",
        templateCode: chosen.code, requestedExam: chosen.name, clinicalIndication: "Direct ultrasound request", totalFee: amount,
        status: "ORDERED", requestDate: toPKTDateString(now), createdAt: now.toISOString(), currentVersion: 1,
      };
      const saved = await onAddUltrasoundOrder(draft);
      if (!saved) { alert("Ultrasound order was not saved. Please retry."); return; }
      setShowNew(false); setSelected(saved);
    } finally { setSaving(false); }
  };

  const printReport = (order: UltrasoundOrderRecord, tmpl: UltrasoundTemplateDef, values: Record<string, string>, summary: string, printWindow?: Window | null) => {
    const body = [...tmpl.sections.map((title) => ({ title, text: values[title] || "" })).filter((item) => item.text.trim()), { title: "IMPRESSION", text: summary }]
      .map((item) => `<section><b>${escapeHtml(item.title)}</b><p>${escapeHtml(item.text).replace(/\n/g, "<br>")}</p></section>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:13mm}*{box-sizing:border-box}body{font:10pt Arial;line-height:1.35;color:#111}.head{border-bottom:2px solid #be185d;padding-bottom:8px}.head h1{margin:0}.meta{display:grid;grid-template-columns:1fr 1fr;gap:6px;background:#f8fafc;padding:10px;margin:12px 0}.title{text-align:center;color:#9d174d;font-weight:bold;font-size:14pt;margin:12px}section{margin:0 0 8px;break-inside:avoid}p{margin:3px 0;white-space:pre-wrap;overflow-wrap:anywhere}.foot{position:fixed;bottom:0;border-top:1px solid #cbd5e1;width:100%;padding-top:5px;font-size:8pt;display:flex;justify-content:space-between}</style></head><body><header class="head"><h1>BILAL HOSPITAL</h1>DIAGNOSTIC ULTRASOUND & SONOGRAPHY<br>Order ${escapeHtml(order.orderNumber)} · Version ${order.currentVersion} · ${new Date().toLocaleDateString()}</header><div class="meta"><div><b>Patient:</b> ${escapeHtml(order.patientName)}</div><div><b>MRN:</b> ${escapeHtml(order.mrNumber)}</div><div><b>Age / Gender:</b> ${order.age || "—"} / ${escapeHtml(order.gender || "—")}</div><div><b>Referred by:</b> ${escapeHtml(order.consultantName)}</div><div><b>CNIC:</b> ${escapeHtml(order.cnic || "—")}</div></div><div class="title">${escapeHtml(tmpl.name.toUpperCase())}</div>${body}<footer class="foot"><span>${escapeHtml(order.orderNumber)} · Electronically generated</span><b>Sonologist</b></footer></body></html>`;
    const win = printWindow === undefined ? window.open("", "_blank", "width=900,height=700") : printWindow;
    if (win) { win.document.write(html); win.document.close(); win.focus(); win.print(); }
  };

  const submitReport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !template || !impression.trim() || !Object.values(sections).some((value) => value.trim())) { setError("Enter findings and a diagnostic impression before saving."); return; }
    const printWindow = window.open("", "_blank", "width=900,height=700");
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/ultrasound-reports/finalize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ultrasoundOrderId: selected.id, templateCode: template.code, sections, impression }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Report could not be saved.");
      await onSubmitUltrasoundResult(selected.id, JSON.stringify({ sections }), impression);
      printReport({ ...selected, currentVersion: data.versionNumber }, template, sections, impression, printWindow);
      setSelected(null);
    } catch (reason: any) { if (printWindow && !printWindow.closed) printWindow.close(); setError(reason.message || "Report could not be saved."); }
    finally { setSaving(false); }
  };

  const isTemplates = ["us_templates", "tests_list"].includes(activeTab);
  const isRevisions = activeTab === "us_revisions";
  const isQueue = ["us_queue", "orders", "overview"].includes(activeTab);
  const isFinance = activeTab === "us_finance";
  const totalUltrasoundExpenses = financeExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const dailyCashIn = dailyCashTransactions.filter((transaction) => transaction.transactionType === "INCOME")
    .reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
  const dailyCashOut = dailyCashTransactions.filter((transaction) => transaction.transactionType === "EXPENSE")
    .reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);

  const handleUltrasoundExpenseSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(expenseAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !expenseDescription.trim()) {
      setFinanceError("Enter a valid expense amount and description.");
      return;
    }

    setIsSavingExpense(true);
    setFinanceError("");
    try {
      const response = await fetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionNumber: `TXN-US-EXP-${Date.now()}`,
          transactionType: "EXPENSE",
          category: expenseCategory,
          department: "Ultrasound Department",
          amount,
          paymentMethod: expensePaymentMethod,
          description: expenseDescription.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save the ultrasound expense.");
      if (!data.transaction) throw new Error("The ultrasound expense was saved without a transaction record.");

      const saved = mapCashTransaction(data.transaction);
      setFinanceExpenses((current) => [saved, ...current]);
      setDailyCashTransactions((current) => [saved, ...current]);
      setExpenseAmount("");
      setExpenseDescription("");
      setIsExpenseModalOpen(false);
    } catch (reason: any) {
      setFinanceError(reason.message || "Could not save the ultrasound expense.");
    } finally {
      setIsSavingExpense(false);
    }
  };

  return <div className="space-y-6">
    {!isFinance && <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-rose-900 to-slate-900 p-6 text-white"><div><div className="flex items-center gap-2 text-xs font-bold uppercase text-rose-300"><Radio className="h-4 w-4"/>Diagnostic Ultrasound & Sonography</div><h2 className="mt-1 text-2xl font-black">Ultrasound Reporting Workspace</h2><p className="mt-1 text-xs text-slate-300">Direct patient registration, supplied report templates, saved reports and A4 printing.</p></div><button onClick={() => startNew()} className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-bold"><Plus className="h-4 w-4"/>New ultrasound patient</button></header>}
    {!isFinance && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><StatCard title="Total Scan Requests" value={ultrasoundOrders.length} subtitle="Database orders" icon={Radio} iconBg="bg-rose-500/10 text-rose-600"/><StatCard title="Pending Queue" value={pending.length} subtitle="Waiting for scan/report" icon={Clock} iconBg="bg-amber-500/10 text-amber-600"/><StatCard title="Submitted Reports" value={ultrasoundOrders.filter((u) => u.status === "SUBMITTED_TO_CONSULTANT").length} subtitle="Awaiting consultant review" icon={CheckCircle2} iconBg="bg-blue-500/10 text-blue-600"/><StatCard title="Templates" value={templates.length} subtitle="Ultrasound exams" icon={FileText} iconBg="bg-emerald-500/10 text-emerald-600"/></div>}
    <nav className="flex flex-wrap gap-2"><a href="?tab=us_queue" className={`rounded-lg px-3 py-2 text-xs font-bold ${isQueue ? "bg-rose-600 text-white" : "bg-slate-100"}`}>Orders</a><a href="?tab=us_templates" className={`rounded-lg px-3 py-2 text-xs font-bold ${isTemplates ? "bg-rose-600 text-white" : "bg-slate-100"}`}>Ultrasound templates</a><a href="?tab=us_revisions" className={`rounded-lg px-3 py-2 text-xs font-bold ${isRevisions ? "bg-rose-600 text-white" : "bg-slate-100"}`}>Revisions</a><a href="?tab=us_finance" className={`rounded-lg px-3 py-2 text-xs font-bold ${isFinance ? "bg-rose-600 text-white" : "bg-slate-100"}`}>Daily cash & expenses</a></nav>
    {isFinance && <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-white p-5 shadow-sm dark:border-rose-950 dark:from-rose-950/30 dark:to-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400"><DollarSign className="h-4 w-4"/>Ultrasound Department Finance</div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">Daily Cash & Expenses</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Department income and expenses are shown from the central cash ledger.</p>
        </div>
        <button type="button" onClick={() => { setFinanceError(""); setIsExpenseModalOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-rose-500"><Plus className="h-4 w-4"/>Add ultrasound expense</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Total Ultrasound Expense" value={`Rs. ${totalUltrasoundExpenses.toLocaleString()}`} subtitle="All recorded department expenses" icon={Receipt} iconBg="bg-rose-500/10 text-rose-600"/>
        <StatCard title="Daily Cash In" value={`Rs. ${dailyCashIn.toLocaleString()}`} subtitle="Ultrasound income recorded today" icon={TrendingUp} iconBg="bg-emerald-500/10 text-emerald-600"/>
        <StatCard title="Daily Cash Out" value={`Rs. ${dailyCashOut.toLocaleString()}`} subtitle="Ultrasound expenses recorded today" icon={TrendingDown} iconBg="bg-amber-500/10 text-amber-600"/>
      </div>

      {financeError && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{financeError}</p>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-6"><h3 className="font-black text-slate-900 dark:text-white">Today&apos;s Ultrasound Cash Activity</h3><p className="mt-1 text-[11px] text-slate-500">{toPKTDateString(new Date())} · Cash in and cash out from the central ledger.</p></div>
        {isLoadingFinance ? <div className="px-4 py-12 text-center text-sm text-slate-500">Loading ultrasound cash activity…</div> : dailyCashTransactions.length === 0 ? <div className="px-4 py-12 text-center text-sm text-slate-500">No ultrasound cash transactions recorded today.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead><tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300"><th className="px-4 py-3">Transaction</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Cash flow</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{dailyCashTransactions.map((transaction) => <tr key={transaction.id}><td className="px-4 py-3 font-mono">{transaction.transactionNumber}</td><td className="px-4 py-3">{transaction.category}</td><td className="px-4 py-3">{transaction.description}</td><td className="px-4 py-3">{transaction.paymentMethod}</td><td className={`px-4 py-3 font-bold ${transaction.transactionType === "EXPENSE" ? "text-rose-600" : "text-emerald-600"}`}>{transaction.transactionType === "EXPENSE" ? "Cash out" : "Cash in"}</td><td className={`px-4 py-3 text-right font-mono font-black ${transaction.transactionType === "EXPENSE" ? "text-rose-600" : "text-emerald-600"}`}>Rs. {Number(transaction.amount).toLocaleString()}</td></tr>)}</tbody></table></div>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-6"><h3 className="font-black text-slate-900 dark:text-white">Ultrasound Expense Ledger</h3><p className="mt-1 text-[11px] text-slate-500">Total expenses across the ultrasound department recorded in the central cash ledger.</p></div>
        {isLoadingFinance ? <div className="px-4 py-12 text-center text-sm text-slate-500">Loading ultrasound expenses…</div> : financeExpenses.length === 0 ? <div className="px-4 py-12 text-center text-sm text-slate-500">No ultrasound expenses have been recorded.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead><tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300"><th className="px-4 py-3">Date</th><th className="px-4 py-3">Transaction</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{financeExpenses.map((expense) => <tr key={expense.id}><td className="px-4 py-3">{expense.date}{expense.time && <span className="block text-[10px] text-slate-400">{expense.time}</span>}</td><td className="px-4 py-3 font-mono">{expense.transactionNumber}</td><td className="px-4 py-3 font-semibold">{expense.category}</td><td className="px-4 py-3">{expense.description}</td><td className="px-4 py-3">{expense.paymentMethod}</td><td className="px-4 py-3 text-right font-mono font-black text-rose-600">Rs. {Number(expense.amount).toLocaleString()}</td></tr>)}</tbody></table></div>}
      </section>
    </section>}
    {(isQueue || isRevisions) && <section className="space-y-4 rounded-2xl border bg-white p-5 dark:bg-slate-900"><div className="flex items-center justify-between"><h3 className="font-black">{isRevisions ? "Revision Requests" : "Ultrasound Orders"}</h3><div className="relative"><Search className="absolute left-3 top-2 h-4 w-4 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient, MRN, exam" className="rounded-lg border py-2 pl-9 pr-3 text-xs dark:bg-slate-800"/></div></div><div className="overflow-x-auto"><table className="w-full min-w-[750px] text-left text-xs"><thead><tr className="bg-slate-50 text-slate-500"><th className="p-3">Order / date</th><th className="p-3">Patient / MRN</th><th className="p-3">Exam</th><th className="p-3">Consultant</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y">{filtered.filter((o) => !isRevisions || o.status === "REVISION_REQUESTED").map((order) => <tr key={order.id}><td className="p-3 font-mono">{order.orderNumber}<span className="block text-slate-400">{order.requestDate}</span></td><td className="p-3 font-bold">{order.patientName}<span className="block text-amber-600">{order.mrNumber}</span></td><td className="p-3">{order.requestedExam}</td><td className="p-3">{order.consultantName}</td><td className="p-3"><Badge variant={order.status === "ACCEPTED" ? "success" : order.status === "REVISION_REQUESTED" ? "danger" : "warning"}>{order.status}</Badge></td><td className="p-3">{["ORDERED", "PROCESSING", "REVISION_REQUESTED"].includes(order.status) && <button onClick={() => {setSelected(order); if (order.status === "ORDERED") onUpdateUltrasoundOrderStatus?.(order.id, "PROCESSING");}} className="rounded-lg bg-rose-600 px-3 py-2 font-bold text-white">Enter findings</button>}{["SUBMITTED_TO_CONSULTANT", "ACCEPTED"].includes(order.status) && <button onClick={() => setSelected(order)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 font-bold text-white"><Printer className="h-3 w-3"/>Print/view</button>}</td></tr>)}</tbody></table></div></section>}
    {isTemplates && <section className="space-y-4 rounded-2xl border bg-white p-5 dark:bg-slate-900"><div className="flex items-center justify-between"><div><h3 className="font-black">Ultrasound Test Catalog ({templates.length})</h3><p className="text-xs text-slate-500">Report formats are mapped from the documents in ultrasound_templates.</p></div><button onClick={() => openTemplateEditor()} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Add template</button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{templates.map((item) => <article key={item.code} className="rounded-xl border p-4"><b className="text-rose-600">{item.code} · {item.category}</b><h4 className="my-1 font-black">{item.name}</h4><p className="text-xs text-slate-500">{item.description}</p><p className="my-2 text-[10px]">Source: {item.sourceFileName}</p><p className="text-[10px] text-slate-500">{item.sections.join(" · ")}</p><div className="mt-3 flex gap-2"><button onClick={() => startNew(item)} className="flex-1 rounded-lg bg-rose-600 py-2 text-xs font-bold text-white">New patient / exam</button><button onClick={() => openTemplateEditor(item)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold">Edit</button></div></article>)}</div></section>}
    {isExpenseModalOpen && <Modal isOpen onClose={() => !isSavingExpense && setIsExpenseModalOpen(false)} title="Add Ultrasound Expense" subtitle="Record this expense in the central cash ledger under Ultrasound Department." maxWidth="md">
      <form onSubmit={handleUltrasoundExpenseSubmit} className="space-y-4 text-xs">
        {financeError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{financeError}</p>}
        <label className="block font-bold">Expense category
          <select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal dark:bg-slate-800">
            <option>Ultrasound Supplies & Consumables</option>
            <option>Equipment Maintenance</option>
            <option>Utilities</option>
            <option>Other Ultrasound Expense</option>
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block font-bold">Amount (Rs.)
            <input required type="number" min="0.01" step="0.01" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal dark:bg-slate-800"/>
          </label>
          <label className="block font-bold">Payment method
            <select value={expensePaymentMethod} onChange={(event) => setExpensePaymentMethod(event.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal dark:bg-slate-800">
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
              <option value="CARD">Card</option>
              <option value="ONLINE">Online</option>
            </select>
          </label>
        </div>
        <label className="block font-bold">Description / voucher note
          <textarea required rows={3} value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal dark:bg-slate-800" placeholder="Describe the ultrasound department expense"/>
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" disabled={isSavingExpense} onClick={() => setIsExpenseModalOpen(false)} className="rounded-lg border px-4 py-2">Cancel</button>
          <button type="submit" disabled={isSavingExpense} className="rounded-lg bg-rose-600 px-4 py-2 font-bold text-white">{isSavingExpense ? "Saving…" : "Save expense"}</button>
        </div>
      </form>
    </Modal>}
    {showNew && <Modal isOpen onClose={() => setShowNew(false)} title="New Ultrasound Patient / Order" subtitle="Select a registered patient or add a walk-in directly, without reception." maxWidth="3xl"><div className="space-y-3 text-xs"><label className="block">Search patient<input value={patientQuery} onChange={(e) => {setPatientQuery(e.target.value); setPatient(null);}} placeholder="Name, MRN, CNIC, phone" className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800"/>{patientQuery && !patient && searchedPatients.map((item) => <button key={item.id} onClick={() => {setPatient(item); setPatientName(item.fullName); setCnic(item.cnic || ""); setAge(String(item.age || 35)); setGender(item.gender || "Male");}} className="block w-full border p-2 text-left">{item.fullName} · {item.mrNumber}</button>)}</label>{!patient && <div className="grid gap-2 sm:grid-cols-2"><label>Name<input value={patientName} onChange={(e) => setPatientName(e.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800"/></label><label>CNIC<input value={cnic} onChange={(e) => setCnic(e.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800"/></label><label>Age<input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800"/></label><label>Gender<select value={gender} onChange={(e) => setGender(e.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800"><option>Male</option><option>Female</option><option>Other</option></select></label></div>}<div className="grid gap-2 sm:grid-cols-2"><label>Exam<select value={templateCode} onChange={(e) => setTemplateCode(e.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800"><option value="">Select exam</option>{templates.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}</select></label><label>Fee (PKR)<input type="number" min="0" value={fee} onChange={(e) => setFee(e.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800"/></label></div><label className="block">Referred by<input value={consultant} onChange={(e) => setConsultant(e.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800"/></label><p className="rounded-lg bg-blue-50 p-2 text-blue-800">New patients receive a database-assigned sequential MRN. The order can be created without reception or an OPD visit.</p><div className="flex justify-end gap-2"><button onClick={() => setShowNew(false)} className="rounded-lg border px-4 py-2">Cancel</button><button disabled={saving} onClick={createOrder} className="rounded-lg bg-rose-600 px-4 py-2 font-bold text-white">{saving ? "Saving…" : "Save order & enter findings"}</button></div></div></Modal>}
    {selected && template && <Modal isOpen onClose={() => setSelected(null)} title={`Ultrasound report · ${template.name}`} subtitle={`${selected.patientName} · MRN ${selected.mrNumber} · ${selected.orderNumber}`} maxWidth="4xl"><form onSubmit={submitReport} className="max-h-[78vh] space-y-3 overflow-auto text-xs"><div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-4"><span><b>Patient</b><br/>{selected.patientName}</span><span><b>MRN</b><br/>{selected.mrNumber}</span><span><b>Age/gender</b><br/>{selected.age || "—"} / {selected.gender || "—"}</span><span><b>Referred by</b><br/>{selected.consultantName}</span></div>{error && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-rose-700">{error}</p>}{template.sections.map((title) => <label key={title} className="block font-bold">{title}<textarea rows={title === "IMPRESSION" ? 2 : 3} value={sections[title] || ""} onChange={(e) => setSections((current) => ({...current, [title]: e.target.value}))} className="mt-1 w-full rounded-lg border p-2 font-normal dark:bg-slate-800"/></label>)}<label className="block font-bold">Diagnostic impression *<textarea required rows={2} value={impression} onChange={(e) => setImpression(e.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800"/></label><div className="flex justify-end gap-2 border-t pt-3"><button type="button" onClick={() => setSelected(null)} className="rounded-lg border px-4 py-2">Close</button>{!["SUBMITTED_TO_CONSULTANT", "ACCEPTED"].includes(selected.status) && <button disabled={saving} className="rounded-lg bg-rose-600 px-4 py-2 font-bold text-white">{saving ? "Saving…" : "Save report & print"}</button>}{["SUBMITTED_TO_CONSULTANT", "ACCEPTED"].includes(selected.status) && <button type="button" onClick={() => printReport(selected, template, sections, impression)} className="rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white">Print report</button>}</div></form></Modal>}
    {templateEditorOpen && <Modal isOpen onClose={() => setTemplateEditorOpen(false)} title={editingTemplate ? "Edit ultrasound template" : "Add ultrasound template"} subtitle="Enter one report heading per line." maxWidth="2xl"><div className="space-y-3 text-xs"><label className="block">Code<input disabled={!!editingTemplate} value={templateCode} onChange={(e) => setTemplateCode(e.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" /></label><label className="block">Test name<input value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" /></label><div className="grid grid-cols-2 gap-2"><label>Category<input value={templateCategory} onChange={(e) => setTemplateCategory(e.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" /></label><label>Source document<input value={templateSource} onChange={(e) => setTemplateSource(e.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" /></label></div><label className="block">Description<input value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" /></label><label className="block">Report section headings<textarea rows={10} value={templateSectionsText} onChange={(e) => setTemplateSectionsText(e.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" /></label>{templateSaveError && <p role="alert" className="text-rose-700">{templateSaveError}</p>}<div className="flex justify-end gap-2"><button onClick={() => setTemplateEditorOpen(false)} className="rounded-lg border px-4 py-2">Cancel</button><button onClick={saveTemplate} className="rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white">Save template</button></div></div></Modal>}
  </div>;
};

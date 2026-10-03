import React, { useState, useEffect } from "react";
import {
  TestTube,
  FileSpreadsheet,
  History,
  AlertTriangle,
  CheckCircle2,
  Upload,
  Eye,
  FileText,
  UserCheck,
  Paperclip,
  FlaskConical,
  Clock,
  Printer,
  Search,
  ShieldAlert,
  ChevronRight,
  Info,
  Beaker,
  Microscope,
  Zap,
  RotateCcw,
  ArrowRight,
  PackageCheck,
} from "lucide-react";
import { StatCard } from "../ui/StatCard";
import { Badge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import { LabOrderRecord } from "../../lib/mockDataStore";
import { getTemplateByCode, DEFAULT_LAB_TEMPLATES, LabTemplateDef, LabTemplateParamDef } from "../../lib/labTemplateRegistry";
import { labTemplateEngine, ResultFlag } from "../../lib/labTemplateEngine";
import { labPdfReportGenerator } from "../../lib/pdfReportGenerator";

interface LabPortalProps {
  activeTab: string;
  labOrders: LabOrderRecord[];
  onSubmitLabResult: (
    labOrderId: string,
    resultsJson: string,
    pdfFileName?: string,
    isVersion2?: boolean,
    imageBase64?: string
  ) => void;
  onUpdateLabOrderStatus?: (
    labOrderId: string,
    status: LabOrderRecord["status"]
  ) => void;
}

export const LabPortal: React.FC<LabPortalProps> = ({
  activeTab,
  labOrders,
  onSubmitLabResult,
  onUpdateLabOrderStatus,
}) => {
  const [selectedOrderForResult, setSelectedOrderForResult] = useState<LabOrderRecord | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<LabTemplateDef | null>(null);
  const [viewingOrderModal, setViewingOrderModal] = useState<LabOrderRecord | null>(null);
  const [printPreviewHtml, setPrintPreviewHtml] = useState<string | null>(null);

  // Identity Confirmation Checkbox
  const [identityConfirmed, setIdentityConfirmed] = useState(false);

  // Dynamic Parameter Form State
  const [formResults, setFormResults] = useState<Record<string, string>>({});
  const [technicianNotes, setTechnicianNotes] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | undefined>(undefined);
  const [versionHistoryModalOrder, setVersionHistoryModalOrder] = useState<LabOrderRecord | null>(null);
  const [searchMrnQuery, setSearchMrnQuery] = useState("");

  // When an order is selected for result entry, resolve matching template
  useEffect(() => {
    if (selectedOrderForResult) {
      setIdentityConfirmed(false);
      const testCode = selectedOrderForResult.tests && selectedOrderForResult.tests[0] ? selectedOrderForResult.tests[0] : "CBC";
      const tmpl = getTemplateByCode(testCode) || DEFAULT_LAB_TEMPLATES[0]; // CBC default
      setActiveTemplate(tmpl);

      // Initialize default field values
      const initial: Record<string, string> = {};
      tmpl.parameters.forEach((p) => {
        if (p.defaultValue) initial[p.parameterId] = p.defaultValue;
      });
      setFormResults(initial);
      setTechnicianNotes(tmpl.defaultRemarks || "");
      setUploadedFileName(`${selectedOrderForResult.mrNumber}_${tmpl.code}_REPORT.pdf`);
    } else {
      setActiveTemplate(null);
    }
  }, [selectedOrderForResult]);

  const handleInputChange = (paramId: string, val: string) => {
    setFormResults((prev) => ({ ...prev, [paramId]: val }));
  };

  const handleSubmitResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForResult || !activeTemplate) return;

    if (!identityConfirmed) {
      alert("PATIENT SAFETY CHECK: Please confirm the patient's identity and MRN before submitting results.");
      return;
    }

    const isV2 = selectedOrderForResult.status === "REVISION_REQUESTED";

    // Call server-side finalization API
    try {
      const res = await fetch("/api/lab-reports/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labOrderId: selectedOrderForResult.id,
          resultsJson: JSON.stringify(formResults),
          remarks: technicianNotes,
          technicianName: "Lab Technologist",
          isVersion2: isV2,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Lab report finalized successfully! Saved locally as ${data.pdfFileName}`);
      } else {
        console.warn("API finalization fallback:", data.error);
      }
    } catch (err) {
      console.error("Finalization error:", err);
    }

    // Update frontend state
    onSubmitLabResult(
      selectedOrderForResult.id,
      JSON.stringify(formResults),
      uploadedFileName,
      isV2,
      uploadedImageBase64
    );

    setSelectedOrderForResult(null);
    setUploadedImageBase64(undefined);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGeneratePrintPreview = (order: LabOrderRecord) => {
    const testCode = order.tests && order.tests[0] ? order.tests[0] : "CBC";
    const tmpl = getTemplateByCode(testCode) || DEFAULT_LAB_TEMPLATES[0];

    let resultsObj: Record<string, string> = {};
    try {
      resultsObj = order.resultsV1 ? JSON.parse(order.resultsV1) : {};
    } catch {
      resultsObj = { notes: order.resultsV1 || "" };
    }

    const evaluated = labTemplateEngine.evaluateAllResults(tmpl, resultsObj);

    const html = labPdfReportGenerator.generateHtmlReport({
      reportId: `LABREP-${order.orderNumber}`,
      orderNumber: order.orderNumber,
      patientName: order.patientName,
      mrNumber: order.mrNumber,
      age: 35,
      gender: "Male",
      admissionId: "OPD",
      consultantName: order.consultantName,
      testCategory: tmpl.category,
      testName: tmpl.name,
      sampleDate: order.requestDate || new Date().toLocaleDateString(),
      reportDate: new Date().toLocaleDateString(),
      technicianName: "Lab Technologist",
      template: tmpl,
      evaluatedResults: evaluated,
      versionNumber: order.currentVersion || 1,
    });

    setPrintPreviewHtml(html);
  };

  // Filter orders by MRN or patient search query
  const filteredOrders = labOrders.filter((l) => {
    if (!searchMrnQuery.trim()) return true;
    const q = searchMrnQuery.toLowerCase();
    return (
      l.mrNumber.toLowerCase().includes(q) ||
      l.patientName.toLowerCase().includes(q) ||
      l.orderNumber.toLowerCase().includes(q)
    );
  });

  const revisionOrders = filteredOrders.filter((l) => l.status === "REVISION_REQUESTED");
  const pendingOrders = filteredOrders.filter(
    (l) => l.status === "ORDERED" || l.status === "SAMPLE_COLLECTED" || l.status === "PROCESSING"
  );
  const allRevisionOrders = filteredOrders.filter((l) => l.status === "REVISION_REQUESTED");

  const handleProgressStatus = async (orderId: string, newStatus: LabOrderRecord["status"]) => {
    if (onUpdateLabOrderStatus) {
      onUpdateLabOrderStatus(orderId, newStatus);
    }
  };

  const isQueueTab = activeTab === "lab_queue" || activeTab === "orders" || activeTab === "overview";
  const isResultEntryTab = activeTab === "result_entry";
  const isVersionHistoryTab = activeTab === "version_history";
  const isRevisionTab = activeTab === "revision_notices";

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 p-6 rounded-2xl border border-amber-800/40 shadow-xl text-white">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <TestTube className="w-4 h-4" />
            <span>Bilal Hospital Diagnostic Laboratory System</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            Reusable Template Lab Portal & Result Processing
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Integrated with Patient Permanent MRN, Local Patient Files, Interactive Verification & Deterministic PDF Generation.
          </p>
        </div>

        {/* Search by MRN */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by MRN or Patient Name..."
            value={searchMrnQuery}
            onChange={(e) => setSearchMrnQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Requisitions"
          value={labOrders.length}
          subtitle="All Placed Requisitions"
          icon={TestTube}
          iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          title="Pending Action"
          value={pendingOrders.length}
          subtitle="Awaiting Sample / Processing"
          icon={Clock}
          iconBg="bg-blue-500/10 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          title="Revision Requests"
          value={revisionOrders.length}
          subtitle="Requires Correction / Re-check"
          icon={AlertTriangle}
          iconBg="bg-rose-500/10 text-rose-600 dark:text-rose-400"
        />
        <StatCard
          title="Finalized Reports"
          value={labOrders.filter((l) => l.status === "ACCEPTED" || l.status === "SUBMITTED_TO_CONSULTANT").length}
          subtitle="Stored to Patient Local MRN File"
          icon={CheckCircle2}
          iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
      </div>

      {/* VIEW: QUEUE & PENDING ORDERS */}
      {isQueueTab && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-amber-500/30 dark:border-amber-900/40 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <span>Pending Lab Orders ({pendingOrders.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select an order to confirm patient MRN and enter results using Excel-derived template parameters.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs font-mono">
                {pendingOrders.length} Pending
              </span>
            </div>

            {pendingOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/60" />
                <div className="font-bold text-slate-600 dark:text-slate-300">All Pending Orders Processed</div>
                <p className="text-xs text-slate-400">New requisitions will automatically appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-amber-50/50 dark:bg-slate-800/80 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-800">
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Patient MRN & Name</th>
                      <th className="py-3 px-4">Consultant</th>
                      <th className="py-3 px-4">Requested Test</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {pendingOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-amber-50/20 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-amber-600">{order.orderNumber}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {order.patientName}
                          <span className="block text-[11px] font-mono text-amber-700 dark:text-amber-400">
                            {order.mrNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">{order.consultantName}</td>
                        <td className="py-3 px-4 text-slate-900 dark:text-white font-bold">{order.tests.join(", ")}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{order.requestDate || "Today"}</td>
                        <td className="py-3 px-4">
                          <Badge variant={order.status === "REVISION_REQUESTED" ? "danger" : "warning"}>{order.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedOrderForResult(order)}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm"
                          >
                            <FlaskConical className="w-3.5 h-3.5" /> Confirm MRN & Enter Results
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* All Orders Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                <span>All Requisitions & Finalized Reports Log</span>
              </h3>
              <span className="text-xs text-slate-500">{filteredOrders.length} Records</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-500 uppercase border-b">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Patient MRN & Name</th>
                    <th className="py-3 px-4">Consultant</th>
                    <th className="py-3 px-4">Test</th>
                    <th className="py-3 px-4">Local File</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-amber-600">{order.orderNumber}</td>
                      <td className="py-3 px-4 font-bold">
                        {order.patientName}
                        <span className="block text-[11px] font-mono text-amber-600">{order.mrNumber}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{order.consultantName}</td>
                      <td className="py-3 px-4 font-semibold">{order.tests.join(", ")}</td>
                      <td className="py-3 px-4 font-mono text-emerald-600 font-bold">{order.attachedPdfName || "-"}</td>
                      <td className="py-3 px-4">
                        <Badge variant={order.status === "ACCEPTED" ? "success" : "info"}>{order.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {order.status === "ACCEPTED" && (
                          <button
                            onClick={() => handleGeneratePrintPreview(order)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600/20 font-bold text-xs inline-flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" /> View PDF
                          </button>
                        )}
                        <button
                          onClick={() => setViewingOrderModal(order)}
                          className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-xs"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: DYNAMIC RESULT ENTRY FORM WITH SAFETY CHECK */}
      {(isResultEntryTab || selectedOrderForResult !== null) && selectedOrderForResult && activeTemplate && (
        <div className="space-y-6">
          {/* STEP 1: PATIENT IDENTITY SAFETY CONFIRMATION BANNER */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-500/60 rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-8 h-8 text-amber-600 flex-shrink-0" />
                <div>
                  <h3 className="text-base font-black text-amber-900 dark:text-amber-400 uppercase tracking-wide">
                    HEALTHCARE PATIENT IDENTITY SAFETY CONFIRMATION
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    Verify permanent MRN & patient demographics before entering or finalizing laboratory test values.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderForResult(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 font-bold text-xs"
              >
                Back to Orders
              </button>
            </div>

            {/* Demographic Verification Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">PATIENT NAME</span>
                <strong className="text-slate-900 dark:text-white text-sm">{selectedOrderForResult.patientName}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">PERMANENT MRN</span>
                <strong className="text-amber-600 font-mono text-sm">{selectedOrderForResult.mrNumber}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">CONSULTANT</span>
                <span className="font-semibold">{selectedOrderForResult.consultantName}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">LAB ORDER ID</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{selectedOrderForResult.orderNumber}</span>
              </div>
            </div>

            {/* Mandatory Safety Confirmation Checkbox */}
            <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-300 dark:border-amber-900/50 cursor-pointer">
              <input
                type="checkbox"
                checked={identityConfirmed}
                onChange={(e) => setIdentityConfirmed(e.target.checked)}
                className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
              />
              <span className="font-bold text-slate-900 dark:text-white text-xs">
                I confirm that I have verified the Patient MRN ({selectedOrderForResult.mrNumber}) and identity against the sample tube container.
              </span>
            </label>
          </div>

          {/* STEP 2: DYNAMIC REUSABLE LAB TEMPLATE FORM */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-bold text-xs">
                    {activeTemplate.category}
                  </span>
                  <span className="text-xs font-mono text-slate-400">Sample: {activeTemplate.sampleType}</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {activeTemplate.name}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-slate-400">Template Code: {activeTemplate.code}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitResults} className="space-y-6">
              {/* Render Sections & Parameters dynamically */}
              {activeTemplate.sections.map((secName) => {
                const secParams = activeTemplate.parameters.filter((p) => (p.section || activeTemplate.sections[0]) === secName);
                if (secParams.length === 0) return null;

                return (
                  <div key={secName} className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b pb-1">
                      {secName}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {secParams.map((param) => {
                        if (param.inputType === "HEADING") {
                          return (
                            <div key={param.parameterId} className="col-span-full font-bold text-amber-600 text-xs mt-2 border-t pt-2">
                              {param.name}
                            </div>
                          );
                        }

                        const currentVal = formResults[param.parameterId] || "";
                        const evaluatedFlag = labTemplateEngine.evaluateResultValue(param, currentVal);

                        return (
                          <div key={param.parameterId} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <label className="font-bold text-slate-800 dark:text-slate-200">
                                {param.name}
                                {param.isRequired && <span className="text-rose-500 ml-0.5">*</span>}
                              </label>
                              {currentVal && evaluatedFlag !== "NORMAL" && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white uppercase">
                                  {evaluatedFlag}
                                </span>
                              )}
                            </div>

                            <div className="flex gap-2 items-center">
                              {param.inputType === "SELECT" ? (
                                <select
                                  value={currentVal}
                                  onChange={(e) => handleInputChange(param.parameterId, e.target.value)}
                                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border text-xs font-medium focus:ring-2 focus:ring-amber-500"
                                >
                                  {(param.options || ["Nil", "Positive"]).map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={param.inputType === "NUMBER" ? "text" : "text"}
                                  value={currentVal}
                                  placeholder={param.defaultValue || "Enter result..."}
                                  onChange={(e) => handleInputChange(param.parameterId, e.target.value)}
                                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                                />
                              )}

                              {param.unit && <span className="text-xs text-slate-500 font-mono min-w-[40px]">{param.unit}</span>}
                            </div>

                            {param.referenceRange && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                Ref Range: {param.referenceRange}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Technician Remarks */}
              <div>
                <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                  Technician Clinical Remarks & Interpretation
                </label>
                <textarea
                  rows={2}
                  value={technicianNotes}
                  onChange={(e) => setTechnicianNotes(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

              {/* Submit / Finalize Button */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForResult(null)}
                  className="px-4 py-2 rounded-xl border font-bold text-xs text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!identityConfirmed}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg transition-all ${
                    identityConfirmed
                      ? "bg-amber-600 hover:bg-amber-500 cursor-pointer"
                      : "bg-slate-400 cursor-not-allowed opacity-60"
                  }`}
                >
                  Finalize & Store PDF to Patient Local MRN File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVISION NOTICES TAB */}
      {isRevisionTab && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-rose-500/30 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5" />
                  <span>Revision Requests from Consultants ({allRevisionOrders.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  These lab orders require correction. Review the consultant\'s reason and re-submit corrected results.
                </p>
              </div>
            </div>

            {allRevisionOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/60" />
                <div className="font-bold">No revision requests at this time.</div>
              </div>
            ) : (
              <div className="space-y-4">
                {allRevisionOrders.map((order) => (
                  <div key={order.id} className="border border-rose-200 dark:border-rose-900/40 rounded-2xl overflow-hidden">
                    {/* Order Header */}
                    <div className="flex items-center justify-between p-4 bg-rose-50 dark:bg-rose-950/30">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                          <RotateCcw className="w-4 h-4 text-rose-600" />
                        </div>
                        <div>
                          <div className="font-mono font-black text-rose-700 dark:text-rose-400">{order.orderNumber}</div>
                          <div className="text-[11px] text-slate-500">{order.requestDate}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900 dark:text-white">{order.patientName}</div>
                        <div className="font-mono text-[11px] text-amber-600">{order.mrNumber}</div>
                      </div>
                    </div>

                    {/* Revision Details */}
                    <div className="p-4 space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border">
                          <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Tests Requested</div>
                          <div className="font-bold text-slate-900 dark:text-white">{order.tests.join(", ")}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border">
                          <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Requesting Consultant</div>
                          <div className="font-bold">{order.consultantName}</div>
                        </div>
                      </div>

                      {order.revisionReason && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
                          <div className="text-[10px] font-bold uppercase text-rose-600 mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Revision Reason (from Consultant):
                          </div>
                          <div className="font-bold text-rose-800 dark:text-rose-300">{order.revisionReason}</div>
                        </div>
                      )}

                      {order.revisionComment && (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
                          <div className="text-[10px] font-bold uppercase text-amber-600 mb-1">Clinical Comment:</div>
                          <div className="text-slate-700 dark:text-slate-300 leading-relaxed">{order.revisionComment}</div>
                        </div>
                      )}

                      {/* Previous Results Preview */}
                      {(order.resultsV1 || order.resultsV2) && (
                        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border">
                          <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Previous Result (v{order.currentVersion}):</div>
                          <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 line-clamp-3">
                            {order.resultsV2 || order.resultsV1}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          onClick={() => setSelectedOrderForResult(order)}
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm"
                        >
                          <FlaskConical className="w-4 h-4" /> Re-Enter Corrected Results (v{(order.currentVersion || 1) + 1})
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRINT / REPORT PREVIEW MODAL */}
      {printPreviewHtml && (
        <Modal isOpen onClose={() => setPrintPreviewHtml(null)} title="Laboratory Report PDF Preview" maxWidth="2xl">
          <div className="space-y-4">
            <div
              className="p-4 max-h-[70vh] overflow-y-auto bg-slate-100 dark:bg-slate-950 rounded-xl"
              dangerouslySetInnerHTML={{ __html: printPreviewHtml }}
            />
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs inline-flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print PDF Report
              </button>
              <button
                onClick={() => setPrintPreviewHtml(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL FOR ORDER DETAILS */}
      {viewingOrderModal && (
        <Modal
          isOpen
          onClose={() => setViewingOrderModal(null)}
          title={`Lab Requisition Details - ${viewingOrderModal.orderNumber}`}
          subtitle={`Patient: ${viewingOrderModal.patientName}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-2 border">
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Permanent MRN:</span>
                <span className="font-mono font-bold text-amber-600">{viewingOrderModal.mrNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Consultant:</span>
                <span>{viewingOrderModal.consultantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Tests Requested:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewingOrderModal.tests.join(", ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Current Status:</span>
                <Badge variant="warning">{viewingOrderModal.status}</Badge>
              </div>
              {viewingOrderModal.revisionReason && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200">
                  <div className="font-bold text-rose-600 text-[11px]">Revision Reason:</div>
                  <div className="text-slate-700 dark:text-slate-300">{viewingOrderModal.revisionReason}</div>
                  {viewingOrderModal.revisionComment && <div className="text-slate-500 mt-1">{viewingOrderModal.revisionComment}</div>}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              {viewingOrderModal.status === "REVISION_REQUESTED" && (
                <button
                  onClick={() => { setViewingOrderModal(null); setSelectedOrderForResult(viewingOrderModal); }}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs"
                >
                  Re-Enter Results
                </button>
              )}
              <button onClick={() => setViewingOrderModal(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from "react";
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
  ChevronDown,
  Info,
  Beaker,
  Microscope,
  Zap,
  RotateCcw,
  ArrowRight,
  PackageCheck,
  Plus,
  Send,
  ListFilter,
  UserPlus,
  Layers,
  Sparkles,
  Filter,
} from "lucide-react";
import { StatCard } from "../ui/StatCard";
import { Badge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import { LabOrderRecord, PatientRecord } from "../../lib/mockDataStore";
import {
  getTemplateByCode,
  DEFAULT_LAB_TEMPLATES,
  LabTemplateDef,
  LabTemplateParamDef,
} from "../../lib/labTemplateRegistry";
import { labTemplateEngine } from "../../lib/labTemplateEngine";
import { labPdfReportGenerator } from "../../lib/pdfReportGenerator";

interface LabPortalProps {
  activeTab: string;
  labOrders: LabOrderRecord[];
  patients?: PatientRecord[];
  onAddLabOrder?: (order: LabOrderRecord, transaction?: any) => void;
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
  patients = [],
  onAddLabOrder,
  onSubmitLabResult,
  onUpdateLabOrderStatus,
}) => {
  // Result Entry Pop-up Modal State
  const [selectedOrderForResult, setSelectedOrderForResult] = useState<LabOrderRecord | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<LabTemplateDef | null>(null);
  const [viewingOrderModal, setViewingOrderModal] = useState<LabOrderRecord | null>(null);
  const [printPreviewHtml, setPrintPreviewHtml] = useState<string | null>(null);

  // Patient Identity Verification State
  const [identityConfirmed, setIdentityConfirmed] = useState(false);

  // Dynamic Parameter Form State
  const [formResults, setFormResults] = useState<Record<string, string>>({});
  const [technicianNotes, setTechnicianNotes] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | undefined>(undefined);
  const [searchMrnQuery, setSearchMrnQuery] = useState("");

  // Action Dropdown State for Result Finalization
  const [isActionDropdownOpen, setIsActionDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // "Create New" Test Requisition Modal State
  const [isCreateNewModalOpen, setIsCreateNewModalOpen] = useState(false);
  const [patientSearchInput, setPatientSearchInput] = useState("");
  const [selectedPatientForNew, setSelectedPatientForNew] = useState<PatientRecord | null>(null);
  const [customMrn, setCustomMrn] = useState("");
  const [customPatientName, setCustomPatientName] = useState("");
  const [customCnic, setCustomCnic] = useState("");
  const [customAge, setCustomAge] = useState<number>(35);
  const [customGender, setCustomGender] = useState("Male");
  const [customConsultant, setCustomConsultant] = useState("Dr. Self / Direct Lab Request");
  const [selectedTestCodesForNew, setSelectedTestCodesForNew] = useState<string[]>(["CBC"]);

  // Test Catalog ("Test's List") State
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [expandedTestCode, setExpandedTestCode] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsActionDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // When an order is selected for result entry, resolve matching template
  useEffect(() => {
    if (selectedOrderForResult) {
      setIdentityConfirmed(false);
      setIsActionDropdownOpen(false);
      const testCode =
        selectedOrderForResult.tests && selectedOrderForResult.tests[0]
          ? selectedOrderForResult.tests[0]
          : "CBC";
      const tmpl = getTemplateByCode(testCode) || DEFAULT_LAB_TEMPLATES[0];
      setActiveTemplate(tmpl);

      // Initialize default parameter values
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

  // Master Finalization Handler (supports "DOCTOR", "PRINT", "BOTH")
  const handleExecuteFinalization = async (actionType: "DOCTOR" | "PRINT" | "BOTH") => {
    if (!selectedOrderForResult || !activeTemplate) return;

    if (!identityConfirmed) {
      alert("PATIENT SAFETY CHECK: Please check the confirmation checkbox verifying Patient MRN & specimen tube identity.");
      return;
    }

    const isV2 = selectedOrderForResult.status === "REVISION_REQUESTED";

    // Target status depending on action selection
    let targetStatus: LabOrderRecord["status"] = "ACCEPTED";
    if (actionType === "DOCTOR" || actionType === "BOTH") {
      targetStatus = "SUBMITTED_TO_CONSULTANT";
    }

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
          targetStatus: targetStatus,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        console.log("Lab report finalized:", data);
      }
    } catch (err) {
      console.error("Finalization error:", err);
    }

    // Call frontend handler to update master state
    onSubmitLabResult(
      selectedOrderForResult.id,
      JSON.stringify(formResults),
      uploadedFileName,
      isV2,
      uploadedImageBase64
    );

    if (onUpdateLabOrderStatus) {
      onUpdateLabOrderStatus(selectedOrderForResult.id, targetStatus);
    }

    // Generate HTML print preview if requested
    if (actionType === "PRINT" || actionType === "BOTH") {
      handleGeneratePrintPreview({
        ...selectedOrderForResult,
        resultsV1: JSON.stringify(formResults),
        status: targetStatus,
      });
    }

    setIsActionDropdownOpen(false);
    setSelectedOrderForResult(null);
    setUploadedImageBase64(undefined);
  };

  // Generate Print Preview HTML
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
      cnic: order.cnic || "",
      age: order.age || 35,
      gender: order.gender || "Male",
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

  // Launch New Requisition & Prompt Result Entry
  const handleConfirmNewRequisition = () => {
    const patientName = selectedPatientForNew ? selectedPatientForNew.fullName : customPatientName.trim();
    const mrn = selectedPatientForNew ? selectedPatientForNew.mrNumber : customMrn.trim();
    const cnic = selectedPatientForNew ? selectedPatientForNew.cnic : customCnic.trim();

    if (!patientName || !mrn) {
      alert("Please select an existing patient or enter Patient MRN and Full Name.");
      return;
    }

    if (selectedTestCodesForNew.length === 0) {
      alert("Please select at least one laboratory test template.");
      return;
    }

    const newOrderNumber = `LAB-${Date.now().toString().slice(-6)}`;
    const newOrder: LabOrderRecord = {
      id: `lab-${Date.now()}`,
      orderNumber: newOrderNumber,
      patientId: selectedPatientForNew ? selectedPatientForNew.id : `pat-${Date.now()}`,
      patientName: patientName,
      mrNumber: mrn,
      cnic: cnic,
      age: customAge,
      gender: customGender,
      visitId: `vst-direct-${Date.now()}`,
      consultantId: "c-direct",
      consultantName: customConsultant || "Dr. Direct Lab Request",
      testCategory: getTemplateByCode(selectedTestCodesForNew[0])?.category || "General Pathology",
      tests: selectedTestCodesForNew,
      totalFee: selectedTestCodesForNew.length * 800,
      priority: "NORMAL",
      status: "ORDERED",
      requestDate: new Date().toISOString().split("T")[0],
      currentVersion: 1,
    };

    if (onAddLabOrder) {
      onAddLabOrder(newOrder);
    }

    // Close creation modal and open result entry pop-up on front!
    setIsCreateNewModalOpen(false);
    setSelectedOrderForResult(newOrder);
  };

  // Launch Result Entry directly from Test Catalog by opening Requisition Modal with patient input
  const handleLaunchResultForTemplate = (tmpl: LabTemplateDef) => {
    setSelectedPatientForNew(null);
    setCustomMrn("");
    setCustomPatientName("");
    setCustomCnic("");
    setSelectedTestCodesForNew([tmpl.code]);
    setIsCreateNewModalOpen(true);
  };

  // Filter orders by MRN or patient search query
  const filteredOrders = labOrders.filter((l) => {
    if (!searchMrnQuery.trim()) return true;
    const q = searchMrnQuery.toLowerCase();
    return (
      l.mrNumber.toLowerCase().includes(q) ||
      l.patientName.toLowerCase().includes(q) ||
      (l.cnic && l.cnic.toLowerCase().includes(q)) ||
      l.orderNumber.toLowerCase().includes(q)
    );
  });

  const revisionOrders = filteredOrders.filter((l) => l.status === "REVISION_REQUESTED");
  const pendingOrders = filteredOrders.filter(
    (l) => l.status === "ORDERED" || l.status === "SAMPLE_COLLECTED" || l.status === "PROCESSING"
  );
  const allRevisionOrders = filteredOrders.filter((l) => l.status === "REVISION_REQUESTED");

  // Tab views
  const isQueueTab = activeTab === "lab_queue" || activeTab === "orders" || activeTab === "overview";
  const isResultEntryTab = activeTab === "result_entry";
  const isTestsListTab = activeTab === "tests_list";
  const isVersionHistoryTab = activeTab === "version_history";
  const isRevisionTab = activeTab === "revision_notices";

  // Catalog filtered list
  const filteredTemplates = DEFAULT_LAB_TEMPLATES.filter((t) => {
    const matchesCategory =
      selectedCategoryFilter === "ALL" ||
      t.category.toUpperCase() === selectedCategoryFilter.toUpperCase();
    if (!catalogSearchQuery.trim()) return matchesCategory;

    const q = catalogSearchQuery.toLowerCase();
    const matchesQuery =
      t.code.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      (t.fullForm && t.fullForm.toLowerCase().includes(q)) ||
      (t.templateFileName && t.templateFileName.toLowerCase().includes(q)) ||
      t.parameters.some((p) => p.name.toLowerCase().includes(q));

    return matchesCategory && matchesQuery;
  });

  // Filter patients for new requisition modal search
  const searchedPatients = patients.filter((p) => {
    if (!patientSearchInput.trim()) return false;
    const q = patientSearchInput.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.mrNumber.toLowerCase().includes(q) ||
      (p.cnic && p.cnic.includes(q)) ||
      p.phone.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* TOP HEADER BANNER WITH "+ CREATE NEW" BUTTON */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-950 via-amber-950 to-slate-900 p-6 rounded-2xl border border-amber-800/40 shadow-xl text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <TestTube className="w-4 h-4" />
            <span>Bilal Hospital Diagnostic Laboratory System</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            Reusable Template Pathology Portal
          </h2>
          <p className="text-xs text-slate-300">
            Permanent Patient MRN Files • Excel Template Sync • Interactive PDF Report Generation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* "+ Create New" Button */}
          <button
            onClick={() => {
              setSelectedPatientForNew(null);
              setCustomMrn("");
              setCustomPatientName("");
              setCustomCnic("");
              setPatientSearchInput("");
              setIsCreateNewModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-2 shadow-lg hover:shadow-amber-500/20 transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create New Test Requisition</span>
          </button>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search MRN, CNIC, or Patient..."
              value={searchMrnQuery}
              onChange={(e) => setSearchMrnQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* METRIC CARDS */}
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
          title="Registered Templates"
          value={DEFAULT_LAB_TEMPLATES.length}
          subtitle="Matching lab_templates Folder"
          icon={FileSpreadsheet}
          iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
      </div>

      {/* VIEW 1: QUEUE & PENDING ORDERS */}
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
                  Select an order to confirm patient MRN and open pop-up result template entry.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCreateNewModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 font-bold text-xs inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> New Patient Test
                </button>
                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs font-mono">
                  {pendingOrders.length} Pending
                </span>
              </div>
            </div>

            {pendingOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/60" />
                <div className="font-bold text-slate-600 dark:text-slate-300">All Pending Orders Processed</div>
                <p className="text-xs text-slate-400">Click "+ Create New Test Requisition" to add patient lab test.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-amber-50/50 dark:bg-slate-800/80 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-800">
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Patient MRN & Name</th>
                      <th className="py-3 px-4">CNIC Number</th>
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
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 font-medium">
                          {order.cnic || "N/A"}
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
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm cursor-pointer"
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

          {/* ALL REQUISITIONS LOG TABLE */}
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
                    <th className="py-3 px-4">CNIC</th>
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
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{order.cnic || "N/A"}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{order.consultantName}</td>
                      <td className="py-3 px-4 font-semibold">{order.tests.join(", ")}</td>
                      <td className="py-3 px-4 font-mono text-emerald-600 font-bold">{order.attachedPdfName || "-"}</td>
                      <td className="py-3 px-4">
                        <Badge variant={order.status === "ACCEPTED" || order.status === "SUBMITTED_TO_CONSULTANT" ? "success" : "warning"}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {(order.status === "ACCEPTED" || order.status === "SUBMITTED_TO_CONSULTANT" || order.resultsV1) && (
                          <button
                            onClick={() => handleGeneratePrintPreview(order)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600/20 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
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

      {/* VIEW 2: TEST'S LIST TAB (LABORATORY TEST CATALOG & TEMPLATE REGISTRY) */}
      {isTestsListTab && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ListFilter className="w-5 h-5 text-amber-500" />
                  <span>Diagnostic Test Catalog & Lab Templates ({DEFAULT_LAB_TEMPLATES.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Registered pathology test templates with full forms, exact Excel filenames from <code className="font-mono text-amber-600">lab_templates</code> folder, and parameters.
                </p>
              </div>

              {/* Search in Catalog */}
              <div className="relative min-w-[280px]">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, full form, code or file..."
                  value={catalogSearchQuery}
                  onChange={(e) => setCatalogSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Department Filter Tabs */}
            <div className="flex flex-wrap gap-2 pt-1">
              {["ALL", "Hematology", "Biochemistry", "Serology", "Clinical Pathology", "Microbiology"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedCategoryFilter === cat
                      ? "bg-amber-500 text-slate-950 shadow-md"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Responsive Line-by-Line / Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {filteredTemplates.map((tmpl) => {
                const isExpanded = expandedTestCode === tmpl.code;

                return (
                  <div
                    key={tmpl.code}
                    className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 space-y-4 hover:border-amber-500/50 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono font-black text-xs">
                          {tmpl.code}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase">
                          {tmpl.category}
                        </span>
                      </div>

                      {/* Title & Full Form */}
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                          {tmpl.name}
                        </h4>
                        {tmpl.fullForm && (
                          <div className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-1 leading-snug">
                            <strong>Full Form:</strong> {tmpl.fullForm}
                          </div>
                        )}
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          {tmpl.description}
                        </p>
                      </div>

                      {/* Associated File Name Badge */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono space-y-1">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Excel Template File:</div>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                          <span>{tmpl.templateFileName || `${tmpl.name}.xls`}</span>
                        </div>
                      </div>

                      {/* Sample Type */}
                      <div className="text-[11px] text-slate-600 dark:text-slate-300">
                        <span className="font-bold text-slate-400">Sample Required:</span>{" "}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{tmpl.sampleType}</span>
                      </div>

                      {/* Parameter Breakdown */}
                      <div>
                        <button
                          onClick={() => setExpandedTestCode(isExpanded ? null : tmpl.code)}
                          className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <span>{isExpanded ? "Hide Test Parameters" : `View Parameters (${tmpl.parameters.length})`}</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>

                        {isExpanded && (
                          <div className="mt-2 p-3 bg-white dark:bg-slate-900 rounded-xl border text-[11px] space-y-1.5 max-h-48 overflow-y-auto">
                            {tmpl.parameters.map((p) => (
                              <div key={p.parameterId} className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                                <span className="font-medium text-slate-700 dark:text-slate-300">{p.name}</span>
                                <span className="font-mono text-[10px] text-slate-400">{p.unit || p.referenceRange || "-"}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      <button
                        onClick={() => handleLaunchResultForTemplate(tmpl)}
                        className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <FlaskConical className="w-3.5 h-3.5" />
                        <span>Enter Result for {tmpl.code}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: REVISION NOTICES TAB */}
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
                  These lab orders require correction. Click to open result entry pop-up.
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

                    <div className="p-4 space-y-3 text-xs">
                      {order.revisionReason && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200">
                          <div className="text-[10px] font-bold uppercase text-rose-600 mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Revision Reason:
                          </div>
                          <div className="font-bold text-rose-800 dark:text-rose-300">{order.revisionReason}</div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          onClick={() => setSelectedOrderForResult(order)}
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-sm"
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

      {/* MODAL 1: CREATE NEW TEST REQUISITION MODAL */}
      {isCreateNewModalOpen && (
        <Modal
          isOpen
          onClose={() => setIsCreateNewModalOpen(false)}
          title="Create New Laboratory Test Requisition"
          subtitle="Select existing patient or enter MRN, Name, CNIC, Age & Gender, then proceed directly to result entry."
          maxWidth="2xl"
        >
          <div className="space-y-6 text-xs">
            {/* 1. Patient Selection */}
            <div className="space-y-3">
              <label className="font-black uppercase tracking-wider text-slate-500 text-[11px] block">
                1. Select Patient (Existing Search or Manual Input)
              </label>

              {/* Patient Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type to search existing patient by MRN, CNIC, Name, or Phone..."
                  value={patientSearchInput}
                  onChange={(e) => {
                    setPatientSearchInput(e.target.value);
                    setSelectedPatientForNew(null);
                  }}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border font-medium focus:ring-2 focus:ring-amber-500"
                />

                {/* Dropdown search results */}
                {patientSearchInput && searchedPatients.length > 0 && !selectedPatientForNew && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                    {searchedPatients.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPatientForNew(p);
                          setCustomPatientName(p.fullName);
                          setCustomMrn(p.mrNumber);
                          setCustomCnic(p.cnic || "");
                          setCustomAge(p.age || 35);
                          setCustomGender(p.gender || "Male");
                        }}
                        className="p-3 hover:bg-amber-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <strong className="text-slate-900 dark:text-white block">{p.fullName}</strong>
                          <span className="text-[10px] text-slate-500">{p.phone} | CNIC: {p.cnic || "N/A"} | Age: {p.age}</span>
                        </div>
                        <span className="font-mono text-amber-600 font-bold text-xs">{p.mrNumber}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Patient Banner OR Manual Entry Fields */}
              {selectedPatientForNew ? (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-600 block">SELECTED PATIENT</span>
                    <strong className="text-slate-900 dark:text-white text-sm">{selectedPatientForNew.fullName}</strong>
                    <div className="text-[11px] font-mono text-amber-700 dark:text-amber-400">
                      MRN: {selectedPatientForNew.mrNumber} | CNIC: {selectedPatientForNew.cnic || "N/A"}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPatientForNew(null)}
                    className="px-2.5 py-1 rounded-lg border bg-white dark:bg-slate-800 text-xs font-bold"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border">
                  <div>
                    <label className="font-bold block mb-1">Patient MRN *</label>
                    <input
                      type="text"
                      placeholder="e.g. MRN-2026-904"
                      value={customMrn}
                      onChange={(e) => setCustomMrn(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border font-mono font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Patient Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Muhammad Ali"
                      value={customPatientName}
                      onChange={(e) => setCustomPatientName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">CNIC Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 37405-1234567-1"
                      value={customCnic}
                      onChange={(e) => setCustomCnic(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border font-mono font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Age & Gender</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={customAge}
                        onChange={(e) => setCustomAge(parseInt(e.target.value) || 30)}
                        className="w-20 px-2 py-1.5 rounded-lg border bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white"
                      />
                      <select
                        value={customGender}
                        onChange={(e) => setCustomGender(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-bold block mb-1">Consultant Doctor</label>
                    <input
                      type="text"
                      value={customConsultant}
                      onChange={(e) => setCustomConsultant(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900 font-medium text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Select Test Template */}
            <div className="space-y-3">
              <label className="font-black uppercase tracking-wider text-slate-500 text-[11px] block">
                2. Select Laboratory Test Template(s)
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
                {DEFAULT_LAB_TEMPLATES.map((tmpl) => {
                  const isChecked = selectedTestCodesForNew.includes(tmpl.code);
                  return (
                    <label
                      key={tmpl.code}
                      className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                        isChecked
                          ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-1 ring-amber-500"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-amber-600 text-xs">{tmpl.code}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTestCodesForNew([...selectedTestCodesForNew, tmpl.code]);
                            } else {
                              setSelectedTestCodesForNew(selectedTestCodesForNew.filter((c) => c !== tmpl.code));
                            }
                          }}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                        />
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white text-[11px] mt-1 line-clamp-1">
                        {tmpl.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setIsCreateNewModalOpen(false)}
                className="px-4 py-2 rounded-xl border font-bold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmNewRequisition}
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold inline-flex items-center gap-2 shadow-md cursor-pointer"
              >
                <FlaskConical className="w-4 h-4" />
                <span>Confirm MRN & Enter Results</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: TEMPLATE RESULT ENTRY POP-UP MODAL (STYLED EXACTLY LIKE VIEW PDF REPORT) */}
      {selectedOrderForResult && activeTemplate && (
        <Modal
          isOpen
          onClose={() => setSelectedOrderForResult(null)}
          title={`Laboratory Report Result Entry — ${activeTemplate.name}`}
          subtitle={`Patient: ${selectedOrderForResult.patientName} | MRN: ${selectedOrderForResult.mrNumber}`}
          maxWidth="4xl"
        >
          <div className="space-y-6 text-xs max-h-[80vh] overflow-y-auto pr-1">
            {/* OFFICIAL HOSPITAL HEADER BANNER WITHIN MODAL */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 p-5 rounded-2xl border border-amber-500/30 text-white flex justify-between items-center">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Bilal Hospital Diagnostic Laboratory
                </div>
                <h3 className="text-xl font-black text-white">{activeTemplate.name.toUpperCase()}</h3>
                {activeTemplate.fullForm && (
                  <p className="text-xs text-amber-200 mt-0.5">{activeTemplate.fullForm}</p>
                )}
              </div>
              <div className="text-right">
                <span className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs">
                  {activeTemplate.code} TEMPLATE
                </span>
                <div className="text-[10px] font-mono text-slate-400 mt-1">
                  Specimen: {activeTemplate.sampleType}
                </div>
              </div>
            </div>

            {/* PATIENT DEMOGRAPHICS & MRN CONFIRMATION BOX */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">PATIENT NAME</span>
                  <strong className="text-slate-900 dark:text-white text-sm">{selectedOrderForResult.patientName}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">PERMANENT MRN</span>
                  <strong className="text-amber-600 font-mono text-sm">{selectedOrderForResult.mrNumber}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">CNIC NUMBER</span>
                  <strong className="text-slate-900 dark:text-white font-mono text-sm">{selectedOrderForResult.cnic || "N/A"}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">CONSULTANT</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedOrderForResult.consultantName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">ORDER REQUISITION #</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedOrderForResult.orderNumber}</span>
                </div>
              </div>

              {/* MANDATORY SAFETY CHECKBOX */}
              <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-amber-300 dark:border-amber-700/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={identityConfirmed}
                  onChange={(e) => setIdentityConfirmed(e.target.checked)}
                  className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
                />
                <span className="font-bold text-slate-900 dark:text-white text-xs">
                  I confirm that I have verified Patient MRN ({selectedOrderForResult.mrNumber}) and identity against the specimen tube container.
                </span>
              </label>
            </div>

            {/* REPORT RESULT ENTRY TABLE (FORMATTED SAME LIKE PDF REPORT RESULT) */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Test Parameter</th>
                    <th className="py-3 px-4">Observed Result (Value)</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">Biological Reference Range</th>
                    <th className="py-3 px-4 text-center">Status Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeTemplate.parameters.map((param) => {
                    if (param.inputType === "HEADING") {
                      return (
                        <tr key={param.parameterId} className="bg-amber-50/70 dark:bg-slate-800/80 font-bold text-amber-700 dark:text-amber-400">
                          <td colSpan={5} className="py-2.5 px-4 uppercase tracking-wider text-[11px]">
                            {param.name}
                          </td>
                        </tr>
                      );
                    }

                    const currentVal = formResults[param.parameterId] || "";
                    const flag = labTemplateEngine.evaluateResultValue(param, currentVal);

                    return (
                      <tr key={param.parameterId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        {/* Parameter Name */}
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {param.name}
                          {param.isRequired && <span className="text-rose-500 ml-1">*</span>}
                        </td>

                        {/* Input Field */}
                        <td className="py-2 px-4">
                          {param.inputType === "SELECT" ? (
                            <select
                              value={currentVal}
                              onChange={(e) => handleInputChange(param.parameterId, e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border font-bold text-xs focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                            >
                              {(param.options || ["Nil", "Positive"]).map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={currentVal}
                              placeholder={param.defaultValue || "Enter result..."}
                              onChange={(e) => handleInputChange(param.parameterId, e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border font-mono font-bold text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                            />
                          )}
                        </td>

                        {/* Unit */}
                        <td className="py-3 px-4 font-mono text-slate-500">{param.unit || "-"}</td>

                        {/* Reference Range */}
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {param.referenceRange || "Normal"}
                        </td>

                        {/* Status Flag */}
                        <td className="py-3 px-4 text-center">
                          {currentVal && (
                            <span
                              className={`px-2.5 py-1 rounded font-bold text-[10px] uppercase ${
                                flag === "NORMAL"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                                  : "bg-rose-500 text-white font-black"
                              }`}
                            >
                              {flag}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* TECHNICIAN CLINICAL REMARKS */}
            <div className="space-y-1">
              <label className="font-bold text-xs text-slate-700 dark:text-slate-300">
                Technician Remarks & Interpretation:
              </label>
              <textarea
                rows={2}
                value={technicianNotes}
                onChange={(e) => setTechnicianNotes(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-medium text-slate-900 dark:text-white"
              />
            </div>

            {/* BOTTOM ACTION BUTTON WITH DROPDOWN MENU IN ONE BUTTON */}
            <div className="flex justify-between items-center pt-4 border-t">
              <button
                type="button"
                onClick={() => setSelectedOrderForResult(null)}
                className="px-4 py-2.5 rounded-xl border font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel / Save Draft
              </button>

              {/* UNIFIED ACTION DROPDOWN BUTTON */}
              <div className="relative" ref={dropdownRef}>
                <div className="inline-flex rounded-xl shadow-lg">
                  {/* Primary Action Button */}
                  <button
                    type="button"
                    disabled={!identityConfirmed}
                    onClick={() => handleExecuteFinalization("BOTH")}
                    className={`px-5 py-2.5 rounded-l-xl font-black text-xs text-white inline-flex items-center gap-2 transition-all ${
                      identityConfirmed
                        ? "bg-amber-600 hover:bg-amber-500 cursor-pointer"
                        : "bg-slate-400 cursor-not-allowed opacity-60"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Finalize Report</span>
                  </button>

                  {/* Dropdown Toggle Button */}
                  <button
                    type="button"
                    disabled={!identityConfirmed}
                    onClick={() => setIsActionDropdownOpen(!isActionDropdownOpen)}
                    className={`px-3 py-2.5 rounded-r-xl border-l border-amber-700 font-bold text-xs text-white inline-flex items-center transition-all ${
                      identityConfirmed
                        ? "bg-amber-700 hover:bg-amber-600 cursor-pointer"
                        : "bg-slate-400 cursor-not-allowed opacity-60"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Dropdown Menu Items */}
                {isActionDropdownOpen && identityConfirmed && (
                  <div className="absolute right-0 bottom-full mb-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-100 dark:divide-slate-700 text-xs font-semibold">
                    <button
                      onClick={() => handleExecuteFinalization("DOCTOR")}
                      className="w-full px-4 py-3 text-left hover:bg-amber-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white flex items-center gap-2.5"
                    >
                      <Send className="w-4 h-4 text-amber-600" />
                      <div>
                        <div>Finalize & Send to Doctor</div>
                        <div className="text-[10px] text-slate-400 font-normal">Submits report directly to Consultant Inbox</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleExecuteFinalization("PRINT")}
                      className="w-full px-4 py-3 text-left hover:bg-amber-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white flex items-center gap-2.5"
                    >
                      <Printer className="w-4 h-4 text-blue-600" />
                      <div>
                        <div>Finalize & Print PDF Report</div>
                        <div className="text-[10px] text-slate-400 font-normal">Opens print preview window immediately</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleExecuteFinalization("BOTH")}
                      className="w-full px-4 py-3 text-left bg-amber-50/60 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-slate-700 text-amber-900 dark:text-amber-300 flex items-center gap-2.5 font-bold"
                    >
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <div>
                        <div>Finalize: Both (Send + Print)</div>
                        <div className="text-[10px] text-amber-700 dark:text-amber-400 font-normal">Send to Doctor AND open print preview</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* PRINT / REPORT PREVIEW MODAL */}
      {printPreviewHtml && (
        <Modal isOpen onClose={() => setPrintPreviewHtml(null)} title="Laboratory Report PDF Preview" maxWidth="4xl">
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
                <span className="font-bold text-slate-500">CNIC Number:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{viewingOrderModal.cnic || "N/A"}</span>
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
            </div>
            <div className="flex justify-end gap-2">
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

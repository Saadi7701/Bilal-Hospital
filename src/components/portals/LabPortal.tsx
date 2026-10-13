import React, { useState, useEffect, useRef } from "react";
import JSZip from "jszip";
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
  Download,
  Calendar,
  Archive,
  Trash2,
  Pencil,
  ArrowUp,
  ArrowDown,
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
  getCustomTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
  getTemplateOverrides,
  saveTemplateOverride,
  deleteTemplateOverride,
  isTemplateOverridden,
  resetTemplateToDefault,
  isBuiltInTemplate,
  getEffectiveDefaultTemplates,
  getAllTemplates,
  saveTemplate,
} from "../../lib/labTemplateRegistry";
import { labTemplateEngine } from "../../lib/labTemplateEngine";
import { labPdfReportGenerator } from "../../lib/pdfReportGenerator";
import { toPKTDateString } from "../../lib/dateUtils";
import { createPatientApi } from "../../lib/apiClient";

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

  // Auto-fetched next sequential MRN (read-only preview — actual MRN assigned on backend)
  const [nextMrn, setNextMrn] = useState<string>("Loading...");
  const [isFetchingMrn, setIsFetchingMrn] = useState(false);

  // Test Catalog ("Test's List") State
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [expandedTestCode, setExpandedTestCode] = useState<string | null>(null);

  // Custom Templates & Template Overrides State (localStorage-backed)
  const [customTemplates, setCustomTemplates] = useState<LabTemplateDef[]>(() => getCustomTemplates());
  const [templateOverrides, setTemplateOverrides] = useState<Record<string, LabTemplateDef>>(() => getTemplateOverrides());

  // ── Template Editor Modal State (Used for Add New & Edit Any Template) ───────
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplateCode, setEditingTemplateCode] = useState<string | null>(null);
  const [isEditingBuiltIn, setIsEditingBuiltIn] = useState(false);
  const [tmplCode, setTmplCode] = useState("");
  const [tmplName, setTmplName] = useState("");
  const [tmplCategory, setTmplCategory] = useState("Biochemistry");
  const [tmplSampleType, setTmplSampleType] = useState("");
  const [tmplDescription, setTmplDescription] = useState("");
  const [tmplDefaultSection, setTmplDefaultSection] = useState("Chemical Parameters");
  const [tmplParams, setTmplParams] = useState<Array<{
    parameterId: string;
    name: string;
    section: string;
    unit: string;
    referenceRange: string;
    inputType: "NUMBER" | "TEXT" | "SELECT" | "HEADING";
    options: string;
  }>>([
    { parameterId: "param_1", name: "", section: "Chemical Parameters", unit: "", referenceRange: "", inputType: "NUMBER", options: "" }
  ]);
  const [tmplError, setTmplError] = useState("");

  // New Requisition Modal Search & Filter State
  const [newReqTemplateSearch, setNewReqTemplateSearch] = useState("");
  const [newReqCategoryFilter, setNewReqCategoryFilter] = useState("ALL");

  // Daily Log Date & Archiving State
  const [selectedLogDate, setSelectedLogDate] = useState<string>("ALL");
  const [showArchivedTab, setShowArchivedTab] = useState(false);
  const [archivedOrderIds, setArchivedOrderIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("lab_archived_order_ids");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Full historical lab orders (all periods) for archive tab
  const [allLabOrders, setAllLabOrders] = useState<LabOrderRecord[]>([]);

  // Fetch all orders when archive tab is opened
  useEffect(() => {
    if (!showArchivedTab) return;
    fetch("/api/lab-orders?period=all")
      .then((r) => r.json())
      .then((data) => {
        if (data.labOrders && Array.isArray(data.labOrders)) {
          setAllLabOrders(
            data.labOrders.map((l: any) => ({
              id: l._id || l.id,
              orderNumber: l.orderNumber || `LAB-${l._id}`,
              patientId: l.patientId,
              patientName: l.patientName || "",
              mrNumber: l.mrNumber || "",
              cnic: l.cnic || (l.patient ? l.patient.cnic : ""),
              age: l.age || (l.patient ? l.patient.age : 35),
              gender: l.gender || (l.patient ? l.patient.gender : "Male"),
              visitId: l.visitId || "",
              consultantId: l.consultantId || "",
              consultantName: l.consultantName || "Doctor",
              testCategory: l.testCategory || l.category || "General Pathology",
              tests: l.items && l.items.length > 0 ? l.items.map((item: any) => item.testName) : [l.testName || "Lab Test"],
              totalFee: l.totalFee || l.fee || 0,
              priority: l.priority || "NORMAL",
              status: l.status || "ORDERED",
              requestDate: toPKTDateString(l.requestDate),
              currentVersion: l.currentVersion || 1,
              resultsV1: l.resultsV1,
              resultsV2: l.resultsV2,
              revisionReason: l.revisionReason,
              revisionComment: l.revisionComment,
              attachedPdfName: l.attachedPdfName,
              attachedPdfUrl: l.attachedPdfUrl,
              attachedImageBase64: l.attachedImageBase64,
            }))
          );
        }
      })
      .catch(() => {});
  }, [showArchivedTab]);

  // Fetch next MRN preview whenever the new requisition modal opens
  useEffect(() => {
    if (!isCreateNewModalOpen) return;
    setIsFetchingMrn(true);
    fetch("/api/patients/next-mrn")
      .then((r) => r.json())
      .then((data) => {
        if (data.nextMrn) setNextMrn(data.nextMrn);
      })
      .catch(() => setNextMrn("Auto-assigned"))
      .finally(() => setIsFetchingMrn(false));
  }, [isCreateNewModalOpen]);

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
  const handleConfirmNewRequisition = async () => {
    const patientName = selectedPatientForNew ? selectedPatientForNew.fullName : customPatientName.trim();

    if (!patientName) {
      alert("Please select an existing patient or enter Patient Full Name.");
      return;
    }

    if (selectedTestCodesForNew.length === 0) {
      alert("Please select at least one laboratory test template.");
      return;
    }

    let finalPatientId: string;
    let finalMrn: string;
    let finalCnic: string;

    if (selectedPatientForNew) {
      // Existing registered patient — use their DB ID and MRN directly
      finalPatientId = selectedPatientForNew.id;
      finalMrn = selectedPatientForNew.mrNumber;
      finalCnic = selectedPatientForNew.cnic || "";
    } else {
      // Manual entry — register via centralized patient API first to get a real sequential MRN
      const registeredPatient = await createPatientApi({
        id: "",
        mrNumber: "",
        fullName: customPatientName.trim(),
        fatherHusbandName: "",
        age: customAge,
        gender: customGender,
        phone: "0300-0000000",  // Placeholder; receptionist can update later
        cnic: customCnic.trim() || "",
        bloodGroup: "UNKNOWN",
        registrationDate: new Date().toISOString().split("T")[0],
      });

      if (!registeredPatient) {
        alert("Failed to register new patient. Please try again or register via the Receptionist Portal.");
        return;
      }

      finalPatientId = registeredPatient.id;
      finalMrn = registeredPatient.mrNumber;
      finalCnic = registeredPatient.cnic || customCnic.trim();
    }

    const newOrderNumber = `LAB-${Date.now().toString().slice(-8)}${Math.floor(10 + Math.random() * 90)}`;
    const newOrder: LabOrderRecord = {
      id: `lab-${Date.now()}`,
      orderNumber: newOrderNumber,
      patientId: finalPatientId,
      patientName: patientName,
      mrNumber: finalMrn,
      cnic: finalCnic,
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

  // Date & Day Formatter Helper
  const formatDateAndDay = (dateStr?: string) => {
    if (!dateStr) dateStr = new Date().toISOString().split("T")[0];
    try {
      const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
      if (isNaN(d.getTime())) return dateStr;
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const formattedDate = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      return `${formattedDate} (${dayName})`;
    } catch {
      return dateStr;
    }
  };

  // Filter orders by search query, date filter, and archive status
  // Use PKT (Asia/Karachi) date strings to avoid UTC midnight mismatch
  const todayPKT = toPKTDateString(new Date());
  const yesterdayPKT = toPKTDateString(new Date(Date.now() - 86400000));

  // When archive tab is active, use the full historical list; otherwise today's prop
  const sourceOrders = showArchivedTab ? allLabOrders : labOrders;

  const filteredOrders = sourceOrders.filter((l) => {
    const isArchived = archivedOrderIds.includes(l.id);
    if (showArchivedTab ? !isArchived : isArchived) return false;

    if (selectedLogDate !== "ALL") {
      if (selectedLogDate === "TODAY" && l.requestDate !== todayPKT) return false;
      if (selectedLogDate === "YESTERDAY" && l.requestDate !== yesterdayPKT) return false;
      if (selectedLogDate !== "TODAY" && selectedLogDate !== "YESTERDAY" && l.requestDate !== selectedLogDate) return false;
    }

    if (!searchMrnQuery.trim()) return true;
    const q = searchMrnQuery.toLowerCase();
    return (
      l.mrNumber.toLowerCase().includes(q) ||
      l.patientName.toLowerCase().includes(q) ||
      (l.cnic && l.cnic.toLowerCase().includes(q)) ||
      l.orderNumber.toLowerCase().includes(q)
    );
  });

  // Download Daily ZIP Archive Handler
  const handleDownloadDailyZip = async () => {

    const targetOrders = labOrders.filter((o) => {
      const isCompleted = o.status === "ACCEPTED" || o.status === "SUBMITTED_TO_CONSULTANT" || Boolean(o.resultsV1);
      const notArchived = !archivedOrderIds.includes(o.id);
      let matchesDate = true;
      if (selectedLogDate === "TODAY") matchesDate = o.requestDate === todayPKT;
      else if (selectedLogDate === "YESTERDAY") matchesDate = o.requestDate === yesterdayPKT;
      else if (selectedLogDate !== "ALL") matchesDate = o.requestDate === selectedLogDate;
      return isCompleted && notArchived && matchesDate;
    });

    if (targetOrders.length === 0) {
      alert("No finalized daily lab reports found matching your current filter to download.");
      return;
    }

    const zip = new JSZip();
    const dateTag = selectedLogDate === "ALL" || selectedLogDate === "TODAY" ? todayPKT : selectedLogDate;
    const folderName = `BILAL_HOSPITAL_LAB_REPORTS_${dateTag}`;
    const folder = zip.folder(folderName);

    for (const order of targetOrders) {
      const rawCnic = order.cnic && order.cnic.trim() ? order.cnic.trim().replace(/[/\\?%*:|"<>]/g, "-") : "N-A";
      const cleanName = order.patientName ? order.patientName.trim().replace(/[/\\?%*:|"<>]/g, "_") : "PATIENT";
      // Exact filename format: NAME(CNIC).html
      const filename = `${cleanName}(${rawCnic}).html`;

      const testCode = order.tests && order.tests[0] ? order.tests[0] : "CBC";
      const tmpl = getTemplateByCode(testCode) || DEFAULT_LAB_TEMPLATES[0];

      let resultsObj: Record<string, string> = {};
      try {
        resultsObj = order.resultsV1 ? JSON.parse(order.resultsV1) : {};
      } catch {
        resultsObj = { notes: order.resultsV1 || "" };
      }

      const evaluated = labTemplateEngine.evaluateAllResults(tmpl, resultsObj);

      const htmlContent = labPdfReportGenerator.generateHtmlReport({
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

      if (folder) {
        folder.file(filename, htmlContent);
      }
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${folderName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Ask to clear daily list
    if (window.confirm(`Downloaded ${targetOrders.length} reports in ZIP format as "${folderName}.zip"!\n\nDo you want to clear these downloaded reports from the active daily list to start a fresh daily list?`)) {
      const updatedArchivedIds = Array.from(new Set([...archivedOrderIds, ...targetOrders.map((o) => o.id)]));
      setArchivedOrderIds(updatedArchivedIds);
      try {
        localStorage.setItem("lab_archived_order_ids", JSON.stringify(updatedArchivedIds));
      } catch {}
    }
  };

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

  // Catalog filtered list — built-in (with any overrides applied) + custom templates
  const effectiveDefaultTemplates = DEFAULT_LAB_TEMPLATES.map(
    (t) => templateOverrides[t.code] || t
  );
  const allCatalogTemplates = [...effectiveDefaultTemplates, ...customTemplates];
  const filteredTemplates = allCatalogTemplates.filter((t) => {
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

  // Open modal to add a completely new template
  const handleOpenAddTemplate = () => {
    setEditingTemplateCode(null);
    setIsEditingBuiltIn(false);
    setTmplCode("");
    setTmplName("");
    setTmplCategory("Biochemistry");
    setTmplSampleType("Serum");
    setTmplDescription("");
    setTmplDefaultSection("Chemical Parameters");
    setTmplParams([
      {
        parameterId: `param_${Date.now()}_1`,
        name: "",
        section: "Chemical Parameters",
        unit: "",
        referenceRange: "",
        inputType: "NUMBER",
        options: "",
      },
    ]);
    setTmplError("");
    setIsTemplateModalOpen(true);
  };

  // Open modal to edit ANY existing template (built-in or custom)
  const handleOpenEditTemplate = (tmpl: LabTemplateDef) => {
    const isBuiltIn = isBuiltInTemplate(tmpl.code);
    setEditingTemplateCode(tmpl.code);
    setIsEditingBuiltIn(isBuiltIn);
    setTmplCode(tmpl.code);
    setTmplName(tmpl.name);
    setTmplCategory(tmpl.category || "Biochemistry");
    setTmplSampleType(tmpl.sampleType || "Serum");
    setTmplDescription(tmpl.description || "");
    const defaultSec = tmpl.sections?.[0] || "Chemical Parameters";
    setTmplDefaultSection(defaultSec);
    setTmplParams(
      tmpl.parameters.map((p, idx) => ({
        parameterId: p.parameterId || `param_${idx + 1}`,
        name: p.name || "",
        section: p.section || defaultSec,
        unit: p.unit || "",
        referenceRange: p.referenceRange || "",
        inputType: p.inputType || "NUMBER",
        options: p.options ? p.options.join(", ") : "",
      }))
    );
    setTmplError("");
    setIsTemplateModalOpen(true);
  };

  // Save template (creates new or updates existing built-in/custom)
  const handleSaveTemplate = () => {
    setTmplError("");
    const cleanCode = tmplCode.trim().toUpperCase().replace(/\s+/g, "_");
    if (!cleanCode) {
      setTmplError("Test Code is required.");
      return;
    }
    if (!tmplName.trim()) {
      setTmplError("Test Name is required.");
      return;
    }

    // If adding a new template, ensure code is not already taken
    if (!editingTemplateCode) {
      if (
        DEFAULT_LAB_TEMPLATES.some((t) => t.code === cleanCode) ||
        customTemplates.some((t) => t.code === cleanCode)
      ) {
        setTmplError(`Code "${cleanCode}" already exists. Please choose a unique test code.`);
        return;
      }
    }

    const validParams = tmplParams.filter((p) => p.name.trim());
    if (validParams.length === 0) {
      setTmplError("Please add at least one test parameter.");
      return;
    }

    // Collect all distinct sections
    const distinctSections = Array.from(
      new Set(
        validParams
          .map((p) => p.section.trim() || tmplDefaultSection.trim() || "Chemical Parameters")
          .filter(Boolean)
      )
    );

    const updatedTemplate: LabTemplateDef = {
      code: cleanCode,
      name: tmplName.trim(),
      category: tmplCategory,
      sampleType: tmplSampleType.trim() || "Serum",
      description: tmplDescription.trim() || tmplName.trim(),
      sections:
        distinctSections.length > 0
          ? distinctSections
          : [tmplDefaultSection.trim() || "Chemical Parameters"],
      parameters: validParams.map((p, i) => {
        const fallbackId =
          p.name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || `p_${i + 1}`;
        const finalParamId =
          p.parameterId && !p.parameterId.startsWith("param_") ? p.parameterId : fallbackId;

        return {
          parameterId: finalParamId,
          name: p.name.trim(),
          section: p.section.trim() || tmplDefaultSection.trim() || "Chemical Parameters",
          unit: p.unit.trim() || undefined,
          referenceRange: p.referenceRange.trim() || undefined,
          inputType: p.inputType,
          options:
            p.inputType === "SELECT" && p.options.trim()
              ? p.options.split(",").map((o) => o.trim()).filter(Boolean)
              : undefined,
          displayOrder: i + 1,
        };
      }),
    };

    if (isEditingBuiltIn) {
      saveTemplateOverride(updatedTemplate);
      setTemplateOverrides(getTemplateOverrides());
    } else {
      saveCustomTemplate(updatedTemplate);
      setCustomTemplates(getCustomTemplates());
    }

    setIsTemplateModalOpen(false);
    setEditingTemplateCode(null);
  };

  // Reset a modified built-in template to factory default
  const handleResetTemplate = (code: string) => {
    if (
      window.confirm(
        `Reset template "${code}" to factory default settings? Any customizations will be discarded.`
      )
    ) {
      resetTemplateToDefault(code);
      setTemplateOverrides(getTemplateOverrides());
    }
  };

  // Delete a custom template
  const handleDeleteCustomTemplate = (code: string) => {
    if (!window.confirm(`Delete custom template "${code}"? This cannot be undone.`)) return;
    deleteCustomTemplate(code);
    setCustomTemplates(getCustomTemplates());
  };

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
            {/* Header & Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                  <span>{showArchivedTab ? "Archived Lab Reports Log" : "All Requisitions & Finalized Reports Log"} ({filteredOrders.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete log of all lab orders from Consultant Portal & Direct Requisitions with Date & Day tracking.
                </p>
              </div>

              {/* Controls Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search Box */}
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search MRN, Name, CNIC..."
                    value={searchMrnQuery}
                    onChange={(e) => setSearchMrnQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Date Filter Dropdown */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setSelectedLogDate("ALL")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${selectedLogDate === "ALL" ? "bg-amber-500 text-slate-950 shadow-sm" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200"}`}
                  >
                    All Dates
                  </button>
                  <button
                    onClick={() => setSelectedLogDate("TODAY")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${selectedLogDate === "TODAY" ? "bg-amber-500 text-slate-950 shadow-sm" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200"}`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setSelectedLogDate("YESTERDAY")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${selectedLogDate === "YESTERDAY" ? "bg-amber-500 text-slate-950 shadow-sm" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200"}`}
                  >
                    Yesterday
                  </button>
                </div>

                {/* Archive Toggle Button */}
                <button
                  onClick={() => setShowArchivedTab(!showArchivedTab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition-all ${
                    showArchivedTab
                      ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{showArchivedTab ? "Active Daily List" : `Archived (${archivedOrderIds.length})`}</span>
                </button>

                {/* Download Daily ZIP Archive Button */}
                {!showArchivedTab && (
                  <button
                    onClick={handleDownloadDailyZip}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Daily ZIP</span>
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-500 uppercase border-b">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4 bg-amber-500/10 text-amber-700 dark:text-amber-400">Date & Day</th>
                    <th className="py-3 px-4">Patient MRN & Name</th>
                    <th className="py-3 px-4">CNIC Number</th>
                    <th className="py-3 px-4">Consultant</th>
                    <th className="py-3 px-4">Requested Test(s)</th>
                    <th className="py-3 px-4">Daily Report PDF Name</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredOrders.map((order) => {
                    const rawCnic = order.cnic && order.cnic.trim() ? order.cnic.trim() : "N-A";
                    const pdfNameFormat = `${order.patientName.trim()}(${rawCnic}).pdf`;

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-amber-600">{order.orderNumber}</td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-500/5">
                          {formatDateAndDay(order.requestDate)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {order.patientName}
                          <span className="block text-[10px] font-mono text-amber-600">{order.mrNumber}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 font-bold">{order.cnic || "N/A"}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-semibold">{order.consultantName}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{order.tests.join(", ")}</td>
                        <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {order.status === "ACCEPTED" || order.status === "SUBMITTED_TO_CONSULTANT" || order.resultsV1 ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 text-[11px]">
                              <FileText className="w-3 h-3 text-emerald-500" />
                              <span>{pdfNameFormat}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal italic">Pending Result</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={order.status === "ACCEPTED" || order.status === "SUBMITTED_TO_CONSULTANT" ? "success" : "warning"}>
                            {order.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          {(order.status === "ACCEPTED" || order.status === "SUBMITTED_TO_CONSULTANT" || order.resultsV1) ? (
                            <button
                              onClick={() => handleGeneratePrintPreview(order)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" /> View PDF
                            </button>
                          ) : (
                            <button
                              onClick={() => setSelectedOrderForResult(order)}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm cursor-pointer"
                            >
                              <FlaskConical className="w-3.5 h-3.5" /> Enter Result
                            </button>
                          )}
                          <button
                            onClick={() => setViewingOrderModal(order)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                        {showArchivedTab ? "No archived reports found." : "No requisitions or lab reports found for the selected date filter."}
                      </td>
                    </tr>
                  )}
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
                  <span>Diagnostic Test Catalog & Lab Templates ({allCatalogTemplates.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {DEFAULT_LAB_TEMPLATES.length} built-in{Object.keys(templateOverrides).length > 0 ? ` (${Object.keys(templateOverrides).length} customized)` : ""} + <span className="font-bold text-emerald-600">{customTemplates.length} custom</span> templates. Lab staff can edit parameter names, types, units, and ranges for any template.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleOpenAddTemplate}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs inline-flex items-center gap-2 shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Add New Template</span>
                </button>
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, code or parameter..."
                    value={catalogSearchQuery}
                    onChange={(e) => setCatalogSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
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
                const isCustom = customTemplates.some((ct) => ct.code === tmpl.code);
                const isModifiedBuiltIn = Boolean(templateOverrides[tmpl.code]);

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
                        <div className="flex items-center gap-1.5">
                          {isCustom ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                              Custom
                            </span>
                          ) : isModifiedBuiltIn ? (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold">
                              Customized
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                              Built-in
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase">
                            {tmpl.category}
                          </span>
                        </div>
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

                    {/* Action Buttons */}
                    <div className="pt-2 flex flex-col gap-2">
                      {/* EDIT TEMPLATE BUTTON FOR ALL TEMPLATES */}
                      <button
                        onClick={() => handleOpenEditTemplate(tmpl)}
                        className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit Template & Parameters</span>
                      </button>

                      <button
                        onClick={() => handleLaunchResultForTemplate(tmpl)}
                        className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <FlaskConical className="w-3.5 h-3.5" />
                        <span>Enter Result for {tmpl.code}</span>
                      </button>

                      {/* Reset button if built-in template has been modified */}
                      {isModifiedBuiltIn && (
                        <button
                          onClick={() => handleResetTemplate(tmpl.code)}
                          className="w-full py-1.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3 text-slate-500" />
                          <span>Reset to Factory Default</span>
                        </button>
                      )}

                      {/* Show delete button only for custom templates */}
                      {isCustom && (
                        <button
                          onClick={() => handleDeleteCustomTemplate(tmpl.code)}
                          className="w-full py-1.5 px-3 rounded-xl bg-rose-100 dark:bg-rose-950/40 hover:bg-rose-200 text-rose-700 dark:text-rose-400 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-rose-200 dark:border-rose-900"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete Custom Template</span>
                        </button>
                      )}
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
          subtitle="Select existing patient or enter Name, CNIC, Age & Gender, then select lab tests. MRN is auto-assigned sequentially."
          maxWidth="4xl"
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
                  {/* AUTO-FILL MRN — READ ONLY — assigned by backend on confirmation */}
                  <div>
                    <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                      Patient MRN
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[9px] font-black uppercase">
                        Auto-Assigned
                      </span>
                    </label>
                    <div className={`w-full px-3 py-1.5 rounded-lg border-2 font-mono font-black text-sm flex items-center gap-2
                      ${ isFetchingMrn
                        ? 'border-slate-200 bg-slate-50 dark:bg-slate-900 text-slate-400'
                        : 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                      }`}>
                      {isFetchingMrn ? (
                        <span className="animate-pulse">Fetching MRN...</span>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          {nextMrn}
                        </>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Sequential MRN auto-assigned from database — cannot be changed manually.
                    </p>
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

            {/* 2. Select Test Template — Dropdown Multi-Select */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div>
                  <label className="font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 text-xs block">
                    2. Select Laboratory Test(s)
                    {selectedTestCodesForNew.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-black">
                        {selectedTestCodesForNew.length} selected
                      </span>
                    )}
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Search and select from all available pathology lab tests.
                  </p>
                </div>
                {selectedTestCodesForNew.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTestCodesForNew([])}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-200 shrink-0"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Dropdown select */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search tests (e.g. CBC, LFT, Urine, Blood...)" 
                  value={newReqTemplateSearch}
                  onChange={(e) => setNewReqTemplateSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                />
                {/* Dropdown list */}
                {newReqTemplateSearch.trim() !== "" && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                    {DEFAULT_LAB_TEMPLATES.filter((t) => {
                      const q = newReqTemplateSearch.toLowerCase().trim();
                      return (
                        t.code.toLowerCase().includes(q) ||
                        t.name.toLowerCase().includes(q) ||
                        (t.fullForm && t.fullForm.toLowerCase().includes(q)) ||
                        t.category.toLowerCase().includes(q)
                      );
                    }).map((tmpl) => {
                      const isChecked = selectedTestCodesForNew.includes(tmpl.code);
                      return (
                        <button
                          key={tmpl.code}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              setSelectedTestCodesForNew(selectedTestCodesForNew.filter((c) => c !== tmpl.code));
                            } else {
                              setSelectedTestCodesForNew([...selectedTestCodesForNew, tmpl.code]);
                            }
                            setNewReqTemplateSearch("");
                          }}
                          className={`w-full px-3 py-2.5 text-left flex items-center justify-between gap-3 transition-colors ${
                            isChecked
                              ? "bg-amber-50 dark:bg-amber-950/40"
                              : "hover:bg-slate-50 dark:hover:bg-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono font-black text-[10px] shrink-0">
                              {tmpl.code}
                            </span>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 dark:text-white text-xs truncate">{tmpl.name}</div>
                              <div className="text-[10px] text-slate-400">{tmpl.category}</div>
                            </div>
                          </div>
                          {isChecked && (
                            <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                    {DEFAULT_LAB_TEMPLATES.filter((t) => {
                      const q = newReqTemplateSearch.toLowerCase().trim();
                      return t.code.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || (t.fullForm && t.fullForm.toLowerCase().includes(q)) || t.category.toLowerCase().includes(q);
                    }).length === 0 && (
                      <div className="px-4 py-5 text-center text-slate-400 text-xs">
                        No tests match "{newReqTemplateSearch}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Show all tests when search is empty — compact dropdown */}
              {newReqTemplateSearch.trim() === "" && (
                <div className="relative">
                  <select
                    onChange={(e) => {
                      const code = e.target.value;
                      if (!code) return;
                      if (!selectedTestCodesForNew.includes(code)) {
                        setSelectedTestCodesForNew([...selectedTestCodesForNew, code]);
                      }
                      e.target.value = "";
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    defaultValue=""
                  >
                    <option value="" disabled>— Click to add a test —</option>
                    {["ALL", "Hematology", "Biochemistry", "Serology", "Clinical Pathology", "Microbiology"].map((cat) => {
                      const testsInCat = DEFAULT_LAB_TEMPLATES.filter((t) => cat === "ALL" ? true : t.category === cat);
                      if (cat === "ALL") return null;
                      return (
                        <optgroup key={cat} label={`── ${cat} ──`}>
                          {testsInCat.map((tmpl) => (
                            <option
                              key={tmpl.code}
                              value={tmpl.code}
                              disabled={selectedTestCodesForNew.includes(tmpl.code)}
                            >
                              {selectedTestCodesForNew.includes(tmpl.code) ? "✓ " : ""}{tmpl.code} — {tmpl.name}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Selected tests as removable pills */}
              {selectedTestCodesForNew.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                  <div className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 mb-2">Selected Tests:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTestCodesForNew.map((code) => {
                      const tmpl = DEFAULT_LAB_TEMPLATES.find((t) => t.code === code);
                      return (
                        <span
                          key={code}
                          className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-xs font-bold text-slate-800 dark:text-white shadow-sm"
                        >
                          <span className="text-amber-600 font-mono text-[10px] font-black">{code}</span>
                          <span className="text-slate-600 dark:text-slate-300">{tmpl?.name || code}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedTestCodesForNew(selectedTestCodesForNew.filter((c) => c !== code))}
                            className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center text-slate-500 transition-colors cursor-pointer text-[10px] font-black leading-none"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
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
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-pre-line">
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
      {/* ═══════════ TEMPLATE BUILDER & EDITOR MODAL ═══════════ */}
      {isTemplateModalOpen && (
        <Modal
          isOpen
          onClose={() => {
            setIsTemplateModalOpen(false);
            setTmplError("");
            setEditingTemplateCode(null);
          }}
          title={
            editingTemplateCode
              ? `Edit Test Template: ${tmplName || editingTemplateCode}`
              : "Add New Lab Test Template"
          }
          subtitle={
            editingTemplateCode
              ? isEditingBuiltIn
                ? "Customize parameter names, types, units, and reference ranges for this test. Factory presets can be restored anytime."
                : "Modify details, parameters, units, and ranges for this custom template."
              : "Create a custom test template that lab staff can immediately use for result entry"
          }
          maxWidth="4xl"
        >
          <div className="space-y-5 text-xs">
            {tmplError && (
              <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {tmplError}
              </div>
            )}

            {/* Row 1: Code + Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                    Test Code *
                  </label>
                  {editingTemplateCode && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      (Code locked during edit)
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={tmplCode}
                  disabled={Boolean(editingTemplateCode)}
                  onChange={(e) => setTmplCode(e.target.value.toUpperCase())}
                  placeholder="e.g. URIC_ACID"
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <p className="text-[10px] text-slate-400">
                  Unique identifier used by reports and order requisition.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                  Test Name *
                </label>
                <input
                  type="text"
                  value={tmplName}
                  onChange={(e) => setTmplName(e.target.value)}
                  placeholder="e.g. Serum Uric Acid"
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
                <p className="text-[10px] text-slate-400">
                  Full official name printed on patient lab reports.
                </p>
              </div>
            </div>

            {/* Row 2: Category + Sample Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                  Category / Department *
                </label>
                <select
                  value={tmplCategory}
                  onChange={(e) => setTmplCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {[
                    "Biochemistry",
                    "Hematology",
                    "Serology",
                    "Clinical Pathology",
                    "Microbiology",
                    "Histopathology",
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                  Sample Required *
                </label>
                <input
                  type="text"
                  value={tmplSampleType}
                  onChange={(e) => setTmplSampleType(e.target.value)}
                  placeholder="e.g. Serum, Whole Blood (EDTA), Urine"
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Row 3: Section heading + Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                  Default Section Heading
                </label>
                <input
                  type="text"
                  value={tmplDefaultSection}
                  onChange={(e) => setTmplDefaultSection(e.target.value)}
                  placeholder="e.g. Chemical Parameters"
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400">
                  Default section grouping used for test parameters.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                  Description
                </label>
                <input
                  type="text"
                  value={tmplDescription}
                  onChange={(e) => setTmplDescription(e.target.value)}
                  placeholder="Short description of what this diagnostic test measures"
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Parameters Table */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-2">
                    <span>Test Parameters ({tmplParams.length})</span>
                    <span className="text-[10px] font-normal lowercase text-slate-400">(reorder, rename, set units, ranges & input types)</span>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setTmplParams((prev) => [
                      ...prev,
                      {
                        parameterId: `param_${Date.now()}_${prev.length + 1}`,
                        name: "",
                        section: tmplDefaultSection || "Chemical Parameters",
                        unit: "",
                        referenceRange: "",
                        inputType: "NUMBER",
                        options: "",
                      },
                    ])
                  }
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Parameter
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 items-center">
                  <div className="col-span-1 text-center">Order</div>
                  <div className="col-span-3">Parameter Name *</div>
                  <div className="col-span-2">Section</div>
                  <div className="col-span-1">Unit</div>
                  <div className="col-span-2">Reference Range</div>
                  <div className="col-span-2">Type / Options</div>
                  <div className="col-span-1 text-center">Del</div>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {tmplParams.map((p, i) => (
                    <div
                      key={p.parameterId || i}
                      className="grid grid-cols-12 gap-2 px-3 py-2.5 items-start bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      {/* Order / Reorder */}
                      <div className="col-span-1 flex items-center justify-center gap-0.5 pt-1">
                        <span className="text-[10px] font-mono text-slate-400 w-3 text-center">{i + 1}</span>
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={i === 0}
                            onClick={() => {
                              setTmplParams((prev) => {
                                const copy = [...prev];
                                const temp = copy[i - 1];
                                copy[i - 1] = copy[i];
                                copy[i] = temp;
                                return copy;
                              });
                            }}
                            className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-20 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-2.5 h-2.5 text-slate-600 dark:text-slate-300" />
                          </button>
                          <button
                            type="button"
                            disabled={i === tmplParams.length - 1}
                            onClick={() => {
                              setTmplParams((prev) => {
                                const copy = [...prev];
                                const temp = copy[i + 1];
                                copy[i + 1] = copy[i];
                                copy[i] = temp;
                                return copy;
                              });
                            }}
                            className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-20 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-2.5 h-2.5 text-slate-600 dark:text-slate-300" />
                          </button>
                        </div>
                      </div>

                      {/* Name */}
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) =>
                            setTmplParams((prev) =>
                              prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x))
                            )
                          }
                          placeholder="e.g. Blood Urea"
                          className="w-full px-2.5 py-1.5 rounded-lg border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-semibold"
                        />
                      </div>

                      {/* Section */}
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={p.section}
                          onChange={(e) =>
                            setTmplParams((prev) =>
                              prev.map((x, j) => (j === i ? { ...x, section: e.target.value } : x))
                            )
                          }
                          placeholder="Section name"
                          className="w-full px-2 py-1.5 rounded-lg border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                        />
                      </div>

                      {/* Unit */}
                      <div className="col-span-1">
                        <input
                          type="text"
                          value={p.unit}
                          onChange={(e) =>
                            setTmplParams((prev) =>
                              prev.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x))
                            )
                          }
                          placeholder="mg/dl"
                          className="w-full px-1.5 py-1.5 rounded-lg border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-mono"
                        />
                      </div>

                      {/* Reference Range */}
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={p.referenceRange}
                          onChange={(e) =>
                            setTmplParams((prev) =>
                              prev.map((x, j) =>
                                j === i ? { ...x, referenceRange: e.target.value } : x
                              )
                            )
                          }
                          placeholder="e.g. 15 - 45"
                          className="w-full px-2 py-1.5 rounded-lg border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-mono"
                        />
                      </div>

                      {/* Input Type & Options */}
                      <div className="col-span-2 space-y-1">
                        <select
                          value={p.inputType}
                          onChange={(e) =>
                            setTmplParams((prev) =>
                              prev.map((x, j) =>
                                j === i ? { ...x, inputType: e.target.value as any } : x
                              )
                            )
                          }
                          className="w-full px-2 py-1.5 rounded-lg border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-medium"
                        >
                          <option value="NUMBER">Number</option>
                          <option value="TEXT">Text</option>
                          <option value="SELECT">Dropdown</option>
                          <option value="HEADING">Heading Only</option>
                        </select>
                        {p.inputType === "SELECT" && (
                          <input
                            type="text"
                            value={p.options}
                            onChange={(e) =>
                              setTmplParams((prev) =>
                                prev.map((x, j) =>
                                  j === i ? { ...x, options: e.target.value } : x
                                )
                              )
                            }
                            placeholder="Options (e.g. Nil,+,++,+++)"
                            className="w-full px-2 py-1 rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white focus:outline-none text-[10px]"
                          />
                        )}
                      </div>

                      {/* Delete */}
                      <div className="col-span-1 text-center pt-1">
                        <button
                          type="button"
                          onClick={() => setTmplParams((prev) => prev.filter((_, j) => j !== i))}
                          disabled={tmplParams.length === 1}
                          className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-200 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-all"
                          title="Remove Parameter"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                Tip: Choose &quot;Dropdown&quot; for qualitative results (e.g. Positive/Negative or Nil/++/+++), or &quot;Number&quot; for automated range flagging.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setIsTemplateModalOpen(false);
                  setTmplError("");
                  setEditingTemplateCode(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-300 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs inline-flex items-center gap-2 shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                <PackageCheck className="w-4 h-4" />
                <span>
                  {editingTemplateCode ? "Save Template Changes" : "Save Template & Add to Catalog"}
                </span>
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

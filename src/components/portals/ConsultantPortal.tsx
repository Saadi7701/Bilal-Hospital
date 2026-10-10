"use client";
import { AuthSessionUser } from '@/lib/authSession';
import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Send,
  Eye,
  UserCheck,
  TestTube,
  Radio,
  FileText,
  CheckCircle2,
  FileSpreadsheet,
  ArrowLeft,
  ChevronDown,
  Trash2,
  Plus,
  LogOut,
  Lock,
  Shield,
  Key,
  RotateCcw,
  ThumbsUp,
  AlertCircle,
  Microscope,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  VisitRecord,
  PrescriptionRecord,
  LabOrderRecord,
  UltrasoundOrderRecord,
  CashTransactionRecord,
  ConsultantUser,
} from '@/lib/mockDataStore';
import { DoctorNotesManager } from '../forms/DoctorNotesManager';
import { PatientFileManager } from './PatientFileManager';
import { getTemplateByCode, DEFAULT_LAB_TEMPLATES } from '@/lib/labTemplateRegistry';
import { labTemplateEngine } from '@/lib/labTemplateEngine';

const mockMedicines = [
  'Tab. Panadol 500mg',
  'Tab. Augmentin 625mg',
  'Syp. Brufen',
  'Cap. Omeprazole 20mg',
  'Tab. Softavas 5mg (Amlodipine)',
];

interface ConsultantPortalProps {
  activeTab?: string;
  sessionUser?: AuthSessionUser | null;   // Logged-in consultant from global auth session
  visits: VisitRecord[];
  prescriptions?: PrescriptionRecord[];
  labOrders: LabOrderRecord[];
  ultrasoundOrders: UltrasoundOrderRecord[];
  consultants?: ConsultantUser[];
  onAddPrescription: (rx: PrescriptionRecord) => void;
  onUpdateVisitStatus: (visitId: string, status: VisitRecord['status']) => void;
  onAddLabOrder: (order: LabOrderRecord, txn: CashTransactionRecord) => void;
  onAddUltrasoundOrder: (order: UltrasoundOrderRecord, txn: CashTransactionRecord) => void;
  onAcceptLabReport?: (id: string) => void;
  onRequestLabRevision?: (id: string, reason: string, comment: string) => void;
  onConsultantLogin?: (consultantId: string) => void;
  onConsultantLogout?: (consultantId: string) => void;
}

// ── Inline Lab Report Viewer component ───────────────────────────────────────
const LabReportInlineViewer: React.FC<{
  order: LabOrderRecord;
  onAccept: () => void;
  onRevise: (reason: string, comment: string) => void;
  onClose: () => void;
}> = ({ order, onAccept, onRevise, onClose }) => {
  const [revisionReason, setRevisionReason] = useState('');
  const [revisionComment, setRevisionComment] = useState('');
  const [showReviseForm, setShowReviseForm] = useState(false);

  const isAlreadyAccepted = order.status === 'ACCEPTED';
  const isRevisionRequested = order.status === 'REVISION_REQUESTED';
  const hasReport = !!order.resultsV1 || !!order.resultsV2;

  // Resolve template and evaluate results
  const testCode = order.tests && order.tests[0] ? order.tests[0] : 'CBC';
  const tmpl = getTemplateByCode(testCode) || DEFAULT_LAB_TEMPLATES[0];

  let parsedResults: Record<string, string> = {};
  const rawResults = order.resultsV2 || order.resultsV1 || '';
  try {
    parsedResults = rawResults ? JSON.parse(rawResults) : {};
  } catch {
    parsedResults = {};
  }

  const evaluated = hasReport ? labTemplateEngine.evaluateAllResults(tmpl, parsedResults) : [];
  const abnormalCount = evaluated.filter((r) => r.flag !== 'NORMAL').length;

  return (
    <div className="space-y-4 text-xs">
      {/* Report Header */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-slate-900 to-amber-950 border border-amber-800/40 text-white">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-0.5">Bilal Hospital Laboratory Report</div>
          <div className="text-base font-black">{tmpl.name}</div>
          <div className="text-[11px] text-slate-300 mt-0.5">Order: {order.orderNumber} | Sample: {tmpl.sampleType}</div>
        </div>
        <div className="text-right space-y-1">
          <Badge variant={isAlreadyAccepted ? 'success' : isRevisionRequested ? 'danger' : 'warning'}>
            {order.status}
          </Badge>
          {order.currentVersion > 1 && (
            <div className="text-[10px] text-amber-300 font-mono">Version {order.currentVersion}</div>
          )}
        </div>
      </div>

      {/* Patient Demographics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-amber-50/60 dark:bg-slate-800/60 border border-amber-200 dark:border-slate-700">
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase">Patient</div>
          <div className="font-bold text-slate-900 dark:text-white">{order.patientName}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase">Permanent MRN</div>
          <div className="font-mono font-bold text-amber-600">{order.mrNumber}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase">Consultant</div>
          <div className="font-semibold">{order.consultantName}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase">Priority</div>
          <Badge variant={order.priority === 'URGENT' ? 'danger' : 'neutral'}>{order.priority}</Badge>
        </div>
      </div>

      {/* Abnormal Alert */}
      {abnormalCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-bold">{abnormalCount} parameter{abnormalCount > 1 ? 's' : ''} outside reference range — review required.</span>
        </div>
      )}

      {/* Results Table */}
      {hasReport ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase">
                <th className="py-2.5 px-3">Test Parameter</th>
                <th className="py-2.5 px-3">Result</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3">Ref. Range</th>
                <th className="py-2.5 px-3">Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {evaluated.map((r, i) => (
                <tr key={i} className={r.flag !== 'NORMAL' ? 'bg-rose-50 dark:bg-rose-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}>
                  <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                    {r.section && <span className="text-[9px] text-slate-400 font-mono block">[{r.section}]</span>}
                    {r.name}
                  </td>
                  <td className={`py-2 px-3 font-mono font-bold ${r.flag !== 'NORMAL' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                    {r.value || '—'}
                  </td>
                  <td className="py-2 px-3 text-slate-500 font-mono">{r.unit || '—'}</td>
                  <td className="py-2 px-3 text-slate-500 font-mono text-[10px]">{r.referenceRange || 'Normal'}</td>
                  <td className="py-2 px-3">
                    {r.flag !== 'NORMAL' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500 text-white uppercase">{r.flag}</span>
                    ) : (
                      <span className="text-emerald-500 font-bold text-[10px]">✓ Normal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-8 text-center text-slate-400 border border-dashed rounded-xl">
          <Microscope className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <div className="font-bold">Report not yet submitted by laboratory.</div>
          <div className="text-[11px] mt-1">Status: {order.status}</div>
        </div>
      )}

      {/* PDF File Info */}
      {order.attachedPdfName && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
          <FileText className="w-4 h-4 flex-shrink-0" />
          <span className="font-mono font-bold text-[11px]">{order.attachedPdfName}</span>
          <span className="text-[10px] text-slate-400 ml-auto">Stored in patient MRN local file</span>
        </div>
      )}

      {/* Revision Note (if already requested) */}
      {isRevisionRequested && order.revisionReason && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs space-y-1">
          <div className="font-bold text-rose-700 dark:text-rose-400">⚠ Revision Already Requested</div>
          <div className="text-slate-700 dark:text-slate-300"><span className="font-bold">Reason:</span> {order.revisionReason}</div>
          {order.revisionComment && <div className="text-slate-600 dark:text-slate-400">{order.revisionComment}</div>}
        </div>
      )}

      {/* Action Buttons */}
      <div className="border-t pt-4 space-y-3">
        {!showReviseForm ? (
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              Close
            </button>
            <div className="flex gap-3">
              {!isRevisionRequested && !isAlreadyAccepted && (
                <button
                  onClick={() => setShowReviseForm(true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-2 shadow-sm transition-all"
                >
                  <RotateCcw className="w-4 h-4" /> Request Revision
                </button>
              )}
              {!isAlreadyAccepted && hasReport && (
                <button
                  onClick={onAccept}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
                >
                  <ThumbsUp className="w-4 h-4" /> Accept Report
                </button>
              )}
              {isAlreadyAccepted && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Report Accepted
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-4 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/40">
            <div className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Request Lab Revision / Correction
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px] uppercase">Revision Reason *</label>
              <select
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 font-bold text-xs"
              >
                <option value="">Select Reason...</option>
                <option value="Sample hemolysis/lipemia suspected">Sample hemolysis / lipemia suspected</option>
                <option value="Values inconsistent with clinical picture">Values inconsistent with clinical picture</option>
                <option value="Wrong patient sample suspected">Wrong patient sample suspected — verify MRN</option>
                <option value="Delta check failed">Delta check failed (significant change from prior)</option>
                <option value="Incomplete panel">Incomplete panel — some parameters missing</option>
                <option value="Transcription error suspected">Transcription / data entry error suspected</option>
                <option value="Re-run required">Re-run required on fresh sample</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px] uppercase">Clinical Comment</label>
              <textarea
                rows={2}
                placeholder="Additional clinical notes for the laboratory technician..."
                value={revisionComment}
                onChange={(e) => setRevisionComment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border text-xs"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowReviseForm(false)} className="px-4 py-2 rounded-xl border font-bold text-xs text-slate-600">
                Cancel
              </button>
              <button
                disabled={!revisionReason}
                onClick={() => { if (revisionReason) { onRevise(revisionReason, revisionComment); setShowReviseForm(false); } }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" /> Submit Revision Request
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


type RxItem = PrescriptionRecord['items'][0];

interface FileModal {
  title: string;
  fileName: string;
  type: 'pdf' | 'image';
  contentSummary: string;
  imageBase64?: string;
  visitId?: string;
}

export const ConsultantPortal: React.FC<ConsultantPortalProps> = ({
  activeTab: propActiveTab,
  sessionUser,
  visits,
  labOrders,
  ultrasoundOrders,
  consultants = [],
  onAddPrescription,
  onUpdateVisitStatus,
  onAddLabOrder,
  onAddUltrasoundOrder,
  onAcceptLabReport,
  onRequestLabRevision,
  onConsultantLogin,
  onConsultantLogout,
}) => {
  const [reviewingLabOrder, setReviewingLabOrder] = useState<LabOrderRecord | null>(null);
  // Use the global auth session to identify which consultant is viewing this portal.
  // Falls back to 'doc-1' for legacy compatibility when sessionUser is not provided.
  const [loggedInConsultantId, setLoggedInConsultantId] = useState<string | null>(
    sessionUser?.consultantId || 'doc-1'
  );
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [internalTab, setInternalTab] = useState<string>('queue');

  useEffect(() => {
    if (propActiveTab) {
      setInternalTab(propActiveTab);
    }
  }, [propActiveTab]);

  const currentTab = internalTab;
  const [activeVisit, setActiveVisit] = useState<VisitRecord | null>(null);

  const [diagnosis, setDiagnosis] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [showVitals, setShowVitals] = useState(false);
  const [vitals, setVitals] = useState({ bpSystolic: '', bpDiastolic: '', pulse: '', temp: '', weight: '' });

  const [rxItems, setRxItems] = useState<RxItem[]>([]);
  const [newRxItem, setNewRxItem] = useState<RxItem>({
    medicineName: '',
    dosage: '',
    frequency: '1-0-0',
    duration: '14 Days',
    route: 'Oral',
    instructions: '',
  });

  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [isUltrasoundModalOpen, setIsUltrasoundModalOpen] = useState(false);
  const [usExamName, setUsExamName] = useState('Abdominal & Pelvic Ultrasound');
  const [viewingFileModal, setViewingFileModal] = useState<FileModal | null>(null);

  const selectedConsultant = loggedInConsultantId || 'doc-1';
  const activeConsultantObj = consultants.find((c) => c.id === selectedConsultant);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const found = consultants.find(
      (c) => c.username.toLowerCase() === loginUsername.trim().toLowerCase() && c.password === loginPassword.trim()
    );

    if (found) {
      setLoggedInConsultantId(found.id);
      if (onConsultantLogin) {
        onConsultantLogin(found.id);
      }
      setLoginUsername('');
      setLoginPassword('');
    } else {
      setLoginError('Invalid Username or Login Password. Please verify and try again.');
    }
  };

  const handleLogout = () => {
    if (loggedInConsultantId && onConsultantLogout) {
      onConsultantLogout(loggedInConsultantId);
    }
    setLoggedInConsultantId(null);
    setActiveVisit(null);
  };

  const isConsultantForVisit = (v: VisitRecord) => {
    // Match by real Postgres UUID (consultantDbId) — most reliable
    if (sessionUser?.consultantDbId && v.consultantId === sessionUser.consultantDbId) {
      return true;
    }
    // Match by legacy frontend ID (doc-1, doc-2)
    const isDoc1Match =
      selectedConsultant === "doc-1" &&
      (v.consultantId === "doc-1" ||
        v.consultantName?.toLowerCase().includes("bilal") ||
        !v.consultantId);
    const isDoc2Match =
      selectedConsultant === "doc-2" &&
      (v.consultantId === "doc-2" || v.consultantName?.toLowerCase().includes("sarah"));
    // Match by full name from session
    const isNameMatch =
      sessionUser?.fullName &&
      v.consultantName?.toLowerCase().includes(sessionUser.fullName.toLowerCase().split(' ').slice(-1)[0]);
    const isGenericMatch = v.consultantId === selectedConsultant;
    return isDoc1Match || isDoc2Match || isGenericMatch || !!isNameMatch;
  };

  // 1. Waiting Queue (Only WAITING, REGISTERED, WITH_CONSULTANT)
  const waitingVisits = visits.filter(
    (v) => isConsultantForVisit(v) && (v.status === "REGISTERED" || v.status === "WAITING" || v.status === "WITH_CONSULTANT")
  );

  // 2. Daily Checked Queue (CHECKED, COMPLETED)
  const checkedVisits = visits.filter(
    (v) => isConsultantForVisit(v) && (v.status === "CHECKED" || v.status === "COMPLETED")
  );

  // 3. Diagnostic Requests Queue (LAB_REQUESTED, ULTRASOUND_REQUESTED)
  const diagnosticRequestVisits = visits.filter(
    (v) =>
      isConsultantForVisit(v) &&
      (v.status === "LAB_REQUESTED" || v.status === "ULTRASOUND_REQUESTED")
  );

  const consultantLabOrders = labOrders.filter((l) => {
    if (sessionUser?.consultantDbId && l.consultantId === sessionUser.consultantDbId) return true;
    const isDoc1Match =
      selectedConsultant === "doc-1" &&
      (l.consultantId === "doc-1" ||
        !l.consultantId ||
        l.consultantName?.toLowerCase().includes("bilal") ||
        l.consultantName?.toLowerCase().includes("doctor") ||
        l.consultantName === "Consultant Doctor");
    const isDoc2Match =
      selectedConsultant === "doc-2" &&
      (l.consultantId === "doc-2" || l.consultantName?.toLowerCase().includes("sarah"));
    const isNameMatch =
      sessionUser?.fullName &&
      l.consultantName?.toLowerCase().includes(sessionUser.fullName.toLowerCase().split(' ').slice(-1)[0]);
    return isDoc1Match || isDoc2Match || l.consultantId === selectedConsultant || Boolean(isNameMatch);
  });

  const labResultsReadyOrders = consultantLabOrders.filter(
    (l) => l.status === "REPORT_PREPARED" || l.status === "SUBMITTED_TO_CONSULTANT"
  );

  const consultantUltrasoundOrders = ultrasoundOrders.filter((u) => {
    if (sessionUser?.consultantDbId && u.consultantId === sessionUser.consultantDbId) return true;
    const isDoc1Match =
      selectedConsultant === "doc-1" &&
      (u.consultantId === "doc-1" ||
        !u.consultantId ||
        u.consultantName?.toLowerCase().includes("bilal") ||
        u.consultantName?.toLowerCase().includes("doctor") ||
        u.consultantName === "Consultant Doctor");
    const isDoc2Match =
      selectedConsultant === "doc-2" &&
      (u.consultantId === "doc-2" || u.consultantName?.toLowerCase().includes("sarah"));
    return isDoc1Match || isDoc2Match || u.consultantId === selectedConsultant;
  });

  const handleAddMedicine = () => {
    if (!newRxItem.medicineName) return;
    setRxItems([...rxItems, newRxItem]);
    setNewRxItem({ medicineName: '', dosage: '', frequency: '1-0-0', duration: '14 Days', route: 'Oral', instructions: '' });
  };

  const handleSavePrescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVisit) return;
    const newPrescription: PrescriptionRecord = {
      id: `rx-${Date.now()}`,
      patientId: activeVisit.patientId,
      patientName: activeVisit.patientName,
      mrNumber: activeVisit.mrNumber,
      visitId: activeVisit.id,
      consultantId: selectedConsultant,
      consultantName: activeConsultantObj?.fullName || 'Consultant Doctor',
      diagnosis: diagnosis || 'General Medical Evaluation',
      prescriptionDate: new Date().toLocaleString(),
      items: rxItems,
      isDispensed: false,
    };
    onAddPrescription(newPrescription);
    onUpdateVisitStatus(activeVisit.id, 'CHECKED');
    alert(`Consultation & Prescription saved! Patient ${activeVisit.patientName} moved to Daily Checked Patients Queue.`);
    setActiveVisit(null);
    setRxItems([]);
    setDiagnosis('');
    setChiefComplaint('');
  };

  const handleMarkCheckedOnly = () => {
    if (!activeVisit) return;
    onUpdateVisitStatus(activeVisit.id, 'CHECKED');
    alert(`Patient ${activeVisit.patientName} marked as CHECKED! Moved to Daily Checked Patients Queue.`);
    setActiveVisit(null);
  };

  const handleCompleteEncounter = async () => {
    if (!activeVisit) return;
    try {
      await fetch('/api/encounters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeVisit.id,
          status: 'COMPLETED',
          performedBy: activeConsultantObj?.fullName || 'Doctor',
        }),
      });
    } catch (err) {
      console.warn('Encounter complete sync error:', err);
    }
    onUpdateVisitStatus(activeVisit.id, 'COMPLETED');
    alert(`Encounter for ${activeVisit.patientName} (${activeVisit.mrNumber}) finalized & completed successfully!`);
    setActiveVisit(null);
  };

  const handleOrderLabSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVisit || selectedTests.length === 0) return;
    const newLabOrder: LabOrderRecord = {
      id: `lab-${Date.now()}`,
      orderNumber: `LAB-2026-${String(labOrders.length + 882)}`,
      patientId: activeVisit.patientId,
      patientName: activeVisit.patientName,
      mrNumber: activeVisit.mrNumber,
      visitId: activeVisit.id,
      consultantId: selectedConsultant,
      consultantName: activeConsultantObj?.fullName || 'Consultant Doctor',
      testCategory: 'Biochemistry & Pathology',
      tests: selectedTests,
      totalFee: selectedTests.length * 900,
      priority: 'URGENT',
      status: 'ORDERED',
      requestDate: new Date().toLocaleString(),
      currentVersion: 1,
    };
    const newLedgerTxn: CashTransactionRecord = {
      id: `txn-${Date.now()}`,
      transactionNumber: `TXN-2026-${String(Date.now()).slice(-4)}`,
      transactionType: 'INCOME',
      category: 'Laboratory Test',
      department: 'Laboratory',
      amount: selectedTests.length * 900,
      paymentMethod: 'CASH',
      description: `Lab Test (${selectedTests.join(', ')}) - ${activeVisit.patientName}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      patientName: activeVisit.patientName,
      mrNumber: activeVisit.mrNumber,
      createdBy: 'Consultant Order',
    };
    onAddLabOrder(newLabOrder, newLedgerTxn);
    setIsLabModalOpen(false);
    setSelectedTests([]);
    onUpdateVisitStatus(activeVisit.id, 'LAB_REQUESTED');
  };

  const handleOrderUltrasoundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVisit) return;
    const newUSOrder: UltrasoundOrderRecord = {
      id: `us-${Date.now()}`,
      orderNumber: `US-2026-${String(ultrasoundOrders.length + 413)}`,
      patientId: activeVisit.patientId,
      patientName: activeVisit.patientName,
      mrNumber: activeVisit.mrNumber,
      visitId: activeVisit.id,
      consultantId: selectedConsultant,
      consultantName: activeConsultantObj?.fullName || 'Consultant Doctor',
      requestedExam: usExamName,
      clinicalIndication: 'Diagnostic Ultrasound Examination',
      totalFee: 3000,
      status: 'ORDERED',
      requestDate: new Date().toLocaleString(),
      currentVersion: 1,
    };
    const newLedgerTxn: CashTransactionRecord = {
      id: `txn-${Date.now()}`,
      transactionNumber: `TXN-2026-${String(Date.now()).slice(-4)}`,
      transactionType: 'INCOME',
      category: 'Ultrasound',
      department: 'Ultrasound',
      amount: 3000,
      paymentMethod: 'CASH',
      description: `Ultrasound (${usExamName}) - ${activeVisit.patientName}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      patientName: activeVisit.patientName,
      mrNumber: activeVisit.mrNumber,
      createdBy: 'Consultant Order',
    };
    onAddUltrasoundOrder(newUSOrder, newLedgerTxn);
    setIsUltrasoundModalOpen(false);
    onUpdateVisitStatus(activeVisit.id, 'ULTRASOUND_REQUESTED');
  };

  // IF NOT LOGGED IN -> RENDER LOGIN SCREEN
  if (!loggedInConsultantId) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20 shadow-inner">
            <Stethoscope className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Consultant Portal Login
          </h2>
          <p className="text-xs text-slate-500">
            Enter your assigned Username and Login Password set by Admin to access your individual clinical workspace.
          </p>
        </div>

        {loginError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold text-center">
            {loginError}
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Login Username *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. drbilal"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full px-4 py-3 pl-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white text-sm"
              />
              <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Login Password *
            </label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 pl-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white text-sm"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />
            <span>Login to Consultant Portal</span>
          </button>
        </form>

        {/* Quick Account Autofill */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">
            Registered Doctor Accounts (Click to Fill)
          </div>
          <div className="grid grid-cols-1 gap-2">
            {consultants.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setLoginUsername(c.username);
                  setLoginPassword(c.password);
                }}
                className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{c.fullName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">User: {c.username} | Pass: {c.password}</div>
                </div>
                <span className="text-[10px] font-bold text-emerald-600">Select</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const consultantName = activeConsultantObj
    ? `${activeConsultantObj.fullName} (${activeConsultantObj.specialty})`
    : 'Dr. Bilal Ahmad (Cardiology & Int Medicine)';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 p-6 rounded-2xl border border-emerald-800/40 shadow-lg text-white">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Stethoscope className="w-4 h-4" />
            <span>Consultant Workspace &bull; {activeConsultantObj?.roomNumber || 'OPD'}</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              ACTIVE LOGGED IN
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">{consultantName}</h2>
          <p className="text-xs text-slate-300 mt-1">
            {activeConsultantObj?.qualification} &bull; Consultation Fee: Rs. {activeConsultantObj?.consultationFee}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Doctor Selector if logged in */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
            {consultants.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setLoggedInConsultantId(c.id);
                  if (onConsultantLogin) onConsultantLogin(c.id);
                  setActiveVisit(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedConsultant === c.id ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                {c.fullName.split(' ')[1] || c.fullName} ({c.roomNumber})
              </button>
            ))}
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout Portal</span>
          </button>
        </div>
      </div>


      {/* Tabs — only when no active visit */}
      {!activeVisit && (
        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button
            onClick={() => setInternalTab('queue')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              currentTab === 'queue'
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Waiting Patients</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
              {waitingVisits.length}
            </span>
          </button>

          <button
            onClick={() => setInternalTab('checked_queue')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              currentTab === 'checked_queue'
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Daily Checked Queue</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
              {checkedVisits.length}
            </span>
          </button>

          <button
            onClick={() => setInternalTab('lab_requests')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              currentTab === 'lab_requests'
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <TestTube className="w-4 h-4 text-amber-500" />
            <span>Diagnostic Requests</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
              {diagnosticRequestVisits.length}
            </span>
          </button>

          <button
            onClick={() => setInternalTab('lab_results_ready')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              currentTab === 'lab_results_ready'
                ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <AlertCircle className="w-4 h-4 text-amber-500 animate-pulse" />
            <span>Lab Results Ready</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
              {labResultsReadyOrders.length}
            </span>
          </button>

          <button
            onClick={() => setInternalTab('doctor_notes')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              currentTab === 'doctor_notes'
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-purple-500" />
            <span>Doctor Notes</span>
          </button>

          <button
            onClick={() => setInternalTab('report_review')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              currentTab === 'report_review'
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-500" />
            <span>Reports Inbox</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold">
              {consultantLabOrders.length + consultantUltrasoundOrders.length}
            </span>
          </button>
        </div>
      )}

      {/* Main Content */}
      <div>
        {activeVisit ? (
          /* ── PATIENT FORM ── */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg overflow-hidden">
            {/* Form Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 flex-wrap">
              <button
                onClick={() => setActiveVisit(null)}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Back to Queue"
              >
                <ArrowLeft className="w-6 h-6 text-slate-700 dark:text-slate-300" />
              </button>
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Active Patient Encounter
                  </span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    {activeVisit.patientName}
                    <span className="text-sm font-mono font-normal text-emerald-600">({activeVisit.mrNumber})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Visit: {activeVisit.visitNumber} &bull; Status:{' '}
                    <Badge variant="info">{activeVisit.status}</Badge>
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleCompleteEncounter}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Complete Encounter
                  </button>
                  <button
                    onClick={handleMarkCheckedOnly}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark Checked
                  </button>
                  <button
                    onClick={() => setIsLabModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-2"
                  >
                    <TestTube className="w-4 h-4" /> Order Lab
                  </button>
                  <button
                    onClick={() => setIsUltrasoundModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2"
                  >
                    <Radio className="w-4 h-4" /> Order Scan
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Vitals */}
              <div className="space-y-3">
                <button
                  onClick={() => setShowVitals(!showVitals)}
                  className="flex items-center gap-2 text-rose-600 font-bold uppercase tracking-wider text-sm hover:text-rose-700"
                >
                  <Stethoscope className="w-5 h-5" />
                  Patient Vital Signs &amp; Examination
                  <ChevronDown className={`w-4 h-4 transition-transform ${showVitals ? 'rotate-180' : ''}`} />
                </button>
                {showVitals && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border">
                    {(['bpSystolic', 'bpDiastolic', 'pulse', 'temp', 'weight'] as const).map((k) => (
                      <div key={k}>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 capitalize">{k}</label>
                        <input
                          type="text"
                          value={vitals[k]}
                          onChange={(e) => setVitals({ ...vitals, [k]: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border text-sm font-bold"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Diagnosis */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Chief Complaint *</label>
                  <input
                    type="text"
                    placeholder="e.g. Chest discomfort for 3 days"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Clinical Diagnosis *</label>
                  <input
                    type="text"
                    placeholder="e.g. Essential Hypertension Grade II"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border text-sm font-bold"
                  />
                </div>
              </div>

              {/* Prescription Table */}
              <div className="border border-emerald-500/30 rounded-3xl p-6 bg-emerald-50/20 dark:bg-slate-800/40 space-y-4">
                <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Digital Prescription
                </h4>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-4 px-4">Medicine</th>
                        <th className="py-4 px-4">Dose</th>
                        <th className="py-4 px-4">Frequency</th>
                        <th className="py-4 px-4">Duration</th>
                        <th className="py-4 px-4">Instructions</th>
                        <th className="py-4 px-4 text-center">Del</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {rxItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                            No medicines added yet.
                          </td>
                        </tr>
                      ) : (
                        rxItems.map((item: RxItem, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{item.medicineName}</td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{item.dosage}</td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{item.frequency}</td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{item.duration}</td>
                            <td className="py-3 px-4 text-slate-500 italic">{item.instructions}</td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => setRxItems(rxItems.filter((_: RxItem, i: number) => i !== idx))}
                                className="text-rose-500 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Add Medicine Row */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-4">
                    <input
                      list="medicines-list"
                      placeholder="Medicine Name"
                      value={newRxItem.medicineName}
                      onChange={(e) => setNewRxItem({ ...newRxItem, medicineName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-sm font-bold"
                    />
                    <datalist id="medicines-list">
                      {mockMedicines.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Dose"
                      value={newRxItem.dosage}
                      onChange={(e) => setNewRxItem({ ...newRxItem, dosage: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      placeholder="Instructions (After breakfast)"
                      value={newRxItem.instructions}
                      onChange={(e) => setNewRxItem({ ...newRxItem, instructions: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      onClick={handleAddMedicine}
                      className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center gap-2 hover:bg-slate-800"
                    >
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Save */}
              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={handleSavePrescription}
                  className="px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl flex items-center gap-2"
                >
                  <Send className="w-5 h-5" /> Save Prescription
                </button>
              </div>
            </div>
          </div>
        ) : currentTab === 'queue' ? (
          /* ── 1. WAITING PATIENTS QUEUE TABLE ── */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-600" /> Waiting Patients Queue
                </h3>
                <p className="text-xs text-slate-500">Patients waiting in OPD room or currently under consultation.</p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs">
                {waitingVisits.length} Waiting
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b">
                    <th className="py-4 px-6">Visit No</th>
                    <th className="py-4 px-6">Patient</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {waitingVisits.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 font-bold">
                        No waiting patients in queue.
                      </td>
                    </tr>
                  ) : (
                    waitingVisits.map((visit) => (
                      <tr key={visit.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-emerald-600">{visit.visitNumber}</td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 dark:text-white">{visit.patientName}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">MR: {visit.mrNumber}</div>
                        </td>
                        <td className="py-4 px-6">
                          <Badge
                            variant={
                              visit.status === 'WITH_CONSULTANT'
                                ? 'warning'
                                : 'info'
                            }
                          >
                            {visit.status === 'WITH_CONSULTANT' ? 'In Examination' : visit.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => {
                              setActiveVisit(visit);
                              if (visit.status === 'WAITING' || visit.status === 'REGISTERED') {
                                onUpdateVisitStatus(visit.id, 'WITH_CONSULTANT');
                              }
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 ml-auto"
                          >
                            <Stethoscope className="w-3.5 h-3.5" /> Start Examination
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : currentTab === 'checked_queue' ? (
          /* ── 2. DAILY CHECKED PATIENTS QUEUE TABLE ── */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Daily Checked Patients Queue
                </h3>
                <p className="text-xs text-slate-500">Patients who have completed consultation today.</p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                {checkedVisits.length} Checked
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b">
                    <th className="py-4 px-6">Visit No</th>
                    <th className="py-4 px-6">Patient</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {checkedVisits.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 font-bold">
                        No checked patients yet today.
                      </td>
                    </tr>
                  ) : (
                    checkedVisits.map((visit) => (
                      <tr key={visit.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-emerald-600">{visit.visitNumber}</td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 dark:text-white">{visit.patientName}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">MR: {visit.mrNumber}</div>
                        </td>
                        <td className="py-4 px-6">
                          <Badge variant="success">CHECKED</Badge>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => setActiveVisit(visit)}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Encounter
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : currentTab === 'lab_requests' ? (
          /* ── 3. DIAGNOSTIC REQUESTS QUEUE TABLE ── */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TestTube className="w-5 h-5 text-amber-500" /> Diagnostic Requests Queue
                </h3>
                <p className="text-xs text-slate-500">Patients referred for Laboratory or Ultrasound tests.</p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs">
                {diagnosticRequestVisits.length} Requested
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b">
                    <th className="py-4 px-6">Visit No</th>
                    <th className="py-4 px-6">Patient</th>
                    <th className="py-4 px-6">Diagnostic Service</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {diagnosticRequestVisits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                        No pending diagnostic request patients.
                      </td>
                    </tr>
                  ) : (
                    diagnosticRequestVisits.map((visit) => {
                      const matchingLabOrder = labOrders.find(
                        (l) => (l.visitId && l.visitId === visit.id) || l.mrNumber === visit.mrNumber
                      );
                      const isLabDelivered =
                        visit.status === 'COMPLETED' ||
                        (matchingLabOrder &&
                          (matchingLabOrder.status === 'REPORT_PREPARED' ||
                            matchingLabOrder.status === 'SUBMITTED_TO_CONSULTANT' ||
                            matchingLabOrder.status === 'ACCEPTED'));

                      return (
                        <tr key={visit.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-4 px-6 font-mono font-bold text-amber-600">{visit.visitNumber}</td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-slate-900 dark:text-white">{visit.patientName}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">MR: {visit.mrNumber}</div>
                          </td>
                          <td className="py-4 px-6">
                            {visit.status.startsWith('LAB') || matchingLabOrder ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold">
                                <TestTube className="w-3.5 h-3.5" /> Laboratory Test
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold">
                                <Radio className="w-3.5 h-3.5" /> Ultrasound Scan
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            {isLabDelivered ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> Report Delivered
                              </span>
                            ) : (
                              <Badge variant="warning">
                                {visit.status === 'LAB_REQUESTED' ? 'Lab Pending' : 'Ultrasound Pending'}
                              </Badge>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isLabDelivered && matchingLabOrder ? (
                                <button
                                  onClick={() => {
                                    setReviewingLabOrder(matchingLabOrder);
                                    setInternalTab('report_review');
                                  }}
                                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-1.5"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Review Delivered Report
                                </button>
                              ) : (
                                <button
                                  onClick={() => setActiveVisit(visit)}
                                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-1.5"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Open Encounter
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : currentTab === 'lab_results_ready' ? (
          /* ── 4. LAB RESULTS READY — Continue Encounter ── */
          <div className="space-y-4">
            {/* Header Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-900/40 via-slate-900 to-slate-900 border border-amber-600/30 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 animate-pulse" /> Lab Results Ready · Action Required
                </div>
                <h3 className="text-base font-black text-white">
                  {labResultsReadyOrders.length} Patient{labResultsReadyOrders.length !== 1 ? 's' : ''} Awaiting Consultation
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Lab reports have been delivered. Review results and continue the encounter to prescribe.
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <Microscope className="w-6 h-6 text-amber-400" />
              </div>
            </div>

            {labResultsReadyOrders.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                </div>
                <div className="font-bold text-slate-600 dark:text-slate-400 text-sm">All lab results reviewed</div>
                <div className="text-xs text-slate-400 mt-1">No patients are waiting for result-based follow-up.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {labResultsReadyOrders.map((lab) => {
                  // Find the associated visit for this lab order
                  const assocVisit = visits.find(
                    (v) => (lab.visitId && v.id === lab.visitId) || v.mrNumber === lab.mrNumber
                  );

                  // Parse and evaluate results
                  const testCode = lab.tests && lab.tests[0] ? lab.tests[0] : 'CBC';
                  const tmpl = getTemplateByCode(testCode) || DEFAULT_LAB_TEMPLATES[0];
                  let parsedResults: Record<string, string> = {};
                  const rawResults = lab.resultsV2 || lab.resultsV1 || '';
                  try { parsedResults = rawResults ? JSON.parse(rawResults) : {}; } catch { parsedResults = {}; }
                  const evaluated = labTemplateEngine.evaluateAllResults(tmpl, parsedResults);
                  const abnormals = evaluated.filter((r) => r.flag !== 'NORMAL');
                  const criticals = evaluated.filter((r) => r.flag === 'CRITICAL');

                  return (
                    <div
                      key={lab.id}
                      className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden shadow-sm transition-all ${
                        criticals.length > 0
                          ? 'border-rose-400/60 dark:border-rose-600/40'
                          : abnormals.length > 0
                          ? 'border-amber-400/60 dark:border-amber-600/40'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="p-4 flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            criticals.length > 0 ? 'bg-rose-100 dark:bg-rose-900/30' :
                            abnormals.length > 0 ? 'bg-amber-100 dark:bg-amber-900/30' :
                            'bg-emerald-100 dark:bg-emerald-900/30'
                          }`}>
                            <Microscope className={`w-5 h-5 ${
                              criticals.length > 0 ? 'text-rose-600' :
                              abnormals.length > 0 ? 'text-amber-600' :
                              'text-emerald-600'
                            }`} />
                          </div>
                          <div>
                            <div className="font-black text-slate-900 dark:text-white text-sm">{lab.patientName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">MR: {lab.mrNumber} · Order: {lab.orderNumber}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {criticals.length > 0 && (
                            <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 text-[11px] font-bold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> {criticals.length} Critical
                            </span>
                          )}
                          {abnormals.length > 0 && (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 text-[11px] font-bold">
                              {abnormals.length} Abnormal
                            </span>
                          )}
                          {abnormals.length === 0 && (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-[11px] font-bold">
                              All Normal
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tests Summary */}
                      <div className="px-4 py-3 bg-slate-50/60 dark:bg-slate-800/30">
                        <div className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-wider">
                          Test: {lab.tests.join(', ')}
                        </div>
                        {evaluated.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {evaluated.slice(0, 8).map((row) => (
                              <div
                                key={row.parameterId}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                  row.flag === 'CRITICAL'
                                    ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300'
                                    : row.flag === 'HIGH' || row.flag === 'LOW' || row.flag === 'ABNORMAL'
                                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                <span className="font-normal text-[10px] opacity-70">{row.parameterId}:</span>
                                <span>{row.value || '—'}</span>
                                {row.flag !== 'NORMAL' && (
                                  <span className="text-[9px]">
                                    {row.flag === 'CRITICAL' ? '‼' : row.flag === 'HIGH' ? '↑' : row.flag === 'LOW' ? '↓' : '!'}
                                  </span>
                                )}
                              </div>
                            ))}
                            {evaluated.length > 8 && (
                              <div className="px-2.5 py-1 rounded-lg text-[11px] text-slate-400 border border-dashed border-slate-300">
                                +{evaluated.length - 8} more
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic">
                            {rawResults ? 'Results recorded (free-text format)' : 'Report attached — open encounter to review'}
                          </div>
                        )}
                      </div>

                      {/* Action Footer */}
                      <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                        <div className="text-[11px] text-slate-500">
                          {assocVisit ? (
                            <>Visit: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{assocVisit.visitNumber}</span> · Status: <span className={`font-bold ${assocVisit.status === 'LAB_REQUESTED' ? 'text-amber-600' : 'text-blue-600'}`}>{assocVisit.status}</span></>
                          ) : (
                            <span className="text-slate-400 italic">Visit not in current queue</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setReviewingLabOrder(lab)}
                            className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> Full Report
                          </button>
                          {assocVisit && (
                            <button
                              onClick={() => {
                                setActiveVisit(assocVisit);
                              }}
                              className={`px-4 py-1.5 rounded-lg text-white text-[11px] font-bold inline-flex items-center gap-1.5 shadow-sm transition-all ${
                                criticals.length > 0
                                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                              }`}
                            >
                              <Stethoscope className="w-3.5 h-3.5" /> Continue Encounter
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : currentTab === 'report_review' ? (
          /* ── 4. DIAGNOSTIC REPORTS INBOX WITH ACCEPT / REVISE ── */
          <div className="space-y-6">
            {/* Summary Banner */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <TestTube className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Lab Reports</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">{consultantLabOrders.length}</div>
                  <div className="text-[11px] text-amber-600 font-semibold">{consultantLabOrders.filter(l => l.status === 'REPORT_PREPARED' || l.status === 'SUBMITTED_TO_CONSULTANT').length} awaiting review</div>
                </div>
              </div>
              <div className="flex-1 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Revisions Pending</div>
                  <div className="text-2xl font-black text-rose-600">{consultantLabOrders.filter(l => l.status === 'REVISION_REQUESTED').length}</div>
                  <div className="text-[11px] text-slate-400">Correction orders sent to lab</div>
                </div>
              </div>
              <div className="flex-1 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Accepted Reports</div>
                  <div className="text-2xl font-black text-emerald-600">{consultantLabOrders.filter(l => l.status === 'ACCEPTED').length}</div>
                  <div className="text-[11px] text-slate-400">Finalized in patient MRN file</div>
                </div>
              </div>
            </div>

            {/* Lab Orders Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <TestTube className="w-4 h-4 text-amber-500" /> Laboratory Results Inbox
              </h3>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-500 uppercase border-b">
                      <th className="py-3 px-4">Order No</th>
                      <th className="py-3 px-4">Patient / MRN</th>
                      <th className="py-3 px-4">Tests</th>
                      <th className="py-3 px-4">PDF Report</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {consultantLabOrders.length === 0 && (
                      <tr><td colSpan={6} className="py-8 text-center text-slate-400 font-bold">No lab reports in your inbox.</td></tr>
                    )}
                    {consultantLabOrders.map((lab) => (
                      <tr key={lab.id} className={`transition-colors ${
                        lab.status === 'REVISION_REQUESTED' ? 'bg-rose-50/40 dark:bg-rose-950/20' :
                        lab.status === 'ACCEPTED' ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : 'hover:bg-amber-50/20'
                      }`}>
                        <td className="py-3 px-4 font-mono font-bold text-amber-600">{lab.orderNumber}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{lab.patientName}</div>
                          <div className="font-mono text-[11px] text-amber-600">{lab.mrNumber}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 max-w-[140px] truncate">{lab.tests.join(', ')}</td>
                        <td className="py-3 px-4 font-mono text-emerald-600 text-[10px]">
                          {lab.attachedPdfName ? (
                            <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{lab.attachedPdfName}</span>
                          ) : <span className="text-slate-400">Pending</span>}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={
                            lab.status === 'ACCEPTED' ? 'success' :
                            lab.status === 'REVISION_REQUESTED' ? 'danger' :
                            (lab.status === 'REPORT_PREPARED' || lab.status === 'SUBMITTED_TO_CONSULTANT') ? 'warning' : 'neutral'
                          }>{lab.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setReviewingLabOrder(lab)}
                              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Review
                            </button>
                            {lab.status !== 'ACCEPTED' && (lab.resultsV1 || lab.resultsV2) && (
                              <button
                                onClick={() => { if (onAcceptLabReport) { onAcceptLabReport(lab.id); } }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] inline-flex items-center gap-1"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" /> Accept
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ultrasound Reports */}
            {consultantUltrasoundOrders.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Radio className="w-4 h-4 text-rose-500" /> Ultrasound Reports
                </h3>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-500 uppercase border-b">
                        <th className="py-3 px-4">Order No</th>
                        <th className="py-3 px-4">Patient / MRN</th>
                        <th className="py-3 px-4">Exam</th>
                        <th className="py-3 px-4">File</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {consultantUltrasoundOrders.map((us) => (
                        <tr key={us.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-4 font-mono font-bold text-rose-600">{us.orderNumber}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold">{us.patientName}</div>
                            <div className="font-mono text-[11px] text-rose-500">{us.mrNumber}</div>
                          </td>
                          <td className="py-3 px-4">{us.requestedExam}</td>
                          <td className="py-3 px-4 font-mono text-emerald-600 text-[10px]">{us.attachedFileName ?? '—'}</td>
                          <td className="py-3 px-4"><Badge variant={us.status === 'ACCEPTED' ? 'success' : 'info'}>{us.status}</Badge></td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setViewingFileModal({ title: `Ultrasound - ${us.orderNumber}`, fileName: us.attachedFileName ?? 'SCAN_REPORT.pdf', type: us.attachedImageBase64 ? 'image' : 'pdf', contentSummary: us.findingsV1 ?? 'Diagnostic scan completed.', imageBase64: us.attachedImageBase64, visitId: us.visitId })}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : currentTab === 'doctor_notes' ? (
          <DoctorNotesManager doctorName={consultantName} visits={visits} />
        ) : currentTab === 'patient_archive' ? (
          <PatientFileManager />
        ) : null}
      </div>

      {/* ── MODALS ── */}

      {/* Lab Report Full Review Modal */}
      {reviewingLabOrder && (
        <Modal
          isOpen
          onClose={() => setReviewingLabOrder(null)}
          title={`Lab Report Review — ${reviewingLabOrder.orderNumber}`}
          subtitle={`Patient: ${reviewingLabOrder.patientName} | MRN: ${reviewingLabOrder.mrNumber}`}
          maxWidth="2xl"
        >
          <LabReportInlineViewer
            order={reviewingLabOrder}
            onClose={() => setReviewingLabOrder(null)}
            onAccept={() => {
              if (onAcceptLabReport) onAcceptLabReport(reviewingLabOrder.id);
              setReviewingLabOrder(null);
              alert(`Lab report ${reviewingLabOrder.orderNumber} accepted and finalized in patient record!`);
            }}
            onRevise={(reason, comment) => {
              if (onRequestLabRevision) onRequestLabRevision(reviewingLabOrder.id, reason, comment);
              setReviewingLabOrder(null);
              alert(`Revision requested for ${reviewingLabOrder.orderNumber}. Lab notified.`);
            }}
          />
        </Modal>
      )}

      {/* Lab Order */}
      <Modal
        isOpen={isLabModalOpen}
        onClose={() => setIsLabModalOpen(false)}
        title="Order Lab Tests"
        subtitle={activeVisit?.patientName}
        maxWidth="md"
      >
        <form onSubmit={handleOrderLabSubmit} className="space-y-4 text-sm">
          <div className="space-y-2 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border">
            {['Complete Blood Count (CBC)', 'Lipid Profile', 'Liver Function Tests (LFT)', 'Renal Function Tests (RFT)', 'Urine Test'].map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={selectedTests.includes(t)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedTests([...selectedTests, t]);
                    else setSelectedTests(selectedTests.filter((item) => item !== t));
                  }}
                />
                <span>{t}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-between items-center font-bold border-t pt-2">
            <span>Total: Rs. {selectedTests.length * 900}</span>
            <button type="submit" className="px-5 py-2 bg-amber-600 text-white rounded-xl">Submit Order</button>
          </div>
        </form>
      </Modal>

      {/* Ultrasound Order */}
      <Modal
        isOpen={isUltrasoundModalOpen}
        onClose={() => setIsUltrasoundModalOpen(false)}
        title="Order Ultrasound"
        subtitle={activeVisit?.patientName}
        maxWidth="md"
      >
        <form onSubmit={handleOrderUltrasoundSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block font-bold mb-1">Select Ultrasound Scan *</label>
            <select
              value={usExamName}
              onChange={(e) => setUsExamName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border font-bold"
            >
              <option value="Abdominal & Pelvic Ultrasound">Abdominal &amp; Pelvic Ultrasound</option>
              <option value="Obstetric Anomaly Scan (2nd Trimester)">Obstetric Anomaly Scan (2nd Trimester)</option>
              <option value="Renal Ultrasound">Renal Ultrasound</option>
            </select>
          </div>
          <div className="flex justify-between items-center font-bold border-t pt-2">
            <span>Total: Rs. 3,000</span>
            <button type="submit" className="px-5 py-2 bg-rose-600 text-white rounded-xl">Submit Order</button>
          </div>
        </form>
      </Modal>

      {/* File Viewer */}
      {viewingFileModal !== null && (
        <Modal
          isOpen
          onClose={() => setViewingFileModal(null)}
          title={viewingFileModal.title}
          subtitle={`File: ${viewingFileModal.fileName}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono space-y-3 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <FileText className="w-4 h-4" /> {viewingFileModal.fileName}
                </span>
                {viewingFileModal.imageBase64 && (
                  <a
                    href={viewingFileModal.imageBase64}
                    download={viewingFileModal.fileName}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-sans font-bold transition"
                  >
                    Download File
                  </a>
                )}
              </div>

              {viewingFileModal.imageBase64 != null ? (
                <div className="flex justify-center min-h-[320px] max-h-[500px] overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-2">
                  {viewingFileModal.imageBase64.startsWith('data:application/pdf') ? (
                    <iframe src={viewingFileModal.imageBase64} title="Report PDF" className="w-full min-h-[450px] border-0 rounded" />
                  ) : (
                    <img src={viewingFileModal.imageBase64} alt="Report Attachment" className="max-w-full object-contain mx-auto rounded shadow" />
                  )}
                </div>
              ) : null}

              {viewingFileModal.contentSummary && (
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Diagnostic Summary / Notes:</div>
                  <div className="text-slate-200 font-sans text-xs leading-relaxed whitespace-pre-wrap">{viewingFileModal.contentSummary}</div>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <span>Verified Diagnostic File</span>
                <span className="text-emerald-400 font-bold">Stored in MongoDB Atlas</span>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setViewingFileModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ConsultantPortal;

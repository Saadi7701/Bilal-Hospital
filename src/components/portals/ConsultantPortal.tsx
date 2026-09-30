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
  onConsultantLogin,
  onConsultantLogout,
}) => {
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
    (v) => isConsultantForVisit(v) && (v.status === "LAB_REQUESTED" || v.status === "ULTRASOUND_REQUESTED")
  );

  const consultantLabOrders = labOrders.filter((l) => {
    const isDoc1Match =
      selectedConsultant === "doc-1" &&
      (l.consultantId === "doc-1" ||
        l.consultantName?.toLowerCase().includes("bilal") ||
        !l.consultantId);
    const isDoc2Match =
      selectedConsultant === "doc-2" &&
      (l.consultantId === "doc-2" || l.consultantName?.toLowerCase().includes("sarah"));
    return isDoc1Match || isDoc2Match || l.consultantId === selectedConsultant;
  });

  const consultantUltrasoundOrders = ultrasoundOrders.filter((u) => {
    const isDoc1Match =
      selectedConsultant === "doc-1" &&
      (u.consultantId === "doc-1" ||
        u.consultantName?.toLowerCase().includes("bilal") ||
        !u.consultantId);
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
    alert(`Patient ${activeVisit.patientName} marked as CHECKED / COMPLETED! Moved to Daily Checked Patients Queue.`);
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
                    <th className="py-4 px-6">Reason for Visit</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {waitingVisits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
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
                        <td className="py-4 px-6 text-slate-600 text-sm max-w-xs truncate">{visit.reasonForVisit}</td>
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
                    <th className="py-4 px-6">Reason / Notes</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {checkedVisits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
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
                        <td className="py-4 px-6 text-slate-600 text-sm max-w-xs truncate">{visit.reasonForVisit}</td>
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
                    diagnosticRequestVisits.map((visit) => (
                      <tr key={visit.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-amber-600">{visit.visitNumber}</td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 dark:text-white">{visit.patientName}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">MR: {visit.mrNumber}</div>
                        </td>
                        <td className="py-4 px-6">
                          {visit.status === 'LAB_REQUESTED' ? (
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
                          <Badge variant="warning">
                            {visit.status === 'LAB_REQUESTED' ? 'Lab Pending' : 'Ultrasound Pending'}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => setActiveVisit(visit)}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" /> Open Encounter
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : currentTab === 'report_review' ? (
          /* ── 4. DIAGNOSTIC REPORTS INBOX ── */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-500" /> Diagnostic Report Files &amp; Reviews
              </h3>
              <span className="text-xs font-bold text-slate-500">
                Total Files: {consultantLabOrders.length + consultantUltrasoundOrders.length}
              </span>
            </div>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-500 uppercase border-b">
                    <th className="py-3 px-4">Order No</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">File</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {consultantLabOrders.map((lab) => (
                    <tr key={lab.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-mono font-bold text-amber-600">{lab.orderNumber}</td>
                      <td className="py-3 px-4"><Badge variant="warning">LAB</Badge></td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{lab.patientName}</td>
                      <td className="py-3 px-4 font-mono text-emerald-600">{lab.attachedPdfName ?? 'LAB_REPORT_FINAL.pdf'}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() =>
                            setViewingFileModal({
                              title: `Lab Report - ${lab.orderNumber}`,
                              fileName: lab.attachedPdfName ?? 'LAB_REPORT_FINAL.pdf',
                              type: lab.attachedImageBase64 ? 'image' : 'pdf',
                              contentSummary: lab.resultsV2 || lab.resultsV1 || 'Diagnostic Report Prepared',
                              imageBase64: lab.attachedImageBase64,
                              visitId: lab.visitId,
                            })
                          }
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <Eye className="w-4 h-4" /> View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                  {consultantUltrasoundOrders.map((us) => (
                    <tr key={us.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-mono font-bold text-rose-600">{us.orderNumber}</td>
                      <td className="py-3 px-4"><Badge variant="danger">ULTRASOUND</Badge></td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{us.patientName}</td>
                      <td className="py-3 px-4 font-mono text-emerald-600">{us.attachedFileName ?? 'SCAN_REPORT.pdf'}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() =>
                            setViewingFileModal({
                              title: `Ultrasound - ${us.orderNumber}`,
                              fileName: us.attachedFileName ?? 'SCAN_REPORT.pdf',
                              type: us.attachedImageBase64 ? 'image' : 'pdf',
                              contentSummary: us.findingsV1 ?? 'Diagnostic scan report completed.',
                              imageBase64: us.attachedImageBase64,
                              visitId: us.visitId,
                            })
                          }
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <Eye className="w-4 h-4" /> View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                  {consultantLabOrders.length === 0 && consultantUltrasoundOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                        No uploaded reports found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : currentTab === 'doctor_notes' ? (
          <DoctorNotesManager doctorName={consultantName} visits={visits} />
        ) : currentTab === 'patient_archive' ? (
          <PatientFileManager />
        ) : null}
      </div>

      {/* ── MODALS ── */}

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

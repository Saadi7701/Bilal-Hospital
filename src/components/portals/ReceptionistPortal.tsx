import React, { useState } from "react";
import {
  Search,
  UserPlus,
  Calendar,
  CreditCard,
  Printer,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Building,
  Bed,
  Receipt,
  Phone,
  FileText,
  Send,
  LogOut,
  Clock,
  Activity,
  Layers,
  TestTube,
  Radio,
  Stethoscope,
} from "lucide-react";
import { StatCard } from "../ui/StatCard";
import { Badge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import {
  PatientRecord,
  VisitRecord,
  AdmissionRecord,
  CashTransactionRecord,
} from "../../lib/mockDataStore";
import { HospitalFormsManager } from "../forms/HospitalFormsManager";
import { PatientFileManager } from "./PatientFileManager";

interface ReceptionistPortalProps {
  activeTab: string;
  patients: PatientRecord[];
  visits: VisitRecord[];
  admissions: AdmissionRecord[];
  onAddPatient: (patient: PatientRecord) => void;
  onAddVisit: (visit: VisitRecord, transaction: CashTransactionRecord) => void;
  onAddAdmission: (admission: AdmissionRecord, transaction: CashTransactionRecord) => void;
  onDischargePatient: (admissionId: string) => void;
}

export const ReceptionistPortal: React.FC<ReceptionistPortalProps> = ({
  activeTab,
  patients,
  visits,
  admissions,
  onAddPatient,
  onAddVisit,
  onAddAdmission,
  onDischargePatient,
}) => {

  const [searchQuery, setSearchQuery] = useState("");
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedPatientForVisit, setSelectedPatientForVisit] = useState<PatientRecord | null>(null);
  const [printedReceipt, setPrintedReceipt] = useState<VisitRecord | null>(null);

  // New Patient Registration State
  const [newPatient, setNewPatient] = useState({
    fullName: "",
    fatherHusbandName: "",
    gender: "Male",
    age: "",
    phone: "",
    cnic: "",
    bloodGroup: "B+",
    notes: "",
  });

  // Duplicate Check
  const duplicateMatch = patients.find(
    (p) =>
      (newPatient.phone && p.phone === newPatient.phone) ||
      (newPatient.cnic && p.cnic === newPatient.cnic)
  );

  // ALL-IN-ONE INTAKE FORM STATE
  const [destinationType, setDestinationType] = useState<
    "OPD" | "OT" | "GYNECOLOGY" | "LAB" | "ULTRASOUND"
  >("OPD");

  // OPD Consultant Selection
  const [selectedConsultantId, setSelectedConsultantId] = useState("doc-1");

  // OT / Gynecology Specific Form Fields
  const [procedureSurgeon, setProcedureSurgeon] = useState("Dr. Bilal Ahmad");
  const [otProcedureName, setOtProcedureName] = useState("Laparoscopic Cholecystectomy");
  const [otRoom, setOtRoom] = useState("OT Room # 02");
  const [gyneWardBed, setGyneWardBed] = useState("Gyne Ward 104 / Bed 02");

  // Direct Lab / Ultrasound Selections
  const [selectedLabTests, setSelectedLabTests] = useState<string[]>([
    "Complete Blood Count (CBC)",
    "Lipid Profile",
  ]);
  const [selectedUsExam, setSelectedUsExam] = useState("Abdominal & Pelvic Ultrasound");

  const [reasonForVisit, setReasonForVisit] = useState("");
  const [visitFee, setVisitFee] = useState(2000);
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  // Filtered Patients Search
  const filteredPatients = patients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.mrNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery) ||
      p.cnic.includes(searchQuery)
  );

  // Active Consultants for Today List
  const activeConsultantsList = [
    { id: "doc-1", name: "Dr. Bilal Ahmad", dept: "Cardiology & Internal Medicine", fee: 2000 },
    { id: "doc-2", name: "Dr. Sarah Fatima", dept: "Gynecology & Obstetrics", fee: 2500 },
    { id: "doc-3", name: "Dr. Kamran Raza", dept: "Sonology & Ultrasound", fee: 3000 },
    { id: "doc-4", name: "Dr. Tariq Mahmood", dept: "Pathology & Laboratory", fee: 1800 },
  ];

  const handleRegisterPatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.fullName || !newPatient.phone) return;

    const createdPatient: PatientRecord = {
      id: `pat-${Date.now()}`,
      mrNumber: `MR-2026-${String(patients.length + 1).padStart(4, "0")}`,
      fullName: newPatient.fullName,
      fatherHusbandName: newPatient.fatherHusbandName,
      gender: newPatient.gender,
      age: parseInt(newPatient.age) || 30,
      phone: newPatient.phone,
      cnic: newPatient.cnic || "35202-0000000-0",
      bloodGroup: newPatient.bloodGroup,
      notes: newPatient.notes,
      registrationDate: new Date().toISOString().split("T")[0],
    };

    onAddPatient(createdPatient);
    setSelectedPatientForVisit(createdPatient);
    setIsRegisterModalOpen(false);
  };

  const handleAllInOneIntakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForVisit) return;

    const arrivalNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const dateNow = new Date().toISOString().split("T")[0];

    if (destinationType === "OPD") {
      const activeDoc = activeConsultantsList.find((c) => c.id === selectedConsultantId);
      const docName = activeDoc ? activeDoc.name : "Dr. Bilal Ahmad";
      const deptName = activeDoc ? activeDoc.dept : "Cardiology";

      const newVisit: VisitRecord = {
        id: `vis-${Date.now()}`,
        visitNumber: `VIS-2026-${String(visits.length + 901)}`,
        patientId: selectedPatientForVisit.id,
        patientName: selectedPatientForVisit.fullName,
        mrNumber: selectedPatientForVisit.mrNumber,
        destinationType: "OPD",
        consultantId: selectedConsultantId,
        consultantName: docName,
        department: deptName,
        consultationFee: visitFee,
        amountReceived: visitFee,
        paymentMethod,
        status: "WAITING",
        reasonForVisit: reasonForVisit || "OPD Consultation",
        visitDate: dateNow,
        arrivalTime: arrivalNow,
      };

      const newLedgerTxn: CashTransactionRecord = {
        id: `txn-${Date.now()}`,
        transactionNumber: `TXN-2026-${String(Date.now()).slice(-4)}`,
        transactionType: "INCOME",
        category: "Consultation Fee",
        department: deptName,
        amount: visitFee,
        paymentMethod,
        description: `OPD Consultation Fee (${docName}) - ${selectedPatientForVisit.fullName}`,
        date: dateNow,
        time: arrivalNow,
        patientName: selectedPatientForVisit.fullName,
        mrNumber: selectedPatientForVisit.mrNumber,
        createdBy: "Ayesha Khan (Receptionist)",
      };

      onAddVisit(newVisit, newLedgerTxn);
      setPrintedReceipt(newVisit);
      alert(`Patient dispatched to ${docName}'s queue! Status: WAITING`);
    } else if (destinationType === "OT" || destinationType === "GYNECOLOGY") {
      const isOt = destinationType === "OT";
      const admFee = isOt ? 35000 : 45000;

      const newAdmission: AdmissionRecord = {
        id: `adm-${Date.now()}`,
        admissionNumber: `ADM-${isOt ? "OT" : "GYN"}-2026-${String(admissions.length + 10)}`,
        patientId: selectedPatientForVisit.id,
        patientName: selectedPatientForVisit.fullName,
        mrNumber: selectedPatientForVisit.mrNumber,
        admissionType: isOt ? "OT" : "GYNECOLOGY",
        department: isOt ? "Surgery / OT" : "Gynecology Ward",
        doctorName: procedureSurgeon,
        procedureOrDiagnosis: isOt ? otProcedureName : "Elective C-Section / Ward Care",
        wardRoomBed: isOt ? otRoom : gyneWardBed,
        admissionInTime: `${dateNow} ${arrivalNow}`,
        status: "ADMITTED",
        feeAmount: admFee,
      };

      const newVisit: VisitRecord = {
        id: `vis-${Date.now()}`,
        visitNumber: `VIS-2026-${String(visits.length + 901)}`,
        patientId: selectedPatientForVisit.id,
        patientName: selectedPatientForVisit.fullName,
        mrNumber: selectedPatientForVisit.mrNumber,
        destinationType: isOt ? "OT" : "GYNECOLOGY",
        consultantId: "doc-1",
        consultantName: procedureSurgeon,
        department: isOt ? "OT" : "Gynecology",
        consultationFee: admFee,
        amountReceived: admFee,
        paymentMethod,
        status: "ADMITTED",
        reasonForVisit: isOt ? otProcedureName : "Gynecology Admission",
        visitDate: dateNow,
        arrivalTime: arrivalNow,
        admissionInTime: `${dateNow} ${arrivalNow}`,
        roomBedNumber: isOt ? otRoom : gyneWardBed,
      };

      const newLedgerTxn: CashTransactionRecord = {
        id: `txn-${Date.now()}`,
        transactionNumber: `TXN-2026-${String(Date.now()).slice(-4)}`,
        transactionType: "INCOME",
        category: isOt ? "OT Charges" : "Gynecology Admission",
        department: isOt ? "OT" : "Gynecology",
        amount: admFee,
        paymentMethod,
        description: `Admission Charge (${newAdmission.admissionNumber}) - ${selectedPatientForVisit.fullName}`,
        date: dateNow,
        time: arrivalNow,
        patientName: selectedPatientForVisit.fullName,
        mrNumber: selectedPatientForVisit.mrNumber,
        createdBy: "Ayesha Khan (Receptionist)",
      };

      onAddAdmission(newAdmission, newLedgerTxn);
      onAddVisit(newVisit, newLedgerTxn);
      setPrintedReceipt(newVisit);
      alert(`Patient admitted into ${isOt ? "OT" : "Gyne Ward"}! Record added to Admission In/Out Tracker.`);
    } else {
      // Direct Lab or Ultrasound
      const isLab = destinationType === "LAB";
      const serviceFee = isLab ? selectedLabTests.length * 900 : 3000;

      const newVisit: VisitRecord = {
        id: `vis-${Date.now()}`,
        visitNumber: `VIS-2026-${String(visits.length + 901)}`,
        patientId: selectedPatientForVisit.id,
        patientName: selectedPatientForVisit.fullName,
        mrNumber: selectedPatientForVisit.mrNumber,
        destinationType: isLab ? "LAB" : "ULTRASOUND",
        consultantId: isLab ? "doc-4" : "doc-3",
        consultantName: isLab ? "Dr. Tariq Mahmood" : "Dr. Kamran Raza",
        department: isLab ? "Laboratory" : "Ultrasound",
        consultationFee: serviceFee,
        amountReceived: serviceFee,
        paymentMethod,
        status: isLab ? "LAB_REQUESTED" : "ULTRASOUND_REQUESTED",
        reasonForVisit: isLab ? selectedLabTests.join(", ") : selectedUsExam,
        visitDate: dateNow,
        arrivalTime: arrivalNow,
      };

      const newLedgerTxn: CashTransactionRecord = {
        id: `txn-${Date.now()}`,
        transactionNumber: `TXN-2026-${String(Date.now()).slice(-4)}`,
        transactionType: "INCOME",
        category: isLab ? "Laboratory Test" : "Ultrasound",
        department: isLab ? "Laboratory" : "Ultrasound",
        amount: serviceFee,
        paymentMethod,
        description: `${isLab ? "Lab Test Fee" : "Ultrasound Scan Fee"} - ${selectedPatientForVisit.fullName}`,
        date: dateNow,
        time: arrivalNow,
        patientName: selectedPatientForVisit.fullName,
        mrNumber: selectedPatientForVisit.mrNumber,
        createdBy: "Ayesha Khan (Receptionist)",
      };

      onAddVisit(newVisit, newLedgerTxn);
      setPrintedReceipt(newVisit);
      alert(`Direct ${isLab ? "Lab Order" : "Ultrasound Scan"} registered! Fee collected.`);
    }

    setSelectedPatientForVisit(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-slate-900 to-slate-900 p-6 rounded-2xl border border-blue-800/40 shadow-lg text-white">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Building className="w-4 h-4" />
            <span>OPD Reception Desk & Admission Operations</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            All-in-One Patient Intake & Dispatch Center
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Register patients, select OPD Consultant, OT or Gynecology Admission, collect fees, and track live statuses in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Register New Patient Profile</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Patients"
          value={patients.length}
          subtitle="Hospital MR Profiles"
          icon={UserCheck}
          iconBg="bg-blue-500/10 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          title="Daily Encounters"
          value={visits.length}
          subtitle="OPD, OT, Gyne, Lab & US"
          icon={Calendar}
          iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          title="Active Admissions (OT/Gyne)"
          value={admissions.filter((a) => a.status !== "DISCHARGED").length}
          subtitle="In-Patient Stay Tracker"
          icon={Bed}
          iconBg="bg-purple-500/10 text-purple-600 dark:text-purple-400"
        />
        <StatCard
          title="Consultation Cash Collected"
          value={`Rs. ${visits
            .reduce((acc, v) => acc + v.amountReceived, 0)
            .toLocaleString()}`}
          subtitle="Automated Cash Ledger Log"
          icon={CreditCard}
          iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* VIEW: PATIENT SEARCH & REGISTRATION */}
      {activeTab === "patient_search" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Master Patient Index by MR, Name, Phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-[10px] font-bold uppercase text-slate-400">
                    <th className="py-2 px-3">MR No</th>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Phone</th>
                    <th className="py-2 px-3">CNIC</th>
                    <th className="py-2 px-3">Registered Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-200 dark:hover:bg-slate-800">
                      <td className="py-2 px-3 font-mono font-bold text-brand-600">{p.mrNumber}</td>
                      <td className="py-2 px-3 font-bold">{p.fullName}</td>
                      <td className="py-2 px-3 font-mono">{p.phone}</td>
                      <td className="py-2 px-3 font-mono">{p.cnic}</td>
                      <td className="py-2 px-3 font-mono">{p.registrationDate || "-"}</td>
                    </tr>
                  ))}
                  {filteredPatients.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-500">No patients found. Click top button to register.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: NEW ENCOUNTER (All-In-One Intake Form) */}
      {activeTab === "new_visit" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Patient to Start Intake..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>
              <span className="text-xs text-slate-500">
                Search & Select to start <strong>Intake & Dispatch Form</strong>
              </span>
            </div>

            {searchQuery && !selectedPatientForVisit && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-[10px] font-bold uppercase text-slate-400">
                      <th className="py-2 px-3">MR No</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-200 dark:hover:bg-slate-800">
                        <td className="py-2 px-3 font-mono font-bold text-brand-600">{p.mrNumber}</td>
                        <td className="py-2 px-3 font-bold">{p.fullName}</td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => setSelectedPatientForVisit(p)}
                            className="px-3 py-1 rounded-lg bg-brand-600 text-white font-bold text-xs"
                          >
                            + Select for Visit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ALL-IN-ONE INTAKE FORM (When Patient Selected) */}
          {selectedPatientForVisit && (
            <div className="bg-white dark:bg-slate-900 border-2 border-brand-500 rounded-2xl shadow-xl p-6 space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
                    All-in-One Patient Intake & Dispatch Form
                  </span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    {selectedPatientForVisit.fullName}{" "}
                    <span className="text-xs font-mono font-bold text-slate-400">
                      ({selectedPatientForVisit.mrNumber})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Phone: {selectedPatientForVisit.phone} • CNIC: {selectedPatientForVisit.cnic}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedPatientForVisit(null)}
                  className="px-3 py-1.5 rounded-lg border text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Close Form
                </button>
              </div>

              <form onSubmit={handleAllInOneIntakeSubmit} className="space-y-4 text-xs">
                {/* DYNAMIC DESTINATION SELECTOR DROPDOWN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-brand-50/40 dark:bg-slate-800/40 p-4 rounded-xl border border-brand-200 dark:border-slate-700">
                  <div>
                    <label className="block font-extrabold text-slate-900 dark:text-white mb-1">
                      Select Patient Destination / Service Required *
                    </label>
                    <select
                      value={destinationType}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setDestinationType(val);
                        if (val === "OPD") setVisitFee(2000);
                        else if (val === "OT") setVisitFee(35000);
                        else if (val === "GYNECOLOGY") setVisitFee(45000);
                        else if (val === "LAB") setVisitFee(1800);
                        else if (val === "ULTRASOUND") setVisitFee(3000);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border-2 border-brand-500 text-xs font-extrabold text-brand-600 dark:text-brand-400"
                    >
                      <option value="OPD">1. OPD Consultation (Assigned Doctor Queue)</option>
                      <option value="OT">2. OT - Operation Theater Admission</option>
                      <option value="GYNECOLOGY">3. Gynecology Ward Admission</option>
                      <option value="LAB">4. Direct Laboratory Test Request</option>
                      <option value="ULTRASOUND">5. Direct Ultrasound Scan Request</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Reason for Visit / Symptoms *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chest pain, routine checkup, elective surgery..."
                      value={reasonForVisit}
                      onChange={(e) => setReasonForVisit(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium"
                    />
                  </div>
                </div>

                {/* DYNAMIC FIELD SECTION BASED ON DESTINATION */}
                {destinationType === "OPD" && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border space-y-3">
                    <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-brand-500" />
                      <span>Active Consultants Available Today:</span>
                    </h4>
                    <select
                      value={selectedConsultantId}
                      onChange={(e) => {
                        setSelectedConsultantId(e.target.value);
                        const doc = activeConsultantsList.find((c) => c.id === e.target.value);
                        if (doc) setVisitFee(doc.fee);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                    >
                      {activeConsultantsList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.dept} (Fee: Rs. {c.fee})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {destinationType === "OT" && (
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-3">
                    <h4 className="font-extrabold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                      <Building className="w-4 h-4" />
                      <span>Operation Theater (OT) Admission Details:</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold mb-1">OT Procedure Name</label>
                        <input
                          type="text"
                          value={otProcedureName}
                          onChange={(e) => setOtProcedureName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Surgeon Name</label>
                        <input
                          type="text"
                          value={procedureSurgeon}
                          onChange={(e) => setProcedureSurgeon(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">OT Room / Bed Assignment</label>
                        <input
                          type="text"
                          value={otRoom}
                          onChange={(e) => setOtRoom(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {destinationType === "GYNECOLOGY" && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                    <h4 className="font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <Bed className="w-4 h-4" />
                      <span>Gynecology Ward Admission Details:</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold mb-1">Attending Gynecologist</label>
                        <input
                          type="text"
                          value={procedureSurgeon}
                          onChange={(e) => setProcedureSurgeon(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Ward Name & Bed Number</label>
                        <input
                          type="text"
                          value={gyneWardBed}
                          onChange={(e) => setGyneWardBed(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* FEE COLLECTION & PAYMENT METHOD */}
                <div className="grid grid-cols-2 gap-4 border-t pt-3">
                  <div>
                    <label className="block font-bold mb-1">Total Fee Amount (Rs.)</label>
                    <input
                      type="number"
                      value={visitFee}
                      onChange={(e) => setVisitFee(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono font-bold text-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border"
                    >
                      <option value="CASH">Cash</option>
                      <option value="CARD">Credit/Debit Card</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Collect Fee & Dispatch to Consultant Queue</span>
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      )}

      {/* VIEW: OVERVIEW - SINGLE DAILY MASTER PATIENT TABLE */}
      {activeTab === "overview" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-500" />
                <span>Single Master Daily Patient Record Table</span>
              </h3>
              <span className="text-xs text-slate-500 font-semibold">
                {visits.length} Daily Patients Recorded
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 uppercase border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-4">Visit ID</th>
                    <th className="py-3 px-4">Arrival Time</th>
                    <th className="py-3 px-4">Patient Name & MR No</th>
                    <th className="py-3 px-4">Destination Type</th>
                    <th className="py-3 px-4">Assigned Consultant / Doctor</th>
                    <th className="py-3 px-4">Reason for Visit</th>
                    <th className="py-3 px-4">Fee Paid</th>
                    <th className="py-3 px-4">Live Status</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {visit.visitNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {visit.arrivalTime}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {visit.patientName}
                        <span className="block text-[10px] font-mono text-slate-400">
                          {visit.mrNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            visit.destinationType === "OT"
                              ? "danger"
                              : visit.destinationType === "GYNECOLOGY"
                              ? "purple"
                              : "info"
                          }
                        >
                          {visit.destinationType || "OPD"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-semibold text-brand-600 dark:text-brand-400">
                        {visit.consultantName}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {visit.reasonForVisit}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                        Rs. {visit.amountReceived}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            visit.status === "CHECKED" || visit.status === "COMPLETED"
                              ? "success"
                              : visit.status === "WAITING"
                              ? "warning"
                              : visit.status === "WITH_CONSULTANT"
                              ? "info"
                              : "neutral"
                          }
                        >
                          {visit.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setPrintedReceipt(visit)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      )}

      {/* VIEW 2: DEDICATED IN/OUT ADMISSION TRACKER (OT & GYNECOLOGY) */}
      {activeTab === "ot_gyne_reg" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Bed className="w-5 h-5 text-purple-500" />
              <span>OT & Gynecology Multi-Day Admission In/Out Tracker</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Long-stay patient tracking with exact Admission IN Date/Time, Discharge OUT Date/Time, and bed release controls.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 uppercase border-b">
                  <th className="py-3.5 px-4">Admission ID</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Patient Name & MR No</th>
                  <th className="py-3.5 px-4">Attending Surgeon / Gynecologist</th>
                  <th className="py-3.5 px-4">Procedure / Diagnosis</th>
                  <th className="py-3.5 px-4">Ward / Room / Bed</th>
                  <th className="py-3.5 px-4 bg-emerald-500/10 text-emerald-600">Admission IN Time</th>
                  <th className="py-3.5 px-4 bg-rose-500/10 text-rose-600">Discharge OUT Time</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Discharge Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {admissions.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {adm.admissionNumber}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={adm.admissionType === "OT" ? "danger" : "purple"}>
                        {adm.admissionType}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {adm.patientName}
                      <span className="block text-[10px] font-mono text-slate-400">{adm.mrNumber}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-brand-600">{adm.doctorName}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{adm.procedureOrDiagnosis}</td>
                    <td className="py-3 px-4 font-mono font-bold">{adm.wardRoomBed}</td>
                    <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {adm.admissionInTime}
                    </td>
                    <td className="py-3 px-4 font-mono text-rose-600 dark:text-rose-400 font-bold">
                      {adm.dischargeOutTime || "STILL ADMITTED"}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={adm.status === "DISCHARGED" ? "neutral" : "success"}>
                        {adm.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {adm.status !== "DISCHARGED" ? (
                        <button
                          onClick={() => {
                            onDischargePatient(adm.id);
                            alert(`Patient ${adm.patientName} discharged! OUT Date/Time recorded.`);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Discharge Patient</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">Discharged</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: HOSPITAL FORMS */}
      {activeTab === "hospital_forms" && (
        <HospitalFormsManager patients={patients} />
      )}

      {/* VIEW: PATIENT FILE ARCHIVE */}
      {activeTab === "patient_archive" && (
        <PatientFileManager />
      )}

      {/* Modal: Register Patient Profile */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Register New Permanent Patient Profile"
        subtitle="Creates unique MR Number"
        maxWidth="2xl"
      >
        <form onSubmit={handleRegisterPatientSubmit} className="space-y-4 text-xs">
          {duplicateMatch && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 font-bold">
              Duplicate Warning: Phone {duplicateMatch.phone} already registered under MR {duplicateMatch.mrNumber}!
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold mb-1">Full Patient Name *</label>
              <input
                type="text"
                required
                value={newPatient.fullName}
                onChange={(e) => setNewPatient({ ...newPatient, fullName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Father / Husband Name</label>
              <input
                type="text"
                value={newPatient.fatherHusbandName}
                onChange={(e) => setNewPatient({ ...newPatient, fatherHusbandName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Gender *</label>
              <select
                value={newPatient.gender}
                onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">Age *</label>
              <input
                type="number"
                required
                value={newPatient.age}
                onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={newPatient.phone}
                onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border font-mono"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">CNIC / National ID</label>
              <input
                type="text"
                value={newPatient.cnic}
                onChange={(e) => setNewPatient({ ...newPatient, cnic: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(false)}
              className="px-4 py-2 rounded-xl border"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-600 text-white font-bold"
            >
              Save Profile & Start Intake
            </button>
          </div>
        </form>
      </Modal>

      {/* Printed Receipt Modal */}
      {printedReceipt && (
        <Modal
          isOpen={!!printedReceipt}
          onClose={() => setPrintedReceipt(null)}
          title="Patient Payment & Appointment Slip"
          subtitle="Bilal Hospital Official Collection Slip"
          maxWidth="md"
        >
          <div className="border-2 border-dashed p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 space-y-4 font-mono text-xs text-slate-900 dark:text-white">
            <div className="text-center border-b pb-3">
              <h2 className="text-base font-black tracking-wider">BILAL HOSPITAL</h2>
              <p className="text-[10px] text-slate-500">Official Payment & Admission Slip</p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Slip No:</span>
                <span className="font-bold">{printedReceipt.visitNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">MR Number:</span>
                <span className="font-bold text-brand-600">{printedReceipt.mrNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Patient Name:</span>
                <span className="font-bold">{printedReceipt.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Destination:</span>
                <span className="font-bold">{printedReceipt.destinationType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Doctor / Consultant:</span>
                <span className="font-bold">{printedReceipt.consultantName}</span>
              </div>
            </div>

            <div className="border-t border-b py-2 flex justify-between font-bold text-sm">
              <span>Fee Received ({printedReceipt.paymentMethod}):</span>
              <span className="text-emerald-600">Rs. {printedReceipt.amountReceived}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => {
                window.print();
                setPrintedReceipt(null);
              }}
              className="px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs"
            >
              Print Receipt
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

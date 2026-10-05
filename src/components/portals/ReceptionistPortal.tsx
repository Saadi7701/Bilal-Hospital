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
  Plus,
  Filter,
  ShieldCheck,
  FileSpreadsheet,
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
import { HospitalFormPrintView } from "../forms/HospitalFormPrintView";

interface ReceptionistPortalProps {
  activeTab: string;
  patients: PatientRecord[];
  visits: VisitRecord[];
  admissions: AdmissionRecord[];
  onAddPatient: (patient: PatientRecord) => void;
  onAddVisit: (visit: VisitRecord, transaction: CashTransactionRecord) => void;
  onAddAdmission: (admission: AdmissionRecord, transaction: CashTransactionRecord) => void;
  onDischargePatient: (
    admissionId: string,
    dischargeOutTime?: string,
    dischargeCondition?: string,
    dischargeDiagnosis?: string,
    dischargeAdvice?: string
  ) => void;
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
  const [selectedUsExam, setSelectedUsExam] = useState("Pelvic / Whole Abdomen Scan");

  // Fee & Payment State
  const [visitFee, setVisitFee] = useState<number>(2000);
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  // DEDICATED OT / GYNECOLOGY ADMISSION FORM MODAL STATE
  const [isAdmissionModalOpen, setIsAdmissionModalOpen] = useState(false);
  const [admPatientSearchInput, setAdmPatientSearchInput] = useState("");
  const [selectedPatientForAdm, setSelectedPatientForAdm] = useState<PatientRecord | null>(null);
  const [admCustomMrn, setAdmCustomMrn] = useState("");
  const [admCustomName, setAdmCustomName] = useState("");
  const [admCustomCnic, setAdmCustomCnic] = useState("");
  const [admCustomAge, setAdmCustomAge] = useState<number>(35);
  const [admCustomGender, setAdmCustomGender] = useState("Female");
  const [admType, setAdmType] = useState<"OT" | "GYNECOLOGY">("GYNECOLOGY");
  const [admDoctorName, setAdmDoctorName] = useState("Dr. Fatima Zahra (Gynecologist)");
  const [admProcedure, setAdmProcedure] = useState("LSCS Elective Cesarean Section");
  const [admWardBed, setAdmWardBed] = useState("Gyne Ward - Bed 04");
  const [admFeeAmount, setAdmFeeAmount] = useState<number>(45000);
  const [admPaymentMethod, setAdmPaymentMethod] = useState("CASH");
  const [admInTime, setAdmInTime] = useState<string>(
    `${new Date().toISOString().split("T")[0]} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
  );

  // DISCHARGE FORM MODAL STATE
  const [dischargeModalAdmission, setDischargeModalAdmission] = useState<AdmissionRecord | null>(null);
  const [dischargeOutTime, setDischargeOutTime] = useState<string>("");
  const [dischargeCondition, setDischargeCondition] = useState("Satisfactory");
  const [dischargeDiagnosis, setDischargeDiagnosis] = useState("");
  const [dischargeAdvice, setDischargeAdvice] = useState("");
  const [dischargeFeeCleared, setDischargeFeeCleared] = useState(true);

  // Extended Discharge Form Fields (matching HospitalFormPrintView DISCHARGE)
  const [dischargePresentingComplaint, setDischargePresentingComplaint] = useState("");
  const [dischargeBriefHistory, setDischargeBriefHistory] = useState("");
  const [dischargeDiagnosticInvestigations, setDischargeDiagnosticInvestigations] = useState("");
  const [dischargeProcedureDone, setDischargeProcedureDone] = useState("");
  const [dischargeOutcome, setDischargeOutcome] = useState("");
  const [dischargeAdvisedByDoctor, setDischargeAdvisedByDoctor] = useState(true);
  const [isLAMA, setIsLAMA] = useState(false);
  const [dischargeDate, setDischargeDate] = useState(new Date().toISOString().split("T")[0]);
  const [dischargeMedicines, setDischargeMedicines] = useState<Array<{medicine: string; dose: string; route: string; frequency: string; timing: string; duration: string}>>([{ medicine: "", dose: "", route: "Oral", frequency: "1-0-1", timing: "After meals", duration: "5 days" }]);
  const [dischargeFollowUpDate, setDischargeFollowUpDate] = useState("");
  const [dischargeFollowUpDepartment, setDischargeFollowUpDepartment] = useState("OPD");
  const [dischargeDietaryInstructions, setDischargeDietaryInstructions] = useState("");
  const [dischargeDoctorName, setDischargeDoctorName] = useState("Dr. Bilal Ahmad");

  // Extended Admission Form Fields (matching HospitalFormPrintView ADMISSION)
  const [admPhcRegNumber, setAdmPhcRegNumber] = useState("");
  const [admMaritalStatus, setAdmMaritalStatus] = useState("Married");
  const [admProvisionalDiagnosis, setAdmProvisionalDiagnosis] = useState("");
  const [admFinalDiagnosis, setAdmFinalDiagnosis] = useState("");
  const [admittedThrough, setAdmittedThrough] = useState<"OPD" | "Emergency">("OPD");
  const [admOpdErMrNo, setAdmOpdErMrNo] = useState("");
  const [admConsentName, setAdmConsentName] = useState("");
  const [admConsentRelation, setAdmConsentRelation] = useState("Self");

  // Full discharge data object for official HospitalFormPrintView
  const [printedDischargeData, setPrintedDischargeData] = useState<any | null>(null);

  // Inpatient Filter State
  const [inpatientFilter, setInpatientFilter] = useState<"ACTIVE" | "ALL" | "DISCHARGED" | "OT" | "GYNE">("ACTIVE");

  // Consultants list
  const activeConsultantsList = [
    { id: "doc-1", name: "Dr. Bilal Ahmad (MD)", dept: "General Surgery", fee: 2000 },
    { id: "doc-2", name: "Dr. Fatima Zahra (FCPS)", dept: "Gynecology & Obstetrics", fee: 2500 },
    { id: "doc-3", name: "Dr. Kamran Raza (DMRD)", dept: "Sonology / Ultrasound", fee: 2000 },
    { id: "doc-4", name: "Dr. Tariq Mahmood (M.Phil)", dept: "Pathology Laboratory", fee: 1500 },
  ];

  // Filter Patients for search
  const filteredPatients = patients.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.mrNumber.toLowerCase().includes(q) ||
      (p.cnic && p.cnic.includes(q)) ||
      p.phone.includes(q)
    );
  });

  // Filter Patients for Admission Modal Search
  const searchedPatientsForAdm = patients.filter((p) => {
    if (!admPatientSearchInput.trim()) return false;
    const q = admPatientSearchInput.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.mrNumber.toLowerCase().includes(q) ||
      (p.cnic && p.cnic.includes(q)) ||
      p.phone.includes(q)
    );
  });

  // Filter Admissions for OT & Gyne page
  const filteredAdmissions = admissions.filter((adm) => {
    if (inpatientFilter === "ACTIVE") return adm.status !== "DISCHARGED";
    if (inpatientFilter === "DISCHARGED") return adm.status === "DISCHARGED";
    if (inpatientFilter === "OT") return adm.admissionType === "OT";
    if (inpatientFilter === "GYNE") return adm.admissionType === "GYNECOLOGY";
    return true; // ALL
  });

  // Handle New Patient Register Form Submission
  const handleRegisterPatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.fullName || !newPatient.phone) return;

    const generatedMr = `MR-${new Date().getFullYear()}-${String(patients.length + 1001).padStart(4, "0")}`;

    const created: PatientRecord = {
      id: `pat-${Date.now()}`,
      mrNumber: generatedMr,
      fullName: newPatient.fullName,
      fatherHusbandName: newPatient.fatherHusbandName,
      gender: newPatient.gender,
      age: parseInt(newPatient.age) || 30,
      phone: newPatient.phone,
      cnic: newPatient.cnic,
      bloodGroup: newPatient.bloodGroup,
      notes: newPatient.notes,
      registrationDate: new Date().toISOString().split("T")[0],
    };

    onAddPatient(created);
    setIsRegisterModalOpen(false);
    setSelectedPatientForVisit(created);
    setNewPatient({
      fullName: "",
      fatherHusbandName: "",
      gender: "Male",
      age: "",
      phone: "",
      cnic: "",
      bloodGroup: "B+",
      notes: "",
    });
  };

  // Handle All-In-One Intake Submission
  const handleAllInOneIntakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForVisit) return;

    const dateNow = new Date().toISOString().split("T")[0];
    const arrivalNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (destinationType === "OPD") {
      const selectedDoc = activeConsultantsList.find((c) => c.id === selectedConsultantId);
      const newVisit: VisitRecord = {
        id: `vis-${Date.now()}`,
        visitNumber: `VIS-2026-${String(visits.length + 901)}`,
        patientId: selectedPatientForVisit.id,
        patientName: selectedPatientForVisit.fullName,
        mrNumber: selectedPatientForVisit.mrNumber,
        destinationType: "OPD",
        consultantId: selectedConsultantId,
        consultantName: selectedDoc ? selectedDoc.name : "Dr. Bilal Ahmad",
        department: selectedDoc ? selectedDoc.dept : "General OPD",
        consultationFee: visitFee,
        amountReceived: visitFee,
        paymentMethod,
        status: "WAITING",
        reasonForVisit: "OPD Consultation",
        visitDate: dateNow,
        arrivalTime: arrivalNow,
      };

      const newLedgerTxn: CashTransactionRecord = {
        id: `txn-${Date.now()}`,
        transactionNumber: `TXN-2026-${String(Date.now()).slice(-4)}`,
        transactionType: "INCOME",
        category: "OPD Fee",
        department: selectedDoc ? selectedDoc.dept : "OPD",
        amount: visitFee,
        paymentMethod,
        description: `OPD Consultation Fee - ${selectedPatientForVisit.fullName}`,
        date: dateNow,
        time: arrivalNow,
        patientName: selectedPatientForVisit.fullName,
        mrNumber: selectedPatientForVisit.mrNumber,
        createdBy: "Ayesha Khan (Receptionist)",
      };

      onAddVisit(newVisit, newLedgerTxn);
      setPrintedReceipt(newVisit);
      alert(`Patient ${selectedPatientForVisit.fullName} checked in! Dispatched to Doctor Queue.`);
    } else if (destinationType === "OT" || destinationType === "GYNECOLOGY") {
      const isOt = destinationType === "OT";
      const admFee = visitFee > 0 ? visitFee : isOt ? 35000 : 45000;

      const newAdmission: AdmissionRecord = {
        id: `adm-${Date.now()}`,
        admissionNumber: `ADM-${isOt ? "OT" : "GYN"}-2026-${String(admissions.length + 10)}`,
        patientId: selectedPatientForVisit.id,
        patientName: selectedPatientForVisit.fullName,
        mrNumber: selectedPatientForVisit.mrNumber,
        cnic: selectedPatientForVisit.cnic,
        age: selectedPatientForVisit.age,
        gender: selectedPatientForVisit.gender,
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
      alert(`Patient admitted into ${isOt ? "OT" : "Gyne Ward"}! Shown in OT & Gyne Inpatient Tracker.`);
    } else {
      // Direct Lab or Ultrasound
      const isLab = destinationType === "LAB";
      const serviceFee = visitFee > 0 ? visitFee : isLab ? selectedLabTests.length * 900 : 3000;

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

  // Handle Dedicated OT / Gynecology Admission Form Submission
  const handleDedicatedAdmissionSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const patientName = selectedPatientForAdm ? selectedPatientForAdm.fullName : admCustomName.trim();
    const mrn = selectedPatientForAdm ? selectedPatientForAdm.mrNumber : admCustomMrn.trim();
    const cnic = selectedPatientForAdm ? selectedPatientForAdm.cnic : admCustomCnic.trim();
    const age = selectedPatientForAdm ? selectedPatientForAdm.age : admCustomAge;
    const gender = selectedPatientForAdm ? selectedPatientForAdm.gender : admCustomGender;

    if (!patientName || !mrn) {
      alert("Please select an existing patient or enter Patient MRN and Full Name.");
      return;
    }

    const dateNow = new Date().toISOString().split("T")[0];
    const arrivalNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newAdmission: AdmissionRecord = {
      id: `adm-${Date.now()}`,
      admissionNumber: `ADM-${admType}-2026-${String(admissions.length + 10)}`,
      patientId: selectedPatientForAdm ? selectedPatientForAdm.id : `pat-${Date.now()}`,
      patientName: patientName,
      mrNumber: mrn,
      cnic: cnic,
      age: age,
      gender: gender,
      admissionType: admType,
      department: admType === "OT" ? "Surgery / OT" : "Gynecology Ward",
      doctorName: admDoctorName,
      procedureOrDiagnosis: admProcedure,
      wardRoomBed: admWardBed,
      admissionInTime: admInTime || `${dateNow} ${arrivalNow}`,
      status: "ADMITTED",
      feeAmount: admFeeAmount,
    };

    const newVisit: VisitRecord = {
      id: `vis-${Date.now()}`,
      visitNumber: `VIS-2026-${String(visits.length + 901)}`,
      patientId: newAdmission.patientId,
      patientName: newAdmission.patientName,
      mrNumber: newAdmission.mrNumber,
      destinationType: admType,
      consultantId: "doc-1",
      consultantName: admDoctorName,
      department: admType === "OT" ? "OT" : "Gynecology",
      consultationFee: admFeeAmount,
      amountReceived: admFeeAmount,
      paymentMethod: admPaymentMethod,
      status: "ADMITTED",
      reasonForVisit: admProcedure,
      visitDate: dateNow,
      arrivalTime: arrivalNow,
      admissionInTime: admInTime || `${dateNow} ${arrivalNow}`,
      roomBedNumber: admWardBed,
    };

    const newLedgerTxn: CashTransactionRecord = {
      id: `txn-${Date.now()}`,
      transactionNumber: `TXN-2026-${String(Date.now()).slice(-4)}`,
      transactionType: "INCOME",
      category: admType === "OT" ? "OT Charges" : "Gynecology Admission",
      department: admType === "OT" ? "OT" : "Gynecology",
      amount: admFeeAmount,
      paymentMethod: admPaymentMethod,
      description: `Admission Charge (${newAdmission.admissionNumber}) - ${patientName}`,
      date: dateNow,
      time: arrivalNow,
      patientName: patientName,
      mrNumber: mrn,
      createdBy: "Ayesha Khan (Receptionist)",
    };

    onAddAdmission(newAdmission, newLedgerTxn);
    onAddVisit(newVisit, newLedgerTxn);
    setIsAdmissionModalOpen(false);

    alert(`Patient ${patientName} successfully admitted into ${admType === "OT" ? "Operation Theatre" : "Gynecology Ward"}! Record added to Inpatient Tracker.`);
  };

  // Open Discharge Form Modal for an admitted patient
  const handleOpenDischargeModal = (adm: AdmissionRecord) => {
    const today = new Date().toISOString().split("T")[0];
    const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setDischargeModalAdmission(adm);
    setDischargeOutTime(`${today} ${currentTime}`);
    setDischargeCondition("Satisfactory");
    setDischargeDiagnosis(adm.procedureOrDiagnosis);
    setDischargeAdvice("");
    setDischargeFeeCleared(true);
    // Reset extended discharge fields
    setDischargePresentingComplaint("");
    setDischargeBriefHistory("");
    setDischargeDiagnosticInvestigations("");
    setDischargeProcedureDone(adm.procedureOrDiagnosis);
    setDischargeOutcome("");
    setDischargeAdvisedByDoctor(true);
    setIsLAMA(false);
    setDischargeDate(today);
    setDischargeMedicines([{ medicine: "", dose: "", route: "Oral", frequency: "1-0-1", timing: "After meals", duration: "5 days" }]);
    setDischargeFollowUpDate("");
    setDischargeFollowUpDepartment("OPD");
    setDischargeDietaryInstructions("");
    setDischargeDoctorName(adm.doctorName || "Dr. Bilal Ahmad");
  };

  // Confirm Discharge Submission
  const handleConfirmDischargeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dischargeModalAdmission) return;

    if (!dischargeFeeCleared) {
      alert("Please confirm financial clearance before discharging the patient.");
      return;
    }

    onDischargePatient(
      dischargeModalAdmission.id,
      dischargeOutTime,
      dischargeCondition,
      dischargeDiagnosis,
      dischargeAdvice
    );

    // Build full discharge data object matching HospitalFormPrintView DISCHARGE format
    const fullDischargeData: any = {
      mrNumber: dischargeModalAdmission.mrNumber,
      patientName: dischargeModalAdmission.patientName,
      patient: {
        mrNumber: dischargeModalAdmission.mrNumber,
        fullName: dischargeModalAdmission.patientName,
        fatherHusbandName: "",
        age: dischargeModalAdmission.age,
        gender: dischargeModalAdmission.gender,
        cnic: dischargeModalAdmission.cnic,
      },
      dateOfAdmission: dischargeModalAdmission.admissionInTime?.split(" ")[0] || "",
      formDate: dischargeDate,
      presentingComplaint: dischargePresentingComplaint,
      briefHistoryExamination: dischargeBriefHistory,
      diagnosticInvestigations: dischargeDiagnosticInvestigations,
      diagnosis: dischargeDiagnosis,
      procedureDone: dischargeProcedureDone,
      outcome: dischargeOutcome,
      dischargeAdvisedByDoctor,
      isLAMA,
      dischargeDate,
      dischargeCondition,
      medicines: dischargeMedicines,
      followUpDate: dischargeFollowUpDate,
      followUpDepartment: dischargeFollowUpDepartment,
      dietaryInstructions: dischargeDietaryInstructions,
      doctorName: dischargeDoctorName,
      signDate: dischargeDate,
      signTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setDischargeModalAdmission(null);
    setPrintedDischargeData(fullDischargeData);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Navigation Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-slate-900 to-slate-900 p-6 rounded-2xl border border-blue-800/40 shadow-lg text-white">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Building className="w-4 h-4" />
            <span>OPD Reception Desk & Admission Operations</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            All-in-One Patient Intake & Admission Dispatch Center
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Register patients, process OPD queue, manage OT & Gynecology Inpatient Admissions, collect fees, and handle patient discharges.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setSelectedPatientForAdm(null);
              setAdmCustomMrn("");
              setAdmCustomName("");
              setAdmCustomCnic("");
              setIsAdmissionModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
          >
            <Bed className="w-4 h-4" />
            <span>+ New OT / Gyne Admission</span>
          </button>

          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Register New Patient</span>
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
                  placeholder="Search Master Patient Index by MR, Name, Phone, CNIC..."
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
                      <td className="py-2 px-3 font-mono">{p.cnic || "-"}</td>
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
                      <th className="py-2 px-3">CNIC</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-200 dark:hover:bg-slate-800">
                        <td className="py-2 px-3 font-mono font-bold text-brand-600">{p.mrNumber}</td>
                        <td className="py-2 px-3 font-bold">{p.fullName}</td>
                        <td className="py-2 px-3 font-mono">{p.cnic || "-"}</td>
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
                    Phone: {selectedPatientForVisit.phone} • CNIC: {selectedPatientForVisit.cnic || "N/A"}
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
                      value={otProcedureName}
                      onChange={(e) => setOtProcedureName(e.target.value)}
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
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Collect Fee & Dispatch to Queue</span>
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

      {/* VIEW 2: DEDICATED OT & GYNECOLOGY INPATIENT TRACKER PAGE */}
      {activeTab === "ot_gyne_reg" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Bed className="w-5 h-5 text-purple-600" />
                <span>OT & Gynecology Inpatient Admission & Discharge Tracker ({admissions.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Long-stay inpatient tracking with Admission IN Date/Time, Ward/Bed Assignment, and Discharge OUT controls.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setSelectedPatientForAdm(null);
                  setAdmCustomMrn("");
                  setAdmCustomName("");
                  setAdmCustomCnic("");
                  setIsAdmissionModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ New OT / Gyne Admission</span>
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "ACTIVE", label: `Currently Admitted (${admissions.filter((a) => a.status !== "DISCHARGED").length})` },
              { id: "ALL", label: `All Inpatient Records (${admissions.length})` },
              { id: "DISCHARGED", label: `Discharged (${admissions.filter((a) => a.status === "DISCHARGED").length})` },
              { id: "OT", label: `Operation Theatre (${admissions.filter((a) => a.admissionType === "OT").length})` },
              { id: "GYNE", label: `Gynecology (${admissions.filter((a) => a.admissionType === "GYNECOLOGY").length})` },
            ].map((flt) => (
              <button
                key={flt.id}
                onClick={() => setInpatientFilter(flt.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  inpatientFilter === flt.id
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {flt.label}
              </button>
            ))}
          </div>

          {/* Inpatient Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 uppercase border-b">
                  <th className="py-3.5 px-4">Admission ID</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Patient MRN & Name</th>
                  <th className="py-3.5 px-4">CNIC Number</th>
                  <th className="py-3.5 px-4">Attending Surgeon / Gynecologist</th>
                  <th className="py-3.5 px-4">Procedure / Diagnosis</th>
                  <th className="py-3.5 px-4">Ward / Bed</th>
                  <th className="py-3.5 px-4 bg-emerald-500/10 text-emerald-600">Admission IN Time</th>
                  <th className="py-3.5 px-4 bg-rose-500/10 text-rose-600">Discharge OUT Time</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Discharge Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAdmissions.map((adm) => (
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
                      <span className="block text-[10px] font-mono text-purple-600 dark:text-purple-400">{adm.mrNumber}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {adm.cnic || "N/A"}
                    </td>
                    <td className="py-3 px-4 font-semibold text-brand-600 dark:text-brand-400">{adm.doctorName}</td>
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
                          onClick={() => handleOpenDischargeModal(adm)}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Discharge Patient</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setPrintedDischargeData({
                            mrNumber: adm.mrNumber,
                            patientName: adm.patientName,
                            patient: { mrNumber: adm.mrNumber, fullName: adm.patientName, age: adm.age, gender: adm.gender, cnic: adm.cnic },
                            dateOfAdmission: adm.admissionInTime?.split(" ")[0] || "",
                            formDate: adm.dischargeOutTime?.split(" ")[0] || new Date().toISOString().split("T")[0],
                            diagnosis: adm.dischargeDiagnosis || adm.procedureOrDiagnosis,
                            procedureDone: adm.procedureOrDiagnosis,
                            dischargeDate: adm.dischargeOutTime?.split(" ")[0] || "",
                            dischargeCondition: adm.dischargeCondition || "Satisfactory",
                            dischargeAdvisedByDoctor: true,
                            isLAMA: false,
                            medicines: [],
                            doctorName: adm.doctorName,
                          })}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs inline-flex items-center gap-1 hover:bg-slate-200"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span>Discharge Slip</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredAdmissions.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      No inpatient records match the selected filter. Click "+ New OT / Gyne Admission" to admit a patient.
                    </td>
                  </tr>
                )}
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

      {/* MODAL 1: REGISTER PERMANENT PATIENT PROFILE */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Register New Permanent Patient Profile"
        subtitle="Creates unique MR Number and master record"
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
                <option value="Other">Other</option>
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

      {/* MODAL 2: DEDICATED OT & GYNECOLOGY ADMISSION FORM MODAL */}
      {isAdmissionModalOpen && (
        <Modal
          isOpen
          onClose={() => setIsAdmissionModalOpen(false)}
          title="OT & Gynecology Patient Admission Form"
          subtitle="Select existing patient or enter MRN, Name, CNIC, Age & Ward/Bed details to admit patient into OT or Gynecology Ward."
          maxWidth="2xl"
        >
          <form onSubmit={handleDedicatedAdmissionSubmit} className="space-y-5 text-xs">
            {/* 1. Patient Search or Selection */}
            <div className="space-y-3">
              <label className="font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 text-[11px] block">
                1. Patient Demographics (Existing Search or Manual Input)
              </label>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search existing patient by MRN, Name, CNIC, or Phone..."
                  value={admPatientSearchInput}
                  onChange={(e) => {
                    setAdmPatientSearchInput(e.target.value);
                    setSelectedPatientForAdm(null);
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border font-medium focus:ring-2 focus:ring-purple-500"
                />

                {admPatientSearchInput && searchedPatientsForAdm.length > 0 && !selectedPatientForAdm && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border rounded-xl shadow-xl max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                    {searchedPatientsForAdm.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPatientForAdm(p);
                          setAdmCustomName(p.fullName);
                          setAdmCustomMrn(p.mrNumber);
                          setAdmCustomCnic(p.cnic || "");
                          setAdmCustomAge(p.age || 35);
                          setAdmCustomGender(p.gender || "Female");
                        }}
                        className="p-3 hover:bg-purple-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <strong className="text-slate-900 dark:text-white block">{p.fullName}</strong>
                          <span className="text-[10px] text-slate-500">Phone: {p.phone} | CNIC: {p.cnic || "N/A"}</span>
                        </div>
                        <span className="font-mono text-purple-600 font-bold text-xs">{p.mrNumber}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedPatientForAdm ? (
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-300 dark:border-purple-800 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-purple-600 block">SELECTED PATIENT</span>
                    <strong className="text-slate-900 dark:text-white text-sm">{selectedPatientForAdm.fullName}</strong>
                    <div className="text-[11px] font-mono text-purple-700 dark:text-purple-300">
                      MRN: {selectedPatientForAdm.mrNumber} | CNIC: {selectedPatientForAdm.cnic || "N/A"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPatientForAdm(null)}
                    className="px-2.5 py-1 rounded-lg border bg-white dark:bg-slate-800 text-xs font-bold"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border">
                  <div>
                    <label className="font-bold block mb-1">Patient MRN *</label>
                    <input
                      type="text"
                      placeholder="e.g. MRN-2026-880"
                      value={admCustomMrn}
                      onChange={(e) => setAdmCustomMrn(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border font-mono font-bold bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Patient Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Ayesha Bibi"
                      value={admCustomName}
                      onChange={(e) => setAdmCustomName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border font-bold bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">CNIC Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 37405-9876543-2"
                      value={admCustomCnic}
                      onChange={(e) => setAdmCustomCnic(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border font-mono font-bold bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Age & Gender</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={admCustomAge}
                        onChange={(e) => setAdmCustomAge(parseInt(e.target.value) || 30)}
                        className="w-20 px-2 py-1.5 rounded-lg border bg-white dark:bg-slate-900 font-bold"
                      />
                      <select
                        value={admCustomGender}
                        onChange={(e) => setAdmCustomGender(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border bg-white dark:bg-slate-900 font-bold"
                      >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Admission Details */}
            <div className="space-y-3 pt-1">
              <label className="font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 text-[11px] block">
                2. Admission Ward & Clinical Details
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-purple-500/5 border border-purple-200 dark:border-purple-900/40">
                <div>
                  <label className="font-bold block mb-1">Admission Type *</label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 font-bold cursor-pointer">
                      <input
                        type="radio"
                        name="admType"
                        checked={admType === "GYNECOLOGY"}
                        onChange={() => {
                          setAdmType("GYNECOLOGY");
                          setAdmProcedure("Elective C-Section / Ward Stay");
                          setAdmWardBed("Gyne Ward - Bed 04");
                          setAdmDoctorName("Dr. Fatima Zahra (Gynecologist)");
                          setAdmFeeAmount(45000);
                        }}
                        className="accent-purple-600"
                      />
                      <span>Gynecology Ward</span>
                    </label>
                    <label className="flex items-center gap-2 font-bold cursor-pointer">
                      <input
                        type="radio"
                        name="admType"
                        checked={admType === "OT"}
                        onChange={() => {
                          setAdmType("OT");
                          setAdmProcedure("Laparoscopic Cholecystectomy");
                          setAdmWardBed("OT Room 02 / Bed 01");
                          setAdmDoctorName("Dr. Bilal Ahmad (Surgeon)");
                          setAdmFeeAmount(35000);
                        }}
                        className="accent-purple-600"
                      />
                      <span>Operation Theatre (OT)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="font-bold block mb-1">Attending Doctor / Surgeon *</label>
                  <input
                    type="text"
                    required
                    value={admDoctorName}
                    onChange={(e) => setAdmDoctorName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Procedure / Diagnosis *</label>
                  <input
                    type="text"
                    required
                    value={admProcedure}
                    onChange={(e) => setAdmProcedure(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Ward / Room & Bed Assignment *</label>
                  <input
                    type="text"
                    required
                    value={admWardBed}
                    onChange={(e) => setAdmWardBed(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Admission IN Date & Time</label>
                  <input
                    type="text"
                    value={admInTime}
                    onChange={(e) => setAdmInTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border font-mono bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Admission Fee (Rs.)</label>
                  <input
                    type="number"
                    value={admFeeAmount}
                    onChange={(e) => setAdmFeeAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-lg border font-mono font-bold text-emerald-600 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* 3. Clinical & Consent Details */}
            <div className="space-y-3 pt-1">
              <label className="font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 text-[11px] block">
                3. Clinical Details &amp; Consent
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border">
                <div>
                  <label className="font-bold block mb-1">PHC Reg #</label>
                  <input type="text" value={admPhcRegNumber} onChange={(e) => setAdmPhcRegNumber(e.target.value)} placeholder="e.g. R-12345" className="w-full px-3 py-1.5 rounded-lg border font-mono bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Marital Status</label>
                  <select value={admMaritalStatus} onChange={(e) => setAdmMaritalStatus(e.target.value)} className="w-full px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900 font-bold">
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Admitted Through</label>
                  <select value={admittedThrough} onChange={(e) => setAdmittedThrough(e.target.value as "OPD" | "Emergency")} className="w-full px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900 font-bold">
                    <option value="OPD">OPD</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Provisional Diagnosis</label>
                  <input type="text" value={admProvisionalDiagnosis} onChange={(e) => setAdmProvisionalDiagnosis(e.target.value)} className="w-full px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Final Diagnosis</label>
                  <input type="text" value={admFinalDiagnosis} onChange={(e) => setAdmFinalDiagnosis(e.target.value)} className="w-full px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label className="font-bold block mb-1">OPD/ER MR No. (if any)</label>
                  <input type="text" value={admOpdErMrNo} onChange={(e) => setAdmOpdErMrNo(e.target.value)} placeholder="Previous MRN" className="w-full px-3 py-1.5 rounded-lg border font-mono bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Consent Signed By</label>
                  <input type="text" value={admConsentName} onChange={(e) => setAdmConsentName(e.target.value)} placeholder="Patient / Guardian Name" className="w-full px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Relation to Patient</label>
                  <input type="text" value={admConsentRelation} onChange={(e) => setAdmConsentRelation(e.target.value)} placeholder="e.g. Self / Husband" className="w-full px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setIsAdmissionModalOpen(false)}
                className="px-4 py-2 rounded-xl border font-bold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold inline-flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <Bed className="w-4 h-4" />
                <span>Save Admission & Add to Inpatient Tracker</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: DISCHARGE FORM — matches HospitalFormPrintView DISCHARGE */}
      {dischargeModalAdmission && (
        <Modal
          isOpen
          onClose={() => setDischargeModalAdmission(null)}
          title={`Hospital Patient Discharge Form — ${dischargeModalAdmission.patientName}`}
          subtitle={`Admission ID: ${dischargeModalAdmission.admissionNumber} | MRN: ${dischargeModalAdmission.mrNumber}`}
          maxWidth="3xl"
        >
          <form onSubmit={handleConfirmDischargeSubmit} className="space-y-5 text-xs">
            {/* Patient Summary Banner */}
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><span className="text-[10px] font-bold text-slate-400 block uppercase">Patient Name</span><strong className="text-slate-900 dark:text-white">{dischargeModalAdmission.patientName}</strong></div>
              <div><span className="text-[10px] font-bold text-slate-400 block uppercase">MRN</span><strong className="text-purple-600 font-mono">{dischargeModalAdmission.mrNumber}</strong></div>
              <div><span className="text-[10px] font-bold text-slate-400 block uppercase">Admission Time</span><span className="font-mono">{dischargeModalAdmission.admissionInTime}</span></div>
              <div><span className="text-[10px] font-bold text-slate-400 block uppercase">Ward / Bed</span><span className="font-mono font-bold">{dischargeModalAdmission.wardRoomBed}</span></div>
            </div>

            {/* A. Clinical Information */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border">
              <h4 className="font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 text-[11px]">A. Clinical Information</h4>
              <div>
                <label className="font-bold block mb-1">Presenting Complaint</label>
                <textarea rows={2} value={dischargePresentingComplaint} onChange={(e) => setDischargePresentingComplaint(e.target.value)} placeholder="Chief presenting complaint..." className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900" />
              </div>
              <div>
                <label className="font-bold block mb-1">Brief History &amp; Examination</label>
                <textarea rows={2} value={dischargeBriefHistory} onChange={(e) => setDischargeBriefHistory(e.target.value)} placeholder="Patient history and examination findings..." className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900" />
              </div>
              <div>
                <label className="font-bold block mb-1">Diagnostic Investigations Significant Results</label>
                <textarea rows={2} value={dischargeDiagnosticInvestigations} onChange={(e) => setDischargeDiagnosticInvestigations(e.target.value)} placeholder="Lab results, imaging findings..." className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Diagnosis *</label>
                  <input type="text" required value={dischargeDiagnosis} onChange={(e) => setDischargeDiagnosis(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 font-semibold" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Procedure Done / Outcome</label>
                  <div className="flex gap-1.5">
                    <input type="text" value={dischargeProcedureDone} onChange={(e) => setDischargeProcedureDone(e.target.value)} placeholder="Procedure" className="flex-1 px-3 py-2 rounded-xl border bg-white dark:bg-slate-900" />
                    <input type="text" value={dischargeOutcome} onChange={(e) => setDischargeOutcome(e.target.value)} placeholder="Outcome" className="w-24 px-2 py-2 rounded-xl border bg-white dark:bg-slate-900" />
                  </div>
                </div>
              </div>
            </div>

            {/* B. Discharge Notes */}
            <div className="space-y-3 p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50">
              <h4 className="font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 text-[11px]">B. Discharge Notes</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1">Date of Discharge *</label>
                  <input type="date" required value={dischargeDate} onChange={(e) => setDischargeDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Discharge OUT Time</label>
                  <input type="text" value={dischargeOutTime} onChange={(e) => setDischargeOutTime(e.target.value)} className="w-full px-3 py-2 rounded-xl border font-mono bg-white dark:bg-slate-900 text-rose-600" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Condition on Discharge *</label>
                  <select value={dischargeCondition} onChange={(e) => setDischargeCondition(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 font-bold">
                    <option value="Satisfactory">Satisfactory</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                    <option value="Transferred / Referred">Transferred / Referred</option>
                    <option value="Discharged Against Medical Advice (DAMA)">DAMA</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-6 p-3 border rounded-xl bg-white dark:bg-slate-900">
                <label className="flex items-center gap-2 font-bold cursor-pointer">
                  <input type="checkbox" checked={dischargeAdvisedByDoctor} onChange={(e) => setDischargeAdvisedByDoctor(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
                  Discharge Advised by Doctor
                </label>
                <label className="flex items-center gap-2 font-bold text-rose-600 cursor-pointer">
                  <input type="checkbox" checked={isLAMA} onChange={(e) => setIsLAMA(e.target.checked)} className="w-4 h-4 accent-rose-600" />
                  LAMA (Left Against Medical Advice)
                </label>
              </div>

              {/* Medication Table */}
              <div className="border rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 border-b">
                  <h5 className="font-bold text-xs">Medication Given on Discharge</h5>
                  <button type="button" onClick={() => setDischargeMedicines([...dischargeMedicines, { medicine: "", dose: "", route: "Oral", frequency: "1-0-1", timing: "After meals", duration: "5 days" }])} className="px-3 py-1 bg-brand-600 text-white font-bold rounded-lg text-[11px]">+ Add Row</button>
                </div>
                <div className="p-3 space-y-2">
                  <div className="hidden sm:grid grid-cols-7 gap-1.5 text-[10px] font-bold text-slate-400 uppercase px-1">
                    <span className="col-span-2">Medicine</span><span>Dose</span><span>Route</span><span>Freq</span><span>Duration</span><span></span>
                  </div>
                  {dischargeMedicines.map((m, idx) => (
                    <div key={idx} className="grid grid-cols-7 gap-1.5 items-center">
                      <input type="text" placeholder="Medicine" value={m.medicine} onChange={(e) => { const n=[...dischargeMedicines]; n[idx]={...n[idx],medicine:e.target.value}; setDischargeMedicines(n); }} className="col-span-2 p-1.5 border rounded-lg text-[11px]" />
                      <input type="text" placeholder="Dose" value={m.dose} onChange={(e) => { const n=[...dischargeMedicines]; n[idx]={...n[idx],dose:e.target.value}; setDischargeMedicines(n); }} className="p-1.5 border rounded-lg text-[11px]" />
                      <input type="text" placeholder="Route" value={m.route} onChange={(e) => { const n=[...dischargeMedicines]; n[idx]={...n[idx],route:e.target.value}; setDischargeMedicines(n); }} className="p-1.5 border rounded-lg text-[11px]" />
                      <input type="text" placeholder="Freq" value={m.frequency} onChange={(e) => { const n=[...dischargeMedicines]; n[idx]={...n[idx],frequency:e.target.value}; setDischargeMedicines(n); }} className="p-1.5 border rounded-lg text-[11px]" />
                      <input type="text" placeholder="Days" value={m.duration} onChange={(e) => { const n=[...dischargeMedicines]; n[idx]={...n[idx],duration:e.target.value}; setDischargeMedicines(n); }} className="p-1.5 border rounded-lg text-[11px]" />
                      <button type="button" onClick={() => setDischargeMedicines(dischargeMedicines.filter((_,i)=>i!==idx))} className="text-rose-600 font-black text-center">&times;</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Follow-up */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Follow-up Date (تاریخ معائنہ)</label>
                  <input type="date" value={dischargeFollowUpDate} onChange={(e) => setDischargeFollowUpDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Department (ڈیپارٹمنٹ)</label>
                  <input type="text" value={dischargeFollowUpDepartment} onChange={(e) => setDischargeFollowUpDepartment(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900" />
                </div>
              </div>
              <div>
                <label className="font-bold block mb-1">Dietary Instructions (ہدایات برائے خوراک)</label>
                <textarea rows={2} value={dischargeDietaryInstructions} onChange={(e) => setDischargeDietaryInstructions(e.target.value)} className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900" />
              </div>
              <div>
                <label className="font-bold block mb-1">Doctor Name</label>
                <input type="text" value={dischargeDoctorName} onChange={(e) => setDischargeDoctorName(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 font-semibold" />
              </div>
            </div>

            {/* Financial Clearance */}
            <label className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-300 dark:border-emerald-800 cursor-pointer">
              <input type="checkbox" checked={dischargeFeeCleared} onChange={(e) => setDischargeFeeCleared(e.target.checked)} className="w-5 h-5 accent-emerald-600 rounded cursor-pointer" />
              <span className="font-bold text-slate-900 dark:text-white text-xs">I confirm all dues (Rs. {dischargeModalAdmission.feeAmount}) have been settled.</span>
            </label>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setDischargeModalAdmission(null)} className="px-4 py-2 rounded-xl border font-bold text-slate-600 dark:text-slate-300">Cancel</button>
              <button type="submit" disabled={!dischargeFeeCleared} className={`px-6 py-2.5 rounded-xl font-bold text-white inline-flex items-center gap-2 shadow-lg ${dischargeFeeCleared ? "bg-rose-600 hover:bg-rose-500 cursor-pointer" : "bg-slate-400 cursor-not-allowed opacity-60"}`}>
                <LogOut className="w-4 h-4" />
                <span>Confirm Discharge &rarr; Print Form</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 4: OFFICIAL DISCHARGE FORM PRINT — HospitalFormPrintView */}
      {printedDischargeData && (
        <Modal
          isOpen={!!printedDischargeData}
          onClose={() => setPrintedDischargeData(null)}
          title="Official Hospital Discharge Form — Print Preview"
          subtitle="Bilal Hospital Inpatient Discharge Record"
          maxWidth="4xl"
        >
          <HospitalFormPrintView
            formType="DISCHARGE"
            data={printedDischargeData}
            onClose={() => setPrintedDischargeData(null)}
          />
        </Modal>
      )}

      {/* PRINTED RECEIPT MODAL FOR OPD & VISITS */}
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

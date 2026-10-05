export interface PatientRecord {
  id: string;
  mrNumber: string;
  fullName: string;
  fatherHusbandName: string;
  gender: string;
  age: number;
  phone: string;
  cnic: string;
  address?: string;
  bloodGroup: string;
  notes?: string;
  registrationDate: string;
}

export interface ConsultantUser {
  id: string;
  username: string;
  password: string;
  fullName: string;
  specialty: string;
  department: string;
  qualification: string;
  roomNumber: string;
  consultationFee: number;
  isActive: boolean;
  lastLoginAt?: string;
}

export interface VisitRecord {
  id: string;
  visitNumber: string;
  patientId: string;
  patientName: string;
  mrNumber: string;
  destinationType: "OPD" | "OT" | "GYNECOLOGY" | "LAB" | "ULTRASOUND";
  consultantId: string;
  consultantName: string;
  department: string;
  consultationFee: number;
  amountReceived: number;
  paymentMethod: string;
  status:
    | "REGISTERED"
    | "WAITING"
    | "WITH_CONSULTANT"
    | "CHECKED"
    | "LAB_REQUESTED"
    | "ULTRASOUND_REQUESTED"
    | "PHARMACY"
    | "COMPLETED"
    | "ADMITTED"
    | "IN_OT"
    | "POST_OP"
    | "DISCHARGED";
  reasonForVisit: string;
  visitDate: string;
  arrivalTime: string;
  
  // OT / Gynecology Specific Admission Fields
  admissionId?: string;
  roomBedNumber?: string;
  procedureSurgeonName?: string;
  admissionInTime?: string;
  dischargeOutTime?: string;
}

export interface AdmissionRecord {
  id: string;
  admissionNumber: string;
  patientId: string;
  patientName: string;
  mrNumber: string;
  cnic?: string;
  age?: number;
  gender?: string;
  admissionType: "OT" | "GYNECOLOGY";
  department: string;
  doctorName: string;
  procedureOrDiagnosis: string;
  wardRoomBed: string;
  admissionInTime: string;
  dischargeOutTime?: string;
  status: "ADMITTED" | "IN_OT" | "POST_OP" | "RECOVERY" | "DISCHARGED";
  dischargeCondition?: string;
  dischargeDiagnosis?: string;
  dischargeAdvice?: string;
  dailyNotes?: string;
  feeAmount: number;
}

export interface ConsultationRecord {
  id: string;
  visitId: string;
  patientId: string;
  consultantId: string;
  chiefComplaint: string;
  symptoms: string;
  diagnosis: string;
  bp: string;
  temperature: number;
  pulse: number;
  weight: number;
  clinicalNotes: string;
  advice: string;
}

export interface PrescriptionItemRecord {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  instructions: string;
}

export interface PrescriptionRecord {
  id: string;
  patientId: string;
  patientName: string;
  mrNumber: string;
  visitId: string;
  consultantId: string;
  consultantName: string;
  diagnosis: string;
  prescriptionDate: string;
  items: PrescriptionItemRecord[];
  isDispensed: boolean;
}

export interface LabOrderRecord {
  id: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  mrNumber: string;
  cnic?: string;
  age?: number;
  gender?: string;
  visitId: string;
  consultantId: string;
  consultantName: string;
  testCategory: string;
  tests: string[];
  totalFee: number;
  priority: "NORMAL" | "URGENT";
  status:
    | "ORDERED"
    | "SAMPLE_COLLECTED"
    | "PROCESSING"
    | "REPORT_PREPARED"
    | "SUBMITTED_TO_CONSULTANT"
    | "REVISION_REQUESTED"
    | "ACCEPTED";
  requestDate: string;
  currentVersion: number;
  resultsV1?: string;
  resultsV2?: string;
  revisionReason?: string;
  revisionComment?: string;
  
  // File Upload Fields for Consultant Easy View
  attachedPdfUrl?: string;
  attachedPdfName?: string;
  attachedImageBase64?: string;
}

export interface UltrasoundOrderRecord {
  id: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  mrNumber: string;
  visitId: string;
  consultantId: string;
  consultantName: string;
  requestedExam: string;
  clinicalIndication: string;
  totalFee: number;
  status:
    | "ORDERED"
    | "PROCESSING"
    | "REPORT_PREPARED"
    | "SUBMITTED_TO_CONSULTANT"
    | "REVISION_REQUESTED"
    | "ACCEPTED";
  requestDate: string;
  currentVersion: number;
  findingsV1?: string;
  impressionV1?: string;
  findingsV2?: string;
  impressionV2?: string;
  revisionReason?: string;

  // File Upload Fields for Consultant Easy View
  attachedPdfUrl?: string;
  attachedImageUrl?: string;
  attachedFileName?: string;
  attachedImageBase64?: string;
}

export interface MedicineRecord {
  id: string;
  genericName: string;
  brandName: string;
  category: string;
  purchasePrice: number;
  salePrice: number;
  availableQty: number;
  reorderLevel: number;
  batchNumber: string;
  expiryDate: string;
}

export interface CashTransactionRecord {
  id: string;
  transactionNumber: string;
  transactionType: "INCOME" | "EXPENSE" | "REFUND" | "REVERSAL" | "ADJUSTMENT";
  category: string;
  department: string;
  amount: number;
  paymentMethod: string;
  description: string;
  date: string;
  time: string;
  patientName?: string;
  mrNumber?: string;
  createdBy: string;
}

export interface DailyCashClosingRecord {
  id: string;
  date: string;
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  expectedClosing: number;
  actualCash: number;
  difference: number;
  closedBy: string;
  isClosed: boolean;
}

// All data is loaded dynamically from MongoDB Atlas collections.
// No static mock data — everything is fetched dynamically.
export const INITIAL_PATIENTS: PatientRecord[] = [];
export const INITIAL_VISITS: VisitRecord[] = [];
export const INITIAL_ADMISSIONS: AdmissionRecord[] = [];
export const INITIAL_PRESCRIPTIONS: PrescriptionRecord[] = [];
export const INITIAL_LAB_ORDERS: LabOrderRecord[] = [];
export const INITIAL_ULTRASOUND_ORDERS: UltrasoundOrderRecord[] = [];
export const INITIAL_MEDICINES: MedicineRecord[] = [];
export const INITIAL_CASH_TRANSACTIONS: CashTransactionRecord[] = [];
export const INITIAL_CONSULTANTS: ConsultantUser[] = [];



import { randomUUID } from "crypto";
import type {
  Patient,
  InsertPatient,
  Doctor,
  InsertDoctor,
  MedicalReport,
  InsertMedicalReport,
  Consent,
  InsertConsent,
  Assignment,
  InsertAssignment,
  User,
  InsertUser,
} from "@shared/schema";

export interface IStorage {
  // Users (legacy)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Patients
  getPatient(id: string): Promise<Patient | undefined>;
  getPatientByEmail(email: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  syncPatientFromMySQL(patient: Patient): Promise<Patient>;
  getAllPatients(): Promise<Patient[]>;

  // Doctors
  getDoctor(id: string): Promise<Doctor | undefined>;
  getDoctorByLicenseId(licenseId: string): Promise<Doctor | undefined>;
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  syncDoctorFromMySQL(doctor: Doctor): Promise<Doctor>;
  getAllDoctors(): Promise<Doctor[]>;

  // Medical Reports
  getReport(id: string): Promise<MedicalReport | undefined>;
  getReportsByPatientId(patientId: string): Promise<MedicalReport[]>;
  createReport(report: InsertMedicalReport): Promise<MedicalReport>;
  updateReportStatus(id: string, status: string): Promise<MedicalReport | undefined>;
  updateReportWithAISummary(id: string, aiData: {
    aiSummary?: string;
    aiDiagnosis?: string;
    aiKeyFindings?: string;
    aiRecommendations?: string;
    aiTestResults?: string;
    ragReportId?: string;
    processedByAi?: boolean;
  }): Promise<MedicalReport | undefined>;

  // Consents
  getConsent(id: string): Promise<Consent | undefined>;
  getConsentsByPatientId(patientId: string): Promise<Consent[]>;
  getConsentsByDoctorId(doctorId: string): Promise<Consent[]>;
  getActiveConsentForDoctorPatient(doctorId: string, patientId: string): Promise<Consent | undefined>;
  createConsent(consent: InsertConsent): Promise<Consent>;
  revokeConsent(id: string): Promise<Consent | undefined>;

  // Assignments
  getAssignment(id: string): Promise<Assignment | undefined>;
  getAssignmentsByDoctorId(doctorId: string): Promise<Assignment[]>;
  getAssignmentsByPatientId(patientId: string): Promise<Assignment[]>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private patients: Map<string, Patient>;
  private doctors: Map<string, Doctor>;
  private reports: Map<string, MedicalReport>;
  private consents: Map<string, Consent>;
  private assignments: Map<string, Assignment>;

  constructor() {
    this.users = new Map();
    this.patients = new Map();
    this.doctors = new Map();
    this.reports = new Map();
    this.consents = new Map();
    this.assignments = new Map();

    this.seedData();
  }

  private seedData() {
    // Seed some demo doctors
    const doctor1: Doctor = {
      id: "doc-001",
      licenseId: "MED-12345",
      fullName: "Dr. Sarah Johnson",
      specialization: "Cardiologist",
      password: "password123",
      verified: true,
    };
    const doctor2: Doctor = {
      id: "doc-002",
      licenseId: "MED-67890",
      fullName: "Dr. Michael Chen",
      specialization: "Endocrinologist",
      password: "password123",
      verified: true,
    };
    this.doctors.set(doctor1.id, doctor1);
    this.doctors.set(doctor2.id, doctor2);

    // Seed demo patients
    const patient1: Patient = {
      id: "pat-001",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: "+1234567890",
      dateOfBirth: "1990-05-15",
      pin: "123456",
    };
    const patient2: Patient = {
      id: "pat-002",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phone: "+1987654321",
      dateOfBirth: "1985-08-22",
      pin: "654321",
    };
    this.patients.set(patient1.id, patient1);
    this.patients.set(patient2.id, patient2);

    // Seed demo reports
    const report1: MedicalReport = {
      id: "rep-001",
      patientId: "pat-001",
      diseaseName: "Diabetes",
      attributes: JSON.stringify([
        { name: "Insulin Level", value: "45", unit: "mU/L" },
        { name: "Glucose Level", value: "110", unit: "mg/dL" },
        { name: "HbA1c", value: "6.2", unit: "%" },
      ]),
      measurementDate: "2024-11-15",
      fileName: "blood_test_nov.pdf",
      fileType: "application/pdf",
      status: "reviewed",
      uploadedAt: "2024-11-15T10:30:00Z",
    };
    const report2: MedicalReport = {
      id: "rep-002",
      patientId: "pat-001",
      diseaseName: "Hypertension",
      attributes: JSON.stringify([
        { name: "Systolic BP", value: "135", unit: "mmHg" },
        { name: "Diastolic BP", value: "85", unit: "mmHg" },
        { name: "Heart Rate", value: "72", unit: "bpm" },
      ]),
      measurementDate: "2024-12-01",
      fileName: null,
      fileType: null,
      status: "pending",
      uploadedAt: "2024-12-01T14:00:00Z",
    };
    const report3: MedicalReport = {
      id: "rep-003",
      patientId: "pat-002",
      diseaseName: "Cholesterol",
      attributes: JSON.stringify([
        { name: "Total Cholesterol", value: "210", unit: "mg/dL" },
        { name: "LDL", value: "130", unit: "mg/dL" },
        { name: "HDL", value: "55", unit: "mg/dL" },
      ]),
      measurementDate: "2024-11-28",
      fileName: null,
      fileType: null,
      status: "pending",
      uploadedAt: "2024-11-28T09:15:00Z",
    };
    this.reports.set(report1.id, report1);
    this.reports.set(report2.id, report2);
    this.reports.set(report3.id, report3);

    // Seed assignments
    const assignment1: Assignment = {
      id: "assign-001",
      doctorId: "doc-001",
      patientId: "pat-001",
      assignedAt: "2024-10-01T00:00:00Z",
    };
    const assignment2: Assignment = {
      id: "assign-002",
      doctorId: "doc-001",
      patientId: "pat-002",
      assignedAt: "2024-10-15T00:00:00Z",
    };
    const assignment3: Assignment = {
      id: "assign-003",
      doctorId: "doc-002",
      patientId: "pat-001",
      assignedAt: "2024-11-01T00:00:00Z",
    };
    this.assignments.set(assignment1.id, assignment1);
    this.assignments.set(assignment2.id, assignment2);
    this.assignments.set(assignment3.id, assignment3);

    // Seed consents
    const consent1: Consent = {
      id: "consent-001",
      patientId: "pat-001",
      doctorId: "doc-001",
      permissions: JSON.stringify(["READ", "WRITE"]),
      startDate: "2024-10-01",
      endDate: "2025-10-01",
      active: true,
      createdAt: "2024-10-01T00:00:00Z",
    };
    this.consents.set(consent1.id, consent1);
  }

  // Users (legacy)
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Patients
  async getPatient(id: string): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async getPatientByEmail(email: string): Promise<Patient | undefined> {
    return Array.from(this.patients.values()).find((p) => p.email === email);
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = randomUUID();
    const patient: Patient = { ...insertPatient, id };
    this.patients.set(id, patient);
    return patient;
  }

  // Sync patient from MySQL to in-memory storage (preserves MySQL ID)
  async syncPatientFromMySQL(patient: Patient): Promise<Patient> {
    this.patients.set(patient.id, patient);
    return patient;
  }

  async getAllPatients(): Promise<Patient[]> {
    return Array.from(this.patients.values());
  }

  // Doctors
  async getDoctor(id: string): Promise<Doctor | undefined> {
    return this.doctors.get(id);
  }

  async getDoctorByLicenseId(licenseId: string): Promise<Doctor | undefined> {
    return Array.from(this.doctors.values()).find((d) => d.licenseId === licenseId);
  }

  async createDoctor(insertDoctor: InsertDoctor): Promise<Doctor> {
    const id = randomUUID();
    const doctor: Doctor = { ...insertDoctor, id, verified: insertDoctor.verified ?? false };
    this.doctors.set(id, doctor);
    return doctor;
  }

  // Sync doctor from MySQL to in-memory storage (preserves MySQL ID)
  async syncDoctorFromMySQL(doctor: Doctor): Promise<Doctor> {
    this.doctors.set(doctor.id, doctor);
    return doctor;
  }

  async getAllDoctors(): Promise<Doctor[]> {
    return Array.from(this.doctors.values());
  }

  // Medical Reports
  async getReport(id: string): Promise<MedicalReport | undefined> {
    return this.reports.get(id);
  }

  async getReportsByPatientId(patientId: string): Promise<MedicalReport[]> {
    return Array.from(this.reports.values())
      .filter((r) => r.patientId === patientId)
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }

  async createReport(insertReport: InsertMedicalReport): Promise<MedicalReport> {
    const id = randomUUID();
    const report: MedicalReport = {
      ...insertReport,
      id,
      status: insertReport.status || "pending",
      fileName: insertReport.fileName || null,
      fileType: insertReport.fileType || null,
      aiSummary: insertReport.aiSummary || null,
      aiDiagnosis: insertReport.aiDiagnosis || null,
      aiKeyFindings: insertReport.aiKeyFindings || null,
      aiRecommendations: insertReport.aiRecommendations || null,
      aiTestResults: insertReport.aiTestResults || null,
      ragReportId: insertReport.ragReportId || null,
      processedByAi: insertReport.processedByAi || false,
    };
    this.reports.set(id, report);
    return report;
  }

  async updateReportStatus(id: string, status: string): Promise<MedicalReport | undefined> {
    const report = this.reports.get(id);
    if (report) {
      report.status = status;
      this.reports.set(id, report);
    }
    return report;
  }

  async updateReportWithAISummary(id: string, aiData: {
    aiSummary?: string;
    aiDiagnosis?: string;
    aiKeyFindings?: string;
    aiRecommendations?: string;
    aiTestResults?: string;
    ragReportId?: string;
    processedByAi?: boolean;
  }): Promise<MedicalReport | undefined> {
    const report = this.reports.get(id);
    if (report) {
      if (aiData.aiSummary !== undefined) report.aiSummary = aiData.aiSummary;
      if (aiData.aiDiagnosis !== undefined) report.aiDiagnosis = aiData.aiDiagnosis;
      if (aiData.aiKeyFindings !== undefined) report.aiKeyFindings = aiData.aiKeyFindings;
      if (aiData.aiRecommendations !== undefined) report.aiRecommendations = aiData.aiRecommendations;
      if (aiData.aiTestResults !== undefined) report.aiTestResults = aiData.aiTestResults;
      if (aiData.ragReportId !== undefined) report.ragReportId = aiData.ragReportId;
      if (aiData.processedByAi !== undefined) report.processedByAi = aiData.processedByAi;
      this.reports.set(id, report);
    }
    return report;
  }

  // Consents
  async getConsent(id: string): Promise<Consent | undefined> {
    return this.consents.get(id);
  }

  async getConsentsByPatientId(patientId: string): Promise<Consent[]> {
    return Array.from(this.consents.values()).filter((c) => c.patientId === patientId);
  }

  async getConsentsByDoctorId(doctorId: string): Promise<Consent[]> {
    return Array.from(this.consents.values()).filter((c) => c.doctorId === doctorId);
  }

  async getActiveConsentForDoctorPatient(doctorId: string, patientId: string): Promise<Consent | undefined> {
    return Array.from(this.consents.values()).find(
      (c) => c.doctorId === doctorId && c.patientId === patientId && c.active === true
    );
  }

  async createConsent(insertConsent: InsertConsent): Promise<Consent> {
    const id = randomUUID();
    const consent: Consent = { ...insertConsent, id, active: insertConsent.active ?? true };
    this.consents.set(id, consent);
    return consent;
  }

  async revokeConsent(id: string): Promise<Consent | undefined> {
    const consent = this.consents.get(id);
    if (consent) {
      consent.active = false;
      this.consents.set(id, consent);
    }
    return consent;
  }

  // Assignments
  async getAssignment(id: string): Promise<Assignment | undefined> {
    return this.assignments.get(id);
  }

  async getAssignmentsByDoctorId(doctorId: string): Promise<Assignment[]> {
    return Array.from(this.assignments.values()).filter((a) => a.doctorId === doctorId);
  }

  async getAssignmentsByPatientId(patientId: string): Promise<Assignment[]> {
    return Array.from(this.assignments.values()).filter((a) => a.patientId === patientId);
  }

  async createAssignment(insertAssignment: InsertAssignment): Promise<Assignment> {
    const id = randomUUID();
    const assignment: Assignment = { ...insertAssignment, id };
    this.assignments.set(id, assignment);
    return assignment;
  }

  // Delete a report by ID
  async deleteReport(id: string): Promise<boolean> {
    return this.reports.delete(id);
  }

  // Delete a patient and all related data
  async deletePatient(patientId: string): Promise<boolean> {
    // Delete all reports for this patient
    this.reports.forEach((report, reportId) => {
      if (report.patientId === patientId) {
        this.reports.delete(reportId);
      }
    });

    // Delete all consents for this patient
    this.consents.forEach((consent, consentId) => {
      if (consent.patientId === patientId) {
        this.consents.delete(consentId);
      }
    });

    // Delete all assignments for this patient
    this.assignments.forEach((assignment, assignmentId) => {
      if (assignment.patientId === patientId) {
        this.assignments.delete(assignmentId);
      }
    });

    // Finally delete the patient
    return this.patients.delete(patientId);
  }
}

export const storage = new MemStorage();

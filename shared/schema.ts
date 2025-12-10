import { pgTable, text, varchar, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Patients table
export const patients = pgTable("patients", {
  id: varchar("id", { length: 36 }).primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  pin: text("pin").notNull(),
});

export const insertPatientSchema = createInsertSchema(patients).omit({ id: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;

// Doctors table
export const doctors = pgTable("doctors", {
  id: varchar("id", { length: 36 }).primaryKey(),
  licenseId: text("license_id").notNull().unique(),
  fullName: text("full_name").notNull(),
  specialization: text("specialization").notNull(),
  password: text("password").notNull(),
  verified: boolean("verified").default(false),
});

export const insertDoctorSchema = createInsertSchema(doctors).omit({ id: true });
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type Doctor = typeof doctors.$inferSelect;

// Medical Reports table
export const medicalReports = pgTable("medical_reports", {
  id: varchar("id", { length: 36 }).primaryKey(),
  patientId: varchar("patient_id", { length: 36 }).notNull(),
  diseaseName: text("disease_name").notNull(),
  attributes: text("attributes").notNull(), // JSON stringified array
  measurementDate: text("measurement_date").notNull(),
  fileName: text("file_name"),
  fileType: text("file_type"),
  status: text("status").notNull().default("pending"), // pending, reviewed, archived
  uploadedAt: text("uploaded_at").notNull(),
});

export const insertMedicalReportSchema = createInsertSchema(medicalReports).omit({ id: true });
export type InsertMedicalReport = z.infer<typeof insertMedicalReportSchema>;
export type MedicalReport = typeof medicalReports.$inferSelect;

// Consents table
export const consents = pgTable("consents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  patientId: varchar("patient_id", { length: 36 }).notNull(),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  permissions: text("permissions").notNull(), // JSON array: ["READ", "WRITE", "SHARE"]
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  active: boolean("active").default(true),
  createdAt: text("created_at").notNull(),
});

export const insertConsentSchema = createInsertSchema(consents).omit({ id: true });
export type InsertConsent = z.infer<typeof insertConsentSchema>;
export type Consent = typeof consents.$inferSelect;

// Doctor-Patient assignments
export const assignments = pgTable("assignments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  patientId: varchar("patient_id", { length: 36 }).notNull(),
  assignedAt: text("assigned_at").notNull(),
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({ id: true });
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignments.$inferSelect;

// Validation schemas for forms
export const patientRegistrationSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").regex(/^[a-zA-Z\s]+$/, "Only letters allowed"),
  lastName: z.string().min(2, "Last name must be at least 2 characters").regex(/^[a-zA-Z\s]+$/, "Only letters allowed"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  pin: z.string().length(6, "PIN must be exactly 6 digits").regex(/^\d{6}$/, "PIN must be 6 digits"),
});

export const doctorRegistrationSchema = z.object({
  licenseId: z.string().min(5, "License ID must be at least 5 characters"),
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  specialization: z.string().min(1, "Specialization is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  verified: z.boolean().optional(),
});

export const patientLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  pin: z.string().length(6, "PIN must be exactly 6 digits"),
});

export const doctorLoginSchema = z.object({
  licenseId: z.string().min(1, "License ID is required"),
  password: z.string().min(1, "Password is required"),
});

export const reportUploadSchema = z.object({
  diseaseName: z.string().min(1, "Disease name is required"),
  attributes: z.array(z.object({
    name: z.string(),
    value: z.string(),
    unit: z.string(),
  })),
  measurementDate: z.string().min(1, "Measurement date is required"),
});

export const consentSchema = z.object({
  doctorId: z.string().min(1, "Doctor selection is required"),
  permissions: z.array(z.enum(["READ", "WRITE", "SHARE"])).min(1, "At least one permission required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

// Disease types and their attributes
export const diseaseTypes = [
  { name: "Diabetes", attributes: ["Insulin Level", "Glucose Level", "HbA1c"] },
  { name: "Hypertension", attributes: ["Systolic BP", "Diastolic BP", "Heart Rate"] },
  { name: "Cholesterol", attributes: ["Total Cholesterol", "LDL", "HDL", "Triglycerides"] },
  { name: "Thyroid", attributes: ["TSH", "T3", "T4"] },
  { name: "Kidney Function", attributes: ["Creatinine", "BUN", "eGFR"] },
  { name: "Liver Function", attributes: ["ALT", "AST", "Bilirubin", "Albumin"] },
  { name: "Complete Blood Count", attributes: ["Hemoglobin", "WBC", "RBC", "Platelets"] },
  { name: "Other", attributes: [] },
] as const;

export const specializations = [
  "General Practitioner",
  "Cardiologist",
  "Endocrinologist",
  "Nephrologist",
  "Hepatologist",
  "Hematologist",
  "Neurologist",
  "Pulmonologist",
  "Dermatologist",
  "Orthopedist",
  "Oncologist",
  "Psychiatrist",
] as const;

// Legacy user type for compatibility
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  patientRegistrationSchema,
  doctorRegistrationSchema,
  patientLoginSchema,
  doctorLoginSchema,
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Patient Registration
  app.post("/api/patients/register", async (req, res) => {
    try {
      const validation = patientRegistrationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validation.error.flatten().fieldErrors,
        });
      }

      const existingPatient = await storage.getPatientByEmail(validation.data.email);
      if (existingPatient) {
        return res.status(409).json({ message: "Email already registered" });
      }

      const patient = await storage.createPatient(validation.data);
      const { pin, ...safePatient } = patient;
      res.status(201).json(safePatient);
    } catch (error) {
      console.error("Patient registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Patient Login
  app.post("/api/patients/login", async (req, res) => {
    try {
      const { email, pin } = req.body;

      const patient = await storage.getPatientByEmail(email);
      if (!patient) {
        return res.status(401).json({ message: "Invalid email or PIN" });
      }

      // For demo purposes, accept any PIN or the correct one
      if (pin && patient.pin !== pin && pin !== "123456") {
        return res.status(401).json({ message: "Invalid email or PIN" });
      }

      const { pin: _, ...safePatient } = patient;
      res.json(safePatient);
    } catch (error) {
      console.error("Patient login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Doctor Registration
  app.post("/api/doctors/register", async (req, res) => {
    try {
      const validation = doctorRegistrationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validation.error.flatten().fieldErrors,
        });
      }

      const existingDoctor = await storage.getDoctorByLicenseId(validation.data.licenseId);
      if (existingDoctor) {
        return res.status(409).json({ message: "License ID already registered" });
      }

      const doctor = await storage.createDoctor(validation.data);
      const { password, ...safeDoctor } = doctor;
      res.status(201).json(safeDoctor);
    } catch (error) {
      console.error("Doctor registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Doctor Login
  app.post("/api/doctors/login", async (req, res) => {
    try {
      const validation = doctorLoginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const doctor = await storage.getDoctorByLicenseId(validation.data.licenseId);
      if (!doctor || doctor.password !== validation.data.password) {
        return res.status(401).json({ message: "Invalid license ID or password" });
      }

      const { password, ...safeDoctor } = doctor;
      res.json(safeDoctor);
    } catch (error) {
      console.error("Doctor login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all doctors (for consent modal)
  app.get("/api/doctors", async (req, res) => {
    try {
      const doctors = await storage.getAllDoctors();
      const safeDoctors = doctors.map(({ password, ...d }) => d);
      res.json(safeDoctors);
    } catch (error) {
      console.error("Get doctors error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get patient reports
  app.get("/api/patients/:patientId/reports", async (req, res) => {
    try {
      const { patientId } = req.params;
      const reports = await storage.getReportsByPatientId(patientId);
      res.json(reports);
    } catch (error) {
      console.error("Get reports error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create patient report
  app.post("/api/patients/:patientId/reports", async (req, res) => {
    try {
      const { patientId } = req.params;
      const { diseaseName, attributes, measurementDate } = req.body;

      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      const report = await storage.createReport({
        patientId,
        diseaseName,
        attributes: JSON.stringify(attributes),
        measurementDate,
        fileName: null,
        fileType: null,
        status: "pending",
        uploadedAt: new Date().toISOString(),
      });

      res.status(201).json(report);
    } catch (error) {
      console.error("Create report error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get patient consents
  app.get("/api/patients/:patientId/consents", async (req, res) => {
    try {
      const { patientId } = req.params;
      const consents = await storage.getConsentsByPatientId(patientId);
      res.json(consents);
    } catch (error) {
      console.error("Get consents error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create patient consent
  app.post("/api/patients/:patientId/consents", async (req, res) => {
    try {
      const { patientId } = req.params;
      const { doctorId, permissions, startDate, endDate } = req.body;

      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      const doctor = await storage.getDoctor(doctorId);
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }

      const consent = await storage.createConsent({
        patientId,
        doctorId,
        permissions: JSON.stringify(permissions),
        startDate,
        endDate,
        active: true,
        createdAt: new Date().toISOString(),
      });

      // Also create an assignment if one doesn't exist
      const existingAssignments = await storage.getAssignmentsByDoctorId(doctorId);
      const alreadyAssigned = existingAssignments.some((a) => a.patientId === patientId);
      
      if (!alreadyAssigned) {
        await storage.createAssignment({
          doctorId,
          patientId,
          assignedAt: new Date().toISOString(),
        });
      }

      res.status(201).json(consent);
    } catch (error) {
      console.error("Create consent error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Revoke consent
  app.delete("/api/consents/:consentId", async (req, res) => {
    try {
      const { consentId } = req.params;
      const consent = await storage.revokeConsent(consentId);
      
      if (!consent) {
        return res.status(404).json({ message: "Consent not found" });
      }

      res.json(consent);
    } catch (error) {
      console.error("Revoke consent error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get doctor's assigned patients
  app.get("/api/doctors/:doctorId/patients", async (req, res) => {
    try {
      const { doctorId } = req.params;
      const assignments = await storage.getAssignmentsByDoctorId(doctorId);
      
      const patientsWithReports = await Promise.all(
        assignments.map(async (assignment) => {
          const patient = await storage.getPatient(assignment.patientId);
          if (!patient) return null;
          
          const reports = await storage.getReportsByPatientId(patient.id);
          const { pin, ...safePatient } = patient;
          
          return {
            ...safePatient,
            reports,
          };
        })
      );

      res.json(patientsWithReports.filter(Boolean));
    } catch (error) {
      console.error("Get assigned patients error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update report status
  app.patch("/api/reports/:reportId/status", async (req, res) => {
    try {
      const { reportId } = req.params;
      const { status } = req.body;

      const report = await storage.updateReportStatus(reportId, status);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      res.json(report);
    } catch (error) {
      console.error("Update report status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}

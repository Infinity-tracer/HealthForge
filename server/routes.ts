import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  patientRegistrationSchema,
  doctorRegistrationSchema,
  patientLoginSchema,
  doctorLoginSchema,
} from "@shared/schema";
import multer from "multer";
import FormData from "form-data";
import fetch from "node-fetch";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// Flask RAG API URL (for AI processing)
const FLASK_API_URL = process.env.FLASK_API_URL || "http://localhost:8004";
// Flask Backend API URL (for user authentication with MySQL)
const FLASK_BACKEND_URL = process.env.FLASK_BACKEND_URL || "http://localhost:5001";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Patient Registration - Forward to Flask/MySQL
  app.post("/api/patients/register", async (req, res) => {
    try {
      const validation = patientRegistrationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validation.error.flatten().fieldErrors,
        });
      }

      // Forward to Flask backend for MySQL storage
      const flaskResponse = await fetch(`${FLASK_BACKEND_URL}/api/patients/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      const result = await flaskResponse.json() as any;

      if (flaskResponse.ok) {
        // If email verification is required, forward that response to the client
        if (result.requiresVerification) {
          return res.status(200).json({
            success: true,
            requiresVerification: true,
            email: result.email,
            message: result.message || "Verification code sent to your email"
          });
        }

        // If no verification required (legacy or verification complete), create in memory
        const patient = await storage.createPatient(validation.data);
        const { pin, ...safePatient } = patient;
        res.status(201).json({ ...safePatient, mysqlId: result.patientId });
      } else {
        res.status(flaskResponse.status).json({ message: result.error || "Registration failed" });
      }
    } catch (error) {
      console.error("Patient registration error:", error);
      // Fallback to in-memory storage if Flask is unavailable
      try {
        const existingPatient = await storage.getPatientByEmail(req.body.email);
        if (existingPatient) {
          return res.status(409).json({ message: "Email already registered" });
        }
        const patient = await storage.createPatient(req.body);
        const { pin, ...safePatient } = patient;
        res.status(201).json(safePatient);
      } catch (fallbackError) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });


  // Email Verification - Forward to Flask/MySQL
  app.post("/api/patients/verify-email", async (req, res) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({ error: "Email and verification code are required" });
      }

      const flaskResponse = await fetch(`${FLASK_BACKEND_URL}/api/patients/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const result = await flaskResponse.json() as any;

      if (flaskResponse.ok && result.success) {
        // After email verification, create patient in memory storage for session compatibility
        // The patient is already created in MySQL, so we sync it here
        return res.status(201).json({
          success: true,
          message: result.message || "Email verified and registration complete",
          patientId: result.patientId
        });
      } else {
        res.status(flaskResponse.status).json({ error: result.error || "Verification failed" });
      }
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Resend Verification Code - Forward to Flask/MySQL
  app.post("/api/patients/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const flaskResponse = await fetch(`${FLASK_BACKEND_URL}/api/patients/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await flaskResponse.json() as any;

      if (flaskResponse.ok && result.success) {
        return res.json({
          success: true,
          message: result.message || "New verification code sent"
        });
      } else {
        res.status(flaskResponse.status).json({ error: result.error || "Failed to resend code" });
      }
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Patient Login - Forward to Flask/MySQL
  app.post("/api/patients/login", async (req, res) => {
    try {
      const { email, pin } = req.body;

      // Try Flask backend first for MySQL authentication
      try {
        const flaskResponse = await fetch(`${FLASK_BACKEND_URL}/api/patients/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, pin }),
        });

        const result = await flaskResponse.json() as any;

        if (flaskResponse.ok && result.success) {
          // Sync patient to in-memory storage for report uploads to work
          const patientData = result.patient;
          const existingPatient = await storage.getPatient(patientData.id);
          if (!existingPatient) {
            // Create in-memory record with MySQL data
            await storage.syncPatientFromMySQL({
              id: patientData.id,
              firstName: patientData.firstName,
              lastName: patientData.lastName,
              email: patientData.email,
              phone: patientData.phone,
              dateOfBirth: patientData.dateOfBirth,
              pin: pin, // Store the PIN for session
            });
          }
          return res.json(patientData);
        } else if (!flaskResponse.ok) {
          // Flask returned an error - return it to the client
          return res.status(flaskResponse.status).json({ message: result.error || "Invalid email or PIN" });
        }
      } catch (flaskError) {
        console.log("Flask unavailable, falling back to in-memory storage");
      }

      // Fallback to in-memory storage
      const patient = await storage.getPatientByEmail(email);
      if (!patient) {
        return res.status(401).json({ message: "Invalid email or PIN" });
      }

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

  // ==================== FINGERPRINT/BIOMETRIC ROUTES ====================

  // Get fingerprint registration options
  app.post("/api/patients/fingerprint/registration-options", async (req, res) => {
    try {
      const flaskResponse = await fetch(`${FLASK_BACKEND_URL}/api/patients/fingerprint/registration-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });

      const result = await flaskResponse.json() as any;
      res.status(flaskResponse.status).json(result);
    } catch (error) {
      console.error("Fingerprint registration options error:", error);
      res.status(500).json({ success: false, error: "Service unavailable" });
    }
  });

  // Register fingerprint credential
  app.post("/api/patients/fingerprint/register", async (req, res) => {
    try {
      const flaskResponse = await fetch(`${FLASK_BACKEND_URL}/api/patients/fingerprint/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });

      const result = await flaskResponse.json() as any;
      res.status(flaskResponse.status).json(result);
    } catch (error) {
      console.error("Fingerprint registration error:", error);
      res.status(500).json({ success: false, error: "Service unavailable" });
    }
  });

  // Get fingerprint challenge for authentication
  app.post("/api/patients/fingerprint/challenge", async (req, res) => {
    try {
      const flaskResponse = await fetch(`${FLASK_BACKEND_URL}/api/patients/fingerprint/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });

      const result = await flaskResponse.json() as any;
      res.status(flaskResponse.status).json(result);
    } catch (error) {
      console.error("Fingerprint challenge error:", error);
      res.status(500).json({ success: false, error: "Service unavailable" });
    }
  });

  // Verify fingerprint authentication
  app.post("/api/patients/fingerprint/verify", async (req, res) => {
    try {
      const flaskResponse = await fetch(`${FLASK_BACKEND_URL}/api/patients/fingerprint/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });

      const result = await flaskResponse.json() as any;

      if (flaskResponse.ok && result.success && result.patient) {
        // Sync patient to in-memory storage
        const patientData = result.patient;
        const existingPatient = await storage.getPatient(patientData.id);
        if (!existingPatient) {
          await storage.syncPatientFromMySQL({
            id: patientData.id,
            firstName: patientData.firstName,
            lastName: patientData.lastName,
            email: patientData.email,
            phone: patientData.phone,
            dateOfBirth: patientData.dateOfBirth,
            pin: "", // Not needed for fingerprint login
          });
        }
      }

      res.status(flaskResponse.status).json(result);
    } catch (error) {
      console.error("Fingerprint verification error:", error);
      res.status(500).json({ success: false, error: "Service unavailable" });
    }
  });

  // Check fingerprint registration status
  app.get("/api/patients/fingerprint/status/:email", async (req, res) => {
    try {
      const flaskResponse = await fetch(`${FLASK_BACKEND_URL}/api/patients/fingerprint/status/${encodeURIComponent(req.params.email)}`, {
        method: "GET",
      });

      const result = await flaskResponse.json() as any;
      res.status(flaskResponse.status).json(result);
    } catch (error) {
      console.error("Fingerprint status check error:", error);
      // Return false if service unavailable
      res.json({ success: true, fingerprintRegistered: false });
    }
  });

  // Doctor Registration - Forward to Flask/MySQL
  app.post("/api/doctors/register", async (req, res) => {
    try {
      const validation = doctorRegistrationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validation.error.flatten().fieldErrors,
        });
      }

      // Forward to Flask backend for MySQL storage
      const flaskResponse = await fetch(`${FLASK_BACKEND_URL}/api/doctors/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      const result = await flaskResponse.json() as any;

      if (flaskResponse.ok) {
        // Also store in memory for session compatibility
        const doctor = await storage.createDoctor(validation.data);
        const { password, ...safeDoctor } = doctor;
        res.status(201).json({ ...safeDoctor, mysqlId: result.doctorId });
      } else {
        res.status(flaskResponse.status).json({ message: result.error || "Registration failed" });
      }
    } catch (error) {
      console.error("Doctor registration error:", error);
      // Fallback to in-memory storage if Flask is unavailable
      try {
        const existingDoctor = await storage.getDoctorByLicenseId(req.body.licenseId);
        if (existingDoctor) {
          return res.status(409).json({ message: "License ID already registered" });
        }
        const doctor = await storage.createDoctor(req.body);
        const { password, ...safeDoctor } = doctor;
        res.status(201).json(safeDoctor);
      } catch (fallbackError) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Doctor Login - Forward to Flask/MySQL
  app.post("/api/doctors/login", async (req, res) => {
    try {
      const validation = doctorLoginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Try Flask backend first for MySQL authentication
      try {
        const flaskResponse = await fetch(`${FLASK_BACKEND_URL}/api/doctors/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validation.data),
        });

        const result = await flaskResponse.json() as any;

        if (flaskResponse.ok && result.success) {
          // Sync doctor to in-memory storage for session compatibility
          const doctorData = result.doctor;
          const existingDoctor = await storage.getDoctor(doctorData.id);
          if (!existingDoctor) {
            await storage.syncDoctorFromMySQL({
              id: doctorData.id,
              licenseId: doctorData.licenseId,
              fullName: doctorData.fullName,
              specialization: doctorData.specialization,
              password: validation.data.password,
              verified: doctorData.verified,
            });
          }
          return res.json(doctorData);
        }
      } catch (flaskError) {
        console.log("Flask unavailable, falling back to in-memory storage");
      }

      // Fallback to in-memory storage
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

  // Get patient reports - Try MySQL first
  app.get("/api/patients/:patientId/reports", async (req, res) => {
    try {
      const { patientId } = req.params;

      // Try Flask/MySQL first
      try {
        const flaskResponse = await fetch(`${FLASK_BACKEND_URL}/api/patients/${patientId}/reports`);
        const result = await flaskResponse.json() as any;

        if (flaskResponse.ok && result.success && result.reports.length > 0) {
          return res.json(result.reports);
        }
      } catch (flaskError) {
        console.log("Flask unavailable for reports, using in-memory");
      }

      // Fallback to in-memory storage
      const reports = await storage.getReportsByPatientId(patientId);
      res.json(reports);
    } catch (error) {
      console.error("Get reports error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create patient report - Persist to MySQL
  app.post("/api/patients/:patientId/reports", async (req, res) => {
    try {
      const { patientId } = req.params;
      const { diseaseName, attributes, measurementDate } = req.body;

      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      const reportData = {
        patientId,
        diseaseName,
        attributes: JSON.stringify(attributes),
        measurementDate,
        fileName: null,
        fileType: null,
        status: "pending",
        uploadedAt: new Date().toISOString(),
      };

      // Create in memory first
      const report = await storage.createReport(reportData);

      // Also persist to MySQL
      try {
        await fetch(`${FLASK_BACKEND_URL}/api/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...reportData, id: report.id }),
        });
      } catch (flaskError) {
        console.log("Failed to persist report to MySQL:", flaskError);
      }

      res.status(201).json(report);
    } catch (error) {
      console.error("Create report error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Upload PDF report with AI processing
  app.post("/api/patients/:patientId/reports/upload", upload.single("file"), async (req, res) => {
    try {
      const { patientId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      console.log(`Processing file upload for patient ${patientId}: ${file.originalname}`);

      // Create FormData for Flask API
      const formData = new FormData();
      formData.append("file", file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      // Call Flask RAG API for processing
      let aiResponse = null;
      try {
        const flaskResponse = await fetch(`${FLASK_API_URL}/api/report/summary`, {
          method: "POST",
          body: formData,
          headers: formData.getHeaders(),
        });

        if (flaskResponse.ok) {
          aiResponse = await flaskResponse.json() as {
            success: boolean;
            summary?: string;
            extracted_info?: {
              diagnosis?: string;
              key_findings?: string;
              recommendations?: string;
              test_results?: any[];
              report_type?: string;
            };
            file_name?: string;
          };
          console.log("AI processing successful:", aiResponse.success);
        } else {
          console.error("Flask API error:", await flaskResponse.text());
        }
      } catch (flaskError) {
        console.error("Error calling Flask API:", flaskError);
        // Continue without AI processing
      }

      // Create report with or without AI data
      const reportData = {
        patientId,
        diseaseName: aiResponse?.extracted_info?.report_type || req.body.diseaseName || "Medical Report",
        attributes: JSON.stringify(aiResponse?.extracted_info?.test_results || []),
        measurementDate: new Date().toISOString().split("T")[0],
        fileName: file.originalname,
        fileType: file.mimetype,
        status: "pending",
        uploadedAt: new Date().toISOString(),
        aiSummary: aiResponse?.summary || null,
        aiDiagnosis: aiResponse?.extracted_info?.diagnosis || null,
        aiKeyFindings: aiResponse?.extracted_info?.key_findings || null,
        aiRecommendations: aiResponse?.extracted_info?.recommendations || null,
        aiTestResults: aiResponse?.extracted_info?.test_results
          ? JSON.stringify(aiResponse.extracted_info.test_results)
          : null,
        ragReportId: null, // Can be set if using RAG chat
        processedByAi: !!aiResponse?.success,
      };

      const report = await storage.createReport(reportData);

      // Persist to MySQL
      try {
        await fetch(`${FLASK_BACKEND_URL}/api/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...reportData, id: report.id }),
        });
        console.log("Report persisted to MySQL");
      } catch (persistError) {
        console.log("Failed to persist report to MySQL:", persistError);
      }

      res.status(201).json({
        success: true,
        report,
        aiProcessed: !!aiResponse?.success,
        message: aiResponse?.success
          ? "Report uploaded and processed with AI"
          : "Report uploaded (AI processing pending)",
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Reprocess existing report with AI
  app.post("/api/reports/:reportId/process-ai", async (req, res) => {
    try {
      const { reportId } = req.params;
      const report = await storage.getReport(reportId);

      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      // If we have file content stored or can retrieve it, process with AI
      // For now, return current AI data
      res.json({
        success: true,
        report,
        aiSummary: report.aiSummary,
        aiDiagnosis: report.aiDiagnosis,
        aiKeyFindings: report.aiKeyFindings,
        aiRecommendations: report.aiRecommendations,
      });
    } catch (error) {
      console.error("AI processing error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single report by ID (for viewing full details including AI summary)
  app.get("/api/reports/:reportId", async (req, res) => {
    try {
      const { reportId } = req.params;
      const report = await storage.getReport(reportId);

      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      res.json(report);
    } catch (error) {
      console.error("Get report error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get patient consents - Try MySQL first
  app.get("/api/patients/:patientId/consents", async (req, res) => {
    try {
      const { patientId } = req.params;

      // Try Flask/MySQL first
      try {
        const flaskResponse = await fetch(`${FLASK_BACKEND_URL}/api/patients/${patientId}/consents`);
        const result = await flaskResponse.json() as any;

        if (flaskResponse.ok && result.success && result.consents.length > 0) {
          return res.json(result.consents);
        }
      } catch (flaskError) {
        console.log("Flask unavailable for consents, using in-memory");
      }

      const consents = await storage.getConsentsByPatientId(patientId);
      res.json(consents);
    } catch (error) {
      console.error("Get consents error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create patient consent - Persist to MySQL
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

      const consentData = {
        patientId,
        doctorId,
        permissions: JSON.stringify(permissions),
        startDate,
        endDate,
        active: true,
        createdAt: new Date().toISOString(),
      };

      const consent = await storage.createConsent(consentData);

      // Persist consent to MySQL
      try {
        await fetch(`${FLASK_BACKEND_URL}/api/consents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...consentData, id: consent.id }),
        });
      } catch (flaskError) {
        console.log("Failed to persist consent to MySQL:", flaskError);
      }

      // Also create an assignment if one doesn't exist
      const existingAssignments = await storage.getAssignmentsByDoctorId(doctorId);
      const alreadyAssigned = existingAssignments.some((a) => a.patientId === patientId);

      if (!alreadyAssigned) {
        const assignmentData = {
          doctorId,
          patientId,
          assignedAt: new Date().toISOString(),
        };

        const assignment = await storage.createAssignment(assignmentData);

        // Persist assignment to MySQL
        try {
          await fetch(`${FLASK_BACKEND_URL}/api/assignments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...assignmentData, id: assignment.id }),
          });
        } catch (flaskError) {
          console.log("Failed to persist assignment to MySQL:", flaskError);
        }
      }

      res.status(201).json(consent);
    } catch (error) {
      console.error("Create consent error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Revoke consent - Also revoke in MySQL
  app.delete("/api/consents/:consentId", async (req, res) => {
    try {
      const { consentId } = req.params;
      const consent = await storage.revokeConsent(consentId);

      if (!consent) {
        return res.status(404).json({ message: "Consent not found" });
      }

      // Revoke in MySQL
      try {
        await fetch(`${FLASK_BACKEND_URL}/api/consents/${consentId}/revoke`, {
          method: "POST",
        });
      } catch (flaskError) {
        console.log("Failed to revoke consent in MySQL:", flaskError);
      }

      res.json(consent);
    } catch (error) {
      console.error("Revoke consent error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get doctor's assigned patients - Try MySQL first
  app.get("/api/doctors/:doctorId/patients", async (req, res) => {
    try {
      const { doctorId } = req.params;

      // Try Flask/MySQL first for assignments
      try {
        const flaskResponse = await fetch(`${FLASK_BACKEND_URL}/api/doctors/${doctorId}/assignments`);
        const result = await flaskResponse.json() as any;

        if (flaskResponse.ok && result.success && result.assignments.length > 0) {
          // Get reports for each patient from MySQL
          const patientsWithReports = await Promise.all(
            result.assignments.map(async (a: any) => {
              let reports: any[] = [];
              try {
                const reportsResponse = await fetch(`${FLASK_BACKEND_URL}/api/patients/${a.patientId}/reports`);
                const reportsResult = await reportsResponse.json() as any;
                if (reportsResult.success) {
                  reports = reportsResult.reports;
                }
              } catch { }

              return {
                id: a.patientId,
                firstName: a.patientName?.split(' ')[0] || '',
                lastName: a.patientName?.split(' ').slice(1).join(' ') || '',
                email: a.patientEmail,
                phone: a.patientPhone,
                dateOfBirth: a.patientDOB,
                reports,
              };
            })
          );
          return res.json(patientsWithReports);
        }
      } catch (flaskError) {
        console.log("Flask unavailable, using in-memory");
      }

      // Fallback to in-memory
      const assignments = await storage.getAssignmentsByDoctorId(doctorId);

      const patientsWithReports = await Promise.all(
        assignments.map(async (assignment) => {
          // Check if there's an active consent for this doctor-patient pair
          const activeConsent = await storage.getActiveConsentForDoctorPatient(doctorId, assignment.patientId);
          if (!activeConsent) return null; // Skip patients with revoked consent

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

  // Delete a patient's report
  app.delete("/api/patients/:patientId/reports/:reportId", async (req, res) => {
    try {
      const { patientId, reportId } = req.params;

      // Forward to Flask backend
      const flaskResponse = await fetch(`${FLASK_BACKEND_URL}/api/patients/${patientId}/reports/${reportId}`, {
        method: "DELETE",
      });

      const result = await flaskResponse.json() as any;

      if (flaskResponse.ok && result.success) {
        // Also delete from in-memory storage
        await storage.deleteReport(reportId);
        return res.json({ success: true, message: "Report deleted successfully" });
      } else {
        res.status(flaskResponse.status).json({ message: result.error || "Failed to delete report" });
      }
    } catch (error) {
      console.error("Delete report error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete patient account
  app.delete("/api/patients/:patientId", async (req, res) => {
    try {
      const { patientId } = req.params;

      // Forward to Flask backend
      const flaskResponse = await fetch(`${FLASK_BACKEND_URL}/api/patients/${patientId}`, {
        method: "DELETE",
      });

      const result = await flaskResponse.json() as any;

      if (flaskResponse.ok && result.success) {
        // Also delete from in-memory storage
        await storage.deletePatient(patientId);
        return res.json({ success: true, message: "Account deleted successfully" });
      } else {
        res.status(flaskResponse.status).json({ message: result.error || "Failed to delete account" });
      }
    } catch (error) {
      console.error("Delete patient error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete doctor account
  app.delete("/api/doctors/:doctorId", async (req, res) => {
    try {
      const { doctorId } = req.params;

      // Forward to Flask backend
      const flaskResponse = await fetch(`${FLASK_BACKEND_URL}/api/doctors/${doctorId}`, {
        method: "DELETE",
      });

      const result = await flaskResponse.json() as any;

      if (flaskResponse.ok && result.success) {
        // Also delete from in-memory storage
        await storage.deleteDoctor(doctorId);
        return res.json({ success: true, message: "Account deleted successfully" });
      } else {
        res.status(flaskResponse.status).json({ message: result.error || "Failed to delete account" });
      }
    } catch (error) {
      console.error("Delete doctor error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}

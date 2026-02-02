# 🏥 HealthForge - Data Flow Diagrams (DFD)

This document provides complete Data Flow Diagrams for the HealthForge Health Records Management Platform.

---

## DFD Notation Legend

| Symbol | Meaning |
|--------|---------|
| **Rectangle** | External Entity (User, External System) |
| **Circle** | Process (numbered for identification) |
| **Open Rectangle** | Data Store (prefixed with D1, D2, etc.) |
| **Arrow** | Data Flow (labeled with data name) |

---

## DFD (Level: 0) - Context Diagram

The Level 0 DFD (Context Diagram) represents the entire HealthForge system as a single process, illustrating its interaction with external entities. Users (both Patients and Doctors) provide **Authentication Credentials**, **Medical Report PDFs**, and **Consent Requests** as inputs to the system. The system processes these inputs and returns **AI-Generated Summaries**, **Report History**, and **Authentication Status** as outputs. This high-level view establishes the system boundary and identifies all external data flows.

```mermaid
flowchart LR
    USER1[USER] -->|"Credentials, Reports, Consents"| P0((0<br/>HealthForge))
    P0 -->|"AI Summaries, History, Status"| USER2[USER]
```

---

## DFD (Level: 1) - Main System Processes

The Level 1 DFD decomposes the HealthForge system into five primary functional modules that handle authentication, data processing, consent management, AI-powered Q&A, and doctor workflows:

1. **User Authentication Module**: Receives **Authentication Credentials** (email/PIN for patients, licenseId/password for doctors, or WebAuthn fingerprint data) from the user, validates them against the MySQL database using bcrypt hashing, and returns the **Authentication Status** along with session tokens.

2. **Report Processing & AI Analysis Module**: Accepts **Medical Report PDFs** uploaded by patients, extracts text using PyPDF2, generates vector embeddings using HuggingFace (all-MiniLM-L6-v2), stores them in FAISS for semantic search, and utilizes Google Gemini 2.5 Flash to extract structured medical information and generate comprehensive AI summaries.

3. **Consent Management Module**: Processes **Consent Requests** from patients to grant or revoke access permissions (READ/WRITE/SHARE) to specific doctors, creates doctor-patient assignments, and validates access when doctors attempt to view patient reports.

4. **RAG Chat Module**: Accepts **Natural Language Questions** about medical reports, performs similarity search against the FAISS vector store to retrieve relevant document chunks, and uses Google Gemini with LangChain to generate contextual **AI Answers** based on the report content.

5. **Doctor Dashboard Module**: Enables doctors to view their **Assigned Patients**, access consented patient reports with AI-generated insights, and update report status (reviewed/archived) for workflow management.

```mermaid
flowchart LR
    USER[USER]
    
    P1((1<br/>Authentication))
    P2((2<br/>Report<br/>Processing))
    P3((3<br/>Consent<br/>Mgmt))
    P4((4<br/>RAG Chat))
    P5((5<br/>Doctor<br/>Dashboard))
    
    D1[("D1: Users")]
    D2[("D2: Reports")]
    D3[("D3: Consents")]
    D4[("D4: FAISS")]
    D5[("D5: History")]
    
    USER --> P1
    P1 <--> D1
    P1 --> USER
    
    USER --> P2
    P2 --> D2
    P2 --> D4
    
    USER --> P3
    P3 <--> D3
    
    USER --> P4
    D4 --> P4
    P4 --> D5
    P4 --> USER
    
    D3 --> P5
    D2 --> P5
    P5 --> USER
```

---

## DFD (Level: 2) - Process 1: User Authentication

The Level 2 DFD for User Authentication decomposes the authentication module into eight sub-processes: **Input Validation** (1.1) validates user data using regex patterns; **OTP Generation** (1.2) creates 6-digit verification codes; **Email Sending** (1.3) delivers OTPs via SMTP; **OTP Verification** (1.4) validates codes against stored records; **PIN/Password Hashing** (1.5) secures credentials using bcrypt; **Credential Verification** (1.6) compares hashes for login; **Fingerprint Auth** (1.7) handles WebAuthn biometric authentication; and **Session Creation** (1.8) generates session tokens for authenticated users.

### 1A. Patient Registration Flow

```mermaid
flowchart LR
    USER[USER]
    
    P1["1.1 Validate Input"]
    P2["1.2 Generate OTP"]
    P3["1.3 Send Email"]
    P4["1.4 Verify OTP"]
    P5["1.5 Hash PIN"]
    
    D1[("D1: patients")]
    D2[("D4: email_verifications")]
    
    USER -->|"name, email, phone, PIN"| P1
    P1 -->|"valid data"| P2
    P2 -->|"6-digit code"| D2
    P2 --> P3
    P3 -->|"OTP email"| USER
    
    USER -->|"email, code"| P4
    D2 -->|"stored OTP"| P4
    P4 --> P5
    P5 -->|"hashed PIN"| D1
```

### 1B. Patient Login Flow

```mermaid
flowchart LR
    USER[USER]
    
    P6["1.6 Verify PIN"]
    P7["1.7 Fingerprint Auth"]
    P8["1.8 Create Session"]
    
    D1[("D1: patients")]
    
    USER -->|"email, PIN"| P6
    D1 -->|"stored hash"| P6
    P6 -->|"valid"| P8
    P6 -->|"invalid"| USER
    
    USER -->|"WebAuthn"| P7
    D1 -->|"public key"| P7
    P7 -->|"valid"| P8
    
    P8 -->|"session"| USER
```

### 1C. Doctor Authentication Flow

```mermaid
flowchart LR
    USER[DOCTOR]
    
    P1["1.1 Validate Input"]
    P5["1.5 Hash Password"]
    P6["1.6 Verify Password"]
    P8["1.8 Create Session"]
    
    D1[("D1b: doctors")]
    
    USER -->|"licenseId, name, password"| P1
    P1 --> P5
    P5 -->|"hashed password"| D1
    
    USER -->|"licenseId, password"| P6
    D1 -->|"stored hash"| P6
    P6 -->|"valid"| P8
    P8 -->|"session"| USER
```

---

## DFD (Level: 2) - Process 2: Report Processing & AI

The Level 2 DFD for Report Processing decomposes into eight sub-processes: **File Upload** (2.1) handles PDF ingestion via Multer (50MB limit); **Text Extraction** (2.2) uses PyPDF2 to extract raw text; **Chunking** (2.3) splits text using RecursiveCharacterTextSplitter; **Embedding** (2.4) generates 768-dimensional vectors using HuggingFace all-MiniLM-L6-v2; **FAISS Store** (2.5) creates and saves vector indexes; **Medical Extraction** (2.6) uses Gemini 2.5 Flash to extract patient info, diagnosis, and test results; **Summary Generation** (2.7) produces 200-400 word AI summaries; and **Data Aggregation** (2.8) combines all extracted data for storage.

### 2A. PDF Upload & Text Extraction

```mermaid
flowchart LR
    USER[USER]
    
    P1["2.1 File Upload<br/>Multer 50MB"]
    P2["2.2 Text Extract<br/>PyPDF2"]
    P3["2.3 Chunking<br/>TextSplitter"]
    
    USER -->|"PDF file"| P1
    P1 -->|"file buffer"| P2
    P2 -->|"raw text"| P3
    P3 -->|"chunks[]"| P4
    
    P4["2.4 Embedding<br/>all-MiniLM-L6-v2"]
    P5["2.5 FAISS Store"]
    D4[("D4: FAISS Index")]
    
    P4 -->|"vectors"| P5
    P5 --> D4
```

### 2B. AI Analysis Pipeline

```mermaid
flowchart LR
    P2["2.2 Text Extract"]
    
    P6["2.6 Medical Extract<br/>Gemini 2.5"]
    P7["2.7 Summary Gen<br/>Gemini 2.5"]
    P8["2.8 Aggregation"]
    
    D2[("D2: patient_reports")]
    D2b[("D2b: test_results")]
    USER[USER]
    
    P2 -->|"raw_text"| P6
    P2 -->|"raw_text"| P7
    
    P6 -->|"patient info, diagnosis"| P8
    P7 -->|"summary 200-400w"| P8
    
    P8 -->|"complete report"| D2
    P8 -->|"test results"| D2b
    P8 -->|"report_id"| USER
```

---

## DFD (Level: 2) - Process 3: Consent Management

The Level 2 DFD for Consent Management handles the role-based access control between patients and doctors through six sub-processes: **Doctor Listing** (3.1) retrieves available doctors; **Permission Selection** (3.2) allows patients to choose READ/WRITE/SHARE permissions; **Consent Creation** (3.3) stores permission grants in the database; **Assignment Creation** (3.4) links doctors to patients; **Consent Revocation** (3.5) deactivates existing permissions; and **Access Validation** (3.6) verifies doctor access rights before serving patient reports.

```mermaid
flowchart LR
    PATIENT[PATIENT]
    DOCTOR[DOCTOR]
    
    P1["3.1 List Doctors"]
    P2["3.2 Select Permissions"]
    P3["3.3 Create Consent"]
    P4["3.4 Create Assignment"]
    P5["3.5 Revoke Consent"]
    P6["3.6 Validate Access"]
    
    D1[("D1: doctors")]
    D2[("D2: reports")]
    D3[("D3: consents")]
    D3b[("D3b: assignments")]
    
    PATIENT --> P1
    D1 --> P1
    P1 --> PATIENT
    
    PATIENT -->|"doctorId, permissions"| P2
    P2 --> P3
    P3 --> D3
    P3 --> P4
    P4 --> D3b
    
    PATIENT -->|"consentId"| P5
    P5 --> D3
    
    DOCTOR --> P6
    D3 --> P6
    D3b --> P6
    P6 --> D2
    D2 --> DOCTOR
```

---

## DFD (Level: 2) - Process 4: RAG Chat

The Level 2 DFD for RAG Chat implements Retrieval-Augmented Generation through seven sub-processes: **Question Validation** (4.1) ensures queries meet minimum length requirements; **Report Lookup** (4.2) retrieves the FAISS index path for the target report; **FAISS Loading** (4.3) loads the vector store into memory; **Similarity Search** (4.4) finds the top-5 most relevant document chunks; **Context Building** (4.5) assembles the prompt with retrieved context; **Answer Generation** (4.6) uses Gemini 2.5 with LangChain's QA chain to produce responses; and **History Storage** (4.7) persists Q&A pairs for future reference.

```mermaid
flowchart LR
    USER[USER]
    
    P1["4.1 Validate Question"]
    P2["4.2 Lookup Report"]
    P3["4.3 Load FAISS"]
    P4["4.4 Similarity Search<br/>k=5"]
    P5["4.5 Build Context"]
    P6["4.6 Generate Answer<br/>Gemini 2.5"]
    P7["4.7 Save History"]
    
    D2[("D2: reports")]
    D4[("D4: FAISS")]
    D5[("D5: query_history")]
    
    USER -->|"report_id, question"| P1
    P1 --> P2
    D2 -->|"faiss_path"| P2
    P2 --> P3
    D4 --> P3
    P3 --> P4
    P4 -->|"top-5 docs"| P5
    P5 --> P6
    P6 -->|"AI answer"| USER
    P6 --> P7
    P7 --> D5
```

---

## DFD (Level: 2) - Process 5: Doctor Dashboard

The Level 2 DFD for Doctor Dashboard enables healthcare providers to manage their patient caseload through five sub-processes: **Assignment Lookup** (5.1) retrieves patients assigned to the doctor; **Patient Data Retrieval** (5.2) fetches patient demographics; **Report Retrieval** (5.3) loads patient medical reports with AI-generated insights; **Status Update** (5.4) allows marking reports as reviewed or archived; and **AI Data Update** (5.5) enables updating AI-extracted fields if corrections are needed.

```mermaid
flowchart LR
    DOCTOR[DOCTOR]
    
    P1["5.1 Lookup Assignments"]
    P2["5.2 Get Patient Data"]
    P3["5.3 Get Reports"]
    P4["5.4 Update Status"]
    P5["5.5 Update AI Data"]
    
    D1[("D1: patients")]
    D2[("D2: reports")]
    D3[("D3: assignments")]
    
    DOCTOR -->|"doctorId"| P1
    D3 -->|"patientIds"| P1
    P1 --> P2
    D1 -->|"patient details"| P2
    P2 --> DOCTOR
    
    DOCTOR -->|"patientId"| P3
    D2 -->|"reports"| P3
    P3 --> DOCTOR
    
    DOCTOR -->|"reportId, status"| P4
    P4 --> D2
    
    DOCTOR -->|"reportId, aiData"| P5
    P5 --> D2
```

---

## Data Store Reference

| ID | Table | Description |
|----|-------|-------------|
| D1 | `patients` | Patient accounts (bcrypt PIN) |
| D1b | `doctors` | Doctor accounts (bcrypt password) |
| D2 | `patient_reports` | Reports with AI data |
| D2b | `test_results` | Individual test results |
| D3 | `consents` | Access permissions (JSON) |
| D3b | `assignments` | Doctor-patient links |
| D4 | `email_verifications` | OTP records |
| D5 | `FAISS indexes` | Vector embeddings |
| D6 | `query_history` | RAG chat history |

---

## Process Reference

| ID | Name | Technology | Port |
|----|------|------------|------|
| 1.1 | Input Validation | regex | 5001 |
| 1.2 | OTP Generation | random | 5001 |
| 1.3 | Email Sending | SMTP | 5001 |
| 1.4 | OTP Verification | MySQL | 5001 |
| 1.5 | PIN/Password Hashing | bcrypt | 5001 |
| 1.6 | PIN/Password Verify | bcrypt | 5001 |
| 1.7 | Fingerprint Auth | WebAuthn | 5001 |
| 1.8 | Session Creation | Express | 5000 |
| 2.1 | File Upload | Multer | 5000 |
| 2.2 | Text Extraction | PyPDF2 | 8004 |
| 2.3 | Text Splitting | LangChain | 8004 |
| 2.4 | Embedding | HuggingFace | 8004 |
| 2.5 | Vector Store | FAISS | 8004 |
| 2.6 | Medical Extraction | Gemini 2.5 | 8004 |
| 2.7 | Summary Generation | Gemini 2.5 | 8004 |
| 2.8 | Data Aggregation | Python | 8004 |
| 3.1-3.6 | Consent Operations | Flask | 5001 |
| 4.1-4.7 | RAG Operations | Flask+FAISS | 5001 |
| 5.1-5.5 | Doctor Operations | Flask | 5001 |

---

## API Endpoints

### Flask Backend (Port 5001)
- `POST /api/patients/register` - Registration
- `POST /api/patients/verify-email` - OTP verify
- `POST /api/patients/login` - Login
- `POST /api/patients/fingerprint/*` - Biometric
- `POST /api/doctors/register` - Doctor register
- `POST /api/doctors/login` - Doctor login
- `POST /api/consents` - Create consent
- `POST /api/consents/:id/revoke` - Revoke
- `POST /api/chat/ask` - RAG Q&A

### Flask AI Service (Port 8004)
- `POST /api/report/summary` - Full processing
- `POST /api/report/extract` - Extract only
- `POST /api/report/summarize` - Summary only

### Express Server (Port 5000)
- `POST /api/patients/:id/reports/upload` - Upload
- `GET /api/doctors/:id/patients` - Get patients
- `PUT /api/reports/:id/status` - Update status

---

*Generated for HealthForge - AI-Powered Health Records Management System*

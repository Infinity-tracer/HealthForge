# 🏥 HealthForge - UML Architecture Diagrams

This document provides comprehensive Context, Use Case, and Sequence diagrams for the HealthForge Health Records Management Platform.

---

## 1. Context Diagram

```mermaid
flowchart TB
    subgraph External["External Services"]
        MySQL[(MySQL<br/>medical_reports_db)]
        FAISS[(FAISS<br/>Vector Store)]
        Gemini[Google Gemini 2.5<br/>LLM API]
        HuggingFace[HuggingFace<br/>Embeddings]
    end
    
    subgraph Users["Users"]
        Patient[🧑‍⚕️ Patient]
        Doctor[👨‍⚕️ Doctor]
    end
    
    subgraph HealthForge["HealthForge Platform"]
        Core[🏥 HealthForge<br/>AI-Powered Health Records<br/>Management System]
    end
    
    Patient -->|Register/Login with PIN<br/>Upload medical reports<br/>View AI summaries<br/>Manage consents| Core
    Doctor -->|Register with License ID<br/>View assigned patients<br/>Access shared reports<br/>Review AI insights| Core
    
    Core <-->|Store/Query<br/>patients, doctors,<br/>reports, consents| MySQL
    Core <-->|Vector search<br/>RAG Q&A| FAISS
    Core <-->|Extract medical info<br/>Generate summaries<br/>Answer questions| Gemini
    Core <-->|Text embeddings<br/>for RAG| HuggingFace
```

---

## 2. System Architecture Diagram

```mermaid
flowchart TB
    subgraph Frontend["Frontend Layer - React :5000"]
        UI[Streamlit Frontend]
        P1[Landing Page]
        P2[Patient Registration]
        P3[Patient Login]
        P4[Patient Dashboard]
        P5[Doctor Registration]
        P6[Doctor Login]
        P7[Doctor Dashboard]
    end
    
    subgraph NodeServer["API Gateway - Node.js/Express :5000"]
        NS[Express Server]
        Routes[API Routes]
        Storage[Storage Layer]
        FileUpload[Multer File Upload]
    end
    
    subgraph Backend["Backend Layer - Flask"]
        MainAPI[Flask Backend :5001]
        UserRoutes[User Routes]
        ReportRoutes[Report Routes]
        ChatRoutes[Chat Routes]
        DataRoutes[Data Routes]
    end
    
    subgraph AIServices["AI Services Layer"]
        SummaryAPI[Summary Service :8004]
        RAGAPI[RAG Service :8001]
    end
    
    subgraph AIComponents["AI Components"]
        PDFProcessor[PDF Processor<br/>PyPDF2]
        MedicalExtractor[Medical Extractor<br/>Gemini]
        RAGEngine[RAG Engine<br/>LangChain + FAISS]
    end
    
    subgraph Database["Data Layer"]
        MySQL[(MySQL<br/>medical_reports_db)]
        FAISSIndex[(FAISS Indexes<br/>faiss_indexes/)]
    end
    
    UI --> P1 & P2 & P3 & P4 & P5 & P6 & P7
    P1 & P2 & P3 & P4 & P5 & P6 & P7 --> NS
    NS --> Routes
    Routes --> Storage
    Storage --> FileUpload
    
    Routes --> MainAPI
    Routes --> SummaryAPI
    Routes --> RAGAPI
    
    MainAPI --> UserRoutes & ReportRoutes & ChatRoutes & DataRoutes
    UserRoutes & ReportRoutes & ChatRoutes & DataRoutes --> MySQL
    
    SummaryAPI --> PDFProcessor
    SummaryAPI --> MedicalExtractor
    SummaryAPI --> MySQL
    
    RAGAPI --> PDFProcessor
    RAGAPI --> RAGEngine
    RAGEngine --> FAISSIndex
    RAGEngine --> MedicalExtractor
```

---

## 3. Use Case Diagram

```mermaid
flowchart LR
    subgraph Actors["Actors"]
        Patient((🧑‍⚕️ Patient))
        Doctor((👨‍⚕️ Doctor))
        System((⚙️ System))
    end
    
    subgraph Authentication["Authentication"]
        UC1([Register with Email])
        UC2([Verify Email OTP])
        UC3([Login with PIN])
        UC4([Fingerprint Auth])
        UC5([Doctor Register])
        UC6([Doctor Login])
    end
    
    subgraph ReportManagement["Medical Report Management"]
        UC7([Upload PDF Report])
        UC8([View Report History])
        UC9([View AI Summary])
        UC10([Download Report])
        UC11([Delete Report])
    end
    
    subgraph AIFeatures["AI Features"]
        UC12([Extract Patient Info])
        UC13([Generate Summary])
        UC14([View Key Findings])
        UC15([Chat with Report])
        UC16([Get Recommendations])
    end
    
    subgraph ConsentManagement["Consent Management"]
        UC17([Grant Doctor Access])
        UC18([Set Permissions])
        UC19([Revoke Consent])
        UC20([View Active Consents])
    end
    
    subgraph DoctorFeatures["Doctor Features"]
        UC21([View Assigned Patients])
        UC22([Access Patient Reports])
        UC23([View AI Insights])
        UC24([Mark Report Reviewed])
        UC25([Archive Report])
    end
    
    subgraph SystemOperations["System Operations"]
        UC26([Process PDF])
        UC27([Create Vector Store])
        UC28([Generate Embeddings])
        UC29([Store in MySQL])
    end
    
    Patient --> UC1 & UC2 & UC3 & UC4
    Patient --> UC7 & UC8 & UC9 & UC10 & UC11
    Patient --> UC15 & UC16
    Patient --> UC17 & UC18 & UC19 & UC20
    
    Doctor --> UC5 & UC6
    Doctor --> UC21 & UC22 & UC23 & UC24 & UC25
    
    System --> UC12 & UC13 & UC14
    System --> UC26 & UC27 & UC28 & UC29
    
    UC7 -.->|triggers| UC26
    UC26 -.->|includes| UC12
    UC26 -.->|includes| UC13
    UC26 -.->|includes| UC27
    UC15 -.->|requires| UC27
    UC22 -.->|requires| UC17
```

---

## 4. Detailed Use Case Descriptions

| Use Case ID | Name | Actor | Description |
|-------------|------|-------|-------------|
| UC1 | Register with Email | Patient | Create account with email, phone, DOB, and 6-digit PIN |
| UC2 | Verify Email OTP | Patient | Verify email with 6-digit OTP sent via SMTP |
| UC3 | Login with PIN | Patient | Access dashboard using email and PIN |
| UC4 | Fingerprint Auth | Patient | WebAuthn-based biometric login |
| UC5 | Doctor Register | Doctor | Create account with license ID and specialization |
| UC6 | Doctor Login | Doctor | Access dashboard with license ID and password |
| UC7 | Upload PDF Report | Patient | Upload medical report PDF for AI processing |
| UC9 | View AI Summary | Patient | View AI-generated summary of medical report |
| UC15 | Chat with Report | Patient | Ask questions about report using RAG |
| UC17 | Grant Doctor Access | Patient | Share reports with specific doctors |
| UC22 | Access Patient Reports | Doctor | View reports from consented patients |

---

## 5. Sequence Diagrams

### 5.1 Patient Registration Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    participant UI as React Frontend
    participant Express as Node.js Server<br/>:5000
    participant Flask as Flask Backend<br/>:5001
    participant SMTP as Email Service
    participant MySQL as MySQL Database
    
    Patient->>UI: Fill registration form
    UI->>UI: Validate input fields
    
    UI->>Express: POST /api/patients/register
    activate Express
    
    Express->>Flask: POST /api/auth/patient/register
    activate Flask
    
    Flask->>MySQL: Check email exists
    MySQL-->>Flask: Email status
    
    alt Email exists
        Flask-->>Express: Error: Email already registered
        Express-->>UI: 400 Bad Request
        UI-->>Patient: Show error message
    else Email available
        Flask->>Flask: Hash PIN with bcrypt
        Flask->>Flask: Generate 6-digit OTP
        Flask->>MySQL: Store verification record
        
        Flask->>SMTP: Send verification email
        SMTP-->>Flask: Email sent
        
        Flask-->>Express: Verification email sent
        deactivate Flask
        Express-->>UI: Success: Check email
        deactivate Express
        UI-->>Patient: Show OTP input form
    end
```

### 5.2 Email Verification Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    participant UI as React Frontend
    participant Express as Node.js Server<br/>:5000
    participant Flask as Flask Backend<br/>:5001
    participant MySQL as MySQL Database
    
    Patient->>UI: Enter 6-digit OTP
    UI->>UI: Validate OTP format
    
    UI->>Express: POST /api/patients/verify-email
    activate Express
    
    Express->>Flask: POST /api/auth/patient/verify-email
    activate Flask
    
    Flask->>MySQL: Query verification record
    MySQL-->>Flask: Verification data
    
    alt OTP expired
        Flask-->>Express: Error: OTP expired
        Express-->>UI: 400 Bad Request
        UI-->>Patient: Show expiry message
    else OTP invalid
        Flask->>MySQL: Increment attempts
        Flask-->>Express: Error: Invalid OTP
        Express-->>UI: 400 Bad Request
        UI-->>Patient: Show retry message
    else OTP valid
        Flask->>MySQL: Create patient record
        Flask->>MySQL: Mark verification complete
        Flask->>MySQL: Delete verification record
        
        Flask-->>Express: Patient created successfully
        deactivate Flask
        Express-->>UI: 201 Created
        deactivate Express
        UI->>UI: Redirect to login
        UI-->>Patient: Show success message
    end
```

### 5.3 Medical Report Upload with AI Processing

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    participant UI as React Frontend
    participant Express as Node.js Server<br/>:5000
    participant SummaryAPI as Summary Service<br/>:8004
    participant Gemini as Google Gemini API
    participant MySQL as MySQL Database
    
    Patient->>UI: Select PDF file
    UI->>UI: Validate file (type, size)
    Patient->>UI: Click Upload
    
    UI->>Express: POST /api/patients/:id/reports/upload
    activate Express
    Note over Express: Multer processes file
    
    Express->>SummaryAPI: POST /api/report/summary
    activate SummaryAPI
    Note over SummaryAPI: FormData with PDF
    
    SummaryAPI->>SummaryAPI: Extract text from PDF
    Note over SummaryAPI: PyPDF2 extraction
    
    SummaryAPI->>Gemini: Extract medical info
    activate Gemini
    Note over Gemini: Patient name, age, diagnosis<br/>test results, findings
    Gemini-->>SummaryAPI: Structured JSON
    deactivate Gemini
    
    SummaryAPI->>Gemini: Generate summary
    activate Gemini
    Note over Gemini: 200-400 word summary
    Gemini-->>SummaryAPI: Medical summary
    deactivate Gemini
    
    SummaryAPI->>MySQL: Store report with AI data
    MySQL-->>SummaryAPI: Report ID
    
    SummaryAPI-->>Express: Complete analysis
    deactivate SummaryAPI
    
    Express-->>UI: Report processed
    deactivate Express
    
    UI->>UI: Update report list
    UI-->>Patient: Show AI summary
```

### 5.4 RAG Chat with Medical Report

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    participant UI as React Frontend
    participant Express as Node.js Server<br/>:5000
    participant RAGAPI as RAG Service<br/>:8001
    participant FAISS as FAISS Vector Store
    participant HF as HuggingFace Embeddings
    participant Gemini as Google Gemini API
    
    Patient->>UI: Type question about report
    UI->>UI: Validate input
    
    UI->>Express: POST /api/rag/chat
    activate Express
    
    Express->>RAGAPI: POST /api/rag/chat
    activate RAGAPI
    Note over RAGAPI: {report_id, question}
    
    RAGAPI->>HF: Create question embedding
    HF-->>RAGAPI: Query vector [768 dims]
    
    RAGAPI->>FAISS: Similarity search
    activate FAISS
    Note over FAISS: Load index from<br/>faiss_indexes/{report_id}
    FAISS-->>RAGAPI: Top-K relevant chunks
    deactivate FAISS
    
    RAGAPI->>RAGAPI: Build RAG prompt
    Note over RAGAPI: Context + Question
    
    RAGAPI->>Gemini: Generate answer
    activate Gemini
    Gemini-->>RAGAPI: Contextual answer
    deactivate Gemini
    
    RAGAPI-->>Express: Answer + confidence
    deactivate RAGAPI
    
    Express-->>UI: Chat response
    deactivate Express
    
    UI-->>Patient: Display AI answer
```

### 5.5 Doctor-Patient Consent Flow

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    actor Doctor
    participant UI as React Frontend
    participant Express as Node.js Server<br/>:5000
    participant Flask as Flask Backend<br/>:5001
    participant MySQL as MySQL Database
    
    Note over Patient,MySQL: Patient grants access to Doctor
    
    Patient->>UI: Navigate to Consent Management
    UI->>Express: GET /api/doctors
    Express->>Flask: GET /api/doctors
    Flask->>MySQL: Query all doctors
    MySQL-->>Flask: Doctor list
    Flask-->>Express: Doctors array
    Express-->>UI: Available doctors
    UI-->>Patient: Show doctor selection
    
    Patient->>UI: Select doctor + permissions
    Note over UI: Permissions: READ, WRITE, SHARE
    
    UI->>Express: POST /api/patients/:id/consents
    activate Express
    
    Express->>Flask: POST /api/consents
    activate Flask
    
    Flask->>MySQL: Check existing consent
    MySQL-->>Flask: Consent status
    
    Flask->>MySQL: Create consent record
    Flask->>MySQL: Create assignment record
    MySQL-->>Flask: Success
    
    Flask-->>Express: Consent created
    deactivate Flask
    Express-->>UI: 201 Created
    deactivate Express
    
    UI-->>Patient: Show success message
    
    Note over Doctor,MySQL: Doctor accesses patient reports
    
    Doctor->>UI: View patient list
    UI->>Express: GET /api/doctors/:id/patients
    Express->>Flask: GET /api/doctors/:id/patients
    Flask->>MySQL: Query assignments + consents
    MySQL-->>Flask: Assigned patients
    Flask-->>Express: Patient list
    Express-->>UI: Patients with access
    UI-->>Doctor: Show patient reports
```

### 5.6 System Startup Sequence

```mermaid
sequenceDiagram
    autonumber
    participant Dev as Developer
    participant NPM as npm run dev
    participant Vite as Vite Dev Server<br/>:5173
    participant Express as Express Server<br/>:5000
    participant Flask1 as Flask Backend<br/>:5001
    participant Flask2 as Summary Service<br/>:8004
    participant FastAPI as RAG Service<br/>:8001
    participant MySQL as MySQL Database
    
    Dev->>NPM: Start development
    
    par Start Node.js Stack
        NPM->>Vite: Build React app
        Vite->>Vite: Hot Module Reload
        Vite-->>NPM: Ready on :5173
        
        NPM->>Express: Start Express
        Express->>Express: Apply middleware
        Express->>Express: Register routes
        Express-->>NPM: Ready on :5000
    end
    
    Dev->>Flask1: python app.py
    activate Flask1
    Flask1->>Flask1: Load environment
    Flask1->>Flask1: Configure CORS
    Flask1->>Flask1: Register blueprints
    Flask1->>MySQL: Test connection
    MySQL-->>Flask1: Connection OK
    Flask1-->>Dev: Ready on :5001
    deactivate Flask1
    
    Dev->>Flask2: python summary_service.py
    activate Flask2
    Flask2->>Flask2: Initialize Gemini
    Flask2->>MySQL: Connect DB
    MySQL-->>Flask2: Connection OK
    Flask2-->>Dev: Ready on :8004
    deactivate Flask2
    
    Dev->>FastAPI: python app.py (rag-service)
    activate FastAPI
    FastAPI->>FastAPI: Initialize services
    FastAPI->>FastAPI: Load HuggingFace embeddings
    FastAPI-->>Dev: Ready on :8001
    deactivate FastAPI
    
    Note over Dev: All services running<br/>Platform ready
```

### 5.7 PDF Processing Pipeline

```mermaid
sequenceDiagram
    autonumber
    participant Upload as File Upload
    participant PDF as PDF Processor
    participant Chunk as Text Chunker
    participant Embed as HuggingFace Embeddings
    participant FAISS as FAISS Index
    participant Extract as Medical Extractor
    participant Gemini as Google Gemini
    participant MySQL as MySQL Database
    
    Upload->>PDF: PDF file bytes
    activate PDF
    PDF->>PDF: PyPDF2 extract pages
    PDF->>PDF: Clean text
    PDF-->>Chunk: Raw text
    deactivate PDF
    
    activate Chunk
    Chunk->>Chunk: Split into chunks
    Note over Chunk: Chunk size: 1000<br/>Overlap: 200
    Chunk-->>Embed: Text chunks
    deactivate Chunk
    
    activate Embed
    loop For each chunk
        Embed->>Embed: Generate embedding
        Note over Embed: 768/1536 dimensions
    end
    Embed-->>FAISS: Vectors + metadata
    deactivate Embed
    
    activate FAISS
    FAISS->>FAISS: Create index
    FAISS->>FAISS: Add vectors
    FAISS->>FAISS: Save to disk
    Note over FAISS: faiss_indexes/{report_id}
    FAISS-->>Extract: Index path
    deactivate FAISS
    
    activate Extract
    Extract->>Gemini: Extract structured info
    activate Gemini
    Note over Gemini: Patient info, diagnosis<br/>test results, findings
    Gemini-->>Extract: JSON response
    deactivate Gemini
    
    Extract->>Gemini: Generate summary
    activate Gemini
    Gemini-->>Extract: Summary text
    deactivate Gemini
    
    Extract->>MySQL: Store report + AI data
    MySQL-->>Extract: Report ID
    deactivate Extract
```

---

## 6. Component Interaction Summary

```mermaid
flowchart TB
    subgraph Frontend["Frontend Layer"]
        React[React + TypeScript<br/>:5000/:5173]
        Pages[9 Page Components]
        Components[58 UI Components]
        Hooks[Custom Hooks]
    end
    
    subgraph Gateway["API Gateway Layer"]
        Express[Express Server :5000]
        Routes[API Routes]
        Multer[File Upload Handler]
    end
    
    subgraph Backend["Backend Services"]
        FlaskMain[Flask Backend :5001]
        Users[User Routes]
        Reports[Report Routes]
        Chat[Chat Routes]
        Data[Data Routes]
    end
    
    subgraph AI["AI Services"]
        Summary[Summary Service :8004]
        RAG[RAG Service :8001]
    end
    
    subgraph AIStack["AI Stack"]
        Gemini[Google Gemini 2.5]
        HF[HuggingFace Embeddings]
        LC[LangChain]
        PyPDF[PyPDF2]
    end
    
    subgraph Storage["Storage Layer"]
        MySQL[(MySQL<br/>medical_reports_db)]
        FAISS[(FAISS Indexes)]
    end
    
    React --> Pages
    Pages --> Components
    Pages --> Hooks
    React --> Express
    
    Express --> Routes
    Routes --> Multer
    Routes --> FlaskMain
    Routes --> Summary
    Routes --> RAG
    
    FlaskMain --> Users & Reports & Chat & Data
    Users & Reports & Chat & Data --> MySQL
    
    Summary --> Gemini
    Summary --> PyPDF
    Summary --> MySQL
    
    RAG --> LC
    LC --> HF
    LC --> FAISS
    LC --> Gemini
```

---

## 7. Database Schema ER Diagram

```mermaid
erDiagram
    PATIENTS ||--o{ PATIENT_REPORTS : has
    PATIENTS ||--o{ CONSENTS : grants
    PATIENTS ||--o{ ASSIGNMENTS : assigned_to
    DOCTORS ||--o{ CONSENTS : receives
    DOCTORS ||--o{ ASSIGNMENTS : manages
    MEDICAL_REPORTS ||--o{ TEST_RESULTS : contains
    MEDICAL_REPORTS ||--o{ QUERY_HISTORY : has
    
    PATIENTS {
        varchar id PK
        varchar first_name
        varchar last_name
        varchar email UK
        varchar phone
        date date_of_birth
        varchar pin
        text fingerprint_credential_id
        boolean fingerprint_registered
        timestamp created_at
        boolean is_active
    }
    
    DOCTORS {
        varchar id PK
        varchar license_id UK
        varchar full_name
        varchar specialization
        varchar password
        boolean verified
        timestamp created_at
        boolean is_active
    }
    
    CONSENTS {
        varchar id PK
        varchar patient_id FK
        varchar doctor_id FK
        json permissions
        date start_date
        date end_date
        boolean active
    }
    
    ASSIGNMENTS {
        varchar id PK
        varchar doctor_id FK
        varchar patient_id FK
        timestamp assigned_at
    }
    
    PATIENT_REPORTS {
        varchar id PK
        varchar patient_id FK
        varchar disease_name
        text attributes
        date measurement_date
        varchar file_name
        enum status
        text ai_summary
        text ai_diagnosis
        varchar rag_report_id
        boolean processed_by_ai
    }
    
    MEDICAL_REPORTS {
        int id PK
        varchar report_id UK
        varchar patient_name
        int patient_age
        enum patient_gender
        text summary
        text diagnosis
        text test_results
        longtext raw_text
        varchar faiss_index_path
    }
    
    TEST_RESULTS {
        int id PK
        varchar report_id FK
        varchar test_name
        varchar test_value
        varchar unit
        varchar normal_range
        enum status
    }
    
    QUERY_HISTORY {
        int id PK
        varchar report_id FK
        text user_question
        text ai_response
        timestamp query_time
    }
    
    EMAIL_VERIFICATIONS {
        varchar id PK
        varchar email
        varchar verification_code
        varchar pin
        timestamp expires_at
        boolean verified
        int attempts
    }
```

---

## 8. Port Reference

| Service | Port | Technology | Description |
|---------|------|------------|-------------|
| React Frontend | 5000 | Vite + React | User Interface |
| Express API Gateway | 5000 | Node.js/Express | Main API routing |
| Flask Backend | 5001 | Python/Flask | User auth & data |
| Summary Service | 8004 | Python/Flask | AI summarization |
| RAG Service | 8001 | Python/FastAPI | RAG Q&A |

---

## 9. Technology Stack Summary

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, Radix UI, React Query, Recharts |
| **API Gateway** | Node.js, Express, Multer |
| **Backend** | Python, Flask, Flask-CORS, bcrypt |
| **AI/ML** | Google Gemini 2.5, LangChain, FAISS, HuggingFace, PyPDF2 |
| **Database** | MySQL 8.0, Drizzle ORM |
| **DevOps** | npm, Poetry, dotenv |

---

*Generated for HealthForge - AI-Powered Health Records Management System*

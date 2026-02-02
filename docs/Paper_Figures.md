# HealthForge - Paper Figures (For Screenshots)

Use these Mermaid diagrams to take screenshots for the IEEE paper figures.

---

## Figure 1: System Architecture
**File: fig_architecture.png**

```mermaid
flowchart TB
    subgraph Frontend["Frontend Layer :5000"]
        React["React 18 + TypeScript"]
        Vite["Vite 5.0"]
        Radix["Radix UI"]
        WebAuthn["WebAuthn API"]
    end
    
    subgraph Gateway["API Gateway :5000"]
        Express["Express.js"]
        Multer["Multer 50MB"]
        Zod["Zod Validation"]
    end
    
    subgraph Backend["Backend Services"]
        Flask1["Flask Auth :5001"]
        Flask2["Flask AI :8004"]
    end
    
    subgraph AI["AI/ML Stack"]
        Gemini["Gemini 2.5 Flash"]
        HF["HuggingFace Embeddings"]
        LC["LangChain"]
    end
    
    subgraph Data["Data Layer"]
        MySQL[("MySQL 8.0")]
        FAISS[("FAISS Index")]
    end
    
    React --> Express
    Express --> Flask1
    Express --> Flask2
    Flask1 --> MySQL
    Flask2 --> Gemini
    Flask2 --> HF
    Flask2 --> FAISS
    Flask2 --> MySQL
    WebAuthn --> Flask1
```

---

## Figure 2: FHE Authentication Protocol
**File: fig_fhe_auth.png**

```mermaid
sequenceDiagram
    participant C as Client Browser
    participant W as WebAuthn API
    participant S as Server :5001
    participant DB as MySQL
    
    Note over C,DB: Registration Phase
    C->>W: Capture Fingerprint
    W->>C: Feature Vector f_reg ∈ R^512
    C->>C: Generate CKKS Keys (pk, sk)
    C->>C: ct_reg = Enc_pk(f_reg)
    C->>S: Store (user_id, pk, ct_reg)
    S->>DB: INSERT encrypted template
    
    Note over C,DB: Authentication Phase
    C->>W: Capture Fingerprint
    W->>C: Feature Vector f_auth
    C->>C: ct_auth = Enc_pk(f_auth)
    C->>S: Send ct_auth
    S->>DB: Fetch (pk, ct_reg)
    S->>S: ct_sim = HomomorphicCosine(ct_reg, ct_auth)
    S->>C: Return ct_sim
    
    Note over C,DB: Verification Phase
    C->>C: sim = Dec_sk(ct_sim)
    alt sim > 0.85
        C->>S: Signed Confirmation
        S->>C: Session Token
    else sim <= 0.85
        C->>C: Auth Failed
    end
```

---

## Figure 3: RAG Pipeline
**File: fig_rag_pipeline.png**

```mermaid
flowchart LR
    subgraph Upload["1. Upload"]
        PDF["PDF File"]
        Multer["Multer"]
    end
    
    subgraph Extract["2. Extract"]
        PyPDF["PyPDF2"]
        Text["Raw Text"]
    end
    
    subgraph Chunk["3. Chunk"]
        Splitter["TextSplitter"]
        Chunks["Chunks[]"]
    end
    
    subgraph Embed["4. Embed"]
        HF["all-MiniLM-L6-v2"]
        Vectors["Vectors R^384"]
    end
    
    subgraph Index["5. Index"]
        FAISS["FAISS Flat L2"]
        Store[("faiss_index")]
    end
    
    subgraph Query["6. Query"]
        Q["Question"]
        Search["Similarity Search k=5"]
        Context["Top-5 Chunks"]
    end
    
    subgraph Generate["7. Generate"]
        Gemini["Gemini 2.5 Flash"]
        Answer["AI Answer"]
    end
    
    PDF --> Multer --> PyPDF --> Text --> Splitter --> Chunks --> HF --> Vectors --> FAISS --> Store
    Q --> Search
    Store --> Search --> Context --> Gemini --> Answer
```

---

## FastSAM Quantized Pipeline DFD (4+3 Horizontal Layout)

```mermaid
flowchart LR
    A[Dataset / Input Image] --> B[Preprocessing Unit] --> C[FastSAM Model] --> D[AIMET Quantization Process] --> E[Inference Engine]
    E --> F[Segmentation Output] --> G[Evaluation Module]
    %% Four nodes in the top row, then three below
    subgraph TopRow[ ]
        direction LR
        A --> B --> C --> D --> E
    end
    subgraph BottomRow[ ]
        direction LR
        E --> F --> G
    end
```

---

## Figure 4: Consent Management Flow
**File: fig_consent.png**

```mermaid
flowchart TB
    subgraph Patient["Patient Actions"]
        P1["Select Doctor"]
        P2["Set Permissions"]
        P3["Set Validity Period"]
        P4["Grant Consent"]
        P5["Revoke Consent"]
    end
    
    subgraph System["System Processing"]
        S1["Validate Doctor"]
        S2["Create Consent Record"]
        S3["Create Assignment"]
        S4["Check Access"]
    end
    
    subgraph Doctor["Doctor Actions"]
        D1["Request Patient List"]
        D2["Access Patient Reports"]
        D3["View AI Summaries"]
    end
    
    subgraph Data["Data Stores"]
        DB1[("doctors")]
        DB2[("consents")]
        DB3[("assignments")]
        DB4[("reports")]
    end
    
    P1 --> S1
    DB1 --> S1
    S1 --> P2
    P2 --> P3 --> P4
    P4 --> S2 --> DB2
    S2 --> S3 --> DB3
    
    P5 --> DB2
    
    D1 --> S4
    DB2 --> S4
    DB3 --> S4
    S4 -->|Access Granted| DB4
    DB4 --> D2 --> D3
```

---

## Figure 5: Patient Dashboard
**File: fig_dashboard.png**

> **NOTE:** For this figure, take an actual screenshot of your running application's patient dashboard showing:
> - Report list with AI summaries visible
> - Health timeline visualization
> - Upload report button
> - Consent management section

---

## How to Screenshot

1. Open this file in VS Code or any Markdown preview that renders Mermaid
2. Take screenshots of each diagram
3. Save with the corresponding filename:
   - `fig_architecture.png`
   - `fig_fhe_auth.png`
   - `fig_rag_pipeline.png`
   - `fig_consent.png`
   - `fig_dashboard.png` (from running app)
4. Place in the same folder as the `.tex` file
5. Compile with: `pdflatex HealthForge_IEEE_Paper.tex`

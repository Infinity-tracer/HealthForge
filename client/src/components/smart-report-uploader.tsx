import { useState, useRef, useCallback } from "react";
import {
  Upload,
  X,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Edit2,
  Save,
  Calendar,
  User,
  Stethoscope,
  Activity,
  Building,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExtractedInfo {
  patient_name?: string;
  patient_age?: number;
  patient_gender?: string;
  report_date?: string;
  report_type?: string;
  hospital_name?: string;
  doctor_name?: string;
  diagnosis?: string;
  key_findings?: string;
  recommendations?: string;
  test_results?: Array<{
    test_name: string;
    test_value: string;
    unit: string;
    normal_range?: string;
    status?: string;
  }>;
}

interface ProcessingResponse {
  success: boolean;
  summary?: string;
  extracted_info?: ExtractedInfo;
  file_name?: string;
  error?: string;
}

interface SmartReportUploaderProps {
  patientId: string;
  onUploadSuccess?: (reportId: string, data: any) => void;
  onUploadError?: (error: string) => void;
  onCancel?: () => void;
}

type UploadStep = "upload" | "processing" | "confirm" | "saving" | "complete" | "error";

export function SmartReportUploader({
  patientId,
  onUploadSuccess,
  onUploadError,
  onCancel,
}: SmartReportUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [step, setStep] = useState<UploadStep>("upload");
  const [progress, setProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState("");
  const [extractedData, setExtractedData] = useState<ExtractedInfo | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState<ExtractedInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processingStages = [
    "Validating file...",
    "Extracting text from PDF...",
    "Analyzing document structure...",
    "Extracting medical information...",
    "Identifying test results...",
    "Generating AI summary...",
    "Finalizing extraction...",
  ];

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = async (selectedFile: File) => {
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (selectedFile.size > maxSize) {
      setErrorMessage("File too large. Maximum 50MB allowed.");
      setStep("error");
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setErrorMessage("Only PDF files are accepted.");
      setStep("error");
      return;
    }

    setFile(selectedFile);
    setErrorMessage("");
    
    // Immediately start processing
    await processFile(selectedFile);
  };

  const processFile = async (fileToProcess: File) => {
    setStep("processing");
    setProgress(0);

    // Simulate progress through stages
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 90) {
          const stageIndex = Math.floor((prev / 100) * processingStages.length);
          setProcessingStage(processingStages[stageIndex] || "Processing...");
          return prev + Math.random() * 12;
        }
        return prev;
      });
    }, 500);

    try {
      const formData = new FormData();
      formData.append("file", fileToProcess);

      // Call the Flask RAG API for extraction only (not saving yet)
      const response = await fetch(`/api/reports/extract`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to process document");
      }

      const data: ProcessingResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Extraction failed");
      }

      setProgress(100);
      setProcessingStage("Extraction complete!");

      // Store extracted data for confirmation
      setExtractedData(data.extracted_info || {});
      setEditedData(data.extracted_info || {});
      setSummary(data.summary || "");

      // Move to confirmation step after a brief pause
      setTimeout(() => {
        setStep("confirm");
      }, 800);
    } catch (error) {
      clearInterval(progressInterval);
      const errorMsg = error instanceof Error ? error.message : "Processing failed";
      setErrorMessage(errorMsg);
      setStep("error");
      onUploadError?.(errorMsg);
    }
  };

  const handleConfirmAndSave = async () => {
    if (!file || !editedData) return;

    setStep("saving");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("extracted_info", JSON.stringify(editedData));
      formData.append("summary", summary);

      const response = await fetch(`/api/patients/${patientId}/reports/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save report");
      }

      const data = await response.json();

      setStep("complete");
      
      setTimeout(() => {
        onUploadSuccess?.(data.report?.id, data);
      }, 1500);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Save failed";
      setErrorMessage(errorMsg);
      setStep("error");
      onUploadError?.(errorMsg);
    }
  };

  const handleEditField = (field: keyof ExtractedInfo, value: any) => {
    if (editedData) {
      setEditedData({ ...editedData, [field]: value });
    }
  };

  const handleReset = () => {
    setFile(null);
    setStep("upload");
    setProgress(0);
    setProcessingStage("");
    setExtractedData(null);
    setEditedData(null);
    setSummary("");
    setErrorMessage("");
    setEditMode(false);
  };

  const renderUploadStep = () => (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={cn(
        "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300",
        dragActive
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        id="smart-file-input"
        accept=".pdf"
      />
      <label htmlFor="smart-file-input" className="cursor-pointer block">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-primary/10">
            <Upload className="w-10 h-10 text-primary" />
          </div>
          <div>
            <p className="text-lg font-medium">Drag and drop your medical report</p>
            <p className="text-sm text-muted-foreground mt-1">
              PDF only • Max 50MB
            </p>
          </div>
          <Button variant="outline" type="button" className="mt-2">
            Browse Files
          </Button>
        </div>
      </label>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="space-y-6 py-8">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-primary animate-spin" />
          <FileText className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium">Analyzing your report...</p>
          <p className="text-sm text-muted-foreground mt-1">{processingStage}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Processing</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {file && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm truncate flex-1">{file.name}</span>
          <span className="text-xs text-muted-foreground">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>
      )}
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-6">
      <Alert className="bg-primary/10 border-primary/20">
        <CheckCircle className="w-4 h-4 text-primary" />
        <AlertDescription>
          We've extracted the following information from your report. Please review and confirm.
        </AlertDescription>
      </Alert>

      {/* File Info */}
      {file && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <FileText className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium truncate flex-1">{file.name}</span>
          <Badge variant="secondary">PDF</Badge>
        </div>
      )}

      {/* Edit Mode Toggle */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditMode(!editMode)}
          className="gap-2"
        >
          {editMode ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          {editMode ? "Done Editing" : "Edit Details"}
        </Button>
      </div>

      {/* Extracted Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoField
          icon={<Stethoscope className="w-4 h-4" />}
          label="Report Type"
          value={editedData?.report_type}
          editable={editMode}
          onChange={(v) => handleEditField("report_type", v)}
        />
        <InfoField
          icon={<Calendar className="w-4 h-4" />}
          label="Report Date"
          value={editedData?.report_date}
          editable={editMode}
          type="date"
          onChange={(v) => handleEditField("report_date", v)}
        />
        <InfoField
          icon={<User className="w-4 h-4" />}
          label="Patient Name"
          value={editedData?.patient_name}
          editable={editMode}
          onChange={(v) => handleEditField("patient_name", v)}
        />
        <InfoField
          icon={<Building className="w-4 h-4" />}
          label="Hospital/Lab"
          value={editedData?.hospital_name}
          editable={editMode}
          onChange={(v) => handleEditField("hospital_name", v)}
        />
        <InfoField
          icon={<User className="w-4 h-4" />}
          label="Doctor"
          value={editedData?.doctor_name}
          editable={editMode}
          onChange={(v) => handleEditField("doctor_name", v)}
        />
        <InfoField
          icon={<Activity className="w-4 h-4" />}
          label="Patient Age"
          value={editedData?.patient_age?.toString()}
          editable={editMode}
          onChange={(v) => handleEditField("patient_age", parseInt(v) || null)}
        />
      </div>

      {/* Diagnosis */}
      {editedData?.diagnosis && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Diagnosis/Findings
          </Label>
          {editMode ? (
            <textarea
              className="w-full p-3 rounded-lg border bg-background text-sm min-h-[80px] resize-none"
              value={editedData.diagnosis}
              onChange={(e) => handleEditField("diagnosis", e.target.value)}
            />
          ) : (
            <p className="text-sm p-3 bg-muted rounded-lg">{editedData.diagnosis}</p>
          )}
        </div>
      )}

      {/* Test Results Table */}
      {editedData?.test_results && editedData.test_results.length > 0 && (
        <div className="space-y-2">
          <Label>Test Results</Label>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Normal Range</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editedData.test_results.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{result.test_name}</TableCell>
                    <TableCell>{result.test_value}</TableCell>
                    <TableCell>{result.unit}</TableCell>
                    <TableCell>{result.normal_range || "-"}</TableCell>
                    <TableCell>
                      {result.status && (
                        <Badge
                          variant={
                            result.status.toLowerCase() === "normal"
                              ? "default"
                              : result.status.toLowerCase() === "high" ||
                                result.status.toLowerCase() === "low"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {result.status}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* AI Summary Preview */}
      {summary && (
        <div className="space-y-2">
          <Label>AI Summary Preview</Label>
          <p className="text-sm p-3 bg-muted rounded-lg text-muted-foreground">
            {summary.length > 300 ? summary.slice(0, 300) + "..." : summary}
          </p>
        </div>
      )}

      <Separator />

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleReset} className="flex-1">
          Start Over
        </Button>
        <Button onClick={handleConfirmAndSave} className="flex-1 gap-2">
          <CheckCircle className="w-4 h-4" />
          Confirm & Save Report
        </Button>
      </div>
    </div>
  );

  const renderSavingStep = () => (
    <div className="flex flex-col items-center gap-4 py-12">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
      <p className="text-lg font-medium">Saving your report...</p>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="p-4 rounded-full bg-green-500/10">
        <CheckCircle className="w-12 h-12 text-green-500" />
      </div>
      <div className="text-center">
        <p className="text-lg font-medium">Report Saved Successfully!</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your medical report has been processed and saved.
        </p>
      </div>
    </div>
  );

  const renderErrorStep = () => (
    <div className="space-y-6 py-8">
      <div className="flex flex-col items-center gap-4">
        <div className="p-4 rounded-full bg-destructive/10">
          <AlertCircle className="w-12 h-12 text-destructive" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium">Something went wrong</p>
          <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
        </div>
      </div>
      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleReset}>Try Again</Button>
      </div>
    </div>
  );

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Upload Medical Report
        </CardTitle>
        <CardDescription>
          {step === "upload" && "Simply upload your PDF and we'll extract all the details automatically"}
          {step === "processing" && "AI is analyzing your document..."}
          {step === "confirm" && "Review the extracted information"}
          {step === "saving" && "Saving to your records..."}
          {step === "complete" && "All done!"}
          {step === "error" && "Please try again"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "upload" && renderUploadStep()}
        {step === "processing" && renderProcessingStep()}
        {step === "confirm" && renderConfirmStep()}
        {step === "saving" && renderSavingStep()}
        {step === "complete" && renderCompleteStep()}
        {step === "error" && renderErrorStep()}
      </CardContent>
    </Card>
  );
}

// Helper component for editable info fields
interface InfoFieldProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  editable?: boolean;
  type?: "text" | "date";
  onChange?: (value: string) => void;
}

function InfoField({ icon, label, value, editable, type = "text", onChange }: InfoFieldProps) {
  return (
    <div className="space-y-1">
      <Label className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </Label>
      {editable ? (
        <Input
          type={type}
          value={value || ""}
          onChange={(e) => onChange?.(e.target.value)}
          className="h-9"
        />
      ) : (
        <p className="text-sm font-medium p-2 bg-muted rounded-md min-h-[36px]">
          {value || <span className="text-muted-foreground italic">Not detected</span>}
        </p>
      )}
    </div>
  );
}

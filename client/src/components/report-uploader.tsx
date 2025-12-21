import { useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, X, Plus, FileText, Image, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { diseaseTypes } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

const reportSchema = z.object({
  diseaseName: z.string().min(1, "Please select a disease type"),
  attributes: z.array(
    z.object({
      name: z.string().min(1, "Attribute name required"),
      value: z.string().min(1, "Value required"),
      unit: z.string(),
    })
  ),
  measurementDate: z.string().min(1, "Measurement date required"),
  patientId: z.string().optional(),
});

type ReportFormData = z.infer<typeof reportSchema>;

interface UploadResponse {
  success: boolean;
  report_id: string;
  patient_name?: string;
  diagnosis?: string;
  summary?: string;
  message: string;
}

interface ReportUploaderProps {
  onSubmit: (data: ReportFormData, file?: File, uploadResponse?: UploadResponse) => void;
  isLoading?: boolean;
  onCancel?: () => void;
  onUploadSuccess?: (reportId: string, reportData: UploadResponse) => void;
  onUploadError?: (error: string) => void;
  patientId?: string;
  enableRAGProcessing?: boolean;
}

export function ReportUploader({
  onSubmit,
  isLoading,
  onCancel,
  onUploadSuccess,
  onUploadError,
  patientId,
  enableRAGProcessing = false,
}: ReportUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<{
    stage: string;
    status: "pending" | "processing" | "success" | "error";
  }>({
    stage: "",
    status: "pending",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processingStages = [
    "Validating file...",
    "Extracting text from PDF...",
    "Splitting text into chunks...",
    "Creating embeddings...",
    "Generating vector store...",
    "Extracting medical information...",
    "Generating summary...",
    "Saving to database...",
    "Complete!",
  ];

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      diseaseName: "",
      attributes: [],
      measurementDate: new Date().toISOString().split("T")[0],
      patientId: patientId || "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "attributes",
  });

  const selectedDisease = form.watch("diseaseName");

  const handleDiseaseChange = (value: string) => {
    form.setValue("diseaseName", value);
    const disease = diseaseTypes.find((d) => d.name === value);
    if (disease) {
      form.setValue(
        "attributes",
        disease.attributes.map((attr) => ({ name: attr, value: "", unit: "" }))
      );
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const maxSize = 50 * 1024 * 1024; // 50MB for RAG processing
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/gif"];

    if (selectedFile.size > maxSize) {
      setUploadStatus({
        stage: "File too large. Maximum 50MB.",
        status: "error",
      });
      return;
    }

    // For RAG processing, only PDF is allowed
    if (enableRAGProcessing && selectedFile.type !== "application/pdf") {
      setUploadStatus({
        stage: "Invalid file type. Only PDF accepted for RAG processing.",
        status: "error",
      });
      return;
    }

    if (!enableRAGProcessing && !allowedTypes.includes(selectedFile.type)) {
      setUploadStatus({
        stage: "Only PDF and image files are allowed",
        status: "error",
      });
      return;
    }

    setFile(selectedFile);
    setUploadStatus({ stage: "", status: "pending" });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleRAGUpload = async (): Promise<boolean> => {
    if (!file) {
      const errorMsg = "Please select a file";
      onUploadError?.(errorMsg);
      setUploadStatus({
        stage: errorMsg,
        status: "error",
      });
      return false;
    }

    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simulate progress for processing stages
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 95) {
            const nextStage = Math.floor((prev / 100) * processingStages.length);
            setUploadStatus({
              stage: processingStages[nextStage] || "Processing...",
              status: "processing",
            });
            return prev + Math.random() * 15;
          }
          return prev;
        });
      }, 600);

      // Use the Node.js server endpoint which triggers the Flask API
      const response = await fetch(
        `/api/patients/${patientId}/reports/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const data = await response.json();

      setProgress(100);
      setUploadStatus({
        stage: data.aiProcessed 
          ? "Report processed with AI successfully!" 
          : "Report uploaded successfully!",
        status: "success",
      });

      // Wait a moment to show completion
      setTimeout(() => {
        onUploadSuccess?.(data.report.id, data);
        setFile(null);
        setProgress(0);
        setUploadStatus({ stage: "", status: "pending" });
      }, 1500);
      
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Upload failed";
      setUploadStatus({
        stage: errorMsg,
        status: "error",
      });
      onUploadError?.(errorMsg);
      return false;
    }
  };

  const handleSubmit = async (data: ReportFormData) => {
    if (file && patientId) {
      // If we have a file and patient ID, upload with AI processing
      const success = await handleRAGUpload();
      if (!success) {
        // Fall back to standard submission without AI processing
        onSubmit(data, file);
      }
    } else {
      // Standard form submission without file
      onSubmit(data, file || undefined);
    }
  };

  const getFileIcon = () => {
    if (!file) return null;
    if (file.type === "application/pdf") return <FileText className="w-5 h-5" />;
    return <Image className="w-5 h-5" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Medical Report</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Disease/Test Type Selection */}
            <FormField
              control={form.control}
              name="diseaseName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Disease/Test Type</FormLabel>
                  <Select value={field.value} onValueChange={handleDiseaseChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a disease type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {diseaseTypes.map((disease) => (
                        <SelectItem key={disease.name} value={disease.name}>
                          {disease.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Measurements Section */}
            {fields.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Measurements</h3>
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-3 gap-4 items-end">
                    <FormField
                      control={form.control}
                      name={`attributes.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Attribute</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Attribute name" disabled />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`attributes.${index}.value`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Value</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Value" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`attributes.${index}.unit`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Unit" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      data-testid={`button-remove-attribute-${index}`}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Custom Attribute */}
            {selectedDisease && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: "", value: "", unit: "" })}
                data-testid="button-add-attribute"
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Attribute
              </Button>
            )}

            {/* Measurement Date */}
            <FormField
              control={form.control}
              name="measurementDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Measurement Date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload Section */}
            <FormItem>
              <FormLabel>Upload File (Optional)</FormLabel>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition",
                  dragActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400",
                  isLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  disabled={isLoading}
                  className="hidden"
                  id="file-input"
                  accept={enableRAGProcessing ? ".pdf" : ".pdf,.jpg,.jpeg,.png,.gif"}
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  <div className="flex justify-center mb-2">
                    {getFileIcon() ? (
                      <div className="text-blue-500">{getFileIcon()}</div>
                    ) : (
                      <Upload className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 font-medium">
                    {file ? file.name : "Drag and drop your file here"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {file && (
                      <>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                        <br />
                      </>
                    )}
                    {enableRAGProcessing ? "PDF only" : "PDF, JPG, PNG, GIF"} • Max 50MB
                  </p>
                </label>

                {file && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      setFile(null);
                      setUploadStatus({ stage: "", status: "pending" });
                    }}
                    data-testid="button-remove-file"
                    className="mt-2 text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            </FormItem>

            {/* Upload Status Alert */}
            {uploadStatus.status !== "pending" && (
              <Alert
                variant={
                  uploadStatus.status === "error"
                    ? "destructive"
                    : uploadStatus.status === "success"
                    ? "default"
                    : "default"
                }
              >
                <div className="flex items-center gap-2">
                  {uploadStatus.status === "processing" && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {uploadStatus.status === "success" && (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {uploadStatus.status === "error" && (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <AlertDescription>{uploadStatus.stage}</AlertDescription>
                </div>
              </Alert>
            )}

            {/* Progress Bar */}
            {uploadStatus.status === "processing" && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={isLoading || uploadStatus.status === "processing"}
                className="flex-1"
              >
                {isLoading || uploadStatus.status === "processing" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {enableRAGProcessing ? "Processing..." : "Uploading..."}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {enableRAGProcessing ? "Upload and Process" : "Upload Report"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

import { useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, X, Plus, FileText, Image, Loader2 } from "lucide-react";
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
});

type ReportFormData = z.infer<typeof reportSchema>;

interface ReportUploaderProps {
  onSubmit: (data: ReportFormData, file?: File) => void;
  isLoading?: boolean;
  onCancel?: () => void;
}

export function ReportUploader({ onSubmit, isLoading, onCancel }: ReportUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      diseaseName: "",
      attributes: [],
      measurementDate: new Date().toISOString().split("T")[0],
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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/gif"];
    
    if (selectedFile.size > maxSize) {
      alert("File size must be less than 10MB");
      return;
    }
    
    if (!allowedTypes.includes(selectedFile.type)) {
      alert("Only PDF and image files are allowed");
      return;
    }
    
    setFile(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleSubmit = (data: ReportFormData) => {
    onSubmit(data, file || undefined);
  };

  const getFileIcon = () => {
    if (!file) return <Upload className="w-12 h-12 text-muted-foreground" />;
    if (file.type === "application/pdf") return <FileText className="w-12 h-12 text-red-500" />;
    return <Image className="w-12 h-12 text-blue-500" />;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Medical Report
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="diseaseName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Disease/Test Type</FormLabel>
                  <Select onValueChange={handleDiseaseChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-disease-type">
                        <SelectValue placeholder="Select disease or test type" />
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

            {fields.length > 0 && (
              <div className="space-y-4">
                <Label>Measurements</Label>
                <div className="grid gap-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-end gap-3 p-4 rounded-lg bg-muted/50"
                    >
                      <FormField
                        control={form.control}
                        name={`attributes.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-xs">Attribute</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Attribute name"
                                data-testid={`input-attribute-name-${index}`}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`attributes.${index}.value`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-xs">Value</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Value"
                                data-testid={`input-attribute-value-${index}`}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`attributes.${index}.unit`}
                        render={({ field }) => (
                          <FormItem className="w-24">
                            <FormLabel className="text-xs">Unit</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="mg/dL"
                                data-testid={`input-attribute-unit-${index}`}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        data-testid={`button-remove-attribute-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedDisease && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: "", value: "", unit: "" })}
                data-testid="button-add-attribute"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Attribute
              </Button>
            )}

            <FormField
              control={form.control}
              name="measurementDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Measurement Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-measurement-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Upload File (Optional)</Label>
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-lg p-8 transition-all",
                  "flex flex-col items-center justify-center gap-4",
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50",
                  file && "border-green-500/50 bg-green-500/5"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  data-testid="input-file-upload"
                />
                
                {getFileIcon()}
                
                {file ? (
                  <div className="text-center">
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setFile(null);
                      }}
                      className="mt-2"
                      data-testid="button-remove-file"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-foreground font-medium">
                      Drag and drop your file here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse
                    </p>
                    <div className="flex gap-2 mt-3 justify-center">
                      <Badge variant="secondary">PDF</Badge>
                      <Badge variant="secondary">Image</Badge>
                      <Badge variant="secondary">Max 10MB</Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1"
                  data-testid="button-cancel-upload"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
                data-testid="button-submit-report"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Report
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

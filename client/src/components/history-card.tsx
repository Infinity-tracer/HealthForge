import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, Calendar, Activity, Brain, Stethoscope, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { MedicalReport } from "@shared/schema";

interface HistoryCardProps {
  report: MedicalReport;
  className?: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  reviewed: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  archived: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
};

const categoryIcons: Record<string, typeof Activity> = {
  Diabetes: Activity,
  Hypertension: Activity,
  Cholesterol: Activity,
  default: FileText,
};

export function HistoryCard({ report, className }: HistoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const attributes = JSON.parse(report.attributes || "[]") as Array<{
    name: string;
    value: string;
    unit: string;
  }>;

  const IconComponent = categoryIcons[report.diseaseName] || categoryIcons.default;

  return (
    <Card
      className={cn(
        "transition-all duration-300",
        isExpanded && "ring-1 ring-primary/20",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <IconComponent className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                {report.diseaseName}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{format(new Date(report.measurementDate), "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {report.processedByAi && (
              <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                <Brain className="w-3 h-3 mr-1" />
                AI
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn("capitalize", statusColors[report.status])}
            >
              {report.status}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid={`button-expand-report-${report.id}`}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isExpanded && attributes.length > 0 && (
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {attributes.slice(0, 3).map((attr, index) => (
              <Badge key={index} variant="secondary" className="font-mono text-xs">
                {attr.name}: {attr.value} {attr.unit}
              </Badge>
            ))}
            {attributes.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{attributes.length - 3} more
              </Badge>
            )}
          </div>
        </CardContent>
      )}

      {isExpanded && (
        <CardContent className="pt-0 animate-fade-in">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                All Measurements
              </h4>
              <div className="grid gap-2">
                {attributes.map((attr, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm font-medium">{attr.name}</span>
                    <span className="font-mono text-sm">
                      {attr.value}{" "}
                      <span className="text-muted-foreground">{attr.unit}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {report.fileName && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                  Attached File
                </h4>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{report.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {report.fileType}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Summary Section */}
            {report.processedByAi && report.aiSummary && (
              <div>
                <Separator className="my-4" />
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-medium">AI-Generated Summary</h4>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 text-sm leading-relaxed">
                    {report.aiSummary}
                  </div>

                  {report.aiDiagnosis && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Stethoscope className="w-4 h-4" />
                        <span>Diagnosis</span>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-sm">
                        {report.aiDiagnosis}
                      </div>
                    </div>
                  )}

                  {report.aiKeyFindings && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <AlertCircle className="w-4 h-4" />
                        <span>Key Findings</span>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-sm">
                        {report.aiKeyFindings}
                      </div>
                    </div>
                  )}

                  {report.aiRecommendations && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <FileText className="w-4 h-4" />
                        <span>Recommendations</span>
                      </div>
                      <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10 text-sm">
                        {report.aiRecommendations}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Uploaded on {format(new Date(report.uploadedAt), "MMM d, yyyy 'at' h:mm a")}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

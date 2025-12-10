import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, Calendar, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

            <div className="text-xs text-muted-foreground">
              Uploaded on {format(new Date(report.uploadedAt), "MMM d, yyyy 'at' h:mm a")}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

import { useState } from "react";
import { 
  Brain, 
  Stethoscope, 
  ClipboardList, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  MessageSquare,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { MedicalReport } from "@shared/schema";

interface ReportAISummaryProps {
  report: MedicalReport;
  onChatClick?: () => void;
  className?: string;
}

interface TestResult {
  test_name: string;
  test_value: string;
  unit: string;
  normal_range?: string;
  status?: "Normal" | "Abnormal" | "Critical";
}

export function ReportAISummary({ report, onChatClick, className }: ReportAISummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!report.processedByAi) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Brain className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">AI analysis not available</p>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a PDF report to get AI-powered insights
          </p>
        </CardContent>
      </Card>
    );
  }

  const testResults: TestResult[] = report.aiTestResults 
    ? JSON.parse(report.aiTestResults) 
    : [];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "Normal":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "Abnormal":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "Critical":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Powered by Gemini AI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              AI Processed
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
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

      {isExpanded && (
        <CardContent className="pt-6 space-y-6">
          {/* Summary Section */}
          {report.aiSummary && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ClipboardList className="w-4 h-4 text-primary" />
                <span>Summary</span>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-sm leading-relaxed">
                {report.aiSummary}
              </div>
            </div>
          )}

          <Separator />

          {/* Diagnosis Section */}
          {report.aiDiagnosis && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Stethoscope className="w-4 h-4 text-primary" />
                <span>Diagnosis</span>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10 text-sm">
                {report.aiDiagnosis}
              </div>
            </div>
          )}

          {/* Key Findings Section */}
          {report.aiKeyFindings && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>Key Findings</span>
              </div>
              <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/10 text-sm">
                {report.aiKeyFindings}
              </div>
            </div>
          )}

          {/* Test Results Section */}
          {testResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ClipboardList className="w-4 h-4 text-primary" />
                <span>Test Results ({testResults.length})</span>
              </div>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 pr-4">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{result.test_name}</p>
                        {result.normal_range && (
                          <p className="text-xs text-muted-foreground">
                            Normal: {result.normal_range}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm">
                          {result.test_value}
                          {result.unit && (
                            <span className="text-muted-foreground ml-1">
                              {result.unit}
                            </span>
                          )}
                        </span>
                        {result.status && (
                          <Badge
                            variant="outline"
                            className={cn("text-xs", getStatusColor(result.status))}
                          >
                            {result.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Recommendations Section */}
          {report.aiRecommendations && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ClipboardList className="w-4 h-4 text-green-500" />
                <span>Recommendations</span>
              </div>
              <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/10 text-sm">
                {report.aiRecommendations}
              </div>
            </div>
          )}

          {/* Chat Button */}
          {report.ragReportId && onChatClick && (
            <>
              <Separator />
              <Button onClick={onChatClick} className="w-full" variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Ask Questions About This Report
              </Button>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

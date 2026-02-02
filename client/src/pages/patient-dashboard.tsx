import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Activity,
  User,
  Upload,
  FileText,
  Shield,
  LogOut,
  Plus,
  Bell,
  Menu,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { SmartReportUploader } from "@/components/smart-report-uploader";
import { HistoryCard } from "@/components/history-card";
import { TimelineChart } from "@/components/timeline-chart";
import { ConsentModal } from "@/components/consent-modal";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Patient, Doctor, MedicalReport, Consent } from "@shared/schema";

interface SidebarContentProps {
  patient: Patient;
  onLogout: () => void;
  onDeleteAccount: () => void;
  isDeletingAccount: boolean;
}

function SidebarContent({ patient, onLogout, onDeleteAccount, isDeletingAccount }: SidebarContentProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 mb-6">
        <Avatar className="w-12 h-12">
          <AvatarFallback className="bg-cyan-500/20 text-cyan-600">
            {patient.firstName[0]}{patient.lastName[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">
            {patient.firstName} {patient.lastName}
          </p>
          <Badge variant="secondary" className="text-xs">Patient</Badge>
        </div>
      </div>

      <nav className="space-y-2 flex-1">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          data-testid="nav-profile"
        >
          <User className="w-5 h-5" />
          Profile
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          data-testid="nav-reports"
        >
          <FileText className="w-5 h-5" />
          My Reports
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          data-testid="nav-consents"
        >
          <Shield className="w-5 h-5" />
          Consent Management
        </Button>
      </nav>

      <div className="space-y-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={isDeletingAccount}
              data-testid="button-delete-account"
            >
              {isDeletingAccount ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
              Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Your Account</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete your account? This will delete:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Your profile information</li>
                  <li>All your medical reports</li>
                  <li>All your consent records</li>
                  <li>All doctor assignments</li>
                </ul>
                <p className="mt-2 font-semibold">This action cannot be undone.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDeleteAccount}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={onLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export default function PatientDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [showUploader, setShowUploader] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [activeTab, setActiveTab] = useState("reports");

  const patient = user?.data as Patient;

  const { data: reports = [], isLoading: reportsLoading } = useQuery<MedicalReport[]>({
    queryKey: ["/api/patients", user?.id, "reports"],
    enabled: !!user?.id,
  });

  const { data: consents = [], isLoading: consentsLoading } = useQuery<Consent[]>({
    queryKey: ["/api/patients", user?.id, "consents"],
    enabled: !!user?.id,
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ["/api/doctors"],
    enabled: showConsentModal,
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { diseaseName: string; attributes: any[]; measurementDate: string }) => {
      return apiRequest("POST", `/api/patients/${user?.id}/reports`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", user?.id, "reports"] });
      setShowUploader(false);
      toast({
        title: "Report Uploaded",
        description: "Your medical report has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload the report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const consentMutation = useMutation({
    mutationFn: async (data: { doctorId: string; permissions: string[]; startDate: string; endDate: string }) => {
      return apiRequest("POST", `/api/patients/${user?.id}/consents`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", user?.id, "consents"] });
      setShowConsentModal(false);
      toast({
        title: "Consent Granted",
        description: "Doctor access has been configured successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Grant Consent",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const revokeConsentMutation = useMutation({
    mutationFn: async (consentId: string) => {
      return apiRequest("DELETE", `/api/consents/${consentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", user?.id, "consents"] });
      toast({
        title: "Consent Revoked",
        description: "Doctor access has been removed.",
      });
    },
  });

  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);

  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      setDeletingReportId(reportId);
      return apiRequest("DELETE", `/api/patients/${user?.id}/reports/${reportId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", user?.id, "reports"] });
      toast({
        title: "Report Deleted",
        description: "Your medical report has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the report. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setDeletingReportId(null);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/patients/${user?.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      logout();
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete your account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const handleUpload = (data: any) => {
    uploadMutation.mutate({
      diseaseName: data.diseaseName,
      attributes: data.attributes,
      measurementDate: data.measurementDate,
    });
  };

  const handleUploadSuccess = (reportId: string, reportData: any) => {
    queryClient.invalidateQueries({ queryKey: ["/api/patients", user?.id, "reports"] });
    setShowUploader(false);
    toast({
      title: reportData.aiProcessed ? "Report Processed with AI" : "Report Uploaded",
      description: reportData.aiProcessed
        ? "Your medical report has been analyzed and summary is ready."
        : "Your medical report has been saved successfully.",
    });
  };

  const handleUploadError = (error: string) => {
    toast({
      title: "Upload Failed",
      description: error || "Failed to upload the report. Please try again.",
      variant: "destructive",
    });
  };

  const handleGrantConsent = (data: any) => {
    consentMutation.mutate(data);
  };

  const timelineItems = reports.map((report) => {
    const attrs = JSON.parse(report.attributes || "[]");
    const firstAttr = attrs[0];
    return {
      id: report.id,
      date: report.measurementDate,
      title: report.diseaseName,
      value: firstAttr?.value || "N/A",
      unit: firstAttr?.unit || "",
      category: report.diseaseName,
    };
  });

  if (!user || !patient) {
    setLocation("/patient/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex flex-1">
        <aside className="hidden lg:flex w-64 border-r bg-sidebar flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <img src="/college-logo.png" alt="College Logo" className="w-12 h-12 object-contain" />
              <span className="font-bold text-lg">HealthVault</span>
            </div>
          </div>
          <SidebarContent patient={patient} onLogout={handleLogout} onDeleteAccount={() => deleteAccountMutation.mutate()} isDeletingAccount={deleteAccountMutation.isPending} />
        </aside>

        <div className="flex-1 flex flex-col">
          <header className="flex items-center justify-between gap-4 p-4 border-b bg-background sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" data-testid="button-mobile-menu">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <div className="p-4 border-b">
                    <div className="flex items-center gap-3">
                      <img src="/college-logo.png" alt="College Logo" className="w-12 h-12 object-contain" />
                      <span className="font-bold">HealthVault</span>
                    </div>
                  </div>
                  <SidebarContent patient={patient} onLogout={handleLogout} onDeleteAccount={() => deleteAccountMutation.mutate()} isDeletingAccount={deleteAccountMutation.isPending} />
                </SheetContent>
              </Sheet>
              <h1 className="text-xl font-semibold">Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" data-testid="button-notifications">
                <Bell className="w-5 h-5" />
              </Button>
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    Welcome back, {patient.firstName}!
                  </h2>
                  <p className="text-muted-foreground">
                    Manage your health records and consent settings
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowConsentModal(true)}
                    data-testid="button-manage-consent"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Manage Consent
                  </Button>
                  <Button onClick={() => setShowUploader(true)} data-testid="button-upload-report">
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Report
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{reports.length}</p>
                        <p className="text-sm text-muted-foreground">Total Reports</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-green-500/10">
                        <Shield className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {consents.filter((c) => c.active).length}
                        </p>
                        <p className="text-sm text-muted-foreground">Active Consents</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-amber-500/10">
                        <Activity className="w-6 h-6 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {reports.filter((r) => r.status === "pending").length}
                        </p>
                        <p className="text-sm text-muted-foreground">Pending Review</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {showUploader && (
                <div className="animate-fade-in-up">
                  <SmartReportUploader
                    patientId={user?.id || ""}
                    onUploadSuccess={handleUploadSuccess}
                    onUploadError={handleUploadError}
                    onCancel={() => setShowUploader(false)}
                  />
                </div>
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="reports" data-testid="tab-reports">
                    <FileText className="w-4 h-4 mr-2" />
                    Reports
                  </TabsTrigger>
                  <TabsTrigger value="timeline" data-testid="tab-timeline">
                    <Activity className="w-4 h-4 mr-2" />
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger value="consents" data-testid="tab-consents">
                    <Shield className="w-4 h-4 mr-2" />
                    Consents
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="reports" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Medical Reports</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {reportsLoading ? (
                        <div className="space-y-4">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="h-24 rounded-lg bg-muted animate-pulse"
                            />
                          ))}
                        </div>
                      ) : reports.length === 0 ? (
                        <div className="text-center py-12">
                          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No reports uploaded yet</p>
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => setShowUploader(true)}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload your first report
                          </Button>
                        </div>
                      ) : (
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-4 pr-4">
                            {reports.map((report) => (
                              <HistoryCard
                                key={report.id}
                                report={report}
                                onDelete={(reportId) => deleteReportMutation.mutate(reportId)}
                                isDeleting={deletingReportId === report.id}
                              />
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="timeline" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Health Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TimelineChart items={timelineItems} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="consents" className="mt-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                      <CardTitle>Active Consents</CardTitle>
                      <Button
                        size="sm"
                        onClick={() => setShowConsentModal(true)}
                        data-testid="button-add-consent"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Consent
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {consentsLoading ? (
                        <div className="space-y-4">
                          {[1, 2].map((i) => (
                            <div
                              key={i}
                              className="h-20 rounded-lg bg-muted animate-pulse"
                            />
                          ))}
                        </div>
                      ) : consents.filter((c) => c.active).length === 0 ? (
                        <div className="text-center py-12">
                          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            No active consents configured
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Grant access to doctors to share your records
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {consents
                            .filter((c) => c.active)
                            .map((consent) => (
                              <div
                                key={consent.id}
                                className="flex items-center justify-between gap-4 p-4 rounded-lg border"
                              >
                                <div className="flex items-center gap-4">
                                  <Avatar>
                                    <AvatarFallback>DR</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">Doctor ID: {consent.doctorId}</p>
                                    <div className="flex gap-2 mt-1">
                                      {JSON.parse(consent.permissions).map((perm: string) => (
                                        <Badge key={perm} variant="secondary" className="text-xs">
                                          {perm}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => revokeConsentMutation.mutate(consent.id)}
                                  data-testid={`button-revoke-consent-${consent.id}`}
                                >
                                  Revoke
                                </Button>
                              </div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>

      <ConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onSubmit={handleGrantConsent}
        doctors={doctors}
        isLoading={consentMutation.isPending}
      />
      <Footer />
    </div>
  );
}
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  User,
  Users,
  FileText,
  Search,
  LogOut,
  Bell,
  Menu,
  Eye,
  Filter,
  ChevronDown,
  ChevronUp,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { HistoryCard } from "@/components/history-card";
import { useAuth } from "@/lib/auth-context";
import type { Doctor, Patient, MedicalReport, Assignment } from "@shared/schema";
import { format } from "date-fns";

interface PatientWithReports extends Patient {
  reports?: MedicalReport[];
}

function SidebarContent({ doctor, onLogout }: { doctor: Doctor; onLogout: () => void }) {
  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 mb-6">
        <Avatar className="w-12 h-12">
          <AvatarFallback className="bg-blue-500/20 text-blue-600">
            {doctor.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{doctor.fullName}</p>
          <Badge variant="secondary" className="text-xs">{doctor.specialization}</Badge>
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
          data-testid="nav-patients"
        >
          <Users className="w-5 h-5" />
          Assigned Patients
        </Button>
      </nav>

      <div className="p-3 rounded-lg bg-primary/10 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Stethoscope className="w-4 h-4 text-primary" />
          <span className="font-mono text-xs">{doctor.licenseId}</span>
        </div>
        {doctor.verified && (
          <Badge variant="default" className="mt-2 text-xs">Verified</Badge>
        )}
      </div>

      <Button
        variant="ghost"
        className="w-full justify-start gap-3 text-destructive"
        onClick={onLogout}
        data-testid="button-logout"
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </Button>
    </div>
  );
}

export default function DoctorDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPatient, setSelectedPatient] = useState<PatientWithReports | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const doctor = user?.data as Doctor;

  const { data: assignedPatients = [], isLoading: patientsLoading } = useQuery<PatientWithReports[]>({
    queryKey: ["/api/doctors", user?.id, "patients"],
    enabled: !!user?.id,
  });

  const { data: patientReports = [], isLoading: reportsLoading } = useQuery<MedicalReport[]>({
    queryKey: ["/api/patients", selectedPatient?.id, "reports"],
    enabled: !!selectedPatient?.id,
  });

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const toggleRowExpansion = (patientId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(patientId)) {
        newSet.delete(patientId);
      } else {
        newSet.add(patientId);
      }
      return newSet;
    });
  };

  const filteredPatients = assignedPatients.filter((patient) => {
    const matchesSearch =
      patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === "all") return matchesSearch;
    return matchesSearch;
  });

  const totalReports = assignedPatients.reduce(
    (acc, patient) => acc + (patient.reports?.length || 0),
    0
  );

  if (!user || !doctor) {
    setLocation("/doctor/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex w-64 border-r bg-sidebar flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">HealthVault</span>
          </div>
        </div>
        <SidebarContent doctor={doctor} onLogout={handleLogout} />
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
                  <div className="flex items-center gap-2">
                    <Activity className="w-6 h-6 text-primary" />
                    <span className="font-bold">HealthVault</span>
                  </div>
                </div>
                <SidebarContent doctor={doctor} onLogout={handleLogout} />
              </SheetContent>
            </Sheet>
            <h1 className="text-xl font-semibold">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                2
              </span>
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Welcome, Dr. {doctor.fullName.split(" ").pop()}</h2>
              <p className="text-muted-foreground">{doctor.specialization}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-blue-500/10">
                      <Users className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{assignedPatients.length}</p>
                      <p className="text-sm text-muted-foreground">Assigned Patients</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <FileText className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalReports}</p>
                      <p className="text-sm text-muted-foreground">Total Reports</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-amber-500/10">
                      <Bell className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">2</p>
                      <p className="text-sm text-muted-foreground">New Reports</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <CardTitle>Assigned Patients</CardTitle>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search patients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-full sm:w-[200px]"
                        data-testid="input-search-patients"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[130px]" data-testid="select-filter-status">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Patients</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {patientsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No patients assigned yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Patients will appear here when they grant you access
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Patient</TableHead>
                          <TableHead className="hidden md:table-cell">Email</TableHead>
                          <TableHead className="hidden sm:table-cell">DOB</TableHead>
                          <TableHead className="text-center">Reports</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPatients.map((patient) => (
                          <>
                            <TableRow
                              key={patient.id}
                              className="cursor-pointer"
                              onClick={() => toggleRowExpansion(patient.id)}
                              data-testid={`row-patient-${patient.id}`}
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar>
                                    <AvatarFallback>
                                      {patient.firstName[0]}{patient.lastName[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">
                                      {patient.firstName} {patient.lastName}
                                    </p>
                                    <p className="text-sm text-muted-foreground md:hidden">
                                      {patient.email}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {patient.email}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                {format(new Date(patient.dateOfBirth), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary">
                                  {patient.reports?.length || 0}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPatient(patient);
                                    }}
                                    data-testid={`button-view-history-${patient.id}`}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View History
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleRowExpansion(patient.id);
                                    }}
                                  >
                                    {expandedRows.has(patient.id) ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {expandedRows.has(patient.id) && (
                              <TableRow>
                                <TableCell colSpan={5} className="bg-muted/30 p-4">
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium">Quick Summary</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <p className="text-muted-foreground">Phone</p>
                                        <p className="font-mono">{patient.phone}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Reports</p>
                                        <p>{patient.reports?.length || 0} total</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Latest Report</p>
                                        <p>
                                          {patient.reports?.[0]?.diseaseName || "None"}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Status</p>
                                        <Badge variant="secondary">Active</Badge>
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {selectedPatient?.firstName[0]}{selectedPatient?.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p>{selectedPatient?.firstName} {selectedPatient?.lastName}</p>
                <p className="text-sm font-normal text-muted-foreground">
                  Medical History
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {reportsLoading ? (
              <div className="space-y-4 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : patientReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No reports available</p>
              </div>
            ) : (
              <div className="space-y-4 p-4">
                {patientReports.map((report) => (
                  <HistoryCard key={report.id} report={report} />
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-provider";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import PatientLogin from "@/pages/patient-login";
import PatientRegister from "@/pages/patient-register";
import PatientDashboard from "@/pages/patient-dashboard";
import DoctorLogin from "@/pages/doctor-login";
import DoctorRegister from "@/pages/doctor-register";
import DoctorDashboard from "@/pages/doctor-dashboard";
import FingerprintScan from "@/pages/fingerprint-scan";

function ProtectedPatientRoute({ component: Component }: { component: () => JSX.Element | null }) {
  const { isAuthenticated, role, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  if (!isAuthenticated || role !== "patient") {
    return <Redirect to="/patient/login" />;
  }
  
  return <Component />;
}

function ProtectedDoctorRoute({ component: Component }: { component: () => JSX.Element | null }) {
  const { isAuthenticated, role, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  if (!isAuthenticated || role !== "doctor") {
    return <Redirect to="/doctor/login" />;
  }
  
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      
      <Route path="/patient/login" component={PatientLogin} />
      <Route path="/patient/register" component={PatientRegister} />
      <Route path="/patient/fingerprint" component={FingerprintScan} />
      <Route path="/patient/dashboard">
        {() => <ProtectedPatientRoute component={PatientDashboard} />}
      </Route>
      
      <Route path="/doctor/login" component={DoctorLogin} />
      <Route path="/doctor/register" component={DoctorRegister} />
      <Route path="/doctor/dashboard">
        {() => <ProtectedDoctorRoute component={DoctorDashboard} />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

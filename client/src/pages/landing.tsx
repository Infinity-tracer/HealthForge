import { Link } from "wouter";
import { Shield, Fingerprint, Activity, Users, ArrowRight, Lock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: Fingerprint,
    title: "Biometric Security",
    description: "Advanced fingerprint authentication with FHE encryption for maximum security.",
  },
  {
    icon: Activity,
    title: "Health Tracking",
    description: "Monitor your medical data with intuitive timelines and visualizations.",
  },
  {
    icon: Shield,
    title: "Consent Control",
    description: "Full control over who accesses your records with granular permissions.",
  },
  {
    icon: Users,
    title: "Doctor Collaboration",
    description: "Seamless sharing with healthcare providers you trust.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
        
        <header className="relative z-10 flex items-center justify-between gap-4 p-4 md:p-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20 backdrop-blur-sm">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-bold text-white">HealthVault</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/patient/login">
              <Button variant="ghost" className="text-white/80 backdrop-blur-sm" data-testid="link-patient-login-header">
                Patient Login
              </Button>
            </Link>
            <Link href="/doctor/login">
              <Button variant="outline" className="backdrop-blur-md bg-white/10 border-white/20 text-white" data-testid="link-doctor-login-header">
                Doctor Login
              </Button>
            </Link>
          </div>
        </header>

        <div className="relative z-10 px-4 py-20 md:py-32 max-w-6xl mx-auto">
          <div className="text-center space-y-6 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm">
              <Lock className="w-4 h-4" />
              Secure, Private, Encrypted
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
              Your Health Records,
              <br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Secured by You
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto">
              A futuristic health records management system with biometric authentication,
              giving you complete control over your medical data.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/patient/register">
                <Button size="lg" className="gap-2 min-w-[200px]" data-testid="button-patient-register">
                  <Fingerprint className="w-5 h-5" />
                  Patient Sign Up
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/doctor/register">
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 min-w-[200px] backdrop-blur-md bg-white/10 border-white/20 text-white"
                  data-testid="button-doctor-register"
                >
                  <FileText className="w-5 h-5" />
                  Doctor Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why HealthVault?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Experience the future of healthcare data management with cutting-edge security
              and intuitive design.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className="animate-fade-in-up border-border/50"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="pt-6">
                  <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Take Control?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of patients and healthcare providers who trust HealthVault
            for secure medical records management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/patient/register">
              <Button size="lg" data-testid="button-get-started">
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-8 px-4 border-t">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <span className="font-semibold">HealthVault</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Secure Health Records Management System
          </p>
        </div>
      </footer>
    </div>
  );
}

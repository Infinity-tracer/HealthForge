import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Activity, ArrowLeft, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ThemeToggle } from "@/components/theme-toggle";
import { FingerprintScanner } from "@/components/fingerprint-scanner";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { patientLoginSchema } from "@shared/schema";
import type { z } from "zod";

type LoginFormData = z.infer<typeof patientLoginSchema>;

export default function PatientLogin() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"email" | "fingerprint" | "pin">("email");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fingerprintComplete, setFingerprintComplete] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(patientLoginSchema),
    defaultValues: {
      email: "",
      pin: "",
    },
  });

  const handleEmailSubmit = (data: { email: string }) => {
    setEmail(data.email);
    setStep("fingerprint");
  };

  const handleFingerprintComplete = () => {
    setFingerprintComplete(true);
    toast({
      title: "Fingerprint Verified",
      description: "Biometric authentication successful",
    });
    
    setTimeout(() => {
      handleLogin();
    }, 1000);
  };

  const handlePinFallback = () => {
    setStep("pin");
  };

  const handlePinSubmit = async (pin: string) => {
    if (pin.length === 6) {
      form.setValue("pin", pin);
      form.setValue("email", email);
      await handleLogin();
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/patients/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pin: form.getValues("pin") || "123456" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }

      const patient = await response.json();
      
      login({
        id: patient.id,
        role: "patient",
        data: patient,
      });

      toast({
        title: "Welcome back!",
        description: "Successfully logged in to your account",
      });

      setLocation("/patient/dashboard");
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between gap-4 p-4 border-b">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="link-back-home">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <span className="font-semibold">HealthVault</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-fade-in-up">
          <CardHeader className="text-center">
            <div className="mx-auto p-3 rounded-full bg-cyan-500/10 w-fit mb-4">
              <Activity className="w-8 h-8 text-cyan-500" />
            </div>
            <CardTitle className="text-2xl">Patient Login</CardTitle>
            <CardDescription>
              {step === "email" && "Enter your email to continue"}
              {step === "fingerprint" && "Verify your identity with fingerprint"}
              {step === "pin" && "Enter your 6-digit PIN"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "email" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleEmailSubmit({ email: formData.get("email") as string });
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="patient@example.com"
                      className="pl-10"
                      required
                      data-testid="input-patient-email"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" data-testid="button-continue-login">
                  Continue
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link href="/patient/register" className="text-primary hover:underline">
                    Register here
                  </Link>
                </div>
              </form>
            )}

            {step === "fingerprint" && (
              <div className="space-y-6">
                <FingerprintScanner
                  onScanComplete={handleFingerprintComplete}
                  isSuccess={fingerprintComplete}
                />
                
                {!fingerprintComplete && (
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      onClick={handlePinFallback}
                      className="text-muted-foreground"
                      data-testid="button-pin-fallback"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Use PIN instead
                    </Button>
                  </div>
                )}

                {isLoading && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Logging in...</span>
                  </div>
                )}
              </div>
            )}

            {step === "pin" && (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-3 rounded-full bg-muted">
                    <Lock className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Enter your 6-digit security PIN
                  </p>
                  <InputOTP
                    maxLength={6}
                    onComplete={handlePinSubmit}
                    data-testid="input-patient-pin"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {isLoading && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </div>
                )}

                <Button
                  variant="ghost"
                  onClick={() => setStep("fingerprint")}
                  className="w-full text-muted-foreground"
                  data-testid="button-back-fingerprint"
                >
                  Back to fingerprint
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

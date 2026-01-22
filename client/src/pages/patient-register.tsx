import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Activity, ArrowLeft, User, Mail, Phone, Calendar, Lock, Loader2, Check, Fingerprint, ArrowRight, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ThemeToggle } from "@/components/theme-toggle";
import { FingerprintScanner } from "@/components/fingerprint-scanner";
import { useToast } from "@/hooks/use-toast";
import { useWebAuthn } from "@/hooks/use-webauthn";
import { patientRegistrationSchema } from "@shared/schema";
import type { z } from "zod";

type RegistrationFormData = z.infer<typeof patientRegistrationSchema>;

export default function PatientRegister() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"form" | "verify-email" | "fingerprint">("form");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registeredFirstName, setRegisteredFirstName] = useState("");
  const [registeredLastName, setRegisteredLastName] = useState("");
  const [fingerprintRegistered, setFingerprintRegistered] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isResending, setIsResending] = useState(false);
  
  const { isSupported: isWebAuthnSupported, registerFingerprint, isLoading: isWebAuthnLoading } = useWebAuthn();

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      pin: "",
    },
  });

  const onSubmit = async (data: RegistrationFormData) => {
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/patients/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || "Registration failed");
      }

      // Store data for later steps
      setRegisteredEmail(data.email);
      setRegisteredFirstName(data.firstName);
      setRegisteredLastName(data.lastName);

      if (result.requiresVerification) {
        toast({
          title: "Verification Email Sent!",
          description: "Please check your email for the verification code.",
        });

        // Move to email verification step
        setStep("verify-email");
      } else {
        // If verification is not required (shouldn't happen with new flow)
        toast({
          title: "Account Created!",
          description: "Now let's set up your fingerprint for secure login.",
        });
        setStep("fingerprint");
      }
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the 6-digit verification code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/patients/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registeredEmail,
          code: verificationCode,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Verification failed");
      }

      toast({
        title: "Email Verified!",
        description: "Now let's set up your fingerprint for secure login.",
      });

      // Move to fingerprint registration step
      setStep("fingerprint");
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Invalid or expired code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);

    try {
      const response = await fetch("/api/patients/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to resend code");
      }

      toast({
        title: "Code Resent!",
        description: "A new verification code has been sent to your email.",
      });
      
      setVerificationCode("");
    } catch (error) {
      toast({
        title: "Failed to Resend",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleFingerprintRegistration = async (): Promise<boolean> => {
    try {
      const success = await registerFingerprint(
        registeredEmail,
        registeredFirstName,
        registeredLastName
      );
      
      if (success) {
        setFingerprintRegistered(true);
        toast({
          title: "Fingerprint Registered!",
          description: "You can now use your fingerprint to log in.",
        });
        
        // Redirect to login after a short delay
        setTimeout(() => {
          setLocation("/patient/login");
        }, 2000);
      }
      
      return success;
    } catch (error) {
      toast({
        title: "Fingerprint Registration Failed",
        description: error instanceof Error ? error.message : "Could not register fingerprint",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleSkipFingerprint = () => {
    toast({
      title: "Registration Complete",
      description: "You can add fingerprint authentication later from your profile.",
    });
    setLocation("/patient/login");
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
        <div className="flex items-center gap-3">
          <img src="/college-logo.png" alt="College Logo" className="w-12 h-12 object-contain" />
          <span className="font-semibold text-lg">HealthVault</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-4 py-8">
        {step === "form" ? (
          <Card className="w-full max-w-lg animate-fade-in-up">
            <CardHeader className="text-center">
              <div className="mx-auto p-3 rounded-full bg-cyan-500/10 w-fit mb-4">
                <User className="w-8 h-8 text-cyan-500" />
              </div>
              <CardTitle className="text-2xl">Patient Registration</CardTitle>
              <CardDescription>
                Create your secure health records account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="John"
                              data-testid="input-first-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Doe"
                              data-testid="input-last-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="john.doe@example.com"
                              className="pl-10"
                              data-testid="input-email"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                              {...field}
                              type="tel"
                              placeholder="1234567890"
                              className="pl-10"
                              maxLength={10}
                              data-testid="input-phone"
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          Enter 10 digit phone number
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                              {...field}
                              type="date"
                              className="pl-10"
                              data-testid="input-dob"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Security PIN
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Lock className="w-4 h-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>6-digit PIN for fallback authentication</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        <FormControl>
                          <InputOTP
                            maxLength={6}
                            value={field.value}
                            onChange={field.onChange}
                            data-testid="input-pin"
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
                        </FormControl>
                        <FormDescription className="text-xs">
                          Used when fingerprint is unavailable
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                    data-testid="button-register"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending Verification...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Verification Code
                      </>
                    )}
                  </Button>

                  <div className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/patient/login" className="text-primary hover:underline">
                      Sign in
                    </Link>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : step === "verify-email" ? (
          <Card className="w-full max-w-md animate-fade-in-up">
            <CardHeader className="text-center">
              <div className="mx-auto p-3 rounded-full bg-green-500/10 w-fit mb-4">
                <ShieldCheck className="w-8 h-8 text-green-500" />
              </div>
              <CardTitle className="text-2xl">Verify Your Email</CardTitle>
              <CardDescription>
                We've sent a 6-digit verification code to <strong>{registeredEmail}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-4">
                  <InputOTP
                    maxLength={6}
                    value={verificationCode}
                    onChange={setVerificationCode}
                    data-testid="input-verification-code"
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
                  <p className="text-xs text-muted-foreground">
                    Enter the 6-digit code from your email
                  </p>
                </div>

                <Button
                  onClick={handleVerifyEmail}
                  className="w-full"
                  disabled={isLoading || verificationCode.length !== 6}
                  data-testid="button-verify-email"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Verify Email
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResendCode}
                    disabled={isResending}
                    className="text-muted-foreground"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Resending...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Resend Code
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Didn't receive the email? Check your spam folder or resend.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  The verification code expires in 10 minutes.
                  <br />
                  Your email also contains your masked PIN for reference.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-md animate-fade-in-up">
            <CardHeader className="text-center">
              <div className="mx-auto p-3 rounded-full bg-cyan-500/10 w-fit mb-4">
                <Fingerprint className="w-8 h-8 text-cyan-500" />
              </div>
              <CardTitle className="text-2xl">Register Fingerprint</CardTitle>
              <CardDescription>
                Set up biometric authentication for quick and secure login
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isWebAuthnSupported ? (
                <>
                  <FingerprintScanner
                    mode="register"
                    email={registeredEmail}
                    firstName={registeredFirstName}
                    lastName={registeredLastName}
                    onScanComplete={(success, error) => {
                      if (!success && error) {
                        toast({
                          title: "Fingerprint Registration Failed",
                          description: error,
                          variant: "destructive",
                        });
                      }
                    }}
                    performWebAuthn={handleFingerprintRegistration}
                    isSuccess={fingerprintRegistered}
                  />
                  
                  {!fingerprintRegistered && (
                    <div className="text-center">
                      <Button
                        variant="ghost"
                        onClick={handleSkipFingerprint}
                        className="text-muted-foreground"
                        disabled={isWebAuthnLoading}
                      >
                        Skip for now
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        You can add fingerprint authentication later
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-yellow-500/10 rounded-lg">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      Fingerprint authentication is not supported on this device.
                      You can still use your PIN to log in.
                    </p>
                  </div>
                  <Button onClick={handleSkipFingerprint} className="w-full">
                    <Check className="w-4 h-4 mr-2" />
                    Complete Registration
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}

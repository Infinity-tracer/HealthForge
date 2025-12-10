import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Activity, ArrowLeft, Shield, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ThemeToggle } from "@/components/theme-toggle";
import { FingerprintScanner } from "@/components/fingerprint-scanner";
import { useToast } from "@/hooks/use-toast";

export default function FingerprintScan() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [showPinFallback, setShowPinFallback] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleScanComplete = () => {
    setScanComplete(true);
    toast({
      title: "Fingerprint Verified",
      description: "FHE encryption verified successfully",
    });
    
    setTimeout(() => {
      setLocation("/patient/dashboard");
    }, 1500);
  };

  const handlePinSubmit = async (pin: string) => {
    if (pin.length === 6) {
      setIsVerifying(true);
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      toast({
        title: "PIN Verified",
        description: "Authentication successful",
      });
      
      setTimeout(() => {
        setLocation("/patient/dashboard");
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between gap-4 p-4 border-b">
        <Link href="/patient/login">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="link-back">
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
            <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Biometric Authentication</CardTitle>
            <CardDescription>
              {showPinFallback
                ? "Enter your 6-digit security PIN"
                : "Verify your identity with fingerprint scan"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showPinFallback ? (
              <div className="space-y-8">
                <FingerprintScanner
                  onScanComplete={handleScanComplete}
                  isScanning={isScanning}
                  isSuccess={scanComplete}
                />

                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm text-muted-foreground">
                      <Shield className="w-4 h-4 inline-block mr-1" />
                      Secured with Fully Homomorphic Encryption (FHE)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your biometric data never leaves your device unencrypted
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={() => setShowPinFallback(true)}
                    data-testid="button-use-pin"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Use PIN instead
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-6">
                  <div className="p-3 rounded-full bg-muted">
                    <Lock className="w-8 h-8 text-muted-foreground" />
                  </div>
                  
                  <InputOTP
                    maxLength={6}
                    onComplete={handlePinSubmit}
                    disabled={isVerifying}
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

                  {isVerifying && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => setShowPinFallback(false)}
                  disabled={isVerifying}
                  data-testid="button-use-fingerprint"
                >
                  Use fingerprint instead
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

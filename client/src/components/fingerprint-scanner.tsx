import { useState, useEffect } from "react";
import { Fingerprint, Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FingerprintScannerProps {
  onScanComplete: (success: boolean, error?: string) => void;
  onScanStart?: () => void;
  isScanning?: boolean;
  isSuccess?: boolean;
  mode?: "register" | "authenticate";
  email?: string;
  firstName?: string;
  lastName?: string;
  className?: string;
  // Function to perform the actual WebAuthn operation
  performWebAuthn?: () => Promise<boolean>;
}

export function FingerprintScanner({
  onScanComplete,
  onScanStart,
  isScanning: externalScanning,
  isSuccess: externalSuccess,
  mode = "authenticate",
  email,
  firstName,
  lastName,
  className,
  performWebAuthn,
}: FingerprintScannerProps) {
  const [internalScanning, setInternalScanning] = useState(false);
  const [internalSuccess, setInternalSuccess] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(true);

  const isScanning = externalScanning ?? internalScanning;
  const isSuccess = externalSuccess ?? internalSuccess;

  useEffect(() => {
    // Check WebAuthn support on mount
    const supported =
      typeof window !== "undefined" &&
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential === "function";
    setIsWebAuthnSupported(supported);
  }, []);

  const handleScan = async () => {
    if (isScanning || isSuccess) return;

    setInternalScanning(true);
    setInternalError(null);
    onScanStart?.();

    try {
      if (performWebAuthn) {
        // Use the provided WebAuthn function
        const success = await performWebAuthn();
        setInternalScanning(false);
        
        if (success) {
          setInternalSuccess(true);
          onScanComplete(true);
          
          setTimeout(() => {
            setInternalSuccess(false);
          }, 2000);
        } else {
          setInternalError("Fingerprint verification failed");
          onScanComplete(false, "Fingerprint verification failed");
        }
      } else {
        // Fallback: simulate for demo purposes if no WebAuthn function provided
        setTimeout(() => {
          setInternalScanning(false);
          setInternalSuccess(true);
          onScanComplete(true);

          setTimeout(() => {
            setInternalSuccess(false);
          }, 2000);
        }, 2000);
      }
    } catch (error) {
      setInternalScanning(false);
      const errorMessage = error instanceof Error ? error.message : "Fingerprint scan failed";
      setInternalError(errorMessage);
      onScanComplete(false, errorMessage);
    }
  };

  const getStatusText = () => {
    if (!isWebAuthnSupported) {
      return "Fingerprint not supported on this device";
    }
    if (internalError) {
      return internalError;
    }
    if (isSuccess) {
      return mode === "register" ? "Fingerprint Registered" : "Fingerprint Verified";
    }
    if (isScanning) {
      return mode === "register" ? "Registering..." : "Scanning...";
    }
    return mode === "register"
      ? "Tap to register your fingerprint"
      : "Place your finger on the scanner";
  };

  const getSubText = () => {
    if (!isWebAuthnSupported) {
      return "Please use PIN authentication instead";
    }
    if (internalError) {
      return "Please try again or use PIN";
    }
    if (isSuccess) {
      return mode === "register"
        ? "Fingerprint saved securely"
        : "Authentication successful";
    }
    if (isScanning) {
      return "Processing biometric data securely";
    }
    return mode === "register"
      ? "Your fingerprint will be encrypted and stored securely"
      : "Secure biometric authentication enabled";
  };

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      <div className="relative">
        <div
          className={cn(
            "absolute inset-0 rounded-full transition-all duration-500",
            isScanning && "animate-pulse-ring bg-primary/20",
            isSuccess && "bg-green-500/20",
            internalError && "bg-red-500/20"
          )}
          style={{ transform: "scale(1.3)" }}
        />
        <div
          className={cn(
            "absolute inset-0 rounded-full transition-all duration-500",
            isScanning && "animate-pulse-ring bg-primary/30 animation-delay-300"
          )}
          style={{ transform: "scale(1.15)", animationDelay: "0.3s" }}
        />

        <Button
          type="button"
          onClick={handleScan}
          disabled={isScanning || !isWebAuthnSupported}
          data-testid="button-fingerprint-scan"
          className={cn(
            "relative w-48 h-48 rounded-full",
            "bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800",
            "border-2 border-white/10",
            "shadow-[inset_0_2px_20px_rgba(255,255,255,0.1),0_10px_40px_rgba(0,0,0,0.3)]",
            "transition-all duration-300",
            !isScanning &&
              !isSuccess &&
              !internalError &&
              isWebAuthnSupported &&
              "hover:shadow-[inset_0_2px_20px_rgba(255,255,255,0.15),0_15px_50px_rgba(0,0,0,0.4)]",
            isScanning && "animate-glow",
            isSuccess && "bg-gradient-to-br from-green-600 to-green-700",
            internalError && "bg-gradient-to-br from-red-600 to-red-700",
            !isWebAuthnSupported && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="absolute inset-0 rounded-full overflow-hidden">
            {isScanning && (
              <div className="absolute inset-0 bg-gradient-to-b from-primary/40 via-transparent to-transparent animate-scan-line" />
            )}
          </div>

          {isSuccess ? (
            <Check className="w-20 h-20 text-white animate-scale-in" />
          ) : internalError ? (
            <AlertCircle className="w-20 h-20 text-white" />
          ) : isScanning ? (
            <Loader2 className="w-20 h-20 text-primary animate-spin-slow" />
          ) : (
            <Fingerprint
              className={cn(
                "w-20 h-20 transition-transform group-hover:scale-105",
                isWebAuthnSupported ? "text-white/80" : "text-white/40"
              )}
            />
          )}
        </Button>
      </div>

      <div className="text-center space-y-2">
        <p
          className={cn(
            "text-lg font-medium",
            internalError ? "text-red-500" : "text-foreground"
          )}
          data-testid="text-scan-status"
        >
          {getStatusText()}
        </p>
        <p className="text-sm text-muted-foreground">{getSubText()}</p>
      </div>
    </div>
  );
}


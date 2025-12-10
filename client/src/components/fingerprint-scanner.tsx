import { useState } from "react";
import { Fingerprint, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FingerprintScannerProps {
  onScanComplete: () => void;
  isScanning?: boolean;
  isSuccess?: boolean;
  className?: string;
}

export function FingerprintScanner({
  onScanComplete,
  isScanning: externalScanning,
  isSuccess: externalSuccess,
  className,
}: FingerprintScannerProps) {
  const [internalScanning, setInternalScanning] = useState(false);
  const [internalSuccess, setInternalSuccess] = useState(false);

  const isScanning = externalScanning ?? internalScanning;
  const isSuccess = externalSuccess ?? internalSuccess;

  const handleScan = () => {
    if (isScanning || isSuccess) return;
    
    setInternalScanning(true);
    
    setTimeout(() => {
      setInternalScanning(false);
      setInternalSuccess(true);
      onScanComplete();
      
      setTimeout(() => {
        setInternalSuccess(false);
      }, 2000);
    }, 2000);
  };

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      <div className="relative">
        <div
          className={cn(
            "absolute inset-0 rounded-full transition-all duration-500",
            isScanning && "animate-pulse-ring bg-primary/20",
            isSuccess && "bg-green-500/20"
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
          disabled={isScanning}
          data-testid="button-fingerprint-scan"
          className={cn(
            "relative w-48 h-48 rounded-full",
            "bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800",
            "border-2 border-white/10",
            "shadow-[inset_0_2px_20px_rgba(255,255,255,0.1),0_10px_40px_rgba(0,0,0,0.3)]",
            "transition-all duration-300",
            !isScanning && !isSuccess && "hover:shadow-[inset_0_2px_20px_rgba(255,255,255,0.15),0_15px_50px_rgba(0,0,0,0.4)]",
            isScanning && "animate-glow",
            isSuccess && "bg-gradient-to-br from-green-600 to-green-700"
          )}
        >
          <div className="absolute inset-0 rounded-full overflow-hidden">
            {isScanning && (
              <div className="absolute inset-0 bg-gradient-to-b from-primary/40 via-transparent to-transparent animate-scan-line" />
            )}
          </div>
          
          {isSuccess ? (
            <Check className="w-20 h-20 text-white animate-scale-in" />
          ) : isScanning ? (
            <Loader2 className="w-20 h-20 text-primary animate-spin-slow" />
          ) : (
            <Fingerprint className="w-20 h-20 text-white/80 transition-transform group-hover:scale-105" />
          )}
        </Button>
      </div>

      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-foreground" data-testid="text-scan-status">
          {isSuccess
            ? "Fingerprint Verified"
            : isScanning
            ? "Scanning..."
            : "Place your finger on the scanner"}
        </p>
        <p className="text-sm text-muted-foreground">
          {isSuccess
            ? "Authentication successful"
            : isScanning
            ? "Processing biometric data with FHE encryption"
            : "Secure biometric authentication enabled"}
        </p>
      </div>
    </div>
  );
}

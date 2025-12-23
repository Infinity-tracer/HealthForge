/**
 * WebAuthn Hook for Fingerprint Authentication
 * Handles fingerprint registration and authentication using the Web Authentication API
 */

import { useState, useCallback } from "react";

interface WebAuthnOptions {
  challenge: string;
  rp?: {
    name: string;
    id: string | null;
  };
  user?: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams?: Array<{ type: "public-key"; alg: number }>;
  authenticatorSelection?: {
    authenticatorAttachment?: "platform" | "cross-platform";
    userVerification?: "required" | "preferred" | "discouraged";
    residentKey?: "required" | "preferred" | "discouraged";
  };
  timeout?: number;
  attestation?: "none" | "indirect" | "direct";
}

interface UseWebAuthnReturn {
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
  registerFingerprint: (email: string, firstName: string, lastName: string) => Promise<boolean>;
  authenticateWithFingerprint: (email: string) => Promise<{ success: boolean; patient?: any }>;
  checkFingerprintStatus: (email: string) => Promise<boolean>;
}

// Utility functions for base64url encoding/decoding
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64UrlDecode(base64url: string): ArrayBuffer {
  // Add padding if needed
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function useWebAuthn(): UseWebAuthnReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if WebAuthn is supported
  const isSupported =
    typeof window !== "undefined" &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === "function";

  /**
   * Check if fingerprint is registered for a patient
   */
  const checkFingerprintStatus = useCallback(async (email: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/patients/fingerprint/status/${encodeURIComponent(email)}`);
      const data = await response.json();
      return data.fingerprintRegistered || false;
    } catch (err) {
      console.error("Error checking fingerprint status:", err);
      return false;
    }
  }, []);

  /**
   * Register a new fingerprint credential for the patient
   */
  const registerFingerprint = useCallback(
    async (email: string, firstName: string, lastName: string): Promise<boolean> => {
      if (!isSupported) {
        setError("WebAuthn is not supported on this device");
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Get registration options from server
        const optionsResponse = await fetch("/api/patients/fingerprint/registration-options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, firstName, lastName }),
        });

        if (!optionsResponse.ok) {
          throw new Error("Failed to get registration options");
        }

        const { options } = await optionsResponse.json();

        // Set the RP ID to current domain
        if (options.rp) {
          options.rp.id = window.location.hostname;
        }

        // Convert challenge and user.id from base64url to ArrayBuffer
        const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
          challenge: base64UrlDecode(options.challenge),
          rp: {
            name: options.rp.name,
            id: options.rp.id,
          },
          user: {
            id: base64UrlDecode(options.user.id),
            name: options.user.name,
            displayName: options.user.displayName,
          },
          pubKeyCredParams: options.pubKeyCredParams,
          authenticatorSelection: options.authenticatorSelection,
          timeout: options.timeout,
          attestation: options.attestation,
        };

        // Create credential using WebAuthn API
        const credential = (await navigator.credentials.create({
          publicKey: publicKeyCredentialCreationOptions,
        })) as PublicKeyCredential;

        if (!credential) {
          throw new Error("Failed to create credential");
        }

        const response = credential.response as AuthenticatorAttestationResponse;

        // Encode credential data for storage
        const credentialId = base64UrlEncode(credential.rawId);
        const publicKey = base64UrlEncode(response.getPublicKey() || new ArrayBuffer(0));

        // Register the credential with the server
        const registerResponse = await fetch("/api/patients/fingerprint/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            credentialId,
            publicKey,
          }),
        });

        if (!registerResponse.ok) {
          const errorData = await registerResponse.json();
          throw new Error(errorData.error || "Failed to register fingerprint");
        }

        setIsLoading(false);
        return true;
      } catch (err) {
        console.error("Fingerprint registration error:", err);
        if (err instanceof Error) {
          if (err.name === "NotAllowedError") {
            setError("Fingerprint registration was cancelled or not allowed");
          } else if (err.name === "NotSupportedError") {
            setError("This device does not support fingerprint authentication");
          } else {
            setError(err.message);
          }
        } else {
          setError("An unknown error occurred during fingerprint registration");
        }
        setIsLoading(false);
        return false;
      }
    },
    [isSupported]
  );

  /**
   * Authenticate using fingerprint
   */
  const authenticateWithFingerprint = useCallback(
    async (email: string): Promise<{ success: boolean; patient?: any }> => {
      if (!isSupported) {
        setError("WebAuthn is not supported on this device");
        return { success: false };
      }

      setIsLoading(true);
      setError(null);

      try {
        // Get challenge from server
        const challengeResponse = await fetch("/api/patients/fingerprint/challenge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        if (!challengeResponse.ok) {
          const errorData = await challengeResponse.json();
          if (!errorData.fingerprintRegistered) {
            setError("No fingerprint registered for this account");
            setIsLoading(false);
            return { success: false };
          }
          throw new Error(errorData.error || "Failed to get authentication challenge");
        }

        const { challenge, credentialId } = await challengeResponse.json();

        // Create authentication options
        const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
          challenge: base64UrlDecode(challenge),
          rpId: window.location.hostname,
          allowCredentials: [
            {
              id: base64UrlDecode(credentialId),
              type: "public-key",
              transports: ["internal"],
            },
          ],
          userVerification: "required",
          timeout: 60000,
        };

        // Get credential using WebAuthn API
        const credential = (await navigator.credentials.get({
          publicKey: publicKeyCredentialRequestOptions,
        })) as PublicKeyCredential;

        if (!credential) {
          throw new Error("Failed to get credential");
        }

        const response = credential.response as AuthenticatorAssertionResponse;

        // Verify with server
        const verifyResponse = await fetch("/api/patients/fingerprint/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            credentialId: base64UrlEncode(credential.rawId),
            authenticatorData: base64UrlEncode(response.authenticatorData),
            signature: base64UrlEncode(response.signature),
            clientDataJSON: base64UrlEncode(response.clientDataJSON),
          }),
        });

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json();
          throw new Error(errorData.error || "Fingerprint verification failed");
        }

        const result = await verifyResponse.json();
        setIsLoading(false);
        return { success: true, patient: result.patient };
      } catch (err) {
        console.error("Fingerprint authentication error:", err);
        if (err instanceof Error) {
          if (err.name === "NotAllowedError") {
            setError("Fingerprint authentication was cancelled or not allowed");
          } else if (err.name === "NotSupportedError") {
            setError("This device does not support fingerprint authentication");
          } else {
            setError(err.message);
          }
        } else {
          setError("An unknown error occurred during fingerprint authentication");
        }
        setIsLoading(false);
        return { success: false };
      }
    },
    [isSupported]
  );

  return {
    isSupported,
    isLoading,
    error,
    registerFingerprint,
    authenticateWithFingerprint,
    checkFingerprintStatus,
  };
}

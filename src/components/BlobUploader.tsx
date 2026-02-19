"use client";

import { Button } from "@/components/ui/button";
import { shelbyClient } from "@/utils/shelbyClient";
import { useUploadBlobs } from "@shelby-protocol/react";
import { useStorageAccount } from "@shelby-protocol/solana-kit/react";
import { useWalletConnection } from "@solana/react-hooks";
import { memo, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface BlobUploaderProps {
  currentStep: number;
  fundedStorageAddress: string | null;
  onFirstBlobUploaded?: () => void;
}

interface UploadedBlob {
  name: string;
  url: string;
  uploadedAt: Date;
}

export const BlobUploader = memo(function BlobUploader({
  currentStep,
  fundedStorageAddress,
  onFirstBlobUploaded,
}: BlobUploaderProps) {
  const { wallet, status } = useWalletConnection();
  const { storageAccountAddress, signAndSubmitTransaction } = useStorageAccount(
    {
      client: shelbyClient,
      wallet,
    },
  );

  const { mutateAsync: uploadBlobs, isPending: isUploading } = useUploadBlobs({
    client: shelbyClient,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedBlobs, setUploadedBlobs] = useState<UploadedBlob[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const connected = status === "connected";

  useEffect(() => {
    if (!fundedStorageAddress) {
      setUploadedBlobs([]);
    }
  }, [fundedStorageAddress]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const isDuplicate = uploadedBlobs.some(
          (blob) => blob.name === file.name,
        );
        if (isDuplicate) {
          setStatusMessage(`A blob named "${file.name}" already exists.`);
          event.target.value = "";
          return;
        }
        setSelectedFile(file);
        setStatusMessage(null);
      }
    },
    [uploadedBlobs],
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !storageAccountAddress || !signAndSubmitTransaction)
      return;

    // Defensive check: prevent upload if blob with same name already exists
    if (uploadedBlobs.some((blob) => blob.name === selectedFile.name)) {
      setStatusMessage(`A blob named "${selectedFile.name}" already exists.`);
      return;
    }

    try {
      setStatusMessage("Uploading blob...");

      const arrayBuffer = await selectedFile.arrayBuffer();
      const blobData = new Uint8Array(arrayBuffer);

      // Calculate expiration (30 days from now in microseconds)
      const expirationMicros = (Date.now() + 1000 * 60 * 60 * 24 * 30) * 1000;

      await uploadBlobs({
        signer: {
          account: storageAccountAddress,
          signAndSubmitTransaction,
        },
        blobs: [
          {
            blobName: selectedFile.name,
            blobData,
          },
        ],
        expirationMicros,
      });

      // Construct the blob URL
      const blobUrl = `https://api.shelbynet.shelby.xyz/shelby/v1/blobs/${storageAccountAddress.toString()}/${selectedFile.name}`;

      if (uploadedBlobs.length === 0) {
        onFirstBlobUploaded?.();
      }

      setUploadedBlobs((prev) => [
        {
          name: selectedFile.name,
          url: blobUrl,
          uploadedAt: new Date(),
        },
        ...prev,
      ]);

      setSelectedFile(null);
      setStatusMessage("Blob uploaded successfully!");

      // Reset file input
      const fileInput = document.getElementById(
        "blob-file-upload",
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.includes("INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE")) {
        toast.error(
          'Your account needs funding before uploading. Please click "Fund Account" to add APT for transaction fees.',
        );
        setStatusMessage(null);
      } else if (errorMessage.includes("E_INSUFFICIENT_FUNDS")) {
        toast.error(
          'Your account needs more ShelbyUSD to pay for storage. Please click "Fund Account" to add ShelbyUSD tokens.',
        );
        setStatusMessage(null);
      } else {
        setStatusMessage(`Error: ${errorMessage}`);
      }
    }
  }, [
    selectedFile,
    storageAccountAddress,
    signAndSubmitTransaction,
    uploadBlobs,
    uploadedBlobs,
    onFirstBlobUploaded,
  ]);

  const handleFileInputClick = useCallback(() => {
    document.getElementById("blob-file-upload")?.click();
  }, []);

  const isDisabled = !connected || !fundedStorageAddress;

  // Glow logic for step 2: file input when no file selected, upload button when file selected
  const showFileInputGlow = currentStep === 2 && !selectedFile;
  const showUploadGlow = currentStep === 2 && selectedFile !== null;

  return (
    <div className="glass-neon rounded-xl p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Upload Blob
        </h2>
        <p className="text-sm text-muted-foreground">
          Upload files to your Shelby storage account. Your wallet will sign the
          transaction.
        </p>
      </div>

      {isDisabled ? (
        <div className="space-y-3 p-4 bg-white/5 rounded-lg border border-white/10">
          <p className="text-sm text-muted-foreground">
            {!connected
              ? "Connect your wallet first to upload blobs."
              : "Fund your storage account first to upload blobs."}
          </p>
        </div>
      ) : (
        <>
          {/* File Input */}
          <div className="space-y-2">
            <input
              id="blob-file-upload"
              type="file"
              onChange={handleFileChange}
              className="sr-only"
            />
            <Button
              variant="outline"
              onClick={handleFileInputClick}
              className={showFileInputGlow ? "glow-pulse" : ""}
            >
              Choose File
            </Button>
          </div>

          {/* Selected File Info */}
          {selectedFile && (
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Selected:</span>
                <span className="text-sm font-medium text-foreground">
                  {selectedFile.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <Button
                variant="outline"
                onClick={handleUpload}
                disabled={isUploading}
                className={showUploadGlow ? "glow-pulse" : ""}
              >
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && (
            <p
              className={`text-sm ${statusMessage.startsWith("Error") ? "text-destructive" : "text-muted-foreground"}`}
            >
              {statusMessage}
            </p>
          )}
        </>
      )}

      {/* Uploaded Blobs List */}
      {uploadedBlobs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Uploaded Blobs
          </h3>
          <div className="space-y-2">
            {uploadedBlobs.map((blob) => (
              <div
                key={blob.name}
                className="p-3 bg-white/5 rounded-lg border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {blob.name}
                  </span>
                  <div className="flex items-center space-x-2">
                    <a
                      href={blob.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-md text-[var(--poline-accent-9)] hover:text-[var(--poline-surface-1)] hover:bg-[var(--poline-accent-9)] transition-colors"
                      title="View"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-labelledby="view-icon-title"
                      >
                        <title id="view-icon-title">View blob</title>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </a>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                  {blob.url}
                </p>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  {blob.uploadedAt.toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

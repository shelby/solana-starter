"use client";

import { shelbyClient } from "@/utils/shelbyClient";
import { useStorageAccount } from "@shelby-protocol/solana-kit/react";
import { useWalletConnection } from "@solana/react-hooks";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

function formatAddress(address?: string) {
  if (!address) return "Not connected";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

interface HeaderProps {
  currentStep: number;
}

export const Header = memo(function Header({ currentStep }: HeaderProps) {
  const { connectors, connect, disconnect, wallet, status } =
    useWalletConnection();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const walletAddress = wallet?.account.address.toString();

  // Storage account derived from the connected wallet (for dropdown display)
  const { storageAccountAddress } = useStorageAccount({
    client: shelbyClient,
    wallet,
  });

  // Close modal when connection succeeds
  useEffect(() => {
    if (status === "connected") {
      setIsModalOpen(false);
    }
  }, [status]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isMenuOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const buttonLabel = useMemo(
    () =>
      status === "connected"
        ? formatAddress(walletAddress)
        : status === "connecting"
          ? "Connecting..."
          : "Connect Wallet",
    [status, walletAddress],
  );

  const showGlow = currentStep === 0 && !isModalOpen && status !== "connected";

  return (
    <header className="glass-neon rounded-xl mb-8 py-5 px-6 flex justify-between items-center relative z-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground flex items-baseline gap-3 flex-wrap">
          <span className="font-mono bg-gradient-to-r from-neon-pink to-neon-cyan bg-clip-text text-transparent drop-shadow-[0_0_10px_oklch(0.7_0.3_340/0.5)]">
            Shelby Protocol
          </span>
          <span className="text-neon-pink/70 font-light select-none">
            {"//"}
          </span>
          <span className="text-foreground/90 font-normal">Solana Starter</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload blobs to Shelby using your Solana wallet
        </p>
      </div>

      {/* Wallet Button */}
      <div
        className={`relative ${showGlow ? "glow-pulse-container" : ""}`}
        ref={menuRef}
      >
        <button
          type="button"
          onClick={() =>
            status === "connected"
              ? setIsMenuOpen((v) => !v)
              : setIsModalOpen(true)
          }
          className={`inline-flex items-center gap-2 rounded-full border border-[var(--poline-accent-5)] bg-white/10 px-4 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:bg-[var(--poline-accent-5)] hover:text-[var(--poline-surface-1)] ${showGlow ? "glow-pulse" : ""}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${status === "connected" ? "bg-green-400" : "bg-white/70"}`}
            aria-hidden
          />
          <span>{buttonLabel}</span>
        </button>

        {/* Connected dropdown menu */}
        {isMenuOpen && status === "connected" && (
          <div className="absolute right-0 mt-2 w-72 rounded-xl border border-white/20 bg-[#1a1a2e] shadow-lg z-50 overflow-hidden">
            {/* Wallet Address */}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="text-sm font-medium mb-1 text-white/60">
                Wallet
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-white/90">
                  {walletAddress
                    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-5)}`
                    : "Not available"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (walletAddress) {
                      navigator.clipboard.writeText(walletAddress);
                      toast.success("Wallet address copied");
                    }
                  }}
                  className="p-1.5 rounded hover:bg-white/10 transition text-white/60 hover:text-white"
                  title="Copy wallet address"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <title>Copy</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Storage Account */}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="text-sm font-medium mb-1 text-white/60">
                Storage Account
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-white/90">
                  {storageAccountAddress
                    ? `${storageAccountAddress.toString().slice(0, 6)}...${storageAccountAddress.toString().slice(-5)}`
                    : "Not available"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (storageAccountAddress) {
                      navigator.clipboard.writeText(
                        storageAccountAddress.toString(),
                      );
                      toast.success("Storage address copied");
                    }
                  }}
                  className="p-1.5 rounded hover:bg-white/10 transition text-white/60 hover:text-white"
                  title="Copy storage address"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <title>Copy</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Disconnect */}
            <div className="px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  disconnect();
                }}
                className="text-sm font-medium text-red-400 hover:text-red-300 transition"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* Wallet selection modal */}
        {isModalOpen &&
          status !== "connected" &&
          createPortal(
            <dialog
              open
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm m-0 max-w-none max-h-none w-full h-full border-none"
              onClick={() => setIsModalOpen(false)}
              onKeyDown={(e) => e.key === "Escape" && setIsModalOpen(false)}
              aria-labelledby="wallet-modal-title"
            >
              <div
                className="w-full max-w-md mx-4 rounded-2xl border border-white/20 bg-[#1a1a2e] p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p
                      id="wallet-modal-title"
                      className="text-lg font-semibold text-white"
                    >
                      Select a wallet
                    </p>
                    <p className="text-sm text-white/60">
                      Choose a wallet to connect.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-white/60 hover:text-white transition"
                    onClick={() => setIsModalOpen(false)}
                  >
                    <span aria-hidden>&#x2715;</span>
                    <span className="sr-only">Close</span>
                  </button>
                </div>

                <div className="grid gap-3">
                  {connectors.map((connector) => (
                    <button
                      type="button"
                      key={connector.id}
                      onClick={() => connect(connector.id)}
                      disabled={status === "connecting"}
                      className="group flex items-center justify-between rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-left text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm hover:bg-white/10 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="flex flex-col">
                        <span className="text-base text-white">
                          {connector.name}
                        </span>
                        <span className="text-xs text-white/60">
                          {status === "connecting"
                            ? "Connecting..."
                            : "Click to connect"}
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 rounded-full bg-white/20 transition group-hover:bg-neon-cyan"
                      />
                    </button>
                  ))}

                  {connectors.length === 0 && (
                    <div className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm text-white/60">
                      No wallets discovered. Ensure a Solana wallet extension is
                      installed.
                    </div>
                  )}
                </div>
              </div>
            </dialog>,
            document.body,
          )}
      </div>
    </header>
  );
});

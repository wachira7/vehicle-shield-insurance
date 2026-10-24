"use client";

// The signed-in session: a wallet proves who it is with one Sign-In with Ethereum signature
// (no transaction, no gas) and gets a 24-hour token from the API. The session ends when it
// expires, when the wallet disconnects, or when the wallet switches to another account.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createSiweMessage } from "viem/siwe";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { ApiError, getNonce, getProfile, verifySignIn, type Profile } from "./api";
import { chain } from "./chain";

const STORAGE_KEY = "vehicleshield.session";

interface Stored {
  token: string;
  address: `0x${string}`;
  expiresAt: string;
}

type Status = "loading" | "signed-out" | "signed-in";

interface SessionValue {
  status: Status;
  address?: `0x${string}`;
  token?: string;
  /// undefined while loading; null when the wallet hasn't registered yet.
  profile?: Profile | null;
  signIn: () => Promise<{ needsProfile: boolean }>;
  signOut: (options?: { disconnectWallet?: boolean }) => void;
  setProfile: (profile: Profile) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

function readStored(): Stored | null {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Stored | null;
    return stored && new Date(stored.expiresAt).getTime() > Date.now() ? stored : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Stored | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [profile, setProfileState] = useState<Profile | null | undefined>(undefined);
  const { address, status: walletStatus } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const previousWalletStatus = useRef(walletStatus);

  const signOut = useCallback(
    ({ disconnectWallet = false } = {}) => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      setStored(null);
      setProfileState(undefined);
      setStatus("signed-out");
      if (disconnectWallet) disconnect();
    },
    [disconnect],
  );

  const loadProfile = useCallback(
    async (token: string) => {
      try {
        setProfileState((await getProfile(token)).profile);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) signOut();
        else setProfileState(null);
      }
    },
    [signOut],
  );

  // Restore a saved session on first load.
  useEffect(() => {
    const saved = readStored();
    if (saved) {
      setStored(saved);
      setStatus("signed-in");
      void loadProfile(saved.token);
    } else {
      setStatus("signed-out");
    }
  }, [loadProfile]);

  // End the session if the wallet disconnects or switches to another account.
  useEffect(() => {
    const wasConnected = previousWalletStatus.current === "connected";
    previousWalletStatus.current = walletStatus;
    if (!stored) return;
    if (walletStatus === "connected" && address && address.toLowerCase() !== stored.address.toLowerCase()) signOut();
    else if (wasConnected && walletStatus === "disconnected") signOut();
  }, [walletStatus, address, stored, signOut]);

  // Expire the session on time, even if the page stays open.
  useEffect(() => {
    if (!stored) return;
    const remaining = new Date(stored.expiresAt).getTime() - Date.now();
    const timer = setTimeout(() => signOut(), Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [stored, signOut]);

  const signIn = useCallback(async () => {
    if (!address) throw new Error("Connect a wallet first");
    const { nonce } = await getNonce();
    const message = createSiweMessage({
      address,
      chainId: chain.id,
      domain: window.location.host,
      uri: window.location.origin,
      nonce,
      version: "1",
      statement: "Sign in to VehicleShield. This is free and doesn't send a transaction.",
      expirationTime: new Date(Date.now() + 10 * 60 * 1000),
    });
    const signature = await signMessageAsync({ message });
    const session = await verifySignIn(message, signature);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {}
    setStored(session);
    setStatus("signed-in");
    const { profile: existing } = await getProfile(session.token).catch(() => ({ profile: null }));
    setProfileState(existing);
    return { needsProfile: !existing };
  }, [address, signMessageAsync]);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      address: stored?.address,
      token: stored?.token,
      profile,
      signIn,
      signOut,
      setProfile: setProfileState,
    }),
    [status, stored, profile, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}

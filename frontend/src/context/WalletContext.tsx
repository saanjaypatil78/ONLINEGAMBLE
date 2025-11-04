import { createContext, ReactNode, useContext } from "react";
import { PublicKey } from "@solana/web3.js";
import { WalletReadyState } from "@solana/wallet-adapter-base";

import { usePhantomWallet } from "../hooks/usePhantomWallet";

export type WalletContextState = {
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  connected: boolean;
  connecting: boolean;
  publicKey: PublicKey | null | undefined;
  publicKeyBase58: string | null;
  balance: number | null;
  error: string | null;
  hasProvider: boolean;
  adapterName: string | null;
  readyState: WalletReadyState | null;
  cluster: string;
};

const WalletContext = createContext<WalletContextState | undefined>(undefined);

type WalletContextProviderProps = {
  children: ReactNode;
};

export function WalletContextProvider({ children }: WalletContextProviderProps) {
  const {
    connectWallet,
    disconnectWallet,
    refreshBalance,
    connected,
    connecting,
    publicKey,
    publicKeyBase58,
    balance,
    error,
    hasProvider,
    adapterName,
    readyState,
  } = usePhantomWallet();

  const value: WalletContextState = {
    connectWallet,
    disconnectWallet,
    refreshBalance,
    connected,
    connecting,
    publicKey,
    publicKeyBase58,
    balance,
    error,
    hasProvider,
    adapterName,
    readyState: readyState ?? null,
    cluster: "devnet",
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWalletContext(): WalletContextState {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error("useWalletContext must be used within a WalletContextProvider");
  }

  return context;
}

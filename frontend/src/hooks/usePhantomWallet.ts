import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet, type WalletContextState } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork, WalletReadyState } from "@solana/wallet-adapter-base";
import { LAMPORTS_PER_SOL, type PublicKey } from "@solana/web3.js";

type WalletBalance = number | null;

type WalletError = Error & { error?: unknown };

type WalletListItem = WalletContextState["wallets"][number];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "Unknown wallet error";
}

function isPhantomWallet(candidate: WalletListItem): boolean {
  return candidate.adapter.name.toLowerCase() === "phantom";
}

export function formatPublicKey(publicKey: PublicKey | null | undefined): string | null {
  return publicKey ? publicKey.toBase58() : null;
}

export function usePhantomWallet() {
  const { connection } = useConnection();
  const { connect, disconnect, connected, connecting, publicKey, wallet, wallets, select } =
    useWallet();

  const [balance, setBalance] = useState<WalletBalance>(null);
  const [error, setError] = useState<string | null>(null);

  const cluster =
    (process.env.NEXT_PUBLIC_SOLANA_CLUSTER as WalletAdapterNetwork | undefined) ??
    WalletAdapterNetwork.Devnet;

  const phantomWallet = useMemo<WalletListItem | null>(
    () => wallets.find(isPhantomWallet) ?? null,
    [wallets],
  );

  const readyState = phantomWallet?.readyState ?? wallet?.adapter.readyState ?? null;

  const hasProvider = useMemo(() => {
    if (!phantomWallet) {
      return false;
    }

    return (
      phantomWallet.readyState === WalletReadyState.Installed ||
      phantomWallet.readyState === WalletReadyState.Loadable
    );
  }, [phantomWallet]);

  const selectPhantom = useCallback(() => {
    if (!phantomWallet) {
      return;
    }

    select(phantomWallet.adapter.name);
  }, [phantomWallet, select]);

  useEffect(() => {
    // Autoselect Phantom the first time if nothing is chosen yet.
    if (!wallet && phantomWallet) {
      selectPhantom();
    }
  }, [wallet, phantomWallet, selectPhantom]);

  const refreshBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    try {
      const lamports = await connection.getBalance(publicKey);
      setBalance(lamports / LAMPORTS_PER_SOL);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [connection, publicKey]);

  useEffect(() => {
    if (connected && publicKey) {
      void refreshBalance();
    } else {
      setBalance(null);
    }
  }, [connected, publicKey, refreshBalance]);

  useEffect(() => {
    if (!wallet?.adapter) {
      return;
    }

    const handleConnect = () => {
      setError(null);
      void refreshBalance();
    };

    const handleDisconnect = () => {
      setBalance(null);
    };

    const handleError = (err: WalletError) => {
      setError(getErrorMessage(err.error ?? err));
    };

    wallet.adapter.on("connect", handleConnect);
    wallet.adapter.on("disconnect", handleDisconnect);
    wallet.adapter.on("error", handleError);

    return () => {
      wallet.adapter.off("connect", handleConnect);
      wallet.adapter.off("disconnect", handleDisconnect);
      wallet.adapter.off("error", handleError);
    };
  }, [wallet, refreshBalance]);

  const connectWallet = useCallback(async () => {
    setError(null);

    try {
      if (!wallet && phantomWallet) {
        selectPhantom();
      }

      await connect();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [connect, wallet, phantomWallet, selectPhantom]);

  const disconnectWallet = useCallback(async () => {
    setError(null);

    try {
      await disconnect();
      setBalance(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [disconnect]);

  return {
    connectWallet,
    disconnectWallet,
    refreshBalance,
    connected,
    connecting,
    publicKey,
    publicKeyBase58: formatPublicKey(publicKey),
    balance,
    error,
    hasProvider,
    adapterName: wallet?.adapter.name ?? phantomWallet?.adapter.name ?? null,
    readyState,
    cluster,
  };
}

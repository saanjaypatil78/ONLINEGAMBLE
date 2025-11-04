import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useMemo } from "react";

import { useWalletContext } from "../context/WalletContext";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#flow", label: "How it Works" },
  { href: "#stats", label: "Live Stats" },
  { href: "#faq", label: "FAQ" },
];

export function Header() {
  const { publicKeyBase58, balance, connected, cluster } = useWalletContext();

  const walletSummary = useMemo(() => {
    if (!connected) {
      return "Not connected";
    }

    const truncated =
      publicKeyBase58 && publicKeyBase58.length > 12
        ? `${publicKeyBase58.slice(0, 6)}…${publicKeyBase58.slice(-4)}`
        : (publicKeyBase58 ?? "Unknown");

    const formattedBalance = typeof balance === "number" ? `${balance.toFixed(3)} SOL` : "Loading…";

    return `${truncated} • ${formattedBalance} • ${cluster}`;
  }, [publicKeyBase58, balance, connected, cluster]);

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Link href="/" className="text-2xl font-semibold text-white">
            Matka Battles
          </Link>
          <p className="text-xs text-slate-400 lg:text-sm">{walletSummary}</p>
        </div>

        <nav className="flex flex-1 flex-wrap items-center justify-end gap-4 sm:gap-6">
          <ul className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a className="transition hover:text-white" href={link.href}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <WalletMultiButton className="!bg-primary !text-white hover:!bg-primary-light" />
        </nav>
      </div>
    </header>
  );
}

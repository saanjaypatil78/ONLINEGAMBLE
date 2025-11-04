import Head from "next/head";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";

export default function Home() {
  const { connected, publicKey } = useWallet();

  return (
    <>
      <Head>
        <title>Matka Battles</title>
        <meta name="description" content="Solana Axie-style MVP lobby" />
      </Head>
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-16">
          <header className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold">Matka Battles</h1>
            <button
              className="rounded bg-purple-600 px-4 py-2 font-medium hover:bg-purple-500"
              type="button"
            >
              {connected ? "Wallet Connected" : "Connect Wallet"}
            </button>
          </header>

          <article className="rounded border border-purple-700 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">PvP Lobby</h2>
            <p className="mt-2 text-slate-300">
              TODO: implement lobby matchmaking flow and battle history display.
            </p>
            <div className="mt-4 space-x-3">
              <button
                className="rounded bg-emerald-600 px-4 py-2 hover:bg-emerald-500"
                type="button"
              >
                Queue for Battle
              </button>
              <button className="rounded bg-rose-600 px-4 py-2 hover:bg-rose-500" type="button">
                Leave Queue
              </button>
            </div>
          </article>

          <article className="rounded border border-cyan-700 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">Pump.fun Token Stats</h2>
            <p className="mt-2 text-slate-300">
              TODO: wire in live bonding-curve metrics and alerts.
            </p>
            {connected && (
              <p className="mt-4 text-sm text-slate-400">Connected as {publicKey?.toBase58()}</p>
            )}
          </article>

          <footer className="flex flex-col gap-2 text-sm text-slate-400">
            <Link href="/compliance">Compliance Controls (Coming Soon)</Link>
            <span>TODO: add fiat on-ramp guidance modal trigger.</span>
          </footer>
        </section>
      </main>
    </>
  );
}

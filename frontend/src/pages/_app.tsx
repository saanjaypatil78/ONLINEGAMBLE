import type { AppProps } from "next/app";
import "../styles/globals.css";
import { WalletProvider } from "../components/WalletProvider";
import { WalletContextProvider } from "../context/WalletContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WalletProvider>
      <WalletContextProvider>
        <Component {...pageProps} />
      </WalletContextProvider>
    </WalletProvider>
  );
}

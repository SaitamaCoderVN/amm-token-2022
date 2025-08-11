'use client';

import { BaseLayout } from "./components/layout/BaseLayout";
import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import { WalletProvider } from "./providers/wallet-provider";
import { ClusterProvider } from "./providers/cluster-provider";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <ClusterProvider>
      <WalletProvider
        network={WalletAdapterNetwork.Devnet}
        autoConnect={false}
      >
        <BaseLayout>
          {children}
          <Toaster />
        </BaseLayout>
      </WalletProvider>
    </ClusterProvider>
  );
}

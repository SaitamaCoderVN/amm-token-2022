'use client';

import { ConnectWalletButton } from "@/components/ui/murphy/connect-wallet-button";
import { NetworkToggle } from "./network-toggle";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Swap", href: "/swap" },
  { label: "Liquidity", href: "/liquidity" },
  { label: "Create Token", href: "/create" },
  { label: "Faucet", href: "/faucet" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="flex h-16 items-center px-4 md:px-6">
        <Link href="/" className="mr-8 flex items-center space-x-2">
          <span className="text-xl font-bold">AMM DEX</span>
        </Link>
        <div className="flex items-center space-x-6 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === item.href ? "text-foreground" : "text-foreground/60"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-4">
          <NetworkToggle />
          <ConnectWalletButton />
        </div>
      </div>
    </nav>
  );
}

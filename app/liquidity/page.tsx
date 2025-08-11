"use client";

import { useEffect } from "react";
import AddLiquidityPool from "./add-liquidity-pool";
import LiquidityPoolsList from "./liquidity-pools-list";

export default function LiquidityPage() {
  useEffect(() => {
    // Log to verify the page is loading
    console.log("Liquidity page loaded");
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Liquidity Management</h1>
        <p className="text-muted-foreground">
          Create new liquidity pools and manage existing ones
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <AddLiquidityPool onPoolCreated={() => {
            // Refresh the pools list when a new pool is created
            console.log("Pool created, refreshing...");
            window.location.reload();
          }} />
        </div>
        
        <div>
          <LiquidityPoolsList />
        </div>
      </div>
    </div>
  );
}

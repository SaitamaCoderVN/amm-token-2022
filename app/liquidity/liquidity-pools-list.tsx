"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useAnchorProvider } from "@/app/providers/anchor-provider";
import { getAllLiquidityPairs, LiquidityPairInfo } from "./liquidity-pool";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ExternalLink, Lock, Unlock } from "lucide-react";

export default function LiquidityPoolsList() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { program, isReady } = useAnchorProvider();
  
  const [pools, setPools] = useState<LiquidityPairInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPools = useCallback(async () => {
    if (!program || !isReady) {
      console.log("Program not ready");
      console.log("Program:", program);
      console.log("IsReady:", isReady);
      return;
    }
    
    try {
      setIsLoading(true);
      setError("");
      
      console.log("Starting to fetch pools...");
      console.log("Program ID:", program.programId.toString());
      console.log("Connection endpoint:", connection.rpcEndpoint);
      console.log("Program methods:", Object.keys(program.methods));
      console.log("Program accounts:", Object.keys(program.account));
      
      const allPools = await getAllLiquidityPairs(connection, program);
      console.log("Fetched pools:", allPools);
      
      setPools(allPools);
      
      console.log(`Found ${allPools.length} liquidity pools`);
    } catch (error) {
      console.error("Error fetching pools:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch pools");
    } finally {
      setIsLoading(false);
    }
  }, [program, isReady, connection]);

  useEffect(() => {
    console.log("useEffect triggered, isReady:", isReady);
    if (isReady) {
      fetchPools();
    }
  }, [isReady, fetchPools]);

  const getExplorerUrl = (address: string) => {
    return `https://explorer.solana.com/address/${address}?cluster=devnet`;
  };

  if (!publicKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Liquidity Pools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Please connect your wallet to view liquidity pools
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Liquidity Pools ({pools.length})</CardTitle>
        <Button 
          onClick={fetchPools} 
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading pools...</p>
          </div>
        ) : pools.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No liquidity pools found
          </div>
        ) : (
          <div className="space-y-4">
            {pools.map((pool) => (
              <Card key={pool.poolAddress.toString()} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">#{pool.seed}</Badge>
                    {pool.isLocked ? (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Locked
                      </Badge>
                    ) : (
                      <Badge variant="default" className="flex items-center gap-1">
                        <Unlock className="h-3 w-3" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <Badge variant="secondary">
                    {(pool.feeRate * 100).toFixed(2)}% fee
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Token X</h4>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {pool.tokenX.mint.toString().slice(0, 8)}...{pool.tokenX.mint.toString().slice(-8)}
                      </code>
                      <span className="text-sm font-medium">
                        {pool.tokenX.reserve.toFixed(6)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Token Y</h4>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {pool.tokenY.mint.toString().slice(0, 8)}...{pool.tokenY.mint.toString().slice(-8)}
                      </code>
                      <span className="text-sm font-medium">
                        {pool.tokenY.reserve.toFixed(6)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">LP Supply:</span>
                    <div className="font-medium">{pool.lpSupply.toFixed(6)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">TVL:</span>
                    <div className="font-medium">{pool.totalValueLocked.toFixed(6)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Seed:</span>
                    <div className="font-medium">{pool.seed}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(getExplorerUrl(pool.poolAddress.toString()), '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Pool
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(getExplorerUrl(pool.configAddress.toString()), '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Config
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

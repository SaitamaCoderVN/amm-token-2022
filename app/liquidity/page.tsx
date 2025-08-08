"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, TrendingDown } from "lucide-react";

// Mockup data for liquidity pools
const mockLiquidityPools = [
  {
    id: 1,
    tokenPair: "SOL/USDC",
    token1: { symbol: "SOL", name: "Solana", icon: "🔸" },
    token2: { symbol: "USDC", name: "USD Coin", icon: "💰" },
    liquidity: "$2,450,000",
    volume24h: "$890,000",
    apy: "12.5%",
    change24h: "+5.2%",
    isPositive: true,
    tvl: "$1,200,000",
  },
  {
    id: 2,
    tokenPair: "RAY/USDC",
    token1: { symbol: "RAY", name: "Raydium", icon: "⚡" },
    token2: { symbol: "USDC", name: "USD Coin", icon: "💰" },
    liquidity: "$890,000",
    volume24h: "$320,000",
    apy: "8.7%",
    change24h: "-2.1%",
    isPositive: false,
    tvl: "$450,000",
  },
  {
    id: 3,
    tokenPair: "SRM/USDC",
    token1: { symbol: "SRM", name: "Serum", icon: "🩸" },
    token2: { symbol: "USDC", name: "USD Coin", icon: "💰" },
    liquidity: "$1,230,000",
    volume24h: "$540,000",
    apy: "15.2%",
    change24h: "+8.9%",
    isPositive: true,
    tvl: "$780,000",
  },
  {
    id: 4,
    tokenPair: "ORCA/USDC",
    token1: { symbol: "ORCA", name: "Orca", icon: "🐋" },
    token2: { symbol: "USDC", name: "USD Coin", icon: "💰" },
    liquidity: "$3,120,000",
    volume24h: "$1,200,000",
    apy: "18.9%",
    change24h: "+12.3%",
    isPositive: true,
    tvl: "$1,890,000",
  },
  {
    id: 5,
    tokenPair: "MNGO/USDC",
    token1: { symbol: "MNGO", name: "Mango", icon: "🥭" },
    token2: { symbol: "USDC", name: "USD Coin", icon: "💰" },
    liquidity: "$670,000",
    volume24h: "$180,000",
    apy: "6.4%",
    change24h: "-1.8%",
    isPositive: false,
    tvl: "$320,000",
  },
];

export default function LiquidityPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPools, setFilteredPools] = useState(mockLiquidityPools);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    const filtered = mockLiquidityPools.filter(
      (pool) =>
        pool.tokenPair.toLowerCase().includes(value.toLowerCase()) ||
        pool.token1.symbol.toLowerCase().includes(value.toLowerCase()) ||
        pool.token2.symbol.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredPools(filtered);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Liquidity Pools
          </h1>
          <p className="text-muted-foreground">
            Discover and manage your liquidity positions
          </p>
        </div>

        {/* Search Component */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search pools by token pair..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pools Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Available Pools</span>
              <Badge variant="secondary">
                {filteredPools.length} pools found
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Pool
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Liquidity
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      24h Volume
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      APY
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      24h Change
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      TVL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPools.map((pool) => (
                    <tr
                      key={pool.id}
                      className="border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{pool.token1.icon}</span>
                            <span className="text-lg">{pool.token2.icon}</span>
                          </div>
                          <div>
                            <div className="font-medium">{pool.tokenPair}</div>
                            <div className="text-sm text-muted-foreground">
                              {pool.token1.name}/{pool.token2.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium">{pool.liquidity}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium">{pool.volume24h}</div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {pool.apy}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-1">
                          {pool.isPositive ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          <span
                            className={`font-medium ${
                              pool.isPositive ? "text-green-500" : "text-red-500"
                            }`}
                          >
                            {pool.change24h}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium">{pool.tvl}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredPools.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No pools found matching &quot;{searchTerm}&quot;
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

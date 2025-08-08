"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Droplets, Wallet, Clock, CheckCircle, AlertCircle } from "lucide-react";

// Mockup data for available tokens in faucet
const mockFaucetTokens = [
  {
    id: 1,
    symbol: "SOL",
    name: "Solana",
    icon: "",
    description: "Native token of Solana blockchain",
    available: "10,000 SOL",
    maxPerRequest: "2 SOL",
    cooldown: "24 hours",
    network: "Devnet",
    status: "available",
    balance: "8,500 SOL",
  },
  {
    id: 2,
    symbol: "USDC",
    name: "USD Coin",
    icon: "",
    description: "USD-pegged stablecoin",
    available: "50,000 USDC",
    maxPerRequest: "100 USDC",
    cooldown: "12 hours",
    network: "Devnet",
    status: "available",
    balance: "42,300 USDC",
  },
  {
    id: 3,
    symbol: "RAY",
    name: "Raydium",
    icon: "⚡",
    description: "Raydium protocol token",
    available: "25,000 RAY",
    maxPerRequest: "50 RAY",
    cooldown: "6 hours",
    network: "Devnet",
    status: "available",
    balance: "18,750 RAY",
  },
  {
    id: 4,
    symbol: "SRM",
    name: "Serum",
    icon: "",
    description: "Serum DEX token",
    available: "15,000 SRM",
    maxPerRequest: "25 SRM",
    cooldown: "8 hours",
    network: "Devnet",
    status: "low",
    balance: "2,100 SRM",
  },
  {
    id: 5,
    symbol: "ORCA",
    name: "Orca",
    icon: "",
    description: "Orca protocol token",
    available: "8,000 ORCA",
    maxPerRequest: "20 ORCA",
    cooldown: "4 hours",
    network: "Devnet",
    status: "available",
    balance: "6,400 ORCA",
  },
];

export default function FaucetPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredTokens, setFilteredTokens] = useState(mockFaucetTokens);
  const [requestedAmount, setRequestedAmount] = useState<{ [key: number]: string }>({});
  const [isRequesting, setIsRequesting] = useState<{ [key: number]: boolean }>({});
  const [lastRequest, setLastRequest] = useState<{ [key: number]: Date | null }>({});

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    const filtered = mockFaucetTokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(value.toLowerCase()) ||
        token.name.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredTokens(filtered);
  };

  const handleFaucetRequest = async (tokenId: number) => {
    setIsRequesting(prev => ({ ...prev, [tokenId]: true }));
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update last request time
    setLastRequest(prev => ({ ...prev, [tokenId]: new Date() }));
    setIsRequesting(prev => ({ ...prev, [tokenId]: false }));
    
    // Clear the input
    setRequestedAmount(prev => ({ ...prev, [tokenId]: "" }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Available</Badge>;
      case "low":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Low Supply</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const canRequest = (tokenId: number) => {
    const lastReq = lastRequest[tokenId];
    if (!lastReq) return true;
    
    const token = mockFaucetTokens.find(t => t.id === tokenId);
    if (!token) return false;
    
    const hours = token.cooldown.includes("24") ? 24 : 
                  token.cooldown.includes("12") ? 12 :
                  token.cooldown.includes("8") ? 8 :
                  token.cooldown.includes("6") ? 6 : 4;
    
    const timeDiff = Date.now() - lastReq.getTime();
    const cooldownMs = hours * 60 * 60 * 1000;
    
    return timeDiff >= cooldownMs;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
            <Droplets className="mr-3 h-8 w-8 text-blue-500" />
            Token Faucet
          </h1>
          <p className="text-muted-foreground">
            Get test tokens for development on Solana Devnet
          </p>
        </div>

        {/* Network Info */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wallet className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-800">Connected to Solana Devnet</span>
              </div>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                Devnet
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Search Component */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search tokens..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tokens Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Available Tokens</span>
              <Badge variant="secondary">
                {filteredTokens.length} tokens available
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Token
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Available
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Max Per Request
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Cooldown
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTokens.map((token) => (
                    <tr
                      key={token.id}
                      className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{token.icon}</span>
                          <div>
                            <div className="font-medium">{token.symbol}</div>
                            <div className="text-sm text-muted-foreground">
                              {token.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {token.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium">{token.available}</div>
                        <div className="text-sm text-muted-foreground">
                          Balance: {token.balance}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium">{token.maxPerRequest}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{token.cooldown}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(token.status)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={requestedAmount[token.id] || ""}
                            onChange={(e) => setRequestedAmount(prev => ({
                              ...prev,
                              [token.id]: e.target.value
                            }))}
                            className="w-24"
                            disabled={!canRequest(token.id)}
                          />
                          <Button
                            onClick={() => handleFaucetRequest(token.id)}
                            disabled={
                              !canRequest(token.id) ||
                              isRequesting[token.id] ||
                              !requestedAmount[token.id] ||
                              parseFloat(requestedAmount[token.id] || "0") <= 0
                            }
                            className="min-w-[100px]"
                          >
                            {isRequesting[token.id] ? (
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Requesting...</span>
                              </div>
                            ) : !canRequest(token.id) ? (
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4" />
                                <span>Cooldown</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <Droplets className="h-4 w-4" />
                                <span>Faucet</span>
                              </div>
                            )}
                          </Button>
                        </div>
                        {lastRequest[token.id] && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Last request: {lastRequest[token.id]?.toLocaleTimeString()}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredTokens.length === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No tokens found matching &quot;{searchTerm}&quot;
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card className="mt-6 bg-muted/50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Free tokens for development</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>Cooldown periods apply</span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span>Devnet only - no real value</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

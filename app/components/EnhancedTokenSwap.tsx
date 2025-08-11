'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProvider } from '@/app/providers/anchor-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowDownUp, 
  RefreshCw, 
  Loader2, 
  Info,
  Settings,
  BarChart3,
  Wallet,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import * as anchor from '@coral-xyz/anchor';
import { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress
} from '@solana/spl-token';
import { 
  PoolInfo, 
  derivePoolAddresses, 
  deriveVaultAddresses
} from '@/lib/amm-helpers';
import { PriceChart } from '@/components/ui/price-chart';

export default function EnhancedTokenSwap() {
  const { connection } = useConnection();
  const { wallet, publicKey } = useWallet();
  const { program, isReady, error } = useAnchorProvider();
  
  // State for pool selection
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolInfo | null>(null);
  const [isLoadingPools, setIsLoadingPools] = useState(false);
  
  // State for swap
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapDirection, setSwapDirection] = useState<'xToY' | 'yToX'>('xToY');
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [minAmountOut, setMinAmountOut] = useState('');
  const [slippage, setSlippage] = useState('1'); // 1% default
  
  // State for user balances
  const [userBalances, setUserBalances] = useState({
    tokenX: 0,
    tokenY: 0
  });
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // State for swap settings
  const [showSettings, setShowSettings] = useState(false);

  // Fetch all available pools
  const fetchPools = useCallback(async () => {
    if (!program || !isReady) return;
    
    try {
      setIsLoadingPools(true);
      const allConfigs = await program.account.config.all();
      
      const poolInfos: PoolInfo[] = [];
      
      for (const config of allConfigs) {
        try {
          const configData = config.account;
          
          // Get pool state
          const [poolState] = await program.account.poolState.all([
            {
              memcmp: {
                offset: 0,
                bytes: config.publicKey.toBase58()
              }
            }
          ]);
          
          if (!poolState) continue;
          
          const poolData = poolState.account;
          
          // Derive addresses
          const { poolState: derivedPoolState, poolAuthority, lpMint } = derivePoolAddresses(
            program,
            config.publicKey
          );
          
          // Get vault addresses
          const { vaultX, vaultY } = await deriveVaultAddresses(
            poolAuthority,
            configData.mintX,
            configData.mintY,
            TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID
          );
          
          // Get token info
          const [tokenXInfo, tokenYInfo] = await Promise.all([
            connection.getParsedAccountInfo(configData.mintX),
            connection.getParsedAccountInfo(configData.mintY)
          ]);
          
          const tokenXDecimals = (tokenXInfo.value?.data as { parsed?: { info?: { decimals?: number } } })?.parsed?.info?.decimals || 0;
          const tokenYDecimals = (tokenYInfo.value?.data as { parsed?: { info?: { decimals?: number } } })?.parsed?.info?.decimals || 0;
          
          poolInfos.push({
            config: config.publicKey,
            poolState: derivedPoolState,
            poolAuthority,
            lpMint,
            vaultX,
            vaultY,
            tokenX: {
              mint: configData.mintX,
              decimals: tokenXDecimals,
              tokenProgram: TOKEN_PROGRAM_ID,
              hasTransferFee: false,
              symbol: `Token X (${configData.mintX.toString().slice(0, 8)}...)`
            },
            tokenY: {
              mint: configData.mintY,
              decimals: tokenYDecimals,
              tokenProgram: TOKEN_PROGRAM_ID,
              hasTransferFee: false,
              symbol: `Token Y (${configData.mintY.toString().slice(0, 8)}...)`
            },
            reserves: {
              x: poolData.reserveX.toNumber() / Math.pow(10, tokenXDecimals),
              y: poolData.reserveY.toNumber() / Math.pow(10, tokenYDecimals)
            },
            fee: configData.fee,
            seed: configData.seed.toNumber(),
            lpSupply: poolData.lpSupply.toNumber()
          });
          
        } catch (error) {
          console.error(`Error processing pool ${config.publicKey.toString()}:`, error);
          continue;
        }
      }
      
      setPools(poolInfos);
      
    } catch (error) {
      console.error('Error fetching pools:', error);
      toast.error('Failed to fetch pools');
    } finally {
      setIsLoadingPools(false);
    }
  }, [program, isReady, connection]);

  // Fetch user balances for selected pool
  const fetchUserBalances = useCallback(async () => {
    if (!connection || !publicKey || !selectedPool) return;
    
    try {
      setIsLoadingBalances(true);
      
      // Get user token accounts
      const [userTokenX, userTokenY] = await Promise.all([
        getAssociatedTokenAddress(
          selectedPool.tokenX.mint,
          publicKey,
          false,
          selectedPool.tokenX.tokenProgram
        ),
        getAssociatedTokenAddress(
          selectedPool.tokenY.mint,
          publicKey,
          false,
          selectedPool.tokenY.tokenProgram
        )
      ]);
      
      // Get balances
      const [tokenXBalance, tokenYBalance] = await Promise.all([
        connection.getTokenAccountBalance(userTokenX).catch(() => ({ value: { uiAmount: 0 } })),
        connection.getTokenAccountBalance(userTokenY).catch(() => ({ value: { uiAmount: 0 } }))
      ]);
      
      setUserBalances({
        tokenX: tokenXBalance.value.uiAmount || 0,
        tokenY: tokenYBalance.value.uiAmount || 0
      });
      
    } catch (error) {
      console.error('Error fetching user balances:', error);
      toast.error('Failed to fetch user balances');
    } finally {
      setIsLoadingBalances(false);
    }
  }, [connection, publicKey, selectedPool]);

  // Calculate swap output amount using constant product formula
  const calculateSwapOutput = (amountIn: number, reserveIn: number, reserveOut: number, fee: number) => {
    if (amountIn <= 0 || reserveIn <= 0 || reserveOut <= 0) return 0;
    
    const feeMultiplier = (10000 - fee) / 10000; // Convert basis points to decimal
    const amountInWithFee = amountIn * feeMultiplier;
    
    // Constant product formula: (x + dx) * (y - dy) = x * y
    // dy = (y * dx) / (x + dx)
    const amountOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);
    
    return amountOut;
  };

  // Calculate price impact
  const calculatePriceImpact = (amountIn: number, reserveIn: number) => {
    if (amountIn <= 0 || reserveIn <= 0) return 0;
    return (amountIn / (reserveIn + amountIn)) * 100;
  };

  // Calculate minimum amount out based on slippage
  const calculateMinAmountOut = (amountOut: number, slippagePercent: number) => {
    if (amountOut <= 0) return 0;
    const slippageMultiplier = (100 - slippagePercent) / 100;
    return amountOut * slippageMultiplier;
  };

  // Handle amount input change
  const handleAmountInChange = (value: string) => {
    setAmountIn(value);
    
    if (!selectedPool || !value) {
      setAmountOut('');
      setMinAmountOut('');
      return;
    }
    
    const amount = parseFloat(value);
    if (isNaN(amount) || amount <= 0) {
      setAmountOut('');
      setMinAmountOut('');
      return;
    }
    
    // Calculate output amount
    let outputAmount = 0;
    if (swapDirection === 'xToY') {
      outputAmount = calculateSwapOutput(
        amount,
        selectedPool.reserves.x,
        selectedPool.reserves.y,
        selectedPool.fee
      );
    } else {
      outputAmount = calculateSwapOutput(
        amount,
        selectedPool.reserves.y,
        selectedPool.reserves.x,
        selectedPool.fee
      );
    }
    
    setAmountOut(outputAmount.toFixed(6));
    
    // Calculate minimum amount out
    const slippageNum = parseFloat(slippage);
    const minAmount = calculateMinAmountOut(outputAmount, slippageNum);
    setMinAmountOut(minAmount.toFixed(6));
  };

  // Handle swap direction change
  const handleSwapDirectionChange = (direction: 'xToY' | 'yToX') => {
    setSwapDirection(direction);
    setAmountIn('');
    setAmountOut('');
    setMinAmountOut('');
  };

  // Execute swap
  const executeSwap = async () => {
    if (!program || !isReady || !publicKey || !selectedPool) {
      toast.error('Program not ready or pool not selected');
      return;
    }

    if (!amountIn || !amountOut || !minAmountOut) {
      toast.error('Please enter all amounts');
      return;
    }

    const amountInNum = parseFloat(amountIn);
    const minAmountOutNum = parseFloat(minAmountOut);
    
    if (isNaN(amountInNum) || isNaN(minAmountOutNum) || amountInNum <= 0 || minAmountOutNum <= 0) {
      toast.error('Invalid amounts');
      return;
    }

    // Check user balance
    const userBalance = swapDirection === 'xToY' ? userBalances.tokenX : userBalances.tokenY;
    if (amountInNum > userBalance) {
      toast.error('Insufficient balance');
      return;
    }

    setIsSwapping(true);
    try {
      // Convert to proper decimals
      const amountInBN = new anchor.BN(amountInNum * Math.pow(10, 
        swapDirection === 'xToY' ? selectedPool.tokenX.decimals : selectedPool.tokenY.decimals
      ));
      const minAmountOutBN = new anchor.BN(minAmountOutNum * Math.pow(10, 
        swapDirection === 'xToY' ? selectedPool.tokenY.decimals : selectedPool.tokenX.decimals
      ));
      
      // Determine swap direction and accounts
      const mintIn = swapDirection === 'xToY' ? selectedPool.tokenX.mint : selectedPool.tokenY.mint;
      const mintOut = swapDirection === 'xToY' ? selectedPool.tokenY.mint : selectedPool.tokenX.mint;
      const vaultIn = swapDirection === 'xToY' ? selectedPool.vaultX : selectedPool.vaultY;
      const vaultOut = swapDirection === 'xToY' ? selectedPool.vaultY : selectedPool.vaultX;
      const tokenProgramIn = swapDirection === 'xToY' ? selectedPool.tokenX.tokenProgram : selectedPool.tokenY.tokenProgram;
      const tokenProgramOut = swapDirection === 'xToY' ? selectedPool.tokenY.tokenProgram : selectedPool.tokenX.tokenProgram;
      
      // Get user token accounts
      const [userTokenIn, userTokenOut] = await Promise.all([
        getAssociatedTokenAddress(
          mintIn,
          publicKey,
          false,
          tokenProgramIn
        ),
        getAssociatedTokenAddress(
          mintOut,
          publicKey,
          false,
          tokenProgramOut
        )
      ]);

      console.log('Executing swap with accounts:', {
        user: publicKey.toString(),
        config: selectedPool.config.toString(),
        poolState: selectedPool.poolState.toString(),
        poolAuthority: selectedPool.poolAuthority.toString(),
        mintIn: mintIn.toString(),
        mintOut: mintOut.toString(),
        vaultIn: vaultIn.toString(),
        vaultOut: vaultOut.toString(),
        userTokenIn: userTokenIn.toString(),
        userTokenOut: userTokenOut.toString(),
        amountIn: amountInBN.toString(),
        minAmountOut: minAmountOutBN.toString(),
        direction: swapDirection
      });

      // Execute swap
      const tx = await program.methods
        .swap(amountInBN, minAmountOutBN)
        .accountsPartial({
          user: publicKey,
          config: selectedPool.config,
          poolState: selectedPool.poolState,
          poolAuthority: selectedPool.poolAuthority,
          mintIn,
          mintOut,
          vaultIn,
          vaultOut,
          userTokenIn,
          userTokenOut,
          tokenProgramX: tokenProgramIn,
          tokenProgramY: tokenProgramOut,
          associatedTokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      toast.success(`Swap executed successfully! TX: ${tx}`);

      // Reset form
      setAmountIn('');
      setAmountOut('');
      setMinAmountOut('');

      // Refresh data
      await Promise.all([fetchPools(), fetchUserBalances()]);

    } catch (error) {
      console.error('Error executing swap:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to execute swap');
    } finally {
      setIsSwapping(false);
    }
  };

  // Effects
  useEffect(() => {
    if (isReady) {
      fetchPools();
    }
  }, [isReady, fetchPools]);

  useEffect(() => {
    if (selectedPool && publicKey) {
      fetchUserBalances();
    }
  }, [selectedPool, publicKey, fetchUserBalances]);

  // Auto-refresh pools and balances every 30 seconds
  useEffect(() => {
    if (!isReady) return;
    
    const interval = setInterval(() => {
      fetchPools();
      if (selectedPool && publicKey) {
        fetchUserBalances();
      }
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [isReady, selectedPool, publicKey, fetchPools, fetchUserBalances]);

  if (!wallet || !publicKey) {
    return (
      <Card className="p-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="h-5 w-5 mr-2" />
            Connect Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Please connect your wallet to start swapping tokens.
          </p>
          <Button onClick={() => window.open('/create', '_blank')} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create Token
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isReady) {
    return (
      <Card className="p-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Initializing...
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="space-y-4">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <h3 className="font-semibold text-destructive mb-2">Program Connection Error</h3>
                <p className="text-sm text-destructive/80 mb-3">{error}</p>
                
                {error.includes('not found on current network') && (
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">To fix this issue:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-4">
                      <li><strong>Switch to Mainnet:</strong> Change <code className="bg-muted px-1 rounded">NEXT_PUBLIC_USE_MAINNET=true</code> in your .env file</li>
                      <li><strong>Deploy to Devnet:</strong> If you have the program source code, deploy it to devnet</li>
                      <li><strong>Use Localnet:</strong> Run a local validator for development</li>
                    </ol>
                  </div>
                )}
              </div>
              
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Setting up connection to Solana network...
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Token Swap</h1>
        <p className="text-muted-foreground">
          Swap tokens using AMM pools with minimal slippage
        </p>
      </div>

      {/* Price Chart Section */}
      {selectedPool && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Price Chart - {selectedPool.tokenX.symbol} / {selectedPool.tokenY.symbol}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PriceChart 
              symbol={selectedPool.tokenX.symbol || `Token X (${selectedPool.tokenX.mint.toString().slice(0, 8)}...)`}
              baseSymbol={selectedPool.tokenY.symbol || `Token Y (${selectedPool.tokenY.mint.toString().slice(0, 8)}...)`}
              className="w-full h-64"
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pool Selection */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <RefreshCw className="h-5 w-5 mr-2" />
                Select Pool
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pool</Label>
                <Select
                  value={selectedPool?.config.toString() || ''}
                  onValueChange={(value) => {
                    const pool = pools.find(p => p.config.toString() === value);
                    setSelectedPool(pool || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a pool" />
                  </SelectTrigger>
                  <SelectContent>
                    {pools.map((pool) => (
                      <SelectItem key={pool.config.toString()} value={pool.config.toString()}>
                        Pool #{pool.seed} - {pool.tokenX.symbol} / {pool.tokenY.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={fetchPools} 
                variant="outline" 
                className="w-full"
                disabled={isLoadingPools}
              >
                {isLoadingPools ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Pools
                  </>
                )}
              </Button>

              {selectedPool && (
                <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Pool #{selectedPool.seed}</span>
                    <Badge variant="secondary">
                      {(selectedPool.fee / 100).toFixed(2)}% Fee
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Reserve X</p>
                      <p className="font-medium">{selectedPool.reserves.x.toFixed(6)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reserve Y</p>
                      <p className="font-medium">{selectedPool.reserves.y.toFixed(6)}</p>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    LP Supply: {selectedPool.lpSupply.toLocaleString()}
                  </div>
                  
                  {/* Pool Statistics */}
                  <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                    <div>
                      <p className="text-muted-foreground">Total Value Locked</p>
                      <p className="font-medium">
                        ${((selectedPool.reserves.x + selectedPool.reserves.y) * 100).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pool Utilization</p>
                      <p className="font-medium">
                        {((selectedPool.reserves.x + selectedPool.reserves.y) / 1000 * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Balances */}
          {selectedPool && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Info className="h-5 w-5 mr-2" />
                  Your Balances
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoadingBalances ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Token X</span>
                      <span className="text-sm font-medium">{userBalances.tokenX.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Token Y</span>
                      <span className="text-sm font-medium">{userBalances.tokenY.toFixed(6)}</span>
                    </div>
                  </>
                )}
                
                <Button onClick={fetchUserBalances} variant="outline" size="sm" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Swap Interface */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <ArrowDownUp className="h-5 w-5 mr-2" />
                  Swap Tokens
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!selectedPool ? (
                <div className="text-center py-8 text-muted-foreground">
                  Please select a pool first
                </div>
              ) : (
                <>
                  {/* Swap Direction */}
                  <div className="space-y-2">
                    <Label>Swap Direction</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={swapDirection === 'xToY' ? 'default' : 'outline'}
                        onClick={() => handleSwapDirectionChange('xToY')}
                        className="w-full"
                      >
                        {selectedPool.tokenX.symbol} → {selectedPool.tokenY.symbol}
                      </Button>
                      <Button
                        variant={swapDirection === 'yToX' ? 'default' : 'outline'}
                        onClick={() => handleSwapDirectionChange('yToX')}
                        className="w-full"
                      >
                        {selectedPool.tokenY.symbol} → {selectedPool.tokenX.symbol}
                      </Button>
                    </div>
                  </div>

                  {/* Swap Settings */}
                  {showSettings && (
                    <div className="space-y-2 p-3 border rounded-lg bg-muted/50">
                      <Label htmlFor="slippage">Slippage Tolerance (%)</Label>
                      <Input
                        id="slippage"
                        type="number"
                        placeholder="1"
                        value={slippage}
                        onChange={(e) => {
                          setSlippage(e.target.value);
                          if (amountOut) {
                            const outputAmount = parseFloat(amountOut);
                            const slippageNum = parseFloat(e.target.value);
                            const minAmount = calculateMinAmountOut(outputAmount, slippageNum);
                            setMinAmountOut(minAmount.toFixed(6));
                          }
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum acceptable slippage percentage
                      </p>
                    </div>
                  )}

                  {/* Amount Input */}
                  <div className="space-y-2">
                    <Label>
                      Amount In ({swapDirection === 'xToY' ? selectedPool.tokenX.symbol : selectedPool.tokenY.symbol})
                    </Label>
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={amountIn}
                      onChange={(e) => handleAmountInChange(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Balance: {(swapDirection === 'xToY' ? userBalances.tokenX : userBalances.tokenY).toFixed(6)}
                    </p>
                  </div>

                  {/* Amount Output */}
                  <div className="space-y-2">
                    <Label>
                      Amount Out ({swapDirection === 'xToY' ? selectedPool.tokenY.symbol : selectedPool.tokenX.symbol})
                    </Label>
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={amountOut}
                      readOnly
                      className="bg-muted"
                    />
                  </div>

                  {/* Minimum Amount Out */}
                  <div className="space-y-2">
                    <Label>Minimum Amount Out</Label>
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={minAmountOut}
                      onChange={(e) => setMinAmountOut(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Based on {slippage}% slippage tolerance
                    </p>
                  </div>

                  {/* Swap Details */}
                  {amountIn && amountOut && (
                    <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Price Impact</p>
                          <p className="font-medium">
                            {calculatePriceImpact(
                              parseFloat(amountIn),
                              swapDirection === 'xToY' ? selectedPool.reserves.x : selectedPool.reserves.y
                            ).toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Pool Fee</p>
                          <p className="font-medium">
                            {(selectedPool.fee / 100).toFixed(2)}%
                          </p>
                        </div>
                      </div>
                      
                                        <div className="text-xs text-muted-foreground">
                    <p>Rate: 1 {swapDirection === 'xToY' ? selectedPool.tokenX.symbol || 'Token X' : selectedPool.tokenY.symbol || 'Token Y'} = 
                    {(parseFloat(amountOut) / parseFloat(amountIn)).toFixed(6)} {swapDirection === 'xToY' ? selectedPool.tokenY.symbol || 'Token Y' : selectedPool.tokenX.symbol || 'Token X'}</p>
                  </div>
                  
                  {/* Real-time Price Information */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-muted-foreground">Current Price</p>
                      <p className="font-medium">
                        1 {selectedPool.tokenX.symbol || 'Token X'} = 
                        {(selectedPool.reserves.y / selectedPool.reserves.x).toFixed(6)} {selectedPool.tokenY.symbol || 'Token Y'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reverse Price</p>
                      <p className="font-medium">
                        1 {selectedPool.tokenY.symbol || 'Token Y'} = 
                        {(selectedPool.reserves.x / selectedPool.reserves.y).toFixed(6)} {selectedPool.tokenX.symbol || 'Token X'}
                      </p>
                    </div>
                  </div>
                    </div>
                  )}

                  {/* Execute Swap Button */}
                  <Button 
                    onClick={executeSwap}
                    disabled={isSwapping || !amountIn || !amountOut || !minAmountOut}
                    className="w-full"
                    size="lg"
                  >
                    {isSwapping ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Executing Swap...
                      </>
                    ) : (
                      <>
                        <ArrowDownUp className="mr-2 h-5 w-5" />
                        Execute Swap
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

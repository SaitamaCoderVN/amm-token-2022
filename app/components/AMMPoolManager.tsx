'use client';

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProvider } from '@/app/providers/anchor-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  RefreshCw, 
  Loader2, 
} from 'lucide-react';
import { toast } from 'sonner';
import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import { 
  PoolInfo, 
  TokenInfo, 
  derivePoolAddresses, 
  deriveVaultAddresses,
  validatePoolConfig 
} from '@/lib/amm-helpers';

export default function AMMPoolManager() {
  const { connection } = useConnection();
  const { wallet, publicKey } = useWallet();
  const { program, isReady } = useAnchorProvider();
  
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [isLoadingPools, setIsLoadingPools] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const [newPoolSeed, setNewPoolSeed] = useState('');
  const [newPoolFee, setNewPoolFee] = useState('300'); // 3% default
  const [selectedTokenX, setSelectedTokenX] = useState<PublicKey | null>(null);
  const [selectedTokenY, setSelectedTokenY] = useState<PublicKey | null>(null);
  const [availableTokens, setAvailableTokens] = useState<TokenInfo[]>([]);
  
  // State for token creation
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const [newTokenDecimals, setNewTokenDecimals] = useState('6');
  const [newTokenType, setNewTokenType] = useState<'legacy' | 'token2022'>('legacy');
  const [newTokenTransferFee, setNewTokenTransferFee] = useState('100'); // 1% default
  const [newTokenMaxFee, setNewTokenMaxFee] = useState('1000'); // 1000 tokens default

  // Fetch all available pools
  const fetchPools = async () => {
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
            TOKEN_PROGRAM_ID, // Default to legacy for now
            TOKEN_PROGRAM_ID
          );
          
          // Get token info
          const [tokenXInfo, tokenYInfo] = await Promise.all([
            connection.getParsedAccountInfo(configData.mintX),
            connection.getParsedAccountInfo(configData.mintY)
          ]);
          
          const tokenXDecimals = (tokenXInfo.value?.data as { parsed?: { info?: { decimals?: number } } })?.parsed?.info?.decimals || 9;
          const tokenYDecimals = (tokenYInfo.value?.data as { parsed?: { info?: { decimals?: number } } })?.parsed?.info?.decimals || 9;
          
          const tokenXProgram = TOKEN_PROGRAM_ID;
          const tokenYProgram = TOKEN_PROGRAM_ID;
          
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
              tokenProgram: tokenXProgram,
              hasTransferFee: false,
              symbol: `Token X (${configData.mintX.toString().slice(0, 8)}...)`
            },
            tokenY: {
              mint: configData.mintY,
              decimals: tokenYDecimals,
              tokenProgram: tokenYProgram,
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
  };

  const fetchAvailableTokens = async () => {
    if (!connection || !publicKey) return;
    
    try {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID
      });
      
      const tokens: TokenInfo[] = [];
      
      for (const { account } of tokenAccounts.value) {
        const accountInfo = account.data.parsed.info;
        tokens.push({
          mint: new PublicKey(accountInfo.mint),
          decimals: accountInfo.tokenAmount.decimals,
          tokenProgram: TOKEN_PROGRAM_ID,
          hasTransferFee: false,
          symbol: `Token (${accountInfo.mint.slice(0, 8)}...)`
        });
      }
      
      const token2022Accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: TOKEN_2022_PROGRAM_ID
      });
      
      for (const { account } of token2022Accounts.value) {
        const accountInfo = account.data.parsed.info;
        tokens.push({
          mint: new PublicKey(accountInfo.mint),
          decimals: accountInfo.tokenAmount.decimals,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          hasTransferFee: false,
          symbol: `Token-2022 (${accountInfo.mint.slice(0, 8)}...)`
        });
      }
      
      setAvailableTokens(tokens);
      
    } catch (error) {
      console.error('Error fetching available tokens:', error);
    }
  };

  // Initialize new pool
  const initializePool = async () => {
    if (!program || !isReady || !publicKey) {
      toast.error('Program not ready or wallet not connected');
      return;
    }

    if (!selectedTokenX || !selectedTokenY) {
      toast.error('Please select both tokens');
      return;
    }

    if (!newPoolSeed || !newPoolFee) {
      toast.error('Please fill in all fields');
      return;
    }

    const seed = parseInt(newPoolSeed);
    const fee = parseInt(newPoolFee);
    
    if (isNaN(seed) || isNaN(fee)) {
      toast.error('Invalid seed or fee values');
      return;
    }

    // Validate pool configuration
    const tokenX = availableTokens.find(t => t.mint.equals(selectedTokenX))!;
    const tokenY = availableTokens.find(t => t.mint.equals(selectedTokenY))!;
    
    const validation = validatePoolConfig(tokenX, tokenY, fee);
    if (!validation.isValid) {
      toast.error(`Pool configuration invalid: ${validation.errors.join(', ')}`);
      return;
    }

    setIsInitializing(true);
    try {
      // Derive addresses
      const [config] = PublicKey.findProgramAddressSync(
        [Buffer.from('config'), new anchor.BN(seed).toArrayLike(Buffer, 'le', 8)],
        program.programId
      );

      const { poolState, poolAuthority, lpMint } = derivePoolAddresses(program, config);
      
      const { vaultX, vaultY } = await deriveVaultAddresses(
        poolAuthority,
        selectedTokenX,
        selectedTokenY,
        tokenX.tokenProgram,
        tokenY.tokenProgram
      );

      console.log('Initializing pool with addresses:', {
        config: config.toString(),
        poolState: poolState.toString(),
        poolAuthority: poolAuthority.toString(),
        lpMint: lpMint.toString(),
        vaultX: vaultX.toString(),
        vaultY: vaultY.toString()
      });

      // Initialize pool
      const tx = await program.methods
        .initializePool(new anchor.BN(seed), fee, null)
        .accountsPartial({
          authority: publicKey,
          config,
          poolState,
          mintX: selectedTokenX,
          mintY: selectedTokenY,
          lpMint,
          poolAuthority,
          vaultX,
          vaultY,
          tokenProgramX: tokenX.tokenProgram,
          tokenProgramY: tokenY.tokenProgram,
          tokenProgramLp: TOKEN_PROGRAM_ID, // Use legacy token for LP tokens
          associatedTokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      toast.success(`Pool initialized successfully! TX: ${tx}`);

      // Reset form
      setNewPoolSeed('');
      setNewPoolFee('300');
      setSelectedTokenX(null);
      setSelectedTokenY(null);

      // Refresh pools
      await fetchPools();

    } catch (error) {
      console.error('Error initializing pool:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initialize pool');
    } finally {
      setIsInitializing(false);
    }
  };

  // Create test token (simplified - in practice you'd need the actual token creation logic)
  const createTestToken = async () => {
    if (!connection || !publicKey) {
      toast.error('Wallet not connected');
      return;
    }

    setIsCreatingToken(true);
    try {
      // This is a placeholder - in practice you'd need to implement actual token creation
      // For now, we'll just show a message
      toast.info('Token creation functionality requires additional implementation. Please create tokens manually or use existing ones.');
      
    } catch (error) {
      console.error('Error creating token:', error);
      toast.error('Failed to create token');
    } finally {
      setIsCreatingToken(false);
    }
  };

  // Effects
  useEffect(() => {
    if (isReady) {
      fetchPools();
    }
  }, [isReady, fetchPools]);

  useEffect(() => {
    if (publicKey) {
      fetchAvailableTokens();
    }
  }, [publicKey, fetchAvailableTokens]);

  if (!wallet || !publicKey) {
    return (
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold mb-4">Connect Wallet</h1>
        <p className="text-muted-foreground">
          Please connect your wallet to manage AMM pools
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AMM Pool Manager</h1>
        <p className="text-muted-foreground">
          Create and manage AMM pools with support for Legacy SPL and Token-2022
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pool Creation */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                Create New Pool
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pool-seed">Pool Seed</Label>
                <Input
                  id="pool-seed"
                  type="number"
                  placeholder="Enter unique seed number"
                  value={newPoolSeed}
                  onChange={(e) => setNewPoolSeed(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pool-fee">Fee Rate (basis points)</Label>
                <Input
                  id="pool-fee"
                  type="number"
                  placeholder="300 (3%)"
                  value={newPoolFee}
                  onChange={(e) => setNewPoolFee(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Fee in basis points (100 = 1%, 300 = 3%)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Token X</Label>
                <Select
                  value={selectedTokenX?.toString() || ''}
                  onValueChange={(value) => setSelectedTokenX(new PublicKey(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Token X" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTokens.map((token) => (
                      <SelectItem key={token.mint.toString()} value={token.mint.toString()}>
                        {token.symbol} ({token.mint.toString().slice(0, 8)}...)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Token Y</Label>
                <Select
                  value={selectedTokenY?.toString() || ''}
                  onValueChange={(value) => setSelectedTokenY(new PublicKey(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Token Y" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTokens.map((token) => (
                      <SelectItem key={token.mint.toString()} value={token.mint.toString()}>
                        {token.symbol} ({token.mint.toString().slice(0, 8)}...)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={initializePool}
                disabled={isInitializing || !selectedTokenX || !selectedTokenY || !newPoolSeed || !newPoolFee}
                className="w-full"
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing Pool...
                  </>
                ) : (
                  'Initialize Pool'
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                Create Test Token
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Token Type</Label>
                <Select value={newTokenType} onValueChange={(value) => setNewTokenType(value as 'legacy' | 'token2022')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="legacy">Legacy SPL Token</SelectItem>
                    <SelectItem value="token2022">Token-2022</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="token-decimals">Decimals</Label>
                <Input
                  id="token-decimals"
                  type="number"
                  placeholder="6"
                  value={newTokenDecimals}
                  onChange={(e) => setNewTokenDecimals(e.target.value)}
                />
              </div>

              {newTokenType === 'token2022' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="transfer-fee">Transfer Fee (basis points)</Label>
                    <Input
                      id="transfer-fee"
                      type="number"
                      placeholder="100 (1%)"
                      value={newTokenTransferFee}
                      onChange={(e) => setNewTokenTransferFee(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-fee">Max Transfer Fee</Label>
                    <Input
                      id="max-fee"
                      type="number"
                      placeholder="1000"
                      value={newTokenMaxFee}
                      onChange={(e) => setNewTokenMaxFee(e.target.value)}
                    />
                  </div>
                </>
              )}

              <Button 
                onClick={createTestToken}
                disabled={isCreatingToken}
                className="w-full"
              >
                {isCreatingToken ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Token...
                  </>
                ) : (
                  'Create Test Token'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Pool List */}
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Existing Pools</CardTitle>
              <Button onClick={fetchPools} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingPools ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading pools...
                </div>
              ) : pools.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pools available
                </div>
              ) : (
                <div className="space-y-4">
                  {pools.map((pool) => (
                    <div key={pool.config.toString()} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Pool #{pool.seed}</h3>
                        <Badge variant="secondary">
                          {(pool.fee / 100).toFixed(2)}% Fee
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Token X</p>
                          <p className="font-medium">{pool.tokenX.symbol}</p>
                          <p className="text-xs text-muted-foreground">
                            Reserve: {pool.reserves.x.toFixed(6)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Token Y</p>
                          <p className="font-medium">{pool.tokenY.symbol}</p>
                          <p className="text-xs text-muted-foreground">
                            Reserve: {pool.reserves.y.toFixed(6)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        LP Supply: {pool.lpSupply.toLocaleString()}
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          View Details
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          Add Liquidity
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

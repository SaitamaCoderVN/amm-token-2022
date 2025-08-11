"use client";

import { useState } from "react";
import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useAnchorProvider } from "@/app/providers/anchor-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, AlertCircle } from "lucide-react";
    
interface AddLiquidityPoolProps {
  onPoolCreated?: () => void;
}

export default function AddLiquidityPool({ onPoolCreated }: AddLiquidityPoolProps) {
  const { connection } = useConnection();
  const { wallet, publicKey } = useWallet();
  const { program, isReady } = useAnchorProvider();
  
  const [tokenXMint, setTokenXMint] = useState("");
  const [tokenYMint, setTokenYMint] = useState("");
  const [fee, setFee] = useState("300");
  const [initialLiquidityX, setInitialLiquidityX] = useState("");
  const [initialLiquidityY, setInitialLiquidityY] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreatePool = async () => {
    if (!tokenXMint || !tokenYMint) {
      setError("Please provide both token mint addresses");
      return;
    }

    if (!initialLiquidityX || !initialLiquidityY) {
      setError("Please provide initial liquidity amounts");
      return;
    }

    if (!program || !isReady) {
      setError("Program not ready. Please try again.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      let tokenXPubkey: PublicKey;
      let tokenYPubkey: PublicKey;
      
      try {
        tokenXPubkey = new PublicKey(tokenXMint);
        tokenYPubkey = new PublicKey(tokenYMint);
      } catch {
        setError("Invalid token mint address format");
        return;
      }

      const [tokenXInfo, tokenYInfo] = await Promise.all([
        connection.getAccountInfo(tokenXPubkey),
        connection.getAccountInfo(tokenYPubkey)
      ]);

      if (!tokenXInfo || !tokenYInfo) {
        setError("One or both tokens do not exist on this network");
        return;
      }

      const tokenProgramXId = new PublicKey(tokenXInfo.owner);
      const tokenProgramYId = new PublicKey(tokenYInfo.owner);

      // Generate unique seed using timestamp and user's public key
      const timestamp = Date.now();
      const userKeyBuffer = publicKey!.toBuffer();
      const randomNonce = Math.floor(Math.random() * 1000000);
      const seed = new anchor.BN(timestamp).mul(new anchor.BN(1000000)).add(
        new anchor.BN(userKeyBuffer.subarray(0, 8).readBigUInt64LE())
      ).add(new anchor.BN(randomNonce));
      
      const [config] = PublicKey.findProgramAddressSync(
        [Buffer.from('config'), seed.toArrayLike(Buffer, 'le', 8)],
        program.programId
      );

      const [poolState] = PublicKey.findProgramAddressSync(
        [Buffer.from('pool'), config.toBuffer()],
        program.programId
      );

      const [poolAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from('auth'), config.toBuffer()],
        program.programId
      );

      const [lpMint] = PublicKey.findProgramAddressSync(
        [Buffer.from('lp_mint'), config.toBuffer()],
        program.programId
      );

      const vaultX = await getAssociatedTokenAddress(
        tokenXPubkey, 
        poolAuthority, 
        true,
        tokenProgramXId
      );
      const vaultY = await getAssociatedTokenAddress(
        tokenYPubkey, 
        poolAuthority, 
        true,
        tokenProgramYId
      );

      // Get user's token accounts
      const userTokenX = await getAssociatedTokenAddress(
        tokenXPubkey,
        publicKey!,
        false,
        tokenProgramXId
      );
      const userTokenY = await getAssociatedTokenAddress(
        tokenYPubkey,
        publicKey!,
        false,
        tokenProgramYId
      );
      const userLpToken = await getAssociatedTokenAddress(
        lpMint,
        publicKey!,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      let tx;
      try {
        // Step 1: Initialize the pool
        tx = await program.methods
          .initializePool(seed, parseInt(fee), null)
          .accountsPartial({
            authority: publicKey!,
            config,
            poolState,
            mintX: tokenXPubkey,
            mintY: tokenYPubkey,
            lpMint,
            poolAuthority,
            vaultX,
            vaultY,
            tokenProgramX: tokenProgramXId,
            tokenProgramY: tokenProgramYId,
            tokenProgramLp: TOKEN_2022_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ commitment: 'confirmed' });

        console.log(`Pool initialized: ${tx}`);

        // Step 2: Deposit initial liquidity
        const amountX = new anchor.BN(parseFloat(initialLiquidityX.replace(/,/g, '')) * 1e9);
        const amountY = new anchor.BN(parseFloat(initialLiquidityY.replace(/,/g, '')) * 1e9);
        const minLpOut = new anchor.BN(1);

        const depositTx = await program.methods
          .deposit(amountX, amountY, minLpOut)
          .accountsPartial({
            user: publicKey!,
            config,
            poolState,
            poolAuthority,
            mintX: tokenXPubkey,
            mintY: tokenYPubkey,
            vaultX,
            vaultY,
            userTokenX,
            userTokenY,
            lpMint,
            userLpToken,
            tokenProgramX: tokenProgramXId,
            tokenProgramY: tokenProgramYId,
            tokenProgramLp: TOKEN_2022_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ commitment: 'confirmed' });

        console.log(`Initial liquidity deposited: ${depositTx}`);
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('already been processed')) {
          const newSeed = seed.add(new anchor.BN(1));
          
          // Retry with new seed
          tx = await program.methods
            .initializePool(newSeed, parseInt(fee), null)
            .accountsPartial({
              authority: publicKey!,
              config,
              poolState,
              mintX: tokenXPubkey,
              mintY: tokenYPubkey,
              lpMint,
              poolAuthority,
              vaultX,
              vaultY,
              tokenProgramX: tokenProgramXId,
              tokenProgramY: tokenProgramYId,
              tokenProgramLp: TOKEN_2022_PROGRAM_ID,
              associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
            })
            .rpc({ commitment: 'confirmed' });

          console.log(`Pool initialized with new seed: ${tx}`);

          // Deposit initial liquidity with new seed
          const amountX = new anchor.BN(parseFloat(initialLiquidityX.replace(/,/g, '')) * 1e9);
          const amountY = new anchor.BN(parseFloat(initialLiquidityY.replace(/,/g, '')) * 1e9);
          const minLpOut = new anchor.BN(1);

          const depositTx = await program.methods
            .deposit(amountX, amountY, minLpOut)
            .accountsPartial({
              user: publicKey!,
              config,
              poolState,
              mintX: tokenXPubkey,
              mintY: tokenYPubkey,
              vaultX,
              vaultY,
              userTokenX,
              userTokenY,
              lpMint,
              userLpToken,
              tokenProgramX: tokenProgramXId,
              tokenProgramY: tokenProgramYId,
              tokenProgramLp: TOKEN_2022_PROGRAM_ID,
              associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
            })
            .rpc({ commitment: 'confirmed' });

          console.log(`Initial liquidity deposited: ${depositTx}`);
        } else {
          throw error;
        }
      }

      // Reset form
      setTokenXMint("");
      setTokenYMint("");
      setFee("300");
      setInitialLiquidityX("");
      setInitialLiquidityY("");
      
      if (onPoolCreated) {
        onPoolCreated();
      }

    } catch (error) {
      console.error("Error creating pool:", error);
      setError(error instanceof Error ? error.message : "Failed to create pool");
    } finally {
      setIsLoading(false);
    }
  };

  if (!wallet || !publicKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Liquidity Pool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Please connect your wallet to create liquidity pools
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Liquidity Pool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="tokenX">Token X Mint Address</Label>
          <Input
            id="tokenX"
            placeholder="Enter Token X mint address..."
            value={tokenXMint}
            onChange={(e) => setTokenXMint(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tokenY">Token Y Mint Address</Label>
          <Input
            id="tokenY"
            placeholder="Enter Token Y mint address..."
            value={tokenYMint}
            onChange={(e) => setTokenYMint(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fee">Fee Rate (basis points)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="fee"
              type="number"
              placeholder="300"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              min="0"
              max="10000"
            />
            <Badge variant="outline">
              {(parseInt(fee || "0") / 100).toFixed(2)}%
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Fee rate in basis points (100 = 1%, 300 = 3%)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="initialLiquidityX">Initial Liquidity Token X</Label>
          <Input
            id="initialLiquidityX"
            type="text"
            placeholder="Enter amount of Token X (e.g., 1,000,000,000)"
            value={initialLiquidityX}
            onChange={(e) => setInitialLiquidityX(e.target.value)}
            min="0"
            step="0.000000001"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Enter amount in token units (e.g., 1,000,000,000 = 1 billion tokens)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="initialLiquidityY">Initial Liquidity Token Y</Label>
          <Input
            id="initialLiquidityY"
            type="text"
            placeholder="Enter amount of Token Y (e.g., 1,000,000,000)"
            value={initialLiquidityY}
            onChange={(e) => setInitialLiquidityY(e.target.value)}
            min="0"
            step="0.000000001"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Enter amount in token units (e.g., 1,000,000,000 = 1 billion tokens)
          </p>
        </div>

        <Button 
          onClick={handleCreatePool} 
          disabled={isLoading || !tokenXMint || !tokenYMint || !initialLiquidityX || !initialLiquidityY}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Pool & Adding Liquidity...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Create Pool & Add Initial Liquidity
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground text-center">
          This will create a new liquidity pool and add initial liquidity with the specified tokens and amounts.
          You&apos;ll need SOL for transaction fees and sufficient token balances.
        </div>
      </CardContent>
    </Card>
  );
}
"use client"

import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Connection, Transaction, VersionedTransaction, TransactionInstruction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useLazorKitWalletContext } from "./lazorkit-wallet-context";
import { ModalContext } from "./wallet-provider";
import { Token2022Amm } from "@/components/types/token2022_amm";
import IDL from "@/components/idl/token2022_amm.json";

// Hook to use ModalContext
const useModalContext = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModalContext must be used within ModalContext.Provider");
  }
  return context;
};

interface AnchorProviderContextState {
  program: Program<Token2022Amm> | null;
  isReady: boolean;
  error: string | null;
}

const AnchorProviderContext = createContext<AnchorProviderContextState>({
  program: null,
  isReady: false,
  error: null,
});

export const useAnchorProvider = () => {
  const context = useContext(AnchorProviderContext);
  if (!context) {
    throw new Error("useAnchorProvider must be used within AnchorProviderProvider");
  }
  return context;
};

interface AnchorProviderProviderProps {
  children: React.ReactNode;
}

// Extended AnchorProvider that handles LazorKit transactions
class LazorKitAnchorProvider extends AnchorProvider {
  private lazorKitSignAndSend: (instruction: TransactionInstruction) => Promise<string>;
  private isLazorKit: boolean;

  //@typescript-eslint/no-explicit-any
  constructor(
    connection: Connection, 
    wallet: any, 
    opts: any,
    lazorKitSignAndSend?: (instruction: TransactionInstruction) => Promise<string>,
    isLazorKit: boolean = false
  ) {
    super(connection, wallet, opts);
    this.lazorKitSignAndSend = lazorKitSignAndSend || (() => Promise.reject("LazorKit not available"));
    this.isLazorKit = isLazorKit;
  }

  async sendAndConfirm(
    tx: Transaction | VersionedTransaction,
    //@typescript-eslint/no-explicit-any
    signers?: any[],
    opts?: any
  ): Promise<string> {
    console.log('LazorKitAnchorProvider.sendAndConfirm called with:', { 
      isLazorKit: this.isLazorKit, 
      txType: tx.constructor.name,
      hasInstructions: tx instanceof Transaction ? tx.instructions.length : 'N/A'
    });
    
    if (this.isLazorKit) {
      console.log('LazorKit: Using custom sendAndConfirm flow');
      // For LazorKit, we need to extract the instruction and use signAndSendTransaction
      // This is a simplified approach - in practice, you might need to handle this differently
      if (tx instanceof Transaction && tx.instructions.length > 0) {
        const instruction = tx.instructions[0];
        console.log('LazorKit: Extracting instruction:', instruction);
        return await this.lazorKitSignAndSend(instruction);
      } else {
        throw new Error("LazorKit: Cannot handle VersionedTransaction or empty transaction");
      }
    } else {
      console.log('LazorKit: Using default Anchor behavior');
      // Use default Anchor behavior for standard wallets
      return await super.sendAndConfirm(tx, signers, opts);
    }
  }
}

export function AnchorProviderProvider({ children }: AnchorProviderProviderProps) {
  const { connection } = useConnection();
  const { wallet } = useWallet();
  const { account: lazorKitAccount, signAndSendTransaction } = useLazorKitWalletContext();
  const { walletType } = useModalContext();
  
  const [program, setProgram] = useState<Program<Token2022Amm> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create the program instance
  useEffect(() => {
    if (!connection) return;

    try {
      setError(null);

      // Debug logging
      console.log('AnchorProvider: walletType from context:', walletType);
      console.log('AnchorProvider: LazorKit account:', lazorKitAccount);
      console.log('AnchorProvider: Standard wallet:', wallet);
      console.log('AnchorProvider: Connection endpoint:', connection.rpcEndpoint);
      console.log('AnchorProvider: Program ID from IDL:', IDL.address);

      // Check if the program exists on the current network
      const checkProgramExists = async () => {
        try {
          const { PublicKey } = await import('@solana/web3.js');
          const programInfo = await connection.getAccountInfo(new PublicKey(IDL.address));
          if (!programInfo) {
            throw new Error(`Program ${IDL.address} not found on ${connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet'}. Please deploy the program or switch networks.`);
          }
          return true;
        } catch (err) {
          console.warn('Program check failed:', err);
          return false;
        }
      };

      // Check program existence before proceeding
      checkProgramExists().then(exists => {
        if (!exists) {
          setError(`Program ${IDL.address} not found on current network. Please deploy to ${connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet'} or switch networks.`);
          return;
        }
      });

      let walletAdapter;
      let anchorProvider;
      
      // Determine if we should use LazorKit based on actual connection state
      const shouldUseLazorKit = walletType === 'lazorkit' || 
        (lazorKitAccount?.publicKey && !wallet?.adapter?.connected);
      
      console.log('AnchorProvider: shouldUseLazorKit:', shouldUseLazorKit);
      
      if (shouldUseLazorKit) {
        if (!lazorKitAccount?.publicKey) {
          setError("LazorKit wallet not ready");
          return;
        }
        console.log('AnchorProvider: Creating LazorKit provider');
        
        // For LazorKit, create a wallet adapter that implements the required methods
        walletAdapter = {
          publicKey: lazorKitAccount.publicKey,
          signTransaction: async (tx: Transaction | VersionedTransaction) => {
            // This method is required by Anchor but won't be used for actual signing
            return tx;
          },
          signAllTransactions: async (txs: (Transaction | VersionedTransaction)[]) => {
            // This method is required by Anchor but won't be used for actual signing
            return txs;
          },
        };

        // Create LazorKit-specific provider
        console.log('AnchorProvider: signAndSendTransaction function:', signAndSendTransaction);
        anchorProvider = new LazorKitAnchorProvider(
          connection,
          //@typescript-eslint/no-explicit-any
          walletAdapter as any,
          { commitment: "confirmed" as const, preflightCommitment: "confirmed" as const },
          signAndSendTransaction,
          true
        );
      } else {
        if (!wallet?.adapter) {
          setError("Standard wallet not ready");
          return;
        }
        console.log('AnchorProvider: Creating standard provider');
        
        walletAdapter = wallet.adapter;

        // Create standard Anchor provider
        anchorProvider = new AnchorProvider(
          connection,
          //@typescript-eslint/no-explicit-any
          walletAdapter as any,
          { commitment: "confirmed" as const, preflightCommitment: "confirmed" as const }
        );
      }

      // Create the program instance using the appropriate provider
      const programInstance = new Program(
        //@typescript-eslint/no-explicit-any
        IDL as any,
        anchorProvider
      ) as Program<Token2022Amm>;

      setProgram(programInstance);

    } catch (err) {
      console.error("Error creating program:", err);
      setError(err instanceof Error ? err.message : "Failed to create program");
    }
  }, [connection, walletType, wallet, lazorKitAccount, signAndSendTransaction]);

  const isReady = useMemo(() => {
    return !!(program && !error);
  }, [program, error]);

  const contextValue: AnchorProviderContextState = useMemo(() => ({
    program,
    isReady,
    error,
  }), [program, isReady, error]);

  return (
    <AnchorProviderContext.Provider value={contextValue}>
      {children}
    </AnchorProviderContext.Provider>
  );
}
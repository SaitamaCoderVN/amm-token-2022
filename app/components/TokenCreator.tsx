'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Keypair,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getMintLen,
} from "@solana/spl-token";

// Top-level transaction construction removed. Logic is now inside onSubmit.

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(32, "Name must be 32 characters or less"),
  symbol: z.string().min(2, "Symbol must be at least 2 characters").max(10, "Symbol must be 10 characters or less"),
  decimals: z.number().min(0).max(9),
  initialSupply: z.number().positive("Initial supply must be greater than 0"),
  tokenType: z.enum(["legacy", "token2022"])
});

type FormData = z.infer<typeof formSchema>;

export function TokenCreator() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "My Token",
      symbol: "TKN",
      decimals: 9,
      initialSupply: 1000000000,
      tokenType: "token2022",
    },
  });

  async function onSubmit(data: FormData) {
    if (!publicKey || !signTransaction) {
      console.error("Wallet not connected!");
      return;
    }

    try {
      console.log("Creating token with data:", data);

      // Determine program ID based on selected token type
      const programId = data.tokenType === "token2022" ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

      // 1) Create the mint account keypair (we'll partially sign with this)
      const mintKeypair = Keypair.generate();

      // 2) Calculate required rent for the mint account
      const mintSpace = getMintLen([]);
      const rentLamports = await connection.getMinimumBalanceForRentExemption(mintSpace);

      // 3) Build instructions
      const createMintAccountIx = SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        lamports: rentLamports,
        space: mintSpace,
        programId,
      });

      const initializeMintIx = createInitializeMint2Instruction(
        mintKeypair.publicKey,
        data.decimals,
        publicKey,
        null,
        programId,
      );

      const instructions = [createMintAccountIx, initializeMintIx];

      // 4) Optionally create ATA and mint initial supply
      if (data.initialSupply > 0) {
        const associatedTokenAddress = getAssociatedTokenAddressSync(
          mintKeypair.publicKey,
          publicKey,
          false,
          programId,
        );

        const createAtaIx = createAssociatedTokenAccountInstruction(
          publicKey, // payer
          associatedTokenAddress,
          publicKey, // owner
          mintKeypair.publicKey,
          programId,
        );

        // Convert initial supply to base units: amount * 10^decimals using BigInt
        const decimalsPow = BigInt(10) ** BigInt(data.decimals);
        const amountInBaseUnits = BigInt(Math.floor(data.initialSupply)) * decimalsPow;

        const mintToIx = createMintToInstruction(
          mintKeypair.publicKey,
          associatedTokenAddress,
          publicKey,
          amountInBaseUnits,
          [],
          programId,
        );

        instructions.push(createAtaIx, mintToIx);
      }

      // 5) Assemble and sign transaction (partial sign with mint, then wallet signs)
      const latestBlockhash = await connection.getLatestBlockhash();
      const tx = new Transaction({
        feePayer: publicKey,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }).add(...instructions);

      // Partially sign with the mint keypair (required signer for account creation)
      tx.partialSign(mintKeypair);

      // Let the connected wallet sign (adds wallet signature)
      const walletSignedTx = await signTransaction(tx);

      // 6) Send and confirm
      const sig = await connection.sendRawTransaction(walletSignedTx.serialize());
      await connection.confirmTransaction({ signature: sig, ...latestBlockhash }, "confirmed");

      console.log("Mint Address:", mintKeypair.publicKey.toBase58());
      console.log("Transaction Signature:", sig);
    } catch (error) {
      console.error("Error creating token:", error);
    }
  }

  return (
    <Card className="w-[600px]">
      <CardHeader>
        <CardTitle>Create New Token</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Token" {...field} />
                  </FormControl>
                  <FormDescription>
                    The name of your token (e.g., &quot;Solana&quot;)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token Symbol</FormLabel>
                  <FormControl>
                    <Input placeholder="TKN" {...field} />
                  </FormControl>
                  <FormDescription>
                    A short identifier for your token (e.g., &quot;SOL&quot;)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="decimals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Decimals</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Number of decimal places (0-9, typically 9 for Solana tokens)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="initialSupply"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Supply</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    The initial amount of tokens to mint
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tokenType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token Standard</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="legacy" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Legacy SPL Token
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="token2022" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Token-2022 (Recommended)
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    Choose between legacy SPL tokens or the new Token-2022 standard
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Create Token
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

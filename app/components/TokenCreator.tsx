'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useWallet } from "@solana/wallet-adapter-react";
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
      // Token creation logic will go here
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

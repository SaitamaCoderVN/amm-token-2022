import { Connection, PublicKey } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { Token2022Amm } from '@/components/types/token2022_amm';

export interface LiquidityPairInfo {
  poolAddress: PublicKey;
  configAddress: PublicKey;
  tokenX: {
    mint: PublicKey;
    reserve: number;
    decimals: number;
  };
  tokenY: {
    mint: PublicKey;
    reserve: number;
    decimals: number;
  };
  lpSupply: number;
  totalValueLocked: number;
  feeRate: number;
  seed: number;
  isLocked: boolean;
}

export async function getAllLiquidityPairs(
  connection: Connection,
  program: Program<Token2022Amm>
): Promise<LiquidityPairInfo[]> {
  try {
    console.log("Fetching liquidity pairs...");
    console.log("Program ID:", program.programId.toString());
    
    // Method 1: Try to get all accounts first
    const allAccounts = await connection.getProgramAccounts(program.programId);
    console.log(`Total accounts found: ${allAccounts.length}`);
    
    // Filter for config accounts (they should have a specific size)
    const configAccounts = allAccounts.filter(account => {
      // Config account size: 8 (discriminator) + 8 (seed) + 32 (authority) + 32 (mintX) + 32 (mintY) + 2 (fee) + 1 (locked) + 4 (whiteListLp) + 1 (authBump) + 1 (configBump) + 1 (lpBump) = 130
      return account.account.data.length === 130;
    });
    
    console.log(`Config accounts found: ${configAccounts.length}`);
    
    const pairs: LiquidityPairInfo[] = [];
    
    for (const configAccount of configAccounts) {
      try {
        console.log(`Processing config: ${configAccount.pubkey.toString()}`);
        
        // Try to decode as config account
        let configData;
        try {
          configData = await program.account.config.fetch(configAccount.pubkey);
        } catch (decodeError) {
          console.log(`Failed to decode config account ${configAccount.pubkey.toString()}:`, decodeError);
          continue;
        }
        
        console.log("Config data:", configData);
        
        // Get pool state PDA
        const [poolStatePda] = PublicKey.findProgramAddressSync(
          [Buffer.from('pool'), configAccount.pubkey.toBuffer()],
          program.programId
        );
        
        console.log(`Pool state PDA: ${poolStatePda.toString()}`);
        
        // Get pool state account
        const poolStateAccount = await connection.getAccountInfo(poolStatePda);
        if (!poolStateAccount) {
          console.log(`No pool state found for config ${configAccount.pubkey.toString()}`);
          continue;
        }
        
        // Decode pool state
        let poolData;
        try {
          poolData = await program.account.poolState.fetch(poolStatePda);
        } catch (decodeError) {
          console.log(`Failed to decode pool state account ${poolStatePda.toString()}:`, decodeError);
          continue;
        }
        
        console.log("Pool data:", poolData);
        
        const tokenXMint = configData.mintX;
        const tokenYMint = configData.mintY;
        
        console.log(`Token X: ${tokenXMint.toString()}`);
        console.log(`Token Y: ${tokenYMint.toString()}`);
        
        // Get token metadata
        const [tokenXInfo, tokenYInfo] = await Promise.all([
          connection.getParsedAccountInfo(tokenXMint),
          connection.getParsedAccountInfo(tokenYMint)
        ]);
        
        const tokenXDecimals = (tokenXInfo.value?.data as { parsed?: { info?: { decimals?: number } } })?.parsed?.info?.decimals || 9;
        const tokenYDecimals = (tokenYInfo.value?.data as { parsed?: { info?: { decimals?: number } } })?.parsed?.info?.decimals || 9;
        
        console.log(`Token X decimals: ${tokenXDecimals}`);
        console.log(`Token Y decimals: ${tokenYDecimals}`);
        
        // Calculate reserves with proper decimal handling
        const reserveX = poolData.reserveX.toNumber() / Math.pow(10, tokenXDecimals);
        const reserveY = poolData.reserveY.toNumber() / Math.pow(10, tokenYDecimals);
        const lpSupply = poolData.reserveY.toNumber() / Math.pow(10, 9);
        
        const totalValueLocked = reserveX + reserveY;
        
        const pairInfo: LiquidityPairInfo = {
          poolAddress: poolStatePda,
          configAddress: configAccount.pubkey,
          tokenX: {
            mint: tokenXMint,
            reserve: reserveX,
            decimals: tokenXDecimals
          },
          tokenY: {
            mint: tokenYMint,
            reserve: reserveY,
            decimals: tokenYDecimals
          },
          lpSupply,
          totalValueLocked,
          feeRate: configData.fee / 10000,
          seed: configData.seed.toNumber(),
          isLocked: configData.locked
        };
        
        console.log("Pair info:", pairInfo);
        pairs.push(pairInfo);
        
      } catch (error) {
        console.error(`Error processing config ${configAccount.pubkey.toString()}:`, error);
        continue;
      }
    }
    
    console.log(`Successfully processed ${pairs.length} pairs`);
    return pairs;
    
  } catch (error) {
    console.error('Error fetching liquidity pairs:', error);
    throw error;
  }
}

export async function getLiquidityPairInfo(
  connection: Connection,
  program: Program<Token2022Amm>,
  poolAddress: PublicKey
): Promise<LiquidityPairInfo | null> {
  try {
    console.log(`Fetching info for pool: ${poolAddress.toString()}`);
    
    const poolData = await program.account.poolState.fetch(poolAddress);
    console.log("Pool data:", poolData);
    
    // Get the config account to access mint information
    const configData = await program.account.config.fetch(poolData.config);
    console.log("Config data:", configData);
    
    const tokenXMint = configData.mintX;
    const tokenYMint = configData.mintY;
    
    const [tokenXInfo, tokenYInfo] = await Promise.all([
      connection.getParsedAccountInfo(tokenXMint),
      connection.getParsedAccountInfo(tokenYMint)
    ]);
    
    const tokenXDecimals = (tokenXInfo.value?.data as { parsed?: { info?: { decimals?: number } } })?.parsed?.info?.decimals || 9;
    const tokenYDecimals = (tokenYInfo.value?.data as { parsed?: { info?: { decimals?: number } } })?.parsed?.info?.decimals || 9;
    
    const reserveX = poolData.reserveX.toNumber() / Math.pow(10, tokenXDecimals);
    const reserveY = poolData.reserveY.toNumber() / Math.pow(10, tokenYDecimals);
    const lpSupply = poolData.reserveY.toNumber() / Math.pow(10, 9);
    
    return {
      poolAddress,
      configAddress: poolData.config,
      tokenX: {
        mint: tokenXMint,
        reserve: reserveX,
        decimals: tokenXDecimals
      },
      tokenY: {
        mint: tokenYMint,
        reserve: reserveY,
        decimals: tokenYDecimals
      },
      lpSupply,
      totalValueLocked: reserveX + reserveY,
      feeRate: configData.fee / 10000, // Convert basis points to decimal
      seed: configData.seed.toNumber(),
      isLocked: configData.locked
    };
    
  } catch (error) {
    console.error('Error fetching liquidity pair info:', error);
    return null;
  }
}

export function logLiquidityPairs(pairs: LiquidityPairInfo[]): void {
  console.log(`\n🏊 LIQUIDITY PAIRS (${pairs.length} pairs found):`);
  
  pairs.forEach((pair, index) => {
    console.log(`\n${index + 1}. Pool: ${pair.poolAddress.toString()}`);
    console.log(`   Config: ${pair.configAddress.toString()}`);
    console.log(`   Seed: ${pair.seed}`);
    console.log(`   Token X: ${pair.tokenX.mint.toString()} (${pair.tokenX.reserve.toFixed(6)})`);
    console.log(`   Token Y: ${pair.tokenY.mint.toString()} (${pair.tokenY.reserve.toFixed(6)})`);
    console.log(`   LP Supply: ${pair.lpSupply.toFixed(6)}`);
    console.log(`   TVL: ${pair.totalValueLocked.toFixed(6)}`);
    console.log(`   Fee Rate: ${(pair.feeRate * 100).toFixed(2)}%`);
    console.log(`   Locked: ${pair.isLocked}`);
  });
}

export async function testQuerySpecificAccount(
  connection: Connection,
  program: Program<Token2022Amm>,
  accountAddress: string
) {
  try {
    const pubkey = new PublicKey(accountAddress);
    console.log(`Testing query for account: ${accountAddress}`);
    
    const accountInfo = await connection.getAccountInfo(pubkey);
    if (accountInfo) {
      console.log("Account found, size:", accountInfo.data.length);
      console.log("Owner:", accountInfo.owner.toString());
      
      // Try to decode as config
      try {
        const configData = await program.account.config.fetch(pubkey);
        console.log("Successfully decoded as config:", configData);
      } catch (e) {
        console.log("Failed to decode as config:", e);
      }
      
      // Try to decode as pool state
      try {
        const poolData = await program.account.poolState.fetch(pubkey);
        console.log("Successfully decoded as pool state:", poolData);
      } catch (e) {
        console.log("Failed to decode as pool state:", e);
      }
    } else {
      console.log("Account not found");
    }
  } catch (error) {
    console.error("Error testing account:", error);
  }
}
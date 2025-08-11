import { PublicKey, Keypair } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress
} from '@solana/spl-token';
import { Program } from '@coral-xyz/anchor';
import { Token2022Amm } from '@/components/types/token2022_amm';

export interface TokenInfo {
  mint: PublicKey;
  decimals: number;
  tokenProgram: PublicKey;
  hasTransferFee: boolean;
  transferFeeBasisPoints?: number;
  maxTransferFee?: bigint;
  symbol?: string;
}

export interface PoolInfo {
  config: PublicKey;
  poolState: PublicKey;
  poolAuthority: PublicKey;
  lpMint: PublicKey;
  vaultX: PublicKey;
  vaultY: PublicKey;
  tokenX: TokenInfo;
  tokenY: TokenInfo;
  reserves: {
    x: number;
    y: number;
  };
  fee: number;
  seed: number;
  lpSupply: number;
}

export interface UserTokenAccounts {
  tokenX: PublicKey;
  tokenY: PublicKey;
  lpToken?: PublicKey;
}

export interface TokenBalance {
  mint: PublicKey;
  balance: number;
  decimals: number;
  tokenProgram: PublicKey;
  withheldFees?: number;
  effectiveBalance: number;
}

/**
 * Derive pool addresses from config
 */
export function derivePoolAddresses(
  program: Program<Token2022Amm>,
  config: PublicKey
): {
  poolState: PublicKey;
  poolAuthority: PublicKey;
  lpMint: PublicKey;
} {
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

  return { poolState, poolAuthority, lpMint };
}

/**
 * Derive vault addresses for a pool
 */
export async function deriveVaultAddresses(
  poolAuthority: PublicKey,
  mintX: PublicKey,
  mintY: PublicKey,
  tokenProgramX: PublicKey,
  tokenProgramY: PublicKey
): Promise<{
  vaultX: PublicKey;
  vaultY: PublicKey;
}> {
  const vaultX = await getAssociatedTokenAddress(
    mintX,
    poolAuthority,
    true,
    tokenProgramX
  );

  const vaultY = await getAssociatedTokenAddress(
    mintY,
    poolAuthority,
    true,
    tokenProgramY
  );

  return { vaultX, vaultY };
}

/**
 * Get user token account address
 */
export async function getUserTokenAccount(
  mint: PublicKey,
  user: PublicKey,
  tokenProgram: PublicKey
): Promise<PublicKey> {
  return await getAssociatedTokenAddress(
    mint,
    user,
    false,
    tokenProgram
  );
}

/**
 * Determine token program from mint
 */
export function getTokenProgram(mint: PublicKey): PublicKey {
  // This is a simplified check - in practice you'd need to check the mint's metadata
  // For now, we'll use TOKEN_2022_PROGRAM_ID as default
  return TOKEN_2022_PROGRAM_ID;
}

/**
 * Calculate swap output using constant product formula
 */
export function calculateSwapOutput(
  amountIn: number,
  reserveIn: number,
  reserveOut: number,
  fee: number
): number {
  const feeMultiplier = 1 - (fee / 10000); // Convert basis points to decimal
  const amountInWithFee = amountIn * feeMultiplier;
  
  // Constant product formula: (x + dx) * (y - dy) = x * y
  // dy = (y * dx) / (x + dx)
  return (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);
}

/**
 * Calculate price impact
 */
export function calculatePriceImpact(amountIn: number, reserveIn: number): number {
  return (amountIn / reserveIn) * 100;
}

/**
 * Calculate minimum received with slippage
 */
export function calculateMinimumReceived(amountOut: number, slippagePercent: number): number {
  return amountOut * (1 - slippagePercent / 100);
}

/**
 * Format token amount with decimals
 */
export function formatTokenAmount(amount: number, decimals: number): string {
  return (amount / Math.pow(10, decimals)).toFixed(6);
}

/**
 * Parse token amount to raw units
 */
export function parseTokenAmount(amount: string, decimals: number): number {
  return parseFloat(amount) * Math.pow(10, decimals);
}

/**
 * Get token symbol from mint address
 */
export function getTokenSymbol(mint: PublicKey, decimals: number): string {
  const shortAddress = mint.toString().slice(0, 8);
  return `Token (${shortAddress}...)`;
}

/**
 * Validate pool configuration
 */
export function validatePoolConfig(
  tokenX: TokenInfo,
  tokenY: TokenInfo,
  fee: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (fee < 0 || fee > 10000) {
    errors.push('Fee must be between 0 and 10000 basis points');
  }

  if (tokenX.mint.equals(tokenY.mint)) {
    errors.push('Token X and Token Y must be different');
  }

  if (tokenX.decimals !== tokenY.decimals) {
    errors.push('Both tokens must have the same decimals');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

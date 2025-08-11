'use client'

import { useState, useEffect, useCallback } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useLazorKitWalletContext } from '@/app/providers/lazorkit-wallet-context'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowDownUp, Settings, RefreshCw, Loader2 } from 'lucide-react'
import { ConnectWalletButton } from '@/components/ui/murphy/connect-wallet-button'
import { toast } from "sonner"
// Token definitions for Solana
type TokenSymbol = 'SOL' | 'USDC'

export default function MoveTokenSwap() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const { isConnected: isLazorKitConnected, smartWalletPubkey } = useLazorKitWalletContext()
  
  const [fromToken, setFromToken] = useState<TokenSymbol>('SOL')
  const [toToken, setToToken] = useState<TokenSymbol>('USDC')
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [slippage, setSlippage] = useState('0.5')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingPrice, setIsFetchingPrice] = useState(false)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [priceImpact, setPriceImpact] = useState<number>(0)
  const [minimumReceived, setMinimumReceived] = useState<string>('')
  const [isLoadingBalances, setIsLoadingBalances] = useState(false)

  // Determine if any wallet is connected
  const isConnected = publicKey || (isLazorKitConnected && smartWalletPubkey)
  const currentWallet = publicKey || smartWalletPubkey

  // Fetch token balances
  const [balances, setBalances] = useState<Record<TokenSymbol, number>>({
    SOL: 0,
    USDC: 0
  })

  // Fetch balances when wallet changes
  useEffect(() => {
    if (!currentWallet) {
      setBalances({ SOL: 0, USDC: 0 })
      return
    }

    const fetchBalances = async () => {
      setIsLoadingBalances(true)
      try {
        // For SOL balance
        const solBalance = await connection.getBalance(currentWallet)
        const solAmount = solBalance / Math.pow(10, 9) // Convert lamports to SOL

        // For USDC balance (you'd need to implement SPL token balance fetching)
        // This is a simplified version - you'd need to add proper SPL token support
        const usdcAmount = 0 // Placeholder

        setBalances({
          SOL: solAmount,
          USDC: usdcAmount
        })
      } catch (error) {
        console.error('Error fetching balances:', error)
        
        // Handle specific RPC authentication errors
        if (error instanceof Error) {
          if (error.message.includes('401') || error.message.includes('Must be authenticated')) {
            toast.error('RPC Authentication Error', {
              description: 'The RPC endpoint requires authentication. Please check your RPC configuration.',
            })    
          } else if (error.message.includes('429') || error.message.includes('rate limit')) {
            toast.error('Rate Limit Exceeded', {
              description: 'Too many requests to the RPC endpoint. Please try again later.',
            })
          } else {
            toast.error('Error', {
              description: 'Failed to fetch token balances. Please try again.',
            })
          }
        } else {
          toast.error('Error', {
            description: 'Failed to fetch token balances',
          })
        }
        
        // Set default balances on error
        setBalances({
          SOL: 0,
          USDC: 0
        })
      } finally {
        setIsLoadingBalances(false)
      }
    }

    fetchBalances()
  }, [currentWallet, connection, toast])

  // Calculate exchange rate and price impact
  const calculateSwapDetails = useCallback(async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setToAmount('')
      setExchangeRate(null)
      setPriceImpact(0)
      setMinimumReceived('')
      return
    }

    setIsFetchingPrice(true)
    try {
      // Mock exchange rate - in real implementation, fetch from Jupiter/Raydium API
      const mockRate = 100 // 1 SOL = 100 USDC (example rate)
      const rate = mockRate
      
      const fromAmountNum = parseFloat(fromAmount)
      const toAmountNum = fromAmountNum * rate
      
      setExchangeRate(rate)
      setToAmount(toAmountNum.toFixed(6))
      
      // Calculate price impact (simplified)
      const impact = (fromAmountNum / 1000) * 0.01 // Mock calculation
      setPriceImpact(impact)
      
      // Calculate minimum received with slippage
      const slippagePercent = parseFloat(slippage) / 100
      const minReceived = toAmountNum * (1 - slippagePercent)
      setMinimumReceived(minReceived.toFixed(6))
      
    } catch (error) {
      console.error('Error calculating swap details:', error)
      toast.error('Error', {
        description: 'Failed to calculate swap details',
      })
    } finally {
      setIsFetchingPrice(false)
    }
  }, [fromAmount, slippage, toast])

  // Update swap details when inputs change
  useEffect(() => {
    calculateSwapDetails()
  }, [calculateSwapDetails])

  // Handle swap execution
  const handleSwap = async () => {
    if (!isConnected || !currentWallet) {
      toast.error('Wallet Required', {
        description: 'Please connect your wallet to swap tokens',
      })
      return
    }

    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      toast.error('Invalid Amount', {
        description: 'Please enter a valid amount to swap',
      })
      return
    }

    if (parseFloat(fromAmount) > balances[fromToken]) {
      toast.error('Insufficient Balance', {
        description: `You don't have enough ${fromToken} to complete this swap`,
      })
      return
    }

    setIsLoading(true)
    try {
      // TODO: Implement actual swap logic using Jupiter SDK or Raydium
      // This is where you'd integrate with a DEX protocol
      
      // Mock swap transaction
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate transaction
      
      toast.success('Swap Successful', {
        description: `Successfully swapped ${fromAmount} ${fromToken} for ${toAmount} ${toToken}`,
      })
      
      // Reset form
      setFromAmount('')
      setToAmount('')
      
      // Refresh balances
      // fetchBalances()
      
    } catch (error) {
      console.error('Swap error:', error)
      toast.error('Swap Failed', {
        description: error instanceof Error ? error.message : 'Failed to execute swap',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className='w-full max-w-md'>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-2xl font-bold'>Swap</CardTitle>
        <Button variant='ghost' size='icon'>
          <Settings className='h-4 w-4' />
        </Button>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Max Slippage Selector */}
        <div className='flex items-center space-x-2 text-sm'>
          <span className='text-muted-foreground'>Max Slippage:</span>
          <Select value={slippage} onValueChange={setSlippage}>
            <SelectTrigger className='h-8 w-[80px]'>
              <SelectValue placeholder='Slippage' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='0.1'>0.1%</SelectItem>
              <SelectItem value='0.5'>0.5%</SelectItem>
              <SelectItem value='1.0'>1.0%</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Token Fields Container with Relative Positioning */}
        <div className='relative'>
          {/* From Token Card */}
          <Card>
            <CardContent className='p-3'>
              <div className='mb-2 flex justify-between'>
                <div className='flex items-center space-x-2'>
                  <Select value={fromToken} onValueChange={(value) => setFromToken(value as TokenSymbol)}>
                    <SelectTrigger className='w-[100px]'>
                      <SelectValue placeholder='Token' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='SOL'>SOL</SelectItem>
                      <SelectItem value='USDC'>USDC</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type='number'
                    placeholder='0.00'
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    className='border-0 text-2xl focus-visible:ring-0'
                    disabled={isLoading}
                  />
                </div>
                <div className='text-right'>
                  <p className='text-sm text-muted-foreground'>
                    ≈$ {exchangeRate ? (parseFloat(fromAmount || '0') * exchangeRate).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>
              <div className='flex items-center justify-between text-sm text-muted-foreground'>
                <span>
                  Balance: {isLoadingBalances ? (
                    <span className="inline-flex items-center">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Loading...
                    </span>
                  ) : (
                    `${balances[fromToken].toFixed(4)} ${fromToken}`
                  )}
                </span>
                <Button 
                  variant='ghost' 
                  size='sm' 
                  className='h-auto px-2 py-0'
                  onClick={() => setFromAmount(balances[fromToken].toString())}
                  disabled={isLoading || isLoadingBalances}
                >
                  Max
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Swap Button - Absolutely Positioned */}
          <div className='absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2'>
            <Button
              variant='outline'
              size='icon'
              className='h-10 w-10 rounded-full border-border bg-background'
              onClick={() => {
                setFromToken(toToken)
                setToToken(fromToken)
                setFromAmount('')
                setToAmount('')
              }}
              disabled={isLoading}
            >
              <ArrowDownUp className='h-4 w-4' />
            </Button>
          </div>

          {/* To Token Card */}
          <Card className='mt-2'>
            <CardContent className='p-3'>
              <div className='mb-2 flex justify-between'>
                <div className='flex items-center space-x-2'>
                  <Select value={toToken} onValueChange={(value) => setToToken(value as TokenSymbol)}>
                    <SelectTrigger className='w-[100px]'>
                      <SelectValue placeholder='Token' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='SOL'>SOL</SelectItem>
                      <SelectItem value='USDC'>USDC</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type='number'
                    placeholder='0.00'
                    value={toAmount}
                    onChange={(e) => setToAmount(e.target.value)}
                    className='border-0 text-2xl focus-visible:ring-0'
                    disabled={isLoading || isFetchingPrice}
                  />
                </div>
                <div className='text-right'>
                  <p className='text-sm text-muted-foreground'>
                    ≈$ {exchangeRate ? (parseFloat(toAmount || '0') * (toToken === 'USDC' ? 1 : exchangeRate)).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>
              <div className='text-sm text-muted-foreground'>
                Balance: {isLoadingBalances ? (
                  <span className="inline-flex items-center">
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Loading...
                  </span>
                ) : (
                  `${balances[toToken].toFixed(4)} ${toToken}`
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rate and Details Section */}
        <Card>
          <CardContent className='space-y-3 p-3'>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>Rate</span>
              <div className='flex items-center'>
                <span>
                  {exchangeRate ? `1 ${fromToken} = ${exchangeRate.toFixed(4)} ${toToken}` : 'Loading...'}
                </span>
                <Button 
                  variant='ghost' 
                  size='icon' 
                  className='ml-1 h-6 w-6'
                  onClick={calculateSwapDetails}
                  disabled={isFetchingPrice}
                >
                  {isFetchingPrice ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <RefreshCw className='h-4 w-4' />
                  )}
                </Button>
              </div>
            </div>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>Minimum Received</span>
              <span>{minimumReceived || '0.00'} {toToken}</span>
            </div>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>Price Impact</span>
              <span>{priceImpact < 0.01 ? '< 0.01%' : `${priceImpact.toFixed(2)}%`}</span>
            </div>
          </CardContent>
        </Card>

        {isConnected ? (
          <Button 
            className='w-full' 
            onClick={handleSwap}
            disabled={isLoading || !fromAmount || parseFloat(fromAmount) <= 0}
          >
            {isLoading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Swapping...
              </>
            ) : (
              'Swap'
            )}
          </Button>
        ) : (
          <ConnectWalletButton className='w-full' />
        )}
      </CardContent>
    </Card>
  )
}
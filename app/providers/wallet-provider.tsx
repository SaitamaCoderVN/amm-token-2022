"use client"

import React, { useState, useMemo, createContext, useCallback, useEffect } from "react"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import type { Adapter } from "@solana/wallet-adapter-base"
import {
  WalletProvider as SolanaWalletProvider,
  ConnectionProvider as SolanaConnectionProvider,
  ConnectionProviderProps,
} from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets"
import { TxnSettingsProvider } from "@/components/ui/murphy/txn-settings"
import { ClientLazorKitProvider } from "./client-lazorkit-provider"
import { LazorKitWalletProvider } from "./lazorkit-wallet-context"
import { AnchorProviderProvider } from "./anchor-provider"

import "@solana/wallet-adapter-react-ui/styles.css"

// Constants
const DEFAULT_MAINNET_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com"
const DEFAULT_DEVNET_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL_DEVNET || "https://api.devnet.solana.com"

// Create wrapper components
const ConnectionProviderWrapper = (props: ConnectionProviderProps) => (
  <SolanaConnectionProvider {...props} />
)

const WalletProviderWrapper = (props: React.ComponentProps<typeof SolanaWalletProvider>) => (
  <SolanaWalletProvider {...props} />
)

interface WalletProviderProps {
  children: React.ReactNode
  network?: WalletAdapterNetwork
  endpoint?: string
  wallets?: Adapter[]
  autoConnect?: boolean
}

interface ModalContextState {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  endpoint?: string
  switchToNextEndpoint: () => void
  availableEndpoints: string[]
  currentEndpointIndex: number
  isMainnet: boolean
  walletType: 'standard' | 'lazorkit'
  setWalletType: (type: 'standard' | 'lazorkit') => void
  networkType: WalletAdapterNetwork
}

export const ModalContext = createContext<ModalContextState>({
  isOpen: false,
  setIsOpen: () => null,
  endpoint: undefined,
  switchToNextEndpoint: () => null,
  availableEndpoints: [],
  currentEndpointIndex: 0,
  isMainnet: false, // Changed default to false for devnet
  walletType: 'standard',
  setWalletType: () => null,
  networkType: WalletAdapterNetwork.Devnet, // Changed default to Devnet
})

export const WalletProvider = ({ children, ...props }: WalletProviderProps) => {
  const [currentEndpointIndex, setCurrentEndpointIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [walletType, setWalletType] = useState<'standard' | 'lazorkit'>(() => {
    if (typeof window !== 'undefined') {
      const savedType = localStorage.getItem('walletType')
      return (savedType as 'standard' | 'lazorkit') || 'standard'
    }
    return 'standard'
  })

  // Clear error after 5 seconds
  useEffect(() => {
    if (connectionError) {
      const timer = setTimeout(() => setConnectionError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [connectionError])

  // Network detection - default to devnet for LazorKit beta
  const isMainnet = useMemo(() => {
    if (walletType === 'lazorkit') return false // Force devnet for LazorKit
    const mainnetEnv = process.env.NEXT_PUBLIC_USE_MAINNET
    return mainnetEnv === undefined ? false : mainnetEnv === "true" // Default to devnet
  }, [walletType])

  const networkType = useMemo(
    () => isMainnet ? WalletAdapterNetwork.Mainnet : WalletAdapterNetwork.Devnet,
    [isMainnet]
  )

  // RPC endpoints management
  const publicRPCs = useMemo(
    () => [isMainnet ? DEFAULT_MAINNET_RPC : DEFAULT_DEVNET_RPC],
    [isMainnet]
  )

  const endpoint = useMemo(() => {
    if (props.endpoint) {
      return props.endpoint
    }
    return publicRPCs[currentEndpointIndex]
  }, [props.endpoint, publicRPCs, currentEndpointIndex])

  // Endpoint switching with error handling
  const switchToNextEndpoint = useCallback(() => {
    setCurrentEndpointIndex((prevIndex) => {
      const nextIndex = (prevIndex + 1) % publicRPCs.length
      console.log(
        `Switching RPC endpoint from ${publicRPCs[prevIndex]} to ${publicRPCs[nextIndex]}`
      )
      return nextIndex
    })
  }, [publicRPCs])

  // Wallet adapters
  const wallets = useMemo(
    () => props.wallets || [new PhantomWalletAdapter()],
    [props.wallets]
  )

  // Persist wallet type
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('walletType', walletType)
    }
  }, [walletType])

  // Auto-connect effect
  useEffect(() => {
    if (props.autoConnect && walletType === 'lazorkit') {
      // Attempt to reconnect LazorKit wallet on mount
      const reconnectLazorKit = async () => {
        try {
          // The actual reconnection will be handled by the LazorKitWalletProvider
          console.log('Attempting to reconnect LazorKit wallet...')
        } catch (error) {
          console.error('Failed to reconnect LazorKit wallet:', error)
        }
      }
      reconnectLazorKit()
    }
  }, [props.autoConnect, walletType])

  // Context value memoization
  const contextValue = useMemo(() => ({
    isOpen,
    setIsOpen,
    endpoint,
    switchToNextEndpoint,
    availableEndpoints: publicRPCs,
    currentEndpointIndex,
    isMainnet,
    walletType,
    setWalletType,
    networkType,
  }), [
    isOpen,
    endpoint,
    switchToNextEndpoint,
    publicRPCs,
    currentEndpointIndex,
    isMainnet,
    walletType,
    networkType,
  ])

  return (
    <ModalContext.Provider value={contextValue}>
      <ConnectionProviderWrapper endpoint={endpoint}>
        <WalletProviderWrapper 
          wallets={wallets} 
          autoConnect={props.autoConnect}
          onError={(error: Error) => {
            console.error('Wallet error:', error)
            
            let errorMessage = 'Connection failed. Please try again.'
            let toastType: 'default' | 'destructive' | 'success' = 'destructive'
            
            if (error.message.includes('This address is not connected')) {
              errorMessage = 'Wallet connection expired. Please reconnect manually.'
              toastType = 'default'
              // Optionally clear stale connection state
              if (typeof window !== 'undefined') {
                localStorage.removeItem('walletName')
                localStorage.removeItem('walletAdapterName')
              }
            } else if (error.message.includes('User rejected')) {
              errorMessage = 'Connection rejected by user.'
              toastType = 'default'
            } else if (error.message.includes('timeout')) {
              errorMessage = 'Connection timed out. Please try again.'
            } else if (error.message.includes('already connected')) {
              errorMessage = 'Wallet is already connected.'
              toastType = 'success'
            }
            
            setConnectionError(errorMessage)

            // Attempt to switch endpoint on connection errors
            if (error.message.includes('connection') || error.message.includes('network')) {
              switchToNextEndpoint()
            }
          }}
        >
          <WalletModalProvider>
            <ClientLazorKitProvider>
              <LazorKitWalletProvider>
                <AnchorProviderProvider>
                  <TxnSettingsProvider>{children}</TxnSettingsProvider>
                </AnchorProviderProvider>
              </LazorKitWalletProvider>
            </ClientLazorKitProvider>
          </WalletModalProvider>
        </WalletProviderWrapper>
      </ConnectionProviderWrapper>
    </ModalContext.Provider>
  )
}
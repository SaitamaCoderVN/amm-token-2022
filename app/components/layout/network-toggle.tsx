"use client"

import { useCluster } from "@/app/providers/cluster-provider"
import { Switch } from "@/components/ui/switch"
import { useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"

export function NetworkToggle() {
  const { cluster, setCluster } = useCluster()
  const { connected, disconnect } = useWallet()
  const [isChanging, setIsChanging] = useState(false)
  const isMainnet = cluster === "mainnet"

  useEffect(() => {
    if (isChanging) {
      const timer = setTimeout(() => setIsChanging(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [isChanging])

  const handleNetworkChange = async (checked: boolean) => {
    if (connected) {
      await disconnect()
    }
    setIsChanging(true)
    setCluster(checked ? "mainnet" : "devnet")
  }

  return (
    <div className="relative flex items-center gap-2 ml-2">
      <span className={`text-xs font-medium ${!isMainnet ? 'text-green-500' : 'text-muted-foreground'}`}>
        DEV
      </span>
      <Switch
        id="network-switch"
        checked={isMainnet}
        onCheckedChange={handleNetworkChange}
        className={`scale-75 transition-opacity duration-200 ${isChanging ? 'opacity-50' : 'opacity-100'}`}
        disabled={isChanging}
      />
      <span className={`text-xs font-medium ${isMainnet ? 'text-green-500' : 'text-muted-foreground'}`}>
        MAIN
      </span>
      {isChanging && (
        <div className="absolute -bottom-5 left-0 right-0 text-center">
          <span className="text-xs text-yellow-500 animate-pulse">
            Switching network...
          </span>
        </div>
      )}
    </div>
  )
}
"use client";

import { Button } from "@/components/ui/button";
import { useCluster } from "@/app/providers/cluster-provider";
import { useAnchorProvider } from "@/app/providers/anchor-provider";
import { Badge } from "@/components/ui/badge";
import { Globe, AlertCircle, CheckCircle } from "lucide-react";

export function NetworkToggle() {
  const { cluster, setCluster } = useCluster();
  const { isReady, error } = useAnchorProvider();

  const toggleCluster = () => {
    setCluster(cluster === "devnet" ? "mainnet" : "devnet");
  };

  const getNetworkStatus = () => {
    if (error && error.includes('not found on current network')) {
      return {
        status: 'error',
        icon: <AlertCircle className="h-3 w-3" />,
        text: 'Program Not Available',
        color: 'bg-destructive text-destructive-foreground'
      };
    }
    
    if (isReady) {
      return {
        status: 'success',
        icon: <CheckCircle className="h-3 w-3" />,
        text: 'Connected',
        color: 'bg-green-500 text-white'
      };
    }
    
    return {
      status: 'loading',
      icon: <Globe className="h-3 w-3" />,
      text: 'Connecting...',
      color: 'bg-yellow-500 text-white'
    };
  };

  const networkStatus = getNetworkStatus();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={toggleCluster}
        className="flex items-center gap-2"
      >
        <Globe className="h-4 w-4" />
        {cluster === "devnet" ? "Devnet" : "Mainnet"}
      </Button>
      
      <Badge variant="secondary" className={networkStatus.color}>
        {networkStatus.icon}
        <span className="ml-1">{networkStatus.text}</span>
      </Badge>
      
      {error && error.includes('not found on current network') && (
        <div className="text-xs text-muted-foreground max-w-xs">
          Program not available on {cluster}. Switch networks or deploy the program.
        </div>
      )}
    </div>
  );
}
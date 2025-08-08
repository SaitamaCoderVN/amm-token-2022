import { createContext, useContext, useState } from "react";

type Cluster = "devnet" | "mainnet";

interface ClusterContextState {
  cluster: Cluster;
  setCluster: (cluster: Cluster) => void;
}

const ClusterContext = createContext<ClusterContextState>({
  cluster: "devnet",
  setCluster: () => {},
});

export function ClusterProvider({ children }: { children: React.ReactNode }) {
  const [cluster, setCluster] = useState<Cluster>("devnet");

  return (
    <ClusterContext.Provider value={{ cluster, setCluster }}>
      {children}
    </ClusterContext.Provider>
  );
}

export const useCluster = () => {
  const context = useContext(ClusterContext);
  if (!context) {
    throw new Error("useCluster must be used within a ClusterProvider");
  }
  return context;
};

import MoveTokenSwap from '@/components/ui/token-swap'
import { PriceChart } from '@/components/ui/price-chart'

export default function SwapPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-8 mx-auto">
        {/* Price Chart - full width on mobile, 4/5 on desktop */}
        <div className="col-span-1 lg:col-span-3 flex justify-start">
          <PriceChart 
            symbol="SOL" 
            baseSymbol="USDC" 
            className="w-full"
          />
        </div>
        
        {/* Swap Component - full width on mobile, 1/5 on desktop */}
        <div className="col-span-2 flex justify-end">
          <MoveTokenSwap />
        </div>
      </div>
    </div>
  )
}

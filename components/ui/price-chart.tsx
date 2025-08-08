'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'

interface PriceData {
  timestamp: number
  price: number
}

interface PriceChartProps {
  symbol: string
  baseSymbol: string
  className?: string
}

export function PriceChart({ symbol, baseSymbol, className }: PriceChartProps) {
  const [timeframe, setTimeframe] = useState<'1H' | '24H' | '7D' | '30D'>('24H')
  const [priceData, setPriceData] = useState<PriceData[]>([])
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  // Generate mock price data
  useEffect(() => {
    setIsLoading(true)
    
    // Simulate API call delay
    const timer = setTimeout(() => {
      const now = Date.now()
      const data: PriceData[] = []
      const basePrice = symbol === 'SOL' ? 100 : 1 // Mock base price
      
      // Generate 24 hours of data
      for (let i = 23; i >= 0; i--) {
        const timestamp = now - (i * 60 * 60 * 1000) // 1 hour intervals
        const randomChange = (Math.random() - 0.5) * 0.1 // ±5% change
        const price = basePrice * (1 + randomChange)
        data.push({ timestamp, price })
      }
      
      setPriceData(data)
      setCurrentPrice(data[data.length - 1].price)
      setPriceChange(((data[data.length - 1].price - data[0].price) / data[0].price) * 100)
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [symbol, timeframe])

  // Calculate chart dimensions
  const chartWidth = 400
  const chartHeight = 200
  const padding = 20

  // Generate SVG path for price data
  const generatePath = (data: PriceData[]) => {
    if (data.length === 0) return ''

    const minPrice = Math.min(...data.map(d => d.price))
    const maxPrice = Math.max(...data.map(d => d.price))
    const priceRange = maxPrice - minPrice || 1

    const xStep = (chartWidth - padding * 2) / (data.length - 1)
    const yScale = (chartHeight - padding * 2) / priceRange

    return data
      .map((point, index) => {
        const x = padding + index * xStep
        const y = chartHeight - padding - (point.price - minPrice) * yScale
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')
  }

  const pathData = generatePath(priceData)
  const isPositive = priceChange >= 0

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg font-semibold">
              {symbol}/{baseSymbol}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              Live
            </Badge>
          </div>
          <div className="flex items-center space-x-1">
            {timeframe === '1H' && <Activity className="h-4 w-4 text-green-500 animate-pulse" />}
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>
        
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold">
            ${currentPrice.toFixed(2)}
          </span>
          <span className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Timeframe Selector */}
        <div className="flex space-x-1 mb-4">
          {(['1H', '24H', '7D', '30D'] as const).map((tf) => (
            <Button
              key={tf}
              variant={timeframe === tf ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeframe(tf)}
              className="text-xs px-2 py-1 h-7"
            >
              {tf}
            </Button>
          ))}
        </div>

        {/* Chart */}
        <div className="relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <svg
              width={chartWidth}
              height={chartHeight}
              className="w-full"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            >
              {/* Grid lines */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    className="text-border opacity-30"
                  />
                </pattern>
              </defs>
              
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Price line */}
              <path
                d={pathData}
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                className={`${isPositive ? 'text-green-500' : 'text-red-500'}`}
              />
              
              {/* Gradient fill */}
              <defs>
                <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop
                    offset="0%"
                    className={isPositive ? 'text-green-500' : 'text-red-500'}
                    stopOpacity="0.3"
                  />
                  <stop
                    offset="100%"
                    className={isPositive ? 'text-green-500' : 'text-red-500'}
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>
              
              <path
                d={`${pathData} L ${chartWidth - padding} ${chartHeight - padding} L ${padding} ${chartHeight - padding} Z`}
                fill="url(#priceGradient)"
              />
            </svg>
          )}
        </div>

        {/* Chart stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
          <div>
            <div className="text-muted-foreground">24h High</div>
            <div className="font-medium">
              ${Math.max(...priceData.map(d => d.price)).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">24h Low</div>
            <div className="font-medium">
              ${Math.min(...priceData.map(d => d.price)).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Volume</div>
            <div className="font-medium">
              ${(Math.random() * 1000000).toLocaleString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

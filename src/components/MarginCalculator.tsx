'use client'

import { useState, useMemo } from 'react'
import { fmtCost } from '@/lib/fmt'

const PLANS = [
  { name: 'Starter', priceEGP: 500 },
  { name: 'Growth', priceEGP: 1500 },
  { name: 'Pro', priceEGP: 3500 },
  { name: 'Brand', priceEGP: 6000 },
]

const EGP_TO_USD = 0.0204 // ~49 EGP per USD

interface MarginCalculatorProps {
  blendedCostPerReply: number
}

export default function MarginCalculator({ blendedCostPerReply }: MarginCalculatorProps) {
  const [selectedPlan, setSelectedPlan] = useState(PLANS[1])
  const [expectedReplies, setExpectedReplies] = useState(500)
  const [egpRate, setEgpRate] = useState(EGP_TO_USD)

  const calc = useMemo(() => {
    const revenueUSD = selectedPlan.priceEGP * egpRate
    const aiCost = blendedCostPerReply * expectedReplies
    const grossProfit = revenueUSD - aiCost
    const margin = revenueUSD > 0 ? (grossProfit / revenueUSD) * 100 : 0
    const healthy = margin >= 60
    return { revenueUSD, aiCost, grossProfit, margin, healthy }
  }, [selectedPlan, expectedReplies, egpRate, blendedCostPerReply])

  return (
    <div className="bg-[#111111] dark:bg-[#111111] border border-[#1f1f1f] dark:border-[#1f1f1f] rounded-xl p-5">
      <p className="text-[10px] uppercase tracking-widest text-[#6b7280] dark:text-[#6b7280] font-medium mb-4">margin calculator</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {/* Plan selector */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium block mb-2">plan</label>
          <div className="grid grid-cols-2 gap-1.5">
            {PLANS.map(plan => (
              <button
                key={plan.name}
                onClick={() => setSelectedPlan(plan)}
                className={`px-3 py-2 rounded-lg text-[11px] font-medium text-left transition-colors ${
                  selectedPlan.name === plan.name
                    ? 'bg-white text-black'
                    : 'bg-[#1a1a1a] text-[#9ca3af] hover:text-white'
                }`}
              >
                <span className="block">{plan.name}</span>
                <span className={`text-[10px] ${selectedPlan.name === plan.name ? 'text-black/50' : 'text-[#6b7280]'}`}>
                  {plan.priceEGP.toLocaleString()} EGP
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Replies input */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium block mb-2">
            expected replies / mo
          </label>
          <input
            type="number"
            value={expectedReplies}
            onChange={e => setExpectedReplies(Math.max(1, Number(e.target.value)))}
            className="w-full bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#333]"
            min={1}
          />
          <p className="text-[10px] text-[#4b5563] mt-1.5">
            blended: ${fmtCost(blendedCostPerReply)} / reply
          </p>
        </div>

        {/* EGP rate */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium block mb-2">
            EGP → USD rate
          </label>
          <input
            type="number"
            value={egpRate}
            onChange={e => setEgpRate(Math.max(0.001, Number(e.target.value)))}
            className="w-full bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#333]"
            step={0.001}
            min={0.001}
          />
          <p className="text-[10px] text-[#4b5563] mt-1.5">
            1 EGP = ${egpRate.toFixed(4)} USD
          </p>
        </div>
      </div>

      {/* Results */}
      <div className={`rounded-xl p-4 border ${
        calc.healthy
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : 'bg-red-500/5 border-red-500/20'
      }`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium mb-1">plan revenue</p>
            <p className="text-lg font-bold text-white">${fmtCost(calc.revenueUSD)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium mb-1">AI cost</p>
            <p className="text-lg font-bold text-white">${fmtCost(calc.aiCost)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium mb-1">gross profit</p>
            <p className={`text-lg font-bold ${calc.grossProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
              ${fmtCost(calc.grossProfit)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium mb-1">margin</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-lg font-bold ${calc.healthy ? 'text-emerald-400' : 'text-red-400'}`}>
                {calc.margin.toFixed(1)}%
              </p>
              <span className={`text-[10px] font-medium uppercase tracking-wide ${calc.healthy ? 'text-emerald-500' : 'text-red-500'}`}>
                {calc.healthy ? 'healthy' : 'below 60%'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

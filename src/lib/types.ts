export interface UsageLog {
  id: string
  brand_id: string
  conversation_id: string
  message_type: 'text' | 'voice' | 'image' | 'story'
  model: 'gpt-4o-mini' | 'gpt-4o' | 'whisper-1' | string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost_usd: number
  created_at: string
}

export interface Brand {
  id: string
  name: string
}

export interface UsageLogWithBrand extends UsageLog {
  brands: Brand | null
}

export interface BrandStats {
  id: string
  name: string
  totalRepliesAllTime: number
  totalRepliesMonth: number
  totalCostAllTime: number
  totalCostMonth: number
  avgCostPerReply: number
  lastActive: string | null
}

export interface DailyData {
  date: string
  cost: number
}

export interface TypeBreakdown {
  type: string
  count: number
  cost: number
  tokens: number
}

export interface ModelBreakdown {
  model: string
  count: number
  cost: number
}

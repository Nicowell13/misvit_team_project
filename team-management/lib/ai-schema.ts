import { z } from 'zod'

export const insightInputSchema = z.object({
  source: z.enum(['pancake_csv', 'campaign_review']).default('campaign_review'),
  rows: z.array(z.record(z.string(), z.unknown())).max(500).default([]),
  context: z.string().max(20_000).default(''),
})

export const insightSchema = z.object({
  title: z.string().min(3).max(160),
  type: z.enum(['trend', 'cta', 'sales', 'content', 'operations', 'risk']),
  evidence: z.string().min(3).max(800),
  recommendation: z.string().min(3).max(1200),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  suggestedPic: z.string().max(120).optional(),
  suggestedKpi: z.string().max(300).optional(),
})

export const insightResponseSchema = z.object({
  summary: z.string().min(3).max(1200),
  insights: z.array(insightSchema).min(1).max(10),
})

export type InsightResponse = z.infer<typeof insightResponseSchema>

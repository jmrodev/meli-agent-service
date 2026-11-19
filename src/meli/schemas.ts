import { z } from 'zod';

export const MeliTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  scope: z.string(),
  user_id: z.number().or(z.string()),
  refresh_token: z.string()
});

export type MeliTokenResponse = z.infer<typeof MeliTokenResponseSchema>;

export const MeliSearchResultItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.number(),
  currency_id: z.string(),
  permalink: z.string(),
  thumbnail: z.string().optional(),
  available_quantity: z.number().optional(),
  condition: z.string().optional()
});

export const MeliSearchResponseSchema = z.object({
  site_id: z.string().optional(),
  query: z.string().optional(),
  paging: z.object({
    total: z.number(),
    offset: z.number(),
    limit: z.number(),
    primary_results: z.number().optional()
  }),
  results: z.array(MeliSearchResultItemSchema)
});

export type MeliSearchResponse = z.infer<typeof MeliSearchResponseSchema>;

export const MeliItemDetailSchema = z.object({
  id: z.string(),
  site_id: z.string(),
  title: z.string(),
  price: z.number(),
  base_price: z.number().optional(),
  currency_id: z.string(),
  initial_quantity: z.number().optional(),
  available_quantity: z.number().optional(),
  sold_quantity: z.number().optional(),
  condition: z.string(),
  permalink: z.string(),
  status: z.string(),
  warranty: z.string().nullable().optional()
});

export type MeliItemDetail = z.infer<typeof MeliItemDetailSchema>;

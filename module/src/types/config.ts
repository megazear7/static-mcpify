import { z } from 'zod';

/**
 * Tool configuration for an entry type.
 * Each tool defines a name and which fields to include.
 */
export const ToolConfigSchema = z.object({
  name: z.string().min(1, 'Tool name is required'),
  description: z.string().optional(),
  fields: z.array(z.string().min(1)).min(1, 'At least one field is required'),
});

export type ToolConfig = z.infer<typeof ToolConfigSchema>;

/**
 * Entry (content-type) configuration stored at
 * <output>/content/entries/<content-type>/config.json
 */
export const EntryConfigSchema = z.object({
  contentType: z.string().min(1, 'Content type name is required'),
  tools: z.array(ToolConfigSchema).min(1, 'At least one tool is required'),
});

export type EntryConfig = z.infer<typeof EntryConfigSchema>;

/**
 * Top-level output configuration stored at <output>/config.json
 */
export const OutputConfigSchema = z.object({
  source: z.enum(['contentful']).nullable(),
});

export type OutputConfig = z.infer<typeof OutputConfigSchema>;

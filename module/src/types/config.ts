import { z } from 'zod';

export const FilterOperatorSchema = z.enum(['equals', 'notEquals', 'exists', 'in', 'match']);
export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

export const EntryFilterSchema = z.object({
  field: z.string().min(1, 'Filter field is required'),
  operator: FilterOperatorSchema,
  value: z.union([z.string(), z.array(z.string().min(1))]).optional(),
}).superRefine((filter, ctx) => {
  if (filter.operator === 'exists') {
    return;
  }

  if (filter.value === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Filter value is required for operator "${filter.operator}"`,
      path: ['value'],
    });
  }

  if (filter.operator === 'in' && !Array.isArray(filter.value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Filter value must be an array for operator "in"',
      path: ['value'],
    });
  }

  if (filter.operator !== 'in' && Array.isArray(filter.value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Filter value must be a string for operator "${filter.operator}"`,
      path: ['value'],
    });
  }
});
export type EntryFilter = z.infer<typeof EntryFilterSchema>;

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

export const ToolFormatSchema = z.enum(['string', 'json']);

export type ToolFormat = z.infer<typeof ToolFormatSchema>;

export const ListToolConfigSchema = z.object({
  description: z.string().optional(),
});

export type ListToolConfig = z.infer<typeof ListToolConfigSchema>;

export const DefaultToolConfigSchema = z.object({
  description: z.string().optional(),
  fields: z.array(z.string().min(1)).min(1, 'At least one field is required'),
});

export type DefaultToolConfig = z.infer<typeof DefaultToolConfigSchema>;

export const DEFAULT_TOOL_BASENAME = '_default';

/**
 * Entry (content-type) configuration stored at
 * <output>/content/entries/<content-type>/config.json
 */
export const EntryConfigSchema = z.object({
  contentType: z.string().min(1, 'Content type name is required'),
  format: ToolFormatSchema.default('string'),
  filters: z.array(EntryFilterSchema).default([]),
  listTool: ListToolConfigSchema.optional(),
  includeMetadataTool: z.boolean().default(false),
  defaultTool: DefaultToolConfigSchema.optional(),
  tools: z.array(ToolConfigSchema).default([]),
});

export type EntryConfig = z.infer<typeof EntryConfigSchema>;

/**
 * Top-level output configuration stored at <output>/config.json
 */
export const OutputConfigSchema = z.object({
  source: z.enum(['contentful']).nullable(),
});

export type OutputConfig = z.infer<typeof OutputConfigSchema>;

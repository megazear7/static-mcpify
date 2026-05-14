import type { EntryFilter } from '../../../types/index.js';
import { createClient } from 'contentful';
import type { Entry, Asset } from 'contentful';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import fs from 'fs/promises';
import path from 'path';
import type { SourceAdapter, SourceEntry } from '../adapter.js';

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Safely serialize a value to a JSON-compatible structure,
 * replacing circular references and stripping resolved linked entries
 * down to their sys metadata.
 */
function safeClone(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  const obj = value as Record<string, unknown>;

  // Detect circular references
  if (seen.has(obj)) return '[Circular]';
  seen.add(obj);

  // If this is a resolved Contentful entry/asset (has sys.type === 'Entry' or 'Asset'),
  // flatten it to avoid deep circular nesting
  if (obj.sys && typeof obj.sys === 'object') {
    const sys = obj.sys as Record<string, unknown>;
    if (sys.type === 'Entry') {
      return {
        sys: { id: sys.id, type: sys.type, contentType: sys.contentType },
        title: obj.fields && typeof obj.fields === 'object'
          ? ((obj.fields as Record<string, unknown>).title ??
             (obj.fields as Record<string, unknown>).name ??
             sys.id)
          : sys.id,
      };
    }
    if (sys.type === 'Asset') {
      const fields = obj.fields as Record<string, unknown> | undefined;
      return {
        sys: { id: sys.id, type: sys.type },
        title: fields?.title,
        file: fields?.file ? safeClone(fields.file, seen) : undefined,
      };
    }
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => safeClone(item, seen));
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    result[key] = safeClone(val, seen);
  }
  return result;
}

function isRichTextField(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'nodeType' in value &&
    (value as Record<string, unknown>).nodeType === 'document'
  );
}

function isAssetLink(value: unknown): value is { sys: { type: string; linkType: string; id: string } } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'sys' in value &&
    (value as Record<string, unknown>).sys !== undefined &&
    typeof (value as Record<string, Record<string, unknown>>).sys === 'object' &&
    (value as Record<string, Record<string, unknown>>).sys.linkType === 'Asset'
  );
}

function extractAssetRefs(
  fields: Record<string, unknown>,
  includes: Map<string, Asset>
): Array<{ fileName: string; url: string }> {
  const assets: Array<{ fileName: string; url: string }> = [];
  const seen = new Set<string>();

  function walk(val: unknown): void {
    if (Array.isArray(val)) {
      val.forEach(walk);
      return;
    }
    if (typeof val !== 'object' || val === null) return;

    if (isAssetLink(val)) {
      const id = val.sys.id;
      const asset = includes.get(id);
      if (asset && asset.fields.file && !seen.has(id)) {
        seen.add(id);
        const file = asset.fields.file as Record<string, unknown>;
        const fileName = file.fileName as string;
        let url = file.url as string;
        if (url.startsWith('//')) url = `https:${url}`;
        assets.push({ fileName, url });
      }
      return;
    }

    // Walk rich text nodes
    const obj = val as Record<string, unknown>;
    if (obj.content && Array.isArray(obj.content)) {
      obj.content.forEach(walk);
    }
    if (obj.data && typeof obj.data === 'object') {
      const data = obj.data as Record<string, unknown>;
      if (data.target) walk(data.target);
    }
  }

  for (const value of Object.values(fields)) {
    walk(value);
  }

  return assets;
}

function normalizeTableHtmlForMarkdown(html: string): string {
  return html
    .replace(/<th>(?:\s|&nbsp;|<p>\s*<\/p>)*<\/th>/g, '<th>&nbsp;</th>')
    .replace(/<td>(?:\s|&nbsp;|<p>\s*<\/p>)*<\/td>/g, '<td>&nbsp;</td>');
}

export function richTextDocumentToMarkdown(
  value: Parameters<typeof documentToHtmlString>[0]
): string {
  const html = documentToHtmlString(value);
  return NodeHtmlMarkdown.translate(normalizeTableHtmlForMarkdown(html));
}

function fieldToMarkdown(key: string, value: unknown): string {
  if (value === null || value === undefined) return '';

  if (isRichTextField(value)) {
    try {
      const md = richTextDocumentToMarkdown(
        value as Parameters<typeof documentToHtmlString>[0]
      );
      return `## ${key}\n\n${md}\n\n`;
    } catch {
      return `## ${key}\n\n[Rich text conversion failed]\n\n`;
    }
  }

  if (typeof value === 'string') {
    return `## ${key}\n\n${value}\n\n`;
  }

  if (Array.isArray(value)) {
    const items = value.map((v) => (typeof v === 'string' ? v : JSON.stringify(safeClone(v))));
    return `## ${key}\n\n${items.map((i) => `- ${i}`).join('\n')}\n\n`;
  }

  if (typeof value === 'object') {
    return `## ${key}\n\n\`\`\`json\n${JSON.stringify(safeClone(value), null, 2)}\n\`\`\`\n\n`;
  }

  return `## ${key}\n\n${String(value)}\n\n`;
}

function fieldToStructuredContent(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (isRichTextField(value)) {
    try {
      return richTextDocumentToMarkdown(
        value as Parameters<typeof documentToHtmlString>[0]
      );
    } catch {
      return '[Rich text conversion failed]';
    }
  }

  if (typeof value !== 'object') {
    return value;
  }

  return safeClone(value);
}

export class ContentfulAdapter implements SourceAdapter {
  private client;

  constructor() {
    const token = process.env.CONTENTFUL_API_TOKEN;
    const spaceId = process.env.SPACE_ID;

    if (!token) {
      throw new Error(
        'CONTENTFUL_API_TOKEN environment variable is not set.\n' +
          'Set it in your .env file or export it in your shell.'
      );
    }

    if (!spaceId) {
      throw new Error(
        'SPACE_ID environment variable is not set.\n' +
          'Set it in your .env file or export it in your shell.'
      );
    }

    this.client = createClient({ space: spaceId, accessToken: token });
  }

  async fetchEntries(contentType: string, filters: EntryFilter[] = []): Promise<SourceEntry[]> {
    const response = await this.client.getEntries({
      content_type: contentType,
      limit: 1000,
      include: 2,
      ...buildContentfulFilterQuery(filters),
    });

    // Build asset map from includes
    const assetMap = new Map<string, Asset>();
    if (response.includes?.Asset) {
      for (const asset of response.includes.Asset) {
        assetMap.set(asset.sys.id, asset as Asset);
      }
    }

    return response.items.map((entry: Entry) => {
      const fields = entry.fields as Record<string, unknown>;
      const title =
        (fields.title as string) ||
        (fields.name as string) ||
        (fields.slug as string) ||
        entry.sys.id;
      const slug = toSlug(title);

      // Build data.json: all fields except rich text, with safe serialization
      const data: Record<string, unknown> = {
        id: entry.sys.id,
        contentType,
        title,
        createdAt: entry.sys.createdAt,
        updatedAt: entry.sys.updatedAt,
      };
      for (const [key, value] of Object.entries(fields)) {
        if (!isRichTextField(value)) {
          data[key] = safeClone(value);
        }
      }

      // Extract asset references
      const referencedAssets = extractAssetRefs(fields, assetMap);

      return {
        title,
        slug,
        data,
        fields,
        referencedAssets,
      };
    });
  }

  buildToolMarkdown(entry: SourceEntry, fieldNames: string[]): string {
    let markdown = `# ${entry.title}\n\n`;
    for (const fieldName of fieldNames) {
      const value = entry.fields[fieldName];
      if (value !== undefined) {
        markdown += fieldToMarkdown(fieldName, value);
      }
    }
    return markdown;
  }

  buildToolStructuredContent(entry: SourceEntry, fieldNames: string[]): Record<string, unknown> {
    const structuredContent: Record<string, unknown> = {};

    for (const fieldName of fieldNames) {
      const value = entry.fields[fieldName];
      if (value !== undefined) {
        structuredContent[fieldName] = fieldToStructuredContent(value);
      }
    }

    return structuredContent;
  }

  async downloadAsset(url: string, destPath: string): Promise<void> {
    const dir = path.dirname(destPath);
    await fs.mkdir(dir, { recursive: true });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download asset from ${url}: ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(destPath, buffer);
  }
}

function buildContentfulFilterQuery(filters: EntryFilter[]): Record<string, string> {
  return Object.fromEntries(filters.map((filter) => buildContentfulFilterParam(filter)));
}

function buildContentfulFilterParam(filter: EntryFilter): [string, string] {
  const fieldName = filter.field.startsWith('fields.') || filter.field.startsWith('sys.')
    ? filter.field
    : `fields.${filter.field}`;

  switch (filter.operator) {
    case 'equals':
      return [fieldName, filter.value as string];
    case 'notEquals':
      return [`${fieldName}[ne]`, filter.value as string];
    case 'exists':
      return [`${fieldName}[exists]`, 'true'];
    case 'in':
      return [`${fieldName}[in]`, (filter.value as string[]).join(',')];
    case 'match':
      return [`${fieldName}[match]`, filter.value as string];
  }
}

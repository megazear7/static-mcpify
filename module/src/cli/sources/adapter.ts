import type { EntryFilter } from '../../types/index.js';

/**
 * Source adapter interface.
 * Implement this to add support for new content sources.
 */
export interface SourceEntry {
  /** Original title of the entry */
  title: string;
  /** Slugified title for use as directory name */
  slug: string;
  /** Entry data (all fields except rich text, for data.json) */
  data: Record<string, unknown>;
  /** All field values keyed by field ID (including rich text, for tool markdown) */
  fields: Record<string, unknown>;
  /** Referenced assets */
  referencedAssets: Array<{
    fileName: string;
    url: string;
  }>;
}

export interface SourceAdapter {
  /** Fetch all entries for a given content type */
  fetchEntries(contentType: string, filters?: EntryFilter[]): Promise<SourceEntry[]>;

  /** Build markdown content from an entry for the given fields */
  buildToolMarkdown(entry: SourceEntry, fields: string[]): string;

  /** Build structured JSON content from an entry for the given fields */
  buildToolStructuredContent(entry: SourceEntry, fields: string[]): Record<string, unknown>;

  /** Download an asset to a local path */
  downloadAsset(url: string, destPath: string): Promise<void>;
}

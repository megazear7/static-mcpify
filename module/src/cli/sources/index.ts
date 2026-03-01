import type { SourceAdapter } from './adapter.js';
import { ContentfulAdapter } from './contentful/index.js';

const adapters: Record<string, () => SourceAdapter> = {
  contentful: () => new ContentfulAdapter(),
};

export function getSourceAdapter(source: string): SourceAdapter {
  const factory = adapters[source];
  if (!factory) {
    throw new Error(
      `Unknown source: "${source}".\nSupported sources: ${Object.keys(adapters).join(', ')}`
    );
  }
  return factory();
}

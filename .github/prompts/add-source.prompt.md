---
description: Add a new content source adapter
---

# Add a New Source Adapter

To add a new content source (e.g., Sanity, Strapi, WordPress):

1. Create a new directory: `src/cli/sources/<source-name>/`
2. Implement the `SourceAdapter` interface from `src/cli/sources/adapter.ts`
3. Register the adapter in `src/cli/sources/index.ts`
4. Add `<source-name>` to the `OutputConfigSchema` source enum in `src/types/config.ts`
5. Update the init command if the new source needs special setup
6. Add tests and update documentation

## Example Implementation

```typescript
import type { SourceAdapter, SourceEntry } from '../adapter.js';

export class MySourceAdapter implements SourceAdapter {
  async fetchEntries(contentType: string): Promise<SourceEntry[]> {
    // Fetch from your CMS and return SourceEntry array
  }

  buildToolMarkdown(entry: SourceEntry, fields: string[]): string {
    // Convert entry fields to markdown
  }

  async downloadAsset(url: string, destPath: string): Promise<void> {
    // Download asset to local filesystem
  }
}
```

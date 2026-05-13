import assert from 'node:assert/strict';

import { richTextDocumentToMarkdown } from '../module/src/cli/sources/contentful/index.ts';

const tableDocument = {
  nodeType: 'document',
  data: {},
  content: [
    {
      nodeType: 'table',
      data: {},
      content: [
        {
          nodeType: 'table-row',
          data: {},
          content: [
            {
              nodeType: 'table-header-cell',
              data: {},
              content: [{ nodeType: 'paragraph', data: {}, content: [] }],
            },
            {
              nodeType: 'table-header-cell',
              data: {},
              content: [
                {
                  nodeType: 'paragraph',
                  data: {},
                  content: [{ nodeType: 'text', value: 'Skill', marks: [], data: {} }],
                },
              ],
            },
            {
              nodeType: 'table-header-cell',
              data: {},
              content: [
                {
                  nodeType: 'paragraph',
                  data: {},
                  content: [{ nodeType: 'text', value: 'Damage', marks: [], data: {} }],
                },
              ],
            },
            {
              nodeType: 'table-header-cell',
              data: {},
              content: [
                {
                  nodeType: 'paragraph',
                  data: {},
                  content: [{ nodeType: 'text', value: 'Health', marks: [], data: {} }],
                },
              ],
            },
          ],
        },
        {
          nodeType: 'table-row',
          data: {},
          content: [
            {
              nodeType: 'table-cell',
              data: {},
              content: [
                {
                  nodeType: 'paragraph',
                  data: {},
                  content: [{ nodeType: 'text', value: 'Minion', marks: [], data: {} }],
                },
              ],
            },
            {
              nodeType: 'table-cell',
              data: {},
              content: [
                {
                  nodeType: 'paragraph',
                  data: {},
                  content: [{ nodeType: 'text', value: '1', marks: [], data: {} }],
                },
              ],
            },
            {
              nodeType: 'table-cell',
              data: {},
              content: [
                {
                  nodeType: 'paragraph',
                  data: {},
                  content: [{ nodeType: 'text', value: '0', marks: [], data: {} }],
                },
              ],
            },
            {
              nodeType: 'table-cell',
              data: {},
              content: [
                {
                  nodeType: 'paragraph',
                  data: {},
                  content: [{ nodeType: 'text', value: '1d6+1', marks: [], data: {} }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const;

const markdown = richTextDocumentToMarkdown(tableDocument);

assert.ok(markdown.includes('|        | Skill | Damage | Health |'));
assert.ok(markdown.includes('| Minion | 1     | 0      | 1d6+1  |'));

console.log('Contentful markdown regression test passed');
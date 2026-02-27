---
description: Commit changes after checking build and linting
---

# Commit Changes

Before committing, verify the build and linting pass:

1. Run TypeScript compilation: `npm run build:ts`
2. Run ESLint: `npm run lint`
3. If there are lint errors that can be auto-fixed, run: `npm run fix`
4. If the build and lint both pass with no issues, stage all changes and commit
5. Only ask for human confirmation if:
   - There are TypeScript errors that cannot be auto-resolved
   - There are lint warnings that look intentional and need review
   - There are uncommitted changes that look like debugging code (console.log, TODO, FIXME, HACK)
   - There are changes to sensitive files (.env, credentials, secrets)

## Steps

```bash
# 1. Build check
npm run build:ts

# 2. Lint check  
npm run lint

# 3. If lint issues exist, try auto-fix
npm run fix

# 4. Stage and commit
git add -A
git commit -m "<descriptive commit message based on changes>"
```

Write a clear, conventional commit message based on what changed. Use the format:
- `feat: ...` for new features
- `fix: ...` for bug fixes
- `refactor: ...` for code restructuring
- `docs: ...` for documentation changes
- `chore: ...` for tooling/config changes
- `style: ...` for formatting changes

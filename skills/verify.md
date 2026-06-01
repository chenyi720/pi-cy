---
name: verify
description: Verify that changes work correctly by running tests and checks
---
# Verify Changes

After making code changes, verify they work correctly:

1. Run TypeScript type checking: `npx tsc --noEmit`
2. Run linter: `npm run lint`
3. Run tests if available: `npm test`
4. Build the project: `npm run build`

Report any errors found and fix them before considering the task complete.

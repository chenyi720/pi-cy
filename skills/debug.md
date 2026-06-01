---
name: debug
description: Systematic debugging workflow for finding and fixing bugs
---
# Debugging Workflow

When encountering a bug or error:

1. **Reproduce**: Confirm the bug can be reproduced consistently
2. **Isolate**: Narrow down the problem to the smallest possible code area
3. **Investigate**: Read the relevant code and understand the expected behavior
4. **Hypothesize**: Form theories about what might be wrong
5. **Test**: Verify your hypothesis by testing or adding logging
6. **Fix**: Implement the fix
7. **Verify**: Confirm the fix works and doesn't break anything else

Always check:
- Error messages and stack traces
- Recent changes (git log)
- Similar patterns in the codebase
- Documentation for the APIs being used

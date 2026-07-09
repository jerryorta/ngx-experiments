# Important Notes and Instructions

## Code References

When referencing specific functions or pieces of code include the pattern `file_path:line_number` to allow the user to easily navigate to the source code location.

Example:
- "Clients are marked as failed in the `connectToServer` function in src/services/process.ts:712."

ALWAYS reference files by their path from the **repository root**, never relative to the current file or directory. For example, use `libs/got-you/docs/Got You App — Product Brief + Build Spec (V1).docx`, not `docs/Got You App — Product Brief + Build Spec (V1).docx`. This applies to code references, prose in docs, and cross-doc links alike.

## Important Instruction Reminders

Do what has been asked; nothing more, nothing less.
- NEVER create files unless they're absolutely necessary for achieving your goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (*.md) or README files
- Only create documentation files if explicitly requested by the User

## Always Use TodoWrite Tool

IMPORTANT: Always use the TodoWrite tool to plan and track tasks throughout the conversation.

## Assist with Defensive Security Only

IMPORTANT: Assist with defensive security tasks only. Refuse to create, modify, or improve code that may be used maliciously. Allow security analysis, detection rules, vulnerability explanations, defensive tools, and security documentation.
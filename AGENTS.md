# Agent Instructions for DataRover

## Build & Test Commands

- `bun run dev` - Start dev server on port 3000
- `bun run build` - Build for production
- `bun run test` - Run all tests with Vitest
- `bun run test <path/to/test>` - Run a single test file
- `vitest run <path/to/test>` - Run single test once
- `vitest <path/to/test>` - Run single test in watch mode

## Tech Stack

- TypeScript (strict mode enabled) + React 19 + Vite
- TanStack Router + TanStack Start for routing
- Drizzle ORM + Neon (PostgreSQL) for database
- Supabase for file storage
- Zustand for state management
- TailwindCSS v4 for styling
- Zod for validation
- Bun for package management and build tools

## Code Style Guidelines

### Imports & Path Aliases

- Use path alias `@/` for imports from src directory
- Group imports: third-party, then local, starting with `@/` imports
- Example: `import { createServerFn } from "@tanstack/react-start"; import { db } from "./db.server"; import { workspacesTable } from "@/db/schema";`

### Component Conventions

- Route components: Named export `export const Route = createFileRoute("/path")({ component: App });`
- Regular components: Default export `export default function ComponentName() {}`
- Component props: Type interface or inline type, e.g., `{ children: React.ReactNode; size: number; minSize?: number; }`
- Use React.ReactNode for children prop
- State management: Prefer useState for local state, Zustand for shared state

### Server-Side Code

- Server-side utilities and functions end with `.server.ts` suffix
- Server functions use `createServerFn` with `method` and `inputValidator`
- Validate inputs with Zod schemas
- Return consistent error shape: `{ success: boolean; data?: T; error?: { message: string }; }`
- Use try/catch in handlers with proper error instanceof Error checks

### Database & Drizzle ORM

- Schema file: `src/db/schema.ts`
- Table definitions: `export const tableName = pgTable("snake_case_table", { column: type("snake_case_column") });`
- Database client: Import from `./db.server`
- Use Drizzle relations for relationships
- Query patterns: `await db.select().from(table).where(eq(table.id, id))`

### Types & Interfaces

- Use `interface` for object shapes with properties
- Use `type` for unions, primitives, and utility types
- Export types at top of files when used by other modules
- Example: `export interface FilePreview { fileName: string; fileType: FileType; columns: string[]; rows: PreviewRow[]; }`

### Error Handling

- Use try/catch blocks for async operations
- Check error instanceof Error for proper typing
- Console.error only for debugging; don't log sensitive data
- Return error objects with user-friendly messages

### Naming Conventions

- Components: PascalCase (`Header`, `PromptBox`)
- Functions: camelCase (`uploadFile`, `writeFileToDB`)
- Variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Database tables: camelCase variable with snake_case columns
- Database relations: `tableName` + "Relations" pattern

### File Organization

- `src/routes/` - File-based routing with TanStack Router
- `src/components/` - Reusable UI components
- `src/utils/` - Utility functions, `.server.ts` for server-side
- `src/store/` - Zustand stores
- `src/db/` - Database schema and related code
- `src/hooks/` - Custom React hooks
- `src/types/` - Shared TypeScript types
- Auto-generated file: `routeTree.gen.ts` (read-only, excluded from git)

### Route Structure

- `_authed.tsx` - Layout wrapper for authenticated routes
- `_authed/workspace/` - Authenticated workspace routes
- Use `$param` syntax for dynamic segments (e.g., `$slug.tsx`)

### Zustand Store Pattern

- Define type interface with sections: data, ui state, actions
- Export store hook: `export const useStoreName = create<StoreType>((set) => ({ ... }));`
- Separate state from actions, include reset function

### Styling

- Use TailwindCSS v4 utility classes
- Responsive design with `md:` and `lg:` prefixes
- Use custom colors from theme (primary, neutral, neutral-strong)
- Transition classes: `transition-all duration-300 hover:...`

## Special Files

- `.vscode/settings.json` - Excludes routeTree.gen.ts from search/watcher
- `drizzle.config.ts` - Drizzle ORM configuration
- `tsconfig.json` - TypeScript strict mode with path aliases configured
- No explicit linting/formatting configs - follow TypeScript strict mode conventions

## AI SDK Integration

- Use `createServerFn` for AI chat endpoints with `stream` response
- Chat streaming: Parse JSON chunks with type区分 (reasoning vs content)
- Use `requestAnimationFrame` for batched UI updates during streaming
- Conversation stores track: id, messages, current stream state
- Placeholder messages use `temp-${Date.now()}` format for optimistic updates
- Handle streaming errors gracefully with fallback to plain content parsing

## File Handling

- Parse CSV/Excel with SheetJS (xlsx library)
- Preview limits: max 2000 rows for data previews
- File type detection: check both mime type and file extension
- Supabase storage bucket: `datafiles` with path `data/{workspaceId}`
- Always return consistent shape: `{ fileName, fileType, columns, rows, totalPreviewRows }`

## Performance Patterns

- Use `React.memo()` for expensive components (e.g., PromptBox)
- `useCallback` for callback functions passed to server functions
- `useRef` for direct DOM manipulation (textarea auto-resize)
- Zustand stores: separate data, UI state, and actions
- Include reset function in every store for cleanup

## Git Workflow

- Create feature branches for new functionality
- Squash commits before merging when appropriate
- Write clear commit messages: "add X feature", "fix Y bug", "refactor Z component"
- Run tests before committing with `bun run test`
- Never commit secrets, .env files, or credentials

## Testing

- Place tests alongside source files: `component.tsx` → `component.test.tsx`
- Use `@testing-library/react` for component tests
- Mock server functions with `vi.mock()` for isolated testing
- Test error boundaries and loading states
- Use `bun run test --watch` for TDD during development

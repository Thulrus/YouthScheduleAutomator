# GitHub Copilot Instructions for Youth Scheduler

## Project Overview

Youth Scheduler is a deterministic scheduling application built with React + TypeScript + Vite. It helps youth organizations manage leader assignments and recurring events with configurable rules and multiple export formats.

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: CSS (vanilla, no framework)
- **State Management**: React useState (no external state library)
- **Data Format**: YAML for user input, JSON for import/export
- **Deployment**: GitHub Pages (static hosting)

## Project Structure

```
src/
  ├── App.tsx              # Main application component with UI
  ├── App.css              # Application-specific styles
  ├── index.css            # Global styles
  ├── main.tsx             # React entry point
  ├── models.ts            # Core data models (Leader, Group, Event, Assignment, Schedule)
  ├── scheduler.ts         # Main scheduling logic with state continuity
  ├── strategies.ts        # Assignment strategies (round-robin, weighted, random)
  ├── rules.ts             # Event rule parsing and date generation
  └── exporters.ts         # Export functions (Markdown, CSV, iCalendar)

public/
  ├── example-people.json  # Sample leaders and groups configuration
  └── example-rules.json   # Sample recurring event rules

doc/
  ├── AI/                  # AI-generated summary and technical documents
  │   ├── DETERMINISM.md
  │   ├── DETERMINISM_EXAMPLE.md
  │   └── ... (other AI summaries)
  └── ... (user-facing docs at root)
```

## Key Architecture Principles

### 1. Deterministic Scheduling

**Critical**: The scheduler is fully deterministic. Same inputs = same outputs, always.

- All strategies (round-robin, weighted, random) produce reproducible results
- Random strategy uses seeded RNG based on event date (not Math.random())
- State continuity is supported via `SchedulerState` interface
- Never introduce non-deterministic elements (timestamps, random IDs, etc.)

### 2. State Continuity

The scheduler supports chaining schedules across time periods:

```typescript
// Generate January
const janSchedule = buildSchedule(...);
const janState = getSchedulerState(janSchedule);

// Generate February with January's final state
const febSchedule = buildSchedule(..., janState);
```

This ensures Feb assignments consider Jan's assignment counts.

### 3. Data Flow

1. User inputs YAML in UI → parsed by `js-yaml`
2. Raw config → parsed by `parseRules()` → `RecurringRule[]`
3. Rules + date range → `expandEvents()` → `Event[]`
4. Events + leaders + strategy → `buildSchedule()` → `Schedule`
5. Schedule → display in UI or export via `exporters.ts`

### 4. UI Components

- Single-page app with tab-based configuration
- Card-based schedule preview (default) with table view toggle
- Form controls for date range (start date + duration), timezone dropdown, strategy selection
- LocalStorage for configuration persistence
- No external component libraries (vanilla React)

## Code Style Guidelines

### TypeScript

- Use explicit types for function parameters and return values
- Prefer interfaces over type aliases for object shapes
- Use `Map` for key-value collections when keys aren't known at compile time
- Avoid `any` - use specific types or `unknown` with type guards

### React

- Functional components with hooks (no class components)
- `useState` for component state
- Keep components in App.tsx (no separate component files unless needed)
- Use controlled components for forms

### Naming Conventions

- Components: PascalCase (`SchedulePreview`)
- Functions: camelCase (`buildSchedule`, `formatDate`)
- Constants: SCREAMING_SNAKE_CASE (`TIMEZONES`, `DEFAULT_LEADERS`)
- Files: kebab-case or camelCase (`scheduler.ts`, `App.tsx`)

### CSS

- BEM-like naming: `.component-element` (e.g., `.assignment-card`, `.card-header`)
- Responsive design with mobile-first approach
- Light/dark mode support via `@media (prefers-color-scheme)`
- No CSS frameworks - keep styles maintainable and minimal

## Important Implementation Details

### Date Handling

- All dates stored as JavaScript `Date` objects internally
- ISO format strings (`YYYY-MM-DD`) for user input/display
- Timezone-aware exports (iCalendar uses specified timezone)
- Week starts on Monday (weekday 0=Mon, 6=Sun internally)

### Scheduler State

- `leaderAssignments: Map<string, number>` - tracks assignment counts per leader
- `groupRotations: Map<string, number>` - tracks rotation position per pool
- State attached to Schedule object via `(schedule as any).finalState`
- Extract with `getSchedulerState(schedule)` for chaining

### Assignment Strategies

1. **Round-Robin**: Sorts by assignment count, selects least-assigned first
2. **Weighted**: Sorts by weight (desc), then by assignment count (asc)
3. **Random**: Deterministic shuffle using seeded RNG from event date

All strategies:
- Filter for eligible leaders (matching groups + availability)
- Update state (increment assignment counts)
- Return leader names as string array

### Export Formats

- **Markdown**: Table format with date, kind, in-charge, description
- **CSV**: Same columns, RFC 4180 compliant
- **iCalendar (.ics)**: Full VEVENT format with timezone support

## Development Workflow

### Local Development

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (port 5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint check
```

### Testing

- Manual testing via UI
- `test-determinism.ts` for verifying scheduler determinism
- Run with: `npx tsx test-determinism.ts`

### Deployment

- Automatic via GitHub Actions on push to main
- Deploys to GitHub Pages: https://Thulrus.github.io/YouthScheduleAutomator/
- Base path configured in vite.config.ts

## Documentation Guidelines

### User-Facing Documentation

Keep in root directory:
- `README.md` - Main project documentation
- `QUICKSTART.md` - Getting started guide
- `CONFIG_FORMAT.md` - Configuration file format
- `CONTRIBUTING.md` - Contribution guidelines
- `CODE_OF_CONDUCT.md` - Community standards
- `LICENSE` - Project license

### AI-Generated Documentation

**Always place in `doc/AI/` directory:**
- Summary documents from major changes
- Technical deep-dives
- Migration guides
- Architecture decision records
- Any AI-generated analysis or planning documents

This keeps the root clean and separates living docs from historical summaries.

## Common Tasks

### Adding a New Export Format

1. Add export function to `src/exporters.ts`
2. Add button in App.tsx export section
3. Handle file download via Blob + URL.createObjectURL
4. Update README with new format

### Adding a New Assignment Strategy

1. Create class implementing `AssignmentStrategy` in `src/strategies.ts`
2. Ensure deterministic behavior (no Math.random()!)
3. Add to `getStrategy()` switch statement
4. Add option to strategy dropdown in App.tsx
5. Update StrategyName type

### Modifying Date Range Logic

1. Update `calculateEndDate()` function in App.tsx
2. Add new duration options to `ScheduleDuration` type
3. Update dropdown options in JSX
4. Ensure backward compatibility with saved configs

## Testing Your Changes

Before committing:

1. ✅ Test in dev server (`npm run dev`)
2. ✅ Run linter (`npm run lint`)
3. ✅ Test production build (`npm run build && npm run preview`)
4. ✅ Verify determinism if touching scheduler logic (`npx tsx test-determinism.ts`)
5. ✅ Test both light and dark modes
6. ✅ Test on mobile viewport (responsive design)

## Things to Avoid

❌ Don't use Math.random() - breaks determinism
❌ Don't use timestamps/Date.now() for IDs - breaks determinism
❌ Don't add large dependencies - keep bundle size small
❌ Don't change file structure without updating this doc
❌ Don't put AI summaries in root - use doc/AI/
❌ Don't break backward compatibility with saved configs
❌ Don't use external state management - React state is sufficient

## Shell

The systems where this project is developed use the fish shell, rather than bash or zsh. Please ensure any shell commands or scripts you write are compatible with fish syntax.

## Questions?

- Check existing documentation in root directory
- Review similar code in the project for patterns
- Test thoroughly - determinism is critical
- When in doubt, ask before making breaking changes

---

**Remember**: This is a scheduling tool where reliability and reproducibility are paramount. Every change should maintain deterministic behavior and backward compatibility.

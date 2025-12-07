# Youth Scheduler: Schedule File & Editor Redesign Plan

## Executive Summary

This document outlines a comprehensive redesign of the Youth Scheduler application to support a new workflow centered around **Schedule Files** — persistent, editable documents that contain both the configuration (rules, leaders, groups) and the generated schedule data. This enables viewing, editing, regenerating, and exporting schedules as first-class operations.

---

## Current vs. Proposed Workflow

### Current Workflow
```
[Configure] → [Generate] → [Export] → Done
     ↑            ↓
     └── Repeat ──┘
```
- Single-page app with all configuration inline
- Generate schedule from scratch each time
- Export immediately, no persistence of schedule data
- Config saved to localStorage, schedule is ephemeral

### Proposed Workflow
```
                    ┌─────────────────────────────────────┐
                    │         SCHEDULE FILE (.ysch)       │
                    │  - Leaders, Groups, Rules (config)  │
                    │  - Generated assignments (data)     │
                    │  - Scheduler state (continuity)     │
                    │  - Edit history (optional)          │
                    └─────────────────────────────────────┘
                              ↑           ↓
    [New Schedule] ──────────→│           │←────── [Open File]
                              │           │
                              ↓           ↓
                    ┌─────────────────────────────────────┐
                    │         SCHEDULE EDITOR VIEW        │
                    │  - View all assignments             │
                    │  - Edit individual assignments      │
                    │  - Regenerate (full or partial)     │
                    │  - Export (full or date range)      │
                    │  - Save changes                     │
                    └─────────────────────────────────────┘
```

---

## Schedule File Format (`.ysch`)

### File Extension
`.ysch` (Youth SCHedule) — a JSON file with a specific schema.

### Schema Design

```typescript
interface ScheduleFile {
  // Metadata
  version: '2.0.0';
  name: string;                    // User-friendly name for this schedule
  createdAt: string;               // ISO timestamp
  modifiedAt: string;              // ISO timestamp
  
  // Configuration (inputs for generation)
  config: {
    leaders: Leader[];
    groups: Group[];
    rules: RecurringRule[];        // Raw rule definitions
    randomSeed: number;
    timezone: string;
  };
  
  // Generated Data
  schedule: {
    dateRangeStart: string;        // ISO date
    dateRangeEnd: string;          // ISO date
    assignments: SerializedAssignment[];
    
    // Scheduler state for regeneration continuity
    schedulerState: {
      leaderAssignments: Record<string, number>;
      groupRotations: Record<string, number>;
      youthAssignments: Record<string, number>;
    };
  };
  
  // Edit Tracking (optional)
  edits?: ScheduleEdit[];
}

interface SerializedAssignment {
  id: string;                      // Unique ID for each assignment (deterministic: date + description hash)
  date: string;                    // ISO date string
  kind: 'combined' | 'separate';
  description: string;
  leaders: string[];
  responsibleGroup?: string;
  startTime?: string;
  durationMinutes?: number;
  youthAssignments?: YouthAssignment[];
  groupAssignments?: GroupAssignment[];
  
  // Edit metadata
  isManuallyEdited: boolean;       // True if user manually changed this
  originalLeaders?: string[];      // For tracking what was auto-generated
  editNotes?: string;              // User notes about why they edited
}

interface ScheduleEdit {
  id: string;
  timestamp: string;
  assignmentId: string;
  type: 'leader-swap' | 'leader-add' | 'leader-remove' | 'youth-swap' | 'group-change' | 'full-edit';
  before: Partial<SerializedAssignment>;
  after: Partial<SerializedAssignment>;
  reason?: string;
}
```

### Why This Design?

1. **Self-Contained**: Everything needed to understand and regenerate the schedule is in one file
2. **Versioned**: The `version` field allows future format evolution
3. **Auditable**: Edit history tracks manual changes
4. **Portable**: JSON is human-readable and easy to work with
5. **Deterministic**: Scheduler state enables exact reproduction of generation

---

## Application Architecture

### Multi-View Application Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                        HEADER BAR                                │
│  [New] [Open] [Save] [Save As]  |  Schedule Name  |  [Settings] │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ↓                           ↓
    ┌───────────────────┐      ┌─────────────────────────────────┐
    │    SIDEBAR        │      │         MAIN CONTENT             │
    │                   │      │                                   │
    │  [📋 Schedule]    │      │  (Active view content)            │
    │  [👥 Leaders]     │      │                                   │
    │  [🏷️ Groups]      │      │                                   │
    │  [📅 Rules]       │      │                                   │
    │  [📤 Export]      │      │                                   │
    │                   │      │                                   │
    │  ─────────────    │      │                                   │
    │  Quick Actions:   │      │                                   │
    │  [Regenerate]     │      │                                   │
    │  [Find & Replace] │      │                                   │
    └───────────────────┘      └─────────────────────────────────┘
```

### Views/Modes

1. **Welcome/Home View** (no file open)
   - Create new schedule
   - Open recent schedules
   - Import from legacy config

2. **Schedule View** (main view when file is open)
   - Calendar or list view of all assignments
   - Click to select/edit assignments
   - Filter by date range, group, leader
   - Bulk actions

3. **Leaders View** (configuration)
   - Edit leaders, weights, availability
   - See assignment statistics per leader

4. **Groups View** (configuration)
   - Edit groups and members
   - See rotation statistics

5. **Rules View** (configuration)
   - Edit recurring rules
   - Preview affected dates

6. **Export View**
   - Select date range
   - Choose format
   - Preview before export

---

## Schedule Editor Interface

### Main Schedule View

```
┌─────────────────────────────────────────────────────────────────────┐
│  SCHEDULE: "2025 Youth Activities"                                   │
│  Jan 2025 - Dec 2025  |  127 Events  |  Last saved: 2 min ago       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🔍 [Search...]  📅 [Date Range ▼]  👥 [Leader ▼]  🏷️ [Group ▼]     │
│                                                                      │
│  ☐ Select All  |  With selected: [Reassign ▼] [Delete]              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  📅 Sun, Jan 5, 2025                                         │    │
│  │  Combined Event - "Sunday Meeting"                           │    │
│  │  ──────────────────────────────────────────────              │    │
│  │  👤 Leaders: John Smith, Jane Doe                            │    │
│  │  🏷️ Responsible Group: Deacons                               │    │
│  │  👦 Youth: Mike → [Tom, Jerry]  |  Jane → [Sally, Bob]       │    │
│  │                                                              │    │
│  │  [Edit] [Swap Leader] [Regenerate This]        ✏️ Edited     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  📅 Wed, Jan 8, 2025                                         │    │
│  │  Separate Event - "Youth Activity Night"                     │    │
│  │  ──────────────────────────────────────────────              │    │
│  │  👤 Deacons: Mark Johnson                                    │    │
│  │  👤 Teachers: Lisa Wilson                                    │    │
│  │                                                              │    │
│  │  [Edit] [Swap Leader] [Regenerate This]                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ... more assignments ...                                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Assignment Edit Modal

```
┌────────────────────────────────────────────────────────────┐
│  EDIT ASSIGNMENT                                      [×]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  📅 Date: Sun, Jan 5, 2025                                 │
│  📝 Description: Sunday Meeting                            │
│  🔄 Type: Combined                                         │
│                                                            │
│  ─────────────────────────────────────────────             │
│                                                            │
│  👤 LEADERS                                                │
│  ┌─────────────────────────────────────────────┐           │
│  │ John Smith      [Remove] [↕ Move]           │           │
│  │ Jane Doe        [Remove] [↕ Move]           │           │
│  └─────────────────────────────────────────────┘           │
│  [+ Add Leader ▼]                                          │
│                                                            │
│  ─────────────────────────────────────────────             │
│                                                            │
│  🏷️ RESPONSIBLE GROUP                                      │
│  [Deacons ▼]                                               │
│                                                            │
│  ─────────────────────────────────────────────             │
│                                                            │
│  💬 EDIT NOTES (optional)                                  │
│  ┌─────────────────────────────────────────────┐           │
│  │ John is out of town this week               │           │
│  └─────────────────────────────────────────────┘           │
│                                                            │
│  ─────────────────────────────────────────────             │
│                                                            │
│       [Cancel]  [Regenerate with Changes]  [Save]          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Quick Swap Modal (One-Click Replacement)

```
┌────────────────────────────────────────────────────────────┐
│  SWAP LEADER                                          [×]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Remove: John Smith (from Jan 5, 2025 - Sunday Meeting)    │
│                                                            │
│  ─────────────────────────────────────────────             │
│                                                            │
│  Replace with:                                             │
│                                                            │
│  ◉ Auto-select (least assigned eligible leader)           │
│     → Suggestion: Mark Johnson (3 assignments)             │
│                                                            │
│  ○ Choose manually:                                        │
│     [Select leader ▼]                                      │
│                                                            │
│  ─────────────────────────────────────────────             │
│                                                            │
│  ☐ Also update future assignments for John Smith           │
│    (Remove from all events after this date)                │
│                                                            │
│       [Cancel]                              [Swap Leader]  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. Smart Leader Replacement

When a leader needs to be replaced:

1. **Auto-Replace Button**: One click finds the best replacement
   - Filters for eligible leaders (matching groups, available on date)
   - Sorts by assignment count (least assigned first)
   - Respects weights if using weighted strategy
   - Deterministic tie-breaking

2. **Manual Replace**: Dropdown of all eligible leaders with assignment stats

3. **Cascade Option**: Apply change to future assignments
   - "Remove John from all events Jan 5 onwards"
   - "Replace John with Mark for events Jan 5 - Jan 31"

### 2. Regeneration Options

```
┌────────────────────────────────────────────────────────────┐
│  REGENERATE SCHEDULE                                  [×]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  What to regenerate:                                       │
│                                                            │
│  ○ Full schedule (all assignments)                         │
│  ○ Date range only:                                        │
│     From: [2025-02-01]  To: [2025-03-31]                   │
│  ○ Unedited assignments only                               │
│     (Keep manually edited assignments unchanged)           │
│                                                            │
│  ─────────────────────────────────────────────             │
│                                                            │
│  Options:                                                  │
│  ☐ Preserve scheduler state from before range              │
│    (Ensures continuity with prior assignments)             │
│  ☐ Clear all edit markers after regeneration               │
│                                                            │
│       [Cancel]                            [Regenerate]     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 3. Date Range Export

```
┌────────────────────────────────────────────────────────────┐
│  EXPORT SCHEDULE                                      [×]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Date Range:                                               │
│  ○ Full schedule (Jan 2025 - Dec 2025)                     │
│  ◉ Custom range:                                           │
│     From: [2025-01-01]  To: [2025-03-31]                   │
│  ○ Specific month: [January 2025 ▼]                        │
│                                                            │
│  ─────────────────────────────────────────────             │
│                                                            │
│  Format:                                                   │
│  ○ Markdown (.md)       - Print-friendly document          │
│  ○ CSV (.csv)           - Spreadsheet compatible           │
│  ○ iCalendar (.ics)     - Calendar import                  │
│  ○ Text (.txt)          - For messaging                    │
│  ○ HTML (.html)         - Web/email format                 │
│                                                            │
│  ─────────────────────────────────────────────             │
│                                                            │
│  [Preview]                                    [Export]     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 4. Find & Replace (Bulk Operations)

```
┌────────────────────────────────────────────────────────────┐
│  FIND & REPLACE                                       [×]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Find assignments where:                                   │
│                                                            │
│  Leader: [John Smith ▼]                                    │
│  Date range: [2025-01-01] to [2025-06-30]                  │
│  Event type: [All ▼]                                       │
│                                                            │
│  ─────────────────────────────────────────────             │
│                                                            │
│  Found: 12 assignments                                     │
│                                                            │
│  Action:                                                   │
│  ○ Remove leader from assignments                          │
│  ◉ Replace with: [Mark Johnson ▼]                          │
│  ○ Replace with auto-selected (least assigned)             │
│                                                            │
│  ─────────────────────────────────────────────             │
│                                                            │
│  Preview:                                                  │
│  ☑ Jan 5 - Sunday Meeting: John Smith → Mark Johnson       │
│  ☑ Jan 12 - Sunday Meeting: John Smith → Mark Johnson      │
│  ☐ Jan 19 - Youth Activity: John Smith (skip)              │
│  ... (8 more)                                              │
│                                                            │
│       [Cancel]              [Apply to Selected (11)]       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 5. Availability Exceptions

Quick way to mark leaders as unavailable for specific dates:

```
┌────────────────────────────────────────────────────────────┐
│  MARK UNAVAILABLE                                     [×]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Leader: [John Smith ▼]                                    │
│                                                            │
│  Unavailable:                                              │
│  ○ Single date: [2025-01-12]                               │
│  ◉ Date range: [2025-01-10] to [2025-01-20]                │
│                                                            │
│  ─────────────────────────────────────────────             │
│                                                            │
│  Affected assignments (2):                                 │
│  • Jan 12 - Sunday Meeting                                 │
│  • Jan 19 - Sunday Meeting                                 │
│                                                            │
│  Auto-replace with:                                        │
│  ◉ Best available leader (auto-select)                     │
│  ○ Specific leader: [Select ▼]                             │
│  ○ Leave unassigned (TBD)                                  │
│                                                            │
│       [Cancel]                  [Apply & Save to Config]   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Foundation (Core Data Layer)

**Files to modify/create:**
- `src/models.ts` - Add `ScheduleFile`, `SerializedAssignment` interfaces
- `src/scheduleFile.ts` (NEW) - File operations (load, save, validate)
- `src/serialization.ts` (NEW) - Convert between runtime and serialized formats

**Tasks:**
1. Define `ScheduleFile` interface with full schema
2. Create serialization functions for `Assignment` ↔ `SerializedAssignment`
3. Create file load/save utilities with validation
4. Generate deterministic assignment IDs
5. Handle version migration for future format changes

### Phase 2: Application Shell

**Files to modify/create:**
- `src/App.tsx` - Refactor into multi-view architecture
- `src/components/` (NEW directory) - Extract components
  - `Header.tsx` - Top bar with file operations
  - `Sidebar.tsx` - Navigation sidebar
  - `WelcomeView.tsx` - Home screen
  - `ScheduleView.tsx` - Main schedule editor
  - `LeadersView.tsx` - Leader configuration
  - `GroupsView.tsx` - Group configuration
  - `RulesView.tsx` - Rule configuration
  - `ExportView.tsx` - Export options
- `src/hooks/` (NEW directory)
  - `useScheduleFile.ts` - State management for open file
  - `useUndoRedo.ts` - Undo/redo functionality

**Tasks:**
1. Create component directory structure
2. Build application shell with sidebar navigation
3. Implement view routing (React state, no router needed)
4. Create header with file operations
5. Build Welcome/Home view

### Phase 3: Schedule View & Editing

**Files to create:**
- `src/components/ScheduleView.tsx`
- `src/components/AssignmentCard.tsx`
- `src/components/AssignmentEditModal.tsx`
- `src/components/QuickSwapModal.tsx`
- `src/components/DateFilter.tsx`

**Tasks:**
1. Build schedule list/card view with filters
2. Create assignment selection (single and multi)
3. Build assignment edit modal
4. Implement quick swap (one-click replacement)
5. Add inline editing for simple changes
6. Implement undo/redo for edit history

### Phase 4: Smart Replacement Logic

**Files to modify/create:**
- `src/scheduler.ts` - Add partial regeneration support
- `src/replacement.ts` (NEW) - Replacement algorithms

**Tasks:**
1. Create `findBestReplacement()` function
2. Implement "regenerate single assignment" maintaining state
3. Add cascade replacement (apply to date range)
4. Handle edge cases (no eligible leaders, etc.)

### Phase 5: Bulk Operations

**Files to create:**
- `src/components/FindReplaceModal.tsx`
- `src/components/MarkUnavailableModal.tsx`
- `src/components/RegenerateModal.tsx`

**Tasks:**
1. Build Find & Replace UI
2. Implement bulk replacement logic
3. Create "Mark Unavailable" workflow
4. Implement partial regeneration (date range, unedited only)

### Phase 6: Export Enhancements

**Files to modify/create:**
- `src/components/ExportView.tsx`
- `src/components/ExportPreviewModal.tsx`
- `src/exporters.ts` - Add date range filtering

**Tasks:**
1. Modify exporters to accept date range parameter
2. Build export UI with date range selection
3. Add export preview functionality
4. Create month/quarter quick-select options

### Phase 7: Polish & Migration

**Tasks:**
1. Add keyboard shortcuts (Ctrl+S save, Ctrl+Z undo, etc.)
2. Implement "unsaved changes" warnings
3. Create migration tool for existing configs
4. Add drag-and-drop file opening
5. Implement "recent files" functionality
6. Add loading states and error handling
7. Update all documentation

---

## File Structure After Redesign

```
src/
├── main.tsx
├── App.tsx                    # Application shell
├── App.css
├── index.css
│
├── models.ts                  # Core data models (enhanced)
├── scheduler.ts               # Scheduling logic (enhanced)
├── strategies.ts              # Assignment strategies
├── rules.ts                   # Rule parsing
├── exporters.ts               # Export functions (enhanced)
├── utils.ts                   # Utilities
│
├── scheduleFile.ts            # NEW: File operations
├── serialization.ts           # NEW: Data serialization
├── replacement.ts             # NEW: Leader/group replacement logic
│
├── hooks/                     # NEW: React hooks
│   ├── useScheduleFile.ts     # File state management
│   ├── useUndoRedo.ts         # Edit history
│   └── useFilters.ts          # Filter state
│
└── components/                # NEW: UI components
    ├── Header.tsx
    ├── Sidebar.tsx
    ├── WelcomeView.tsx
    ├── ScheduleView.tsx
    ├── LeadersView.tsx
    ├── GroupsView.tsx
    ├── RulesView.tsx
    ├── ExportView.tsx
    ├── AssignmentCard.tsx
    ├── AssignmentEditModal.tsx
    ├── QuickSwapModal.tsx
    ├── FindReplaceModal.tsx
    ├── MarkUnavailableModal.tsx
    ├── RegenerateModal.tsx
    ├── ExportPreviewModal.tsx
    └── common/
        ├── Modal.tsx
        ├── Button.tsx
        ├── Select.tsx
        └── DateRangePicker.tsx
```

---

## State Management

### Application State Structure

```typescript
interface AppState {
  // File state
  currentFile: ScheduleFile | null;
  filePath: string | null;           // For "Save" vs "Save As"
  isDirty: boolean;                  // Has unsaved changes
  
  // UI state
  currentView: 'welcome' | 'schedule' | 'leaders' | 'groups' | 'rules' | 'export';
  selectedAssignmentIds: Set<string>;
  filters: {
    dateStart: Date | null;
    dateEnd: Date | null;
    leader: string | null;
    group: string | null;
    eventType: 'all' | 'combined' | 'separate';
    showEdited: 'all' | 'edited' | 'unedited';
  };
  
  // Modal state
  activeModal: ModalType | null;
  modalData: any;
  
  // Edit history
  undoStack: ScheduleFile[];
  redoStack: ScheduleFile[];
}
```

### State Management Approach

Given the project's constraint of using only React `useState` (no external state library), we'll use:

1. **Lifted state** in `App.tsx` for global state
2. **Context** for passing state down without prop drilling
3. **Custom hooks** for encapsulating complex state logic

```typescript
// src/hooks/useScheduleFile.ts
function useScheduleFile() {
  const [file, setFile] = useState<ScheduleFile | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [undoStack, setUndoStack] = useState<ScheduleFile[]>([]);
  const [redoStack, setRedoStack] = useState<ScheduleFile[]>([]);
  
  const updateFile = useCallback((updater: (f: ScheduleFile) => ScheduleFile) => {
    setFile(current => {
      if (!current) return current;
      setUndoStack(stack => [...stack, current]);
      setRedoStack([]);
      setIsDirty(true);
      return updater(current);
    });
  }, []);
  
  const undo = useCallback(() => {
    // ... undo logic
  }, []);
  
  const redo = useCallback(() => {
    // ... redo logic
  }, []);
  
  return { file, isDirty, updateFile, undo, redo, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 };
}
```

---

## Migration Path

### For Existing Users

1. **Import Legacy Config**: Button in Welcome view to load existing `leaders.json`, `groups.json`, `rules.json`
2. **Automatic Conversion**: When opening old-format files, prompt to convert
3. **localStorage Migration**: On first load, offer to import localStorage data into a new schedule file

### Backward Compatibility

- Existing export formats remain unchanged
- Can still generate and export without saving (for quick one-off use)
- Old JSON config files can still be imported

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New schedule |
| `Ctrl+O` | Open schedule file |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save As |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+F` | Find & Replace |
| `Ctrl+E` | Export |
| `Escape` | Close modal / deselect |
| `Delete` | Remove selected assignments |
| `Enter` | Edit selected assignment |

---

## UI/UX Considerations

### Responsive Design
- Sidebar collapses to icons on narrow screens
- Cards stack vertically on mobile
- Modals become full-screen on small devices

### Accessibility
- All interactive elements keyboard-accessible
- ARIA labels on buttons and modals
- Focus management in modals
- High contrast mode support

### Visual Indicators
- 🔵 Blue border: Selected assignment
- ✏️ Pencil icon: Manually edited assignment
- ⚠️ Warning icon: Assignment with issues (no leader assigned, etc.)
- 💾 Save indicator in header shows unsaved changes

### Performance
- Virtual scrolling for large schedules (100+ assignments)
- Debounced filter updates
- Memoized assignment cards

---

## Open Questions / Decisions Needed

1. **File Association**: Should we register `.ysch` files with the system? (Requires Electron or similar)

2. **Cloud Storage**: Any plans for cloud sync? Would affect file format design.

3. **Collaboration**: Multi-user editing? Would need conflict resolution.

4. **Assignment IDs**: Currently using `date + description hash`. Should we use UUID for more robustness?

5. **Edit History Limit**: How many undo steps to keep? (Memory consideration)

6. **Auto-save**: Implement auto-save draft? Could use localStorage.

---

## Success Metrics

After implementation, the workflow should enable:

1. ✅ Generate a year-long schedule in under 5 seconds
2. ✅ Open a saved schedule file and view all assignments
3. ✅ Replace a leader with one click (auto-select)
4. ✅ Bulk replace a leader across a date range
5. ✅ Export just Q1 of a year-long schedule
6. ✅ Regenerate part of a schedule while preserving edits
7. ✅ Undo/redo any edit operation
8. ✅ Save and reopen schedule with all edits preserved

---

## Timeline Estimate

| Phase | Description | Estimated Effort |
|-------|-------------|-----------------|
| 1 | Foundation (Data Layer) | 1-2 days |
| 2 | Application Shell | 2-3 days |
| 3 | Schedule View & Editing | 3-4 days |
| 4 | Smart Replacement Logic | 1-2 days |
| 5 | Bulk Operations | 2-3 days |
| 6 | Export Enhancements | 1 day |
| 7 | Polish & Migration | 2-3 days |

**Total: ~12-18 days of development**

---

## Next Steps

1. Review this plan and provide feedback
2. Decide on open questions
3. Begin Phase 1: Foundation
4. Iterate based on user testing after each phase

---

*Document created: December 6, 2025*
*Status: Planning Phase - Awaiting Review*

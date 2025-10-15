# UI Reorganization Plan

## Current Issues

1. **Schedule Settings appear first** - but you can't set schedule parameters meaningfully until you have data configured
2. **Import/Export buttons are separated** from the configuration tabs
3. **Add buttons for cards are at the bottom** - users have to scroll past all existing items to add new ones
4. **No clear visual hierarchy** for the workflow steps
5. **Status messages only appear after generation** - should be visible throughout

## Proposed User Flow

### Step 1: Configure Data (First)
Users need to set up their team and events before anything else:
- **Leaders** - Who can be assigned
- **Groups** - What teams exist  
- **Rules** - What recurring events happen

### Step 2: Set Schedule Parameters (Second)
Once data is configured, choose how to generate:
- Start date & duration
- Assignment strategy
- Leaders per event
- Timezone for exports

### Step 3: Generate & Review (Third)
Create the schedule and review it:
- Big prominent "Generate Schedule" button
- Preview with card/table toggle
- Quick stats (X assignments, Y months, etc.)

### Step 4: Export (Fourth)
Save the results:
- Export to Markdown, CSV, or iCalendar
- Save configuration for later use

## Proposed New Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 📅 Youth Scheduler                                          │
│ Configure your team, define recurring events, and generate │
│ schedules automatically                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ [Status Message Bar - Always Visible]                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📝 Step 1: Configure People & Events                       │
│ Set up your leaders, groups, and recurring event rules     │
│                                                             │
│ [👥 Leaders (3)] [👨‍👩‍👧‍👦 Groups (3)] [📅 Rules (5)]           │
│ ───────────────────────────────────────────────────────────  │
│ ┌─ Tab Toolbar ─────────────────────────────────────────┐  │
│ │ [➕ Add Leader]     [📁 Import] [💾 Export] [⭐ Example] │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌─ Leader Card 1 ───────────────────────────────────[🗑️]┐  │
│ │ Name: [John Smith                    ]                 │  │
│ │ Groups: [x] deacons [ ] teachers [ ] priests           │  │
│ │ ...                                                     │  │
│ └──────────────────────────────────────────────────────────┘  │
│ ┌─ Leader Card 2 ───────────────────────────────────[🗑️]┐  │
│ │ ...                                                     │  │
│ └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ⚙️ Step 2: Schedule Settings                                │
│ Configure date range and assignment strategy               │
│                                                             │
│ Start Date: [2025-01-01▼]  Duration: [1 Year▼]            │
│ Strategy: [Round Robin▼]   Leaders/Event: [2]             │
│ Timezone: [America/Denver▼]                                │
│                                                             │
│              [🎯 Generate Schedule]                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📅 Step 3: Schedule Preview                                 │
│ 156 assignments | January 2025 - December 2025             │
│                                [🎴 Cards] [📊 Table]         │
│ ───────────────────────────────────────────────────────────  │
│                                                             │
│ [Schedule Display Area]                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 💾 Step 4: Export Results                                   │
│                                                             │
│ [📄 Export Markdown] [📊 Export CSV] [📅 Export Calendar]   │
└─────────────────────────────────────────────────────────────┘
```

## Specific Changes

### 1. Header
- **Add subtitle**: "Configure your team, define recurring events, and generate schedules automatically"
- **Clearer branding** and purpose

### 2. Status Bar
- **Always visible** at top (not hidden until generation)
- **Sticky positioning** so it's always accessible
- Shows success/error messages from any action

### 3. Configuration Section
- **"Step 1" indicator** to show it's the first thing to do
- **Tabs at top** with counts: "👥 Leaders (3)"
- **Toolbar under tabs** with context-aware buttons:
  - Add button on the LEFT (prominent)
  - Import/Export/Example on the RIGHT (secondary actions)
  - Buttons change based on active tab
- **Cards below** with clean spacing

### 4. Schedule Settings Section
- **"Step 2" indicator** - comes after configuration
- **Compact form** - all settings in 2-3 rows
- **Large centered button**: "🎯 Generate Schedule"
- **Separated visually** from configuration

### 5. Preview Section
- **"Step 3" indicator**
- **Only appears after generation** (not always visible)
- **Summary line**: "156 assignments | January 2025 - December 2025"
- **View toggle in header** (Cards/Table)

### 6. Export Section
- **"Step 4" indicator**
- **Only appears after generation**
- **Horizontal button row** for export options
- **Clear separation** from preview

## CSS Changes Needed

### New Classes

```css
.app-header {
  /* Centered title and subtitle */
  text-align: center;
  margin-bottom: 2rem;
}

.app-subtitle {
  /* Muted descriptive text */
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.1em;
}

.section-header {
  /* Step indicators with consistent styling */
  margin-bottom: 1.5rem;
}

.section-description {
  /* Help text under each step */
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.95em;
}

.tab-toolbar {
  /* Horizontal bar under tabs for actions */
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  background: rgba(100, 108, 255, 0.05);
  border-bottom: 1px solid rgba(100, 108, 255, 0.2);
}

.add-button-inline {
  /* Left-aligned add button in toolbar */
  /* Green, prominent */
}

.button-group-inline {
  /* Right-aligned secondary actions */
  display: flex;
  gap: 0.5rem;
}

.button-secondary-inline {
  /* Smaller, muted buttons */
  font-size: 0.9em;
  padding: 0.5rem 1rem;
}

.settings-form-compact {
  /* Tighter spacing for settings form */
  max-width: 800px;
  margin: 0 auto;
}

.generate-button-large {
  /* Big centered generate button */
  font-size: 1.2em;
  padding: 1rem 3rem;
  display: block;
  margin: 2rem auto;
}

.preview-summary {
  /* Stats line above preview */
  font-size: 1.1em;
  color: rgba(255, 255, 255, 0.9);
}

.export-section {
  /* Export buttons in horizontal row */
  text-align: center;
  padding: 2rem;
  background: rgba(100, 108, 255, 0.05);
  border-radius: 12px;
}
```

## Benefits of This Approach

### User Experience
✅ **Logical flow**: Configure → Set Parameters → Generate → Export  
✅ **Less scrolling**: Actions are where you need them  
✅ **Clear steps**: Numbered sections guide users  
✅ **Context-aware toolbars**: Buttons change based on active tab  
✅ **Immediate feedback**: Status bar always visible  

### Visual Hierarchy
✅ **Primary actions prominent**: Generate button is large and centered  
✅ **Secondary actions muted**: Import/Export are smaller  
✅ **Progressive disclosure**: Export section only appears when relevant  

### Mobile Friendly
✅ **Stacked sections** work well on narrow screens  
✅ **Toolbars collapse** to single column on mobile  
✅ **Touch-friendly buttons** with adequate spacing  

## Implementation Steps

1. **Add header and subtitle**
2. **Move status message to top** (always visible)
3. **Reorganize configuration section**:
   - Add step indicator
   - Create tab toolbar with context-aware buttons
   - Move add buttons from bottom to toolbar
4. **Move schedule settings below configuration**
   - Add step indicator
   - Make form more compact
   - Enlarge generate button
5. **Update preview section**
   - Add step indicator
   - Add summary line
   - Only show when schedule exists
6. **Create export section**
   - Add step indicator
   - Group export buttons
   - Only show when schedule exists
7. **Update CSS** for new layout
8. **Test responsive behavior**

## Alternative: Wizard/Stepper Interface

If we want an even more guided experience, we could use a step-by-step wizard:

```
[1. Configure] → [2. Settings] → [3. Generate] → [4. Export]
     ●              ○               ○              ○
```

Where each step is a separate view, and you can't proceed until the current step is complete. This would be more complex but could be more user-friendly for first-time users.

**Recommendation**: Start with the simpler reorganization above. Can add wizard later if needed.

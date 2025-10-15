# Youth Scheduler

**🌐 [Try the Live App](https://Thulrus.github.io/YouthScheduleAutomator/)**

A modern web-based scheduling tool for youth organizations. Generate schedules for combined and separate activities with configurable rules, leader assignments, and multiple export formats.

## ✨ Features

- � **Flexible Rule System**: Define recurring events (weekly, monthly, yearly) with complex patterns
- 👥 **Leader Management**: Round-robin, random, or weighted assignment strategies
- 🔄 **Group Rotation**: Automatically rotate responsibility among groups
- 📊 **Multiple Exports**: Download schedules as Markdown, CSV, or iCalendar (.ics)
- 💾 **Browser Storage**: Configurations saved locally in your browser
- 📁 **JSON Import/Export**: Easily backup and share configurations
- 🎨 **Modern UI**: Clean, responsive interface built with React + TypeScript
- 🔒 **Deterministic**: Same inputs always produce identical schedules (reproducible results)
- 🚀 **Static Hosting**: Runs entirely in your browser - no server needed!

## 🚀 Quick Start

### Use the Hosted Version (Recommended)

Just visit: **[https://Thulrus.github.io/YouthScheduleAutomator/](https://Thulrus.github.io/YouthScheduleAutomator/)**

No installation needed! Works on any device with a modern web browser.

### Run Locally for Development

```bash
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

## 📖 Usage

1. **Load Example Data** (First time users)
   - Click "⭐ Load Example" under People & Groups
   - Click "⭐ Load Example" under Rules
   - Click "Generate Schedule" to see it in action

2. **Configure Your Own Schedule**
   - Edit Leaders, Groups, and Rules in the tabs
   - Or import JSON configuration files
   - Set your date range and preferences
   - Click "Generate Schedule"

3. **Export & Share**
   - Download as Markdown, CSV, or iCalendar
   - Export configurations as JSON for backup
   - Share configuration files with others

See [QUICKSTART.md](QUICKSTART.md) for detailed instructions.

## � Configuration Files

The app supports JSON import/export for easy sharing and backup:

- **People Config** (`people-config.json`): Leaders and groups
- **Rules Config** (`rules-config.json`): Recurring event patterns

Example files are available in `public/`:

- `example-people.json` - Sample leaders and groups
- `example-rules.json` - Sample recurring events

See [CONFIG_FORMAT.md](CONFIG_FORMAT.md) for detailed file format documentation.

## 📝 Configuration Examples

### Leader Configuration (YAML/JSON)

```yaml
- name: "John Smith"
  groups: ["deacons", "teachers"]
  availability: ["wed", "sun"]  # Available Wednesdays and Sundays
  weight: 2  # Higher weight = assigned more often
```

### Group Configuration

```yaml
- name: "deacons"
  members: ["Alex Brown", "Chris Davis", "Sam Miller"]
```

### Rules - Weekly Event

```yaml
- name: "Weekly Sunday Classes"
  frequency: weekly
  weekday: 6  # 0=Monday, 6=Sunday
  kind: separate
  description: "Sunday School Classes"
  start_time: "10:15"
  duration_minutes: 45
```

### Rules - Monthly Event with Rotation

```yaml
- name: "Second Wednesday Activity"
  frequency: monthly
  weekday: 2  # Wednesday
  nth: 2  # Second occurrence
  kind: combined
  responsibility:
    mode: group
    rotation_pool: [priests, teachers, deacons]
  description: "Combined Activity Night"
  start_time: "19:00"
  duration_minutes: 90
```

## 🏗️ Development

### Project Structure

```
YouthScheduleAutomator/
├── src/                          # React + TypeScript source code
│   ├── models.ts                # Data structures
│   ├── rules.ts                 # Date generation logic
│   ├── scheduler.ts             # Core scheduling algorithm
│   ├── strategies.ts            # Assignment strategies
│   ├── exporters.ts             # File export functions
│   └── App.tsx                  # Main UI component
├── public/
│   ├── example-people.json      # Sample people config
│   └── example-rules.json       # Sample rules config
├── .github/workflows/
│   └── deploy.yml               # GitHub Pages deployment
└── README.md                     # This file
```

### Building & Testing

## 🔒 Deterministic Scheduling

**The scheduler is fully deterministic** - running the same configuration multiple times will always produce identical results. This means:

✅ Generate a full year, then any single month → they will match perfectly
✅ Same date range + same config = same assignments every time
✅ Reproducible schedules for long-term planning

See [doc/AI/DETERMINISM.md](doc/AI/DETERMINISM.md) for technical details and usage examples.

## 💻 Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### VS Code Tasks

Press `Ctrl+Shift+P` → "Tasks: Run Task":

- **Start Dev Server** - Launch development environment
- **Build Production** - Create optimized build
- **Preview Production Build** - Test the built app
- **Run Linter** - Check code quality
- **Install Dependencies** - Run npm install

## 🚀 Deployment

The app automatically deploys to GitHub Pages via GitHub Actions when you push to the main branch.

### Manual Deployment

1. Build the production version:

   ```bash
   npm run build
   ```

2. The `dist/` folder contains the static files
3. Deploy to any static hosting service

## 📄 License

See [LICENSE](LICENSE) file for details.


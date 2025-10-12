# Youth Scheduler - Web App

A modern web-based scheduling tool for youth organizations. Generate schedules for combined and separate activities with configurable rules, leader assignments, and multiple export formats.

🌐 **[Live App](https://Thulrus.github.io/YouthScheduleAutomator/)**

## ✨ Features

- 📅 **Flexible Rule System**: Define recurring events (weekly, monthly, yearly) with complex patterns
- 👥 **Leader Management**: Round-robin, random, or weighted assignment strategies
- 🔄 **Group Rotation**: Automatically rotate responsibility among groups
- 📊 **Multiple Exports**: Download schedules as Markdown, CSV, or iCalendar (.ics)
- 💾 **Browser Storage**: Configurations saved locally in your browser
- 🎨 **Modern UI**: Clean, responsive interface built with React + TypeScript
- 🚀 **Static Hosting**: Runs entirely in your browser - no server needed!

## 🚀 Quick Start

### Use the Hosted Version

Just visit: **https://Thulrus.github.io/YouthScheduleAutomator/**

### Run Locally

```bash
cd web
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

## 📖 Usage

1. **Configure Settings**
   - Set start and end dates for your schedule
   - Choose timezone for calendar exports
   - Select leader assignment strategy
   - Set number of leaders per combined event

2. **Load or Edit Configurations**
   - **Quick Start**: Click "⭐ Load Example" to see sample data
   - **Import**: Click "📁 Import JSON" to load saved configuration files
   - **Edit**: Modify configurations directly in the YAML editor tabs
   - **Export**: Click "💾 Export JSON" to save configurations for backup/sharing

3. **Generate Schedule**
   - Click "Generate Schedule" to create assignments
   - Preview the first 50 events in the table

4. **Export**
   - Download as Markdown for documentation
   - Download as CSV for spreadsheet analysis
   - Download as iCalendar for calendar apps

## 📋 Configuration Files

The app supports JSON import/export for easy sharing and backup:

- **People Config** (`people-config.json`): Leaders and groups
- **Rules Config** (`rules-config.json`): Recurring event patterns

See [CONFIG_FORMAT.md](CONFIG_FORMAT.md) for detailed file format documentation and examples.

## 📝 Configuration Examples

### Leader Configuration (YAML)

```yaml
- name: "John Smith"
  groups: ["deacons", "teachers"]
  availability: ["wed", "sun"]  # Only available Wed/Sun
  weight: 2  # Gets assigned more often in weighted strategy

- name: "Jane Doe"
  groups: ["priests"]
  availability: []  # Available any day
  weight: 1
```

### Rules Configuration (YAML)

```yaml
# Monthly event on 2nd Wednesday
- name: "Activity Night"
  frequency: monthly
  weekday: 2  # 0=Mon, 6=Sun
  nth: 2      # 2nd occurrence
  kind: combined
  responsibility:
    mode: group
    rotation_pool: [priests, teachers, deacons]
  description: "Combined Activity Night"
  start_time: "19:00"
  duration_minutes: 90

# Weekly Sunday event
- name: "Sunday Classes"
  frequency: weekly
  weekday: 6  # Sunday
  kind: separate
  description: "Sunday School Classes"
  start_time: "10:15"
  duration_minutes: 45
```

## 🏗️ Architecture

Built with modern web technologies:

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **js-yaml** - YAML parsing
- **GitHub Pages** - Free static hosting

All scheduling logic runs in the browser - no backend required!

## 🔄 Migration from Python Version

This web app is a complete rewrite of the original Python application. Key differences:

- ✅ No installation required - runs in browser
- ✅ Cross-platform - works on any device
- ✅ Free hosting on GitHub Pages
- ✅ Easier to share with non-technical users
- ⚠️ Configs edited in-browser instead of YAML files
- ℹ️ Same scheduling algorithms and features

The original Python version is still available in the repository for advanced users who prefer CLI tools.

## 📦 Building for Production

```bash
cd web
npm run build
```

The built files will be in `web/dist/` and can be deployed to any static hosting service.

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## 📄 License

See [LICENSE](../LICENSE) file for details.

## 🙏 Acknowledgments

This project helps youth organizations efficiently manage scheduling and leader assignments, reducing administrative burden and ensuring fair rotation.

---

**Need help?** Open an issue on GitHub or check the examples in the app's default configuration.

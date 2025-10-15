# 🚀 Quick Start Guide

Welcome to the Youth Scheduler! This guide will get you up and running in 5 minutes.

## Web App (Recommended)

### 1. Access the App
Visit: **https://Thulrus.github.io/YouthScheduleAutomator/**

### 2. Load Example Data
1. Under "📋 People & Groups", click **⭐ Load Example**
2. Under "📅 Rules", click **⭐ Load Example**
3. Click **Generate Schedule**

That's it! You'll see a schedule appear.

### 3. Customize Your Schedule

#### Option A: Edit in the Browser
1. Click the **Leaders**, **Groups**, or **Rules** tabs
2. Edit the YAML configuration directly
3. Click **Generate Schedule** to see changes

#### Option B: Use Configuration Files
1. Click **💾 Export JSON** to download your configs
2. Edit the JSON files in your favorite editor
3. Click **📁 Import JSON** to load them back
4. Click **Generate Schedule**

### 4. Export Your Schedule
- **Markdown**: For documentation or printing
- **CSV**: For Excel/Google Sheets
- **Calendar**: For importing into Google Calendar, Outlook, etc.

## VS Code Tasks

If you're working in VS Code, use these tasks (Ctrl+Shift+P → "Tasks: Run Task"):

- **Start Dev Server** - Launch the app locally at <http://localhost:5173>
- **Build Production** - Create optimized production build
- **Preview Production Build** - Test the production build
- **Run Linter** - Check code quality with ESLint
- **Install Dependencies** - Install npm packages

## Configuration Tips

### Leaders
```yaml
- name: "John Smith"
  groups: ["deacons", "teachers"]  # Can serve these groups
  availability: ["wed", "sun"]      # Available Wednesdays and Sundays
  weight: 2                         # Higher = assigned more often
```

### Groups
```yaml
- name: "deacons"
  members: ["Alex", "Chris", "Sam"]
```

### Rules - Weekly Event
```yaml
- name: "Weekly Sunday Classes"
  frequency: weekly
  weekday: 6        # 0=Mon, 6=Sun
  kind: separate    # Each group separately
  description: "Sunday School Classes"
  start_time: "10:15"
  duration_minutes: 45
```

### Rules - Monthly Event
```yaml
- name: "Second Wednesday Activity"
  frequency: monthly
  weekday: 2        # Wednesday
  nth: 2            # Second occurrence
  kind: combined    # All groups together
  responsibility:
    mode: group     # Rotate which group is in charge
    rotation_pool: [priests, teachers, deacons]
  description: "Activity Night"
  start_time: "19:00"
  duration_minutes: 90
```

## Common Workflows

### Starting Fresh
1. Load examples to see the format
2. Clear and add your own leaders
3. Define your groups
4. Create your event rules
5. Generate and export

### Updating Mid-Year
1. Import your existing configs
2. Make changes (add/remove people, adjust rules)
3. Set date range to just the remaining months
4. Generate new schedule
5. Export and distribute

### Sharing with Others
1. Export both JSON files
2. Send files via email or shared folder
3. Recipients import them in their browser
4. Everyone has the same schedule

## Troubleshooting

**Schedule looks wrong:**
- Check that group names match between Leaders and Rules
- Verify date ranges are correct
- Review availability settings for leaders

**Import doesn't work:**
- Make sure file is valid JSON
- Check that the format matches examples
- See CONFIG_FORMAT.md for detailed specs

**No leaders assigned:**
- Ensure leaders have the right groups listed
- Check availability restrictions
- Try increasing the date range

## Next Steps

- 📖 Read [CONFIG_FORMAT.md](web/CONFIG_FORMAT.md) for detailed configuration docs
- 🌐 See [web/README.md](web/README.md) for web app features
- 🐛 Report issues on GitHub
- ⭐ Star the repo if you find it useful!

## Support

**Need help?**

- Check the example configurations
- Read the detailed documentation
- Open an issue on GitHub

Happy scheduling! 📅

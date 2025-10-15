# Configuration File Format Guide

The Youth Scheduler web app supports importing and exporting configurations as JSON files. This makes it easy to share configurations, backup your settings, or maintain multiple schedules for different organizations.

## 📁 File Types

### 1. People Configuration (`people-config.json`)

Contains leaders and groups information.

**Schema:**
```json
{
  "version": "1.0.0",
  "leaders": [
    {
      "name": "Leader Name",
      "groups": ["group1", "group2"],
      "availability": ["mon", "wed", "fri"],
      "weight": 1
    }
  ],
  "groups": [
    {
      "name": "group-name",
      "members": ["Member 1", "Member 2"]
    }
  ]
}
```

**Fields:**

**Leaders:**
- `name` (string, required): Leader's full name
- `groups` (array of strings, required): Which groups this leader can serve
- `availability` (array of strings, optional): Days available
  - Use weekday names: `"mon"`, `"tue"`, `"wed"`, `"thu"`, `"fri"`, `"sat"`, `"sun"`
  - Or specific dates: `"2026-12-25"` (ISO format)
  - Empty array `[]` means available all days
- `weight` (number, optional): Priority for weighted strategy (default: 1)
  - Higher weight = assigned more often in weighted strategy

**Groups:**
- `name` (string, required): Group identifier (e.g., "deacons", "teachers", "priests")
- `members` (array of strings, optional): Names of group members

### 2. Rules Configuration (`rules-config.json`)

Contains recurring event definitions.

**Schema:**
```json
{
  "version": "1.0.0",
  "rules": [
    {
      "name": "Event Name",
      "frequency": "monthly",
      "weekday": 2,
      "nth": 2,
      "kind": "combined",
      "description": "Event Description",
      "start_time": "19:00",
      "duration_minutes": 90,
      "responsibility": {
        "mode": "group",
        "rotation_pool": ["group1", "group2"]
      }
    }
  ]
}
```

**Fields:**

**Rule Properties:**
- `name` (string, required): Internal rule name
- `frequency` (string, required): How often event occurs
  - `"weekly"` - Every week
  - `"monthly"` - Once per month
  - `"yearly"` - Once per year
- `kind` (string, required): Event type
  - `"combined"` - All groups together (one assignment)
  - `"separate"` - Each group independently (multiple assignments)
- `description` (string, required): What appears in the schedule

**Date Pattern (depends on frequency):**

For **weekly** events:
- `weekday` (number, required): Day of week (0=Monday, 6=Sunday)

For **monthly** events (choose one):
- `weekday` + `nth`: Nth weekday of month
  - `weekday` (number): 0=Monday through 6=Sunday
  - `nth` (number): 1=first, 2=second, 3=third, 4=fourth, -1=last
- `month_day` (number): Specific day of month (1-31)

For **yearly** events:
- `month` (number, required): Month (1=January, 12=December)
- Plus one of:
  - `weekday` + `nth`: Nth weekday of that month
  - `month_day`: Specific day of that month

**Optional Properties:**
- `start_time` (string, optional): Start time in 24-hour format "HH:MM"
- `duration_minutes` (number, optional): Event length in minutes
- `groups_involved` (array of strings, optional): Limit to specific groups (default: all groups)
- `responsibility` (object, optional): Group rotation settings
  - `mode` (string): 
    - `"none"` - No specific responsibility
    - `"group"` - Rotate among groups
    - `"leader"` - Assign leaders
  - `rotation_pool` (array of strings): Groups to rotate through

## 📋 Usage Workflow

### Exporting Your Configuration

1. Configure your leaders, groups, and rules in the web app
2. Click **"💾 Export JSON"** under the appropriate section
3. Save the downloaded file(s) to your computer
4. Keep these files as backups or share with others

### Importing a Configuration

1. Click **"📁 Import JSON"** 
2. Select your saved `.json` file
3. The configuration will immediately load into the editor
4. Review the imported data
5. Click **"Generate Schedule"** to use the new configuration

### Loading Examples

Click **"⭐ Load Example"** to see pre-configured sample data. Great for:
- Learning the format
- Testing the app
- Starting a new configuration

## 🔄 Converting Between Formats

The app internally uses YAML for editing but JSON for import/export. Benefits:

- **YAML in editor**: Easier to read and edit by hand
- **JSON for files**: Standard format, works with other tools

The conversion is automatic - just use the import/export buttons!

## 💡 Tips

### Organization Best Practices

1. **Separate Files**: Keep people and rules in separate files
   - Easier to update rules without touching people data
   - Share rules templates while keeping your people private

2. **Version Control**: 
   - Add files to git for history tracking
   - Include `version` field for future compatibility

3. **Naming Convention**:
   - `people-2026.json` - People configuration for 2026
   - `rules-standard.json` - Your standard rule set
   - `rules-summer.json` - Summer activity rules

### Backup Strategy

1. Export configurations monthly
2. Store in a cloud folder (Dropbox, Google Drive, etc.)
3. Keep dated backups: `people-backup-2026-01.json`

### Sharing Configurations

**What to share:**
- Rules (safe to share publicly)
- Group structure (without member names)

**What to keep private:**
- Leader names and contact info
- Member names
- Personal availability details

## 🔧 Advanced: Editing JSON Directly

You can edit JSON files in any text editor:

1. Export from the web app
2. Open in VS Code, Notepad++, etc.
3. Make changes
4. Validate JSON syntax (most editors do this automatically)
5. Import back into the app

**Pro tip**: Use a JSON formatter/validator like JSONLint to check syntax before importing.

## 📚 Examples

See the example files in the web app:
- `example-people.json` - Sample people configuration
- `example-rules.json` - Sample rules configuration

Load these via the **"⭐ Load Example"** buttons to see the format in action!

## 🐛 Troubleshooting

**Import fails with "Invalid JSON":**
- Check for missing commas, quotes, or brackets
- Use a JSON validator tool
- Compare to example files

**Configuration loads but schedule fails:**
- Verify group names match between people and rules
- Check date patterns are valid for the frequency type
- Ensure leader groups match existing group names

**Nothing happens when clicking import:**
- Check browser console for errors (F12)
- Try a different browser
- Verify file is actual JSON (not .txt renamed)

## 🔮 Future Enhancements

Planned features:
- Schema validation with helpful error messages
- Merge multiple configurations
- Template library for common patterns
- Direct GitHub integration for cloud storage

---

**Questions?** Open an issue on GitHub or check the main README for contact info.

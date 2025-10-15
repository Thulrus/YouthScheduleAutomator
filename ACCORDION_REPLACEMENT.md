# Accordion UI Replacement Instructions

## Step 1: Update State (Already Done)
Lines 85-90 should have:
```typescript
// Accordion state - track which sections are open
const [leadersOpen, setLeadersOpen] = useState(true);
const [groupsOpen, setGroupsOpen] = useState(false);
const [rulesOpen, setRulesOpen] = useState(false);
```

## Step 2: Replace Tab Container with Accordions

Replace lines 558-951 (the entire `<div className="tab-container">...</div>` section) with the following accordion structure:

```tsx
        {/* LEADERS ACCORDION */}
        <div className="accordion-section">
          <div className="accordion-header">
            <button
              className={`accordion-button ${leadersOpen ? 'open' : ''}`}
              onClick={() => setLeadersOpen(!leadersOpen)}
            >
              <span className="accordion-icon">{leadersOpen ? '▼' : '▶'}</span>
              <span className="accordion-title">👥 Leaders ({leaders.length})</span>
            </button>
            {leadersOpen && (
              <div className="accordion-toolbar">
                <button className="add-button-inline" onClick={addLeader}>
                  ➕ Add Leader
                </button>
                <div className="button-group-inline">
                  <label className="button-secondary-inline">
                    📁 Import
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportLeadersJSON}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button className="button-secondary-inline" onClick={handleExportLeadersJSON}>
                    💾 Export
                  </button>
                  <button className="button-secondary-inline" onClick={handleLoadExampleLeaders}>
                    ⭐ Example
                  </button>
                </div>
              </div>
            )}
          </div>
          {leadersOpen && (
            <div className="accordion-content">
              <div className="config-cards">
                {leaders.map((leader, index) => (
                  <div key={index} className="config-card">
                    {/* KEEP ALL LEADER CARD CONTENT FROM LINES 663-738 */}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* GROUPS ACCORDION */}
        <div className="accordion-section">
          <div className="accordion-header">
            <button
              className={`accordion-button ${groupsOpen ? 'open' : ''}`}
              onClick={() => setGroupsOpen(!groupsOpen)}
            >
              <span className="accordion-icon">{groupsOpen ? '▼' : '▶'}</span>
              <span className="accordion-title">👨‍👩‍👧‍👦 Groups ({groups.length})</span>
            </button>
            {groupsOpen && (
              <div className="accordion-toolbar">
                <button className="add-button-inline" onClick={addGroup}>
                  ➕ Add Group
                </button>
                <div className="button-group-inline">
                  <label className="button-secondary-inline">
                    📁 Import
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportGroupsJSON}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button className="button-secondary-inline" onClick={handleExportGroupsJSON}>
                    💾 Export
                  </button>
                  <button className="button-secondary-inline" onClick={handleLoadExampleGroups}>
                    ⭐ Example
                  </button>
                </div>
              </div>
            )}
          </div>
          {groupsOpen && (
            <div className="accordion-content">
              <div className="config-cards">
                {groups.map((group, index) => (
                  <div key={index} className="config-card">
                    {/* KEEP ALL GROUP CARD CONTENT FROM LINES 746-783 */}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RULES ACCORDION */}
        <div className="accordion-section">
          <div className="accordion-header">
            <button
              className={`accordion-button ${rulesOpen ? 'open' : ''}`}
              onClick={() => setRulesOpen(!rulesOpen)}
            >
              <span className="accordion-icon">{rulesOpen ? '▼' : '▶'}</span>
              <span className="accordion-title">📅 Rules ({rules.length})</span>
            </button>
            {rulesOpen && (
              <div className="accordion-toolbar">
                <button className="add-button-inline" onClick={addRule}>
                  ➕ Add Rule
                </button>
                <div className="button-group-inline">
                  <label className="button-secondary-inline">
                    📁 Import
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportRulesJSON}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button className="button-secondary-inline" onClick={handleExportRulesJSON}>
                    💾 Export
                  </button>
                  <button className="button-secondary-inline" onClick={handleLoadExampleRules}>
                    ⭐ Example
                  </button>
                </div>
              </div>
            )}
          </div>
          {rulesOpen && (
            <div className="accordion-content">
              <div className="config-cards">
                {rules.map((rule, index) => (
                  <div key={index} className="config-card">
                    {/* KEEP ALL RULE CARD CONTENT FROM LINES 789-948 */}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
```

## Step 3: Add CSS for Accordions

Add this to `src/App.css`:

```css
/* Accordion Styles */
.accordion-section {
  margin-bottom: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
}

@media (prefers-color-scheme: light) {
  .accordion-section {
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(0, 0, 0, 0.02);
  }
}

.accordion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.03);
}

@media (prefers-color-scheme: light) {
  .accordion-header {
    background: rgba(0, 0, 0, 0.03);
  }
}

.accordion-button {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: none;
  border: none;
  color: inherit;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s;
}

.accordion-button:hover {
  background: rgba(100, 108, 255, 0.1);
}

.accordion-button.open {
  color: #646cff;
}

@media (prefers-color-scheme: light) {
  .accordion-button.open {
    color: #535bf2;
  }
}

.accordion-icon {
  font-size: 0.8em;
  transition: transform 0.2s;
}

.accordion-title {
  flex: 1;
}

.accordion-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.accordion-content {
  padding: 1.5rem;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

This will:
- Remove tabs and replace with collapsible accordions
- Each section (Leaders, Groups, Rules) can be independently opened/closed
- Toolbars appear only when the section is open
- Smooth animations when expanding/collapsing
- Cleaner, less cluttered interface

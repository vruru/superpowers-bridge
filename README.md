# Superpowers Bridge for OpenClaw

An OpenClaw plugin that automatically fetches and loads Superpowers workflow skills from GitHub.

Based on the [obra/superpowers](https://github.com/obra/superpowers) project.

## Features

- ✅ **Auto-fetch skills** - Automatically clones skills from GitHub on first launch
- ✅ **Smart detection** - Intelligently loads relevant skills based on conversation context
- ✅ **Manual loading** - Provides `skill` tool for assistants to explicitly load skills
- ✅ **Version management** - Built-in tools to update and check skills version
- ✅ **Optional auto-update** - Configurable automatic updates on startup

## Installation

### Option A: Git Clone (Recommended)

```bash
cd ~/.openclaw/workspace/plugins
git clone https://github.com/vruru/superpowers-bridge.git
```

### Option B: Download ZIP

1. Click **Code** → **Download ZIP** on the repository page
2. Extract the downloaded `superpowers-bridge-main/` directory
3. Rename and copy to plugins directory:

```bash
mv ~/Downloads/superpowers-bridge-main ~/.openclaw/workspace/plugins/superpowers-bridge
```

### Post-Installation

After either method, the directory structure should be:

```
~/.openclaw/workspace/plugins/superpowers-bridge/
├── index.ts
├── README.md
├── package.json
├── openclaw.plugin.json
└── .gitignore
```

### Enable the Plugin

Add plugin configuration to `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "superpowers-bridge": {
        "enabled": true,
        "config": {
          "enabled": true,
          "autoDetectCode": true
        }
      }
    }
  }
}
```

### Restart OpenClaw

```bash
openclaw gateway restart
```

Skills will be automatically downloaded from GitHub on first startup (takes a few seconds).

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable the plugin |
| `skillsRepo` | string | `obra/superpowers` | GitHub repository for skills |
| `autoDetectCode` | boolean | `true` | Auto-detect code tasks and load relevant skills |
| `autoUpdate` | boolean | `false` | Auto-update skills on startup (not recommended) |
| `docsPath` | string | `docs/superpowers` | Path to save design documents |

## Usage

### Automatic Loading

When you mention code-related tasks (e.g., "write code", "implement feature", "fix bug"), the plugin automatically loads relevant Superpowers skills:

- **brainstorming** - Design phase before coding
- **writing-plans** - Writing implementation plans
- **subagent-driven-development** - Subagent-driven development
- **test-driven-development** - Test-driven development
- **systematic-debugging** - Systematic debugging

### Manual Loading

Assistants can use the `skill` tool to manually load specific skills:

```json
{
  "name": "brainstorming"
}
```

### Update Skills

Use the `update_superpowers_skills` tool to pull the latest skills from GitHub:

```json
{}
```

Or check current version:

```json
{
  "tool": "superpowers_version"
}
```

## Updating the Plugin Itself

To update the plugin manually:

1. Download the latest version from GitHub releases
2. Replace the plugin directory
3. Restart OpenClaw

Or if installed from source:

```bash
cd ~/.openclaw/workspace/plugins/superpowers-bridge
git pull
openclaw gateway restart
```

## Directory Structure

```
superpowers-bridge/
├── index.ts                 # Plugin main code
├── openclaw.plugin.json     # OpenClaw plugin config
├── package.json             # npm config
├── README.md                # This file
└── .superpowers-cache/      # Auto-downloaded skills cache (auto-generated)
    └── skills/              # Superpowers skills directory
```

## How It Works

1. **First launch**: Detects no cache → `git clone` obra/superpowers
2. **Daily operation**: Loads skills from cache directory
3. **Session start**: Analyzes user input → Matches relevant skills → Injects into system prompt
4. **Update skills**: Call `update_superpowers_skills` → `git pull` → Reload

## Troubleshooting

### Skills Not Auto-Downloading

Check network connection and git availability:

```bash
git clone https://github.com/obra/superpowers.git /tmp/test-superpowers
```

### Check Cache Status

```bash
ls -la ~/.openclaw/workspace/plugins/superpowers-bridge/.superpowers-cache/
cd ~/.openclaw/workspace/plugins/superpowers-bridge/.superpowers-cache
git log --oneline -3
```

### Manual Re-download

Delete cache and restart:

```bash
rm -rf ~/.openclaw/workspace/plugins/superpowers-bridge/.superpowers-cache
openclaw gateway restart
```

## License

MIT

## Links

- **Plugin Repository**: https://github.com/vruru/superpowers-bridge
- **Superpowers Project**: https://github.com/obra/superpowers
- **OpenClaw**: https://github.com/openclaw/openclaw

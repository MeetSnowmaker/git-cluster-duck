# 🦆 git-cluster-duck

A CLI tool that compares git branches and generates changelogs with automatic issue detection.

```
🦆 git-cluster-duck

Comparing: feature/my-feature → main

Found 12 commit(s)
Issues: PROJ-123, PROJ-456, PROJ-789

✓ Generated 15 file(s) in ./temp/gcd/2025-01-29/14-30-45/
```

## Why?

You're about to merge a feature branch. The PM who *literally requested these features* asks: *"What Jira tickets are in this release?"*

Instead of questioning your career choices while scrolling through git log:

```bash
gcd --format issues-text --stdout
```

Now you can question your career choices *faster*. 🦆

## Features

- **Branch comparison** - Compare any two branches, defaults to current branch vs main/master
- **Issue detection** - Automatically extracts Jira, GitHub, GitLab, and custom ticket references
- **Multiple output formats** - 15 different formats (text, JSON, Markdown) for various use cases
- **Configurable** - Per-repo configuration with global defaults
- **Zero config start** - Works out of the box with sensible defaults

## Installation

```bash
npm install -g @meetsnowmaker/git-cluster-duck
```

Or use directly with npx:

```bash
npx @meetsnowmaker/git-cluster-duck
```

## Quick Start

```bash
# Run in any git repository
gcd

# Or use the full name
git-cluster-duck
```

That's it. The tool will:
1. Detect your current branch
2. Find main/master to compare against
3. Extract commits and issues
4. Generate all output formats in `./temp/gcd/{date}/{time}/`

## Usage

```bash
gcd [target-branch] [base-branch] [options]
```

### Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `target` | Branch to generate changelog for | Current branch |
| `base` | Branch to compare against | `main` or `master` |

### Options

| Option | Description |
|--------|-------------|
| `-f, --format <formats>` | Output format(s), comma-separated |
| `-o, --output <dir>` | Output directory |
| `--stdout` | Print to console instead of files |
| `--no-issues` | Skip issue extraction |
| `-p, --pattern <regex>` | Custom ticket pattern |
| `-V, --version` | Show version |
| `-h, --help` | Show help |

### Examples

```bash
# Compare current branch to main
gcd

# Compare specific branches
gcd feature/login develop

# Output only issue list as JSON
gcd --format issues-json --stdout

# Use custom ticket pattern
gcd -p "TICKET-\\d+"

# Multiple formats
gcd --format "issues-text,summary-md"
```

## Output Formats

15 formats organized in 5 categories:

### Raw (full git history)
| Format | Description |
|--------|-------------|
| `raw-text` | Plain text git log style |
| `raw-json` | Full commit data as JSON |
| `raw-md` | Markdown with all details |

### Concat (first line + issues)
| Format | Description |
|--------|-------------|
| `concat-text` | One line per commit |
| `concat-json` | Simplified JSON |
| `concat-md` | Clean markdown list |

### Issues (unique issues only)
| Format | Description |
|--------|-------------|
| `issues-text` | One issue per line |
| `issues-json` | JSON array |
| `issues-md` | Markdown list |

### Summary (grouped by issue)
| Format | Description |
|--------|-------------|
| `summary-text` | Issues with commit list |
| `summary-json` | Grouped JSON object |
| `summary-md` | Nested markdown |

### Verbose (full details per issue)
| Format | Description |
|--------|-------------|
| `verbose-text` | Full commit info grouped |
| `verbose-json` | Complete JSON grouped |
| `verbose-md` | Full markdown grouped |

## Configuration

### Initialize config

```bash
gcd init
```

Interactive setup that creates a config file with:
- Base branch selection
- Ticket pattern selection (Jira, GitHub, GitLab, etc.)
- Output format preferences

### Config locations

| Location | Path | Priority |
|----------|------|----------|
| Global | `~/.config/git-cluster-duck/<repo>.json` | Default |
| Local | `.git-cluster-duck.json` | Overrides global |

### Config options

```json
{
  "repoName": "my-project",
  "baseBranch": "main",
  "defaultOutputs": ["all"],
  "ticketPatterns": [
    { "name": "jira", "regex": "[A-Za-z]+-\\d+", "enabled": true }
  ],
  "outputDir": "./temp/gcd/{date}/{time}",
  "excludeAuthors": [],
  "excludePatterns": []
}
```

### Supported ticket patterns

| Name | Pattern | Example |
|------|---------|---------|
| `jira` | `[A-Za-z]+-\d+` | `PROJ-123` |
| `github` | `#\d+` | `#123` |
| `gitlab` | `!\d+` | `!123` |
| `azure` | `AB#\d+` | `AB#123` |
| `linear` | `[A-Z]+-\d+` | `ENG-123` |
| `youtrack` | `[A-Z]+-\d+` | `ISSUE-123` |
| `pivotal` | `#\d{8,}` | `#123456789` |
| `shorthand` | `[A-Za-z]+-\d+\|#\d+` | Jira + GitHub combined |

## Output Directory

By default, files are written to:

```
<repo>/temp/gcd/<date>/<time>/
├── raw-text.txt
├── raw-json.json
├── raw-md.md
├── concat-text.txt
├── ...
└── verbose-md.md
```

Example: `./temp/gcd/2025-01-29/14-30-45/`

Add `temp/gcd/` to your `.gitignore`:

```bash
echo "temp/gcd/" >> .gitignore
```

## Requirements

- Node.js >= 22.0.0
- Git installed and in PATH

> **Note**: Due to a peer dependency conflict with `cli-testing-library`, use `npm install --legacy-peer-deps` when installing dependencies.

## Contributing

See [DEV.md](DEV.md) for development setup and guidelines.

## License

MIT

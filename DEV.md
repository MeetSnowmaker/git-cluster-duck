# Development Guide

## Setup

```bash
# Clone and install
git clone https://github.com/meetsnowmaker/git-cluster-duck.git
cd git-cluster-duck
npm install
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run from source (no build needed) |
| `npm run build` | Clean build (removes dist first) |
| `npm run start` | Run compiled version |
| `npm run clean` | Remove dist/ and .tgz files |
| `npm run dry-run` | Simulate npm publish |
| `npm run pack` | Create .tgz tarball |

## Development Workflow

```bash
# Run directly from source during development
npm run dev

# Run with arguments
npm run dev -- --format issues-text --stdout
npm run dev -- init --help

# Test the compiled version
npm run build
npm run start
```

## Project Structure

```
src/
├── index.ts              # CLI entry point (Commander.js)
├── commands/
│   ├── init.ts           # gcd init - interactive setup
│   └── run.ts            # gcd - main changelog generation
├── git/
│   ├── types.ts          # Commit, GitMeta interfaces
│   └── index.ts          # Git operations (branch, commits)
├── parsers/
│   ├── patterns.ts       # Predefined ticket patterns
│   ├── extractor.ts      # Issue extraction from commits
│   └── index.ts
├── formatters/
│   ├── types.ts          # Formatter interface
│   ├── raw.ts            # raw-text, raw-json, raw-md
│   ├── concat.ts         # concat-text, concat-json, concat-md
│   ├── issues.ts         # issues-text, issues-json, issues-md
│   ├── summary.ts        # summary-text, summary-json, summary-md
│   ├── verbose.ts        # verbose-text, verbose-json, verbose-md
│   └── index.ts          # FORMATTERS map, exports
└── config/
    ├── types.ts          # Config interface, defaults
    ├── paths.ts          # Config file paths
    ├── loader.ts         # Load/save config
    ├── gitignore.ts      # Gitignore checks
    └── index.ts
```

## Adding a New Formatter

1. Create or edit a file in `src/formatters/`
2. Export a `Formatter` function:
   ```typescript
   import { Formatter } from './types.js';

   export const myFormatter: Formatter = ({ commits, issues, meta }) => {
     // Return formatted string
     return commits.map(c => c.subject).join('\n');
   };
   ```
3. Register in `src/formatters/index.ts`:
   ```typescript
   export const FORMATTERS = {
     // ...
     'my-format': { formatter: myFormatter, extension: 'txt' },
   };
   ```

## Adding a New Ticket Pattern

Edit `src/parsers/patterns.ts`:

```typescript
export const PREDEFINED_PATTERNS: Record<string, string> = {
  // ...
  mypattern: 'CUSTOM-\\d+',
};
```

Then add to `PATTERN_CHOICES` in `src/commands/init.ts`.

## Testing Locally

```bash
# Create a test branch with commits
git checkout -b test/feature
git commit --allow-empty -m "feat: Add feature PROJ-123"
git commit --allow-empty -m "fix: Bug fix PROJ-456"

# Run the tool
npm run dev

# Check output
ls -la temp/gcd/
cat temp/gcd/*/issues-text.txt
```

## Testing the Package

```bash
# Create tarball
npm run pack

# Install globally from tarball
npm install -g ./meetsnowmaker-git-cluster-duck-0.1.0.tgz

# Test commands
gcd --help
gcd --version

# Uninstall
npm uninstall -g @meetsnowmaker/git-cluster-duck
```

## Publishing

```bash
# Login to npm (first time)
npm login

# Dry run to verify
npm run dry-run

# Publish
npm publish --access public
```

## Config Locations

| Type | Path |
|------|------|
| Global | `~/.config/git-cluster-duck/<repo>.json` |
| Local | `.git-cluster-duck.json` |

## Output Directory

Default: `./temp/gcd/{date}/{time}/`

Template variables:
- `{date}` → `2025-01-29`
- `{time}` → `14-30-45`

## Dependencies

| Package | Purpose |
|---------|---------|
| `commander` | CLI argument parsing |
| `@inquirer/prompts` | Interactive prompts for init |
| `picocolors` | Terminal colors |

## Node Version

Requires Node.js >= 22.0.0 (LTS)

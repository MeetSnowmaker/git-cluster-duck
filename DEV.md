# Development Guide

## Setup

```bash
# Clone and install
git clone https://github.com/meetsnowmaker/git-cluster-duck.git
cd git-cluster-duck
npm install --legacy-peer-deps
```

> **Note**: `--legacy-peer-deps` is required due to `cli-testing-library` requiring vitest ^3.0.0 while we use vitest 4.0.18. This will be resolved when cli-testing-library updates its peer dependency.

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

## Testing

See [TESTING.md](TESTING.md) for the full testing architecture and coverage details.

### Quick Reference

```bash
# Unit tests (mocked, fast)
npm run test:unit                # Run unit tests (~1s)
npm run test:unit:watch          # Watch mode
npm run test:unit:coverage       # Coverage → coverage/unit/

# Integration tests (requires git)
npm run test:integration         # Run locally (needs git)

# E2E tests (interactive CLI testing)
npm run test:e2e                 # Run e2e tests
npm run test:e2e:watch           # Watch mode
npm run test:e2e:coverage        # With subprocess coverage

# Docker tests (full isolation, phased)
npm run docker:build             # Build test container (once)
npm run docker:test              # Run all tests in Docker
npm run docker:test:coverage     # With merged coverage

# Docker dev mode (mounts src/tests/scripts)
npm run docker:dev               # One-shot run
npm run docker:dev:coverage      # With coverage
npm run docker:watch             # Watch mode (interactive)
```

### Docker Dev Workflow

For active development, use watch mode to avoid rebuilding the image:

```bash
# Build once (or when dependencies change)
npm run docker:build

# Interactive watch - tests auto-rerun on file changes
npm run docker:watch
```

### Test Structure

```
tests/
├── unit/                    # Mocked unit tests (126 tests)
│   ├── git/
│   ├── parsers/
│   ├── formatters/
│   └── config/
├── integration/             # Real CLI tests (30 tests)
│   └── cli.test.ts          # Phased: no-git, no-config, configured
└── e2e/                     # Interactive TTY tests (5 tests)
    ├── setup.ts             # Test context, isolated HOME/git
    └── init.test.ts         # Tests for `gcd init` command
```

### E2E Testing with cli-testing-library

We use `cli-testing-library` to test interactive CLI prompts. Key concepts:

```typescript
import { render, cleanup, fireEvent } from 'cli-testing-library';

// Render spawns the CLI process
const instance = await render('node', ['dist/index.js', 'init'], {
  cwd: testDir,
  spawnOpts: { env: isolatedEnv },
});

// Query for text in stdout
await instance.findByText('Repository name');

// Send keyboard input
instance.userEvent.keyboard('[Enter]');

// Wait for completion
await instance.findByText('Ready!');
```

### Lessons Learned (The Hard Way)

#### 1. cli-testing-library Uses SIGKILL

The default `cleanup()` sends `SIGKILL` which instantly terminates processes. This prevents V8 from writing coverage files on exit.

**Solution**: Wait for natural exit, then fallback to SIGTERM:

```typescript
// Store instances to manage cleanup
const instances: Array<Awaited<ReturnType<typeof render>>> = [];

afterEach(async () => {
  for (const instance of instances) {
    // Wait for natural exit (up to 2s)
    const timeout = Date.now() + 2000;
    while (instance.hasExit() === null && Date.now() < timeout) {
      await new Promise(r => setTimeout(r, 50));
    }
    // Fallback to SIGTERM (graceful, allows coverage write)
    if (instance.hasExit() === null) {
      await fireEvent.sigterm(instance);
      await new Promise(r => setTimeout(r, 200));
    }
  }
  instances.length = 0;
  await cleanup();
});
```

#### 2. NODE_V8_COVERAGE Affects Everything

Setting `NODE_V8_COVERAGE` in the shell affects vitest itself, causing it to write coverage files instead of just your CLI subprocess.

**Solution**: Use a custom env var that only gets translated for subprocesses:

```bash
# In script - use GCD_V8_COVERAGE (custom)
export GCD_V8_COVERAGE="$COVERAGE_DIR"
npm run test:e2e
```

```typescript
// In setup.ts - translate only for CLI subprocess
if (process.env.GCD_V8_COVERAGE) {
  env.NODE_V8_COVERAGE = process.env.GCD_V8_COVERAGE;
}
```

#### 3. Relative Paths Break Coverage

V8 coverage uses the path at write time. Relative paths like `coverage/e2e` can resolve differently depending on cwd.

**Solution**: Always use absolute paths:

```bash
COVERAGE_DIR="$(pwd)/coverage/e2e"
```

#### 4. Export vs Inline Env Vars

In bash, `VAR=value command` sets VAR only for that command. But npm spawns subshells where this can fail silently.

**Solution**: Use explicit exports:

```bash
# This might not work
GCD_V8_COVERAGE="/path" npm run test:e2e

# This works reliably
export GCD_V8_COVERAGE="/path"
npm run test:e2e
unset GCD_V8_COVERAGE
```

#### 5. ES Modules and require()

If you need to debug by writing to files, remember we use ES modules:

```typescript
// WRONG - will crash with "require is not defined"
const fs = require('fs');

// RIGHT - use import
import { writeFileSync } from 'node:fs';
```

#### 6. cli-testing-library Uses shell: true

This means commands go through `/bin/sh -c "..."`. Environment variables generally propagate, but signal handling differs:
- SIGKILL goes to shell, shell dies, child orphaned then killed
- SIGTERM goes to shell, shell may or may not forward to child

This is why waiting for natural exit is more reliable than signals.

### Coverage Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Test Execution                          │
├─────────────────────────────────────────────────────────────┤
│  Unit Tests        → vitest --coverage → coverage/unit/     │
│  Integration Tests → vitest --coverage → coverage/no-git/   │
│                                        → coverage/no-config/│
│                                        → coverage/configured│
│  E2E Tests         → GCD_V8_COVERAGE   → v8-subprocess/e2e/ │
├─────────────────────────────────────────────────────────────┤
│                   V8 Coverage Processing                    │
├─────────────────────────────────────────────────────────────┤
│  c8 report → converts V8 JSON to Istanbul format            │
├─────────────────────────────────────────────────────────────┤
│                     Coverage Merging                        │
├─────────────────────────────────────────────────────────────┤
│  nyc merge → combines all coverage-final.json files         │
│  nyc report → generates text/html report                    │
└─────────────────────────────────────────────────────────────┘
```

### Debugging E2E Tests

If e2e tests fail mysteriously:

1. **Check if process exits**: Add `console.log(instance.hasExit())` in afterEach
2. **Check subprocess output**: Use `instance.debug()` to print captured stdout
3. **Check environment**: Log `Object.keys(env)` to verify NODE_V8_COVERAGE is set
4. **Run single test**: `npm run test:e2e -- -t "test name"`
5. **Check coverage files**: `ls -la coverage/e2e/v8-subprocess/` - files should be 300KB+, not empty

## Node Version

Requires Node.js >= 22.0.0 (LTS)

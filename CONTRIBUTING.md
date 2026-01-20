# Contributing to RLM-RS Plugin

Thank you for your interest in contributing to the rlm-rs Claude Code plugin.

## Getting Started

### Prerequisites

1. **Claude Code** with plugin support
2. **rlm-rs CLI** installed:
   ```bash
   cargo install --git https://github.com/zircote/rlm rlm-rs
   ```
3. Familiarity with [Claude Code plugin structure](https://docs.anthropic.com/en/docs/claude-code/plugins)

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/zircote/rlm-rs-plugin.git
   cd rlm-rs-plugin
   ```

2. Run Claude Code with the plugin directory:
   ```bash
   claude --plugin-dir .
   ```

3. Verify loading by running `/help` - you should see `rlm-rs:rlm-init` and other commands.

## Project Structure

```
rlm-rs-plugin/
├── .claude-plugin/
│   └── plugin.json       # Plugin manifest
├── agents/
│   ├── rlm-subcall.md    # Chunk analysis agent
│   └── rlm-synthesizer.md # Result synthesis agent
├── commands/
│   ├── rlm-init.md       # Initialize command
│   ├── rlm-load.md       # Load file command
│   ├── rlm-status.md     # Status command
│   └── rlm-query.md      # Query command
├── skills/
│   ├── rlm/
│   │   ├── SKILL.md      # Main orchestration skill
│   │   └── references/
│   │       └── cli-reference.md
│   └── rlm-chunking/
│       └── SKILL.md      # Chunking strategy guide
├── hooks/                # (future) Event hooks
├── docs/
│   └── ARCHITECTURE.md   # Architecture documentation
├── README.md
└── CONTRIBUTING.md
```

## Component Guidelines

### Skills

Skills are proactive capabilities triggered by user intent.

**File location**: `skills/<skill-name>/SKILL.md`

**Frontmatter format**:
```yaml
---
name: skill-name
description: Trigger phrases and when to use this skill
version: 0.1.0
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
---
```

**Best practices**:
- Include clear trigger phrases in description
- Document prerequisites and dependencies
- Provide step-by-step workflow instructions
- Include example commands and outputs

### Commands

Commands are explicit slash commands invoked by users.

**File location**: `commands/<command-name>.md`

**Frontmatter format**:
```yaml
---
name: command-name
description: Brief description
arguments:
  - name: arg1
    description: What this argument does
    required: true
  - name: arg2
    description: Optional argument
    required: false
---
```

**Best practices**:
- Keep commands focused on single actions
- Validate inputs in the bash script
- Provide helpful error messages
- Show status after completion

### Agents

Agents are subprocesses invoked via the Task tool.

**File location**: `agents/<agent-name>.md`

**Frontmatter format**:
```yaml
---
name: agent-name
description: When this agent is invoked
model: haiku|sonnet|opus
tools:
  - Read
  - Bash
color: cyan|green|blue|etc
---
```

**Best practices**:
- Choose appropriate model for the task
- Define clear input/output contracts
- Keep agent scope narrow and focused
- Document constraints and limitations

## Testing Changes

### Manual Testing

1. Make changes to plugin files
2. Restart Claude Code or reload plugins
3. Test the modified component:
   ```
   # Test a command
   /rlm-init

   # Test a skill by describing intent
   "I need to process a large log file using RLM"

   # Test an agent via Task tool (pass chunk ID from search results)
   "Analyze chunk ID 42 from the loaded buffer"
   ```

### Test Scenarios

**Basic workflow**:
```bash
# 1. Create test file
echo "Test content for RLM processing" > test.txt

# 2. Initialize
/rlm-init

# 3. Load
/rlm-load file=test.txt

# 4. Check status
/rlm-status
```

**Chunking strategies**:
```bash
# Test semantic chunking with markdown
/rlm-load file=README.md chunker=semantic

# Test fixed chunking with overlap
/rlm-load file=test.log chunker=fixed chunk-size=1000 overlap=100
```

## Submitting Changes

### Pull Request Process

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/my-improvement
   ```
3. Make your changes
4. Test thoroughly
5. Commit with descriptive message:
   ```bash
   git commit -m "Add parallel chunk processing to rlm skill"
   ```
6. Push and create PR:
   ```bash
   git push origin feature/my-improvement
   ```

### PR Guidelines

- **Title**: Clear, concise description of change
- **Description**: Include:
  - What changed and why
  - How to test the change
  - Any breaking changes
- **Size**: Keep PRs focused; split large changes

### Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `refactor:` Code change that neither fixes nor adds
- `test:` Adding tests
- `chore:` Maintenance tasks

## Code Style

### Markdown

- Use ATX-style headers (`#`, `##`, `###`)
- Include code fence language identifiers
- Keep lines under 100 characters where practical
- Use reference-style links for repeated URLs

### YAML Frontmatter

- Use lowercase property names
- Quote strings with special characters
- Keep descriptions concise but complete

### Bash Scripts

- Always check for prerequisites
- Provide clear error messages
- Use `set -e` for strict error handling (when appropriate)
- Quote variables: `"${variable}"`

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/zircote/rlm-rs-plugin/issues)
- **Discussions**: [GitHub Discussions](https://github.com/zircote/rlm-rs-plugin/discussions)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

# RLM-RS Plugin for Claude Code

A Claude Code plugin that integrates the **rlm-rs** Rust CLI for processing documents that exceed typical context window limits using the Recursive Language Model (RLM) pattern.

## Overview

This plugin enables Claude Code to:
- Process documents up to 100x larger than the context window
- Use multiple chunking strategies (fixed, semantic, parallel)
- Persist state in SQLite for reliable buffer management
- Delegate chunk-level analysis to efficient sub-LLM calls
- Synthesize coherent answers from distributed chunk analyses

## Prerequisites

1. **rlm-rs CLI**: Install via one of these methods:
   ```bash
   # Via Cargo (recommended)
   cargo install rlm-rs

   # Via Homebrew
   brew tap zircote/tap
   brew install rlm-rs

   # From source
   cd ../rlm && make install
   ```

2. **Claude Code**: Version supporting plugins

## Installation

1. Copy or symlink this plugin to your Claude Code plugins directory:
   ```bash
   # Option 1: Symlink (recommended for development)
   ln -s /path/to/rlm-rs-plugin ~/.claude/plugins/rlm-rs

   # Option 2: Use --plugin-dir flag
   claude --plugin-dir /path/to/rlm-rs-plugin
   ```

2. Verify the plugin loads:
   ```bash
   /help
   ```
   You should see `rlm-rs:rlm-init`, `rlm-rs:rlm-load`, etc.

## Components

### Skills

- **rlm**: Main RLM workflow orchestration for large context processing
- **rlm-chunking**: Guidance on selecting chunking strategies

### Commands

| Command | Description |
|---------|-------------|
| `/rlm-init` | Initialize the RLM database |
| `/rlm-load` | Load a file into a buffer with chunking |
| `/rlm-status` | Show current buffers and state |
| `/rlm-query` | Run a query against loaded content |

### Agents

- **rlm-subcall**: Haiku-based agent for efficient chunk analysis
- **rlm-synthesizer**: Sonnet-based agent for aggregating results

## Usage

### Basic Workflow

1. Initialize the database:
   ```
   /rlm-init
   ```

2. Load a large file:
   ```
   /rlm-load path/to/large-document.txt --chunker semantic
   ```

3. Query the content:
   ```
   /rlm-query "What are the main themes discussed?"
   ```

### Using the RLM Skill

For automated orchestration, trigger the RLM skill by asking:
- "Process this large file using RLM"
- "Analyze document.txt which exceeds context"
- "Use recursive language model to examine logs.txt"

## Configuration

Create `.claude/rlm-rs.local.md` in your project for custom settings:

```yaml
---
chunk_size: 200000
overlap: 0
default_chunker: semantic
---
```

## Architecture

Based on the [RLM paper (arXiv:2512.24601)](https://arxiv.org/abs/2512.24601):

| RLM Concept | Implementation |
|-------------|----------------|
| Root LLM | Main Claude Code conversation (Opus/Sonnet) |
| Sub-LLM | `rlm-subcall` agent (Haiku) |
| External Environment | `rlm-rs` CLI with SQLite storage |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT

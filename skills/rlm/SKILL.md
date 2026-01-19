---
name: rlm
description: This skill should be used when the user asks to "process a large file", "analyze document exceeding context", "use RLM", "recursive language model workflow", "chunk and analyze a file", "handle long context", or needs to work with documents too large to fit in the context window. Orchestrates the full RLM loop using the rlm-rs CLI.
version: 0.1.0
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
---

# RLM (Recursive Language Model) Workflow

Orchestrate processing of documents that exceed context window limits using the rlm-rs CLI tool. This skill implements the RLM pattern from arXiv:2512.24601, enabling analysis of content up to 100x larger than typical context windows.

## Architecture Mapping

| RLM Concept | Implementation |
|-------------|----------------|
| Root LLM | Main Claude Code conversation (Opus/Sonnet) |
| Sub-LLM (`llm_query`) | `rlm-subcall` agent (Haiku) |
| External Environment | `rlm-rs` CLI with SQLite storage |

## Prerequisites

Verify rlm-rs is installed and available:

```bash
command -v rlm-rs >/dev/null 2>&1 || echo "INSTALL REQUIRED: cargo install rlm-rs"
```

**Installation options:**
```bash
# Via Cargo (recommended)
cargo install rlm-rs

# Via Homebrew
brew install zircote/tap/rlm-rs
```

## Workflow Steps

### Step 1: Initialize Database

Create or verify the RLM database:

```bash
rlm-rs init
rlm-rs status
```

If already initialized, `status` shows current buffers and state.

### Step 2: Load Context File

Load the large document into a buffer with appropriate chunking:

```bash
# Semantic chunking (recommended for structured content)
rlm-rs load <file_path> --name <buffer_name> --chunker semantic

# Fixed chunking (for unstructured text)
rlm-rs load <file_path> --name <buffer_name> --chunker fixed --chunk-size 200000

# With overlap for continuity
rlm-rs load <file_path> --name <buffer_name> --chunker fixed --chunk-size 200000 --overlap 1000
```

### Step 3: Scout the Content

Examine the beginning and end to understand structure:

```bash
# View first 3000 characters
rlm-rs peek <buffer_name> --start 0 --end 3000

# View last 3000 characters
rlm-rs peek <buffer_name> --start -3000
```

Search for relevant sections:

```bash
rlm-rs grep <buffer_name> "<pattern>" --max-matches 20 --window 150
```

### Step 4: Write Chunks to Files

Materialize chunks as files for subagent processing:

```bash
rlm-rs write-chunks <buffer_name> --out-dir .rlm/chunks --prefix chunk
```

This creates files like `.rlm/chunks/chunk_0000.txt`, `.rlm/chunks/chunk_0001.txt`, etc.

### Step 5: Subcall Loop

For each chunk file, delegate analysis to the `rlm-subcall` agent:

1. List chunk files:
   ```bash
   ls .rlm/chunks/chunk_*.txt
   ```

2. For each chunk, invoke the Task tool with `rlm-subcall` agent:
   - Provide the user's query
   - Provide the chunk file path
   - Request structured JSON output

3. Collect results from each subcall into an intermediate buffer:
   ```bash
   rlm-rs add-buffer chunk_results "$(cat <<'EOF'
   <paste JSON results here>
   EOF
   )"
   ```

### Step 6: Synthesis

Once all chunks are processed:

1. Export collected results:
   ```bash
   rlm-rs export-buffers --output .rlm/all_results.json --pretty
   ```

2. Use the `rlm-synthesizer` agent to aggregate findings into a coherent answer.

3. Present the final synthesized response to the user.

## Guardrails

- **Never paste large chunks into main context** - Use peek/grep to extract only relevant excerpts
- **Keep subagent outputs compact** - Request JSON format with short evidence fields
- **Orchestration stays in main conversation** - Subagents cannot spawn other subagents
- **State persists in SQLite** - All buffers survive across sessions via `.rlm/rlm-state.db`

## Chunking Strategy Selection

| Content Type | Recommended Strategy |
|--------------|---------------------|
| Markdown docs | `semantic` |
| Source code | `semantic` |
| JSON/XML | `semantic` |
| Plain logs | `fixed` with overlap |
| Unstructured text | `fixed` |

For detailed chunking guidance, refer to the `rlm-chunking` skill.

## CLI Command Reference

| Command | Purpose |
|---------|---------|
| `init` | Initialize database |
| `status` | Show state summary |
| `load` | Load file into buffer |
| `list` | List all buffers |
| `show` | Show buffer details |
| `peek` | View buffer content slice |
| `grep` | Search with regex |
| `write-chunks` | Export chunks to files |
| `add-buffer` | Store intermediate results |
| `export-buffers` | Export all buffers |
| `var` | Get/set context variables |
| `reset` | Clear all state |

## Example Session

```bash
# 1. Initialize
rlm-rs init

# 2. Load a large log file
rlm-rs load server.log --name logs --chunker fixed --chunk-size 150000 --overlap 500

# 3. Scout for errors
rlm-rs grep logs "ERROR|FATAL" --max-matches 50

# 4. Write chunks
rlm-rs write-chunks logs --out-dir .rlm/chunks

# 5. Process each chunk with rlm-subcall agent
# 6. Synthesize with rlm-synthesizer agent
# 7. Present final answer
```

## Additional Resources

### Reference Files

- **`references/cli-reference.md`** - Complete CLI documentation

### Related Components

- **`rlm-subcall` agent** - Chunk-level analysis (Haiku)
- **`rlm-synthesizer` agent** - Result aggregation (Sonnet)
- **`rlm-chunking` skill** - Chunking strategy selection

---
name: rlm
description: This skill should be used when the user asks to "process a large file", "analyze document exceeding context", "use RLM", "recursive language model workflow", "chunk and analyze a file", "handle long context", or needs to work with documents too large to fit in the context window. Orchestrates the full RLM loop using the rlm-rs CLI.
version: 1.0.0
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

### Step 4: Search for Relevant Chunks

Use hybrid semantic + BM25 search to find chunks matching your query:

```bash
# Hybrid search (semantic + BM25 with rank fusion)
rlm-rs search "your query" --buffer <buffer_name> --top-k 10

# JSON output for programmatic use
rlm-rs --format json search "your query" --top-k 10
```

Output includes chunk IDs with relevance scores:
```json
{
  "count": 2,
  "mode": "hybrid",
  "query": "your query",
  "results": [
    {"chunk_id": 42, "score": 0.0328, "semantic_score": 0.0499, "bm25_score": 1.6e-6},
    {"chunk_id": 17, "score": 0.0323, "semantic_score": 0.0457, "bm25_score": 1.2e-6}
  ]
}
```

Extract chunk IDs with jq: `jq -r '.results[].chunk_id'`

### Step 5: Retrieve Chunks by ID

Get specific chunk content via pass-by-reference:

```bash
# Get chunk content
rlm-rs chunk get 42

# With metadata
rlm-rs --format json chunk get 42 --metadata
```

### Step 6: Subcall Loop (Batched, Parallel)

Only process chunks returned by search. Batch chunk IDs to reduce agent calls:

1. Search returns chunk IDs with relevance scores
2. Group chunk IDs into batches of 5 (e.g., [1,2,3,4,5], [6,7,8,9,10], [11,12])
3. Invoke `rlm-subcall` agent once per batch using **only** the two required arguments
4. Launch batches in parallel via multiple Task calls in one response
5. Agent handles retrieval internally via `rlm-rs chunk get <id>` (NO buffer ID needed)
6. Collect structured JSON findings from all batches

**CORRECT Task invocation** - pass ONLY `query` and `chunk_ids` arguments:
```
Task subagent_type="rlm-rs:rlm-subcall" prompt="query='What errors occurred?' chunk_ids='3,7,12,15,22'"
Task subagent_type="rlm-rs:rlm-subcall" prompt="query='What errors occurred?' chunk_ids='28,31,45'"
```

**CRITICAL - DO NOT**:
- Write narrative prompts - the agent already knows what to do
- Include buffer ID or buffer NAME anywhere in the prompt
- Mention the buffer at all - chunk IDs are globally unique across all buffers

WRONG (causes exit code 2):
```
prompt="Analyze chunks from buffer 1..."  # NO - has buffer ID
prompt="Analyze chunks from buffer 'myfile.txt'..."  # NO - has buffer name
prompt="Use rlm-rs chunk 1 <id>..."  # NO - buffer ID in command
prompt="Use rlm-rs chunk get <id> --buffer x..."  # NO - --buffer flag doesn't exist
```

RIGHT:
```
prompt="query='the user question' chunk_ids='5,105,2,3,74'"  # YES - just args!
```

### Step 7: Synthesis

Once all chunks are processed:

1. Collect all JSON findings from subcall agents
2. Pass findings directly to `rlm-synthesizer` agent (no intermediate files)
3. Present the final synthesized response to the user

Example Task tool invocation:
```
Task agent=rlm-synthesizer query="What errors occurred?" findings='[...]' chunk_ids="42,17,23"
```

## Guardrails

- **Never paste large chunks into main context** - Use peek/grep to extract only relevant excerpts
- **Keep subagent outputs compact** - Request JSON format with short evidence fields
- **Orchestration stays in main conversation** - Subagents cannot spawn other subagents
- **State persists in SQLite** - All buffers survive across sessions via `.rlm/rlm-state.db`
- **No file I/O for chunk passing** - Use pass-by-reference with chunk IDs

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
| `search` | Hybrid semantic + BM25 search |
| `chunk get` | Retrieve chunk by ID |
| `chunk list` | List buffer chunks |
| `chunk embed` | Generate embeddings |
| `chunk status` | Show embedding status |
| `write-chunks` | Export chunks to files (legacy) |
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

# 3. Search for relevant chunks
rlm-rs --format json search "database connection errors" --buffer logs --top-k 10

# 4. For each relevant chunk ID, invoke rlm-subcall agent
# 5. Collect JSON findings
# 6. Pass findings to rlm-synthesizer agent
# 7. Present final answer
```

## Additional Resources

### Reference Files

- **`references/cli-reference.md`** - Complete CLI documentation

### Related Components

- **`rlm-subcall` agent** - Chunk-level analysis (Haiku)
- **`rlm-synthesizer` agent** - Result aggregation (Sonnet)
- **`rlm-chunking` skill** - Chunking strategy selection

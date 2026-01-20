# Plugin Update Plan: rlm-rs 1.0.0 Pass-by-Reference Workflow

## Overview

Update the rlm-rs-plugin to leverage the new pass-by-reference capabilities in rlm-rs 1.0.0, eliminating file I/O for chunk processing.

### Key Change

**Old workflow (file-based):**
```
load → write-chunks → .rlm/chunks/*.txt → agents read files
```

**New workflow (pass-by-reference):**
```
load → chunk embed → search → chunk IDs → chunk get <id> → content directly
```

---

## Phase 1: Update CLI Reference

**File:** `skills/rlm/references/cli-reference.md`

### Add New Commands

#### 1. `search` command
```
### search

Search chunks using hybrid semantic + BM25 search with Reciprocal Rank Fusion.

```bash
rlm-rs search <QUERY> [OPTIONS]

Arguments:
  <QUERY>    Search query text

Options:
  -k, --top-k <N>          Maximum results [default: 10]
  -t, --threshold <F>      Minimum similarity threshold 0.0-1.0 [default: 0.3]
  -m, --mode <MODE>        Search mode: hybrid, semantic, bm25 [default: hybrid]
      --rrf-k <N>          RRF k parameter for rank fusion [default: 60]
  -b, --buffer <BUFFER>    Filter by buffer ID or name
```

**Examples:**
```bash
# Hybrid search (combines semantic + BM25)
rlm-rs search "authentication error handling"

# Semantic-only search
rlm-rs search "database connection patterns" --mode semantic

# Filter to specific buffer
rlm-rs search "API endpoints" --buffer docs --top-k 5
```
```

#### 2. `chunk` subcommand group
```
### chunk

Chunk operations for pass-by-reference retrieval.

#### chunk get

Get a chunk by ID (primary pass-by-reference mechanism).

```bash
rlm-rs chunk get <ID> [OPTIONS]

Arguments:
  <ID>    Chunk ID

Options:
  -m, --metadata    Include metadata in output
```

**Examples:**
```bash
rlm-rs chunk get 42                    # Get chunk content
rlm-rs chunk get 42 --metadata         # Include metadata
rlm-rs --format json chunk get 42      # JSON output
```

#### chunk list

List chunks for a buffer.

```bash
rlm-rs chunk list <BUFFER> [OPTIONS]

Arguments:
  <BUFFER>    Buffer ID or name

Options:
  -p, --preview                    Show content preview
      --preview-len <N>            Preview length [default: 100]
```

#### chunk embed

Generate embeddings for buffer chunks (required for semantic search).

```bash
rlm-rs chunk embed <BUFFER> [OPTIONS]

Arguments:
  <BUFFER>    Buffer ID or name

Options:
  -f, --force    Re-embed even if already embedded
```

**Examples:**
```bash
rlm-rs chunk embed docs              # Embed chunks
rlm-rs chunk embed docs --force      # Re-embed all
```

#### chunk status

Show embedding status for all buffers.

```bash
rlm-rs chunk status
```
```

---

## Phase 2: Update rlm-subcall Agent

**File:** `agents/rlm-subcall.md`

### Changes Required

1. **Remove file path argument** - Replace with chunk ID
2. **Use `rlm-rs chunk get`** - Instead of Read tool for file
3. **Update examples** - Show chunk ID workflow

### Updated Agent Spec

```yaml
---
name: rlm-subcall
description: Efficient chunk-level analysis agent for RLM workflow. Use this agent when processing individual chunks from large documents. Retrieves chunks by ID via rlm-rs pass-by-reference. Returns structured JSON findings.
model: haiku
tools:
  - Bash
  - Grep
color: cyan
arguments:
  - name: query
    description: The analysis question or task from the user
    required: true
  - name: chunk_id
    description: Chunk ID to retrieve and analyze (from search results)
    required: true
---
```

### Key Instruction Changes

**Old:**
```
1. Read the chunk file using the Read tool
```

**New:**
```
1. Retrieve chunk content using: rlm-rs chunk get <chunk_id>
2. For metadata: rlm-rs --format json chunk get <chunk_id> --metadata
```

---

## Phase 3: Update rlm-synthesizer Agent

**File:** `agents/rlm-synthesizer.md`

### Changes Required

1. **Accept chunk IDs** - Instead of results file path
2. **Can retrieve original chunks** - For verification if needed
3. **Update input format docs**

### Updated Arguments

```yaml
arguments:
  - name: query
    description: The original user question or analysis task
    required: true
  - name: findings
    description: JSON array of chunk analysis findings (inline or buffer name)
    required: true
  - name: chunk_ids
    description: Comma-separated list of analyzed chunk IDs (for reference)
    required: false
```

---

## Phase 4: Update rlm-query Command

**File:** `commands/rlm-query.md`

### New Workflow

```markdown
## Workflow

1. **Store query** - Set context variable
2. **Embed chunks** - Generate embeddings if needed
3. **Search for relevant chunks** - Use hybrid search
4. **Parallel chunk analysis** - Invoke `rlm-subcall` with chunk IDs
5. **Result synthesis** - Use `rlm-synthesizer` to aggregate
6. **Present answer** - Return coherent response

## Execution Steps

### Step 1: Prepare

```bash
# Store query for reference
rlm-rs var query "{{query}}"

# Determine buffer
{{#if buffer}}
BUFFER="{{buffer}}"
{{else}}
BUFFER=$(rlm-rs --format json list | jq -r '.[0].name')
{{/if}}

# Ensure embeddings exist
rlm-rs chunk embed "$BUFFER"
```

### Step 2: Search for Relevant Chunks

```bash
# Get top chunks matching query
rlm-rs --format json search "{{query}}" --buffer "$BUFFER" --top-k 10
```

Output:
```json
[
  {"chunk_id": 42, "score": 0.85, "buffer_id": 1, "preview": "..."},
  {"chunk_id": 17, "score": 0.72, "buffer_id": 1, "preview": "..."}
]
```

### Step 3: Process Relevant Chunks

For each chunk ID from search results:
- Invoke `rlm-subcall` agent with chunk_id (not file path)
- Agent retrieves content via `rlm-rs chunk get <id>`
- Collect JSON results

### Step 4: Synthesize Results

- Pass all findings to `rlm-synthesizer` agent
- Include original chunk IDs for reference
- Present final answer
```

---

## Phase 5: Update Main Skill

**File:** `skills/rlm/SKILL.md`

### Changes Required

1. **Update workflow steps** - Remove write-chunks, add embed/search
2. **Update CLI command table** - Add new commands
3. **Add search workflow section**
4. **Update example session**

### New Workflow Steps

```markdown
### Step 4: Embed Chunks (Required for Semantic Search)

Generate embeddings for loaded content:

```bash
rlm-rs chunk embed <buffer_name>

# Check embedding status
rlm-rs chunk status
```

### Step 5: Search for Relevant Chunks

Instead of processing all chunks, search for relevant ones:

```bash
# Hybrid search (semantic + BM25)
rlm-rs search "your query" --buffer <buffer_name> --top-k 10

# JSON output for programmatic use
rlm-rs --format json search "your query" --top-k 10
```

### Step 6: Retrieve Chunks by ID

Get specific chunk content via pass-by-reference:

```bash
# Get chunk content
rlm-rs chunk get 42

# With metadata
rlm-rs --format json chunk get 42 --metadata
```

### Step 7: Subcall Loop (Targeted)

Only process chunks returned by search:

1. Search returns chunk IDs with relevance scores
2. For each high-scoring chunk, invoke `rlm-subcall` agent with chunk ID
3. Agent retrieves content via `rlm-rs chunk get`
4. Collect structured findings
```

### Updated CLI Command Table

```markdown
| Command | Purpose |
|---------|---------|
| `init` | Initialize database |
| `status` | Show state summary |
| `load` | Load file into buffer |
| `list` | List all buffers |
| `show` | Show buffer details |
| `peek` | View buffer content slice |
| `grep` | Search with regex |
| `search` | **Hybrid semantic + BM25 search** |
| `chunk get` | **Retrieve chunk by ID** |
| `chunk list` | **List buffer chunks** |
| `chunk embed` | **Generate embeddings** |
| `chunk status` | **Show embedding status** |
| `write-chunks` | Export chunks to files (legacy) |
| `add-buffer` | Store intermediate results |
| `export-buffers` | Export all buffers |
| `var` | Get/set context variables |
| `reset` | Clear all state |
```

---

## Phase 6: Update Other Files

### `commands/rlm-load.md`
- Add note about running `chunk embed` after load for search capability

### `commands/rlm-status.md`
- Update to show embedding status info

### `skills/rlm-chunking/SKILL.md`
- Add section on embedding considerations
- Note that semantic search works best with semantic chunking

### `docs/ARCHITECTURE.md`
- Update architecture diagram to show pass-by-reference flow
- Document embedding storage in SQLite

### `README.md`
- Update feature list to highlight semantic search
- Update example workflow

---

## Implementation Order

1. **CLI Reference** - Foundation for all other updates
2. **rlm-subcall agent** - Core change to pass-by-reference
3. **rlm-query command** - Updated orchestration workflow
4. **Main SKILL.md** - Comprehensive workflow documentation
5. **rlm-synthesizer** - Minor updates for chunk ID references
6. **Supporting files** - README, ARCHITECTURE, etc.

---

## Testing Checklist

- [ ] `rlm-rs chunk embed` generates embeddings
- [ ] `rlm-rs search` returns relevant chunk IDs
- [ ] `rlm-rs chunk get <id>` retrieves content
- [ ] `rlm-subcall` agent works with chunk IDs
- [ ] Full `/rlm-query` workflow completes
- [ ] No file I/O in `.rlm/chunks/` directory
- [ ] Performance improvement vs file-based workflow

---

## Breaking Changes

1. **rlm-subcall argument change**: `chunk_path` → `chunk_id`
2. **Workflow change**: Must call `chunk embed` before `search`
3. **write-chunks deprecated**: Still available but not used in default workflow

## Backward Compatibility

- `write-chunks` command still works for users preferring file-based workflow
- Old agent invocations will fail with clear error (missing chunk_id argument)

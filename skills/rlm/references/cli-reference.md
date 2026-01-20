# RLM-RS CLI Reference

Complete command reference for the rlm-rs CLI tool.

## Global Options

```
-d, --db-path <DB_PATH>   Path to RLM database [env: RLM_DB_PATH] [default: .rlm/rlm-state.db]
-v, --verbose             Enable verbose output
    --format <FORMAT>     Output format: text, json [default: text]
-h, --help                Print help
-V, --version             Print version
```

## Commands

### init

Initialize the RLM database. Creates the SQLite database and schema.

```bash
rlm-rs init [OPTIONS]

Options:
  -f, --force    Force re-initialization (destroys existing data)
```

**Examples:**
```bash
rlm-rs init                    # Create new database
rlm-rs init --force            # Reset existing database
```

### status

Show current RLM state status including buffer count and database info.

```bash
rlm-rs status
```

**Output includes:**
- Database path and size
- Buffer count
- Chunk count
- Schema version

### load

Load a context file into a buffer with automatic chunking.

```bash
rlm-rs load <FILE> [OPTIONS]

Arguments:
  <FILE>    Path to the context file

Options:
  -n, --name <NAME>           Buffer name (defaults to filename)
  -c, --chunker <CHUNKER>     Chunking strategy: fixed, semantic, parallel [default: semantic]
      --chunk-size <SIZE>     Chunk size in characters [default: 200000]
      --overlap <OVERLAP>     Overlap between chunks [default: 0]
```

**Examples:**
```bash
# Load with semantic chunking (best for structured content)
rlm-rs load document.md --name docs --chunker semantic

# Load with fixed chunks and overlap
rlm-rs load logs.txt --name logs --chunker fixed --chunk-size 150000 --overlap 1000

# Load with parallel chunking (fastest for large files)
rlm-rs load huge.txt --chunker parallel --chunk-size 100000
```

### list (alias: ls)

List all buffers in the database.

```bash
rlm-rs list
rlm-rs ls
```

**Output columns:**
- ID
- Name
- Size (characters)
- Chunk count
- Created timestamp

### show

Show detailed information about a specific buffer.

```bash
rlm-rs show <BUFFER> [OPTIONS]

Arguments:
  <BUFFER>    Buffer ID or name

Options:
  -c, --chunks    Also show chunk information
```

**Examples:**
```bash
rlm-rs show logs              # By name
rlm-rs show 1                 # By ID
rlm-rs show logs --chunks     # Include chunk details
```

### delete (alias: rm)

Delete a buffer and its chunks.

```bash
rlm-rs delete <BUFFER> [OPTIONS]

Arguments:
  <BUFFER>    Buffer ID or name

Options:
  -y, --yes    Skip confirmation prompt
```

### peek

View a slice of buffer content.

```bash
rlm-rs peek <BUFFER> [OPTIONS]

Arguments:
  <BUFFER>    Buffer ID or name

Options:
      --start <START>    Start offset in bytes [default: 0]
      --end <END>        End offset (default: start + 3000)
```

**Examples:**
```bash
rlm-rs peek docs --start 0 --end 5000      # First 5000 chars
rlm-rs peek docs --start 10000             # From offset 10000
```

### grep

Search buffer content with regex patterns.

```bash
rlm-rs grep <BUFFER> <PATTERN> [OPTIONS]

Arguments:
  <BUFFER>     Buffer ID or name
  <PATTERN>    Search pattern (regex)

Options:
  -n, --max-matches <N>    Maximum matches [default: 20]
  -c, --window <SIZE>      Context window around matches [default: 120]
  -i, --ignore-case        Case-insensitive search
```

**Examples:**
```bash
rlm-rs grep logs "ERROR|WARN" --max-matches 50
rlm-rs grep docs "function\s+\w+" --window 200
rlm-rs grep logs "failed" -i
```

### chunk-indices

Get chunk boundary indices without writing files.

```bash
rlm-rs chunk-indices <BUFFER> [OPTIONS]

Arguments:
  <BUFFER>    Buffer ID or name

Options:
      --chunk-size <SIZE>    Chunk size [default: 200000]
      --overlap <OVERLAP>    Overlap size [default: 0]
```

### write-chunks

Write buffer chunks to individual files (legacy file-based workflow).

```bash
rlm-rs write-chunks <BUFFER> [OPTIONS]

Arguments:
  <BUFFER>    Buffer ID or name

Options:
  -o, --out-dir <DIR>        Output directory [default: .rlm/chunks]
      --chunk-size <SIZE>    Chunk size [default: 200000]
      --overlap <OVERLAP>    Overlap size [default: 0]
      --prefix <PREFIX>      Filename prefix [default: chunk]
```

**Examples:**
```bash
rlm-rs write-chunks logs --out-dir .rlm/chunks --prefix log_chunk
```

**Output files:** `chunk_0000.txt`, `chunk_0001.txt`, etc.

**Note:** For the recommended pass-by-reference workflow, use `search` + `chunk get` instead.

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

# JSON output for programmatic use
rlm-rs --format json search "your query" --top-k 10
```

**Output (JSON format):**
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

**Extract chunk IDs:** `jq -r '.results[].chunk_id'`

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

**Examples:**
```bash
rlm-rs chunk list docs              # List all chunks
rlm-rs chunk list docs --preview    # With content previews
```

#### chunk embed

Generate embeddings for buffer chunks (enables semantic search).

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

**Note:** Embedding is handled automatically by the `search` command when needed.

#### chunk status

Show embedding status for all buffers.

```bash
rlm-rs chunk status
```

**Output includes:**
- Buffer name and ID
- Total chunks
- Embedded chunks count
- Embedding coverage percentage

### add-buffer

Add text content to a new buffer (for intermediate results).

```bash
rlm-rs add-buffer <NAME> [CONTENT]

Arguments:
  <NAME>       Buffer name
  [CONTENT]    Content (reads from stdin if not provided)
```

**Examples:**
```bash
# Inline content
rlm-rs add-buffer results '{"findings": []}'

# From stdin
cat analysis.json | rlm-rs add-buffer analysis

# Heredoc
rlm-rs add-buffer notes <<'EOF'
Multi-line
content here
EOF
```

### export-buffers

Export all buffers to a file.

```bash
rlm-rs export-buffers [OPTIONS]

Options:
  -o, --output <FILE>    Output file (stdout if not specified)
  -p, --pretty           Pretty-print JSON output
```

### var

Get, set, or delete context variables.

```bash
rlm-rs var <NAME> [VALUE] [OPTIONS]

Arguments:
  <NAME>     Variable name
  [VALUE]    Value to set (omit to get current value)

Options:
  -d, --delete    Delete the variable
```

**Examples:**
```bash
rlm-rs var query "What is the main theme?"    # Set
rlm-rs var query                               # Get
rlm-rs var query --delete                      # Delete
```

### global

Get, set, or delete global variables (persist across sessions).

```bash
rlm-rs global <NAME> [VALUE] [OPTIONS]

Arguments:
  <NAME>     Variable name
  [VALUE]    Value to set

Options:
  -d, --delete    Delete the variable
```

### reset

Delete all RLM state (buffers, chunks, variables).

```bash
rlm-rs reset [OPTIONS]

Options:
  -y, --yes    Skip confirmation prompt
```

## JSON Output Mode

Use `--format json` for machine-readable output:

```bash
rlm-rs --format json status
rlm-rs --format json list
rlm-rs --format json show logs --chunks
rlm-rs --format json grep logs "pattern"
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `RLM_DB_PATH` | Default database path |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Database not initialized |

---
name: rlm-query
description: Run a query against loaded RLM content using the full RLM workflow
arguments:
  - name: query
    description: The question or analysis task to perform
    required: true
  - name: buffer
    description: Specific buffer to query (defaults to all)
    required: false
---

# Query RLM Content

Execute a full RLM workflow query against loaded buffers. This orchestrates chunk analysis via sub-LLM calls and synthesizes results.

## Workflow

This command triggers the full RLM workflow:

1. **Identify target buffer(s)** - Use specified buffer or all loaded buffers
2. **Write chunks to files** - Materialize chunks for subagent processing
3. **Parallel chunk analysis** - Invoke `rlm-subcall` agent for each chunk
4. **Result synthesis** - Use `rlm-synthesizer` agent to aggregate findings
5. **Present answer** - Return coherent response to user

## Execution Steps

### Step 1: Prepare Chunks

```bash
# Store query for subagents
rlm-rs var query "{{query}}"

# Determine buffer
{{#if buffer}}
BUFFER="{{buffer}}"
{{else}}
BUFFER=$(rlm-rs --format json list | jq -r '.[0].name')
{{/if}}

# Write chunks to files
rlm-rs write-chunks "$BUFFER" --out-dir .rlm/chunks --prefix chunk
```

### Step 2: Process Each Chunk

For each chunk file in `.rlm/chunks/chunk_*.txt`:
- Invoke the `rlm-subcall` agent with the query and chunk path
- Collect JSON results

### Step 3: Synthesize Results

- Store all chunk results in a buffer
- Invoke `rlm-synthesizer` agent to aggregate findings
- Present final answer

## Example Usage

```bash
# Query all loaded content
/rlm-query query="What are the main error patterns in these logs?"

# Query specific buffer
/rlm-query query="Summarize the key architectural decisions" buffer=docs

# Complex analysis
/rlm-query query="Find all API endpoints and their authentication requirements"
```

## Notes

- Query execution time depends on number of chunks
- Chunks are processed sequentially via Task tool invocations to the `rlm-subcall` agent
- Results cached in `.rlm/chunks/` until next query
- Template variables (`{{query}}`, `{{buffer}}`) are substituted at execution time by Claude Code

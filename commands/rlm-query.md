---
name: rlm-query
description: Run a query against loaded RLM content using the full RLM workflow
argument-hint: query="<question>" [buffer=<name>] [top_k=100] [batch_size=20]
arguments:
  - name: query
    description: The question or analysis task to perform
    required: true
  - name: buffer
    description: Specific buffer to query (defaults to first available)
    required: false
  - name: top_k
    description: Maximum number of chunks to retrieve (default 100)
    required: false
  - name: batch_size
    description: Number of chunks per subcall agent batch (default 20)
    required: false
---

# Query RLM Content

Run hybrid semantic + BM25 search to find relevant chunks.

## Execution

```bash
# Determine buffer
{{#if buffer}}
BUFFER="{{buffer}}"
{{else}}
BUFFER=$(rlm-rs --format json list | jq -r '.[0].name // .[0].id')
{{/if}}

# Search for relevant chunks
rlm-rs --format json search "{{query}}" --buffer "$BUFFER" --top-k {{#if top_k}}{{top_k}}{{else}}100{{/if}}
```

## Next Steps

After search returns chunk IDs, batch and invoke subagents:

1. **Batch** chunk IDs into groups of {{#if batch_size}}{{batch_size}}{{else}}20{{/if}}
2. **Invoke** `rlm-subcall` for each batch - pass ONLY `query` and `chunk_ids` arguments:
   ```
   Task subagent_type="rlm-rs:rlm-subcall" prompt="query='{{query}}' chunk_ids='<batch>'"
   ```
3. **Collect** JSON findings from all batches
4. **Invoke** `rlm-synthesizer` with combined findings:
   ```
   Task subagent_type="rlm-rs:rlm-synthesizer" prompt="query='{{query}}' findings='[...]'"
   ```
5. **Present** synthesized answer to user

**IMPORTANT**: Do NOT write narrative prompts. Do NOT include buffer ID. The agents know what to do - just pass the arguments.

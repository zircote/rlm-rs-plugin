---
name: rlm-load
description: Load a file into an RLM buffer with chunking
arguments:
  - name: file
    description: Path to the file to load
    required: true
  - name: name
    description: Buffer name (defaults to filename)
    required: false
  - name: chunker
    description: "Chunking strategy: fixed, semantic, parallel"
    required: false
  - name: chunk-size
    description: Chunk size in characters
    required: false
  - name: overlap
    description: Overlap between chunks in characters
    required: false
---

# Load File into RLM Buffer

Load a context file into an RLM buffer with automatic chunking.

## Execution

```bash
# Verify file exists
if [ ! -f "{{file}}" ]; then
    echo "ERROR: File not found: {{file}}"
    exit 1
fi

# Load file with specified options
rlm-rs load "{{file}}" \
    {{#if name}}--name "{{name}}"{{/if}} \
    {{#if chunker}}--chunker {{chunker}}{{else}}--chunker semantic{{/if}} \
    {{#if chunk-size}}--chunk-size {{chunk-size}}{{/if}} \
    {{#if overlap}}--overlap {{overlap}}{{/if}}

# Show buffer details
rlm-rs list
```

## Chunking Strategies

- **semantic** (default): Split at natural boundaries (headings, paragraphs)
- **fixed**: Split at exact character boundaries
- **parallel**: Multi-threaded fixed chunking for large files

## Embedding

Embeddings for semantic search are generated automatically when you first run a `search` command. No manual embedding step is required.

## Examples

```bash
# Basic load with semantic chunking
/rlm-load file=document.md

# Load with custom name
/rlm-load file=server.log name=logs

# Fixed chunking with overlap for logs
/rlm-load file=app.log chunker=fixed chunk-size=150000 overlap=1000

# Fast parallel chunking for large files
/rlm-load file=huge.txt chunker=parallel chunk-size=100000
```

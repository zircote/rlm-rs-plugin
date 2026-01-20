---
name: rlm-chunking
description: This skill should be used when the user asks about "chunking strategies", "how to chunk a file", "semantic vs fixed chunking", "chunk size selection", "overlap settings", or needs guidance on selecting the appropriate chunking approach for RLM processing.
version: 0.1.0
allowed-tools:
  - Read
  - Bash
---

# RLM Chunking Strategy Guide

Select and configure the optimal chunking strategy for documents processed through the RLM workflow. Different content types require different approaches to maintain semantic coherence while respecting context limits.

## Available Strategies

### Fixed Chunking

Split content at exact byte boundaries with optional overlap.

**Best for:**
- Unstructured text (logs, raw output)
- Content without clear section markers
- Maximum control over chunk sizes

**Configuration:**
```bash
rlm-rs load <file> --chunker fixed --chunk-size 50000 --overlap 1000
```

**Parameters:**
- `--chunk-size`: Characters per chunk (default: 6000, max: 50000)
- `--overlap`: Characters shared between adjacent chunks (default: 0)

**Trade-offs:**
- Pro: Predictable chunk sizes, simple to reason about
- Con: May split mid-sentence or mid-concept

### Semantic Chunking

Split at natural boundaries (headings, paragraph breaks, code blocks).

**Best for:**
- Markdown documents
- Source code files
- Structured data (JSON, XML, YAML)
- Documentation with clear sections

**Configuration:**
```bash
rlm-rs load <file> --chunker semantic --chunk-size 50000
```

**Behavior:**
- Respects heading hierarchy (h1 > h2 > h3)
- Keeps code blocks together when possible
- Preserves paragraph boundaries
- Falls back to sentence boundaries for dense text

**Trade-offs:**
- Pro: Maintains semantic coherence
- Con: Chunk sizes may vary significantly

### Parallel Chunking

Multi-threaded chunking for very large files.

**Best for:**
- Files > 10MB
- When processing time is critical
- Bulk loading multiple files

**Configuration:**
```bash
rlm-rs load <file> --chunker parallel --chunk-size 100000
```

**Trade-offs:**
- Pro: 2-4x faster for large files
- Con: Same limitations as fixed chunking

## Selection Guide

| Content Type | Strategy | Chunk Size | Overlap |
|--------------|----------|------------|---------|
| Markdown docs | semantic | 50000 | 0 |
| Source code | semantic | 50000 | 0 |
| JSON/XML | semantic | 50000 | 0 |
| Plain text | fixed | 50000 | 500 |
| Log files | fixed | 50000 | 1000 |
| Mixed content | semantic | 50000 | 0 |
| Very large files | parallel | 50000 | 0 |

## Chunk Size Guidelines

### Context Window Considerations

The default chunk size of 6000 characters (~1500 tokens) is optimized for semantic search quality. Larger chunks (up to 50000 max) can be specified for fewer total chunks:
- Default: 6000 chars (~1500 tokens) - best for semantic search
- Maximum: 50000 chars (~12,500 tokens) - for fewer chunks

### Adjusting Size

**Increase chunk size (up to 50000) when:**
- Content has many small sections
- Need fewer total chunks
- Sections are tightly interrelated

**Decrease chunk size when:**
- Sub-LLM responses are getting truncated
- Need more granular analysis
- Content is dense with important details

## Overlap Configuration

Overlap ensures context continuity between chunks.

**When to use overlap:**
- Content has flowing narrative
- Important context may span boundaries
- Searching for patterns that cross chunk boundaries

**Typical values:**
- 0: Structured content with clear boundaries
- 500-1000: Narrative text, logs
- 2000+: Dense technical content where context matters

## Verification Commands

After loading, verify chunking results:

```bash
# Show buffer details including chunk count
rlm-rs show <buffer_name> --chunks

# View chunk boundaries
rlm-rs chunk-indices <buffer_name>

# Preview first chunk content
rlm-rs peek <buffer_name> --start 0 --end 3000
```

## Common Patterns

### Log Analysis
```bash
rlm-rs load server.log --name logs --chunker fixed --chunk-size 50000 --overlap 500
```

### Documentation Processing
```bash
rlm-rs load docs.md --name docs --chunker semantic
```

### Codebase Analysis
```bash
# Concatenate multiple files first, then load
cat src/*.rs > combined.rs
rlm-rs load combined.rs --name code --chunker semantic --chunk-size 50000
```

### Large Dataset
```bash
rlm-rs load dataset.jsonl --name data --chunker parallel --chunk-size 50000
```

## Semantic Search Considerations

Chunking strategy affects search quality:

- **Semantic chunking** works best with semantic search because chunks align with conceptual boundaries
- **Fixed chunking with overlap** helps ensure search queries match content that might span chunk boundaries
- Embeddings are generated automatically on first search - no manual step required

## Troubleshooting

**Chunks too small:** Increase `--chunk-size` or switch to semantic chunking.

**Important content split:** Add overlap or switch to semantic chunking.

**Processing too slow:** Use parallel chunking for files > 5MB.

**Sub-LLM truncating responses:** Decrease chunk size to allow more output space.

**Search missing relevant content:** Try increasing overlap or switching to semantic chunking.

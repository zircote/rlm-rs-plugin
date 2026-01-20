# RLM-RS Technical Overview

> **Status:** Early development / Experimental
> **Version:** 1.0.0
> **Last Updated:** January 2026

## Introduction

**rlm-rs** is a Rust implementation of the Recursive Language Model (RLM) pattern described in [arXiv:2512.24601](https://arxiv.org/abs/2512.24601). This project extends the original paper's concepts with modern information retrieval techniques to create a practical tool for processing documents that exceed typical LLM context windows.

This implementation is designed to be **assistant-agnostic**—while the current plugin targets Claude Code, the underlying `rlm-rs` CLI and skill architecture can be adapted to any AI assistant platform that supports skills, tools, or plugin systems.

## Research Foundations

### The RLM Pattern (arXiv:2512.24601)

The Recursive Language Model pattern addresses a fundamental limitation of LLMs: fixed context windows. The key insight is that an LLM can orchestrate its own "sub-calls" to process content in manageable chunks, then synthesize results into a coherent response.

**Core concepts from the paper:**

| Concept | Description | Our Implementation |
|---------|-------------|-------------------|
| Root LLM | Orchestrates the overall workflow | Main assistant conversation |
| Sub-LLM | Processes individual chunks | `rlm-subcall` agent (lightweight model) |
| External Environment | Stores state between calls | `rlm-rs` CLI with SQLite |
| Context Buffer | Holds intermediate results | SQLite buffer tables |

### Hybrid Search: BM25 + Semantic + RRF

A key extension beyond the original paper is our **hybrid search** system that combines multiple retrieval strategies:

#### BM25 (Best Match 25)

BM25 is a probabilistic ranking function used by search engines since the 1990s. It excels at:
- Exact keyword matching
- Term frequency analysis
- Document length normalization

```
score(D,Q) = Σ IDF(qi) · (f(qi,D) · (k1 + 1)) / (f(qi,D) + k1 · (1 - b + b · |D|/avgdl))
```

Where:
- `f(qi,D)` = frequency of term qi in document D
- `|D|` = document length
- `avgdl` = average document length
- `k1`, `b` = tuning parameters

#### Semantic Search (Vector Embeddings)

Semantic search uses dense vector representations to find conceptually similar content, even without keyword overlap:
- Captures meaning and context
- Handles synonyms and paraphrases
- Works across languages and terminology

Embeddings are generated on-demand and cached in SQLite for subsequent queries.

#### Reciprocal Rank Fusion (RRF)

RRF combines multiple ranking strategies into a single unified score. Originally introduced by Cormack, Clarke, and Buettcher (2009), it's elegant in its simplicity:

```
RRF_score(d) = Σ 1 / (k + rank_i(d))
```

Where:
- `k` = constant (default: 60) that controls influence of high-ranked documents
- `rank_i(d)` = rank of document d in ranking system i

**Why RRF?** It's robust, parameter-light, and consistently outperforms individual rankers in practice.

### Chunking Strategies

The implementation supports multiple chunking approaches:

| Strategy | Best For | Trade-offs |
|----------|----------|------------|
| **Semantic** | Markdown, code, structured docs | Respects boundaries, variable sizes |
| **Fixed** | Logs, unstructured text | Predictable sizes, may split concepts |
| **Parallel** | Very large files (>10MB) | Fast processing, same as fixed |

Semantic chunking respects document structure (headings, paragraphs, code blocks) to maintain coherent context within each chunk.

## Architecture

### SQLite as External Environment

All state persists in a local SQLite database (`.rlm/rlm-state.db`):

```
┌─────────────────────────────────────────┐
│              SQLite Database            │
├─────────────────────────────────────────┤
│  buffers     │ Loaded documents         │
│  chunks      │ Document segments        │
│  embeddings  │ Vector representations   │
│  variables   │ Context state            │
└─────────────────────────────────────────┘
```

**Why SQLite?**
- Zero configuration, single file
- ACID transactions for consistency
- Portable across platforms
- No external services required

### Pass-by-Reference Pattern

Instead of writing chunks to files, rlm-rs 1.0.0 uses **pass-by-reference**:

```
Search Results → chunk_id → Sub-Agent → rlm-rs chunk get <id> → Content
```

Benefits:
- No file I/O overhead
- Only relevant chunks are retrieved
- Atomic, consistent access via database
- Reduced disk usage

## Portability

### Assistant-Agnostic Design

The `rlm-rs` CLI is a standalone Rust binary with no dependencies on any specific AI platform. It can be integrated with:

- **Claude Code** (current implementation via skills/commands/agents)
- **OpenAI GPTs** (via function calling)
- **LangChain** (as a tool)
- **Any assistant with tool/skill support**

### Skill-Based Architecture

The plugin uses a **skill-based architecture** where:
- Skills are markdown files with frontmatter metadata
- Commands map to CLI invocations
- Agents are sub-LLM definitions with specific roles

This pattern translates to most modern AI assistant frameworks:

| This Plugin | OpenAI | LangChain | Generic |
|-------------|--------|-----------|---------|
| Skill | Custom GPT Instructions | Chain | Workflow |
| Command | Function | Tool | Action |
| Agent | Assistant | Agent | Sub-agent |

### Adapting to Other Platforms

To use rlm-rs with a different assistant:

1. **Install the CLI**: `cargo install rlm-rs`
2. **Define tools** that wrap CLI commands
3. **Create workflow** matching the RLM pattern:
   - Initialize → Load → Search → Process chunks → Synthesize

Example tool definition (generic):
```json
{
  "name": "rlm_search",
  "description": "Search loaded documents using hybrid semantic + BM25",
  "parameters": {
    "query": "Search query text",
    "top_k": "Maximum results (default: 10)",
    "buffer": "Filter by buffer name"
  },
  "command": "rlm-rs --format json search \"$query\" --top-k $top_k"
}
```

## Current Limitations

> **This is early-stage software under active development.**

### Known Limitations

1. **Embedding Model**: Currently uses a single embedding model; future versions may support model selection
2. **Search Tuning**: BM25 and RRF parameters are not yet user-configurable
3. **Large Scale**: Tested primarily on documents up to ~20MB
4. **Concurrent Access**: Single-user, single-process access to database

### Experimental Features

- Semantic chunking heuristics are being refined
- Overlap handling in hybrid search
- Performance optimization for very large documents

## Roadmap

Potential future directions (not committed):

- [ ] Configurable embedding models
- [ ] User-tunable search parameters
- [ ] Multi-document cross-referencing
- [ ] Streaming chunk processing
- [ ] Remote/shared database support

## References

### Papers

1. **RLM Pattern**: [arXiv:2512.24601](https://arxiv.org/abs/2512.24601) - Recursive Language Models for long-context processing
2. **BM25**: Robertson, S., & Zaragoza, H. (2009). The Probabilistic Relevance Framework: BM25 and Beyond
3. **RRF**: Cormack, G. V., Clarke, C. L., & Buettcher, S. (2009). Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods

### Resources

- [rlm-rs CLI Repository](https://github.com/zircote/rlm)
- [Plugin Repository](https://github.com/zircote/rlm-rs-plugin)
- [Claude Code Plugin Documentation](https://docs.anthropic.com/en/docs/claude-code/plugins)

## Contributing

This project is open source under the MIT license. Contributions, bug reports, and feedback are welcome.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

---

*This document describes rlm-rs v1.0.0. Features and behavior may change in future versions.*

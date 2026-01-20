# RLM-RS Plugin Architecture

This document describes the architecture of the rlm-rs Claude Code plugin, which implements the Recursive Language Model (RLM) pattern from arXiv:2512.24601.

## Overview

The RLM pattern enables processing of documents that far exceed LLM context window limits (up to 100x larger) by using a hierarchical approach with chunking, distributed analysis, and synthesis.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude Code (Root LLM)                       │
│                      Opus/Sonnet Model                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │   Skills    │    │  Commands   │    │       Agents        │ │
│  │             │    │             │    │                     │ │
│  │ • rlm       │    │ • rlm-init  │    │ • rlm-subcall      │ │
│  │ • rlm-      │    │ • rlm-load  │    │   (Haiku)          │ │
│  │   chunking  │    │ • rlm-status│    │                     │ │
│  │             │    │ • rlm-query │    │ • rlm-synthesizer  │ │
│  │             │    │             │    │   (Sonnet)          │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ CLI Integration
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     rlm-rs CLI (Rust)                           │
│                  External Environment                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │  Chunking   │    │   Buffer    │    │      SQLite         │ │
│  │  Engine     │    │  Manager    │    │     Storage         │ │
│  │             │    │             │    │                     │ │
│  │ • Fixed     │    │ • Load      │    │ .rlm/rlm-state.db   │ │
│  │ • Semantic  │    │ • Peek      │    │                     │ │
│  │ • Parallel  │    │ • Grep      │    │ • Buffers           │ │
│  │             │    │ • Search    │    │ • Chunks            │ │
│  │             │    │ • Chunk Get │    │ • Embeddings        │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Component Mapping

| RLM Paper Concept | Plugin Implementation |
|-------------------|----------------------|
| Root LLM | Main Claude Code conversation (Opus/Sonnet) |
| Sub-LLM (`llm_query`) | `rlm-subcall` agent (Haiku) |
| External Environment | `rlm-rs` CLI with SQLite storage |
| Context Buffer | SQLite buffer tables |
| Recursive Calls | Task tool invocations |

## Data Flow

### Processing Pipeline

```
1. User Request
   │
   ▼
2. Skill Activation (rlm skill)
   │
   ▼
3. CLI: Initialize Database
   │  rlm-rs init
   ▼
4. CLI: Load & Chunk Document
   │  rlm-rs load <file> --chunker <strategy>
   ▼
5. CLI: Search for Relevant Chunks
   │  rlm-rs search "<query>" --buffer <name> --top-k 10
   │  (Embeddings generated automatically on first search)
   ▼
6. Subcall Loop (targeted, parallel)
   │  For each relevant chunk ID from search:
   │    Task tool → rlm-subcall agent (chunk_id) → JSON findings
   │    Agent retrieves content via: rlm-rs chunk get <id>
   ▼
7. Synthesis
   │  Task tool → rlm-synthesizer agent (JSON findings) → Final answer
   ▼
8. Present to User
```

### Pass-by-Reference Pattern

The 1.0.0 workflow uses pass-by-reference for chunk content:

```
┌─────────────┐     chunk_id      ┌─────────────┐
│   Search    │ ───────────────→  │  Subcall    │
│   Results   │                   │   Agent     │
└─────────────┘                   └──────┬──────┘
                                         │
                                         │ rlm-rs chunk get <id>
                                         ▼
                                  ┌─────────────┐
                                  │   SQLite    │
                                  │   Storage   │
                                  └─────────────┘
```

Benefits:
- **No file I/O**: Chunks stay in SQLite, not written to disk
- **Efficient**: Only relevant chunks retrieved (via search)
- **Atomic**: Chunk retrieval by ID is guaranteed consistent

### State Persistence

All state persists in `.rlm/rlm-state.db`:

```sql
-- Buffers table
CREATE TABLE buffers (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE,
    content TEXT,
    chunker TEXT,
    chunk_size INTEGER,
    overlap INTEGER,
    created_at TIMESTAMP
);

-- Chunks table (with embeddings)
CREATE TABLE chunks (
    id INTEGER PRIMARY KEY,
    buffer_id INTEGER REFERENCES buffers(id),
    chunk_index INTEGER,
    start_offset INTEGER,
    end_offset INTEGER,
    content TEXT,
    embedding BLOB  -- Vector embedding for semantic search
);

-- Variables table (for context passing)
CREATE TABLE variables (
    key TEXT PRIMARY KEY,
    value TEXT
);
```

## Component Details

### Skills

#### rlm (Main Orchestrator)

**Purpose**: Orchestrates the complete RLM workflow

**Trigger Phrases**:
- "process a large file"
- "analyze document exceeding context"
- "use RLM"
- "handle long context"

**Allowed Tools**: Read, Write, Bash, Glob, Grep, Task

**Workflow**:
1. Verify rlm-rs installation
2. Initialize database
3. Load document with appropriate chunking
4. Scout content structure (peek, grep)
5. Search for relevant chunks (hybrid semantic + BM25)
6. Invoke subcall agents for each relevant chunk (by ID)
7. Synthesize results from JSON findings

#### rlm-chunking (Strategy Guide)

**Purpose**: Help select optimal chunking parameters

**Trigger Phrases**:
- "chunking strategies"
- "how to chunk a file"
- "semantic vs fixed chunking"

**Allowed Tools**: Read, Bash

### Commands

| Command | Arguments | Description |
|---------|-----------|-------------|
| `/rlm-init` | `--force` (optional) | Initialize SQLite database |
| `/rlm-load` | `file`, `name`, `chunker`, `chunk-size`, `overlap` | Load file into buffer |
| `/rlm-status` | none | Show current state |
| `/rlm-query` | `query`, `buffer` | Run analysis query |

### Agents

#### rlm-subcall (Chunk Analyzer)

**Model**: Haiku (fast, cost-effective)
**Color**: Cyan
**Tools**: Bash, Grep

**Input**: Query + chunk ID (pass-by-reference)
**Output**: Structured JSON with findings

The agent retrieves chunk content via `rlm-rs chunk get <id>`:

```json
{
  "chunk_id": 42,
  "relevant": true,
  "findings": [...],
  "metadata": {...}
}
```

#### rlm-synthesizer (Result Aggregator)

**Model**: Sonnet (more capable for synthesis)
**Color**: Green
**Tools**: Bash, Read

**Input**: Original query + JSON findings (inline or buffer name)
**Output**: Coherent markdown response with:
- Executive summary
- Key findings
- Analysis
- Recommendations

The synthesizer accepts findings directly as JSON (preferred) or as a buffer name to retrieve.

## Chunking Strategies

### Fixed Chunking

```
Document: [==========================================]
                        ↓
Chunks:   [=====][=====][=====][=====][=====][=====]
          ← size →
```

- Splits at exact byte boundaries
- Predictable chunk sizes
- May split mid-concept

### Semantic Chunking

```
Document: [# Heading 1        ][# Heading 2        ]
          [  paragraph...     ][  paragraph...     ]
          [  code block...    ][  - list item      ]
                        ↓
Chunks:   [# Heading 1    ][# Heading 2    ]
          [  content...   ][  content...   ]
```

- Respects document structure
- Variable chunk sizes
- Maintains semantic coherence

### Overlap

```
Chunk 1: [===============]
                    [===]  ← overlap
Chunk 2:            [===============]
                              [===]  ← overlap
Chunk 3:                      [===============]
```

- Ensures context continuity
- Prevents loss of boundary information
- Increases total chunks slightly

## Security Considerations

1. **File Access**: Plugin only accesses files explicitly provided by user
2. **State Isolation**: Each project has its own `.rlm/` directory
3. **No Network Access**: CLI operates entirely locally
4. **Subprocess Containment**: Agents run in Claude Code's sandboxed environment

## Performance Characteristics

| Metric | Typical Value |
|--------|---------------|
| Chunk processing | ~2-5s per chunk (Haiku) |
| Synthesis | ~5-15s (Sonnet) |
| Max document size | ~20MB practical limit |
| Typical chunks | 10-100 for large docs |

## Extension Points

### Adding New Chunking Strategies

Implement in rlm-rs CLI (Rust):
1. Add variant to `ChunkStrategy` enum
2. Implement `Chunker` trait
3. Register in CLI argument parser

### Adding New Finding Types

Update `rlm-subcall` agent:
1. Add type to finding types list
2. Document expected evidence format
3. Update synthesizer to handle new type

## Related Documentation

- [CLI Reference](../skills/rlm/references/cli-reference.md)
- [Chunking Guide](../skills/rlm-chunking/SKILL.md)
- [RLM Paper](https://arxiv.org/abs/2512.24601)

# Changelog

All notable changes to the rlm-rs Claude Code plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `batch_size` argument to `/rlm-query` command for configurable subcall batching (default 20)
- `argument-hint` frontmatter to all commands for improved autocomplete display

### Changed
- Increased default `--top-k` from 10 to 100 for chunk retrieval to improve analysis coverage

## [1.1.0] - 2025-01-19

### Added
- Technical overview documentation explaining RLM implementation, hybrid search, and architecture

### Changed
- Updated chunk size defaults in documentation to match rlm-rs 1.1.2

## [1.0.0] - 2025-01-19

### Added
- **Core RLM Workflow**: Full implementation of the Recursive Language Model pattern from arXiv:2512.24601
- **Hybrid Search**: BM25 + semantic search with Reciprocal Rank Fusion (RRF) for finding relevant chunks
- **Pass-by-Reference**: Chunk retrieval by ID instead of file-based workflow for efficiency
- **Commands**:
  - `/rlm-init` - Initialize SQLite database
  - `/rlm-load` - Load files with chunking (fixed, semantic, parallel)
  - `/rlm-status` - Show current buffers and state
  - `/rlm-query` - Run queries with automatic chunk analysis
- **Skills**:
  - `rlm` - Main workflow orchestration for large context processing
  - `rlm-chunking` - Chunking strategy selection guide
- **Agents**:
  - `rlm-subcall` - Haiku-based chunk analyzer with JSON output
  - `rlm-synthesizer` - Sonnet-based result aggregator
- **Documentation**:
  - Architecture documentation with diagrams
  - CLI reference guide
  - Contributing guidelines

### Changed
- Migrated from file-based chunk workflow to pass-by-reference with chunk IDs
- Embeddings now generated automatically on first search (lazy loading)

## [0.1.0] - 2025-01-19

### Added
- Initial plugin structure and manifest
- GitHub social assets and README
- CI workflow for plugin validation
- Basic documentation

[Unreleased]: https://github.com/zircote/rlm-rs-plugin/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/zircote/rlm-rs-plugin/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/zircote/rlm-rs-plugin/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/zircote/rlm-rs-plugin/releases/tag/v0.1.0

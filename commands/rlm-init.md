---
name: rlm-init
description: Initialize the RLM database for storing buffers and state
arguments:
  - name: force
    description: Force re-initialization (destroys existing data)
    required: false
---

# Initialize RLM Database

Initialize the rlm-rs SQLite database for buffer and state management.

## Execution

```bash
# Check if rlm-rs is installed
if ! command -v rlm-rs &> /dev/null; then
    echo "ERROR: rlm-rs not found in PATH"
    echo "Install with: cargo install rlm-rs"
    exit 1
fi

# Initialize database
rlm-rs init {{#if force}}--force{{/if}}

# Show status
rlm-rs status
```

## Notes

- Creates `.rlm/rlm-state.db` SQLite database in current directory
- Use `--force` to reset an existing database (destroys all data)
- Safe to run multiple times without `--force` (idempotent)

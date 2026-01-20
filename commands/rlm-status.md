---
name: rlm-status
description: Show current RLM state including buffers and database info
argument-hint: (no arguments)
arguments: []
---

# RLM Status

Display current RLM state including buffer count, database info, and loaded content.

## Execution

```bash
# Check if database exists
if [ ! -f ".rlm/rlm-state.db" ]; then
    echo "RLM database not initialized. Run /rlm-init first."
    exit 1
fi

# Show status
echo "=== RLM Status ==="
rlm-rs status

echo ""
echo "=== Loaded Buffers ==="
rlm-rs list
```

## Output Includes

- Database path and size
- Total buffer count
- Total chunk count
- Schema version
- List of all buffers with sizes and chunk counts
- Embedding status (use `rlm-rs chunk status` for details)

## JSON Output

For programmatic access:

```bash
rlm-rs --format json status
rlm-rs --format json list
```

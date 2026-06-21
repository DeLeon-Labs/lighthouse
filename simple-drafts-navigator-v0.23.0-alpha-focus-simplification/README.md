# Simple Drafts Navigator v0.22.1-alpha

Internal alpha iteration for the Focus Sources/Work drill-down prototype.

## Changes

- Treat Sources and Work as the canonical Focus item sections
- Keep legacy `items` data only as a backward-compatible Sources mirror
- Prevent Work items from being re-added to Sources during normalization
- Remove stale Focus membership from Sources, Work, and legacy item arrays together
- Lock Focus rendering to the Sources / Work drill-down view
- Update Focus edit summaries to show Sources, Work, Global Sources, and Global Work separately

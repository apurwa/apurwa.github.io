# Theme exploration (parked)

Exploration of a lighter / brighter palette for the portfolio. **Parked** —
pick up here later. Nothing below is live on the site; the default palette in
`styles.css` (`:root`) is unchanged.

## How to resume the live picker

1. Add this line before `</body>` in `index.html`:
   ```html
   <script src="docs/theme-lab.js"></script>
   ```
2. Serve locally (`python3 -m http.server`) and open the page. A palette picker
   appears bottom-right; click through candidates (choice persists via
   localStorage). Remove the `<script>` line again when done.

The picker just overrides the `:root` CSS variables live — no other code path.

## Candidate palettes

Each sets `--bg`, `--card-border`, `--card-border-soft`, `--fg`, `--muted`,
`--accent`, `--hover` (and optionally `--accent2`). Full values live in
`docs/theme-lab.js` (`PALETTES`).

### Soft / light
| id | name | bg | accent |
|----|------|----|--------|
| current | Warm Cream (baseline) | `#f7efcf` | `#9d0006` |
| A | Bright Linen | `#fbf6ea` | `#b5321a` |
| B | Cool Porcelain | `#f6f7f9` | `#c0331e` |
| C | Sunlit Ivory | `#fdfbf4` | `#e0431c` |
| D | Cloud White | `#fcfcfb` | `#cc3b16` |

### Vibrant
| id | name | bg | accent |
|----|------|----|--------|
| E | Tangerine | `#fff7ee` | `#ea580c` |
| F | Electric Coral | `#fff4f3` | `#fb2c48` |
| G | Emerald | `#f1fbf6` | `#059669` |
| H | Cobalt | `#f3f7ff` | `#2563eb` |
| I | Fuchsia | `#fdf3fa` | `#db2777` |

### Emerald two-tone (second accent `--accent2`)
`--accent2` sparks three signature spots: the name `_` cursor, the résumé CTA
icon + arrow, and the right-column `↗` arrows. Wired in `styles.css` with a
`var(--accent2, currentColor)` fallback, so single-accent themes are unchanged.

| id | primary | second accent |
|----|---------|---------------|
| G1 | Emerald `#059669` | Amber `#f59e0b` |
| G2 | Emerald `#059669` | Coral `#f43f5e` |
| G3 | Emerald `#059669` | Sky `#0ea5e9` |

## Open threads for next time
- Retune the background grid (`body::before`) + ambient dots (`bg3d.js`) — still
  hardwired warm olive/ember; they clash slightly on cool themes (B, D, H).
- Decide single- vs two-tone, and where `--accent2` should appear.
- Once chosen, bake the winner into `:root` in `styles.css`.

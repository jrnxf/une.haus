# Tricks Data Structure

This document outlines the rules for the trick combination data in `src/data/trick-combinations.json`.

## Data Files

- `src/data/trick-combinations.json` - Current active trick data (spin+flip combos)
- `src/data/tricks.json` - Original full tricks database (preserved for reference)

To switch back to the original data, change the import in `src/lib/tricks/data.ts`:
```ts
// Current: import rawTricks from "~/data/trick-combinations.json";
// Original: import rawTricks from "~/data/tricks.json";
```

## Trick Structure

```ts
{
  id: string;                    // kebab-case identifier (e.g., "hickdoublebackflip")
  name: string;                  // Display name (e.g., "Hickdoublebackflip")
  alternateNames: string[];      // Common aliases
  categories: string[];          // ["spin"], ["flip"], ["spin", "flip"], ["spin", "flip", "wrap"]
  definition: string;            // Human-readable description
  prerequisite: string | null;   // Primary progression path (ID of prerequisite trick)
  optionalPrerequisite: string | null; // Secondary skill needed
  isPrefix: boolean;             // Whether this can prefix other tricks
  notes: string | null;
  relatedTricks: string[];       // IDs of related tricks (ONE degree of separation)
}
```

## Naming Conventions

### Spin Levels (unispin rotation)
| Degrees | Prefix | Example |
|---------|--------|---------|
| 180° | hick | hickflip |
| 360° | trey | treyflip |
| 540° | fifth | fifthflip |
| 720° | sej | sejflip |
| 900° | ninth | ninthflip |
| 1080° | tenth | tenthflip |

### Flip Levels (crank rotations)
| Rotations | Name |
|-----------|------|
| 1 | crankflip / flip |
| 2 | doubleflip |
| 3 | tripleflip |
| 4 | quadflip |
| 5 | quintflip |
| 6 | sexflip |

### Modifiers
- **side** - Adds leg wrap in same direction as spin (e.g., hicksideflip)
- **back** - Reverse crank rotation direction (e.g., hickbackflip)

Modifiers can combine: `hicksidebackflip` = 180 sidespin + backflip

## Related Tricks Rules

**The `relatedTricks` array must contain only tricks that are ONE degree of separation away.**

A trick is one degree away if you can transform into it by making exactly ONE of these changes:

1. **Add/remove the spin component**
   - `crankflip` ↔ `hickflip` (add/remove 180 spin)
   - `treyflip` ↔ `360-unispin` (add/remove flip)

2. **Change spin level by one step (±180°)**
   - `hickflip` ↔ `treyflip` (180 ↔ 360)
   - `treyflip` ↔ `fifthflip` (360 ↔ 540)
   - NOT `hickflip` ↔ `fifthflip` (skips 360)

3. **Change flip level by one rotation**
   - `hickflip` ↔ `hickdoubleflip`
   - `treydoubleflip` ↔ `treytripleflip`
   - NOT `hickflip` ↔ `hicktripleflip` (skips double)

4. **Add/remove side modifier**
   - `treyflip` ↔ `treysideflip`
   - `hickbackflip` ↔ `hicksidebackflip`

5. **Change flip direction (forward ↔ back)**
   - `hickflip` ↔ `hickbackflip`
   - `treydoubleflip` ↔ `treydoublebackflip`

### Examples

**hickdoublebackflip** related tricks:
- `doublebackflip` - remove spin (one change)
- `hickbackflip` - reduce flip level by one (one change)
- `hickdoubleflip` - change flip direction (one change)
- `treydoublebackflip` - increase spin level by one (one change)

**NOT related:**
- `crankflip` - too many steps (remove spin AND change flip)
- `fifthdoublebackflip` - skips trey level
- `180-unispin` - removes entire flip component AND back modifier

## Prerequisite vs Related

- **prerequisite**: Linear progression path for learning (what you need to know first)
- **relatedTricks**: Graph connections for exploration (similar tricks to discover)

The prerequisite chain follows skill progression:
```
180-unispin → hickflip → hickdoubleflip → hicktripleflip → hickquadflip
```

Related tricks fan out in multiple directions from any node.

## 900°+ Restrictions

For tricks at 900° spin and above, only single flip variants are included (no doubleflip, tripleflip, etc.). This keeps the data focused on tricks that have been realistically performed.

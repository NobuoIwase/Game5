# Scout source atlas

- Created with built-in image_gen using the supplied Photo 2 character sheet.
- `scout-source.png`: 1774 x 887, 32-bit RGBA with real transparent background.
- Exact 4 columns x 2 rows; logical cell width 443.5 and cell height 443.5. Crop using rounded proportional boundaries (or detect per-cell alpha bounds), not an assumed 512-pixel grid.
- Order: south, southeast, east, northeast / north, northwest, west, southwest.
- Eight independently rendered views; no programmatic horizontal reflection was used. Both front and back three-quarter directions exist after one imagegen correction.
- Reference preserved: huge pale fennec ears, blond/pink hair tips, red eyes, navy scarf, purple torso garment, opaque dark leggings, gloves/cuffed boots, olive backpack and burgundy bedroll, pale pink tail.
- Source is an illustrated neutral standing atlas, not itself a completed walk or run cycle.
- Main subject alpha is mostly 252-253 (near opaque). Very low alpha fringe pixels exist; consumers should ignore alpha <= 8 when computing visible bounds. Actual alpha was preserved without image-editing postprocessing.
- Visual caveats: southeast is a slightly stronger three-quarter view than southwest; northwest shows more facial profile than northeast. Knife silhouettes/straps vary subtly with view; small sprite equipment continuity merits final in-game review. No claim of exact 3D rotational reconstruction.
- A first attempt repeated several directions. Only the corrected second output was selected. The full initial prompt and targeted correction are recorded in `scout-prompt.txt`.

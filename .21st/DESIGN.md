# E-DUMP design context

Native Expo app for BCS-3E. Use the four existing brand colours, dark mode, licensed font mappings with approved preview fallbacks, native controls and one responsive column.

The layout reference is [Task manager Mobile app UI by Rohan Kumar](https://www.figma.com/community/file/1025672621370192050/task-manager-mobile-app-ui), viewed through Figma Community. Adapt its compact context headers, grouped lists and action hierarchy to the existing E-DUMP routes. No template source, assets, features or dependencies are copied.

Screen provides a solid moss context header with an ink title, subtitle and optional existing route action. Row and ScheduleRow use compact filled surfaces; functional icon tiles and file-count badges establish hierarchy. Profile actions use grouped setting rows. Filters remain horizontal and scrollable. Forms retain their native inputs and keyboard handling; upload selection keeps the native document picker and real progress.

Use theme tokens, a centred tablet column, scalable text, 48 dp controls, and reduced-motion-aware Reanimated feedback. No gradients, shadows, glow, grids, decorative bounce or additional dependencies. Owner-approved filled panels and rounded controls override the initial text-only visual direction.

The 21st catalogue search returned HTTP 401; no external catalogue code was retrieved. Decisions and the Figma reference are recorded in design.json.

11 October 2026: stabilized scrolling by removing measurement-driven row state, bounding list/form viewports and retaining animated row views. Upload selection supports batches with independent titles, per-file errors and retry of unfinished files; update attachments keep the three-file limit. Existing reference, palette and primitives retained. Catalogue search again returned HTTP 401; no external code added.

17 October 2026: preserve natural text height in vertical stacks. Typography does not shrink on the main axis; phone row titles have no flex growth or shrinkage and retain full available width. Browser heading and row entrance transforms are disabled; native reduced-motion-aware animation and button feedback remain. Captions use 14/20 for easier reading. Mastheads cannot collapse, and browser forms leave keyboard viewport sizing to the browser.

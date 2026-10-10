# E-DUMP design context

Native Expo app for BCS-3E, using the existing dark editorial theme. Sources and decisions are recorded in design.json.

Reuse Screen, Heading, Text, Row, Button, TextAction, Field, FilterText, TabLabel and ProgressLine. Keep one column, the 24 pt axis, token spacing, Recoleta/Berthold mappings and the four brand colours. File selection is a full-width Row with type/size guidance and selected-file text. Motion is implemented using Reanimated with reduced-motion support. No gradients, shadows, decorative bounce or additional dependencies.

The 21st catalogue search was attempted and returned HTTP 401. This implementation reuses project primitives rather than external catalogue source.

# Mobile Workbench Design

## Decisions

- A shared media-query subscription drives compact presentation. Desktop emulation on a narrow viewport is also compact; phones in landscape use a coarse-pointer/short-height query. Resize and orientation changes do not remount the canvas engine or duplicate stores.
- Mobile defaults to the new experience when there is no explicit or saved version preference. Explicit legacy selection remains supported.
- Home shares the existing generation controls and draft event. Mobile omits the desktop feature carousel/model wall, using existing artwork with a compact creation-first layout.
- Canvas shares all node CRUD, generation and recovery handlers. Resource browsing becomes a dismissible overlay. Editors appear outside transformed world coordinates in a bottom sheet, preserving metadata and reference selection.
- Background touch pointers use one-finger pan and two-finger anchored pinch; node dragging remains the existing handler. UI overlays retain normal scrolling and form behavior.
- Config and batch UI reuse existing components with scoped compact layouts. Trial authorization and server credentials remain unchanged.

## Risks

- Pointer capture/cancel must release touch state and cannot leak into node dragging or forms. Add touch-navigation coverage.
- Compact editors must not unmount desktop editors on ordinary viewport movement or create multiple inputs for one node.
- Mobile sheets and portals require compatible z-index and safe-area spacing. Check real screenshots at 360/390 px, landscape and desktop.
- Keyboard visibility must not leave controls behind the bottom browser edge. Use dynamic viewport sizing and scrollable editor content.

## Validation

Typecheck, focused home handoff/navigation/config/touch tests, production build and Playwright mobile/desktop screenshots. Mock public trial session only and avoid paid generation. Preserve existing settings and document fixtures. No server deployment.

# Change: Unified OpenTu Canvas Workbench

## Why

Version labels obscure the distinct purposes of the two canvases. A single workbench should let visitors choose a canvas while retaining existing projects and shared model configuration.

## Approval

The user selected develop and option A: one workbench entry with two canvas choices, and authorized deployment after validation.

## What Changes

- Integrate origin/develop while preserving publisher credentials, shared providers, trial authorization and mobile presentation.
- Use the existing creation home as the unified workbench with Free Canvas and Workflow Canvas choices.
- Remember the selected canvas and restore its document when switching or reloading.
- Preserve prompt, model, dimensions, parameters and quantity when opening either canvas from home.
- Replace version labels with canvas names and provide a workbench return action.
- Keep both document formats and browser storage intact; load editors on demand.

## Impact

- Affected capability: canvas-workbench.
- Affected code: application routing, creation home, canvas headers and generation handoff.
- Publisher API keys remain server-side; authorization and provider settings remain shared.

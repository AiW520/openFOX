import { useEffect, useMemo, useState } from 'react';
import { PlaitPointerType } from '@plait/core';
import {
  DrawnixContext,
  type DrawnixState,
} from '../../hooks/use-drawnix';
import { SettingsDialog } from '../settings-dialog/settings-dialog';
import { useCompactScreen } from '../../hooks/use-compact-screen';

export interface NewExperienceSettingsOverlayProps {
  onClose: () => void;
  initialView?: 'tuzi-account' | 'providers';
}

/**
 * Keeps the new-version home mounted while reusing the existing settings UI.
 * The settings dialog only needs Drawnix app state, so it can run in a small
 * bridge context without mounting a second canvas.
 */
export function NewExperienceSettingsOverlay({
  onClose,
  initialView = 'tuzi-account',
}: NewExperienceSettingsOverlayProps) {
  const compactScreen = useCompactScreen();
  const [appState, setAppState] = useState<DrawnixState>(() => ({
    pointer: PlaitPointerType.hand,
    isMobile: compactScreen,
    isPencilMode: false,
    openDialogTypes: new Set(),
    dialogInitialData: null,
    dialogInitialDataByType: {},
    openCleanConfirm: false,
    openSettings: true,
  }));

  useEffect(() => {
    setAppState(current => ({ ...current, isMobile: compactScreen }));
  }, [compactScreen]);

  useEffect(() => {
    if (!appState.openSettings) {
      onClose();
    }
  }, [appState.openSettings, onClose]);

  const contextValue = useMemo(
    () => ({ appState, setAppState, board: null }),
    [appState]
  );

  return (
    <DrawnixContext.Provider value={contextValue}>
      <SettingsDialog
        container={typeof document === 'undefined' ? null : document.body}
        initialView={initialView}
      />
    </DrawnixContext.Provider>
  );
}

export default NewExperienceSettingsOverlay;

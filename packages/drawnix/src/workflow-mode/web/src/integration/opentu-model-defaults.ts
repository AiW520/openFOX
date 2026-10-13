import { useEffect } from "react";
import { settingsManager } from '../../../../utils/settings-manager';
import { refreshSharedSettings } from './shared-settings';
import { useConfigStore } from '../stores/use-config-store';

/** Refresh workflow selectors from the shared OpenTu provider configuration. */
export const syncOpenTuModels = refreshSharedSettings;

export function useOpenTuModelDefaults() {
    useEffect(() => {
        let active = true;
        const sync = () => { void refreshSharedSettings(() => active).catch(error => console.error('[Workflow] Could not read providers', error)); };
        const paths = ['providerProfiles', 'providerCatalogs', 'invocationPresets', 'activePresetId', 'gemini'];
        paths.forEach(path => settingsManager.addListener(path, sync));
        sync();
        return () => {
            active = false;
            useConfigStore.setState({ sharedSettingsReady: false });
            paths.forEach(path => settingsManager.removeListener(path, sync));
        };
    }, []);
}

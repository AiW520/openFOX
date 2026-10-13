import { Button } from 'antd';
import { Pencil, Plus } from 'lucide-react';
import { useOpenTuRuntime } from '../../integration/opentu-runtime';
import { useConfigStore } from '../../stores/use-config-store';
import { queueProviderSettingsNavigation } from '../../../../../components/settings-dialog/provider-settings-navigation';

export function SharedProviderChannels() {
    const channels = useConfigStore(state => state.config.channels);
    const { onOpenProviderSettings } = useOpenTuRuntime();
    const open = (profileId?: string | null) => {
        useConfigStore.getState().setConfigDialogOpen(false);
        if (profileId) queueProviderSettingsNavigation({ action: 'select', profileId });
        else queueProviderSettingsNavigation({ action: 'create' });
        onOpenProviderSettings?.(profileId);
    };
    return <div>
        <div className="mb-4 flex justify-end"><Button icon={<Plus size={15} />} onClick={() => open()}>添加供应商</Button></div>
        <div className="space-y-2">
            {channels.map(channel => <div key={channel.id} className="flex items-center justify-between gap-3 border-b border-stone-200 py-3 dark:border-stone-800">
                <div className="min-w-0"><div className="truncate text-sm font-medium">{channel.name}</div><div className="mt-1 truncate text-xs text-stone-500">{channel.baseUrl} · {channel.models.length} 个模型</div></div>
                <Button size="small" icon={<Pencil size={14} />} onClick={() => open(channel.opentuProfileId)}>编辑</Button>
            </div>)}
        </div>
    </div>;
}

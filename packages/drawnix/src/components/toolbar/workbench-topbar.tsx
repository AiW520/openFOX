import React from 'react';
import { ATTACHED_ELEMENT_CLASS_NAME, PlaitBoard } from '@plait/core';
import { ArrowLeft, Layers, SlidersHorizontal } from 'lucide-react';
import { useDrawnix, DialogType } from '../../hooks/use-drawnix';
import { useI18n } from '../../i18n';
import { generateUUID } from '../../utils/runtime-helpers';
import { queueProviderSettingsNavigation } from '../settings-dialog/provider-settings-navigation';
import { SiteShare } from './site-share';
import './workbench-topbar.scss';

export const WorkbenchTopbar = React.memo(function WorkbenchTopbar({
  taskButtonRef,
  batchAvailable,
  onBackToNewHome,
  onSwitchToLegacy,
}: {
  taskButtonRef: (element: HTMLDivElement | null) => void;
  batchAvailable: boolean;
  onBackToNewHome?: () => void;
  onSwitchToLegacy?: () => void;
}) {
  const { board, setAppState, openDialog } = useDrawnix();
  const { language } = useI18n();
  const zh = language === 'zh';

  return (
    <header
      className={`workbench-topbar ${ATTACHED_ELEMENT_CLASS_NAME}`}
      data-testid="workbench-topbar"
    >
      <button
        type="button"
        className="workbench-topbar__brand"
        aria-label={zh ? '返回工作台首页' : 'Back to workbench home'}
        title={zh ? '返回工作台首页' : 'Back to workbench home'}
        onClick={onBackToNewHome}
      >
        <ArrowLeft size={14} aria-hidden="true" />
        <span>OpenTu</span>
      </button>
      <div
        className="workbench-topbar__version"
        role="group"
        aria-label={zh ? '切换画布' : 'Switch canvas'}
        data-testid="workbench-version-switcher"
      >
        <button type="button" aria-pressed="true">
          {zh ? '自由画布' : 'Free canvas'}
        </button>
        <button type="button" aria-pressed="false" onClick={onSwitchToLegacy}>
          {zh ? '工作流画布' : 'Workflow canvas'}
        </button>
      </div>
      <nav
        className="workbench-topbar__actions"
        aria-label={zh ? '工作台快捷操作' : 'Workbench actions'}
      >
        <button
          type="button"
          className="workbench-topbar__button"
          data-testid="workbench-config"
          aria-label={zh ? '配置' : 'Settings'}
          onClick={() => {
            queueProviderSettingsNavigation({
              action: 'select', profileId: 'legacy-default',
            });
            setAppState((prev) => ({ ...prev, openSettings: true }));
          }}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          <span>{zh ? '配置' : 'Settings'}</span>
        </button>
        {batchAvailable && (
          <button
            type="button"
            className="workbench-topbar__button workbench-topbar__batch"
            data-testid="workbench-batch"
            onClick={() =>
              openDialog(DialogType.aiImageGeneration, {
                imageGenerationMode: 'batch',
                prefillId: generateUUID(),
              })
            }
          >
            <Layers size={16} aria-hidden="true" />
            <span>{zh ? '批量生图' : 'Batch images'}</span>
          </button>
        )}
        <div className="workbench-topbar__task-slot" ref={taskButtonRef} />
      </nav>
      <SiteShare
        container={board ? PlaitBoard.getBoardContainer(board) : null}
      />
    </header>
  );
});

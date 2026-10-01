import React, { useEffect, useRef } from 'react';
import { WorkflowProvider } from '../../contexts/WorkflowContext';
import { ModelHealthProvider } from '../../contexts/ModelHealthContext';
import { AIInputBar } from '../ai-input-bar/AIInputBar';

interface DeferredAIInputBarProps {
  canvasLayout?: 'legacy' | 'workbench';
  isDataReady: boolean;
  currentBoardId?: string | null;
  activationKey: number;
  onEnableToolWindows?: () => void;
  onEnableRuntime?: () => void;
}

export function DeferredAIInputBar({
  canvasLayout = 'legacy',
  isDataReady,
  currentBoardId,
  activationKey,
  onEnableToolWindows,
  onEnableRuntime,
}: DeferredAIInputBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activationKey <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      const textarea = containerRef.current?.querySelector<HTMLTextAreaElement>(
        '[data-testid="ai-input-textarea"]'
      );
      textarea?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activationKey]);

  return (
    <WorkflowProvider>
      <ModelHealthProvider>
        <div ref={containerRef}>
          <AIInputBar
            canvasLayout={canvasLayout}
            isDataReady={isDataReady}
            currentBoardId={currentBoardId}
            onEnableToolWindows={onEnableToolWindows}
            onEnableRuntime={onEnableRuntime}
          />
        </div>
      </ModelHealthProvider>
    </WorkflowProvider>
  );
}

export default DeferredAIInputBar;

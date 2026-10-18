import { createCachedLoader } from '../../../utils/cached-loader';

export const loadCanvasProject = createCachedLoader(() => import('./pages/canvas/project'));

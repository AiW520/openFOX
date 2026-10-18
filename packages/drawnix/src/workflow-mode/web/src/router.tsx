import { Router, createPath, Outlet, useRoutes, type Navigator } from "react-router-dom";
import { lazy, Suspense, useSyncExternalStore } from "react";
import { getWorkflowNavigationSnapshot, navigateWorkflow, subscribeWorkflowNavigation } from "../../host/workflow-navigation";

import { AnalyticsTracker } from "@/components/layout/analytics-tracker";
import UserLayout from "@/layouts/user-layout";
import { loadCanvasProject } from './canvas-entry-loader';
const AssetsPage = lazy(() => import("@/pages/assets"));
const CanvasPage = lazy(() => import("@/pages/canvas"));
const CanvasProjectPage = lazy(loadCanvasProject);
const ConfigPage = lazy(() => import("@/pages/config"));
const DocsPage = lazy(() => import("@/pages/docs"));
const ImagePage = lazy(() => import("@/pages/image"));
const NotFound = lazy(() => import("@/pages/not-found"));
const PromptsPage = lazy(() => import("@/pages/prompts"));
const VideoPage = lazy(() => import("@/pages/video"));
const BatchGenerationPage = lazy(() => import("@/pages/batch-generation"));

function WorkflowRouteFallback() {
    return <div className="workflow-route-loading" role="status">正在加载页面...</div>;
}

const routes = [
    {
        element: <UserLayout><AnalyticsTracker /><Suspense fallback={<WorkflowRouteFallback />}><Outlet /></Suspense></UserLayout>,
        children: [
            { path: "/", element: <CanvasPage /> },
            { path: "/image", element: <ImagePage /> },
            { path: "/video", element: <VideoPage /> },
            { path: "/assets", element: <AssetsPage /> },
            { path: "/prompts", element: <PromptsPage /> },
            { path: "/canvas", element: <CanvasPage /> },
            { path: "/canvas/:id", element: <CanvasProjectPage /> },
            { path: "/config", element: <ConfigPage /> },
            { path: "/docs", element: <DocsPage /> },
            { path: "/batch-generation", element: <BatchGenerationPage /> },
        ],
    },
    { path: "*", element: <Suspense fallback={<WorkflowRouteFallback />}><NotFound /></Suspense> },
];

const workflowPath = (to: Parameters<Navigator["createHref"]>[0]) => "/workflow" + (typeof to === "string" ? to : createPath(to));
const navigator: Navigator = {
    createHref: workflowPath,
    go: (delta) => window.history.go(delta),
    push: (to, state) => navigateWorkflow(workflowPath(to), false, state),
    replace: (to, state) => navigateWorkflow(workflowPath(to), true, state),
};

function WorkflowPages() { return useRoutes(routes); }

export function WorkflowRouter() {
    const { href } = useSyncExternalStore(subscribeWorkflowNavigation, getWorkflowNavigationSnapshot);
    const url = new URL(href);
    return (
        <Router navigator={navigator} location={{ pathname: url.pathname.replace(/^\/workflow(?=\/|$)/, "") || "/", search: url.search, hash: url.hash, state: window.history.state?.usr }}>
            <WorkflowPages />
        </Router>
    );
}

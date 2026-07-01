import { useEffect, useRef } from "react";

import type {
  EditorMediaReference,
  EditorProject,
} from "~/main/modules/editor";

import { shouldHydrateEditorProject } from "./EditorPage.utils";

interface UseEditorRouteHydrationInput {
  hydrate: (source?: EditorMediaReference | null) => Promise<boolean>;
  openProject: (projectId: string) => Promise<boolean>;
  project: EditorProject | null;
  projectId: string | null;
  source: EditorMediaReference | null;
}

function useEditorRouteHydration({
  hydrate,
  openProject,
  project,
  projectId,
  source,
}: UseEditorRouteHydrationInput): boolean {
  const pendingRouteKeyRef = useRef<string | null>(null);
  const sourceId = source?.id;
  const sourceKind = source?.kind;
  const sourceKey = sourceId && sourceKind ? `${sourceKind}:${sourceId}` : null;
  const routeProjectKey = projectId ? `project:${projectId}` : null;
  const routeKey = routeProjectKey ?? sourceKey ?? "project:new";
  const isRouteHydrated = isEditorRouteHydrated({
    project,
    projectId,
    sourceId,
    sourceKind,
  });

  useEffect(() => {
    if (isRouteHydrated) {
      if (pendingRouteKeyRef.current === routeKey) {
        pendingRouteKeyRef.current = null;
      }
      return;
    }

    if (pendingRouteKeyRef.current === routeKey) {
      return;
    }

    pendingRouteKeyRef.current = routeKey;

    if (projectId && routeProjectKey) {
      void Promise.resolve(openProject(projectId)).then((didOpenProject) => {
        if (!didOpenProject && pendingRouteKeyRef.current === routeKey) {
          pendingRouteKeyRef.current = null;
        }
      });
      return;
    }

    if (!sourceKey) {
      void Promise.resolve(hydrate(null)).then((didHydrate) => {
        if (!didHydrate && pendingRouteKeyRef.current === routeKey) {
          pendingRouteKeyRef.current = null;
        }
      });
      return;
    }

    void Promise.resolve(
      hydrate(
        sourceId && sourceKind ? { id: sourceId, kind: sourceKind } : null,
      ),
    ).then((didHydrate) => {
      if (!didHydrate && pendingRouteKeyRef.current === routeKey) {
        pendingRouteKeyRef.current = null;
      }
    });
  }, [
    hydrate,
    isRouteHydrated,
    openProject,
    projectId,
    routeKey,
    routeProjectKey,
    sourceId,
    sourceKey,
    sourceKind,
  ]);

  return isRouteHydrated;
}

function isEditorRouteHydrated(input: {
  project: EditorProject | null;
  projectId: string | null;
  sourceId: string | undefined;
  sourceKind: EditorMediaReference["kind"] | undefined;
}): boolean {
  if (input.projectId) {
    return input.project?.id === input.projectId;
  }

  if (!input.sourceId || !input.sourceKind) {
    return input.project !== null;
  }

  return (
    input.project !== null &&
    !shouldHydrateEditorProject({
      project: input.project,
      sourceId: input.sourceId,
      sourceKind: input.sourceKind,
    })
  );
}

export { useEditorRouteHydration };

import { trackEvent } from "~/renderer/modules/umami";

import { editorHistoryLimit } from "./Editor.slice.constants";
import type { EditorSliceActionContext } from "./Editor.slice.context";
import type { EditorSlice } from "./Editor.slice.types";
import { createEditorProjectHistorySnapshot } from "./Editor.slice.utils";

type EditorHistoryActions = Pick<
  EditorSlice["editor"],
  | "beginHistoryTransaction"
  | "commitHistoryTransaction"
  | "redoProjectChange"
  | "undoProjectChange"
>;

function createEditorHistoryActions({
  cancelPendingProjectSave,
  get,
  persistProject,
  set,
  setProject,
}: EditorSliceActionContext): EditorHistoryActions {
  return {
    beginHistoryTransaction: (label = "Edit", subtitle = null) => {
      const project = get().editor.project;
      if (!project || get().editor.historyTransactionProject) {
        return;
      }

      cancelPendingProjectSave();
      set((state) => {
        state.editor.historyTransactionLabel = label;
        state.editor.historyTransactionSubtitle = subtitle;
        state.editor.historyTransactionProject = project;
      });
    },
    commitHistoryTransaction: () => {
      const transactionProject = get().editor.historyTransactionProject;
      const project = get().editor.project;
      const transactionLabel = get().editor.historyTransactionLabel ?? "Edit";
      const transactionSubtitle = get().editor.historyTransactionSubtitle;
      if (!transactionProject || !project || transactionProject === project) {
        set((state) => {
          state.editor.historyTransactionLabel = null;
          state.editor.historyTransactionSubtitle = null;
          state.editor.historyTransactionProject = null;
        });
        return;
      }

      set((state) => {
        state.editor.historyFuture = [];
        state.editor.historyFutureLabels = [];
        state.editor.historyFutureSubtitles = [];
        state.editor.historyPast = [
          ...state.editor.historyPast,
          createEditorProjectHistorySnapshot(transactionProject),
        ].slice(-editorHistoryLimit);
        state.editor.historyPastLabels = [
          ...state.editor.historyPastLabels,
          transactionLabel,
        ].slice(-editorHistoryLimit);
        state.editor.historyPastSubtitles = [
          ...state.editor.historyPastSubtitles,
          transactionSubtitle,
        ].slice(-editorHistoryLimit);
        state.editor.historyTransactionLabel = null;
        state.editor.historyTransactionSubtitle = null;
        state.editor.historyTransactionProject = null;
      });
      trackEvent("editor-history-transaction-committed", {
        label: transactionLabel,
      });
      persistProject(project, "[editor] Project transaction save failed");
    },
    redoProjectChange: () => {
      const project = get().editor.project;
      const nextProject = get().editor.historyFuture[0];
      const nextLabel = get().editor.historyFutureLabels[0] ?? "Edit";
      const nextSubtitle = get().editor.historyFutureSubtitles[0] ?? null;
      if (!project || !nextProject) {
        return;
      }

      cancelPendingProjectSave();
      set((state) => {
        state.editor.historyFuture = state.editor.historyFuture.slice(1);
        state.editor.historyFutureLabels =
          state.editor.historyFutureLabels.slice(1);
        state.editor.historyFutureSubtitles =
          state.editor.historyFutureSubtitles.slice(1);
        state.editor.historyPast = [...state.editor.historyPast, project]
          .slice(-editorHistoryLimit)
          .map(createEditorProjectHistorySnapshot);
        state.editor.historyPastLabels = [
          ...state.editor.historyPastLabels,
          nextLabel,
        ].slice(-editorHistoryLimit);
        state.editor.historyPastSubtitles = [
          ...state.editor.historyPastSubtitles,
          nextSubtitle,
        ].slice(-editorHistoryLimit);
        state.editor.historyTransactionLabel = null;
        state.editor.historyTransactionSubtitle = null;
        state.editor.historyTransactionProject = null;
      });
      setProject(nextProject, { recordHistory: false });
      trackEvent("editor-redone", {
        label: nextLabel,
      });
      persistProject(nextProject, "[editor] Project redo save failed");
    },
    undoProjectChange: () => {
      const project = get().editor.project;
      const previousProject = get().editor.historyPast.at(-1);
      const previousLabel = get().editor.historyPastLabels.at(-1) ?? "Edit";
      const previousSubtitle = get().editor.historyPastSubtitles.at(-1) ?? null;
      if (!project || !previousProject) {
        return;
      }

      cancelPendingProjectSave();
      set((state) => {
        state.editor.historyFuture = [
          createEditorProjectHistorySnapshot(project),
          ...state.editor.historyFuture,
        ].slice(0, editorHistoryLimit);
        state.editor.historyFutureLabels = [
          previousLabel,
          ...state.editor.historyFutureLabels,
        ].slice(0, editorHistoryLimit);
        state.editor.historyFutureSubtitles = [
          previousSubtitle,
          ...state.editor.historyFutureSubtitles,
        ].slice(0, editorHistoryLimit);
        state.editor.historyPast = state.editor.historyPast.slice(0, -1);
        state.editor.historyPastLabels = state.editor.historyPastLabels.slice(
          0,
          -1,
        );
        state.editor.historyPastSubtitles =
          state.editor.historyPastSubtitles.slice(0, -1);
        state.editor.historyTransactionLabel = null;
        state.editor.historyTransactionSubtitle = null;
        state.editor.historyTransactionProject = null;
      });
      setProject(previousProject, { recordHistory: false });
      trackEvent("editor-undone", {
        label: previousLabel,
      });
      persistProject(previousProject, "[editor] Project undo save failed");
    },
  };
}

export { createEditorHistoryActions };

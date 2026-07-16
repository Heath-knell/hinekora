import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type ServerMediaLibraryTableQueryInput,
  useServerMediaLibraryTableState,
} from "./useServerMediaLibraryTableState";

interface ProbeQuery {
  pageIndex: number;
  pageSize: number;
  resetKey: string;
  sortId: string | undefined;
}

let container: HTMLDivElement;
let root: Root;
let hookResult: ReturnType<
  typeof useServerMediaLibraryTableState<ProbeQuery>
> | null = null;
let resetKey = "poe2:Standard:all";
let isEnabled = true;
let refresh = vi.fn<(query: ProbeQuery) => Promise<void>>();

function createQuery({
  pagination,
  sorting,
}: ServerMediaLibraryTableQueryInput): ProbeQuery {
  return {
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    resetKey,
    sortId: sorting[0]?.id,
  };
}

function Probe() {
  hookResult = useServerMediaLibraryTableState({
    createQuery,
    enabled: isEnabled,
    initialSorting: [{ desc: true, id: "createdAt" }],
    refresh,
    resetKey,
  });

  return null;
}

async function renderHookProbe() {
  await act(async () => {
    root.render(<Probe />);
  });

  if (!hookResult) {
    throw new Error("Expected server table state hook to render");
  }

  return hookResult;
}

describe("useServerMediaLibraryTableState", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    hookResult = null;
    resetKey = "poe2:Standard:all";
    isEnabled = true;
    refresh = vi.fn(async (_query: ProbeQuery) => undefined);
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("refreshes a reset scope from page zero without querying the stale page", async () => {
    const result = await renderHookProbe();

    await act(async () => {
      result.handlePaginationChange({ pageIndex: 2, pageSize: 20 });
    });
    expect(refresh).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pageIndex: 2,
        resetKey: "poe2:Standard:all",
      }),
    );

    resetKey = "poe1:Standard:all";
    await renderHookProbe();

    expect(refresh).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pageIndex: 0,
        resetKey: "poe1:Standard:all",
      }),
    );
    const staleCalls = refresh.mock.calls.filter(([query]) => {
      return query.resetKey === "poe1:Standard:all" && query.pageIndex === 2;
    });
    expect(staleCalls).toHaveLength(0);
  });

  it("does not refresh until enabled", async () => {
    isEnabled = false;
    await renderHookProbe();

    expect(refresh).not.toHaveBeenCalled();

    isEnabled = true;
    await renderHookProbe();

    expect(refresh).toHaveBeenCalledWith(
      expect.objectContaining({
        pageIndex: 0,
        resetKey: "poe2:Standard:all",
      }),
    );
  });
});

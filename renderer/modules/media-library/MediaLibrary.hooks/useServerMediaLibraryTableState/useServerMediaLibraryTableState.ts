import type {
  OnChangeFn,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ServerMediaLibraryTableQueryInput {
  pagination: PaginationState;
  sorting: SortingState;
}

interface UseServerMediaLibraryTableStateInput<TQuery> {
  createQuery: (input: ServerMediaLibraryTableQueryInput) => TQuery;
  initialSorting: SortingState;
  pageSize?: number;
  refresh: (query: TQuery) => Promise<void>;
  resetKey?: string;
}

function useServerMediaLibraryTableState<TQuery>({
  createQuery,
  initialSorting,
  pageSize = 20,
  refresh,
  resetKey = "",
}: UseServerMediaLibraryTableStateInput<TQuery>) {
  const lastResetKeyRef = useRef(resetKey);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const queryPageIndex =
    resetKey === lastResetKeyRef.current ? pagination.pageIndex : 0;
  const queryPagination = useMemo(
    () => ({ pageIndex: queryPageIndex, pageSize: pagination.pageSize }),
    [pagination.pageSize, queryPageIndex],
  );
  const query = useMemo(
    () => createQuery({ pagination: queryPagination, sorting }),
    [createQuery, queryPagination, sorting],
  );

  useEffect(() => {
    if (resetKey === lastResetKeyRef.current) {
      return;
    }

    lastResetKeyRef.current = resetKey;
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 },
    );
  }, [resetKey]);

  useEffect(() => {
    void refresh(query);
  }, [query, refresh]);

  const resetPage = useCallback(() => {
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 },
    );
  }, []);

  const handlePaginationChange: OnChangeFn<PaginationState> = useCallback(
    (updater) => {
      setPagination((current) =>
        typeof updater === "function" ? updater(current) : updater,
      );
    },
    [],
  );

  const handleSortingChange: OnChangeFn<SortingState> = useCallback(
    (updater) => {
      resetPage();
      setSorting((current) =>
        typeof updater === "function" ? updater(current) : updater,
      );
    },
    [resetPage],
  );

  return {
    handlePaginationChange,
    handleSortingChange,
    pagination,
    query,
    resetPage,
    sorting,
  };
}

export type { ServerMediaLibraryTableQueryInput };
export { useServerMediaLibraryTableState };

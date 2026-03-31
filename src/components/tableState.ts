type FilterAwareTablePropsOptions = {
  hasFilters: boolean;
  searchText: string;
  filteredEmptyText: string;
  emptyText: string;
  resetText?: string;
};

export function getFilterAwareTableProps({
  hasFilters,
  searchText,
  filteredEmptyText,
  emptyText,
  resetText = '清空筛选',
}: FilterAwareTablePropsOptions) {
  return {
    search: {
      labelWidth: 'auto' as const,
      searchText,
      resetText,
    },
    locale: {
      emptyText: hasFilters ? filteredEmptyText : emptyText,
    },
  };
}

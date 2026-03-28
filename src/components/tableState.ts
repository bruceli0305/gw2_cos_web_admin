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
  resetText = 'Clear filters',
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

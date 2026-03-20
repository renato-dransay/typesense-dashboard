import { ref, computed, watch, type Ref } from 'vue';
import { useNodeStore } from 'src/stores/node';

export interface FacetFieldInfo {
  name: string;
  type: 'string' | 'number' | 'boolean';
}

export interface FacetCount {
  field_name: string;
  counts: { value: string; count: number }[];
  stats?: { min?: number; max?: number; avg?: number; sum?: number; total_values?: number };
}

export interface ActiveFilter {
  field: string;
  value: string;
  type: 'value' | 'range';
  min?: number;
  max?: number;
}

export function useCustomSearch(collectionName: Ref<string>) {
  const store = useNodeStore();

  const query = ref('');
  const filters = ref<ActiveFilter[]>([]);
  const sort = ref('');
  const page = ref(1);
  const perPage = ref(12);
  const results = ref<any[]>([]);
  const totalHits = ref(0);
  const searchTimeMs = ref(0);
  const facetCounts = ref<FacetCount[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const queryByFields = computed(() => {
    const fields = store.currentCollection?.fields;
    if (!fields) return '*';
    const stringFields = (fields as any[])
      .filter((f: any) => f.index !== false && ['string', 'string[]'].includes(f.type) && !f.name.includes('.*'))
      .map((f: any) => f.name);
    return stringFields.length > 0 ? stringFields.join(',') : '*';
  });

  const facetFields = computed((): FacetFieldInfo[] => {
    const fields = store.currentCollection?.fields;
    if (!fields) return [];
    return (fields as any[])
      .filter((f: any) => f.facet && !f.name.includes('.*'))
      .map((f: any) => {
        let type: 'string' | 'number' | 'boolean' = 'string';
        if (['int32', 'int64', 'float', 'int32[]', 'int64[]', 'float[]'].includes(f.type)) {
          type = 'number';
        } else if (['bool', 'bool[]'].includes(f.type)) {
          type = 'boolean';
        }
        return { name: f.name, type };
      });
  });

  const sortableFields = computed(() => {
    const fields = store.currentCollection?.fields;
    if (!fields) return [];
    return (fields as any[])
      .filter(
        (f: any) =>
          ['int32', 'int64', 'float'].includes(f.type) || (f.type === 'string' && f.sort),
      )
      .map((f: any) => f.name);
  });

  const filterByString = computed(() => {
    if (filters.value.length === 0) return '';
    return filters.value
      .map((f) => {
        if (f.type === 'range') {
          const parts: string[] = [];
          if (f.min !== undefined) parts.push(`${f.field}:>=${f.min}`);
          if (f.max !== undefined) parts.push(`${f.field}:<=${f.max}`);
          return parts.join(' && ');
        }
        return `${f.field}:=${f.value}`;
      })
      .filter(Boolean)
      .join(' && ');
  });

  const facetByString = computed(() => {
    return facetFields.value.map((f) => f.name).join(',');
  });

  async function search() {
    if (!store.currentCollection) return;

    loading.value = true;
    error.value = null;

    try {
      const params: any = {
        q: query.value || '*',
        query_by: queryByFields.value,
        page: page.value,
        per_page: perPage.value,
      };

      if (facetByString.value) {
        params.facet_by = facetByString.value;
      }
      if (filterByString.value) {
        params.filter_by = filterByString.value;
      }
      if (sort.value) {
        params.sort_by = sort.value;
      }

      const res = await store.search(params);

      results.value = res?.hits?.map((h: any) => h.document) || [];
      totalHits.value = res?.found || 0;
      searchTimeMs.value = res?.search_time_ms || 0;
      facetCounts.value = res?.facet_counts || [];
    } catch (err) {
      error.value = (err as Error).message;
      results.value = [];
      totalHits.value = 0;
    } finally {
      loading.value = false;
    }
  }

  function debouncedSearch() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => void search(), 300);
  }

  function immediateSearch() {
    if (debounceTimer) clearTimeout(debounceTimer);
    void search();
  }

  function setFilter(filter: ActiveFilter) {
    filters.value = filters.value.filter(
      (f) => !(f.field === filter.field && f.value === filter.value && f.type === 'value'),
    );
    if (filter.type === 'range') {
      filters.value = filters.value.filter((f) => !(f.field === filter.field && f.type === 'range'));
    }
    filters.value.push(filter);
    page.value = 1;
    immediateSearch();
  }

  function removeFilter(field: string, value?: string) {
    if (value !== undefined) {
      filters.value = filters.value.filter((f) => !(f.field === field && f.value === value));
    } else {
      filters.value = filters.value.filter((f) => f.field !== field);
    }
    page.value = 1;
    immediateSearch();
  }

  function clearFilters() {
    filters.value = [];
    page.value = 1;
    immediateSearch();
  }

  function setSort(sortBy: string) {
    sort.value = sortBy;
    page.value = 1;
    immediateSearch();
  }

  function setPage(p: number) {
    page.value = p;
    immediateSearch();
  }

  function setPerPage(pp: number) {
    perPage.value = pp;
    page.value = 1;
    immediateSearch();
  }

  watch(query, () => {
    page.value = 1;
    debouncedSearch();
  });

  watch(collectionName, () => {
    query.value = '';
    filters.value = [];
    sort.value = '';
    page.value = 1;
    results.value = [];
    totalHits.value = 0;
    facetCounts.value = [];
    error.value = null;
  });

  return {
    query,
    filters,
    sort,
    page,
    perPage,
    results,
    totalHits,
    searchTimeMs,
    facetCounts,
    loading,
    error,
    queryByFields,
    facetFields,
    sortableFields,
    filterByString,
    search,
    setFilter,
    removeFilter,
    clearFilters,
    setSort,
    setPage,
    setPerPage,
  };
}

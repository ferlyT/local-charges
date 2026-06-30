import { useQuery } from '@tanstack/react-query';
import { inspectionReportsApi, type InspectionReport } from '../lib/inspectionReports';

interface InspectionReportsResponse {
  data: InspectionReport[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useInspectionReports(
  page: number, 
  limit: number, 
  search: string, 
  sortBy: string = 'fdCreatedAt', 
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  return useQuery<InspectionReportsResponse>({
    queryKey: ['inspectionReports', page, limit, search, sortBy, sortOrder],
    queryFn: async () => {
      return await inspectionReportsApi.getAll({ page, limit, search, sortBy, sortOrder });
    },
  });
}

import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface InspectionStatsData {
  totalForms: number;
  totalThisMonth: number;
  totalLastMonth: number;
  growthPercent: number;
  byStatus: Record<string, number>;
  topCustomers: { name: string | null; count: number }[];
  monthlyTrend: { month: string; count: number }[];
}

export function useInspectionReportsStats() {
  return useQuery<InspectionStatsData>({
    queryKey: ['inspection-reports-stats'],
    queryFn: async () => {
      const res = await api.get('/inspection-reports/stats');
      return res.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

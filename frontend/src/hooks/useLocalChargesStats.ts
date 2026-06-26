import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface StatsData {
  totalForms: number;
  totalThisMonth: number;
  totalLastMonth: number;
  growthPercent: number;
  byStatus: Record<string, number>;
  topCustomers: { name: string | null; count: number }[];
  monthlyTrend: { month: string; count: number }[];
}

export function useLocalChargesStats() {
  return useQuery<StatsData>({
    queryKey: ['local-charges-stats'],
    queryFn: async () => {
      const res = await api.get('/local-charges/stats');
      return res.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

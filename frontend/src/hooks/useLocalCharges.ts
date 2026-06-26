import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface LocalCharge {
  fdId: number;
  fdNomorForm: string;
  fdQty: number | null;
  fdSatuanQty: string | null;
  fdStatus: number;
  fdCreatedAt: string;
  user: {
    fdNama: string;
  };
  details: {
    fdNamaCustomer: string;
    fdNoInputan: string | null;
    fdMarking?: string | null;
    fdNoReceipt?: string | null;
    fdNoBilling?: string | null;
  }[];
}

interface LocalChargesResponse {
  data: LocalCharge[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useLocalCharges(
  page: number, 
  limit: number, 
  search: string, 
  sortBy: string = 'fdCreatedAt', 
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  return useQuery<LocalChargesResponse>({
    queryKey: ['localCharges', page, limit, search, sortBy, sortOrder],
    queryFn: async () => {
      const { data } = await api.get('/local-charges', {
        params: { page, limit, search, sortBy, sortOrder },
      });
      return data;
    },
  });
}

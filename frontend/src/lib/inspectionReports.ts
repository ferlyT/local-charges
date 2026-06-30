import api from './api';

export interface InspectionReport {
  fdId: number;
  fdReportNumber: string;
  fdReportDate: string;
  fdListCode: string;
  fdMarkingCode: string;
  fdMarkingNo: string;
  fdNamaCustomer: string;
  fdKeterangan: string;
  fdStatus: string;
  fdCreatedAt: string;
  fdUpdatedAt: string;
  user?: { fdNama: string };
  lampiran?: any[];
}

export const inspectionReportsApi = {
  getAll: async (params: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string }) => {
    const response = await api.get('/inspection-reports', { params });
    return response.data;
  },

  getById: async (id: number | string) => {
    const response = await api.get(`/inspection-reports/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/inspection-reports', data);
    return response.data;
  },

  update: async (id: number | string, data: any) => {
    const response = await api.put(`/inspection-reports/${id}`, data);
    return response.data;
  },

  delete: async (id: number | string) => {
    const response = await api.delete(`/inspection-reports/${id}`);
    return response.data;
  },

  lookupMarkingCode: async (markingCode: string) => {
    const response = await api.get(`/inspection-reports/lookup/${markingCode}`);
    return response.data;
  }
};

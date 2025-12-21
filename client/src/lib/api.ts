import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Report {
  report_id: string;
  file_name: string;
  patient_name: string;
  patient_age: number;
  report_type: string;
  summary: string;
  diagnosis: string;
  upload_date: string;
}

export const medicalReportsAPI = {
  uploadReport: async (files: FileList) => {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });
    
    const { data } = await apiClient.post('/reports/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },

  queryReport: async (question: string, reportId?: string) => {
    const { data } = await apiClient.post('/reports/query', {
      question,
      report_id: reportId
    });
    return data;
  },

  getReports: async () => {
    const { data } = await apiClient.get('/reports');
    return data.reports;
  },

  getReport: async (reportId: string) => {
    const { data } = await apiClient.get(`/reports/${reportId}`);
    return data.report;
  },

  getQueryHistory: async (reportId: string) => {
    const { data } = await apiClient.get(`/reports/${reportId}/history`);
    return data.history;
  },

  searchReports: async (term: string) => {
    const { data } = await apiClient.get(`/reports/search/${term}`);
    return data.results;
  },
};
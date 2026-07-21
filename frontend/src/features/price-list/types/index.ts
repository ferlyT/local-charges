export interface TrendPoint {
  uploadId: number;
  date: string;
  sheetType: string;
  mode: string;
  branch: string;
  category: string;
  price: number;
}

export interface FilterOptions {
  sheetTypes: string[];
  modes: string[];
  branches: string[];
  categories: string[];
}

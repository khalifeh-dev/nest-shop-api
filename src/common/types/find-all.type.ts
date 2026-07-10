export interface FindAll<T> {
  limit: number;
  page: number;
  total: number;
  pages: number;
  data: T[];
}
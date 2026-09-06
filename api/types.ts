export interface ApiRequest {
  method?: string;
  headers: Record<string, string | undefined>;
  query: Record<string, string | string[] | undefined>;
  body: any;
}

export interface ApiResponse<T = unknown> {
  status(code: number): ApiResponse<T>;
  json(body: T): ApiResponse<T>;
}
export type Report = {
  id: string;
  latitude: number;
  longitude: number;
  kind: 'ANPR' | 'CAMERA' | 'UNKNOWN';
  description?: string;
  source_url?: string;
  created_at: string;
};

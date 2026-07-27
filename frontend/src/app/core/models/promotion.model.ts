export interface Promotion {
  id: number;
  title: string;
  description: string;
  buttonLabel: string | null;
  buttonLink: string | null;
  active: boolean;
  sortOrder: number;
}

import { Product } from './product.model';

export interface SelectedOption {
  name: string;
  value: string;
}

export interface CartItem {
  id: string;               // unique line id (product + options combo)
  product: Product;
  quantity: number;
  selectedOptions: SelectedOption[];
  lineTotal: number;
}

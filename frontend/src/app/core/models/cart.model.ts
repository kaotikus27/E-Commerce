import { Product } from './product.model';

export interface SelectedOption {
  name: string;
  value: string;
  /** Captured at selection time so later admin price edits don't retroactively change an
   *  already-placed order's total. */
  priceDelta: number;
}

export interface CartItem {
  id: string;               // unique line id (product + options combo)
  product: Product;
  quantity: number;
  selectedOptions: SelectedOption[];
  lineTotal: number;
}

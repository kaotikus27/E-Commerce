export interface CustomizationOption {
  name: string;
  /** Per-product surcharge for this option, e.g. Oat milk might be +20 on one product and free on another. */
  priceDelta: number;
}

export interface Customization {
  name: string;           // e.g. "Milk", "Sugar Level", "Temperature"
  options: CustomizationOption[];
  required: boolean;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  categoryName: string;
  image: string;
  badges: string[];        // e.g. ["New", "10% OFF", "Fresh Baked"]
  rating: number;
  customizations: Customization[];
  available: boolean;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
}

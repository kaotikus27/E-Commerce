export interface Customization {
  name: string;           // e.g. "Milk", "Sugar Level", "Temperature"
  options: string[];       // e.g. ["Oat", "Whole", "Almond"]
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

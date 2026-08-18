import { Category, Product } from '../models/product.model';

export const MOCK_CATEGORIES: Category[] = [
  { id: 1, name: 'Hot Mana',   icon: '☕' },
  { id: 2, name: 'Iced Mana',  icon: '🧊' },
  { id: 3, name: 'Stamina Bakes',   icon: '🥐' },
  { id: 4, name: 'Daily Loaves', icon: '🍞' },
];

const MILK_OPTIONS = {
  name: 'Milk',
  options: [
    { name: 'Whole', priceDelta: 0 },
    { name: 'Oat', priceDelta: 0 },
    { name: 'Almond', priceDelta: 0 },
    { name: 'Skim', priceDelta: 0 },
  ],
  required: true,
};
const SUGAR_LEVEL = {
  name: 'Sugar Level',
  options: [
    { name: 'None', priceDelta: 0 },
    { name: 'Light', priceDelta: 0 },
    { name: 'Regular', priceDelta: 0 },
    { name: 'Extra', priceDelta: 0 },
  ],
  required: true,
};
const TEMP = {
  name: 'Temperature',
  options: [
    { name: 'Warmed', priceDelta: 0 },
    { name: 'Room Temp', priceDelta: 0 },
  ],
  required: false,
};
const ICE_LEVEL = {
  name: 'Ice Level',
  options: [
    { name: 'No Ice', priceDelta: 0 },
    { name: 'Standard Ice', priceDelta: 0 },
    { name: 'Extra Chill', priceDelta: 0 },
  ],
  required: true,
};

export const MOCK_PRODUCTS: Product[] = [
  { id: 1, name: 'Butter Croissant', description: 'Flaky, all-butter croissant baked fresh every morning.', price: 150.00, categoryId: 3, categoryName: 'Stamina Bakes', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600', badges: ['Fresh Baked'], rating: 4.8, customizations: [TEMP], available: true },
  { id: 2, name: 'Sourdough Loaf', description: '48-hour fermented sourdough with a crisp crust.', price: 220.00, categoryId: 4, categoryName: 'Daily Loaves', image: 'https://images.unsplash.com/photo-1585478259715-4d3a5f3a41c3?w=600', badges: ['New'], rating: 4.9, customizations: [], available: true },
  { id: 3, name: 'Iced Latte', description: 'Double espresso over ice with your choice of milk.', price: 140.00, categoryId: 2, categoryName: 'Iced Mana', image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600', badges: ['10% OFF'], rating: 4.7, customizations: [MILK_OPTIONS, SUGAR_LEVEL, ICE_LEVEL], available: true },
  { id: 4, name: 'Matcha Latte', description: 'Ceremonial-grade matcha whisked with steamed milk.', price: 150.00, categoryId: 1, categoryName: 'Hot Mana', image: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600', badges: [], rating: 4.6, customizations: [MILK_OPTIONS, SUGAR_LEVEL], available: true },
  { id: 5, name: 'Cappuccino', description: 'Rich espresso topped with silky steamed milk foam.', price: 130.00, categoryId: 1, categoryName: 'Hot Mana', image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600', badges: [], rating: 4.8, customizations: [MILK_OPTIONS], available: true },
  { id: 6, name: 'Almond Croissant', description: 'Twice-baked croissant filled with almond cream.', price: 160.00, categoryId: 3, categoryName: 'Stamina Bakes', image: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=600', badges: ['Fresh Baked'], rating: 4.9, customizations: [TEMP], available: true },
  { id: 7, name: 'Cold Brew', description: 'Slow-steeped 18 hours for a smooth, low-acid cup.', price: 140.00, categoryId: 2, categoryName: 'Iced Mana', image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600', badges: [], rating: 4.7, customizations: [MILK_OPTIONS, SUGAR_LEVEL, ICE_LEVEL], available: true },
  { id: 8, name: 'Whole Wheat Baguette', description: 'A heartier daily baguette, crisp outside, soft within.', price: 190.00, categoryId: 4, categoryName: 'Daily Loaves', image: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=600', badges: [], rating: 4.5, customizations: [], available: true },
  { id: 9, name: 'Cinnamon Roll', description: 'House-made caramel glaze over a soft cinnamon swirl.', price: 180.00, categoryId: 3, categoryName: 'Stamina Bakes', image: 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=600', badges: ['New'], rating: 4.9, customizations: [TEMP], available: true },
  { id: 10, name: 'Americano', description: 'Espresso shots topped with hot water for a clean finish.', price: 110.00, categoryId: 1, categoryName: 'Hot Mana', image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=600', badges: [], rating: 4.6, customizations: [SUGAR_LEVEL], available: true },
];

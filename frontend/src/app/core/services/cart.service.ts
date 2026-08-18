import { Injectable, computed, effect, signal } from '@angular/core';
import { CartItem, SelectedOption } from '../models/cart.model';
import { Product } from '../models/product.model';
import { NotificationService } from './notification.service';

const STORAGE_KEY = 'bakery_cart_v1';
/** Mirrors the backend's OrderService.GIFT_WRAP_FEE — display-only estimate; the backend
 *  recalculates authoritatively at checkout, same as customization surcharges already do. */
const GIFT_WRAP_FEE = 20.00;

/**
 * Singleton cart state shared across the navbar badge, cart drawer, and
 * checkout page. Uses Angular Signals for reactivity and persists to
 * localStorage so the cart survives page reloads.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _items = signal<CartItem[]>(this.readFromStorage());

  readonly items = this._items.asReadonly();
  readonly itemCount = computed(() => this._items().reduce((sum, i) => sum + i.quantity, 0));
  readonly subtotal = computed(() => this._items().reduce((sum, i) => sum + i.lineTotal, 0));
  readonly tax = computed(() => Math.round(this.subtotal() * 0.0875 * 100) / 100);
  readonly total = computed(() => Math.round((this.subtotal() + this.tax()) * 100) / 100);
  readonly isEmpty = computed(() => this._items().length === 0);

  readonly isDrawerOpen = signal(false);

  /** Bumped on every successful addItem() — the navbar watches this to trigger a transient
   *  "+1" flying badge near the cart icon, without stealing focus/scroll via the cart drawer. */
  readonly addedPulse = signal(0);

  /** Selected pickup slot from <app-pickup-time-picker>, read by checkout when placing the order. */
  readonly pickupTime = signal('');

  constructor(private notifications: NotificationService) {
    effect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._items()));
    });
  }

  private readFromStorage(): CartItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private lineId(product: Product, options: SelectedOption[], giftWrap: boolean): string {
    const optKey = options.map(o => `${o.name}:${o.value}`).sort().join('|');
    return `${product.id}__${optKey}__${giftWrap ? 'gift' : 'no-gift'}`;
  }

  private unitPriceWithOptions(product: Product, options: SelectedOption[], giftWrap: boolean): number {
    const optionsTotal = options.reduce((sum, o) => sum + o.priceDelta, 0);
    return product.price + optionsTotal + (giftWrap ? GIFT_WRAP_FEE : 0);
  }

  addItem(product: Product, quantity: number, options: SelectedOption[] = [], giftWrap = false) {
    const id = this.lineId(product, options, giftWrap);
    const unitPrice = this.unitPriceWithOptions(product, options, giftWrap);
    const existing = this._items().find(i => i.id === id);

    if (existing) {
      this.updateQuantity(id, existing.quantity + quantity);
    } else {
      const newItem: CartItem = {
        id,
        product,
        quantity,
        selectedOptions: options,
        giftWrap,
        lineTotal: Math.round(unitPrice * quantity * 100) / 100,
      };
      this._items.set([...this._items(), newItem]);
    }
    this.notifications.success(`${product.name} added to cart`);
    this.addedPulse.update(v => v + 1);
  }

  updateQuantity(id: string, quantity: number) {
    if (quantity <= 0) {
      this.removeItem(id);
      return;
    }
    this._items.set(this._items().map(i =>
      i.id === id
        ? { ...i, quantity, lineTotal: Math.round(this.unitPriceWithOptions(i.product, i.selectedOptions, i.giftWrap) * quantity * 100) / 100 }
        : i
    ));
  }

  removeItem(id: string) {
    this._items.set(this._items().filter(i => i.id !== id));
    this.notifications.info('Item removed from cart');
  }

  clear() {
    this._items.set([]);
    this.pickupTime.set('');
  }

  setPickupTime(time: string) {
    this.pickupTime.set(time);
  }

  openDrawer() { this.isDrawerOpen.set(true); }
  closeDrawer() { this.isDrawerOpen.set(false); }
  toggleDrawer() { this.isDrawerOpen.set(!this.isDrawerOpen()); }
}

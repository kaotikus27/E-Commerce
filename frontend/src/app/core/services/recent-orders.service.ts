import { Injectable, computed, effect, signal } from '@angular/core';
import { Order } from '../models/order.model';

const STORAGE_KEY = 'bakery_recent_orders_v1';
const MAX_ENTRIES = 5;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface RecentOrderEntry {
  publicToken: string;
  orderNumber: string;
  trackedAt: number;
}

/**
 * Remembers orders this browser has placed or looked up, so /track-order can offer a
 * one-tap "Active Order Found" recall instead of making the customer re-enter their
 * order number + phone every time. Same localStorage persistence pattern as CartService
 * (versioned key, signal seeded from storage, effect() persists every write) — this is
 * purely a local convenience, not an account system; it only ever recalls this device's
 * own history.
 */
@Injectable({ providedIn: 'root' })
export class RecentOrdersService {
  private readonly _entries = signal<RecentOrderEntry[]>(this.readFromStorage());

  /** Newest entry younger than MAX_AGE_MS, or null. Callers should still verify the order's
   *  real status before trusting this as "still active" — see TrackOrderPageComponent, which
   *  does a background status check and calls forget() if the order turned out to be terminal. */
  readonly mostRecent = computed<RecentOrderEntry | null>(() => {
    const [newest] = this._entries();
    if (!newest) return null;
    return Date.now() - newest.trackedAt <= MAX_AGE_MS ? newest : null;
  });

  constructor() {
    effect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._entries()));
    });
  }

  private readFromStorage(): RecentOrderEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  remember(order: Order) {
    const entry: RecentOrderEntry = {
      publicToken: order.publicToken,
      orderNumber: order.id,
      trackedAt: Date.now(),
    };
    const deduped = this._entries().filter(e => e.publicToken !== order.publicToken);
    this._entries.set([entry, ...deduped].slice(0, MAX_ENTRIES));
  }

  forget(publicToken: string) {
    this._entries.set(this._entries().filter(e => e.publicToken !== publicToken));
  }
}

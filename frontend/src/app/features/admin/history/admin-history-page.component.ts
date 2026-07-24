import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminOrderService } from '../services/admin-order.service';

@Component({
  selector: 'app-admin-history-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>Daily Summary &amp; Order History</h1>
      <button class="btn btn-secondary btn-sm" (click)="orderService.loadOrders()">Refresh</button>
    </div>

    <div class="metrics">
      <div class="metric card">
        <span class="metric-label">Today's Revenue</span>
        <span class="metric-value">₱{{ orderService.todayRevenue().toFixed(2) }}</span>
      </div>
      <div class="metric card">
        <span class="metric-label">Completed Orders Today</span>
        <span class="metric-value">{{ orderService.todayCompletedCount() }}</span>
      </div>
      <div class="metric card top-items">
        <span class="metric-label">Top Sellers Today</span>
        @if (orderService.topItemsToday().length) {
          <ol>
            @for (item of orderService.topItemsToday(); track item.name) {
              <li>{{ item.name }} <span class="qty">×{{ item.quantity }}</span></li>
            }
          </ol>
        } @else {
          <p class="empty">Nothing completed yet today.</p>
        }
      </div>
    </div>

    <div class="card table-wrap">
      <div class="search-row">
        <input
          type="search"
          [(ngModel)]="query"
          (ngModelChange)="queryVersion.set(queryVersion() + 1)"
          name="query"
          placeholder="Search by name, order #, or phone…" />
      </div>
      <table>
        <thead>
          <tr>
            <th>Order #</th>
            <th>Customer</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Total</th>
            <th>Placed</th>
          </tr>
        </thead>
        <tbody>
          @for (order of results(); track order.id) {
            <tr>
              <td>#{{ order.id }}</td>
              <td>{{ order.guestName || 'Guest' }}</td>
              <td>{{ order.guestPhone }}</td>
              <td><span class="status-badge" [class.cancelled]="order.status === 'CANCELLED'">{{ order.status }}</span></td>
              <td>₱{{ order.total.toFixed(2) }}</td>
              <td>{{ order.createdAt | date: 'short' }}</td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="empty">No matching orders.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
    @media (max-width: 720px) { .metrics { grid-template-columns: 1fr; } }
    .metric { padding: 16px; display: flex; flex-direction: column; gap: 6px; }
    .metric-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-muted); font-weight: 700; }
    .metric-value { font-size: 28px; font-weight: 700; color: var(--color-text-chocolate); font-family: var(--font-heading); }
    .top-items ol { margin: 0; padding-left: 18px; font-size: 14px; }
    .top-items .qty { color: var(--color-sage-700); font-weight: 700; }
    .table-wrap { padding: 0; overflow-x: auto; }
    .search-row { padding: 16px; }
    .search-row input { width: 100%; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 10px 14px; white-space: nowrap; }
    thead th { color: var(--color-text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1.5px solid var(--color-subdued-pistachio); }
    tbody tr { border-bottom: 1px solid var(--color-subdued-pistachio); }
    .status-badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: var(--radius-pill); background: var(--color-subdued-pistachio); color: var(--color-status-open); }
    .status-badge.cancelled { color: var(--color-status-closed); }
    .empty { text-align: center; color: var(--color-text-muted); padding: 24px 0; }
  `],
})
export class AdminHistoryPageComponent implements OnInit {
  orderService = inject(AdminOrderService);

  query = '';
  queryVersion = signal(0);
  results = computed(() => {
    this.queryVersion(); // re-evaluate on every keystroke via ngModelChange below
    return this.orderService.searchHistory(this.query);
  });

  ngOnInit() {
    this.orderService.loadOrders();
  }
}

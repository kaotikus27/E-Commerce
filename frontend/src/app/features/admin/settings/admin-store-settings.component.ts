import { Component, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminStoreSettingsService } from '../services/admin-store-settings.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DayOfWeekName, DaySchedule } from '../../../core/models/store-settings.model';
import { toAbsoluteImageUrl } from '../../../core/utils/image-url.util';

const DAY_ORDER: DayOfWeekName[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY_LABEL: Record<DayOfWeekName, string> = {
  MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday', THURSDAY: 'Thursday',
  FRIDAY: 'Friday', SATURDAY: 'Saturday', SUNDAY: 'Sunday',
};

interface DayForm {
  dayOfWeek: DayOfWeekName;
  label: string;
  openTime: string;
  closeTime: string;
  openUntilMidnight: boolean;
  closedAllDay: boolean;
}

@Component({
  selector: 'app-admin-store-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h1>Store Ordering Settings</h1>

    <div class="card section pause-section">
      <h3>Emergency Override</h3>
      <p class="status-line">
        Status:
        @if (settings.settings()?.emergencyPause) {
          <span class="paused">🔴 Orders Paused</span>
        } @else {
          <span class="accepting">🟢 Currently Accepting Orders</span>
        }
      </p>
      <button class="btn btn-block" [class.btn-primary]="!settings.settings()?.emergencyPause" [class.btn-secondary]="settings.settings()?.emergencyPause" (click)="togglePause()">
        {{ settings.settings()?.emergencyPause ? 'Resume Online Orders' : 'Pause All Online Orders Now' }}
      </button>
    </div>

    <div class="card section">
      <h3>Daily Online Ordering Hours</h3>
      @for (day of days; track day.dayOfWeek) {
        <div class="day-row">
          <span class="day-label">{{ day.label }}</span>
          @if (!day.closedAllDay) {
            <input type="time" [(ngModel)]="day.openTime" [name]="'open-' + day.dayOfWeek" />
            <span class="to">to</span>
            @if (day.openUntilMidnight) {
              <span class="midnight-label">12:00 MN</span>
            } @else {
              <input type="time" [(ngModel)]="day.closeTime" [name]="'close-' + day.dayOfWeek" />
            }
            <label class="checkbox-row"><input type="checkbox" [(ngModel)]="day.openUntilMidnight" [name]="'mn-' + day.dayOfWeek" /> Until midnight</label>
          }
          <label class="checkbox-row closed-toggle">
            <input type="checkbox" [(ngModel)]="day.closedAllDay" [name]="'closed-' + day.dayOfWeek" /> Closed All Day
          </label>
        </div>
      }
    </div>

    <div class="card section">
      <h3>Kitchen Buffers</h3>
      <div class="field">
        <label for="lead">Lead Time / Prep Time (minutes)</label>
        <input id="lead" type="number" min="0" [(ngModel)]="leadTimeMinutes" name="leadTimeMinutes" />
      </div>
      <div class="field">
        <label for="cutoff">Cutoff Before Store Close (minutes)</label>
        <input id="cutoff" type="number" min="0" [(ngModel)]="cutoffMinutes" name="cutoffMinutes" />
      </div>
    </div>

    <div class="card section">
      <h3>GCash Payment Details</h3>
      <p class="hint">Shown to customers at checkout when they choose GCash, so they know who to send payment to.</p>
      <div class="field">
        <label for="gcash-name">Account Name</label>
        <input id="gcash-name" [(ngModel)]="gcashAccountName" name="gcashAccountName" placeholder="Juan Dela Cruz" />
      </div>
      <div class="field">
        <label for="gcash-number">GCash Number</label>
        <input id="gcash-number" [(ngModel)]="gcashNumber" name="gcashNumber" placeholder="09XX XXX XXXX" />
      </div>
      <div class="field">
        <label for="gcash-qr">GCash QR Code</label>
        @if (qrPreviewUrl) {
          <img [src]="qrPreviewUrl" alt="GCash QR code preview" class="qr-preview" />
        }
        <input id="gcash-qr" type="file" accept="image/png,image/jpeg,image/webp" (change)="onQrFileSelected($event)" />
      </div>
      <button class="btn btn-primary btn-block" [disabled]="saving" (click)="save()">
        {{ saving ? 'Saving…' : 'Save Store Schedule' }}
      </button>
    </div>

    <div class="card section">
      <h3>Holiday / Special Closures</h3>
      <div class="closure-form">
        <input type="date" [(ngModel)]="newClosureDate" name="newClosureDate" />
        <input type="text" [(ngModel)]="newClosureReason" name="newClosureReason" placeholder="Reason (e.g. Christmas)" />
        <button class="btn btn-secondary btn-sm" (click)="addClosure()">Add</button>
      </div>
      @for (closure of settings.closures(); track closure.id) {
        <div class="closure-row">
          <span>{{ closure.date }} — {{ closure.reason || 'Closed' }}</span>
          <button class="btn btn-secondary btn-sm" (click)="removeClosure(closure.id)">Remove</button>
        </div>
      } @empty {
        <p class="empty">No holiday closures scheduled.</p>
      }
    </div>
  `,
  styles: [`
    .section { padding: 20px; margin-bottom: 16px; }
    .pause-section { text-align: center; }
    .status-line { font-weight: 700; margin-bottom: 12px; }
    .hint { font-size: 13px; color: var(--color-text-muted); margin-bottom: 14px; }
    .qr-preview { display: block; width: 140px; height: 140px; object-fit: contain; border: 1.5px solid var(--color-subdued-pistachio); border-radius: var(--radius-sm); margin-bottom: 8px; background: #fff; }
    .paused { color: var(--color-status-closed); }
    .accepting { color: var(--color-status-open); }
    .day-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 0; border-bottom: 1px solid var(--color-subdued-pistachio); }
    .day-row:last-child { border-bottom: none; }
    .day-label { min-width: 90px; font-weight: 700; }
    .to { font-size: 13px; color: var(--color-text-muted); }
    .midnight-label { font-size: 14px; font-weight: 600; min-width: 90px; }
    .checkbox-row { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .closed-toggle { margin-left: auto; }
    .closure-form { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .closure-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--color-subdued-pistachio); font-size: 14px; }
    .empty { color: var(--color-text-muted); font-size: 13px; }
  `],
})
export class AdminStoreSettingsComponent implements OnInit {
  settings = inject(AdminStoreSettingsService);
  private notifications = inject(NotificationService);

  days: DayForm[] = [];
  leadTimeMinutes = 15;
  cutoffMinutes = 0;
  gcashAccountName = '';
  gcashNumber = '';
  gcashQrImagePath = '';
  qrPreviewUrl = '';
  private selectedQrFile: File | null = null;
  saving = false;

  newClosureDate = '';
  newClosureReason = '';
  private formHydrated = false;

  constructor() {
    // Hydrate the editable form once, the first time settings load — not on every later
    // signal update (e.g. toggling pause also updates this same signal), so we don't clobber
    // in-progress, unsaved schedule edits.
    effect(() => {
      const s = this.settings.settings();
      if (s && !this.formHydrated) {
        this.formHydrated = true;
        this.hydrateForm(s.schedule);
        this.leadTimeMinutes = s.orderLeadTimeMinutes;
        this.cutoffMinutes = s.stopOrderingBeforeCloseMinutes;
        this.gcashAccountName = s.gcashAccountName ?? '';
        this.gcashNumber = s.gcashNumber ?? '';
        this.gcashQrImagePath = s.gcashQrImagePath ?? '';
        this.qrPreviewUrl = s.gcashQrImagePath ? toAbsoluteImageUrl(s.gcashQrImagePath) : '';
      }
    });
  }

  onQrFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (!file) return;
    this.selectedQrFile = file;
    this.qrPreviewUrl = URL.createObjectURL(file);
  }

  ngOnInit() {
    this.settings.loadSettings();
    this.settings.loadClosures();
  }

  private hydrateForm(schedule: DaySchedule[]) {
    this.days = DAY_ORDER.map(dayOfWeek => {
      const found = schedule.find(d => d.dayOfWeek === dayOfWeek);
      return {
        dayOfWeek,
        label: DAY_LABEL[dayOfWeek],
        openTime: found?.openTime ?? '17:00',
        closeTime: found?.closeTime ?? '',
        openUntilMidnight: !!found && found.closeTime === null && !found.closedAllDay,
        closedAllDay: found?.closedAllDay ?? false,
      };
    });
  }

  togglePause() {
    const pausing = !this.settings.settings()?.emergencyPause;
    if (pausing && !confirm('Pause all online ordering right now? Customers will see checkout blocked immediately.')) {
      return;
    }
    this.settings.setPause(pausing).subscribe(res => {
      if (res) this.notifications.success(pausing ? 'Online orders paused.' : 'Online orders resumed.');
    });
  }

  save() {
    this.saving = true;

    if (this.selectedQrFile) {
      this.settings.uploadImage(this.selectedQrFile).subscribe(res => {
        if (res) {
          this.gcashQrImagePath = res.url;
          this.selectedQrFile = null;
        }
        this.saveSettings();
      });
    } else {
      this.saveSettings();
    }
  }

  private saveSettings() {
    const schedule: DaySchedule[] = this.days.map(d => ({
      dayOfWeek: d.dayOfWeek,
      openTime: d.closedAllDay ? null : (d.openTime || null),
      closeTime: d.closedAllDay || d.openUntilMidnight ? null : (d.closeTime || null),
      closedAllDay: d.closedAllDay,
    }));

    this.settings.saveSchedule({
      emergencyPause: this.settings.settings()?.emergencyPause ?? false,
      schedule,
      orderLeadTimeMinutes: this.leadTimeMinutes,
      stopOrderingBeforeCloseMinutes: this.cutoffMinutes,
      gcashAccountName: this.gcashAccountName.trim(),
      gcashNumber: this.gcashNumber.trim(),
      gcashQrImagePath: this.gcashQrImagePath || null,
    }).subscribe(res => {
      this.saving = false;
      if (res) this.notifications.success('Store schedule saved.');
    });
  }

  addClosure() {
    if (!this.newClosureDate) return;
    this.settings.addClosure(this.newClosureDate, this.newClosureReason.trim()).subscribe(res => {
      if (res) {
        this.newClosureDate = '';
        this.newClosureReason = '';
      }
    });
  }

  removeClosure(id: number) {
    this.settings.removeClosure(id).subscribe();
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminContactMessageService } from '../services/admin-contact-message.service';
import { ContactMessage } from '../../../core/models/contact-message.model';

@Component({
  selector: 'app-admin-messages-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <h1>Messages</h1>
    </div>

    <div class="list-wrap">
      @for (msg of inbox.messages(); track msg.id) {
        <div class="card msg-card" [class.unread]="!msg.read">
          <div class="msg-top">
            <div>
              <strong>{{ msg.name }}</strong>
              <span class="msg-email">{{ msg.email }}</span>
              @if (msg.phone) { <span class="msg-phone">· {{ msg.phone }}</span> }
            </div>
            <span class="msg-date">{{ msg.createdAt | date:'medium' }}</span>
          </div>
          @if (msg.topic) { <span class="topic-badge">{{ msg.topic }}</span> }
          <p class="msg-body">{{ msg.message }}</p>
          <div class="row-actions">
            <button class="btn btn-secondary btn-sm" (click)="toggleRead(msg)">{{ msg.read ? 'Mark Unread' : 'Mark Read' }}</button>
            <button class="btn btn-secondary btn-sm" (click)="remove(msg)">Delete</button>
          </div>
        </div>
      } @empty {
        <p class="empty">No messages yet.</p>
      }
    </div>
  `,
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .list-wrap { display: flex; flex-direction: column; gap: 12px; }
    .msg-card { padding: 16px 20px; border-left: 3px solid transparent; }
    .msg-card.unread { border-left-color: var(--color-terracotta); }
    .msg-top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 6px; }
    .msg-email { color: var(--color-text-muted); font-size: 13px; margin-left: 8px; }
    .msg-phone { color: var(--color-text-muted); font-size: 13px; }
    .msg-date { color: var(--color-text-muted); font-size: 12px; white-space: nowrap; }
    .topic-badge {
      display: inline-block; background: var(--color-subdued-pistachio); border-radius: var(--radius-pill);
      padding: 2px 10px; font-size: 11px; font-weight: 700; margin-bottom: 8px;
    }
    .msg-body { font-size: 14px; line-height: 1.5; margin: 0 0 12px; white-space: pre-wrap; }
    .row-actions { display: flex; gap: 8px; }
    .empty { text-align: center; color: var(--color-text-muted); padding: 32px 0; }
  `],
})
export class AdminMessagesPageComponent implements OnInit {
  inbox = inject(AdminContactMessageService);

  ngOnInit() {
    this.inbox.loadMessages();
  }

  toggleRead(msg: ContactMessage) {
    this.inbox.setRead(msg.id, !msg.read).subscribe();
  }

  remove(msg: ContactMessage) {
    if (confirm(`Delete the message from "${msg.name}"? This can't be undone.`)) {
      this.inbox.deleteMessage(msg.id).subscribe();
    }
  }
}

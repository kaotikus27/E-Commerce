import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { Faq } from '../../../core/models/faq.model';
import { AdminFaqService } from '../services/admin-faq.service';

@Component({
  selector: 'app-admin-faq-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  template: `
    <app-modal [open]="open" [title]="faq ? 'Edit FAQ' : 'Add FAQ'" (close)="closed.emit()">
      <div class="field">
        <label for="faq-question">Question</label>
        <input id="faq-question" [(ngModel)]="question" name="question" placeholder="Do you offer delivery?" />
      </div>

      <div class="field">
        <label for="faq-answer">Answer</label>
        <textarea id="faq-answer" [(ngModel)]="answer" name="answer" rows="4" placeholder="Not yet — we're pickup-only for now."></textarea>
      </div>

      <div class="field">
        <label for="faq-sort">Display Order</label>
        <input id="faq-sort" type="number" [(ngModel)]="sortOrder" name="sortOrder" />
      </div>

      <div class="field">
        <label class="checkbox-row"><input type="checkbox" [(ngModel)]="active" name="active" /> Show on FAQ page</label>
      </div>

      <button class="btn btn-primary btn-block" [disabled]="saving" (click)="save()">
        {{ saving ? 'Saving…' : 'Save FAQ' }}
      </button>
    </app-modal>
  `,
  styles: [`
    .checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; min-height: 36px; }
  `],
})
export class AdminFaqFormModalComponent implements OnChanges {
  @Input() open = false;
  @Input() faq: Faq | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  question = '';
  answer = '';
  sortOrder = 0;
  active = true;
  saving = false;

  constructor(private faqs: AdminFaqService) {}

  ngOnChanges() {
    if (!this.open) return;

    if (this.faq) {
      this.question = this.faq.question;
      this.answer = this.faq.answer;
      this.sortOrder = this.faq.sortOrder;
      this.active = this.faq.active;
    } else {
      this.question = '';
      this.answer = '';
      this.sortOrder = 0;
      this.active = true;
    }
  }

  save() {
    if (!this.question.trim() || !this.answer.trim()) return;
    this.saving = true;

    const payload = {
      question: this.question.trim(),
      answer: this.answer.trim(),
      active: this.active,
      sortOrder: this.sortOrder,
    };

    const result$ = this.faq
      ? this.faqs.updateFaq(this.faq.id, payload)
      : this.faqs.createFaq(payload);

    result$.subscribe(res => {
      this.saving = false;
      if (res) this.saved.emit();
    });
  }
}

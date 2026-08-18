export interface ContactMessageRequest {
  name: string;
  email: string;
  phone?: string;
  topic?: string;
  message: string;
}

/** Admin-viewed submission (Admin → Messages). */
export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  topic: string | null;
  message: string;
  createdAt: string;
  read: boolean;
}

import { environment } from '../../../environments/environment';

/**
 * Product images are either a full external URL (seeded Unsplash photos) or a
 * backend-relative path like "/uploads/abc123.png" (admin-uploaded photos, served
 * by the Spring Boot app, not the Angular dev server). This turns the latter into
 * a fully-qualified URL so <img> tags resolve against the right origin.
 */
export function toAbsoluteImageUrl(path: string): string {
  if (!path || /^https?:\/\//i.test(path)) return path;
  return new URL(environment.apiUrl).origin + path;
}

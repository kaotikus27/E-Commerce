import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import * as L from 'leaflet';

/**
 * Draggable-pin map for fine-tuning a delivery pinpoint. Uses Leaflet + OpenStreetMap tiles —
 * no API key, no billing account, nothing shipped to the browser that could be abused for cost.
 * The only paid call anywhere in the delivery-address flow is the existing free-tier Google
 * Geocoding request that centers this map and labels the pin on confirm (both server-side).
 */
@Component({
  selector: 'app-delivery-map',
  standalone: true,
  template: `
    <div class="map-shell">
      <div #mapEl class="map-el"></div>
      <span class="attribution-note">© OpenStreetMap contributors</span>
    </div>
  `,
  styles: [`
    /* Wood-board frame per docs/checkout-redesign-notes.md §4 — only the frame is themed;
       the tiles/pin/drag behavior stay a real, accurate map (delivery accuracy depends on it). */
    .map-shell { position: relative; border-radius: var(--radius-md); overflow: hidden; border: 3px solid #8B5E3C; }
    .map-el { height: 220px; width: 100%; }
    .attribution-note { position: absolute; bottom: 2px; right: 6px; font-size: 10px; color: var(--color-text-muted); background: rgba(255,255,255,0.75); padding: 0 4px; border-radius: 3px; z-index: 500; }
  `],
})
export class DeliveryMapComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) latitude!: number;
  @Input({ required: true }) longitude!: number;
  @Output() pinMoved = new EventEmitter<{ latitude: number; longitude: number }>();

  @ViewChild('mapEl') private mapEl!: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private marker?: L.Marker;

  private readonly pinIcon = L.divIcon({
    html: '<div class="delivery-pin-icon">📍</div>',
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 30],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.mapEl) return; // view not initialized yet — first center happens in ngAfterViewInit below

    if (!this.map) {
      this.initMap();
      return;
    }

    // A new search resolved a different point — recenter without discarding the user's own drag
    // unless the coordinates actually changed from outside (e.g. picking a new candidate).
    if (changes['latitude'] || changes['longitude']) {
      this.map.setView([this.latitude, this.longitude]);
      this.marker?.setLatLng([this.latitude, this.longitude]);
    }
  }

  ngAfterViewInit(): void {
    if (!this.map) this.initMap();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private initMap(): void {
    if (!this.mapEl || this.latitude == null || this.longitude == null) return;

    this.map = L.map(this.mapEl.nativeElement, { attributionControl: false }).setView([this.latitude, this.longitude], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);

    this.marker = L.marker([this.latitude, this.longitude], {
      draggable: true,
      icon: this.pinIcon,
    }).addTo(this.map);

    this.marker.on('dragend', () => {
      const position = this.marker!.getLatLng();
      this.pinMoved.emit({ latitude: position.lat, longitude: position.lng });
    });

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.marker!.setLatLng(e.latlng);
      this.pinMoved.emit({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    });
  }
}

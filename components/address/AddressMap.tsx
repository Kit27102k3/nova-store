"use client";

import L from "leaflet";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { useEffect } from "react";

export type MapPosition = { latitude: number; longitude: number };

const selectionIcon = L.divIcon({
  className: "",
  html: '<span class="address-map-marker"></span>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

function MapViewport({ position }: { position: MapPosition | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView([position.latitude, position.longitude], 16);
  }, [map, position]);
  return null;
}

function MapClickHandler({
  onChoose,
}: {
  onChoose: (position: MapPosition) => void;
}) {
  useMapEvents({
    click(event) {
      onChoose({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });
  return null;
}

export function AddressMap({
  position,
  onChoose,
}: {
  position: MapPosition | null;
  onChoose: (position: MapPosition) => void;
}) {
  const center: [number, number] = position
    ? [position.latitude, position.longitude]
    : [16.0, 107.5];

  return (
    <MapContainer
      center={center}
      zoom={position ? 15 : 5}
      scrollWheelZoom
      className="h-[300px] w-full rounded-2xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.de/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <MapViewport position={position} />
      <MapClickHandler onChoose={onChoose} />
      {position && (
        <>
          <Circle
            center={center}
            radius={35}
            pathOptions={{
              color: "#315cff",
              fillColor: "#315cff",
              fillOpacity: 0.12,
            }}
          />
          <Marker
            position={center}
            icon={selectionIcon}
            draggable
            eventHandlers={{
              dragend(event) {
                const marker = event.target as L.Marker;
                const point = marker.getLatLng();
                onChoose({ latitude: point.lat, longitude: point.lng });
              },
            }}
          />
        </>
      )}
    </MapContainer>
  );
}

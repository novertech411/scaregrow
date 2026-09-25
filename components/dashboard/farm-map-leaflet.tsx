'use client'

import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import type { MapDevice } from '@/lib/services/map-devices'
import 'leaflet/dist/leaflet.css'

const jos: [number, number] = [9.8965, 8.8583]

function markerIcon(status: string) {
  const color = status === 'online' ? '#27a36a' : status === 'warning' ? '#f59e0b' : '#64748b'
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:18px;height:18px;border:3px solid white;border-radius:50%;background:${color};box-shadow:0 2px 8px #0005"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

export default function FarmMapLeaflet({ devices, onSelectDevice }: { devices: MapDevice[]; onSelectDevice: (id: string) => void }) {
  return (
    <MapContainer center={jos} zoom={13} className="h-full w-full" scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {devices.map((device, index) => {
        const latitude = device.farm?.latitude
        const longitude = device.farm?.longitude
        if (latitude == null || longitude == null) return null
        // Farm coordinates are shared by its devices. A small visual spread keeps every marker selectable.
        const angle = index * 2.39996
        const radius = Math.sqrt(index % 8) * 0.0004
        return (
          <Marker key={device.id} position={[latitude + Math.sin(angle) * radius, longitude + Math.cos(angle) * radius]} icon={markerIcon(device.status)} eventHandlers={{ click: () => onSelectDevice(device.id) }}>
            <Popup>
              <strong>{device.id}</strong><br />
              {device.farm?.name} · {device.plot?.name ?? 'Unknown plot'}<br />
              Status: {device.status}<br />
              <small>Approximate farm location</small>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}

"use client"

import { useEffect, useState, useRef } from "react"
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"

// Fix for default Leaflet icons in Next.js/Webpack
import "leaflet-defaulticon-compatibility"
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css"

// Komponen untuk update center peta ketika props berubah
function ChangeView({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center[0] && center[1]) {
      map.setView(center, zoom)
    }
  }, [center, zoom, map])
  return null
}

// Fix grey map issue on load
function ResizeMap() {
  const map = useMap()
  useEffect(() => {
    // Timeout gives the DOM time to render the container fully before calculating size
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 250)
    return () => clearTimeout(timer)
  }, [map])
  return null
}

// Komponen untuk menangani drag marker & klik peta
function LocationMarker({ position, setPosition, onLocationChange }) {
  const markerRef = useRef(null)

  useMapEvents({
    click(e) {
      const newPos = [e.latlng.lat, e.latlng.lng]
      setPosition(newPos)
      if (onLocationChange) onLocationChange(newPos[0], newPos[1])
    },
  })

  return position === null ? null : (
    <Marker
      draggable={true}
      eventHandlers={{
        dragend() {
          const marker = markerRef.current
          if (marker != null) {
            const latLng = marker.getLatLng()
            const newPos = [latLng.lat, latLng.lng]
            setPosition(newPos)
            if (onLocationChange) onLocationChange(newPos[0], newPos[1])
          }
        },
      }}
      position={position}
      ref={markerRef}
    />
  )
}

export default function LocationPicker({ 
  defaultLat = -6.200000, 
  defaultLng = 106.816666, 
  onLocationSelect 
}) {
  const [position, setPosition] = useState([defaultLat, defaultLng])
  const [searchQuery, setSearchQuery] = useState("")
  const [addressName, setAddressName] = useState("Memuat alamat...")
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef(null)

  // Fungsi untuk mendapatkan nama jalan dari koordinat (Reverse Geocoding OpenStreetMap)
  const reverseGeocode = async (lat, lng) => {
    try {
      setAddressName("Memuat alamat...")
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await res.json()
      if (data && data.display_name) {
        setAddressName(data.display_name)
      } else {
        setAddressName("Alamat tidak ditemukan")
      }
    } catch (error) {
      setAddressName("Gagal mengambil alamat")
    }
  }

  // Fungsi untuk mencari koordinat dari teks jalan (Geocoding OpenStreetMap)
  const searchLocation = async (query) => {
    if (!query.trim()) return
    try {
      setIsSearching(true)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
      const data = await res.json()
      if (data && data.length > 0) {
        const newLat = parseFloat(data[0].lat)
        const newLng = parseFloat(data[0].lon)
        setPosition([newLat, newLng])
        setAddressName(data[0].display_name)
        if (onLocationSelect) onLocationSelect(newLat, newLng)
      } else {
        setAddressName("Lokasi tidak ditemukan, coba kata kunci lain")
      }
    } catch (error) {
      setAddressName("Gagal mencari lokasi")
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearchQuery(val)

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    
    searchTimeoutRef.current = setTimeout(() => {
      searchLocation(val)
    }, 1000) // 1 second debounce to prevent spamming Nominatim API
  }

  const handleLocationChange = (lat, lng) => {
    if (onLocationSelect) onLocationSelect(lat, lng)
    reverseGeocode(lat, lng)
  }

  // Initial load reverse geocode
  useEffect(() => {
    reverseGeocode(position[0], position[1])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col gap-3 w-full h-full">
      <div className="relative">
        <input 
          type="text" 
          placeholder="Cari alamat di peta (misal: Monas Jakarta)" 
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          value={searchQuery}
          onChange={handleSearchChange}
        />
        {isSearching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Mencari...</span>}
      </div>
      
      <div className="w-full rounded-md overflow-hidden relative z-0 h-[250px] border">
        <MapContainer
          center={position}
          zoom={15}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ChangeView center={position} zoom={15} />
          <ResizeMap />
          <LocationMarker position={position} setPosition={setPosition} onLocationChange={handleLocationChange} />
        </MapContainer>
      </div>

      <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md border font-medium">
        {addressName}
      </div>
    </div>
  )
}

import type { StyleSpecification } from "mapbox-gl"

const OSM_TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL
  || "https://tile.openstreetmap.org/{z}/{x}/{y}.png"

export const MAP_TILE_ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION
  || "© OpenStreetMap contributors"
export const MAP_TILE_ATTRIBUTION_URL = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION_URL
  || "https://www.openstreetmap.org/copyright"

export const BASE_MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    openstreetmap: {
      type: "raster",
      tiles: [OSM_TILE_URL],
      tileSize: 256,
      attribution: MAP_TILE_ATTRIBUTION,
    },
  },
  layers: [
    {
      id: "openstreetmap",
      type: "raster",
      source: "openstreetmap",
    },
  ],
}

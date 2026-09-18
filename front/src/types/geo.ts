export interface GeoFeatureProperties {
  code: string
  nom: string
}

export interface GeoFeature {
  type: 'Feature'
  properties: GeoFeatureProperties
  geometry: GeoJSON.Geometry
}

export interface GeoFeatureCollection {
  type: 'FeatureCollection'
  features: GeoFeature[]
}

import type {
  Feature as GeoJSONFeature,
  FeatureCollection as GeoJSONFeatureCollection,
  Geometry,
} from 'geojson';

export interface Properties extends Record<string, unknown> {
  'icon-href'?: string;
  'marker-size'?: string;
  'marker-symbol'?: string;
  'marker-color'?: string;
  'marker-shape'?: string;
  stroke?: string;
  'stroke-width'?: number;
  'stroke-opacity'?: number;
  fill?: string;
  'fill-opacity'?: number;
}

export type Feature = GeoJSONFeature<Geometry, Properties | null>;
export type FeatureCollection = GeoJSONFeatureCollection<
  Geometry,
  Properties | null
>;
export type GeoJSONInput = Geometry | Feature | FeatureCollection;

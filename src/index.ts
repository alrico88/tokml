import { defu } from 'defu';
import { pairs } from './helpers/general';
import { geometry } from './helpers/geometry';
import {
  hasMarkerStyle,
  hasPolygonAndLineStyle,
  markerIconHref,
  markerStyle,
  polygonAndLineStyle,
  polygonAndLineStyleKey,
  removeMarkerStyle,
  removePolygonAndLineStyle,
} from './helpers/style';
import { tag } from './lib/strxml';
import esc from './lib/xml-escape';
import type {
  Feature,
  FeatureCollection,
  GeoJSONInput,
  Properties,
} from './types';

interface StyleDefinition {
  id: string;
  xml: string;
}

type Styles = Map<string, StyleDefinition>;

const DEFAULT_ICON_BASE_URL = 'https://api.tiles.mapbox.com/v3/marker/';
const DEFAULT_UNGROUPED_FOLDER_NAME = 'Uncategorized';

export interface KMLOptions {
  documentName?: string;
  documentDescription?: string;
  name?: string;
  description?: string;
  simplestyle?: boolean;
  iconBaseUrl?: string;
  timestamp?: string;
  groupBy?: (properties: Properties) => string | null | undefined;
  ungroupedFolderName?: string;
}

function documentName(options: KMLOptions): string {
  return options.documentName !== undefined
    ? tag('name', options.documentName)
    : '';
}

function documentDescription(options: KMLOptions): string {
  return options.documentDescription !== undefined
    ? tag('description', options.documentDescription)
    : '';
}

function name(properties: Properties, options: KMLOptions): string {
  const key = options.name ?? 'name';
  return properties[key] ? tag('name', esc(properties[key]) ?? '') : '';
}

function description(properties: Properties, options: KMLOptions): string {
  const key = options.description ?? 'description';
  return properties[key] ? tag('description', esc(properties[key]) ?? '') : '';
}

function timestamp(properties: Properties, options: KMLOptions): string {
  const key = options.timestamp ?? 'timestamp';
  return properties[key]
    ? tag('TimeStamp', tag('when', esc(properties[key]) ?? ''))
    : '';
}

// ## Data
function data(_: [string, unknown]): string {
  return tag(
    'Data',
    { name: _[0] },
    tag(
      'value',
      {},
      esc(_[1] ? (typeof _[1] === 'string' ? _[1] : JSON.stringify(_[1])) : '')
    )
  );
}

function extendeddata(_: Properties): string {
  return tag('ExtendedData', {}, pairs(_).map(data).join(''));
}

function feature(options: KMLOptions, styles: Styles) {
  return (_: Feature): string => {
    const geojsonGeometry = _.geometry;
    if (!_.properties || !geojsonGeometry || !geometry.valid(geojsonGeometry))
      return '';
    const properties = _.properties;
    var geometryString = geometry.any(geojsonGeometry);
    if (!geometryString) return '';

    let styleReference = '';
    if (options.simplestyle) {
      let styleKey: string | undefined;
      let renderStyle: ((id: string) => string) | undefined;
      let removeStyle: (() => void) | undefined;

      if (geometry.isPoint(geojsonGeometry) && hasMarkerStyle(properties)) {
        const baseUrl = options.iconBaseUrl ?? DEFAULT_ICON_BASE_URL;
        styleKey = `marker:${markerIconHref(baseUrl, properties)}`;
        renderStyle = (id) => markerStyle(baseUrl, properties, id);
        removeStyle = () => removeMarkerStyle(properties);
      } else if (
        (geometry.isPolygon(geojsonGeometry) ||
          geometry.isLine(geojsonGeometry)) &&
        hasPolygonAndLineStyle(properties)
      ) {
        const geometryStyleKey = polygonAndLineStyleKey(properties);
        if (geometryStyleKey) {
          styleKey = `geometry:${geometryStyleKey}`;
          renderStyle = (id) => polygonAndLineStyle(properties, id);
          removeStyle = () => removePolygonAndLineStyle(properties);
        }
      }

      if (styleKey && renderStyle) {
        let style = styles.get(styleKey);
        if (!style) {
          const id = `style-${styles.size + 1}`;
          style = { id, xml: renderStyle(id) };
          styles.set(styleKey, style);
        }
        styleReference = tag('styleUrl', `#${style.id}`);
        removeStyle?.();
      }
      // Note that style of GeometryCollection / MultiGeometry is not supported
    }

    var attributes: Record<string, string> = {};
    if (_.id) attributes.id = _.id.toString();
    return tag(
      'Placemark',
      attributes,
      name(properties, options) +
        description(properties, options) +
        extendeddata(properties) +
        timestamp(properties, options) +
        geometryString +
        styleReference
    );
  };
}

function folder(
  features: Feature[],
  folderName: string,
  options: KMLOptions,
  styles: Styles
): string {
  const content = features.map(feature(options, styles)).join('');
  if (!content) return '';
  return tag('Folder', tag('name', esc(folderName) ?? '') + content);
}

function collection(
  _: FeatureCollection,
  options: KMLOptions,
  styles: Styles
): string {
  const groups = new Map<string, Feature[]>();

  for (const f of _.features ?? []) {
    const groupName =
      options.groupBy?.(f.properties ?? {}) ??
      options.ungroupedFolderName ??
      DEFAULT_UNGROUPED_FOLDER_NAME;
    const group = groups.get(groupName) ?? [];
    group.push(f);
    groups.set(groupName, group);
  }

  let content = '';
  for (const [groupName, features] of groups) {
    content += folder(features, groupName, options, styles);
  }

  return content;
}

function root(_: GeoJSONInput, options: KMLOptions): string {
  if (!_.type) return '';
  const styles: Styles = new Map();
  const emitted = new Set<string>();

  const emit = (f: Feature): string => {
    const placemark = feature(options, styles)(f);
    let styleDefinitions = '';
    for (const { id, xml } of styles.values()) {
      if (emitted.has(id)) continue;
      emitted.add(id);
      styleDefinitions += xml;
    }
    return styleDefinitions + placemark;
  };

  switch (_.type) {
    case 'FeatureCollection':
      if (options.groupBy) {
        const content = collection(_, options, styles);
        return Array.from(styles.values(), ({ xml }) => xml).join('') + content;
      }
      return (_.features ?? []).map(emit).join('');
    case 'Feature':
      return emit(_);
    default:
      return emit({
        type: 'Feature',
        geometry: _,
        properties: {},
      });
  }
}

const defaultOptions: KMLOptions = {
  documentName: undefined,
  documentDescription: undefined,
  name: 'name',
  description: 'description',
  simplestyle: false,
  iconBaseUrl: DEFAULT_ICON_BASE_URL,
  timestamp: 'timestamp',
  ungroupedFolderName: DEFAULT_UNGROUPED_FOLDER_NAME,
};

/**
 * Convert GeoJSON to KML
 *
 * @export
 * @param {Object} geojson
 * @param {KMLOptions} options
 * @return {string}
 */
export function toKML(geojson: GeoJSONInput, options?: KMLOptions): string {
  const filledOptions = defu(options, defaultOptions);

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    tag(
      'kml',
      { xmlns: 'http://www.opengis.net/kml/2.2' },
      tag(
        'Document',
        documentName(filledOptions) +
          documentDescription(filledOptions) +
          root(geojson, filledOptions)
      )
    )
  );
}

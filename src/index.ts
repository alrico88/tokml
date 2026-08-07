import { defu } from 'defu';
import { pairs } from './helpers/general';
import { geometry } from './helpers/geometry';
import {
  hashStyle,
  hasMarkerStyle,
  hasPolygonAndLineStyle,
  markerStyle,
  polygonAndLineStyle,
  removeMarkerStyle,
  removePolygonAndLineStyle,
} from './helpers/style';
import { tag } from './lib/strxml';
import esc from './lib/xml-escape';
import type { Feature, GeoJSONInput, Properties } from './types';

const DEFAULT_ICON_BASE_URL = 'https://api.tiles.mapbox.com/v3/marker/';

export interface KMLOptions {
  documentName?: string;
  documentDescription?: string;
  name?: string;
  description?: string;
  simplestyle?: boolean;
  iconBaseUrl?: string;
  timestamp?: string;
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

function feature(options: KMLOptions, styleHashesArray: string[]) {
  return (_: Feature): string => {
    const geojsonGeometry = _.geometry;
    if (!_.properties || !geojsonGeometry || !geometry.valid(geojsonGeometry))
      return '';
    var geometryString = geometry.any(geojsonGeometry);
    if (!geometryString) return '';

    var styleDefinition = '',
      styleReference = '',
      styleHash: string;
    if (options.simplestyle) {
      styleHash = hashStyle(_.properties);
      if (styleHash) {
        if (geometry.isPoint(geojsonGeometry) && hasMarkerStyle(_.properties)) {
          if (styleHashesArray.indexOf(styleHash) === -1) {
            styleDefinition = markerStyle(
              options.iconBaseUrl ?? DEFAULT_ICON_BASE_URL,
              _.properties,
              styleHash
            );
            styleHashesArray.push(styleHash);
          }
          styleReference = tag('styleUrl', `#${styleHash}`);
          removeMarkerStyle(_.properties);
        } else if (
          (geometry.isPolygon(geojsonGeometry) ||
            geometry.isLine(geojsonGeometry)) &&
          hasPolygonAndLineStyle(_.properties)
        ) {
          if (styleHashesArray.indexOf(styleHash) === -1) {
            styleDefinition = polygonAndLineStyle(_.properties, styleHash);
            styleHashesArray.push(styleHash);
          }
          styleReference = tag('styleUrl', `#${styleHash}`);
          removePolygonAndLineStyle(_.properties);
        }
        // Note that style of GeometryCollection / MultiGeometry is not supported
      }
    }

    var attributes: Record<string, string> = {};
    if (_.id) attributes.id = _.id.toString();
    return (
      styleDefinition +
      tag(
        'Placemark',
        attributes,
        name(_.properties, options) +
          description(_.properties, options) +
          extendeddata(_.properties) +
          timestamp(_.properties, options) +
          geometryString +
          styleReference
      )
    );
  };
}

function root(_: GeoJSONInput, options: KMLOptions): string {
  if (!_.type) return '';
  var styleHashesArray: string[] = [];

  switch (_.type) {
    case 'FeatureCollection':
      return _.features?.map(feature(options, styleHashesArray)).join('') ?? '';
    case 'Feature':
      return feature(options, styleHashesArray)(_);
    default:
      return feature(
        options,
        styleHashesArray
      )({
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

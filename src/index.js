import esc from './lib/xml-escape';
import { tag } from './lib/strxml';
import { geometry } from './helpers/geometry';
import {
  markerStyle,
  hashStyle,
  removeMarkerStyle,
  hasPolygonAndLineStyle,
  polygonAndLineStyle,
  hasMarkerStyle,
  removePolygonAndLineStyle,
} from './helpers/style';
import { pairs } from './helpers/general';
import { defu } from 'defu';

function documentName(options) {
  return options.documentName !== undefined
    ? tag('name', options.documentName)
    : '';
}

function documentDescription(options) {
  return options.documentDescription !== undefined
    ? tag('description', options.documentDescription)
    : '';
}
function name(_, options) {
  return _[options.name] ? tag('name', esc(_[options.name])) : '';
}

function description(_, options) {
  return _[options.description]
    ? tag('description', esc(_[options.description]))
    : '';
}

function timestamp(_, options) {
  return _[options.timestamp]
    ? tag('TimeStamp', tag('when', esc(_[options.timestamp])))
    : '';
}

// ## Data
function data(_) {
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

function extendeddata(_) {
  return tag('ExtendedData', {}, pairs(_).map(data).join(''));
}

function feature(options, styleHashesArray) {
  return function (_) {
    if (!_.properties || !geometry.valid(_.geometry)) return '';
    var geometryString = geometry.any(_.geometry);
    if (!geometryString) return '';

    var styleDefinition = '',
      styleReference = '';
    if (options.simplestyle) {
      var styleHash = hashStyle(_.properties);
      if (styleHash) {
        if (geometry.isPoint(_.geometry) && hasMarkerStyle(_.properties)) {
          if (styleHashesArray.indexOf(styleHash) === -1) {
            styleDefinition = markerStyle(
              options.iconBaseUrl,
              _.properties,
              styleHash
            );
            styleHashesArray.push(styleHash);
          }
          styleReference = tag('styleUrl', '#' + styleHash);
          removeMarkerStyle(_.properties);
        } else if (
          (geometry.isPolygon(_.geometry) || geometry.isLine(_.geometry)) &&
          hasPolygonAndLineStyle(_.properties)
        ) {
          if (styleHashesArray.indexOf(styleHash) === -1) {
            styleDefinition = polygonAndLineStyle(_.properties, styleHash);
            styleHashesArray.push(styleHash);
          }
          styleReference = tag('styleUrl', '#' + styleHash);
          removePolygonAndLineStyle(_.properties);
        }
        // Note that style of GeometryCollection / MultiGeometry is not supported
      }
    }

    var attributes = {};
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

function root(_, options) {
  if (!_.type) return '';
  var styleHashesArray = [];

  switch (_.type) {
    case 'FeatureCollection':
      if (!_.features) return '';
      return _.features.map(feature(options, styleHashesArray)).join('');
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

/**
 * @typedef KMLOptions
 * @property {string} [documentName]
 * @property {string} [documentDescription]
 * @property {string} [name="name"]
 * @property {string} [description="description"]
 * @property {string} [simplestyle=false]
 * @property {string} [iconBaseUrl="https://api.tiles.mapbox.com/v3/marker/"]
 * @property {string} [timestamp="timestamp"]
 */

const defaultOptions = {
  documentName: undefined,
  documentDescription: undefined,
  name: 'name',
  description: 'description',
  simplestyle: false,
  iconBaseUrl: 'https://api.tiles.mapbox.com/v3/marker/',
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
export function toKML(geojson, options) {
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

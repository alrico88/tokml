import is from '@sindresorhus/is';
import { tag } from '../lib/strxml';
import esc from '../lib/xml-escape';
import type { Properties } from '../types';

export function hexToKmlColor(
  hexColor: string | undefined,
  opacity: number | undefined
): string {
  if (!is.string(hexColor)) return '';

  hexColor = hexColor.replace('#', '').toLowerCase();

  if (hexColor.length === 3) {
    hexColor =
      hexColor[0] +
      hexColor[0] +
      hexColor[1] +
      hexColor[1] +
      hexColor[2] +
      hexColor[2];
  } else if (hexColor.length !== 6) {
    return '';
  }

  var r = hexColor[0] + hexColor[1];
  var g = hexColor[2] + hexColor[3];
  var b = hexColor[4] + hexColor[5];

  var o = 'ff';
  if (is.number(opacity) && opacity >= 0.0 && opacity <= 1.0) {
    o = (opacity * 255).toString(16);
    if (o.indexOf('.') > -1) o = o.substr(0, o.indexOf('.'));
    if (o.length < 2) o = `0${o}`;
  }

  return o + b + g + r;
}

export function hasMarkerStyle(_: Properties): boolean {
  return !!(
    _['icon-href'] ||
    _['marker-size'] ||
    _['marker-symbol'] ||
    _['marker-color']
  );
}

export function removeMarkerStyle(_: Properties): void {
  delete _['icon-href'];
  delete _['marker-size'];
  delete _['marker-symbol'];
  delete _['marker-color'];
  delete _['marker-shape'];
}

const iconSize = tag(
  'hotSpot',
  {
    xunits: 'fraction',
    yunits: 'fraction',
    x: '0.5',
    y: '0.5',
  },
  ''
);

export function iconUrl(baseUrl: string, _: Properties): string {
  var size = _['marker-size'] || 'medium',
    symbol = _['marker-symbol'] ? `-${_['marker-symbol']}` : '',
    color = (_['marker-color'] || '7e7e7e').replace('#', '');

  return `${baseUrl}pin-${size.charAt(0)}${symbol}+${color}.png`;
}

export function markerIconHref(baseUrl: string, _: Properties): string {
  const iconHref = _['icon-href'];
  return is.nonEmptyString(iconHref) ? iconHref : iconUrl(baseUrl, _);
}

export function markerStyle(
  baseUrl: string,
  _: Properties,
  styleHash: string
): string {
  const href = esc(markerIconHref(baseUrl, _)) ?? '';

  return tag(
    'Style',
    { id: styleHash },
    tag('IconStyle', tag('Icon', tag('href', href))) + iconSize
  );
}

// ## Polygon and Line style
export function hasPolygonAndLineStyle(_: Properties): boolean {
  for (var key in _) {
    if (
      {
        stroke: true,
        'stroke-opacity': true,
        'stroke-width': true,
        fill: true,
        'fill-opacity': true,
      }[key]
    )
      return true;
  }
  return false;
}

export function removePolygonAndLineStyle(_: Properties): void {
  delete _.stroke;
  delete _['stroke-opacity'];
  delete _['stroke-width'];
  delete _.fill;
  delete _['fill-opacity'];
}

export function polygonAndLineStyle(_: Properties, styleHash: string): string {
  var lineStyle = tag(
    'LineStyle',
    tag('color', hexToKmlColor(_.stroke, _['stroke-opacity']) || 'ff555555') +
      tag('width', {}, _['stroke-width'] === undefined ? 2 : _['stroke-width'])
  );

  var polyStyle = '';

  if (_.fill || _['fill-opacity']) {
    polyStyle = tag(
      'PolyStyle',
      tag('color', {}, hexToKmlColor(_.fill, _['fill-opacity']) || '88555555')
    );
  }

  return tag('Style', { id: styleHash }, lineStyle + polyStyle);
}

export function polygonAndLineStyleKey(_: Properties): string | undefined {
  if (
    !_.stroke &&
    !_['stroke-width'] &&
    !_['stroke-opacity'] &&
    !_.fill &&
    !_['fill-opacity']
  )
    return undefined;

  return JSON.stringify([
    _.stroke,
    _['stroke-width'],
    _['stroke-opacity'],
    _.fill,
    _['fill-opacity'],
  ]);
}

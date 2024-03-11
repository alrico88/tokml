import { tag } from '../lib/strxml';

export function hexToKmlColor(hexColor, opacity) {
  if (typeof hexColor !== 'string') return '';

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
  if (typeof opacity === 'number' && opacity >= 0.0 && opacity <= 1.0) {
    o = (opacity * 255).toString(16);
    if (o.indexOf('.') > -1) o = o.substr(0, o.indexOf('.'));
    if (o.length < 2) o = '0' + o;
  }

  return o + b + g + r;
}

export function hasMarkerStyle(_) {
  return !!(_['marker-size'] || _['marker-symbol'] || _['marker-color']);
}

export function removeMarkerStyle(_) {
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

export function iconUrl(baseUrl, _) {
  var size = _['marker-size'] || 'medium',
    symbol = _['marker-symbol'] ? '-' + _['marker-symbol'] : '',
    color = (_['marker-color'] || '7e7e7e').replace('#', '');

  return baseUrl + 'pin-' + size.charAt(0) + symbol + '+' + color + '.png';
}

export function markerStyle(baseUrl, _, styleHash) {
  return tag(
    'Style',
    { id: styleHash },
    tag('IconStyle', tag('Icon', tag('href', iconUrl(baseUrl, _)))) + iconSize
  );
}

// ## Polygon and Line style
export function hasPolygonAndLineStyle(_) {
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
}

export function removePolygonAndLineStyle(_) {
  delete _['stroke'];
  delete _['stroke-opacity'];
  delete _['stroke-width'];
  delete _['fill'];
  delete _['fill-opacity'];
}

export function polygonAndLineStyle(_, styleHash) {
  var lineStyle = tag(
    'LineStyle',
    tag(
      'color',
      hexToKmlColor(_['stroke'], _['stroke-opacity']) || 'ff555555'
    ) +
      tag('width', {}, _['stroke-width'] === undefined ? 2 : _['stroke-width'])
  );

  var polyStyle = '';

  if (_['fill'] || _['fill-opacity']) {
    polyStyle = tag(
      'PolyStyle',
      tag(
        'color',
        {},
        hexToKmlColor(_['fill'], _['fill-opacity']) || '88555555'
      )
    );
  }

  return tag('Style', { id: styleHash }, lineStyle + polyStyle);
}

// ## Style helpers
export function hashStyle(_) {
  var hash = '';

  if (_['marker-symbol']) hash = hash + 'ms' + _['marker-symbol'];
  if (_['marker-color'])
    hash = hash + 'mc' + _['marker-color'].replace('#', '');
  if (_['marker-size']) hash = hash + 'ms' + _['marker-size'];
  if (_['stroke']) hash = hash + 's' + _['stroke'].replace('#', '');
  if (_['stroke-width'])
    hash = hash + 'sw' + _['stroke-width'].toString().replace('.', '');
  if (_['stroke-opacity'])
    hash = hash + 'mo' + _['stroke-opacity'].toString().replace('.', '');
  if (_['fill']) hash = hash + 'f' + _['fill'].replace('#', '');
  if (_['fill-opacity'])
    hash = hash + 'fo' + _['fill-opacity'].toString().replace('.', '');

  return hash;
}

import { tag } from '../lib/strxml';

function linearring(_) {
  return _.map(function (cds) {
    return cds.join(',');
  }).join(' ');
}

export const geometry = {
  Point: function (_) {
    return tag('Point', tag('coordinates', _.coordinates.join(',')));
  },
  LineString: function (_) {
    return tag('LineString', tag('coordinates', linearring(_.coordinates)));
  },
  Polygon: function (_) {
    if (!_.coordinates.length) return '';
    var outer = _.coordinates[0],
      inner = _.coordinates.slice(1),
      outerRing = tag(
        'outerBoundaryIs',
        tag('LinearRing', tag('coordinates', linearring(outer)))
      ),
      innerRings = inner
        .map(function (i) {
          return tag(
            'innerBoundaryIs',
            tag('LinearRing', tag('coordinates', linearring(i)))
          );
        })
        .join('');
    return tag('Polygon', outerRing + innerRings);
  },
  MultiPoint: function (_) {
    if (!_.coordinates.length) return '';
    return tag(
      'MultiGeometry',
      _.coordinates
        .map(function (c) {
          return geometry.Point({ coordinates: c });
        })
        .join('')
    );
  },
  MultiPolygon: function (_) {
    if (!_.coordinates.length) return '';
    return tag(
      'MultiGeometry',
      _.coordinates
        .map(function (c) {
          return geometry.Polygon({ coordinates: c });
        })
        .join('')
    );
  },
  MultiLineString: function (_) {
    if (!_.coordinates.length) return '';
    return tag(
      'MultiGeometry',
      _.coordinates
        .map(function (c) {
          return geometry.LineString({ coordinates: c });
        })
        .join('')
    );
  },
  GeometryCollection: function (_) {
    return tag('MultiGeometry', _.geometries.map(geometry.any).join(''));
  },
  valid: function (_) {
    return (
      _ &&
      _.type &&
      (_.coordinates ||
        (_.type === 'GeometryCollection' &&
          _.geometries &&
          _.geometries.every(geometry.valid)))
    );
  },
  any: function (_) {
    if (geometry[_.type]) {
      return geometry[_.type](_);
    } else {
      return '';
    }
  },
  isPoint: function (_) {
    return _.type === 'Point' || _.type === 'MultiPoint';
  },
  isPolygon: function (_) {
    return _.type === 'Polygon' || _.type === 'MultiPolygon';
  },
  isLine: function (_) {
    return _.type === 'LineString' || _.type === 'MultiLineString';
  },
};

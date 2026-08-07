import type {
  Geometry,
  GeometryCollection,
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
  Position,
} from 'geojson';
import { tag } from '../lib/strxml';

function linearring(_: Position[]): string {
  return _.map((cds) => cds.join(',')).join(' ');
}

function renderPoint(g: Point): string {
  return tag('Point', tag('coordinates', g.coordinates.join(',')));
}

function renderLineString(g: LineString): string {
  return tag('LineString', tag('coordinates', linearring(g.coordinates)));
}

function renderPolygon(g: Polygon): string {
  if (!g.coordinates.length) return '';
  var outer = g.coordinates[0],
    inner = g.coordinates.slice(1),
    outerRing = tag(
      'outerBoundaryIs',
      tag('LinearRing', tag('coordinates', linearring(outer)))
    ),
    innerRings = inner
      .map((i) =>
        tag(
          'innerBoundaryIs',
          tag('LinearRing', tag('coordinates', linearring(i)))
        )
      )
      .join('');
  return tag('Polygon', outerRing + innerRings);
}

function renderMultiPoint(g: MultiPoint): string {
  if (!g.coordinates.length) return '';
  return tag(
    'MultiGeometry',
    g.coordinates
      .map((c) => renderPoint({ type: 'Point', coordinates: c }))
      .join('')
  );
}

function renderMultiPolygon(g: MultiPolygon): string {
  if (!g.coordinates.length) return '';
  return tag(
    'MultiGeometry',
    g.coordinates
      .map((c) => renderPolygon({ type: 'Polygon', coordinates: c }))
      .join('')
  );
}

function renderMultiLineString(g: MultiLineString): string {
  if (!g.coordinates.length) return '';
  return tag(
    'MultiGeometry',
    g.coordinates
      .map((c) => renderLineString({ type: 'LineString', coordinates: c }))
      .join('')
  );
}

function renderGeometryCollection(g: GeometryCollection): string {
  return tag('MultiGeometry', g.geometries.map(render).join(''));
}

function render(g: Geometry): string {
  switch (g.type) {
    case 'Point':
      return renderPoint(g);
    case 'LineString':
      return renderLineString(g);
    case 'Polygon':
      return renderPolygon(g);
    case 'MultiPoint':
      return renderMultiPoint(g);
    case 'MultiPolygon':
      return renderMultiPolygon(g);
    case 'MultiLineString':
      return renderMultiLineString(g);
    case 'GeometryCollection':
      return renderGeometryCollection(g);
    default:
      return '';
  }
}

function valid(g: Geometry | undefined): boolean {
  return Boolean(
    g?.type &&
      (('coordinates' in g && Boolean(g.coordinates)) ||
        (g.type === 'GeometryCollection' &&
          g.geometries &&
          g.geometries.every(valid)))
  );
}

function isPoint(g: Geometry): boolean {
  return g.type === 'Point' || g.type === 'MultiPoint';
}

function isPolygon(g: Geometry): boolean {
  return g.type === 'Polygon' || g.type === 'MultiPolygon';
}

function isLine(g: Geometry): boolean {
  return g.type === 'LineString' || g.type === 'MultiLineString';
}

export const geometry = {
  any: render,
  valid,
  isPoint,
  isPolygon,
  isLine,
};

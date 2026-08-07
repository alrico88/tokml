import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { toKML } from '../src/index';

const dataDir = resolve(__dirname, 'data');

function file(name: string): unknown {
  return JSON.parse(readFileSync(resolve(dataDir, `${name}.geojson`), 'utf8'));
}

function output(name: string): string {
  return readFileSync(resolve(dataDir, `${name}.kml`), 'utf8');
}

function geq(name: string, options?: Record<string, unknown>) {
  expect(toKML(file(name), options)).toBe(output(name));
}

describe('geometry', () => {
  it.each([
    'polygon',
    'linestring',
    'multilinestring',
    'multipoint',
    'multipolygon',
    'geometrycollection',
    'geometrycollection_nogeometries',
  ])('%s', (name) => geq(name));
});

describe('quirks', () => {
  it.each([
    'cdata',
    'singlefeature',
    'singlegeometry',
    'unknown',
    'nulldata',
    'unknowngeom',
    'unknowntype',
    'notype',
    'number_property',
    'polygon_norings',
    'multipolygon_none',
    'multipoint_none',
    'multilinestring_none',
  ])('%s', (name) => geq(name));
});

describe('id attribute', () => {
  it('id', () => geq('id'));
});

describe('name & description', () => {
  it('name_desc', () => geq('name_desc'));
  it('document_name_desc', () =>
    geq('document_name_desc', {
      documentName: 'Document Title',
      documentDescription: 'Document Description',
    }));
});

describe('timestamp', () => {
  it('timestamp', () =>
    geq('timestamp', {
      name: 'name',
      description: 'description',
      timestamp: 'moment',
    }));
});

describe('simplestyle spec', () => {
  const options = { simplestyle: true };

  it.each([
    'simplestyle_optionnotset',
    'simplestyle_nostyle',
    'simplestyle_multiple_same',
    'simplestyle_multiple_different',
    'simplestyle_point',
    'simplestyle_point_nosymbol',
    'simplestyle_point_defaults',
    'simplestyle_linestring',
    'simplestyle_linestring_defaults',
    'simplestyle_multilinestring',
    'simplestyle_polygon',
    'simplestyle_polygon_defaults',
    'simplestyle_multipolygon',
    'simplestyle_polygon_multiple_same',
    'simplestyle_polygon_multiple_different',
    'simplestyle_geometrycollection',
  ])('%s', (name) => {
    const opts = name === 'simplestyle_optionnotset' ? undefined : options;
    geq(name, opts);
  });
});

describe('iconBaseUrl', () => {
  it('uses the mapbox default when not provided', () => {
    const kml = toKML(file('simplestyle_point'), { simplestyle: true });
    expect(kml).toContain('https://api.tiles.mapbox.com/v3/marker/');
  });

  it('uses a custom icon api endpoint', () => {
    const kml = toKML(file('simplestyle_point'), {
      simplestyle: true,
      iconBaseUrl: 'https://my-icon-api.com/icons/',
    });
    expect(kml).toContain('https://my-icon-api.com/icons/');
    expect(kml).not.toContain('api.tiles.mapbox.com');
  });

  it('does not affect output when simplestyle is off', () => {
    const kml = toKML(file('simplestyle_point'), {
      iconBaseUrl: 'https://my-icon-api.com/icons/',
    });
    expect(kml).not.toContain('https://my-icon-api.com/icons/');
  });
});

describe('simplestyle hex to kml color conversion', () => {
  function testColor(
    inputColor: string | null,
    inputOpacity: number | null,
    expected: string
  ) {
    const featureCollection = file('linestring');
    const props = featureCollection.features[0].properties;
    if (inputColor !== null) props.stroke = inputColor;
    if (inputOpacity !== null) props['stroke-opacity'] = inputOpacity;

    const kml = toKML(featureCollection, { simplestyle: true });

    if (inputColor) {
      const colorValue = kml.substr(kml.indexOf('<color>') + 7, 8);
      expect(colorValue, `${inputColor} / ${inputOpacity}`).toBe(expected);
    } else {
      expect(
        kml.indexOf('<color>'),
        `${inputColor} results in empty string`
      ).toBe(-1);
    }
  }

  it.each([
    ['#ff5500', 1, 'ff0055ff'],
    ['#0000ff', 1, 'ffff0000'],
    ['#00ff00', 1, 'ff00ff00'],
    ['#000000', 1, 'ff000000'],
    ['#ffffff', 1, 'ffffffff'],
    ['#ff5500', 0.5, '7f0055ff'],
    ['#ff5500', 0, '000055ff'],
    ['#ff5500', 0.01, '020055ff'],
    ['#ff5500', 0.02, '050055ff'],
    ['#ff5500', 0.99, 'fc0055ff'],
    ['#ff5500', 1, 'ff0055ff'],
    ['#f50', null, 'ff0055ff'],
    ['f50', null, 'ff0055ff'],
    ['aa', null, 'ff555555'],
  ] as const)('%s / %s -> %s', (color, opacity, expected) => {
    testColor(color, opacity, expected);
  });

  it('null color results in empty string', () =>
    testColor(null, null, 'ff0055ff'));
  it('empty color results in empty string', () =>
    testColor('', null, 'ff0055ff'));
});

describe('fuzz', () => {
  function mutate(value: unknown): unknown {
    const seed = Math.random();
    if (Array.isArray(value)) {
      if (!value.length || seed < 0.3) return [];
      return value.map(mutate);
    }
    if (value !== null && typeof value === 'object') {
      const copy: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        copy[seed < 0.2 ? `${key}_x` : key] = mutate(val);
      }
      return copy;
    }
    if (typeof value === 'string') {
      if (seed < 0.2) return '<>&"\'';
      if (seed < 0.4) return '';
      return value;
    }
    if (typeof value === 'number') {
      return seed < 0.3 ? NaN : value;
    }
    return value;
  }

  it('does not throw on fuzzed input', () => {
    const geojsonFiles = [
      'polygon',
      'linestring',
      'multilinestring',
      'multipoint',
      'multipolygon',
      'geometrycollection',
      'simplestyle_point',
      'simplestyle_polygon',
      'nulldata',
      'notype',
    ];
    for (const name of geojsonFiles) {
      const original = file(name);
      for (let i = 0; i < 10; i++) {
        const fuzzed = mutate(original);
        expect(() => toKML(fuzzed)).not.toThrow();
      }
    }
  });
});

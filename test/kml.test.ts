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

describe('groupBy folders', () => {
  function pointFeature(
    name: string,
    props: Record<string, unknown>
  ): Record<string, unknown> {
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { name, ...props },
    };
  }

  function countFolders(kml: string): number {
    return kml.match(/<Folder>/g)?.length ?? 0;
  }

  it('groups features into folders by groupBy result', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        pointFeature('p1', { category: 'a' }),
        pointFeature('p2', { category: 'b' }),
        pointFeature('p3', { category: 'a' }),
      ],
    };
    const kml = toKML(fc, { groupBy: (p) => String(p.category) });
    expect(countFolders(kml)).toBe(2);
    expect(kml).toContain('<Folder><name>a</name>');
    expect(kml).toContain('<Folder><name>b</name>');
  });

  it('keeps features with the same folder name together', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        pointFeature('p1', { category: 'a' }),
        pointFeature('p2', { category: 'b' }),
        pointFeature('p3', { category: 'a' }),
      ],
    };
    const kml = toKML(fc, { groupBy: (p) => String(p.category) });
    const folderA = kml.slice(0, kml.indexOf('</Folder>'));
    expect(folderA).toContain('<name>p1</name>');
    expect(folderA).toContain('<name>p3</name>');
    expect(folderA).not.toContain('<name>p2</name>');
  });

  it('puts features without a group in the default Uncategorized folder', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        pointFeature('p1', { category: 'x' }),
        pointFeature('p2', {}),
        pointFeature('p3', { category: null }),
      ],
    };
    const kml = toKML(fc, { groupBy: (p) => p.category as string | undefined });
    expect(countFolders(kml)).toBe(2);
    expect(kml).toContain('<Folder><name>Uncategorized</name>');
    const uncategorized = kml.slice(
      kml.indexOf('<Folder><name>Uncategorized</name>')
    );
    expect(uncategorized).toContain('<name>p2</name>');
    expect(uncategorized).toContain('<name>p3</name>');
  });

  it('uses a custom ungrouped folder name', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [pointFeature('p1', { category: 'x' }), pointFeature('p2', {})],
    };
    const kml = toKML(fc, {
      groupBy: (p) => p.category as string | undefined,
      ungroupedFolderName: 'Other',
    });
    expect(countFolders(kml)).toBe(2);
    expect(kml).toContain('<Folder><name>Other</name>');
    expect(kml).not.toContain('Uncategorized');
  });

  it('treats an explicit undefined ungroupedFolderName as the default', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [pointFeature('p1', { category: 'x' }), pointFeature('p2', {})],
    };
    const kml = toKML(fc, {
      groupBy: (p) => p.category as string | undefined,
      ungroupedFolderName: undefined,
    });
    expect(countFolders(kml)).toBe(2);
    expect(kml).toContain('<Folder><name>Uncategorized</name>');
  });

  it('supports a complex groupBy callback combining properties', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        pointFeature('p1', { region: 'north', type: 'road' }),
        pointFeature('p2', { region: 'south', type: 'river' }),
        pointFeature('p3', { region: 'north', type: 'lake' }),
        pointFeature('p4', { region: 'north', type: 'road' }),
      ],
    };
    const kml = toKML(fc, {
      groupBy: (p) => `${p.region} - ${p.type}`,
    });
    expect(countFolders(kml)).toBe(3);
    expect(kml).toContain('<Folder><name>north - road</name>');
    expect(kml).toContain('<Folder><name>south - river</name>');
    expect(kml).toContain('<Folder><name>north - lake</name>');
  });

  it('does not wrap a single Feature in a folder', () => {
    const kml = toKML(pointFeature('p1', { category: 'a' }), {
      groupBy: (p) => String(p.category),
    });
    expect(countFolders(kml)).toBe(0);
  });

  it('does not wrap a bare Geometry in a folder', () => {
    const kml = toKML(
      { type: 'Point', coordinates: [0, 0] },
      {
        groupBy: () => 'x',
      }
    );
    expect(countFolders(kml)).toBe(0);
  });

  it('escapes XML characters in folder names', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        pointFeature('p1', { category: 'a & b' }),
        pointFeature('p2', { category: 'c < d' }),
      ],
    };
    const kml = toKML(fc, { groupBy: (p) => String(p.category) });
    expect(kml).toContain('<Folder><name>a &amp; b</name>');
    expect(kml).toContain('<Folder><name>c &lt; d</name>');
    expect(kml).not.toContain('<name>a & b</name>');
    expect(kml).not.toContain('<name>c < d</name>');
  });

  it('does not emit folders for an empty collection', () => {
    const kml = toKML(
      { type: 'FeatureCollection', features: [] },
      {
        groupBy: () => 'x',
      }
    );
    expect(countFolders(kml)).toBe(0);
  });

  it('deduplicates styles across folders', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        pointFeature('p1', { category: 'a', 'marker-color': '#ff0000' }),
        pointFeature('p2', { category: 'b', 'marker-color': '#ff0000' }),
      ],
    };
    const kml = toKML(fc, {
      simplestyle: true,
      groupBy: (p) => String(p.category),
    });
    expect(countFolders(kml)).toBe(2);
    expect(kml.match(/<Style /g)?.length ?? 0).toBe(1);
  });

  it('emits shared styles at the Document level, outside folders', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        pointFeature('p1', { category: 'a', 'marker-color': '#ff0000' }),
        pointFeature('p2', { category: 'b', 'marker-color': '#ff0000' }),
      ],
    };
    const kml = toKML(fc, {
      simplestyle: true,
      groupBy: (p) => String(p.category),
    });
    const stylePos = kml.indexOf('<Style id=');
    expect(stylePos).toBeGreaterThan(kml.indexOf('<Document>'));
    expect(stylePos).toBeLessThan(kml.indexOf('<Folder>'));
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

describe('icon-href', () => {
  function pointFeature(iconHref: string): Record<string, unknown> {
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { 'icon-href': iconHref },
    };
  }

  it('uses the feature icon-href verbatim in the marker style', () => {
    const iconHref = 'https://example.com/pins/mini/movistar.png';
    const kml = toKML(pointFeature(iconHref), { simplestyle: true });

    expect(kml).toContain(`<Icon><href>${iconHref}</href></Icon>`);
    expect(kml).toContain('<Style id="style-1">');
    expect(kml).toContain('<styleUrl>#style-1</styleUrl>');
    expect(kml).not.toContain('<Data name="icon-href">');
  });

  it('keeps the style id and reference XML-safe for URLs with reserved characters', () => {
    const iconHref = 'https://cdn.example.com/pins/mini/movistar.png?t=a&v=3';
    const kml = toKML(pointFeature(iconHref), { simplestyle: true });
    const styleId = kml.match(/<Style id="([^"]+)"/)?.[1];
    const styleUrl = kml.match(/<styleUrl>#([^<]+)<\/styleUrl>/)?.[1];

    expect(styleId).toBeDefined();
    expect(styleId).toBe(styleUrl);
    expect(styleId).not.toMatch(/[&<>"'/:?]/);
    expect(kml).toContain(
      '<Icon><href>https://cdn.example.com/pins/mini/movistar.png?t=a&amp;v=3</href></Icon>'
    );
  });

  it('escapes XML characters in icon-href', () => {
    const kml = toKML(pointFeature('https://example.com/pins/a?x=1&y=2'), {
      simplestyle: true,
    });

    expect(kml).toContain(
      '<Icon><href>https://example.com/pins/a?x=1&amp;y=2</href></Icon>'
    );
  });

  it('creates distinct styles for distinct icon-href values', () => {
    const kml = toKML(
      {
        type: 'FeatureCollection',
        features: [
          pointFeature('https://example.com/pins/a.png'),
          pointFeature('https://example.com/pins/b.png'),
        ],
      },
      { simplestyle: true }
    );

    expect(kml.match(/<Style id=/g)?.length).toBe(2);
    expect(kml).toContain('https://example.com/pins/a.png');
    expect(kml).toContain('https://example.com/pins/b.png');
  });

  it('deduplicates equal icon-href styles regardless of ignored marker properties', () => {
    const iconHref = 'https://example.com/pins/a.png';
    const first = pointFeature(iconHref);
    const second = pointFeature(iconHref);
    (first.properties as Record<string, unknown>)['marker-color'] = '#ff0000';
    (second.properties as Record<string, unknown>)['marker-color'] = '#0000ff';

    const kml = toKML(
      { type: 'FeatureCollection', features: [first, second] },
      { simplestyle: true }
    );

    expect(kml.match(/<Style id=/g)?.length).toBe(1);
    expect(kml.match(/<styleUrl>#style-1<\/styleUrl>/g)?.length).toBe(2);
  });

  it('keeps the synthesized icon URL for marker properties', () => {
    const kml = toKML(
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: { 'marker-symbol': 'star', 'marker-color': '#ff0000' },
      },
      { simplestyle: true }
    );

    expect(kml).toContain(
      '<Icon><href>https://api.tiles.mapbox.com/v3/marker/pin-m-star+ff0000.png</href></Icon>'
    );
  });

  it('does not turn icon-href into a style when simplestyle is off', () => {
    const iconHref = 'https://example.com/pins/custom.png';
    const kml = toKML(pointFeature(iconHref));

    expect(kml).not.toContain('<Style');
    expect(kml).toContain(
      `<Data name="icon-href"><value>${iconHref}</value></Data>`
    );
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

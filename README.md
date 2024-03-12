Forked from https://github.com/maphubs/tokml

# geokml

Convert [GeoJSON](http://geojson.org/) to [KML](https://developers.google.com/kml/documentation/).

## Installation

### Using npm

`npm i geokml`

### Using Yarn

`yarn add geokml`

### Using PNPM

`pnpm i geokml`

## Importing

ESM

```js
import { toKML } from 'geokml';
```

CommonJS

```js
const { toKML } = require('geokml');
```

## Example

```js
// kml is a string of KML data, geojsonObject is a JavaScript object of
// GeoJSON data
const kml = toKML(geojsonObject);

// grab name and description properties from each object and write them in
// KML
const kmlNameDescription = toKML(geojsonObject, {
  name: 'name',
  description: 'description',
});

// name and describe the KML document as a whole
const kmlDocumentName = toKML(geojsonObject, {
  documentName: 'My List Of Markers',
  documentDescription: 'One of the many places you are not I am',
});
```

## API

### `toKML(geojsonObject, [options])`

Given [GeoJSON](http://geojson.org/) data as an object, return KML data as a
string of XML.

`options` is an optional object that takes the following options:

**The property to name/description mapping:** while GeoJSON supports freeform
`properties` on each feature, KML has an expectation of `name` and `description`
properties that are often styled and displayed automatically. These options let
you define a mapping from the GeoJSON style to KML's.

- `name`: the name of the property in each GeoJSON Feature that contains
  the feature's name
- `description`: the name of the property in each GeoJSON Feature that contains
  the feature's description

**Timestamp:** KML can associate features with a moment in time via the `TimeStamp` tag. GeoJSON doesn't
have a comparable field, but a custom property can be mapped

- `timestamp`: the name of the property in each GeoJSON Feature that contains
  a timestamp in XML Schema Time (yyyy-mm-ddThh:mm:sszzzzzz)

**Document name and description**: KML supports `name` and `description` properties
for the full document.

- `documentName`: the name of the full document
- `documentDescription`: the description of the full document

**[simplestyle-spec](https://github.com/mapbox/simplestyle-spec)** support:

- `simplestyle`: set to `true` to convert simplestyle-spec styles into KML styles
- `iconBaseUrl`: Mapbox deprecated their icons API (pointing to "https://api.tiles.mapbox.com/v3/marker/") so you can customize it (e.g.: "https://my-icon-api.com/icons/"). This was the motive for this fork.

// originally from from https://github.com/mapbox/strxml

import esc from './xml-escape';

/**
 * @param {array} _ an array of attributes
 * @returns {string}
 */
export function attr(attributes) {
  if (!Object.keys(attributes).length) return '';
  return (
    ' ' +
    Object.keys(attributes)
      .map(function (key) {
        return key + '="' + esc(attributes[key]) + '"';
      })
      .join(' ')
  );
}

/**
 * @param {string} el element name
 * @param {array} attributes array of pairs
 * @returns {string}
 */
export function tagClose(el, attributes) {
  return '<' + el + attr(attributes) + '/>';
}

/**
 * @param {string} el element name
 * @param {string} contents innerXML
 * @param {array} attributes array of pairs
 * @returns {string}
 */
export function tag(el, attributes, contents) {
  if (Array.isArray(attributes) || typeof attributes === 'string') {
    contents = attributes;
    attributes = {};
  }
  if (Array.isArray(contents))
    contents =
      '\n' +
      contents
        .map(function (content) {
          return '  ' + content;
        })
        .join('\n') +
      '\n';
  return '<' + el + attr(attributes) + '>' + contents + '</' + el + '>';
}

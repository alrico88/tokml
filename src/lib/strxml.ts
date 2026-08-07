// originally from from https://github.com/mapbox/strxml

import esc from './xml-escape';

type Attributes = Record<string, string>;

/**
 * @param {array} _ an array of attributes
 * @returns {string}
 */
export function attr(attributes: Attributes): string {
  if (!Object.keys(attributes).length) return '';
  return (
    ' ' +
    Object.keys(attributes)
      .map((key) => `${key}="${esc(attributes[key])}"`)
      .join(' ')
  );
}

/**
 * @param {string} el element name
 * @param {array} attributes array of pairs
 * @returns {string}
 */
export function tagClose(el: string, attributes: Attributes): string {
  return `<${el}${attr(attributes)}/>`;
}

type TagContents = string | number | Array<string | number>;

/**
 * @param {string} el element name
 * @param {string} contents innerXML
 * @param {array} attributes array of pairs
 * @returns {string}
 */
export function tag(
  el: string,
  attributes: Attributes | string,
  contents?: TagContents
): string {
  if (Array.isArray(attributes) || typeof attributes === 'string') {
    contents = attributes;
    attributes = {};
  }
  if (Array.isArray(contents))
    contents = `\n${contents.map((content) => `  ${content}`).join('\n')}\n`;
  return `<${el}${attr(attributes)}>${contents}</${el}>`;
}

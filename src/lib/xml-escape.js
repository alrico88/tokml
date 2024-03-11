// originally from https://github.com/miketheprogrammer/xml-escape

export default function (string, ignore) {
  const escapeMap = {
    '>': '&gt;',
    '<': '&lt;',
    "'": '&apos;',
    '"': '&quot;',
    '&': '&amp;',
  };

  var pattern;

  if (string === null || string === undefined) return;

  // eslint-disable-next-line no-useless-escape
  ignore = (ignore || '').replace(/[^&"<>\']/g, '');
  pattern = '([&"<>\'])'.replace(new RegExp('[' + ignore + ']', 'g'), '');

  return string.replace(new RegExp(pattern, 'g'), function (str, item) {
    return escapeMap[item];
  });
}

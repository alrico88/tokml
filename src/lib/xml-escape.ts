// originally from https://github.com/miketheprogrammer/xml-escape

export default function (string: unknown, ignore?: string): string | undefined {
  const escapeMap = {
    '>': '&gt;',
    '<': '&lt;',
    "'": '&apos;',
    '"': '&quot;',
    '&': '&amp;',
  };

  if (string === null || string === undefined) return;

  const cleanedIgnore = (ignore || '').replace(/[^&"<>']/g, '');
  const pattern = '([&"<>\'])'.replace(
    new RegExp(`[${cleanedIgnore}]`, 'g'),
    ''
  );

  return String(string).replace(
    new RegExp(pattern, 'g'),
    (_str: string, item: string) => escapeMap[item as keyof typeof escapeMap]
  );
}

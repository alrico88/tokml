export function pairs(_: Record<string, unknown>): [string, unknown][] {
  var o: [string, unknown][] = [];
  for (var i in _) {
    o.push(_[i] ? [i, _[i]] : [i, '']);
  }
  return o;
}

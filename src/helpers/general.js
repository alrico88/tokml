export function pairs(_) {
  var o = [];
  for (var i in _) {
    if (_[i]) {
      o.push([i, _[i]]);
    } else {
      o.push([i, '']);
    }
  }
  return o;
}

const shallowEqual = (thing1, thing2) => {
  if (thing1 === thing2) return true
  if (!thing1) return false
  if (!thing2) return false
  if (Array.isArray(thing1) && Array.isArray(thing2)) return _shallowEqualArray(thing1, thing2)
  if (_isObject(thing1) && _isObject(thing2)) return _shallowEqualObject(thing1, thing2)
  return false
}

const _shallowEqualObject = (object1, object2) => {
  const object1Keys = Object.keys(object1)
  const object2Keys = Object.keys(object2)
  if (object1Keys.length !== object2Keys.length) return false
  for (const key in object1) {
    if (!Object.prototype.hasOwnProperty.call(object2, key)) return false
    if (object1[key] !== object2[key]) return false
  }
  return true
}

const _shallowEqualArray = (array1, array2) => {
  if (array1.length !== array2.length) return false
  for (const index in array1) if (array1[index] !== array2[index]) return false
  return true
}

const _isObject = variable => Object.prototype.toString.call(variable) === '[object Object]'

export default shallowEqual

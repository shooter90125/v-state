const hiddenMap = new WeakMap()
const hidden = object => hiddenMap.get(object) || hiddenMap.set(object, {}).get(object)

export default hidden
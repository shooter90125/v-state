const getObjectReducer = initialState => (state, type, property, _value) => {
  if (type === 'set') {
    const value = typeof _value === 'function' ? _value(state[property]) : _value
    return ({ ...state, [property]: value })
  } else if (type === 'reset') {
    return ({ ...state, [property]: initialState[property] })
  } else if (type === 'toggle') {
    return ({ ...state, [property]: !state[property] })
  } else {
    console.log('type not found', type)
    return state
  }
}

export default getObjectReducer
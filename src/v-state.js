import React from 'react'
import { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import createPrivateState from './private-state'

const simpleSelector = state => state

const strictEqual = (a, b) => a === b

const simpleReducer = state => state

const usePrivateState = (privateState, selector = simpleSelector, equalityFn = strictEqual) => {
  const unmounted = useUnmounted()
  const initialValue = privateState.get()
  const [value, setValue] = useState(initialValue)
  const selectedValue = useMemo(() => selector(value), [selector, value])
  const selectorRef = useUpdatingRef(selector)
  const equalityFnRef = useUpdatingRef(equalityFn)
  useLayoutEffectNoWarning(() => {
    let valueAtLastSet = value
    let selectorAtLastSet = selector
    let selectedValueAtLastSet = selectedValue
    return privateState.subscribe(newValue => {
      if (unmounted()) return
      const newSelector = selectorRef.current
      const newEqualityFn = equalityFnRef.current
      const valueChanged = newValue !== valueAtLastSet
      const selectorChanged = newSelector !== selectorAtLastSet
      const newSelectedValue = valueChanged || selectorChanged ? newSelector(newValue) : selectedValueAtLastSet
      if (!newEqualityFn(selectedValueAtLastSet, newSelectedValue)) {
        setValue(newValue)
        valueAtLastSet = newValue
        selectorAtLastSet = newSelector
        selectedValueAtLastSet = newSelectedValue
      }
    })
  }, [])
  return selectedValue
}

const createPublicInterface = (privateState, reducer = simpleReducer) => {
  return Object.freeze({
    canRedo: () => privateState.canRedo(),
    canUndo: () => privateState.canUndo(),
    dispatch: (...action) => {
      const currentValue = privateState.get()
      const newValue = reducer(currentValue, ...action)
      privateState.set(newValue)
    },
    get: () => privateState.get(),
    getDerivedState: (selector = simpleSelector, equalityFn = strictEqual) => {
      const newPrivateState = createPrivateState(undefined, 'readOnly')
      const newPublicInterface = createPublicInterface(newPrivateState)
      privateState.subscribe((value, unsubscribe) => {
        if (!newPublicInterface) unsubscribe()
        const currentSelectedValue = newPrivateState.get()
        const selectedValue = selector(value)
        if (!equalityFn(selectedValue, currentSelectedValue)) newPrivateState.forceSet(selectedValue)
      })
      return newPublicInterface
    },
    increment: (amount = 1) => privateState.set(value => value + amount),
    inject: (selector, Component, equalityFn = strictEqual) => props => {
      const selected = usePrivateState(privateState, isFunction(selector) ? selector : undefined, equalityFn)
      const newProps = isFunction(selector) ? selected : { [selector]: selected }
      const combinedProps = { ...props, ...newProps }
      return <Component {...combinedProps} />
    },
    redo: () => privateState.redo(),
    reset: () => privateState.set(privateState.getInitialValue()),
    set: value => privateState.set(value),
    subscribe: (fn, id = undefined) => privateState.subscribe(fn, id),
    toggle: () => privateState.set(currentValue => !currentValue),
    undo: () => privateState.undo(),
    unsubscribe: (...ids) => privateState.addToUnsubscribeRequests(...ids),
    use: (selector = simpleSelector, equalityFn = strictEqual) => usePrivateState(privateState, selector, equalityFn)
  })
}

function join (...vStates) {
  const subscribes = vStates.map(vState => fn => vState.subscribe(fn))
  const newPrivateState = createPrivateState(undefined, 'readOnly')
  const newPublicInterface = createPublicInterface(newPrivateState)
  subscribes.forEach(subscribe => {
    subscribe(() => {
      const currentValues = newPrivateState.get()
      const latestValues = vStates.map(vState => vState.get())
      if (!shallowEqual(currentValues, latestValues)) newPrivateState.forceSet(latestValues)
    })
  })
  return newPublicInterface
}

function createState (initialValue, reducer) {
  const privateState = createPrivateState(initialValue)
  const publicInterface = createPublicInterface(privateState, reducer)
  return publicInterface
}

createState.join = join

const isObject = variable => Object.prototype.toString.call(variable) === '[object Object]'

const isFunction = value => typeof value === 'function'

const shallowEqual = (thing1, thing2) => {
  if (thing1 === thing2) return true
  if (!thing1) return false
  if (!thing2) return false
  if (Array.isArray(thing1) && Array.isArray(thing2)) return _shallowEqualArray(thing1, thing2)
  if (isObject(thing1) && isObject(thing2)) return _shallowEqualObject(thing1, thing2)
  return false
}

const _shallowEqualObject = (object1, object2) => {
  const object1Keys = Object.keys(object1)
  const object2Keys = Object.keys(object2)
  if (object1Keys.length !== object2Keys.length) return false
  for (let key in object1) {
    if (!object2.hasOwnProperty(key)) return false
    if (object1[key] !== object2[key]) return false
  }
  return true
}

const _shallowEqualArray = (array1, array2) => {
  if (array1.length !== array2.length) return false
  for (let index in array1) if (array1[index] !== array2[index]) return false
  return true
}

const useUnmounted = () => {
  const unmounted = useRef(false)
  useEffect(() => {
    return () => { unmounted.current = true }
  }, [])
  return useCallback(() => unmounted.current, [])
}

const useLayoutEffectNoWarning = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const useUpdatingRef = value => {
  const ref = useRef()
  ref.current = value
  return ref
}

export default createState
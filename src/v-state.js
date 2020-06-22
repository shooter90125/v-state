import React, { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { v1 as generateId } from 'uuid'

// Utilities

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

// Default functions

const simpleSelector = state => state
const strictEqual = (a, b) => a === b
const simpleReducer = state => state

// Maps

const initialValueMap = new WeakMap()
const valueMap = new WeakMap()
const reducerMap = new WeakMap()
const subscriptionsMap = new WeakMap()
const unsubscribeRequestsMap = new WeakMap()
const readOnlyMap = new WeakMap()

// Map set operations

const setInitialValue = (object, initialValue) => { initialValueMap.set(object, initialValue) }
const setValue = (object, value) => { valueMap.set(object, value) }
const setReducer = (object, reducer) => { reducerMap.set(object, reducer) }
const setSubscriptions = (object, subscriptions) => { subscriptionsMap.set(object, subscriptions) }
const setUnsubscribeRequests = (object, unsubscribeRequests) => { unsubscribeRequestsMap.set(object, unsubscribeRequests) }
const setReadOnly = (object, readOnly) => { readOnlyMap.set(object, readOnly) }

// Map get operations

const getInitialValue = object => initialValueMap.get(object)
const getValue = object => valueMap.get(object)
const getReducer = object => reducerMap.get(object)
const getSubscriptions = object => subscriptionsMap.get(object)
const getUnsubscribeRequests = object => unsubscribeRequestsMap.get(object)
const getReadOnly = object => readOnlyMap.get(object)

// Set and broadcast

const setAndBroadcast = (object, _newValue) => {
  const currentValue = getValue(object)
  const newValue = isFunction(_newValue) ? _newValue(currentValue) : _newValue
  if (newValue !== currentValue) {
    setValue(object, newValue)
    flushUnsubscribeRequests(object)
    broadcast(object)
  }
}

const broadcast = object => {
  const currentValue = getValue(object)
  const subscriptions = getSubscriptions(object)
  subscriptions.forEach(({ id, fn }) => fn(currentValue, () => getUnsubscribeRequests(object).push(id)))
}

const flushUnsubscribeRequests = object => {
  const subscriptions = getSubscriptions(object)
  const newSubscriptions = subscriptions.filter(({ id }) => !getUnsubscribeRequests(object).includes(id))
  setSubscriptions(object, newSubscriptions)
  setUnsubscribeRequests(object, [])
}

// Methods

function unsubscribe (...ids) {
  getUnsubscribeRequests(this).push(...ids)
}

function get () {
  return getValue(this)
}

function set (newValue) {
  if (getReadOnly(this)) throw new Error('Can not call set on read only v-state.')
  setAndBroadcast(this, newValue)
}

function toggle () {
  if (getReadOnly(this)) throw new Error('Can not call toggle on read only v-state.')
  setAndBroadcast(this, currentValue => !currentValue)
}

function dispatch (...action) {
  if (getReadOnly(this)) throw new Error('Can not call dispatch on read only v-state.')
  const currentValue = getValue(this)
  const reducer = getReducer(this)
  const newValue = reducer(currentValue, ...action)
  setAndBroadcast(this, newValue)
}

function increment (amount = 1) {
  if (getReadOnly(this)) throw new Error('Can not call increment on read only v-state.')
  setAndBroadcast(this, value => value + amount)
}

function reset () {
  if (getReadOnly(this)) throw new Error('Can not call reset on read only v-state.')
  const initialValue = getInitialValue(this)
  setAndBroadcast(this, initialValue)
}

function subscribe (fn, id = generateId()) {
  const subscriptions = getSubscriptions(this)
  subscriptions.push({ id, fn })
  const currentValue = getValue(this)
  fn(currentValue, () => getUnsubscribeRequests(this).push(id))
  return () => getUnsubscribeRequests(this).push(id)
}

// Advanced methods

function getDerivedState (selector = simpleSelector, equalityFn = strictEqual) {
  const derivedState = new VState(undefined, undefined, 'readOnly')
  subscribe.call(this, (value, unsubscribe) => {
    if (!derivedState) unsubscribe()
    const currentSelectedValue = getValue(derivedState)
    const selectedValue = selector(value)
    if (!equalityFn(selectedValue, currentSelectedValue)) setAndBroadcast(derivedState, selectedValue)
  })
  return derivedState
}

function use (selector = simpleSelector, equalityFn = strictEqual) {
  const unmounted = useUnmounted()
  const initialValue = getValue(this)
  const [value, setValue] = useState(initialValue)
  const selectedValue = useMemo(() => selector(value), [selector, value])

  const selectorRef = useUpdatingRef(selector)
  const equalityFnRef = useUpdatingRef(equalityFn)

  useLayoutEffectNoWarning(() => {
    let valueAtLastSet = value
    let selectorAtLastSet = selector
    let selectedValueAtLastSet = selectedValue

    return subscribe.call(this, newValue => {
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

function join (...vStates) {
  const subscribes = vStates.map(vState => fn => subscribe.call(vState, fn))
  const jointState = new VState(undefined, undefined, 'readOnly')
  subscribes.forEach(subscribe => {
    subscribe(() => {
      const currentValues = getValue(jointState)
      const latestValues = vStates.map(vState => getValue(vState))
      if (!shallowEqual(currentValues, latestValues)) setAndBroadcast(jointState, latestValues)
    })
  })
  return jointState
}

function inject (selector, Component, equalityFn = strictEqual) {
  return props => {
    const selected = use.call(this, isFunction(selector) ? selector : undefined, equalityFn)
    const newProps = isFunction(selector) ? selected : { [selector]: selected }
    const combinedProps = { ...props, ...newProps }
    return <Component {...combinedProps} />
  }
}

// Class

class VState {
  constructor (initialValue = undefined, reducer = simpleReducer, _readOnly) {
    setValue(this, initialValue)
    setInitialValue(this, initialValue)
    setReducer(this, reducer)
    setSubscriptions(this, [])
    setUnsubscribeRequests(this, [])
    setReadOnly(this, !!_readOnly)

    this.get = get.bind(this)
    this.subscribe = subscribe.bind(this)
    this.unsubscribe = unsubscribe.bind(this)
    this.use = use.bind(this)
    this.dispatch = dispatch.bind(this)
    this.getDerivedState = getDerivedState.bind(this)
    this.inject = inject.bind(this)
    this.set = set.bind(this)
    this.increment = increment.bind(this)
    this.reset = reset.bind(this)
    this.toggle = toggle.bind(this)

    Object.freeze(this)
  }
}

VState.join = join

export default VState

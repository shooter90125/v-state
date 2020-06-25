import React from 'react'
import PrivateState from './private-state'
import { usePrivateState, isFunction, shallowEqual, simpleReducer, strictEqual, simpleSelector } from './utils'

const privateStates = new WeakMap()
const reducers = new WeakMap()
const readOnly = new WeakMap()

class VState {
  constructor (initialValue, reducer = simpleReducer) {
    const privateState = new PrivateState(initialValue)
    privateStates.set(this, privateState)
    reducers.set(this, reducer)
  }
  canRedo () {
    if (readOnly.get(this)) return false
    return privateStates.get(this).canRedo()
  }
  canUndo () {
    if (readOnly.get(this)) return false
    return privateStates.get(this).canUndo()
  }
  dispatch (...action) {
    if (readOnly.get(this)) throw new Error('Cannot set value on a read-only state.')
    const currentValue = privateStates.get(this).get()
    const newValue = reducers.get(this)(currentValue, ...action)
    privateStates.get(this).set(newValue)
  }
  get () {
    return privateStates.get(this).get()
  }
  getDerivedState (selector = simpleSelector, equalityFn = strictEqual) {
    const newPublicInterface = new this.constructor()
    const newPrivateState = privateStates.get(newPublicInterface)
    readOnly.set(newPublicInterface, true)
    privateStates.get(this).subscribe((value, unsubscribe) => {
      if (!newPublicInterface) unsubscribe()
      const currentSelectedValue = newPrivateState.get()
      const selectedValue = selector(value)
      if (!equalityFn(selectedValue, currentSelectedValue)) newPrivateState.set(selectedValue)
    })
    return newPublicInterface
  }
  increment (amount = 1) {
    if (readOnly.get(this)) throw new Error('Cannot set value on a read-only state.')
    privateStates.get(this).set(value => value + amount)
  }
  inject (selector, Component, equalityFn = strictEqual) {
    return props => {
      const selected = usePrivateState(privateStates.get(this), isFunction(selector) ? selector : undefined, equalityFn)
      const newProps = isFunction(selector) ? selected : { [selector]: selected }
      const combinedProps = { ...props, ...newProps }
      return <Component {...combinedProps} />
    }
  }
  redo () {
    if (readOnly.get(this)) throw new Error('Cannot set value on a read-only state.')
    return privateStates.get(this).redo()
  }
  reset () {
    if (readOnly.get(this)) throw new Error('Cannot set value on a read-only state.')
    privateStates.get(this).set(privateStates.get(this).getInitialValue())
  }
  set (value) {
    if (readOnly.get(this)) throw new Error('Cannot set value on a read-only state.')
    privateStates.get(this).set(value)
  }
  subscribe (fn, id = undefined) {
    return privateStates.get(this).subscribe(fn, id)
  }
  toggle () {
    if (readOnly.get(this)) throw new Error('Cannot set value on a read-only state.')
    privateStates.get(this).set(currentValue => !currentValue)
  }
  undo () {
    if (readOnly.get(this)) throw new Error('Cannot set value on a read-only state.')
    return privateStates.get(this).undo()
  }
  unsubscribe (...ids) {
    privateStates.get(this).addToUnsubscribeRequests(...ids)
  }
  use (selector = simpleSelector, equalityFn = strictEqual) {
    return usePrivateState(privateStates.get(this), selector, equalityFn)
  }
  static join (...vStates) {
    const subscribes = vStates.map(vState => fn => vState.subscribe(fn))
    const newPublicInterface = new this()
    const newPrivateState = privateStates.get(newPublicInterface)
    readOnly.set(newPublicInterface, true)
    subscribes.forEach(subscribe => {
      subscribe(() => {
        const currentValues = newPrivateState.get()
        const latestValues = vStates.map(vState => vState.get())
        if (!shallowEqual(currentValues, latestValues)) newPrivateState.set(latestValues)
      })
    })
    return newPublicInterface
  }
}

export default VState
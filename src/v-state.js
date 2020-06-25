import React from 'react'
import PrivateState from './private-state'
import { hidden, usePrivateState, isFunction, shallowEqual, strictEqual, simpleSelector } from './utils'

class VState {
  constructor (initialValue, reducer = undefined) {
    hidden(this).privateState = new PrivateState(initialValue)
    hidden(this).reducer = reducer
  }
  canRedo () {
    const { readOnly, privateState } = hidden(this)
    if (readOnly) return false
    return privateState.canRedo()
  }
  canUndo () {
    const { readOnly, privateState } = hidden(this)
    if (readOnly) return false
    return privateState.canUndo()
  }
  dispatch (...action) {
    const { readOnly, privateState, reducer } = hidden(this)
    if (readOnly) throw new Error('Cannot set value on a read-only state.')
    if (!reducer) throw new Error('Cannot call dispatch on state without a reducer')
    const currentValue = privateState.get()
    const newValue = reducer(currentValue, ...action)
    privateState.set(newValue)
  }
  get () {
    const { privateState } = hidden(this)
    return privateState.get()
  }
  getDerivedState (selector = simpleSelector, equalityFn = strictEqual) {
    const newPublicInterface = new this.constructor()
    const newPrivateState = hidden(newPublicInterface).privateState
    hidden(newPublicInterface).readOnly = true
    hidden(this).privateState.subscribe((value, unsubscribe) => {
      if (!newPublicInterface) unsubscribe()
      const currentSelectedValue = newPrivateState.get()
      const selectedValue = selector(value)
      if (!equalityFn(selectedValue, currentSelectedValue)) newPrivateState.set(selectedValue)
    })
    return newPublicInterface
  }
  increment (amount = 1) {
    const { readOnly, privateState } = hidden(this)
    if (readOnly) throw new Error('Cannot set value on a read-only state.')
    privateState.set(value => value + amount)
  }
  inject (selector, Component, equalityFn = strictEqual) {
    const { privateState } = hidden(this)
    return props => {
      const selected = usePrivateState(privateState, isFunction(selector) ? selector : undefined, equalityFn)
      const newProps = isFunction(selector) ? selected : { [selector]: selected }
      const combinedProps = { ...props, ...newProps }
      return <Component {...combinedProps} />
    }
  }
  redo () {
    const { readOnly, privateState } = hidden(this)
    if (readOnly) throw new Error('Cannot set value on a read-only state.')
    return privateState.redo()
  }
  reset () {
    const { readOnly, privateState } = hidden(this)
    if (readOnly) throw new Error('Cannot set value on a read-only state.')
    privateState.set(privateState.getInitialValue())
  }
  set (value) {
    const { readOnly, privateState } = hidden(this)
    if (readOnly) throw new Error('Cannot set value on a read-only state.')
    privateState.set(value)
  }
  set reducer (reducer) { // NOT YET TESTED
    hidden(this).reducer = reducer
  }
  subscribe (fn, id = undefined) {
    const { privateState } = hidden(this)
    return privateState.subscribe(fn, id)
  }
  toggle () {
    const { readOnly, privateState } = hidden(this)
    if (readOnly) throw new Error('Cannot set value on a read-only state.')
    privateState.set(currentValue => !currentValue)
  }
  undo () {
    const { readOnly, privateState } = hidden(this)
    if (readOnly) throw new Error('Cannot set value on a read-only state.')
    return privateState.undo()
  }
  unsubscribe (...ids) {
    const { privateState } = hidden(this)
    privateState.addToUnsubscribeRequests(...ids)
  }
  use (selector = simpleSelector, equalityFn = strictEqual) {
    const { privateState } = hidden(this)
    return usePrivateState(privateState, selector, equalityFn)
  }
  static join (...vStates) {
    const subscribes = vStates.map(vState => fn => vState.subscribe(fn))
    const newPublicInterface = new this()
    const newPrivateState = hidden(newPublicInterface).privateState
    hidden(newPublicInterface).readOnly = true
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
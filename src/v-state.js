import React, { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react'
import { v1 as generateId } from 'uuid'

const useLayoutEffectNoWarning = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const useUpdatingRef = value => {
  const ref = useRef()
  ref.current = value
  return ref
}

class VState {
  constructor (initialValue = undefined, reducer = state => state) {
    this._initialValue = initialValue
    this._value = Object.freeze(initialValue)
    this._reducer = reducer
    this._subscriptions = []
    this._broadcast = this._broadcast.bind(this)
    this._defaultSelector = state => state
    this._defaultEqualityFn = (a, b) => a === b
    this._set = this._set.bind(this)

    this.get = this.get.bind(this)
    this.set = this.set.bind(this)
    this.increment = this.increment.bind(this)
    this.reset = this.reset.bind(this)
    this.toggle = this.toggle.bind(this)
    this.subscribe = this.subscribe.bind(this)
    this.unsubscribe = this.unsubscribe.bind(this)
    this.use = this.use.bind(this)
    this.dispatch = this.dispatch.bind(this)
    this.getDerivedState = this.getDerivedState.bind(this)
    this.inject = this.inject.bind(this)
  }

  _broadcast () {
    const currentValue = this.get()
    const unsubscribeRequests = []
    this._subscriptions.forEach(({ id, fn }) => fn(currentValue, () => unsubscribeRequests.push(id)))
    this.unsubscribe(...unsubscribeRequests)
  }

  _set (_newValue) {
    const currentValue = this.get()
    const newValue = typeof _newValue === 'function' ? _newValue(currentValue) : _newValue
    if (newValue !== currentValue) {
      this._value = newValue
      Object.freeze(this._value)
      this._broadcast()
    }
  }

  getDerivedState (selector = this._defaultSelector, equalityFn = this._defaultEqualityFn) {
    const derivedState = new VState()
    this.subscribe((value, unsubscribe) => {
      if (!derivedState) unsubscribe()
      const currentSelectedValue = derivedState.get()
      const selectedValue = selector(value)
      if (!equalityFn(selectedValue, currentSelectedValue)) derivedState._set(selectedValue)
    })
    derivedState.set = () => { throw new Error('Cannot call "set" on derived state') }
    derivedState.reset = () => { throw new Error('Cannot call "reset" on derived state') }
    derivedState.toggle = () => { throw new Error('Cannot call "toggle" on derived state') }
    derivedState.dispatch = () => { throw new Error('Cannot call "dispatch" on derived state') }
    return derivedState
  }

  get () {
    return this._value
  }

  dispatch (...action) {
    const currentValue = this.get()
    const newValue = this._reducer(currentValue, ...action)
    this.set(newValue)
  }

  set (value) {
    this._set(value)
  }

  increment (amount = 1) {
    this.set(value => value + amount)
  }

  reset () {
    this.set(this._initialValue)
  }

  toggle () {
    this.set(currentValue => !currentValue)
  }

  subscribe (fn, id = generateId()) {
    this._subscriptions.push({ id, fn })
    const currentValue = this.get()
    fn(currentValue, () => this.unsubscribe(id))
    return () => this.unsubscribe(id)
  }

  unsubscribe (...ids) {
    this._subscriptions = this._subscriptions.filter(({ id }) => !ids.includes(id))
  }

  inject (selector, Component, equalityFn = this._defaultEqualityFn) {
    const useNewProps = typeof selector === 'function'
      ? () => this.use(selector, equalityFn)
      : () => ({ [selector]: this.use(undefined, equalityFn) })
    return props => {
      const newProps = useNewProps()
      const combinedProps = { ...props, ...newProps }
      return <Component {...combinedProps} />
    }
  }

  use (selector = this._defaultSelector, equalityFn = this._defaultEqualityFn) {
    const initialValue = this.get()
    const [value, setValue] = useState(initialValue)
    const selectedValue = useMemo(() => selector(value), [selector, value])

    const selectorRef = useUpdatingRef(selector)
    const equalityFnRef = useUpdatingRef(equalityFn)

    useLayoutEffectNoWarning(() => {
      let valueAtLastSet = value
      let selectorAtLastSet = selector
      let selectedValueAtLastSet = selectedValue

      return this.subscribe(newValue => {
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
}

export default VState

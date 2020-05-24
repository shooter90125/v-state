import React, { useState, useEffect } from 'react'

class VStateBasic {
  constructor (initialValue) {
    this._value = initialValue
    this._subscriptions = []

    this.get = this.get.bind(this)
    this.set = this.set.bind(this)
    this.subscribe = this.subscribe.bind(this)
    this.use = this.use.bind(this)
  }

  get () {
    return this._value
  }

  set (newValue) {
    const currentValue = this.get()
    if (newValue !== currentValue) {
      this._value = newValue
      this._subscriptions.forEach(fn => fn(newValue))
    }
  }

  subscribe (fn) {
    this._subscriptions.push(fn)
    const currentValue = this.get()
    fn(currentValue)
    return () => { // Returns unsubscribe function
      this._subscriptions = this._subscriptions.filter(subscription => subscription !== fn)
    }
  }

  use () {
    const initialValue = this.get()
    const [state, setState] = useState(initialValue)
    useEffect(() => this.subscribe(setState), [])
    return state
  }

  inject (propName, Component) {
    return props => {
      const state = this.use()
      const newProps = { ...props, [propName]: state }
      return <Component {...newProps} />
    }
  }
}

export default VStateBasic

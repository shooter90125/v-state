import { v1 as generateId } from 'uuid'
import { isFunction } from './utils'

class PrivateState {
  constructor (initialValue = undefined, maxHistory = 10) {
    this.history = [initialValue]
    this.index = 0
    this.initialValue = initialValue
    this.maxHistory = maxHistory
    this.readOnly = false
    this.subscriptions = []
    this.unsubscribeRequests = []
  }
  addToUnsubscribeRequests (...ids) {
    this.unsubscribeRequests.push(...ids)
  }
  broadcast () {
    const currentValue = this.get()
    this.subscriptions.forEach(({ id, fn }) => fn(currentValue, () => this.unsubscribeRequests.push(id))) 
  }
  canRedo () {
    return this.index < this.history.length - 1
  }
  canUndo () {
    return this.index > 0
  }
  flushUnsubscribeRequests () {
    const newSubscriptions = this.subscriptions.filter(({ id }) => !this.unsubscribeRequests.includes(id))
    this.subscriptions = newSubscriptions
    this.unsubscribeRequests = []
  }
  forceSet (_newValue) {
    const currentValue = this.get()
    const newValue = isFunction(_newValue) ? _newValue(currentValue) : _newValue
    if (newValue !== currentValue) {
      if (this.canRedo()) this.history = this.history.slice(0, this.index + 1)
      this.history.push(newValue)
      if (this.history.length > this.maxHistory) this.history = this.history.slice(1)
      else this.index++
      this.flushUnsubscribeRequests()
      this.broadcast()
    }
  }
  get () {
    return this.history[this.index]
  }
  getInitialValue () {
    return this.initialValue
  }
  redo () {
    if (this.readOnly) throw new Error('Cannot set value on a read-only state.')
    if (this.canRedo()) {
      this.index++
      return true
    } else return false
  }
  set (value) {
    if (this.readOnly) throw new Error('Cannot set value on a read-only state.')
    this.forceSet(value)
  }
  setReadOnly (readOnly) {
    this.readOnly = readOnly
  }
  subscribe (fn, id = generateId()) {
    this.subscriptions.push({ id, fn })
    fn(this.get(), () => this.unsubscribeRequests.push(id))
    return () => this.unsubscribeRequests.push(id)
  }
  undo () {
    if (this.readOnly) throw new Error('Cannot set value on a read-only state.')
    if (this.canUndo()) {
      this.index--
      return true
    } else return false
  }
}

export default PrivateState
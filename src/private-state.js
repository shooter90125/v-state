
import { v1 as generateId } from 'uuid'

const createPrivateState = (initialValue = undefined, readOnly, maxHistory = 10) => {
  let subscriptions = []
  let unsubscribeRequests = []
  let history = [initialValue]
  let index = 0
  return {
    addToUnsubscribeRequests: (...ids) => {
      unsubscribeRequests.push(...ids)
    },
    broadcast: function () {
      const currentValue = this.get()
      subscriptions.forEach(({ id, fn }) => fn(currentValue, () => unsubscribeRequests.push(id))) 
    },
    canRedo: () => index < history.length - 1,
    canUndo: () => index > 0,
    flushUnsubscribeRequests: () => {
      const newSubscriptions = subscriptions.filter(({ id }) => !unsubscribeRequests.includes(id))
      subscriptions = newSubscriptions
      unsubscribeRequests = []
    },
    forceSet: function (_newValue) {
      const currentValue = this.get()
      const newValue = isFunction(_newValue) ? _newValue(currentValue) : _newValue
      if (newValue !== currentValue) {
        if (this.canRedo()) history = history.slice(0, index + 1)
        history.push(newValue)
        if (history.length > maxHistory) history = history.slice(1)
        else index++
        this.flushUnsubscribeRequests()
        this.broadcast()
      }
    },
    get: () => history[index],
    getInitialValue: () => initialValue,
    redo: function () {
      if (readOnly) throw new Error('Cannot set value on a read-only state.')
      if (this.canRedo()) {
        index++
        return true
      } else return false
    },
    set: function (value) {
      if (readOnly) throw new Error('Cannot set value on a read-only state.')
      this.forceSet(value)
    },
    subscribe: function (fn, id = generateId()) {
      subscriptions.push({ id, fn })
      fn(this.get(), () => unsubscribeRequests.push(id))
      return () => unsubscribeRequests.push(id)
    },
    undo: function () {
      if (readOnly) throw new Error('Cannot set value on a read-only state.')
      if (this.canUndo()) {
        index--
        return true
      } else return false
    }
  }
}

const isFunction = value => typeof value === 'function'

export default createPrivateState
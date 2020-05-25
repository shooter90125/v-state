import React from 'react'
import VState from './v-state'
import shallowEqual from './shallow-equal'
import sleep from 'sleep-promise'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'
import { renderHook, act } from '@testing-library/react-hooks'

// Unit test of VState
test('Create instance of VState', () => {
  const testState = new VState()
  expect(testState).toBeInstanceOf(VState)
})

describe('VState getDerivedState', () => {
  const parentState = new VState({ name: 'Aaron', age: 32, books: ['Harry Potter', 'The Hobbit'] })
  it('Creates derived state', () => {
    const booksState = parentState.getDerivedState(person => person.books)
    expect(booksState).toBeInstanceOf(VState)
  })
})

describe('VState use hook', () => {
  const numberState = new VState(0)
  const objectState = new VState({ key: 'value' })
  const objectShallowState = new VState({ a: 'b', c: 'd', e: 'f' })

  let renderCount = 0

  const Component = () => {
    renderCount++
    const number = numberState.use()
    const objectValue = objectState.use(({ key }) => key)
    const objectShallow = objectShallowState.use(({ a, c }) => ({ a, c }), shallowEqual)
    return (
      <div>
        <div>numberState: {number}</div>
        <div>objectValue: {objectValue}</div>
        <div>cVal: {objectShallow.c}</div>
      </div>
    )
  }

  let unmountComponent

  beforeEach(() => {
    const { unmount } = render(<Component />)
    unmountComponent = unmount
  })

  afterEach(() => {
    unmountComponent()
    numberState.reset()
    objectState.reset()
    objectShallowState.reset()
    renderCount = 0
  })

  const getRenderedNumber = () => screen.getByText(/numberState/i)
  const getRenderedObjectValue = () => screen.getByText(/objectValue/i)
  const getRenderedObjectShallowValue = () => screen.getByText(/cVal/i)

  it('Renders current value on mount', () => {
    expect(getRenderedNumber()).toHaveTextContent('numberState: 0')
  })

  it('Renders new value when state updated', () => {
    numberState.increment()
    expect(getRenderedNumber()).toHaveTextContent('numberState: 1')
  })

  it('Renders current selected value on mount', () => {
    expect(getRenderedObjectValue()).toHaveTextContent('objectValue: value')
  })

  it('Renders new selected value when state updated', () => {
    objectState.set({ key: 'different value' })
    expect(getRenderedObjectValue()).toHaveTextContent('objectValue: different value')
  })

  it('Does not re-render when state change has no effect selected value', () => {
    const renderCountBeforeSet = renderCount
    objectState.set(state => ({ ...state, otherKey: 'other value' }))
    expect(renderCount - renderCountBeforeSet).toBe(0)
  })

  it('Renders current selected value on mount with equalityFn', () => {
    expect(getRenderedObjectShallowValue()).toHaveTextContent('cVal: d')
  })

  it('Does not re-render when shallowEqual used as equality function if selector returns object with same structure', () => {
    const renderCountBeforeSet = renderCount
    objectShallowState.set(state => ({ ...state, e: 'g' }))
    expect(renderCount - renderCountBeforeSet).toBe(0)
  })

  it('Renders new selected value when shallowEqual used as equality function if selector returns object with different structure', () => {
    objectShallowState.set(state => ({ ...state, c: 'z' }))
    expect(getRenderedObjectShallowValue()).toHaveTextContent('cVal: z')
  })
})

// Integration tests of VState
describe('Interact with VState', () => {
  test(
    'Init undefined, get undefined',
    () => {
      const testState = new VState()
      const testValue = testState.get()
      expect(testValue).toBe(undefined)
    }
  )

  test(
    'Init value, get value',
    () => {
      const testState = new VState('test value')
      const testValue = testState.get()
      expect(testValue).toBe('test value')
    }
  )

  test(
    'Init function, get function',
    () => {
      const testState = new VState((a, b) => a + b)
      const fn = testState.get()
      const testValue = fn(1, 7)
      expect(testValue).toEqual(8)
    }
  )

  test(
    'Set value',
    () => {
      const testState = new VState('test value')
      testState.set('another test value')
      const testValue = testState.get()
      expect(testValue).toBe('another test value')
    }
  )

  test(
    'Set value functionally',
    () => {
      const testState = new VState({ key1: 'value1' })
      testState.set(currentState => ({ ...currentState, key2: 'value2' }))
      const testValue = testState.get()
      expect(testValue).toEqual({ key1: 'value1', key2: 'value2' })
    }
  )

  test(
    'Set undefined',
    () => {
      const testState = new VState('test value')
      testState.set()
      const testValue = testState.get()
      expect(testValue).toEqual(undefined)
    }
  )

  test(
    'Set undefined functionally',
    () => {
      const testState = new VState('test value')
      testState.set(() => {})
      const testValue = testState.get()
      expect(testValue).toEqual(undefined)
    }
  )

  test(
    'Set function functionally',
    () => {
      const testState = new VState()
      testState.set(() => (a, b) => a + b)
      const fn = testState.get()
      const testValue = fn(1, 7)
      expect(testValue).toEqual(8)
    }
  )

  test(
    'Toggle boolean',
    () => {
      const testState = new VState(true)
      testState.toggle()
      const newValue = testState.get()
      expect(newValue).toBe(false)
    }
  )

  test(
    'Toggle value',
    () => {
      const testState = new VState('test')
      testState.toggle()
      const newValue = testState.get()
      expect(newValue).toBe(false)
    }
  )

  test(
    'Toggle undefined',
    () => {
      const testState = new VState()
      testState.toggle()
      const newValue = testState.get()
      expect(newValue).toBe(true)
    }
  )

  test(
    'Reset',
    () => {
      const testState = new VState('initVal')
      testState.set('newVal')
      testState.reset()
      const value = testState.get()
      expect(value).toBe('initVal')
    }
  )

  test(
    'Increment 1',
    () => {
      const testState = new VState(10)
      testState.increment()
      const val = testState.get()
      expect(val).toBe(11)
    }
  )

  test(
    'Increment n',
    () => {
      const testState = new VState(10)
      testState.increment(9)
      const val = testState.get()
      expect(val).toBe(19)
    }
  )

  test(
    'Dispatch',
    () => {
      const reducer = (state, type, param1, param2) => {
        if (type === 'multiplyThenSubtract') return state * param1 - param2
        else return state
      }
      const testState = new VState(20, reducer)
      testState.dispatch('multiplyThenSubtract', 2, 7)
      const value = testState.get()
      expect(value).toBe(33)
    }
  )

  test(
    "Can't mutate initial state",
    () => {
      const testState = new VState({ test: 'value' })
      const value = testState.get()
      expect(() => { value.test = 'differentValue' }).toThrow()
    }
  )

  test(
    "Can't mutate after setting state",
    () => {
      const testState = new VState({ test: 'value' })
      testState.set({ test: 'value2' })
      const value = testState.get()
      expect(() => { value.test = 'differentValue' }).toThrow()
    }
  )

  test(
    "Can't mutate after resetting state",
    () => {
      const testState = new VState({ test: 'value' })
      testState.set({ test: 'value2' })
      testState.reset()
      const value = testState.get()
      expect(() => { value.test = 'differentValue' }).toThrow()
    }
  )

  test(
    'Subscription',
    () => {
      const testState = new VState(110)
      let initialVal
      testState.subscribe(val => { initialVal = val })
      expect(initialVal).toBe(110)
      testState.set(20)
      expect(initialVal).toBe(20)
    }
  )

  test(
    'Unsubscribe',
    () => {
      const testState = new VState(3)
      let initialVal
      const unsubscribe = testState.subscribe(val => { initialVal = val })
      expect(initialVal).toBe(3)
      unsubscribe()
      testState.set(100)
      expect(initialVal).toBe(3)
    }
  )

  test(
    'Unsubscribe by ID',
    () => {
      const testState = new VState(3)
      let initialVal
      testState.subscribe(val => { initialVal = val }, 'testid')
      expect(initialVal).toBe(3)
      testState.unsubscribe('testid2')
      testState.set(100)
      expect(initialVal).toBe(100)
      testState.unsubscribe('testid')
      testState.set('test me')
      expect(initialVal).toBe(100)
    }
  )

  test(
    'Inject HOC',
    () => {
      const counter = new VState(0)
      const Component = ({ count }) => <div>Count: {count}</div>
      const ConnectedComponent = counter.inject('count', Component)
      render(<ConnectedComponent />)
      const countText = screen.getByText(/count/i)
      expect(countText).toHaveTextContent('Count: 0')
      counter.increment()
      const counterText2 = screen.getByText(/count/i)
      expect(counterText2).toHaveTextContent('Count: 1')
    }
  )
})

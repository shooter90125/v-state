import VState from './v-state'

// Unit test of VState
test('Create instance of VState', () => {
  const testState = new VState()
  expect(testState).toBeInstanceOf(VState)
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
})

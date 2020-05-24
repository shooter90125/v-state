# VState
Framework agnostic state management library—simple and flexible.

## Motivation

Make a state management library that is as simple as possible, yet flexible enough to suit many situations and coding styles. It lives outside of any framework, yet it seemlessly integrates with React via a built-in hook or higher-order component. You can create as many instances of state as you wish. State can be a simple value to serve a simple need, or a complex object. State can be set using a setter function, or using the reducer/dispatch pattern familiar to Redux users. Read-only states can be derived from a parent state, and will only notify/re-render when the derived value changes.

## Install

This is a work in progress, currently not deployed to NPM and currently not fully tested. If you wish to try it out, clone or copy the source code.

## Basic usage

```javascript
import VState from 'src'

const nameState = new VState('Scott')

nameState.get() // 'Scott'

nameState.set('Daniel')

nameState.get() // 'Daniel'

const unsubscribe = nameState.subscribe(name => console.log(name))

// log output: 'Daniel'

nameState.set(name => `${name} Hunk`)

// log output: 'Daniel Hunk'

nameState.set('Tejas')

// log output: 'Tejas'

unsubscribe()

nameState.set('Samir')

// No log output

```

## Basic React integration

```javascript
import React from 'react'
import VState from 'src'

const nameState = new VState('Scott')

// VState.use() hook will cause component to rerender when state changes
const ComponentWithHook = () => {
  const name = nameState.use()
  return (
    <div>
      <div>{name}</div>
      <button onClick={() => nameState.set('Tejas')}>Set name to Tejas</button>
    </div>
  )
}

// VState.inject() HOC will provide state via prop named in first argument
const ComponentReceivingProp = ({ name, ...props }) => {
  return (
    <div>
      <div>{name}</div>
      <button onClick={() => nameState.set('Daniel')}>Set name to Daniel</button>
    </div>
  )
}
const ComponentUsingHoc = nameState.inject('name', OtherComponent)
```

## Reducer/dispatch pattern

```javascript
import VState from 'src'

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, name: action.value }
    case 'SET_AGE':
      return { ...state, age: action.value }
    default:
      return state
  }
}

// Optionally provide reducer as second argument
const personState = new VState({ name: 'Scott', age: 30 }, reducer)

personState.get() // { name: 'Scott', age: 30 }

personState.dispatch({ type: 'SET_NAME', value: 'TEJAS' })

personState.get() // { name: 'Tejas', age: 30 }
```

## Get derived state

Get a read-only state derived from a parent state by a selector function. Subscriptions or React components listening to the derived state changes will only update when the selected value changes.

```javascript
import VState from 'src'

const personState = new VState({ name: 'Scott', age: 30 })

const ageState = personState.getDerivedState(person => person.age)

ageState.subscribe(age => console.log(age))

// log output: 30

ageState.set(21)

// log output: 21

personState.set({ name: 'Daniel', age: 21 })

// No log output
```

## Other functionality

This documentation is far from comprehensive. Further methods such as toggle, reset, increment and unsubscribe are available alongside set, get, use, inject, subscribe, dispatch and getDerivedState. More optional parameters are available for many of these methods for added flexibility and rendering optimisation, but are not yet documented here.

## VStateBasic

VStateBasic is a basic version of VState designed with simplicity in mind to help with understanding how you might write your own state management solution. It lacks much of the flexibility of VState proper, but it is worth looking at the source file.

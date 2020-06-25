import { useState, useMemo } from 'react'
import useUnmounted from './use-unmounted'
import simpleSelector from './simple-selector'
import strictEqual from './strict-equal'
import useLayoutEffectNoWarning from './use-layout-effect-no-warning'
import useUpdatingRef from './use-updating-ref'

const usePrivateState = (privateState, selector = simpleSelector, equalityFn = strictEqual) => {
  const unmounted = useUnmounted()
  const initialValue = privateState.get()
  const [value, setValue] = useState(initialValue)
  const selectedValue = useMemo(() => selector(value), [selector, value])
  const selectorRef = useUpdatingRef(selector)
  const equalityFnRef = useUpdatingRef(equalityFn)
  useLayoutEffectNoWarning(() => {
    let valueAtLastSet = value
    let selectorAtLastSet = selector
    let selectedValueAtLastSet = selectedValue
    return privateState.subscribe(newValue => {
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

export default usePrivateState
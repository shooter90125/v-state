import { useRef, useEffect, useCallback } from 'react'

const useUnmounted = () => {
  const unmounted = useRef(false)
  useEffect(() => {
    return () => { unmounted.current = true }
  }, [])
  return useCallback(() => unmounted.current, [])
}

export default useUnmounted
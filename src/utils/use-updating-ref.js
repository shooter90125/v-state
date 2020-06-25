import { useRef } from 'react'

const useUpdatingRef = value => {
  const ref = useRef()
  ref.current = value
  return ref
}

export default useUpdatingRef
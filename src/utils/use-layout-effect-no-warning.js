import { useEffect, useLayoutEffect } from 'react'

const useLayoutEffectNoWarning = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export default useLayoutEffectNoWarning
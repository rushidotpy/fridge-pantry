import { useEffect, useState } from 'react'

export type View = 'have' | 'need' | 'good' | 'dates' | 'settings'
const VIEWS: View[] = ['have', 'need', 'good', 'dates', 'settings']

function parse(): View {
  const v = window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[0] as View
  return VIEWS.includes(v) ? v : 'have'
}

export function useView(): [View, (v: View) => void] {
  const [view, setView] = useState<View>(parse)
  useEffect(() => {
    const on = () => setView(parse())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return [
    view,
    (v) => {
      setView(v)
      window.location.hash = `/${v}`
    },
  ]
}

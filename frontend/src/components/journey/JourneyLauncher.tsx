import { useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { useJourney } from '../../context/JourneyContext'
import { useLang } from '../../context/LangContext'

export default function JourneyLauncher() {
  const { state, dispatch } = useJourney()
  const { t } = useLang()

  // Auto-start only from the demo entry page, or when explicitly requested.
  // Deep links should stay on the requested page instead of being moved by the tour.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('noTour')) return
    const shouldStart =
      params.has('tour') ||
      (!state.hasSeenTour && window.location.pathname === import.meta.env.BASE_URL)

    if (shouldStart && !state.isActive) {
      const timer = setTimeout(() => {
        dispatch({ type: 'START' })
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [dispatch, state.hasSeenTour, state.isActive])

  if (state.isActive) return null

  // Compact re-run button (visible briefly before auto-start, or after user closes the tour)
  return (
    <button
      onClick={() => dispatch({ type: 'START' })}
      title={t('journey.header')}
      className="fixed bottom-6 right-6 flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-2xl shadow-lg text-white font-medium text-xs transition-all hover:scale-105 active:scale-95 select-none opacity-75 hover:opacity-100"
      style={{
        zIndex: 9999,
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      }}
    >
      <RefreshCw className="w-3.5 h-3.5" />
      {t('launcher.rerun')}
    </button>
  )
}

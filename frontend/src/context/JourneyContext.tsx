import { createContext, useContext, useReducer, type ReactNode } from 'react'
import { JOURNEY_STEPS } from '../data/journeySteps'

const TOTAL = JOURNEY_STEPS.length
const TOUR_SEEN_KEY = 'agentic-bi-tour-seen'

interface JourneyState {
  isActive: boolean
  isPlaying: boolean
  currentStep: number
  totalSteps: number
  hasSeenTour: boolean
}

type JourneyAction =
  | { type: 'START' }
  | { type: 'STOP' }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'GOTO'; step: number }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'RESET_TOUR' }

const initialState: JourneyState = {
  isActive: false,
  isPlaying: false,
  currentStep: 0,
  totalSteps: TOTAL,
  hasSeenTour: localStorage.getItem(TOUR_SEEN_KEY) === '1',
}

function reducer(state: JourneyState, action: JourneyAction): JourneyState {
  switch (action.type) {
    case 'START':
      return { ...state, isActive: true, currentStep: 0, isPlaying: false }
    case 'STOP':
      localStorage.setItem(TOUR_SEEN_KEY, '1')
      return { ...state, isActive: false, isPlaying: false, currentStep: 0, hasSeenTour: true }
    case 'NEXT':
      if (state.currentStep >= TOTAL - 1) return state
      return { ...state, currentStep: state.currentStep + 1 }
    case 'PREV':
      if (state.currentStep <= 0) return state
      return { ...state, currentStep: state.currentStep - 1 }
    case 'GOTO':
      return { ...state, currentStep: Math.min(Math.max(0, action.step), TOTAL - 1) }
    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying }
    case 'RESET_TOUR':
      localStorage.removeItem(TOUR_SEEN_KEY)
      return { ...state, hasSeenTour: false }
    default:
      return state
  }
}

interface JourneyContextValue {
  state: JourneyState
  dispatch: React.Dispatch<JourneyAction>
}

const JourneyContext = createContext<JourneyContextValue | null>(null)

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <JourneyContext.Provider value={{ state, dispatch }}>
      {children}
    </JourneyContext.Provider>
  )
}

export function useJourney() {
  const ctx = useContext(JourneyContext)
  if (!ctx) throw new Error('useJourney must be inside JourneyProvider')
  return ctx
}

import type { AnimationType } from '../../data/journeySteps'
import RawDataAnimation from './animations/RawDataAnimation'
import QualityAnimation from './animations/QualityAnimation'
import EtlFlowAnimation from './animations/EtlFlowAnimation'
import NLAnimation from './animations/NLAnimation'
import GuardrailAnimation from './animations/GuardrailAnimation'
import QueryAnimation from './animations/QueryAnimation'
import ChartBuildAnimation from './animations/ChartBuildAnimation'
import InsightAnimation from './animations/InsightAnimation'
import RFMAnimation from './animations/RFMAnimation'
import FunnelAnimation from './animations/FunnelAnimation'
import CohortAnimation from './animations/CohortAnimation'
import HistoryAnimation from './animations/HistoryAnimation'

const MAP: Record<AnimationType, React.ComponentType> = {
  'raw-data':     RawDataAnimation,
  'quality':      QualityAnimation,
  'etl-flow':     EtlFlowAnimation,
  'nl-query':     NLAnimation,
  'guardrail':    GuardrailAnimation,
  'query-exec':   QueryAnimation,
  'chart-build':  ChartBuildAnimation,
  'insight':      InsightAnimation,
  'rfm-chart':    RFMAnimation,
  'segment-pie':  InsightAnimation,
  'ltv-bars':     ChartBuildAnimation,
  'bcg-matrix':   ChartBuildAnimation,
  'discount':     ChartBuildAnimation,
  'funnel-vis':   FunnelAnimation,
  'cohort-heat':  CohortAnimation,
  'history-list': HistoryAnimation,
  'safety-trend': ChartBuildAnimation,
}

interface Props {
  type: AnimationType
  stepKey: number
}

export default function StepAnimation({ type, stepKey }: Props) {
  const Component = MAP[type]
  return (
    <div className="h-44">
      <Component key={stepKey} />
    </div>
  )
}

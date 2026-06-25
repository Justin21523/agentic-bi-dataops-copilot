import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClusterScatterPlot } from '../components/analysis/ClusterScatterPlot';
import { ExecutiveSummary } from '../components/analysis/ExecutiveSummary';
import { FeatureImportanceChart } from '../components/analysis/FeatureImportanceChart';
import { FlowTreeViewer } from '../components/analysis/FlowTreeViewer';
import { LeakageAuditPanel } from '../components/analysis/LeakageAuditPanel';
import { ModelExplanationPanel } from '../components/analysis/ModelExplanationPanel';
import { ModelLeaderboard } from '../components/analysis/ModelLeaderboard';
import { ModelMetricsChart } from '../components/analysis/ModelMetricsChart';
import { PerClassMetricsChart } from '../components/analysis/PerClassMetricsChart';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { ExplanationPanel } from '../components/common/ExplanationPanel';
import { useClassificationAnalysis, useClusteringAnalysis, useTfidfSummary, useTopicModelSummary } from '../hooks/useAnalysis';

export function MachineLearningLabPage() {
  const { t } = useTranslation();
  const classification = useClassificationAnalysis();
  const clustering = useClusteringAnalysis();
  const tfidf = useTfidfSummary();
  const topics = useTopicModelSummary();
  const [selectedModelId, setSelectedModelId] = useState<string>();
  const selectedModel = useMemo(
    () => classification.data?.models.find((model) => model.model_id === selectedModelId) ?? classification.data?.models[0],
    [classification.data?.models, selectedModelId]
  );
  const [selectedForestTree, setSelectedForestTree] = useState(0);
  const forestTree = classification.data?.random_forest?.sample_trees[selectedForestTree];
  const selectedCluster = clustering.data?.methods.find((method) => method.method === 'kmeans') ?? clustering.data?.methods[0];
  if (classification.isLoading || clustering.isLoading || tfidf.isLoading || topics.isLoading) return <LoadingState />;
  if (classification.isError || !classification.data) return <ErrorState />;
  return (
    <section className="page">
      <ExecutiveSummary
        title={t('analysis.mlLabTitle')}
        body={t('analysis.mlLabSummary')}
        actions={[classification.data.feature_space, classification.data.target, t('analysis.scikitLearnRuntime')]}
      />
      <div data-journey-anchor="classification">
        <ModelMetricsChart
          models={classification.data.models}
          baselineAccuracy={classification.data.baseline?.accuracy}
          selectedModelId={selectedModel?.model_id}
          onSelect={(model) => setSelectedModelId(model.model_id)}
        />
      </div>
      <ExplanationPanel
        title="Model comparison interpretation"
        what="The chart compares classifiers using accuracy and macro-F1 on held-out data."
        how="Prefer models that keep both bars high; macro-F1 matters when genres are uneven."
        why="This prevents choosing a model that only performs well on common classes."
        caveat="The leakage audit below is required context: high scores are only meaningful when vectorization is fit on the train split."
      />
      <section className="content-panel model-tradeoff-panel" data-guide-anchor="model-tradeoff">
        <h2>Model tradeoff map</h2>
        <p>Accuracy shows overall correctness; Macro-F1 shows whether each genre is treated fairly. The best interview story is a model that stays high on both axes and still passes leakage audit.</p>
        <div className="tradeoff-map" role="img" aria-label="Accuracy and Macro-F1 tradeoff">
          {classification.data.models.map((model) => (
            <span
              className={model.model_id === selectedModel?.model_id ? 'active' : ''}
              key={model.model_id}
              style={{ left: `${Math.max(8, Math.min(92, model.accuracy * 100))}%`, bottom: `${Math.max(8, Math.min(88, model.macro_f1 * 100))}%` }}
              title={`${model.label}: accuracy ${model.accuracy}, macro-F1 ${model.macro_f1}`}
            >
              {model.label.split(' ')[0]}
            </span>
          ))}
          <i className="tradeoff-baseline" style={{ left: `${Math.max(8, Math.min(92, (classification.data.baseline?.accuracy ?? 0) * 100))}%` }} />
        </div>
      </section>
      <div className="two-column">
        <ModelLeaderboard models={classification.data.models} selectedModelId={selectedModel?.model_id} onSelect={(model) => setSelectedModelId(model.model_id)} />
        <section className="content-panel">
          <h2>{t('analysis.methodFamilies')}</h2>
          <div className="state-chip-row">
            {['Decision Tree', 'Random Forest', 'SVM', 'Gradient Boosting', 'AdaBoost', 'Voting Ensemble', 'Topic Modeling', 'Clustering'].map((item) => <span className="badge" key={item}>{item}</span>)}
          </div>
          <p>{classification.data.deep_learning.note}</p>
        </section>
      </div>
      <div className="two-column">
        <ModelExplanationPanel model={selectedModel} />
        <PerClassMetricsChart metrics={selectedModel?.per_class_metrics} title="Selected model per-class metrics" />
      </div>
      <LeakageAuditPanel audit={classification.data.leakage_audit} />
      <div data-journey-anchor="tree">
        <FlowTreeViewer
          title={`Decision tree structure (${classification.data.decision_tree.node_count} nodes, depth ${classification.data.decision_tree.max_depth})`}
          nodes={classification.data.decision_tree.nodes}
          edges={classification.data.decision_tree.edges}
        />
      </div>
      <ExplanationPanel
        title="Decision tree interpretation"
        what="The tree shows top-to-bottom feature splits that route songs toward a predicted genre."
        how="Read from the root downward. Blue nodes are decisions, green nodes are leaves, and mini bars show class mix."
        why="A tree gives a concrete explanation of which terms separate classes before comparing ensemble models."
        caveat="A single tree is interpretable but less stable than ensembles; use random forest importance as supporting evidence."
      />
      <FeatureImportanceChart title="Random forest feature importance" features={classification.data.random_forest?.feature_importances} />
      <div className="filter-panel compact-filter">
        <label>
          <span>Random forest estimator</span>
          <select value={selectedForestTree} onChange={(event) => setSelectedForestTree(Number(event.target.value))}>
            {classification.data.random_forest?.sample_trees.map((tree, index) => (
              <option key={tree.tree_index} value={index}>Tree {tree.tree_index + 1}</option>
            ))}
          </select>
        </label>
      </div>
      {forestTree && (
        <FlowTreeViewer
          title={`Random forest estimator ${forestTree.tree_index + 1}: ${forestTree.node_count} nodes, depth ${forestTree.max_depth}`}
          nodes={forestTree.nodes}
          edges={forestTree.edges}
        />
      )}
      <div className="two-column">
        {selectedCluster && <ClusterScatterPlot points={selectedCluster.points} profiles={selectedCluster.cluster_profiles} silhouette={selectedCluster.silhouette} note={clustering.data?.projection_note} />}
        <section className="content-panel" data-journey-anchor="tfidf">
          <h2>{t('analysis.clusteringSummary')}</h2>
          <table>
            <thead><tr><th>{t('common.method')}</th><th>{t('common.cluster')}</th><th>Silhouette</th></tr></thead>
            <tbody>
              {clustering.data?.methods.map((method) => (
                <tr key={method.method}><td>{method.method}</td><td>{method.cluster_count}</td><td>{method.silhouette ?? 'n/a'}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      <div className="two-column">
        <section className="content-panel">
          <h2>{t('analysis.tfidfWeighting')}</h2>
          <div className="list-panel">
            {tfidf.data?.terms.slice(0, 12).map((term) => (
              <div key={term.term}>
                <strong>{term.term}</strong>
                <div className="progress-bar"><span style={{ width: `${Math.min(100, term.score * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
        <section className="content-panel">
          <h2>{t('analysis.topicModeling')}</h2>
          <div className="list-panel">
            {topics.data?.topics.map((topic) => (
              <article className="list-row" key={topic.topic_id}>
                <strong>{topic.topic_label}</strong>
                <span>{topic.top_terms.join(', ')}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

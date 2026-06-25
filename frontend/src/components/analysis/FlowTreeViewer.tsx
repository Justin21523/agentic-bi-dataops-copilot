import { Background, Controls, ReactFlow, type Edge, type Node } from '@xyflow/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DecisionTreeNode } from '../../api/types';

type TreeEdge = { id: string; source: string; target: string; label?: string };

export function FlowTreeViewer({ title, nodes = [], edges = [] }: { title: string; nodes?: DecisionTreeNode[]; edges?: TreeEdge[] }) {
  const { t } = useTranslation();
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? nodes[0];
  const selectedChildren = edges
    .filter((edge) => edge.source === selectedNode?.id)
    .map((edge) => ({ edge, node: nodes.find((item) => item.id === edge.target) }))
    .filter((item) => item.node);
  const incoming = edges.find((edge) => edge.target === selectedNode?.id);
  const flowNodes = useMemo<Node[]>(() => {
    const byDepth = new Map<number, DecisionTreeNode[]>();
    nodes.forEach((node) => byDepth.set(node.depth, [...(byDepth.get(node.depth) ?? []), node]));
    return nodes.map((node) => {
      const level = byDepth.get(node.depth) ?? [];
      const levelIndex = level.findIndex((item) => item.id === node.id);
      const offset = ((level.length - 1) * 250) / 2;
      const total = Math.max(1, (node.class_counts ?? []).reduce((sum, value) => sum + value, 0));
      return {
        id: node.id,
        position: { x: levelIndex * 250 - offset, y: node.depth * 160 },
        data: {
          label: (
            <div className="tree-flow-label">
              <strong>{node.is_leaf ? `${t('analysis.leafNode')}: ${node.prediction}` : `${node.feature} <= ${node.threshold}`}</strong>
              <span>{t('analysis.samples')}: {node.samples}</span>
              <span>{t('analysis.prediction')}: {node.prediction}</span>
              <div className="tree-class-bars" aria-label="Class distribution">
                {(node.class_counts ?? []).slice(0, 6).map((value, index) => <i key={`${node.id}-${index}`} style={{ width: `${Math.max(4, (value / total) * 100)}%` }} />)}
              </div>
            </div>
          )
        },
        style: {
          background: `hsl(202 78% ${Math.min(96, 90 + node.depth * 1.8)}%)`,
          borderColor: node.is_leaf ? '#55B748' : '#1696D2'
        },
        className: `flow-node tree-depth-${Math.min(8, node.depth)} ${node.is_leaf ? 'leaf' : ''}`
      };
    });
  }, [nodes, t]);
  const flowEdges = useMemo<Edge[]>(
    () => edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, label: edge.label, animated: edge.source === selectedNode?.id || edge.target === selectedNode?.id, type: 'smoothstep', style: { stroke: edge.source === selectedNode?.id || edge.target === selectedNode?.id ? '#EC008B' : '#1696D2', strokeWidth: edge.source === selectedNode?.id || edge.target === selectedNode?.id ? 3 : 1.5 } })),
    [edges, selectedNode?.id]
  );
  return (
    <section className="chart-panel">
      <h2>{title}</h2>
      <div className="tree-explain-layout">
        <div className="flow-canvas" aria-label={title}>
          <ReactFlow nodes={flowNodes} edges={flowEdges} fitView minZoom={0.15} onNodeClick={(_, node) => setSelectedNodeId(node.id)}>
            <Background />
            <Controls />
          </ReactFlow>
        </div>
        {selectedNode && (
          <aside className="tree-node-explain">
            <span className="badge">{selectedNode.is_leaf ? 'Leaf' : 'Split'} · depth {selectedNode.depth}</span>
            <h3>{selectedNode.is_leaf ? `Predict ${selectedNode.prediction}` : `${selectedNode.feature} <= ${selectedNode.threshold}`}</h3>
            <p>{incoming ? `Arrived through branch "${incoming.label}" from the parent node.` : 'Root node: this is where every example starts.'}</p>
            <div className="audit-grid">
              <article className="audit-item"><span>Samples</span><strong>{selectedNode.samples}</strong></article>
              <article className="audit-item"><span>Dataset share</span><strong>{Math.round((selectedNode.sample_ratio ?? 0) * 100)}%</strong></article>
              <article className="audit-item"><span>Impurity</span><strong>{selectedNode.impurity ?? 'n/a'}</strong></article>
              <article className="audit-item"><span>Majority count</span><strong>{selectedNode.majority_count ?? 'n/a'}</strong></article>
            </div>
            <div className="tree-class-list">
              {(selectedNode.class_counts ?? []).map((count, index) => {
                const total = Math.max(1, (selectedNode.class_counts ?? []).reduce((sum, value) => sum + value, 0));
                return (
                  <div key={`${selectedNode.id}-class-${index}`}>
                    <strong>{selectedNode.class_labels?.[index] ?? `Class ${index}`}</strong>
                    <div className="progress-bar"><span style={{ width: `${Math.max(4, (count / total) * 100)}%` }} /></div>
                  </div>
                );
              })}
            </div>
            {selectedChildren.length > 0 && (
              <div className="list-panel">
                <strong>Next split</strong>
                {selectedChildren.map(({ edge, node }) => node && (
                  <article className="list-row compact-row" key={edge.id}>
                    <strong>{edge.label} → {node.is_leaf ? `Predict ${node.prediction}` : `${node.feature} <= ${node.threshold}`}</strong>
                    <span>{node.samples} samples</span>
                  </article>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}

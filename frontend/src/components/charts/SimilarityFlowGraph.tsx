import { Background, Controls, ReactFlow, type Edge, type Node } from '@xyflow/react';
import { useMemo } from 'react';
import type { SimilarityGraph } from '../../api/types';

type Props = {
  graph?: SimilarityGraph;
  onEdgeSelect?: (edgeId: string) => void;
};

export function SimilarityFlowGraph({ graph, onEdgeSelect }: Props) {
  const nodes = useMemo<Node[]>(() => {
    const items = graph?.nodes ?? [];
    const targets = items.filter((node) => node.role === 'target');
    const targetIndex = new Map(targets.map((node, index) => [node.id, index]));
    const targetY = (targetId?: string) => 54 + (targetIndex.get(targetId ?? '') ?? 0) * 102;
    const sourceId = items.find((node) => node.role === 'source')?.id ?? '';
    return items.map((node) => {
      let x = 30;
      let y = 170;
      if (node.role === 'target') {
        x = 620;
        y = targetY(node.id);
      } else if (node.role === 'shared_terms' || node.role === 'shared_topics') {
        const targetId = node.id.replace(`${sourceId}-`, '').replace('-terms', '').replace('-topics', '');
        x = node.role === 'shared_terms' ? 260 : 420;
        y = targetY(targetId) + (node.role === 'shared_terms' ? -18 : 18);
      }
      return {
        id: node.id,
        position: { x, y },
        data: { label: node.role === 'source' ? `Seed\n${node.label}` : `${node.label}${node.genre ? `\n${node.genre}` : ''}` },
        className: `flow-node ${node.role}`
      };
    });
  }, [graph?.nodes]);

  const edges = useMemo<Edge[]>(() => (graph?.edges ?? [])
    .filter((edge) => !edge.hidden)
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label?.startsWith('shared') ? undefined : edge.label,
      type: 'smoothstep',
      style: {
        strokeWidth: Math.max(1.5, edge.weight * 7),
        stroke: edge.genre_match === false ? '#EC008B' : '#1696D2'
      },
      animated: edge.genre_match === false
    })), [graph?.edges]);

  return (
    <section className="chart-panel">
      <h2>Similarity network</h2>
      <div className="flow-canvas similarity-flow">
        <ReactFlow nodes={nodes} edges={edges} fitView minZoom={0.2} onEdgeClick={(_, edge) => onEdgeSelect?.(edge.id)}>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </section>
  );
}

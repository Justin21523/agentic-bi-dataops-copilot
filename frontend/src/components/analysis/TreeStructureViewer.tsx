import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DecisionTreeNode } from '../../api/types';

export function TreeStructureViewer({ nodes }: { nodes: DecisionTreeNode[] }) {
  const { t } = useTranslation();
  const levels = useMemo(() => {
    const byLevel = new Map<number, DecisionTreeNode[]>();
    nodes.forEach((node) => {
      const level = node.depth;
      const current = byLevel.get(level) ?? [];
      current.push(node);
      byLevel.set(level, current);
    });
    return Array.from(byLevel.entries()).sort(([a], [b]) => a - b).slice(0, 5);
  }, [nodes]);
  return (
    <section className="chart-panel tree-viewer">
      <h2>{t('analysis.decisionTreeStructure')}</h2>
      <div className="tree-canvas">
        {levels.map(([level, levelNodes]) => (
          <div className="tree-level" key={level}>
            {levelNodes.map((node) => (
              <article className={`tree-node ${node.is_leaf ? 'leaf' : ''}`} key={node.id}>
                <strong>{node.is_leaf ? t('analysis.leafNode') : `${node.feature} <= ${node.threshold}`}</strong>
                <span>{t('analysis.prediction')}: {node.prediction}</span>
                <span>{t('analysis.samples')}: {node.samples}</span>
              </article>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

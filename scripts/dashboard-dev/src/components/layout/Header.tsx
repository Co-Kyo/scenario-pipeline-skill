import React, { useMemo } from 'react';
import type { PipelineData } from '../../types/pipeline-data';
import { calculateAverageScore, countHubCapabilities } from '../../utils/chart-helpers';

interface HeaderProps {
  data: PipelineData | null;
}

/**
 * Header component — project title + 4-5 statistic cards.
 *
 * Displays:
 * - Project title and meta info (topic, level, counts)
 * - Stat cards: 命题数 / 能力数 / 枢纽数 / 平均评分 / 最高复用
 *
 * Evolved from dashboard-template.html .header + #headerStats.
 */
export const Header: React.FC<HeaderProps> = ({ data }) => {
  const stats = useMemo(() => {
    if (!data) {
      return { propCount: 0, capCount: 0, hubCount: 0, avgScore: 0, maxReuse: 0 };
    }

    const props = data.postProcessing?.propositions ?? [];
    const analytics = data.postProcessing?.analytics ?? null;
    const propCount = props.length || analytics?.totalProps || 0;
    const capCount = analytics?.totalCaps || 0;
    const hubCount = analytics ? countHubCapabilities(analytics.capFreq) : 0;
    const avgScore = calculateAverageScore(
      props.length > 0
        ? props.map((p) => ({ score: p.score }))
        : null,
    );
    const maxReuse = analytics?.capFreq?.[0]?.count ?? 0;

    return { propCount, capCount, hubCount, avgScore, maxReuse };
  }, [data]);

  const topic = data?.meta.topic ?? '管线数据待生成';
  const targetLevel = data?.meta.targetLevel ?? '';

  return (
    <header className="px-6 pt-4 flex items-start justify-between gap-5 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold mb-1">导向学习看板</h1>
        <div className="text-text2 text-xs mb-2">
          {topic}
          {targetLevel && ` · ${targetLevel}`}
          {stats.propCount > 0 && ` · ${stats.propCount}命题`}
          {stats.capCount > 0 && ` · ${stats.capCount}原子能力`}
          {data?.postProcessing?.analytics && ` · ${data.postProcessing.analytics.layerOrder.length}技术层`}
        </div>
      </div>
      <div className="flex gap-3 flex-wrap">
        <StatCard num={stats.propCount} label="命题" />
        <StatCard num={stats.capCount} label="原子能力" />
        <StatCard num={stats.hubCount} label="枢纽能力" />
        <StatCard num={stats.avgScore} label="平均评分" />
        {stats.maxReuse > 0 && <StatCard num={stats.maxReuse} label="最高复用" />}
      </div>
    </header>
  );
};

/**
 * Individual statistic card.
 */
const StatCard: React.FC<{ num: number; label: string }> = ({ num, label }) => (
  <div className="bg-surface border border-border rounded-xl2 px-4 py-2 text-center min-w-[80px]">
    <div className="text-2xl font-bold text-accent2">{num}</div>
    <div className="text-2xs text-text2 mt-0.5 uppercase tracking-wide">{label}</div>
  </div>
);

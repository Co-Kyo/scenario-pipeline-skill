import React from 'react';
import type { PipelineData } from '../../types/pipeline-data';

interface FooterProps {
  data: PipelineData | null;
}

/**
 * Footer — pipeline status bar.
 *
 * Displays:
 * - Pipeline status (进行中/已完成)
 * - Generation timestamp
 * - Data source marker (scenario-pipeline v2)
 */
export const Footer: React.FC<FooterProps> = ({ data }) => {
  const isComplete = data?.progress.completedSteps.length === data?.progress.totalSteps;
  const status = !data ? '待启动' : isComplete ? '已完成' : '进行中';
  const generatedAt = data?.meta.generatedAt
    ? new Date(data.meta.generatedAt).toLocaleString('zh-CN')
    : '—';
  const skillVersion = data?.meta.skillVersion ?? 'scenario-pipeline v2';

  return (
    <footer className="px-6 py-3 border-t border-border text-2xs text-text2 flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-3">
        <span className={`inline-block w-2 h-2 rounded-full ${isComplete ? 'bg-green' : 'bg-yellow'}`} />
        <span>管线状态: {status}</span>
        {data && (
          <span>
            · 进度: {data.progress.completedSteps.length}/{data.progress.totalSteps} 步
            · {data.progress.completedCheckpoints.length}/{data.progress.totalCheckpoints} 检查点
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span>生成时间: {generatedAt}</span>
        <span>·</span>
        <span>数据来源: {skillVersion}</span>
      </div>
    </footer>
  );
};

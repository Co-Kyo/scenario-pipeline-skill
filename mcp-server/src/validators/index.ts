/**
 * 通用校验框架
 *
 * 所有步骤的 schema 文件注册到此框架，submit_output 通过此框架统一校验。
 */

import { validateRawMaterials } from "../schemas/raw-materials.schema.js";
import { validateDecompositions } from "../schemas/decompositions.schema.js";
import { validateCapabilityGraph } from "../schemas/capability-graph.schema.js";
import { validateHighgrounds } from "../schemas/highgrounds.schema.js";
import { validateEvaluations } from "../schemas/evaluations.schema.js";
import { validateSummary } from "../domains/summary/schema.js";
import type { ValidationError } from "../schemas/raw-materials.schema.js";

// ── 校验器注册表 ──

type Validator = (data: Record<string, unknown>) => ValidationError[];

const validators: Record<string, Validator> = {
  // 前处理步骤
  "scan": validateRawMaterials,
  "decompose": validateDecompositions,
  "capability-extract": validateCapabilityGraph,
  "highground-identify": validateHighgrounds,
  "evaluate": validateEvaluations,
  // 后处理步骤
  "capability-research": validateSummary,
};

// ── 公开接口 ──

/**
 * 校验指定步骤的输出数据
 * @param step 步骤名称
 * @param data 待校验数据
 * @returns 校验错误列表（空数组 = 通过）
 */
export function validateOutput(
  step: string,
  data: Record<string, unknown>
): ValidationError[] {
  const validator = validators[step];
  if (!validator) {
    return [{ path: "_root", message: `未注册的步骤: ${step}，无法校验` }];
  }
  return validator(data);
}

/**
 * 获取已注册的步骤列表
 */
export function getRegisteredSteps(): string[] {
  return Object.keys(validators);
}

/**
 * 注册新的校验器（供 schema 文件动态注册）
 */
export function registerValidator(step: string, validator: Validator): void {
  validators[step] = validator;
}

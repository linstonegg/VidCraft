/**
 * M0 预留的核心对象占位类型（对应总需求说明书 10.3）。
 *
 * 本文件只声明对象身份，不提前实现字段、状态机或表单：
 * 具体字段必须等总需求与后端契约冻结后再补充，避免与真实模型偏离。
 * 后续里程碑按对象拆分到独立文件（例如 understanding.ts、billing.ts）。
 */
export interface BillingOrder {
  /** 占位：订单 ID，字段以 M3 账单契约为准 */
  id: string;
}

export interface CreditLedger {
  /** 占位：账本流水 ID，字段以 M3 账务契约为准 */
  id: string;
}

export interface CreativeConcept {
  /** 占位：创意方案 ID，字段以 M2 创意契约为准 */
  id: string;
}

export interface DurationPlan {
  /** 占位：时长方案 ID，字段以 M2 剧本契约为准 */
  id: string;
}

export interface GenerationJob {
  /** 占位：异步任务 ID，字段以 M3 任务契约为准 */
  id: string;
}

export interface GenerationQuote {
  /** 占位：报价 ID，字段以 M3 计费契约为准 */
  id: string;
}

export interface MarketingAngle {
  /** 占位：传播切口 ID，字段以 M2 创意契约为准 */
  id: string;
}

export interface ProductUnderstandingRevision {
  /** 占位：产品理解版本 ID，字段以 M1 理解契约为准 */
  id: string;
}

export interface ProjectRender {
  /** 占位：整片合成版本 ID，字段以 M4 成片契约为准 */
  id: string;
}

export interface ScriptRevision {
  /** 占位：剧本版本 ID，字段以 M2 剧本契约为准 */
  id: string;
}

export interface ShotRevision {
  /** 占位：图文分镜版本 ID，字段以 M2 分镜契约为准 */
  id: string;
}

export interface ShotVideoVersion {
  /** 占位：单镜头视频候选版本 ID，字段以 M3 版本契约为准 */
  id: string;
}

export interface TimelineSnapshot {
  /** 占位：时间线快照 ID，字段以 M4 合成契约为准 */
  id: string;
}

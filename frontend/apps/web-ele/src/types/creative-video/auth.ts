/**
 * 演示角色模型。
 * 所有账号均为公开的非真实演示标识，禁止写入企业真实账号或密钥。
 */
export type DemoRoleCode = 'admin' | 'editor' | 'owner' | 'reviewer';

export interface DemoRole {
  /** 角色编码，与 userInfo.roles、路由 meta.authority 对应 */
  code: DemoRoleCode;
  /** 演示用中文名称 */
  displayName: string;
  /** 该角色在 M0 的可见范围说明 */
  scope: string;
  /** 登录用户名（Mock 公开账号） */
  username: string;
}

export interface DemoUserSeed {
  /** 仅用于演示的角色编码 */
  role: DemoRoleCode;
  username: string;
}

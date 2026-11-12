<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus';

import type { Platform } from '#/types/creative-video';

import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  ElAlert,
  ElButton,
  ElCheckbox,
  ElCheckboxGroup,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElRadioButton,
  ElRadioGroup,
  ElSelect,
} from 'element-plus';

import { useUnsavedChanges } from '#/composables/creative-video/use-unsaved-changes';
import { useCreativeVideoProjectStore } from '#/stores/creative-video';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';
import {
  DURATION_OPTIONS,
  MARKET_OPTIONS,
  OBJECTIVE_OPTIONS,
  PLATFORM_OPTIONS,
  RATIO_OPTIONS,
  STYLE_OPTIONS,
} from '#/utils/creative-video/project-stage';
import {
  createIdempotencyKey,
  validateProductUrl,
  validateProjectForm,
} from '#/utils/creative-video/validation';

defineOptions({ name: 'VidCraftProjectNew' });

const router = useRouter();
const store = useCreativeVideoProjectStore();
const formRef = ref<FormInstance>();
const submitting = ref(false);
const submitMode = ref<'continue' | 'draft'>('continue');
const serverError = ref('');

const form = reactive({
  aspectRatio: '9:16',
  description: '',
  durationSec: 30,
  language: 'zh-CN',
  market: 'CN',
  marketingObjective: 'signup',
  negativeGuidance: '',
  platforms: ['douyin'] as Platform[],
  productName: '',
  productUrl: '',
  rightsConfirmed: false,
  stylePreferences: [] as string[],
  targetAudience: '',
  title: '',
});

const initialSnapshot = ref(JSON.stringify(form));
const dirty = computed(() => JSON.stringify(form) !== initialSnapshot.value);
useUnsavedChanges(dirty);

let idempotencyKey = createIdempotencyKey('project');

const showLongDurationTip = computed(() => form.durationSec >= 120);

const rules: FormRules = {
  title: [
    { message: '请输入项目名称', required: true, trigger: 'blur' },
    { max: 100, message: '项目名称不能超过 100 个字符', trigger: 'blur' },
  ],
  productUrl: [
    {
      trigger: 'blur',
      validator: (_rule, value, callback) => {
        const error = validateProductUrl(String(value ?? ''));
        if (error) {
          callback(new Error(error));
        } else {
          callback();
        }
      },
    },
  ],
  platforms: [
    {
      message: '至少选择一个目标平台',
      trigger: 'change',
      validator: (_rule, value, callback) => {
        if (!Array.isArray(value) || value.length === 0) {
          callback(new Error('至少选择一个目标平台'));
        } else {
          callback();
        }
      },
    },
  ],
  rightsConfirmed: [
    {
      trigger: 'change',
      validator: (_rule, value, callback) => {
        if (value) {
          callback();
        } else {
          callback(new Error('请先确认资料使用权声明'));
        }
      },
    },
  ],
};

function validateDraft() {
  const errors: Record<string, string> = {};
  if (!form.title.trim()) {
    errors.title = '请输入项目名称';
  } else if (form.title.trim().length > 100) {
    errors.title = '项目名称不能超过 100 个字符';
  }
  const urlError = validateProductUrl(form.productUrl);
  if (urlError) {
    errors.productUrl = urlError;
  }
  if (!form.rightsConfirmed) {
    errors.rightsConfirmed = '请先确认资料使用权声明';
  }
  return errors;
}

async function submit(mode: 'continue' | 'draft') {
  if (submitting.value) {
    return;
  }
  submitMode.value = mode;
  serverError.value = '';
  const errors = mode === 'draft' ? validateDraft() : validateProjectForm(form);
  if (Object.keys(errors).length > 0) {
    await formRef.value?.validate().catch(() => false);
    ElMessage.warning('请先修正表单中的问题');
    return;
  }
  submitting.value = true;
  try {
    const project = await store.create(
      {
        ...form,
        title: form.title.trim(),
        productName: form.productName.trim(),
        productUrl: form.productUrl.trim(),
      },
      idempotencyKey,
    );
    initialSnapshot.value = JSON.stringify(form);
    idempotencyKey = createIdempotencyKey('project');
    ElMessage.success(
      mode === 'draft' ? '项目草稿已保存' : '项目创建成功，正在进入资料采集',
    );
    await (mode === 'draft'
      ? router.push(`/projects/${project.id}`)
      : router.push(`/studio/${project.id}/ingest`));
  } catch (error) {
    serverError.value = friendlyErrorMessage(error);
    ElMessage.error(serverError.value);
  } finally {
    submitting.value = false;
  }
}

async function cancel() {
  if (dirty.value) {
    try {
      const { ElMessageBox } = await import('element-plus');
      await ElMessageBox.confirm(
        '当前填写内容尚未保存，确定离开？',
        '未保存的修改',
        {
          cancelButtonText: '继续编辑',
          confirmButtonText: '离开',
          type: 'warning',
        },
      );
    } catch {
      return;
    }
  }
  await router.push('/projects');
}
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <div class="vc-page vc-new">
    <header class="vc-new__hero">
      <div class="vc-new__hero-copy">
        <p class="vc-new__eyebrow">New Project</p>
        <h1 class="vc-page__title">新建 AI 营销视频项目</h1>
        <p class="vc-page__subtitle">
          先创建可编辑草稿，再进入资料采集。带 *
          的字段为必填；产品网址可以先留空，之后用素材补充。
        </p>
      </div>
      <ElButton @click="cancel">取消</ElButton>
    </header>

    <ElAlert
      v-if="serverError"
      :closable="true"
      :title="serverError"
      class="vc-m1-form__error"
      show-icon
      type="error"
      @close="serverError = ''"
    />

    <ElForm
      ref="formRef"
      class="vc-new__form"
      :model="form"
      :rules="rules"
      label-position="top"
    >
      <div class="vc-new__layout">
        <div class="vc-new__main">
          <section class="vc-new__panel">
            <div class="vc-new__panel-head">
              <span class="vc-new__step">01</span>
              <div>
                <h2 class="vc-new__panel-title">项目基础信息</h2>
                <p class="vc-new__panel-desc">
                  先给项目一个清晰名字，产品网址可稍后补充。
                </p>
              </div>
            </div>
            <div class="vc-m1-form__grid">
              <ElFormItem label="项目名称" prop="title">
                <ElInput
                  v-model="form.title"
                  maxlength="100"
                  placeholder="例如：3D 数字简历推广视频"
                  show-word-limit
                />
              </ElFormItem>
              <ElFormItem label="产品名称">
                <ElInput
                  v-model="form.productName"
                  maxlength="100"
                  placeholder="可与项目名不同，可稍后补充"
                />
              </ElFormItem>
              <ElFormItem
                class="vc-m1-form__span-2"
                label="产品网址（可留空）"
                prop="productUrl"
              >
                <ElInput
                  v-model="form.productUrl"
                  placeholder="https://example.com/product"
                />
              </ElFormItem>
              <ElFormItem class="vc-m1-form__span-2" label="产品简介">
                <ElInput
                  v-model="form.description"
                  :rows="3"
                  maxlength="2000"
                  placeholder="一句话说明产品是什么、给谁用"
                  show-word-limit
                  type="textarea"
                />
              </ElFormItem>
            </div>
          </section>

          <section class="vc-new__panel">
            <div class="vc-new__panel-head">
              <span class="vc-new__step">02</span>
              <div>
                <h2 class="vc-new__panel-title">宣传目标与受众</h2>
                <p class="vc-new__panel-desc">
                  告诉导演要达成什么结果、面向谁、投放到哪里。
                </p>
              </div>
            </div>
            <div class="vc-m1-form__grid">
              <ElFormItem label="营销目标" prop="marketingObjective">
                <ElSelect
                  v-model="form.marketingObjective"
                  class="vc-m1-form__control"
                >
                  <ElOption
                    v-for="item in OBJECTIVE_OPTIONS"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem label="目标市场" prop="market">
                <ElSelect v-model="form.market" class="vc-m1-form__control">
                  <ElOption
                    v-for="item in MARKET_OPTIONS"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem
                class="vc-m1-form__span-2"
                label="目标用户（可交给 AI 判断）"
              >
                <ElInput
                  v-model="form.targetAudience"
                  :rows="2"
                  maxlength="1000"
                  placeholder="例如：希望展示个人创意的求职者"
                  show-word-limit
                  type="textarea"
                />
              </ElFormItem>
              <ElFormItem
                class="vc-m1-form__span-2"
                label="目标平台"
                prop="platforms"
              >
                <ElCheckboxGroup v-model="form.platforms" class="vc-new__chips">
                  <ElCheckbox
                    v-for="item in PLATFORM_OPTIONS"
                    :key="item.value"
                    :value="item.value"
                    border
                  >
                    {{ item.label }}
                  </ElCheckbox>
                </ElCheckboxGroup>
              </ElFormItem>
            </div>
          </section>

          <section class="vc-new__panel">
            <div class="vc-new__panel-head">
              <span class="vc-new__step">03</span>
              <div>
                <h2 class="vc-new__panel-title">影片要求</h2>
                <p class="vc-new__panel-desc">
                  设定时长、比例与风格；不确定的部分可交给 AI。
                </p>
              </div>
            </div>

            <div class="vc-new__film-grid">
              <ElFormItem label="目标时长">
                <ElRadioGroup v-model="form.durationSec">
                  <ElRadioButton
                    v-for="item in DURATION_OPTIONS"
                    :key="item"
                    :value="item"
                  >
                    {{ item }} 秒
                  </ElRadioButton>
                </ElRadioGroup>
              </ElFormItem>

              <ElFormItem label="画面比例">
                <ElRadioGroup v-model="form.aspectRatio">
                  <ElRadioButton
                    v-for="item in RATIO_OPTIONS"
                    :key="item.value"
                    :value="item.value"
                  >
                    {{ item.label }}
                  </ElRadioButton>
                </ElRadioGroup>
              </ElFormItem>
            </div>

            <ElAlert
              v-if="showLongDurationTip"
              :closable="false"
              class="vc-m1-form__tip"
              show-icon
              title="120 秒属于长片目标，后续创意导演会评估时长是否合适，不会强行把短片脚本拉长。"
              type="info"
            />
            <p
              v-if="form.platforms.length > 1"
              class="vc-new__status"
              role="status"
            >
              多平台发布以首选平台为主；当前比例
              {{ form.aspectRatio }}
              在其他平台可能裁切，请预留字幕与人物安全区域。
            </p>

            <div class="vc-m1-form__grid">
              <ElFormItem label="视频语言">
                <ElSelect v-model="form.language" class="vc-m1-form__control">
                  <ElOption label="简体中文" value="zh-CN" />
                  <ElOption disabled label="English（预留）" value="en-US" />
                </ElSelect>
              </ElFormItem>
              <ElFormItem
                class="vc-m1-form__span-2"
                label="风格偏好（可不选，交给 AI 发现）"
              >
                <ElCheckboxGroup
                  v-model="form.stylePreferences"
                  class="vc-new__chips"
                >
                  <ElCheckbox
                    v-for="item in STYLE_OPTIONS"
                    :key="item"
                    :value="item"
                    border
                  >
                    {{ item }}
                  </ElCheckbox>
                </ElCheckboxGroup>
              </ElFormItem>
              <ElFormItem class="vc-m1-form__span-2" label="创作禁区 / 偏好">
                <ElInput
                  v-model="form.negativeGuidance"
                  :rows="2"
                  maxlength="1000"
                  placeholder="例如：不要做操作说明，不要过早硬广"
                  show-word-limit
                  type="textarea"
                />
              </ElFormItem>
            </div>
          </section>
        </div>

        <aside class="vc-new__aside">
          <section class="vc-new__panel vc-new__rights">
            <div class="vc-new__panel-head">
              <span class="vc-new__step">04</span>
              <div>
                <h2 class="vc-new__panel-title">资料授权说明</h2>
                <p class="vc-new__panel-desc">创建前需确认使用权声明。</p>
              </div>
            </div>
            <ElFormItem prop="rightsConfirmed">
              <ElCheckbox v-model="form.rightsConfirmed">
                我确认有权使用提交的网址与资料，并理解“模拟授权演示环境”只是
                Mock 演示，不会连接或登录真实系统。
              </ElCheckbox>
            </ElFormItem>
            <p class="vc-m1-form__weak">
              演示环境不会要求输入真实密码，也不保存 Cookie、Token 或账号凭据。
            </p>
          </section>

          <section class="vc-new__panel vc-new__summary">
            <h2 class="vc-new__panel-title">创建后将进入</h2>
            <ol class="vc-new__summary-list">
              <li>保存项目草稿</li>
              <li>进入 Studio 资料采集</li>
              <li>补充产品网址、素材与覆盖度</li>
            </ol>
            <p class="vc-m1-form__weak">
              也可先「保存草稿」回到项目详情，稍后再继续。
            </p>
          </section>
        </aside>
      </div>

      <div class="vc-m1-form__footer">
        <div class="vc-m1-form__footer-hint">
          <span v-if="dirty">有未保存修改</span>
          <span v-else>填写完成后可保存草稿或直接采集资料</span>
        </div>
        <div class="vc-m1-form__footer-actions">
          <ElButton @click="cancel">取消</ElButton>
          <ElButton
            :loading="submitting && submitMode === 'draft'"
            @click="submit('draft')"
          >
            保存草稿
          </ElButton>
          <ElButton
            :loading="submitting && submitMode === 'continue'"
            type="primary"
            @click="submit('continue')"
          >
            创建并采集资料
          </ElButton>
        </div>
      </div>
    </ElForm>
  </div>
</template>

<style scoped>
.vc-new {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 88px;
}

.vc-new__hero {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  align-items: flex-end;
  justify-content: space-between;
  padding: 20px 22px;
  background:
    linear-gradient(
      135deg,
      rgb(103 87 215 / 8%) 0%,
      rgb(103 87 215 / 2%) 42%,
      transparent 72%
    ),
    var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-new__hero-copy {
  min-width: 0;
  max-width: 720px;
}

.vc-new__eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 650;
  color: var(--vc-brand);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.vc-new__hero .vc-page__title {
  font-size: 22px;
  letter-spacing: -0.02em;
}

.vc-new__hero .vc-page__subtitle {
  max-width: 58ch;
}

.vc-m1-form__error {
  margin: 0;
}

.vc-new__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.vc-new__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.85fr);
  gap: 16px;
  align-items: start;
}

.vc-new__main,
.vc-new__aside {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.vc-new__panel {
  box-sizing: border-box;
  padding: 18px 20px 8px;
  background: var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-new__panel-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.vc-new__step {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  font-size: 12px;
  font-weight: 700;
  color: var(--vc-brand);
  background: var(--vc-brand-soft);
  border: 1px solid var(--vc-brand-border);
  border-radius: 10px;
}

.vc-new__panel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-new__panel-desc {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--vc-text-weak);
}

.vc-m1-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 18px;
}

.vc-m1-form__span-2 {
  grid-column: 1 / -1;
}

.vc-m1-form__control {
  width: 100%;
}

.vc-new__film-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 18px;
}

.vc-m1-form__tip {
  margin: 0 0 12px;
}

.vc-new__status {
  padding: 10px 12px;
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.6;
  color: #8a4b00;
  background: var(--vc-mock-banner-bg);
  border: 1px solid var(--vc-mock-banner-border);
  border-radius: 10px;
}

.vc-new__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.vc-new__chips :deep(.el-checkbox) {
  margin-right: 0;
  border-radius: 999px;
}

.vc-new__chips :deep(.el-checkbox.is-bordered) {
  height: auto;
  padding: 5px 12px;
}

.vc-new__chips :deep(.el-checkbox.is-bordered.is-checked) {
  background: var(--vc-brand-soft);
  border-color: var(--vc-brand-border);
}

.vc-new__rights {
  background:
    linear-gradient(180deg, rgb(103 87 215 / 5%) 0%, transparent 68%),
    var(--el-bg-color-overlay, #fff);
  border-color: var(--vc-brand-border);
}

.vc-new__summary-list {
  padding-left: 18px;
  margin: 10px 0 12px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--el-text-color-regular, #4b5563);
}

.vc-m1-form__weak {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vc-text-weak);
}

.vc-m1-form__footer {
  position: sticky;
  bottom: 12px;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgb(255 255 255 / 92%);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-border-radius);
  box-shadow: 0 10px 28px rgb(15 23 42 / 8%);
  backdrop-filter: blur(8px);
}

.vc-m1-form__footer-hint {
  font-size: 12px;
  color: var(--vc-text-weak);
}

.vc-m1-form__footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

@media (max-width: 1100px) {
  .vc-new__layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .vc-new {
    padding-bottom: 110px;
  }

  .vc-new__hero {
    padding: 16px;
  }

  .vc-m1-form__grid,
  .vc-new__film-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .vc-m1-form__footer {
    bottom: 8px;
  }

  .vc-m1-form__footer-actions {
    width: 100%;
  }

  .vc-m1-form__footer-actions :deep(.el-button) {
    flex: 1;
  }
}
</style>

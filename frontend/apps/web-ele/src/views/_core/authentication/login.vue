<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { BasicOption } from '@vben/types';

import { computed, markRaw } from 'vue';

import { AuthenticationLogin, SliderCaptcha, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();

/**
 * 演示账号：全部为公开的非真实标识，密码仅用于本地 Mock。
 * 角色编码与路由 meta.authority 对应。
 */
const MOCK_USER_OPTIONS: BasicOption[] = [
  {
    label: '产品拥有者（演示）',
    value: 'owner',
  },
  {
    label: '内容编辑（演示）',
    value: 'editor',
  },
  {
    label: '审核员（演示）',
    value: 'reviewer',
  },
  {
    label: '系统管理员（演示）',
    value: 'admin',
  },
];

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenSelect',
      componentProps: {
        options: MOCK_USER_OPTIONS,
        placeholder: $t('authentication.selectAccount'),
      },
      fieldName: 'selectAccount',
      label: $t('authentication.selectAccount'),
      rules: z
        .string()
        .min(1, { message: $t('authentication.selectAccount') })
        .optional()
        .default('owner'),
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      dependencies: {
        trigger(values, form) {
          if (values.selectAccount) {
            const findUser = MOCK_USER_OPTIONS.find(
              (item) => item.value === values.selectAccount,
            );
            if (findUser) {
              form.setValues({
                password: '123456',
                username: findUser.value,
              });
            }
          }
        },
        triggerFields: ['selectAccount'],
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
    {
      component: markRaw(SliderCaptcha),
      fieldName: 'captcha',
      rules: z.boolean().refine((value) => value, {
        message: $t('authentication.verifyRequiredTip'),
      }),
    },
  ];
});
</script>

<template>
  <div class="vc-login">
    <AuthenticationLogin
      :form-schema="formSchema"
      :loading="authStore.loginLoading"
      :show-code-login="false"
      :show-forget-password="false"
      :show-qrcode-login="false"
      :show-register="false"
      :show-third-party-login="false"
      @submit="authStore.authLogin"
    />
    <p class="vc-login__notice">
      演示模式：账号、项目、AI
      结果与积分均为模拟数据，不会调用真实模型或产生费用。
    </p>
  </div>
</template>

<style scoped>
.vc-login {
  width: 100%;
}

.vc-login__notice {
  margin: 12px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vc-text-weak);
  text-align: center;
}
</style>

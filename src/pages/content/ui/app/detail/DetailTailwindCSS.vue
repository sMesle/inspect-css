<template>
  <div class="flex items-center justify-between">
    <div class="text-sm font-semibold">Tailwind CSS</div>
    <UiButton
      size="sm"
      variant="secondary"
      class="highlight-white/5"
      @click="copyChanges()"
    >
      {{ isCopied === 'all' ? '✅ Copied' : 'Copy' }}
    </UiButton>
  </div>
  <UiCodemirror
    ref="codemirror"
    class="text-xs"
    :model-value="code"
    :view-options="{ root: appProvider.shadowRoot }"
    :extensions="editorExtensions"
    :theme-options="{
      settings: {
        background: 'transparent',
        gutterBackground: 'transparent',
      },
    }"
    @change="emit('change', $event)"
  />
</template>
<script setup lang="ts">
import { ref, shallowRef, toRaw, watch } from 'vue';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { css } from '@src/lib/codemirror/css';
import { color } from '@uiw/codemirror-extensions-color';
import { toggleCommentGutter } from '@src/lib/codemirror/extensions';
import UiCodemirror from '@root/src/pages/components/ui/UiCodemirror.vue';
import UiButton from '@root/src/pages/components/ui/UiButton.vue';
import { useAppProvider } from '../../app-plugin';
import { TailwindConverter } from 'css-to-tailwindcss';
import { copyToClipboard } from '@root/src/utils/helper';
import { theme } from 'tailwindcss/defaultConfig';
import { parseClassToTailwind } from '@root/src/utils/TailwindCSS-parser';

interface Props {
  styleId?: string;
  cssText: string;
  media: any;
}
const props = withDefaults(defineProps<Props>(), {
  styleId: '',
});
const emit = defineEmits<{
  (e: 'change', value: string): void;
}>();

const code = ref<string>('');
const codemirror = ref<InstanceType<typeof UiCodemirror> | null>(null);

const appProvider = useAppProvider();

const editorExtensions: Extension[] = [css(), color, EditorView.lineWrapping];

const converter = new TailwindConverter({
  remInPx: 16,
});

const updateEditor = (newValue: string) => {
  if (codemirror.value?.editorView) {
    codemirror.value.editorView.dispatch({
      changes: {
        from: 0,
        to: codemirror.value.editorView.state.doc.length,
        insert: newValue,
      },
    });
  }
};

watch(
  () => code.value,
  (newValue) => {
    updateEditor(newValue);
  },
);

watch(
  () => props.cssText,
  (newValue) => {
    parseClassToTailwind({
      cssText: newValue,
      media: props.media,
    }).then((tailwindClasses) => {
      code.value = tailwindClasses.responsive;
    });
  },
  { immediate: true },
);

const isCopied = shallowRef<number | string | null>(null);
function copyChanges() {
  copyToClipboard(toRaw(code.value))
    .then(() => {
      isCopied.value = 'all';
      setTimeout(() => {
        isCopied.value = null;
      }, 1000);
    })
    .catch((error) => {
      alert('Error when trying copy CSS to clipboard');
      console.error(error);
    });
}
</script>

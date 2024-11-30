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

const editorExtensions: Extension[] = [
  css(),
  color,
  EditorView.lineWrapping,
];

const converter = new TailwindConverter({
  remInPx: 16,
});

const updateEditor = (newValue: string) => {
  if (codemirror.value?.editorView) {
    codemirror.value.editorView.dispatch({
      changes: {
        from: 0,
        to: codemirror.value.editorView.state.doc.length,
        insert: newValue
      }
    });
  }
};

watch(
  () => code.value,
  (newValue) => {
    updateEditor(newValue);
  }
);

watch(
  () => props.cssText,
  async (newValue) => {
    let minBreakpointTailwind = '';
    let maxBreakpointTailwind = '';
    for (const media of props.media) {
      console.log(media);
      const minWidthMatch = media.mediaCondition.match(/min-width:\s*(\d+)px/);
      const maxWidthMatch = media.mediaCondition.match(/max-width:\s*(\d+)px/);
      if (minWidthMatch) {
        const minWidth = parseInt(minWidthMatch[1]);
        // find the closest breakpoint
        const closestBreakpoint = Object.entries(theme?.screens || {}).reduce((prev, [name, value]) => {
          const size = parseInt(value.toString().replace('px', ''));
          return Math.abs(size - minWidth) < Math.abs(prev[0] - minWidth) ? [size, name] : prev;
        }, [Infinity, '']);
        const converted = await converter.convertCSS('.foo{' + media.cssText + '}');
        minBreakpointTailwind += converted.nodes[0].tailwindClasses.map(cls => `${closestBreakpoint[1]}:${cls}`).join(' ') + ' ';
      }
      if (maxWidthMatch) {
        const maxWidth = parseInt(maxWidthMatch[1]);
        // find the closest breakpoint
        const closestBreakpoint = Object.entries(theme?.screens || {}).reduce((prev, [name, value]) => {
          const size = parseInt(value.toString().replace('px', ''));
          return Math.abs(size - maxWidth) < Math.abs(prev[0] - maxWidth) ? [size, name] : prev;
        }, [Infinity, '']);
        const converted = await converter.convertCSS('.foo{' + media.cssText + '}');
        maxBreakpointTailwind += converted.nodes[0].tailwindClasses.map(cls => `max-${closestBreakpoint[1]}:${cls}`).join(' ') + ' ';
      }
    }

    const converted = await converter.convertCSS('.foo{' + newValue + '}');

    const baseScreen = converted.nodes[0].tailwindClasses;
    if(minBreakpointTailwind) {
      baseScreen.push(...minBreakpointTailwind.split(' '));
    }
    if(maxBreakpointTailwind) {
      baseScreen.push(...maxBreakpointTailwind.split(' '));
    }
    code.value = baseScreen.join(' ');
  },
  { immediate: true }
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

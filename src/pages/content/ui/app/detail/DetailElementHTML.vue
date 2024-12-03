<template>
  <p class="font-semibold">HTML</p>
  <span v-if="clone">
    <UiButton
      size="sm"
      variant="secondary"
      class="highlight-white/5"
      @click="copyChanges()"
    >
      {{ isCopied === 'all' ? '✅ Copied' : 'Copy HTML Tailwind' }}
    </UiButton>
  </span>
  <div class="mt-2 rounded-md bg-muted/50 highlight-white/5">
    <UiCodemirror
      :key="editorKey"
      :extensions="[html(), EditorView.lineWrapping]"
      :model-value="innerHTML"
      :theme-options="{
        settings: {
          background: 'transparent',
          gutterBackground: 'transparent',
        },
      }"
      placeholder="HTML here"
      class="text-sm p-2"
      @change="updateInnerHTML"
    />
  </div>
</template>
<script setup lang="ts">
import { watch, shallowRef, ref, Ref, computed, nextTick, toRaw } from 'vue';
import { html } from '@codemirror/lang-html';
import { EditorView } from '@codemirror/view';
import UiCodemirror from '@root/src/pages/components/ui/UiCodemirror.vue';
import UiButton from '@root/src/pages/components/ui/UiButton.vue';
import CSSRulesUtils from '@root/src/utils/CSSRulesUtils';
import { copyToClipboard } from '@root/src/utils/helper';
import { parseClassToTailwind } from '@root/src/utils/TailwindCSS-parser';

const props = defineProps<{
  element: Element;
}>();

const innerHTML = shallowRef('');
const editorKey = shallowRef(0);

function updateInnerHTML(html: string) {
  innerHTML.value = html;
  // eslint-disable-next-line vue/no-mutating-props
  props.element.innerHTML = html;
}
const cssRulesUtils = new CSSRulesUtils();
const clone = ref() as Ref<Element>;
const htmlTailwind = computed(() => clone.value.outerHTML);

const parseHTMLToTailwindCSS = async (element: Element = clone.value) => {
  // Process the root element
  const appliedStyle = cssRulesUtils.getAppliedRules(element);
  const { responsive } = await parseClassToTailwind(appliedStyle);
  if (responsive) {
    const classes = responsive.split(' ');
    element.classList.remove(...element.classList);
    classes.forEach((className) => {
      if (className) {
        element.classList.add(className.trim());
      }
    });
    element.setAttribute('class', Array.from(element.classList).join(' '));
  }

  // Process current element's children
  const childElements = Array.from(element.children);

  for (const child of childElements) {
    await parseHTMLToTailwindCSS(child);
  }
};

watch(
  () => props.element,
  async () => {
    innerHTML.value = props.element.innerHTML.trim();
    editorKey.value += 1;
    clone.value = props.element.cloneNode(true) as Element;
    parseHTMLToTailwindCSS();
  },
  { immediate: true },
);

const isCopied = ref('');

function copyChanges() {
  copyToClipboard(toRaw(clone.value.innerHTML))
    .then(() => {
      isCopied.value = 'all';
      setTimeout(() => {
        isCopied.value = '';
      }, 1000);
    })
    .catch((error) => {
      alert('Error when trying copy CSS to clipboard');
      console.error(error);
    });
}
</script>

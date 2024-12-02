import { TailwindConverter } from 'css-to-tailwindcss';
import { theme } from 'tailwindcss/defaultConfig';
import { ElementAppliedStyleRules } from './CSSRulesUtils';

export const converter = new TailwindConverter({
  remInPx: 16,
});

export const parseBreakpoints = async (
  appliedStyle: ElementAppliedStyleRules,
) => {
  let minBreakpointTailwind = '';
  let maxBreakpointTailwind = '';
  for (const m of appliedStyle.media) {
    if (!m.mediaCondition) continue;
    const minWidthMatch = m.mediaCondition.match(/min-width:\s*(\d+)px/);
    const maxWidthMatch = m.mediaCondition.match(/max-width:\s*(\d+)px/);
    if (minWidthMatch) {
      const minWidth = parseInt(minWidthMatch[1]);
      console.log(minWidthMatch);

      // find the closest breakpoint
      const closestBreakpoint = Object.entries(theme?.screens || {}).reduce(
        (prev, [name, value]) => {
          const size = parseInt(value.toString().replace('px', ''));
          return Math.abs(size - minWidth) < Math.abs(prev[0] - minWidth)
            ? [size, name]
            : prev;
        },
        [Infinity, ''],
      );

      console.log(m);

      const converted = await converter.convertCSS('.foo{' + m.cssText + '}');

      if (converted.nodes.length > 0) {
        minBreakpointTailwind +=
          converted.nodes[0].tailwindClasses
            .map((cls) => `${closestBreakpoint[1]}:${cls}`)
            .join(' ') + ' ';
      }
    }
    if (maxWidthMatch) {
      const maxWidth = parseInt(maxWidthMatch[1]);
      // find the closest breakpoint
      const closestBreakpoint = Object.entries(theme?.screens || {}).reduce(
        (prev, [name, value]) => {
          const size = parseInt(value.toString().replace('px', ''));
          return Math.abs(size - maxWidth) < Math.abs(prev[0] - maxWidth)
            ? [size, name]
            : prev;
        },
        [Infinity, ''],
      );
      const converted = await converter.convertCSS('.foo{' + m.cssText + '}');
      if (converted.nodes.length > 0) {
        maxBreakpointTailwind +=
          converted.nodes[0].tailwindClasses
            .map((cls) => `max-${closestBreakpoint[1]}:${cls}`)
            .join(' ') + ' ';
      }
    }
  }
  return {
    minBreakpointTailwind,
    maxBreakpointTailwind,
  };
};

export const parseClassToTailwind = async (
  appliedStyle: ElementAppliedStyleRules,
) => {
  const converted = await converter.convertCSS(
    '.foo{' + appliedStyle.cssText + '}',
  );

  const { minBreakpointTailwind, maxBreakpointTailwind } =
    await parseBreakpoints(appliedStyle);

  const baseScreen =
    converted.nodes.length > 0 ? converted.nodes[0].tailwindClasses : [];
  const responsiveClass = JSON.parse(JSON.stringify(baseScreen));

  if (minBreakpointTailwind) {
    responsiveClass.push(...minBreakpointTailwind.split(' '));
  }
  if (maxBreakpointTailwind) {
    responsiveClass.push(...maxBreakpointTailwind.split(' '));
  }

  return {
    base: baseScreen.join(' '),
    responsive: responsiveClass.join(' '),
  };
};

import { Mark } from '@tiptap/core';

export const MarcaOculta = Mark.create({
  name: 'oculto',
  parseHTML() {
    return [{ tag: 'span.marca-oculta' }];
  },
  renderHTML() {
    return ['span', { class: 'marca-oculta' }, 0];
  }
});

export const TamanoFuente = Mark.create({
  name: 'fontSize',
  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: element => element.style.fontSize || null,
        renderHTML: attributes => {
          if (!attributes.size) return {};
          return { style: `font-size: ${attributes.size}` };
        }
      }
    };
  },
  parseHTML() {
    return [{ style: 'font-size', getAttrs: value => ({ size: value }) }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0];
  }
});

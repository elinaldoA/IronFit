// Modais usam createPortal para escapar de containers com overflow/scroll, mas ainda
// precisam ficar dentro do ".shell" (moldura de celular do preview desktop) — portar
// direto para document.body faz position:fixed ignorar essa moldura e cobrir a janela toda.
export function getModalRoot() {
  return document.querySelector('.shell') || document.body;
}

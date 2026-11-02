import React from 'react';
import { createRoot } from 'react-dom/client';
import FolderFloat from './FolderFloat.jsx';

const roots = new Map();
function mount(selector, element) {
  const node = document.querySelector(selector);
  if (!node) return;
  const root = createRoot(node);
  root.render(element);
  roots.set(selector, root);
}
function renderEffects() {
  roots.forEach(root => root.unmount());
  roots.clear();
  mount('[data-folder-float-root]', <FolderFloat items={['Pesquisa','Estratégia','Conceito','Direção','Identidade','Cores','Tipografia','Tom de voz','UX','UI','Protótipo','Mobile','Motion','Imagens','Conteúdo','Código','Integrações','Performance','SEO','Acesso','Segurança','Domínio','Publicação','Testes','Refinamento','Lançamento','Métricas','Evolução','Suporte','Crescimento'].slice(0, window.innerWidth < 700 ? 20 : 30)} label="Um projeto IGGO" sublabel="Da ideia à presença" trigger="click" autoCycle={true} physics={true} closeOnSelect={false} drift={0.25} folderColor="#ad371a" frontColor="#e64b20" paperColor="#fff9f2" itemColor="#171611" itemTextColor="#fff9f2" labelColor="#fff" width={window.innerWidth < 700 ? 215 : 270} height={window.innerWidth < 700 ? 150 : 180} spread={window.innerWidth < 700 ? 150 : 340} landingSpread={(window.innerWidth - 36) / 2} lift={window.innerWidth < 700 ? 80 : 95} tilt={8} openDuration={860} stagger={65} bounce={0.55} />);

}
document.addEventListener('pagechange', renderEffects);
renderEffects();

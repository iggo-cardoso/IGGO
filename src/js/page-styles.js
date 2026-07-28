// ═══════════════════════════════════════════════════════════════
// PAGE STYLES,  CSS das pages carregadas via page-router
//
// Fragmentos de /pages/*.html (projetos.html, sobre.html, etc.) são
// buscados por fetch e injetados via innerHTML,  então um <link
// rel="stylesheet"> escrito dentro do fragmento nunca entra no grafo
// de build do Vite (só existe no dist o que é alcançável a partir dos
// entries do rollupOptions.input). Em dev isso passava batido porque
// o dev server resolve qualquer path sob /src on-the-fly, mas no
// build o arquivo simplesmente não existe no output -> 404 no CSS.
//
// Solução: importar o CSS aqui, igual já é feito com loja.css dentro
// de effects/loja.js. O Vite bundla, hasheia e injeta a tag sozinho
// assim que este módulo roda (ele é importado globalmente em main.js).
// Os <link rel="stylesheet" href="/src/..."> dentro dos fragmentos
// devem ser removidos,  o CSS já entra por aqui.
// ═══════════════════════════════════════════════════════════════
import './../css/html/projetos.css';
import './../css/html/sobre.css';

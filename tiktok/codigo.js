// Mostra o código que o TikTok devolve no login (24/11/2026). Não envia nada a lugar nenhum: o Andrews copia e cola no painel.
(function () {
  var p = new URLSearchParams(location.search);
  var el = document.getElementById('tiktok-resultado');
  var codigo = p.get('code'), erro = p.get('error');
  if (erro) { el.innerHTML = '<p>O TikTok não liberou: ' + String(erro).replace(/[<>&]/g, '') + '.</p>'; return; }
  if (!codigo) { el.innerHTML = '<p>Nenhum código chegou. Abra o login pelo painel de novo.</p>'; return; }
  el.textContent = '';
  var t = document.createElement('p'); t.textContent = 'Copie este código e cole no painel (vale por poucos minutos):'; el.appendChild(t);
  var c = document.createElement('textarea'); c.readOnly = true; c.rows = 3; c.style.width = '100%'; c.value = codigo; el.appendChild(c);
  var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Copiar'; b.className = 'botao';
  b.onclick = function () { c.select(); (navigator.clipboard ? navigator.clipboard.writeText(codigo) : Promise.resolve(document.execCommand('copy'))).then(function () { b.textContent = 'Copiado'; }); };
  el.appendChild(b);
})();

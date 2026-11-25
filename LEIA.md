# Conserto do site da Pineapple (24/11/2026, à noite)

- **O que aconteceu:** no upload do TikTok, os arquivos do site do **Alarmino** foram junto para o GitHub da Pineapple e substituíram 9 arquivos dela
  - pineapplepro.com.br passou a mostrar o Alarmino (início, termos, privacidade e a página de pagamento confirmado)
- **1) Suba no GitHub da Pineapple os 9 arquivos desta pasta**, no mesmo lugar (substituindo):
  - na raiz: index.html, privacidade.html, termos.html, estilo.css, site.js, valores.js, robots.txt
  - na pasta pagamento-confirmado/: index.html e confirmado.js
- **2) Apague do GitHub da Pineapple** os 5 arquivos do Alarmino que entraram (abrir o arquivo → ícone da lixeira → Commit):
  - img/de-pe.png, img/icone.png, img/sentado-atento.png, img/rosto-atento.png
  - comum/cadastro.js
  - NÃO apague img/marca.png nem img/previa.jpg (são da Pineapple)
- **3) Avise o Claude:** ele confere arquivo por arquivo se o site voltou
- O site do Alarmino fica em `empresas/alarmino/site/` e vai para o domínio próprio dele, nunca para o GitHub da Pineapple (sem vínculo entre as marcas)

# Cotar3D

Calculadora gratuita de custo, margem e preço de venda para impressão 3D.

## O que tem neste MVP

- Calculadora estática sem login e sem backend.
- Modo simples e modo completo.
- Presets editáveis de material e impressoras.
- Salvamento local de padrões no navegador.
- Página guia para SEO.
- Política de privacidade e termos de uso iniciais.
- Manifest básico para futura evolução como PWA.
- Configuração inicial para Firebase Hosting.

## Publicar no Firebase Hosting

1. Crie um projeto no Firebase Console.
2. O projeto já está configurado para o ID `cotar3d`.
3. Instale ou use o Firebase CLI.
4. Faça login:

```bash
firebase login
```

5. Publique a partir desta pasta:

```bash
firebase deploy --only hosting --project cotar3d
```

O Firebase deve gerar URLs parecidas com:

- `https://cotar3d.web.app`
- `https://cotar3d.firebaseapp.com`

## GitHub

Repositório do projeto:

- https://github.com/generosorafa/cotar3d

Primeiro envio:

```bash
git init
git add .
git commit -m "Initial Cotar3D MVP"
git branch -M main
git remote add origin https://github.com/generosorafa/cotar3d.git
git push -u origin main
```

## Antes de publicar oficialmente

- Conferir URLs canônicas em `index.html`, `sitemap.xml`, `robots.txt` e páginas internas sempre que trocar de domínio.
- Revisar política de privacidade e termos antes de usar analytics, anúncios, login ou pagamentos.
- Testar em celular real.
- Validar fórmula com usuários que imprimem em 3D.

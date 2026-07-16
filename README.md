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
2. Copie `.firebaserc.example` para `.firebaserc`.
3. Troque `SEU_ID_DO_PROJETO_FIREBASE` pelo ID real do projeto.
4. Instale ou use o Firebase CLI.
5. Faça login:

```bash
firebase login
```

6. Publique a partir desta pasta:

```bash
firebase deploy --only hosting
```

O Firebase deve gerar URLs parecidas com:

- `https://SEU_ID_DO_PROJETO_FIREBASE.web.app`
- `https://SEU_ID_DO_PROJETO_FIREBASE.firebaseapp.com`

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

- Atualizar URLs canônicas em `index.html`, `sitemap.xml`, `robots.txt` e páginas internas.
- Revisar política de privacidade e termos antes de usar analytics, anúncios, login ou pagamentos.
- Testar em celular real.
- Validar fórmula com usuários que imprimem em 3D.

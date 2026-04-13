# tools-template

GitHub Pages に公開する各ツール用のテンプレートです。

## 最初に置き換えるもの

- `tool.config.json`
- `.env.local`
- 画面本体の `src/ui/App.tsx`

## ローカル起動

```bash
npm install
npm run dev
```

## GitHub 側の設定

### Actions Variables

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### Pages

- `Settings` -> `Pages`
- `Build and deployment` -> `Source`
- `GitHub Actions`

## Firestore

このテンプレートは次のパスに保存します。

- 未ログイン: `localStorage`
- ログイン時: `users/{uid}/apps/{toolId}`

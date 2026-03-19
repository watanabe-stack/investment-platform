# Claude Code 移行セットアップガイド

## 前提条件（PCに入っていなければインストール）

### 1. Node.js をインストール
https://nodejs.org/ja から LTS版 をダウンロードしてインストール。
インストール後、ターミナル（Macならターミナル.app、Windowsならコマンドプロンプト）で確認：
```
node --version
```
数字が表示されればOK。

### 2. Claude Code をインストール
ターミナルで以下を実行：
```
npm install -g @anthropic-ai/claude-code
```

### 3. Git をインストール（推奨）
https://git-scm.com/ からダウンロード。Vercelデプロイ時に使う。

---

## セットアップ手順

### Step 1: プロジェクトフォルダを作る

ダウンロードしたZIPファイルを展開し、好きな場所に置く。
例: デスクトップに `investment-platform` フォルダ

```
investment-platform/
├── CLAUDE.md          ← Claude Codeが毎回読む設計書
├── current-app.jsx    ← 今のアプリの全コード
├── docs/              ← 8つの投資参考資料
│   ├── 01_期待リターン.md
│   ├── 02_プロスペクト理論.md
│   └── ...
└── SETUP.md           ← このファイル
```

### Step 2: Claude Code を起動

ターミナルでプロジェクトフォルダに移動して起動：
```
cd ~/Desktop/investment-platform
claude
```

### Step 3: Claude Code に最初の指示を出す

Claude Codeが起動したら、以下をそのままコピペ：

```
CLAUDE.mdを読んで、このプロジェクトの概要を理解してください。
次に、current-app.jsx を元にReact + Viteプロジェクトを初期化し、
CLAUDE.mdに記載されたディレクトリ構造に従ってファイルを分割してください。
まずは npm create vite@latest でプロジェクトを作り、
動作する状態にしてから分割を進めてください。
```

Claude Codeが以下を自動で実行します：
- Viteプロジェクトの初期化
- 依存パッケージのインストール
- current-app.jsx を複数ファイルに分割
- 動作確認

### Step 4: ローカルで動作確認

Claude Codeが完了したら：
```
npm run dev
```
ブラウザで http://localhost:5173 を開くとアプリが表示される。

### Step 5: Vercelにデプロイ（ウェブ公開）

1. https://github.com でアカウント作成（未作成なら）
2. https://vercel.com でGitHubアカウントでログイン
3. Claude Codeに以下を指示：
```
このプロジェクトをGitリポジトリとして初期化し、
GitHubにpushできる状態にしてください。
```
4. GitHubにリポジトリを作成してpush
5. Vercelでそのリポジトリをインポート → 自動デプロイ
6. URLが発行され、どこからでもアクセス可能に

---

## 日常の開発フロー

機能追加や修正がしたい時：
```
cd ~/Desktop/investment-platform
claude
```
→ やりたいことを日本語で伝えるだけ

例：
- 「RSIの計算ロジックに期間パラメータを変更できる機能を追加して」
- 「Research Labでニュース取得後に自動でセクター分析を実行するようにして」
- 「バックテスト機能を追加して、過去データでスコアリング戦略の収益を計算させたい」

修正後、GitHubにpushすればVercelが自動でウェブに反映。

---

## トラブルシューティング

- **`command not found: node`** → Node.jsのインストールをやり直す
- **`command not found: claude`** → `npm install -g @anthropic-ai/claude-code` を再実行
- **ビルドエラー** → Claude Codeに「エラーが出た」と伝えてエラーメッセージを貼る。大抵は直してくれる
- **Vercelデプロイ失敗** → Claude Codeに「Vercelでデプロイでエラー」と伝える

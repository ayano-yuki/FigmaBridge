# プログラムファイル詳細解説

このドキュメントでは、Figmaプラグインの主要ファイルである `ui.html`、`code.js`、`manifest.json` について、ファイルごとに役割や構成、主なポイントを詳しく解説します。

---

## 1. figma/ui.html

### 役割
- プラグインのユーザーインターフェース（UI）を定義するHTMLファイルです。
- ユーザーが操作するボタンや表示領域を持ち、JavaScriptでFigma本体とメッセージをやり取りします。

### 主な構成
- `<button id="create-circle">円を作成</button>`：ユーザーがクリックすることで円作成処理を開始
- `<script>`タグ内：
    - ボタンクリック時に `parent.postMessage({ pluginMessage: { type: 'create-circle' } }, '*');` でFigma本体にメッセージ送信
    - Figma本体からのメッセージ（エラーやステータス）を受信し、画面に表示

### ポイント
- UIの見た目や文言は自由にカスタマイズ可能
- Figma本体との通信は `parent.postMessage`/`window.onmessage` で行う

---

## 2. figma/code.js

### 役割
- プラグインのメインロジック（バックエンド）を担うJavaScriptファイルです。
- FigmaのAPIを使って図形の作成や編集などを行います。
- TypeScript（code.ts）からビルドされるファイルです（直接編集しない）。

### 主な構成
- `figma.showUI(__html__, { width: 320, height: 120 });`：UI（ui.html）を表示
- `figma.ui.onmessage = ...`：UIからのメッセージを受信し、処理を実行
- 円作成処理：
    - `figma.createEllipse()` で円を作成
    - `ellipse.x = 0; ellipse.y = 0; ellipse.resize(100, 100);` で位置・サイズを指定
    - `figma.currentPage.appendChild(ellipse);` でキャンバスに追加
    - ステータスメッセージをUIに返す

### ポイント
- Figma APIの各種メソッドが利用可能
- UIとのやり取りは `figma.ui.onmessage`/`figma.ui.postMessage` で行う
- TypeScriptで編集し、ビルドして反映する

---

## 3. figma/manifest.json

### 役割
- プラグインのメタデータやエントリーポイントを定義する設定ファイルです。
- Figmaがプラグインを認識・実行するために必須

### 主な構成
- `name`：プラグイン名
- `id`：一意のプラグインID
- `api`：Figma Plugin APIのバージョン
- `main`：プラグインのメインスクリプト（通常はcode.js）
- `ui`：UIファイル（通常はui.html）
- `editorType`：対応するFigmaエディタ種別

### ポイント
- プラグインの基本情報やエントリーポイントを設定
- UIやメインスクリプトのファイル名を変更した場合はここも修正が必要
- Figmaの仕様に従って正しく記述する

---

この3ファイルを理解・編集することで、Figmaプラグインの基本的なカスタマイズや拡張が可能です。 
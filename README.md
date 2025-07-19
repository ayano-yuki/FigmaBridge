# シンプルなFigma円作成プラグイン

> **このプロジェクトは、Figmaプラグイン開発のためのシンプルなテンプレートです。**
> 
> ボタンを押すと、Figmaキャンバスの(0,0)に直径100の円（Ellipse）が1つ作成されます。

---

## フォルダ構成

```plaintext
./figma
  ├─ manifest.json   # プラグインのマニフェスト
  ├─ code.ts        # TypeScriptソース（編集推奨）
  ├─ code.js        # ビルド後のJavaScript（Figmaで実行）
  └─ ui.html        # プラグインのUI
./tsconfig.json     # TypeScriptビルド設定
./package.json      # 依存・スクリプト
```

## 機能
- 「円を作成」ボタンを押すと、(0,0)に直径100の円が1つ作成されます

## 使い方

```sh
npm install
npx tsc
```

1. 上記コマンドで依存をインストール＆ビルド
2. Figmaで「figma」フォルダをプラグインとして読み込む
3. プラグインを実行し、「円を作成」ボタンを押す

## ビルド・開発
- TypeScriptで開発し、`npx tsc` で `code.js` を生成
- 型定義は `@figma/plugin-typings` を利用
- `figma/tsconfig.json` は不要です（ルートのtsconfig.jsonのみでOK）

## カスタマイズ
- `figma/code.ts` に独自の処理を追加できます
- `figma/ui.html` のUIを自由に編集できます

---

このテンプレートをベースに、さまざまなFigmaプラグイン開発にご活用ください。 
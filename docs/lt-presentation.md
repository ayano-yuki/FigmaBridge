# FigmaBridge LT プレゼンテーション資料

## スライド構成

### スライド 1: タイトル
```
FigmaBridge
Figma Plugin API を使った
デザインデータのエクスポート・インポート

[名前]
[日付]
```

### スライド 2: 自己紹介
```
自己紹介
- [名前]
- [所属]
- フロントエンド開発者
- Figma Plugin 開発に興味
```

### スライド 3: 今日の話
```
今日の話
1. Figma Plugin API とは
2. FigmaBridge の概要
3. 技術的な実装詳細
4. マスク処理の課題
5. 今後の展望
```

---

## スライド 4: Figma Plugin API とは

```
Figma Plugin API
- Figma の機能を拡張するための API
- JavaScript/TypeScript で開発
- ノードの作成・編集・削除が可能
- UI とメインプロセス間で通信
```

### コード例
```typescript
// プラグインの基本構造
figma.showUI(__html__, { width: 400, height: 600 });

// ノードの作成
const rect = figma.createRectangle();
const text = figma.createText();

// プロパティの設定
rect.name = "My Rectangle";
rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
```

---

## スライド 5: FigmaBridge の概要

```
FigmaBridge とは
- Figma のデザインデータを ZIP 形式で
  エクスポート・インポートするプラグイン
- デザインの共有・バックアップ・移行を支援
```

### 機能
- **エクスポート**: 選択ノード / ページ
- **インポート**: ZIP ファイルからノードを復元
- **対応ノード**: フレーム、グループ、テキスト、図形、画像

---

## スライド 6: 技術アーキテクチャ

```
技術スタック
┌─────────────────┐
│   TypeScript    │
├─────────────────┤
│ Figma Plugin API│
├─────────────────┤
│     JSZip       │
├─────────────────┤
│ HTML/CSS/JS     │
└─────────────────┘
```

### ファイル構成
```
FigmaBridge/
├── figma/
│   ├── code.ts          # メインロジック
│   ├── ui.html          # UI
│   └── manifest.json    # 設定
└── docs/                # ドキュメント
```

---

## スライド 7: エクスポート機能の実装

```
エクスポートの流れ
1. ノードのメタデータ生成
2. 画像データの抽出
3. ZIP ファイルの作成
4. ダウンロード
```

### メタデータ生成
```typescript
async function generateNodeMetadata(node: SceneNode) {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    fills: node.fills,
    strokes: node.strokes,
    effects: node.effects,
    isMask: (node as any).isMask
  };
}
```

---

## スライド 8: インポート機能の実装

```
インポートの流れ
1. ZIP ファイルの読み込み
2. メタデータの解析
3. ノードの再作成
4. プロパティの復元
5. 階層構造の復元
```

### ノード作成
```typescript
async function createChildNode(childInfo: any) {
  let node: SceneNode | null = null;
  
  switch (childInfo.type) {
    case 'RECTANGLE':
      node = figma.createRectangle();
      break;
    case 'TEXT':
      node = figma.createText();
      break;
    case 'GROUP':
      node = figma.group([], figma.currentPage);
      break;
  }
  
  await applyNodeProperties(node, childInfo);
  return node;
}
```

---

## スライド 9: マスク処理の課題

```
マスク処理の技術的課題
❌ マスク構造の完全復元が困難
❌ マスク用ノードの順序制御に制限
❌ 複雑なマスク構造の処理が不完全
```

### 問題の原因
```typescript
// 課題1: insertChild の制限
group.insertChild(0, maskNode); // 期待通りに動作しない

// 課題2: isMask プロパティの設定タイミング
node.isMask = true; // グループ作成後に設定が必要

// 課題3: ネストしたマスク
const nestedMask = {
  type: 'GROUP',
  children: [
    { type: 'RECTANGLE', isMask: true },  // 内側のマスク
    { type: 'GROUP', children: [...] }     // マスクされたコンテンツ
  ]
};
```

---

## スライド 10: Figma API の制限

```
Figma API の制限事項
- 読み取り専用プロパティが多い
- グラデーション情報の詳細が取得できない
- アニメーション情報にアクセスできない
- プロトタイプ情報にアクセスできない
- 他のプラグインのデータにアクセスできない
```

### 読み取り専用プロパティ
```typescript
node.id;           // 読み取り専用
node.type;         // 読み取り専用
node.parent;       // 読み取り専用
node.children;     // 読み取り専用
```

---

## スライド 11: パフォーマンス最適化

```
パフォーマンス最適化
✅ バッチ処理による大量ノードの効率化
✅ メモリ管理による大きな画像の処理
✅ エラーハンドリングによる堅牢性の向上
```

### バッチ処理
```typescript
async function processNodesInBatches(nodes: SceneNode[], batchSize = 50) {
  const batches = [];
  for (let i = 0; i < nodes.length; i += batchSize) {
    batches.push(nodes.slice(i, i + batchSize));
  }
  
  for (const batch of batches) {
    await Promise.all(batch.map(node => processNode(node)));
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
```

---

## スライド 12: 今後の改善点

```
今後の改善予定
🚀 マスク処理の完全対応
🚀 グラデーション情報の保存・復元
🚀 プログレス表示の改善
🚀 プレビュー機能の実装
🚀 バッチ処理の効率化
```

### 改善案
```typescript
// マスク処理の完全対応
async function createMaskGroup(maskInfo: any) {
  const maskNode = await createChildNode(maskInfo.mask);
  maskNode.isMask = true;
  
  const contentNodes = await Promise.all(
    maskInfo.content.map(child => createChildNode(child))
  );
  
  const allNodes = [maskNode, ...contentNodes];
  return figma.group(allNodes, figma.currentPage);
}
```

---

## スライド 13: 技術的ハイライト

```
技術的ハイライト
✅ Figma Plugin API の活用
✅ ZIP 形式での効率的なデータ転送
✅ TypeScript による型安全性
✅ 非同期処理による UI ブロッキング回避
✅ 階層構造の保持
✅ 画像データの復元
```

---

## スライド 14: 学んだこと

```
学んだこと
📚 Figma Plugin API の仕組みと制限
📚 大量データの効率的な処理方法
📚 エラーハンドリングの重要性
📚 技術的制約との向き合い方
📚 ドキュメント作成の重要性
```

---

## スライド 15: まとめ

```
まとめ
- Figma Plugin API を使った実用的なプラグイン開発
- 技術的制約を理解し、可能な範囲で最適化
- マスク処理など、今後の課題も明確化
- オープンソースとして継続的に改善予定
```

---

## スライド 16: Q&A

```
Q&A
ご質問・ご意見をお聞かせください！

GitHub: [リポジトリURL]
ドキュメント: /docs/figma-bridge-specification.md
技術詳細: /docs/lt-technical-details.md
```

---

## 補足資料

### デモ用スクリーンショット
- エクスポート前後の比較
- マスク処理の課題例
- エラーハンドリングの例

### 技術的な詳細
- 詳細なコード例は `lt-technical-details.md` を参照
- 完全な仕様書は `figma-bridge-specification.md` を参照

### 発表時の注意点
- 技術的な内容が多いため、視覚的な資料を活用
- コード例は簡潔に、要点を絞って説明
- マスク処理の課題は具体的な例で説明
- 時間配分に注意（15-20分程度を想定）

---

*このプレゼンテーション資料は、技術的な詳細と実装の課題を分かりやすく説明することを目的としています。* 
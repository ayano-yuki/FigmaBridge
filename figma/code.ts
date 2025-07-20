/// <reference types="@figma/plugin-typings" />

// デザインデータの型定義
interface DesignNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  children?: DesignNode[];
  properties?: any;
  imageData?: string; // 画像のbase64データ
}

interface DesignData {
  version: string;
  nodes: DesignNode[];
  images: { [key: string]: string }; // 画像ファイルのマッピング
}

// エクスポート機能のクラス
class DesignExporter {
  private imageCounter = 0;
  private imageHashToFileName: { [hash: string]: string } = {};
  private imagesForExport: { [key: string]: string } = {}; // エクスポート用の画像データを一時的に保存

  // ノードをデザインデータに変換
  private async serializeNode(node: SceneNode, depth = 0, parentType = '', parentX = 0, parentY = 0): Promise<DesignNode> {
    if (node.type === 'GROUP') {
      console.log('[serializeNode] GROUPノード', {
        name: node.name,
        id: node.id,
        parentType,
        depth,
        childrenCount: 'children' in node && node.children ? node.children.length : 0
      });
    }
    // グループの子要素は相対座標で保存
    const designNode: DesignNode = {
      id: node.id,
      name: node.name,
      type: node.type,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height
      // imageDataは廃止
    };

    // 画像処理を先に行い、画像保存・マッピングのみ行う
    await this.processNodeImagesForExport(node);

    // 子ノードがある場合は再帰的に処理
    if ('children' in node && node.children) {
      if (node.type === 'GROUP') {
        // グループの子は相対座標で保存
        designNode.children = await Promise.all(node.children.map(child => this.serializeNode(child, depth + 1, node.type, node.x, node.y)));
        // 各子のx/yを相対座標に変換
        if (designNode.children) {
          for (const child of designNode.children) {
            child.x = child.x - node.x;
            child.y = child.y - node.y;
          }
        }
      } else {
        designNode.children = await Promise.all(node.children.map(child => this.serializeNode(child, depth + 1, node.type, node.x, node.y)));
      }
    }

    // 画像処理後にプロパティを取得
    designNode.properties = this.getNodeProperties(node);

    return designNode;
  }

  // 画像保存・マッピングのみ行う（imageDataはセットしない）
  private async processNodeImagesForExport(node: SceneNode): Promise<void> {
    try {
      await this.processNodeImagesForExportSingle(node);
      if ('children' in node && node.children) {
        for (const child of node.children) {
          try {
            await this.processNodeImagesForExport(child);
          } catch (error) {}
        }
      }
    } catch (error) {}
  }

  // 個別ノードの画像を処理（エクスポート用）
  private async processNodeImagesForExportSingle(node: SceneNode): Promise<void> {
    try {
      if ('fills' in node && node.fills && Array.isArray(node.fills)) {
        const fills = node.fills as Paint[];
        for (const fill of fills) {
          if (fill.type === 'IMAGE' && fill.imageHash) {
            let imageName: string;
            if (this.imageHashToFileName[fill.imageHash]) {
              imageName = this.imageHashToFileName[fill.imageHash];
            } else {
              imageName = `img/image_${this.imageCounter}.png`;
              this.imageHashToFileName[fill.imageHash] = imageName;
              const image = figma.getImageByHash(fill.imageHash);
              if (image) {
                const imageBytes = await image.getBytesAsync();
                const base64Data = this.arrayBufferToBase64(imageBytes);
                this.imagesForExport[imageName] = base64Data;
                this.imageCounter++;
              }
            }
            break; // 画像fillがあれば最初の1つだけ
          }
        }
      }
      // strokes, backgroundsも同様に必要なら追加
    } catch (error) {}
  }

  // ノードのプロパティを取得
  private getNodeProperties(node: SceneNode): any {
    const properties: any = {};

    // テキストノードの処理
    if (node.type === 'TEXT') {
      const textNode = node as TextNode;
      properties.characters = textNode.characters;
      
      // 混合スタイルのチェックと処理
      const hasMixedStyles = 
        textNode.fontName === figma.mixed ||
        textNode.fontSize === figma.mixed ||
        textNode.fills === figma.mixed ||
        textNode.letterSpacing === figma.mixed ||
        textNode.lineHeight === figma.mixed;
      
      // より安全な混合スタイル検出
      let hasMixedStylesSafe = false;
      try {
        const segments = textNode.getStyledTextSegments(['fontName']);
        hasMixedStylesSafe = segments.length > 1;
      } catch (error) {
        hasMixedStylesSafe = hasMixedStyles;
      }
      
                    if (hasMixedStylesSafe) {
        // 混合スタイルの場合はセグメント情報を保存
        try {
          const segments = textNode.getStyledTextSegments([
            'fontName',
            'fontSize', 
            'fills',
            'letterSpacing',
            'lineHeight'
          ]);
          
          // セグメント情報をシリアライズ可能な形式に変換
          properties.styledSegments = segments.map((segment) => {
            return {
              characters: segment.characters,
              start: segment.start,
              end: segment.end,
              fontName: segment.fontName,
              fontSize: segment.fontSize,
              fills: segment.fills,
              letterSpacing: segment.letterSpacing,
              lineHeight: segment.lineHeight
            };
          });
        } catch (error) {
          // エラーが発生した場合は単一スタイルとして処理
          try {
            if (typeof textNode.fontSize === 'number') properties.fontSize = textNode.fontSize;
            if (textNode.fontName && typeof textNode.fontName === 'object') properties.fontName = textNode.fontName;
            if (textNode.fills && Array.isArray(textNode.fills)) properties.fills = textNode.fills;
            if (textNode.strokes && Array.isArray(textNode.strokes)) properties.strokes = textNode.strokes;
            if (typeof textNode.strokeWeight === 'number') properties.strokeWeight = textNode.strokeWeight;
            if (typeof textNode.textAlignHorizontal === 'string') properties.textAlignHorizontal = textNode.textAlignHorizontal;
            if (typeof textNode.textAlignVertical === 'string') properties.textAlignVertical = textNode.textAlignVertical;
            if (typeof textNode.lineHeight === 'number' || typeof textNode.lineHeight === 'object') properties.lineHeight = textNode.lineHeight;
            if (typeof textNode.letterSpacing === 'number' || typeof textNode.letterSpacing === 'object') properties.letterSpacing = textNode.letterSpacing;
          } catch (fallbackError) {
            // フォールバック処理も失敗した場合は何もしない
          }
        }
      } else {
        // 単一スタイルの場合は通常通り保存
        try {
          if (typeof textNode.fontSize === 'number') properties.fontSize = textNode.fontSize;
          if (textNode.fontName && typeof textNode.fontName === 'object') properties.fontName = textNode.fontName;
          if (textNode.fills && Array.isArray(textNode.fills)) properties.fills = textNode.fills;
          if (textNode.strokes && Array.isArray(textNode.strokes)) properties.strokes = textNode.strokes;
          if (typeof textNode.strokeWeight === 'number') properties.strokeWeight = textNode.strokeWeight;
          if (typeof textNode.textAlignHorizontal === 'string') properties.textAlignHorizontal = textNode.textAlignHorizontal;
          if (typeof textNode.textAlignVertical === 'string') properties.textAlignVertical = textNode.textAlignVertical;
          if (typeof textNode.lineHeight === 'number' || typeof textNode.lineHeight === 'object') properties.lineHeight = textNode.lineHeight;
          if (typeof textNode.letterSpacing === 'number' || typeof textNode.letterSpacing === 'object') properties.letterSpacing = textNode.letterSpacing;
        } catch (error) {
          console.warn(`単一スタイルのプロパティ設定中にエラーが発生しました: ${node.name}`, error);
        }
      }
    }

    // 図形ノードの処理
    if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE' || 
        node.type === 'POLYGON' || node.type === 'STAR' || 
        node.type === 'VECTOR' || node.type === 'LINE') {
      if (node.fills && Array.isArray(node.fills)) {
        properties.fills = node.fills.map((fill: any) => {
          if (fill.type === 'IMAGE' && fill.imageHash) {
            // imageHashを除外し、imageData（画像ファイルパス）をimageHashToFileNameから取得
            const { imageHash, ...rest } = fill;
            const imageData = this.imageHashToFileName[fill.imageHash] || '';
            return { ...rest, imageData };
          }
          return fill;
        });
      }
      properties.strokes = node.strokes;
      properties.strokeWeight = node.strokeWeight;
      properties.cornerRadius = 'cornerRadius' in node ? node.cornerRadius : undefined;
    }

    // フレームの処理
    if (node.type === 'FRAME') {
      properties.backgrounds = node.backgrounds;
      properties.layoutMode = node.layoutMode;
      properties.paddingLeft = node.paddingLeft;
      properties.paddingRight = node.paddingRight;
      properties.paddingTop = node.paddingTop;
      properties.paddingBottom = node.paddingBottom;
      properties.itemSpacing = node.itemSpacing;
    }

    // グループの処理
    if (node.type === 'GROUP') {
      // グループの特別な処理は必要に応じて追加
    }

    // マスクの処理
    if (node.type === 'BOOLEAN_OPERATION') {
      properties.booleanOperation = node.booleanOperation;
    }

    return properties;
  }

  // 画像ノードの処理
  private async processNodeImages(node: SceneNode, designNode: DesignNode, imagePaths: string[], images: { [key: string]: string }): Promise<void> {
    try {
      // 塗り（fills）の画像を処理
      if ('fills' in node && node.fills && Array.isArray(node.fills)) {
        const fills = node.fills as Paint[];
        for (const fill of fills) {
          if (fill.type === 'IMAGE' && fill.imageHash) {
            let imageName: string;
            if (this.imageHashToFileName[fill.imageHash]) {
              imageName = this.imageHashToFileName[fill.imageHash];
            } else {
              imageName = `img/image_${this.imageCounter}.png`;
              this.imageHashToFileName[fill.imageHash] = imageName;
              const image = figma.getImageByHash(fill.imageHash);
              if (image) {
                const imageBytes = await image.getBytesAsync();
                const base64Data = this.arrayBufferToBase64(imageBytes);
                images[imageName] = base64Data;
                // デバッグ: 画像保存時の情報を出力
                console.log('[画像保存]', {
                  imageHash: fill.imageHash,
                  imageName,
                  nodeName: node.name,
                  nodeId: node.id
                });
                this.imageCounter++;
              }
            }
            designNode.imageData = imageName;
            imagePaths.push(imageName);
            return; // 1ノードにつき1画像のみ
          }
        }
      }
      // 線（strokes）の画像を処理
      if ('strokes' in node && node.strokes && Array.isArray(node.strokes)) {
        const strokes = node.strokes as Paint[];
        for (const stroke of strokes) {
          if (stroke.type === 'IMAGE' && stroke.imageHash) {
            let imageName: string;
            if (this.imageHashToFileName[stroke.imageHash]) {
              imageName = this.imageHashToFileName[stroke.imageHash];
            } else {
              imageName = `img/image_${this.imageCounter}.png`;
              this.imageHashToFileName[stroke.imageHash] = imageName;
              const image = figma.getImageByHash(stroke.imageHash);
              if (image) {
                const imageBytes = await image.getBytesAsync();
                const base64Data = this.arrayBufferToBase64(imageBytes);
                images[imageName] = base64Data;
                // デバッグ: 画像保存時の情報を出力
                console.log('[画像保存]', {
                  imageHash: stroke.imageHash,
                  imageName,
                  nodeName: node.name,
                  nodeId: node.id
                });
                this.imageCounter++;
              }
            }
            designNode.imageData = imageName;
            imagePaths.push(imageName);
            return; // 1ノードにつき1画像のみ
          }
        }
      }
      // 背景（backgrounds）の画像を処理（フレーム用）
      if ('backgrounds' in node && node.backgrounds && Array.isArray(node.backgrounds)) {
        const backgrounds = node.backgrounds as Paint[];
        for (const background of backgrounds) {
          if (background.type === 'IMAGE' && background.imageHash) {
            let imageName: string;
            if (this.imageHashToFileName[background.imageHash]) {
              imageName = this.imageHashToFileName[background.imageHash];
            } else {
              imageName = `img/image_${this.imageCounter}.png`;
              this.imageHashToFileName[background.imageHash] = imageName;
              const image = figma.getImageByHash(background.imageHash);
              if (image) {
                const imageBytes = await image.getBytesAsync();
                const base64Data = this.arrayBufferToBase64(imageBytes);
                images[imageName] = base64Data;
                // デバッグ: 画像保存時の情報を出力
                console.log('[画像保存]', {
                  imageHash: background.imageHash,
                  imageName,
                  nodeName: node.name,
                  nodeId: node.id
                });
                this.imageCounter++;
              }
            }
            designNode.imageData = imageName;
            imagePaths.push(imageName);
            return; // 1ノードにつき1画像のみ
          }
        }
      }
    } catch (error) {
      // 画像処理エラーは無視
    }
  }

  // ArrayBufferをBase64に変換
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    
    while (i < bytes.length) {
      const byte1 = bytes[i++];
      const byte2 = i < bytes.length ? bytes[i++] : 0;
      const byte3 = i < bytes.length ? bytes[i++] : 0;
      
      const enc1 = byte1 >> 2;
      const enc2 = ((byte1 & 3) << 4) | (byte2 >> 4);
      const enc3 = ((byte2 & 15) << 2) | (byte3 >> 6);
      const enc4 = byte3 & 63;
      
      result += base64Chars[enc1] + base64Chars[enc2] + 
                (i > bytes.length + 1 ? '=' : base64Chars[enc3]) + 
                (i > bytes.length ? '=' : base64Chars[enc4]);
    }
    
    return result;
  }

  // エクスポート実行
  async exportDesign(target: 'selected' | 'current-page'): Promise<DesignData> {
    try {
      let nodes: readonly SceneNode[] = [];

      if (target === 'selected') {
        nodes = figma.currentPage.selection;
        if (nodes.length === 0) {
          throw new Error('エクスポート対象のノードが選択されていません');
        }
      } else {
        nodes = figma.currentPage.children;
      }

      this.imagesForExport = {}; // 画像マップを初期化
      this.imageHashToFileName = {}; // マッピングも初期化
      this.imageCounter = 0;

      const designNodes: DesignNode[] = [];
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const designNode = await this.serializeNode(node, 0, 'PAGE', 0, 0);
        designNodes.push(designNode);
      }

      // imagesに全画像データを含めて返す
      const result = {
        version: '1.0.0',
        nodes: designNodes,
        images: this.imagesForExport
      };

      // デバッグ: imageHashToFileNameマップの内容を出力
      console.log('[imageHashToFileNameマップ]', this.imageHashToFileName);
      // デバッグ: エクスポートjsonのimageData一覧を出力
      const allImageData: string[] = [];
      const collectImageData = (nodes: any[]) => {
        for (const n of nodes) {
          if (n.properties && n.properties.fills) {
            for (const f of n.properties.fills) {
              if (f.type === 'IMAGE') allImageData.push(f.imageData);
            }
          }
          if (n.children) collectImageData(n.children);
        }
      };
      collectImageData(designNodes);
      console.log('エクスポートjsonのimageData一覧:', allImageData);

      return result;
    } catch (error) {
      throw error;
    }
  }
}

// インポート機能のクラス
class DesignImporter {
  // デザインデータからノードを再作成
  private async createNodeFromData(nodeData: DesignNode, imageMap: { [key: string]: string }, depth = 0, parentAbsX = 0, parentAbsY = 0): Promise<SceneNode> {
    console.log('createNodeFromData START', { id: nodeData.id, name: nodeData.name, type: nodeData.type, depth });
    let node: SceneNode;

    switch (nodeData.type) {
      case 'FRAME':
        node = figma.createFrame();
        break;
      case 'TEXT':
        node = figma.createText();
        break;
      case 'RECTANGLE':
        node = figma.createRectangle();
        break;
      case 'ELLIPSE':
        node = figma.createEllipse();
        break;
      case 'POLYGON':
        node = figma.createPolygon();
        break;
      case 'STAR':
        node = figma.createStar();
        break;
      case 'VECTOR':
        node = figma.createVector();
        break;
      case 'LINE':
        node = figma.createLine();
        break;
      case 'GROUP':
        // グループは子ノードを作成後に作成するため、一時的にフレームを作成
        node = figma.createFrame();
        break;
      default:
        throw new Error(`未対応のノードタイプ: ${nodeData.type}`);
    }

    // 基本プロパティを設定
    node.name = nodeData.name;
    if (nodeData.type === 'GROUP') {
      node.x = nodeData.x + parentAbsX;
      node.y = nodeData.y + parentAbsY;
    } else {
      node.x = nodeData.x;
      node.y = nodeData.y;
    }
    node.resize(nodeData.width, nodeData.height);

    // ノード固有のプロパティを設定
    await this.applyNodeProperties(node, nodeData, imageMap);

    // 画像を適用
    await this.applyImageToNode(node, nodeData, imageMap);

    // 子ノードを再帰的に作成
    if (nodeData.children && nodeData.children.length > 0) {
      console.log('createNodeFromData children', { id: nodeData.id, count: nodeData.children.length, depth });
      const childNodes: SceneNode[] = [];
      for (const childData of nodeData.children) {
        try {
          console.log('createNodeFromData RECURSE ENTER', { parentId: nodeData.id, childId: childData.id, depth: depth + 1 });
          let childNode;
          if (nodeData.type === 'GROUP') {
            // グループの子は相対→絶対
            childNode = await this.createNodeFromData(childData, imageMap, depth + 1, node.x, node.y);
          } else {
            // それ以外は絶対座標のまま
            childNode = await this.createNodeFromData(childData, imageMap, depth + 1, 0, 0);
          }
          childNodes.push(childNode);
          console.log('createNodeFromData RECURSE EXIT', { parentId: nodeData.id, childId: childData.id, depth: depth + 1 });
        } catch (e) {
          console.error('createNodeFromData RECURSE ERROR', { parentId: nodeData.id, childId: childData.id, depth: depth + 1, error: e });
        }
      }
      // GROUPもFRAME同様にappendChildで子ノードを追加
      if (nodeData.type === 'GROUP' || node.type === 'FRAME') {
        const frame = node as FrameNode;
        for (const childNode of childNodes) {
          frame.appendChild(childNode);
        }
      }
    }
    console.log('createNodeFromData END', { id: nodeData.id, name: nodeData.name, type: nodeData.type, depth });
    return node;
  }

  // 混合スタイルのテキストセグメントを適用
  private async applyStyledTextSegments(textNode: TextNode, styledSegments: any[]): Promise<void> {
    for (let i = 0; i < styledSegments.length; i++) {
      const segment = styledSegments[i];
      const start = segment.start;
      const end = segment.end;
      
      try {
        // フォントを読み込む
        if (segment.fontName) {
          try {
            await figma.loadFontAsync(segment.fontName);
            textNode.setRangeFontName(start, end, segment.fontName);
          } catch (error) {
            // デフォルトフォントでフォールバック
            try {
              await figma.loadFontAsync({ family: "Inter", style: "Regular" });
              textNode.setRangeFontName(start, end, { family: "Inter", style: "Regular" });
            } catch (fallbackError) {
              // デフォルトフォントの読み込みにも失敗した場合は何もしない
            }
          }
        }
        
        // その他のスタイルを適用
        if (segment.fontSize) {
          textNode.setRangeFontSize(start, end, segment.fontSize);
        }
        
        if (segment.fills) {
          textNode.setRangeFills(start, end, segment.fills);
        }
        
        if (segment.letterSpacing) {
          textNode.setRangeLetterSpacing(start, end, segment.letterSpacing);
        }
        
        if (segment.lineHeight) {
          textNode.setRangeLineHeight(start, end, segment.lineHeight);
        }
      } catch (error) {
        // セグメント処理エラーは無視
      }
    }
  }

  // ノードのプロパティを適用
  private async applyNodeProperties(node: SceneNode, nodeData: DesignNode, imageMap: { [key: string]: string }): Promise<void> {
    // デバッグ: ノード名・typeを出力
    console.log('applyNodeProperties呼び出し:', node.name, node.type);
    if (!nodeData.properties) return;

    const props = nodeData.properties;

    // テキストノードの処理
    if (node.type === 'TEXT') {
      const textNode = node as TextNode;
      
      // フォントを先に読み込む（確実に完了するまで待機）
      let fontLoaded = false;
      if (props.fontName && props.fontName !== figma.mixed) {
        try {
          await figma.loadFontAsync(props.fontName);
          textNode.fontName = props.fontName;
          fontLoaded = true;
        } catch (error) {
          // フォント読み込みに失敗した場合はデフォルトフォントを使用
          try {
            await figma.loadFontAsync({ family: "Inter", style: "Regular" });
            textNode.fontName = { family: "Inter", style: "Regular" };
            fontLoaded = true;
          } catch (fallbackError) {
            // デフォルトフォントの読み込みにも失敗した場合は何もしない
          }
        }
      } else {
        // フォント名がない場合はデフォルトフォントを使用
        try {
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });
          textNode.fontName = { family: "Inter", style: "Regular" };
          fontLoaded = true;
        } catch (error) {
          // デフォルトフォントの読み込みに失敗した場合は何もしない
        }
      }
      
      // フォントが読み込まれた後にテキストを設定
      if (fontLoaded && props.characters) {
        try {
          textNode.characters = props.characters;
        } catch (error) {
          // テキスト設定エラーは無視
        }
      }
      
      // 混合スタイルの処理
      if (props.styledSegments && Array.isArray(props.styledSegments)) {
        await this.applyStyledTextSegments(textNode, props.styledSegments);
      } else {
        // 単一スタイルの処理（フォント読み込み後に実行）
        if (fontLoaded) {
                  if (props.fontSize && props.fontSize !== figma.mixed) {
          try {
            textNode.fontSize = props.fontSize;
          } catch (error) {
            // フォントサイズ設定エラーは無視
          }
        }
          
          if (props.fills && props.fills !== figma.mixed) {
            textNode.fills = props.fills;
          }
          
          if (props.strokes && props.strokes !== figma.mixed) {
            textNode.strokes = props.strokes;
          }
          
          if (props.strokeWeight && props.strokeWeight !== figma.mixed) {
            textNode.strokeWeight = props.strokeWeight;
          }
          
          if (props.textAlignHorizontal && props.textAlignHorizontal !== figma.mixed) {
            textNode.textAlignHorizontal = props.textAlignHorizontal;
          }
          
          if (props.textAlignVertical && props.textAlignVertical !== figma.mixed) {
            textNode.textAlignVertical = props.textAlignVertical;
          }
          
          if (props.lineHeight && props.lineHeight !== figma.mixed) {
            textNode.lineHeight = props.lineHeight;
          }
          
          if (props.letterSpacing && props.letterSpacing !== figma.mixed) {
            textNode.letterSpacing = props.letterSpacing;
          }
        }
      }
    }

    // 図形ノードの処理
    if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE' || 
        node.type === 'POLYGON' || node.type === 'STAR' || 
        node.type === 'VECTOR' || node.type === 'LINE') {
      if (props.fills && Array.isArray(props.fills)) {
        const newFills: Paint[] = [];
        for (const fill of props.fills) {
          if (fill.type === 'IMAGE') {
            // デバッグ: fill.imageDataとimageMapの有無を出力
            console.log('fill.imageData:', fill.imageData);
            console.log('imageMap[fill.imageData]の有無:', !!imageMap[fill.imageData]);
            if (fill.imageData && imageMap[fill.imageData]) {
              // imageDataから画像を生成し、imageHashをセット
              const imageBytes = this.base64ToUint8Array(imageMap[fill.imageData]);
              // ログ出力
              console.log('受信したUint8Array(先頭10個):', Array.from(imageBytes.slice(0, 10)));
              const image = figma.createImage(imageBytes);
              const { imageData, ...rest } = fill;
              newFills.push({
                ...rest,
                imageHash: image.hash
              } as ImagePaint);
              // imageDataはDesignNode側のプロパティとして保持
              if (!(node as any).imageData) {
                (node as any).imageData = fill.imageData;
              }
            }
            // imageDataやimageMapがなければpushしない
          } else {
            // 画像以外、またはimageDataがない場合はそのまま
            const { imageData, ...rest } = fill;
            newFills.push(rest);
          }
        }
        node.fills = newFills;
      }
      if (props.strokes) node.strokes = props.strokes;
      if (props.strokeWeight) node.strokeWeight = props.strokeWeight;
      if (props.cornerRadius && 'cornerRadius' in node) {
        (node as RectangleNode).cornerRadius = props.cornerRadius;
      }
    }

    // フレームの処理
    if (node.type === 'FRAME') {
      const frame = node as FrameNode;
      if (props.backgrounds) frame.backgrounds = props.backgrounds;
      if (props.layoutMode) frame.layoutMode = props.layoutMode;
      if (props.paddingLeft) frame.paddingLeft = props.paddingLeft;
      if (props.paddingRight) frame.paddingRight = props.paddingRight;
      if (props.paddingTop) frame.paddingTop = props.paddingTop;
      if (props.paddingBottom) frame.paddingBottom = props.paddingBottom;
      if (props.itemSpacing) frame.itemSpacing = props.itemSpacing;
    }
  }

  // 画像をノードに適用
  private async applyImageToNode(node: SceneNode, nodeData: DesignNode, imageMap: { [key: string]: string }): Promise<void> {
    // デバッグ: ノード名・typeを出力
    console.log('applyImageToNode呼び出し:', node.name, node.type);
    if (nodeData.imageData && imageMap[nodeData.imageData]) {
      try {
        const imageBytes = this.base64ToUint8Array(imageMap[nodeData.imageData]);
        // ログ出力
        console.log('受信したUint8Array(先頭10個):', Array.from(imageBytes.slice(0, 10)));
        const image = figma.createImage(imageBytes);
        
        // 画像を適用できるノードタイプを拡張
        if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE' || 
            node.type === 'POLYGON' || node.type === 'STAR' || 
            node.type === 'VECTOR' || node.type === 'FRAME') {
          // fillsプロパティを持つノードに画像を適用
          if ('fills' in node) {
            node.fills = [{
              type: 'IMAGE',
              imageHash: image.hash,
              scaleMode: 'FILL'
            } as ImagePaint];
          }
        }
      } catch (error) {
        // 画像適用エラーは無視
      }
    }

    // fillsの各要素にimageDataがある場合の処理
    if (nodeData.properties && nodeData.properties.fills && Array.isArray(nodeData.properties.fills)) {
      try {
        const newFills: Paint[] = [];
        
        for (const fill of nodeData.properties.fills) {
          if (fill.type === 'IMAGE' && fill.imageData && imageMap[fill.imageData]) {
            // 画像データをバイナリに変換してfigma.createImage()で画像を生成
            const imageBytes = this.base64ToUint8Array(imageMap[fill.imageData]);
            // ログ出力
            console.log('受信したUint8Array(先頭10個):', Array.from(imageBytes.slice(0, 10)));
            const image = figma.createImage(imageBytes);
            
            // imageHashをセットしてimageDataを削除
            const { imageData, ...rest } = fill;
            newFills.push({
              ...rest,
              imageHash: image.hash
            } as ImagePaint);
          } else {
            // 画像以外のfillはそのまま
            newFills.push(fill);
          }
        }
        
        // 新しいfillsをノードに適用
        if ('fills' in node && newFills.length > 0) {
          node.fills = newFills;
        }
      } catch (error) {
        // 画像処理エラーは無視
      }
    }
  }

  // Base64をUint8Arrayに変換
  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  // インポート実行
  async importDesign(designData: DesignData, imageMap: { [key: string]: string }): Promise<void> {
    // デバッグ: imageMapのキー一覧を出力
    console.log('受信したimageMapのキー一覧:', Object.keys(imageMap));
    const createdNodes: SceneNode[] = [];

    for (const nodeData of designData.nodes) {
      try {
        const node = await this.createNodeFromData(nodeData, imageMap);
        createdNodes.push(node);
      } catch (error) {
        console.error(`ノードの作成中にエラーが発生しました: ${nodeData.name}`, error);
      }
    }

    // 作成されたノードを選択状態にする
    if (createdNodes.length > 0) {
      figma.currentPage.selection = createdNodes;
      figma.viewport.scrollAndZoomIntoView(createdNodes);
    }
  }
}

// メイン処理
const exporter = new DesignExporter();
const importer = new DesignImporter();

figma.showUI(__html__, { width: 400, height: 300 });

figma.ui.onmessage = async (msg) => {
  try {
    switch (msg.type) {
      case 'export':
        const designData = await exporter.exportDesign(msg.target);
        
        // 画像処理の結果を報告
        const imageCount = Object.keys(designData.images).length;
        figma.ui.postMessage({ 
          type: 'export-success', 
          data: designData,
          imageCount: imageCount
        });
        break;

      case 'import':
        await importer.importDesign(msg.designData, msg.imageMap);
        figma.ui.postMessage({ type: 'import-success' });
        break;

      default:
        throw new Error(`未対応のメッセージタイプ: ${msg.type}`);
    }
  } catch (error: any) {
    const errorMessage = (error as Error).message || String(error);
    figma.ui.postMessage({ 
      type: msg.type === 'export' ? 'export-error' : 'import-error', 
      message: errorMessage 
    });
  }
}; 
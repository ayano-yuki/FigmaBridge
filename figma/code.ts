/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, { width: 640, height: 650 });

figma.ui.onmessage = async (msg) => {
  try {
    switch (msg.type) {
      case 'export-zip':
        await exportToZip(msg.exportType);
        break;
      case 'import-zip':
        await importFromZip(msg.data);
        break;
      default:
        throw new Error('不明なメッセージタイプです');
    }
  } catch (error: any) {
    figma.ui.postMessage({ type: 'error', message: error.message || String(error) });
  }
};

// フレーム内に画像があるかどうかをチェックする関数
function hasImageInFrame(frame: FrameNode): boolean {
  const checkNode = (node: SceneNode): boolean => {
    // 画像フィルを持つノードをチェック
    if ('fills' in node && node.fills && Array.isArray(node.fills)) {
      const hasImageFill = node.fills.some(fill => fill.type === 'IMAGE');
      if (hasImageFill) {
        return true;
      }
    }
    
    // 画像ハッシュを持つノードをチェック
    if ('imageHash' in node && node.imageHash) {
      return true;
    }
    
    // 子ノードがある場合は再帰的にチェック（フレーム、グループ、コンポーネントなど）
    if ('children' in node && node.children) {
      for (const child of node.children) {
        if (checkNode(child)) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  return checkNode(frame);
}

// フレーム内の画像ノードを取得する関数
function getImageNodesInFrame(frame: FrameNode): SceneNode[] {
  const imageNodes: SceneNode[] = [];
  
  const collectImageNodes = (node: SceneNode) => {
    // 画像フィルを持つノードをチェック
    if ('fills' in node && node.fills && Array.isArray(node.fills)) {
      const hasImageFill = node.fills.some(fill => fill.type === 'IMAGE');
      if (hasImageFill) {
        imageNodes.push(node);
      }
    }
    
    // 画像ハッシュを持つノードをチェック
    if ('imageHash' in node && node.imageHash) {
      imageNodes.push(node);
    }
    
    // 子ノードがある場合は再帰的にチェック（フレーム、グループ、コンポーネントなど）
    if ('children' in node && node.children) {
      for (const child of node.children) {
        collectImageNodes(child);
      }
    }
  };
  
  collectImageNodes(frame);
  return imageNodes;
}

// グループ内に画像があるかどうかをチェックする関数
function hasImageInGroup(group: GroupNode): boolean {
  const checkNode = (node: SceneNode): boolean => {
    // 画像フィルを持つノードをチェック
    if ('fills' in node && node.fills && Array.isArray(node.fills)) {
      const hasImageFill = node.fills.some(fill => fill.type === 'IMAGE');
      if (hasImageFill) {
        return true;
      }
    }
    
    // 画像ハッシュを持つノードをチェック
    if ('imageHash' in node && node.imageHash) {
      return true;
    }
    
    // 子ノードがある場合は再帰的にチェック
    if ('children' in node && node.children) {
      for (const child of node.children) {
        if (checkNode(child)) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  return checkNode(group);
}

// グループ内の画像ノードを取得する関数
function getImageNodesInGroup(group: GroupNode): SceneNode[] {
  const imageNodes: SceneNode[] = [];
  
  const collectImageNodes = (node: SceneNode) => {
    // 画像フィルを持つノードをチェック
    if ('fills' in node && node.fills && Array.isArray(node.fills)) {
      const hasImageFill = node.fills.some(fill => fill.type === 'IMAGE');
      if (hasImageFill) {
        imageNodes.push(node);
      }
    }
    
    // 画像ハッシュを持つノードをチェック
    if ('imageHash' in node && node.imageHash) {
      imageNodes.push(node);
    }
    
    // 子ノードがある場合は再帰的にチェック
    if ('children' in node && node.children) {
      for (const child of node.children) {
        collectImageNodes(child);
      }
    }
  };
  
  collectImageNodes(group);
  return imageNodes;
}

async function exportToZip(exportType: string) {
  let nodes: readonly SceneNode[] = [];
  let metadata: any = {};

  switch (exportType) {
    case 'selected':
      if (figma.currentPage.selection.length === 0) {
        throw new Error('エクスポートするノードを選択してください');
      }
      nodes = figma.currentPage.selection;
      metadata = {
        type: 'selected',
        count: nodes.length,
        exportDate: new Date().toISOString()
      };
      break;

    case 'page':
      const page = figma.currentPage;
      nodes = page.children;
      if (nodes.length === 0) {
        throw new Error('現在のページにエクスポート可能なノードがありません');
      }
      metadata = {
        type: 'page',
        pageName: page.name,
        count: nodes.length,
        exportDate: new Date().toISOString()
      };
      break;

    case 'file':
      const pages = figma.root.children;
      const allNodes: SceneNode[] = [];
      for (const page of pages) {
        allNodes.push(...page.children);
      }
      nodes = allNodes;
      if (nodes.length === 0) {
        throw new Error('ファイルにエクスポート可能なノードがありません');
      }
      metadata = {
        type: 'file',
        pageCount: pages.length,
        totalCount: nodes.length,
        exportDate: new Date().toISOString()
      };
      break;

    default:
      throw new Error('無効なエクスポートタイプです');
  }

  const exportSettings: ExportSettings = {
    format: 'PNG',
    constraint: { type: 'SCALE', value: 2 }
  };

  const results = await Promise.all(
    nodes.map(async (node) => {
      try {
        // シンボルやコンポーネントインスタンスの場合は特別処理
        const nodeType = node.type as string;
        if (nodeType === 'INSTANCE' || nodeType === 'COMPONENT') {
          console.log(`Processing symbol/component: ${node.name} (${nodeType})`);
          const nodeMetadata: any = {
            id: node.id,
            name: node.name,
            type: nodeType,
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
            visible: node.visible,
            locked: node.locked,
            isSymbol: true,
            symbolType: nodeType,
            folderType: null,
            fileExtension: null,
            hasImageFile: false
          };
          
          // シンボルの基本情報のみ保存
          if (nodeType === 'INSTANCE') {
            const instanceNode = node as any;
            nodeMetadata.mainComponent = instanceNode.mainComponent ? {
              id: instanceNode.mainComponent.id,
              name: instanceNode.mainComponent.name
            } : null;
          }
          
          return {
            name: node.name || 'unnamed',
            metadata: nodeMetadata,
            bytes: null
          };
        }
        
        const nodeMetadata: any = {
          id: node.id,
          name: node.name,
          type: node.type,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          visible: node.visible,
          locked: node.locked
        };

        // 安全にプロパティを追加
        try {
          if ('rotation' in node) nodeMetadata.rotation = node.rotation;
        } catch (e) {}
        
        try {
          if ('constraints' in node) nodeMetadata.constraints = node.constraints;
        } catch (e) {}
        
        try {
          if ('layoutAlign' in node) nodeMetadata.layoutAlign = node.layoutAlign;
        } catch (e) {}
        
        try {
          if ('layoutGrow' in node) nodeMetadata.layoutGrow = node.layoutGrow;
        } catch (e) {}
        
        try {
          if ('cornerRadius' in node) nodeMetadata.cornerRadius = node.cornerRadius;
        } catch (e) {}
        
        try {
          if ('strokeWeight' in node) nodeMetadata.strokeWeight = node.strokeWeight;
        } catch (e) {}
        
        try {
          if ('strokeAlign' in node) nodeMetadata.strokeAlign = node.strokeAlign;
        } catch (e) {}
        
        try {
          if ('strokeCap' in node) nodeMetadata.strokeCap = node.strokeCap;
        } catch (e) {}
        
        try {
          if ('strokeJoin' in node) nodeMetadata.strokeJoin = node.strokeJoin;
        } catch (e) {}
        
        try {
          if ('dashPattern' in node) nodeMetadata.dashPattern = node.dashPattern;
        } catch (e) {}
        
        try {
          if ('pointCount' in node) nodeMetadata.pointCount = node.pointCount;
        } catch (e) {}
        
        try {
          if ('innerRadius' in node) nodeMetadata.innerRadius = node.innerRadius;
        } catch (e) {}
        
        try {
          if ('booleanOperation' in node) nodeMetadata.booleanOperation = node.booleanOperation;
        } catch (e) {}
        
        try {
          if ('blendMode' in node) nodeMetadata.blendMode = node.blendMode;
        } catch (e) {}
        
        try {
          if ('opacity' in node) nodeMetadata.opacity = node.opacity;
        } catch (e) {}
        
        try {
          if ('clipsContent' in node) {
            nodeMetadata.clipsContent = node.clipsContent;
            
            // クリッピングマスクの詳細情報を保存
            if (node.clipsContent && node.parent) {
              nodeMetadata.clippingMask = {
                enabled: node.clipsContent,
                parentId: node.parent.id,
                parentName: node.parent.name,
                parentType: node.parent.type,
                // マスクの形状情報（親ノードの形状に基づく）
                maskShape: {
                  type: node.parent.type,
                  width: 'width' in node.parent ? node.parent.width : null,
                  height: 'height' in node.parent ? node.parent.height : null,
                  x: 'x' in node.parent ? node.parent.x : null,
                  y: 'y' in node.parent ? node.parent.y : null,
                  cornerRadius: node.parent.type === 'RECTANGLE' ? (node.parent as RectangleNode).cornerRadius : null,
                  // 楕円の場合は特別な処理
                  isEllipse: node.parent.type === 'ELLIPSE'
                }
              };
            }
          }
        } catch (e) {}
        
        try {
          if ('layoutMode' in node) nodeMetadata.layoutMode = node.layoutMode;
        } catch (e) {}
        
        try {
          if ('paddingLeft' in node) nodeMetadata.paddingLeft = node.paddingLeft;
        } catch (e) {}
        
        try {
          if ('paddingRight' in node) nodeMetadata.paddingRight = node.paddingRight;
        } catch (e) {}
        
        try {
          if ('paddingTop' in node) nodeMetadata.paddingTop = node.paddingTop;
        } catch (e) {}
        
        try {
          if ('paddingBottom' in node) nodeMetadata.paddingBottom = node.paddingBottom;
        } catch (e) {}
        
        try {
          if ('itemSpacing' in node) nodeMetadata.itemSpacing = node.itemSpacing;
        } catch (e) {}
        
        try {
          if ('primaryAxisAlignItems' in node) nodeMetadata.primaryAxisAlignItems = node.primaryAxisAlignItems;
        } catch (e) {}
        
        try {
          if ('counterAxisAlignItems' in node) nodeMetadata.counterAxisAlignItems = node.counterAxisAlignItems;
        } catch (e) {}
        
        try {
          if ('layoutSizingHorizontal' in node) nodeMetadata.layoutSizingHorizontal = node.layoutSizingHorizontal;
        } catch (e) {}
        
        try {
          if ('layoutSizingVertical' in node) nodeMetadata.layoutSizingVertical = node.layoutSizingVertical;
        } catch (e) {}
        
        // 変換情報（安全に処理）
        try {
          nodeMetadata.absoluteTransform = node.absoluteTransform;
          nodeMetadata.relativeTransform = node.relativeTransform;
        } catch (e) {}
        
        // 塗りつぶし情報（安全に処理）
        try {
          if ('fills' in node && node.fills && Array.isArray(node.fills)) {
            nodeMetadata.fills = node.fills.map(fill => {
              const fillInfo: any = {
                type: fill.type,
                visible: fill.visible,
                opacity: fill.opacity
              };
              
              if (fill.type === 'SOLID') {
                fillInfo.color = fill.color;
              } else if (fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL') {
                fillInfo.type = fill.type;
                fillInfo.visible = fill.visible;
                fillInfo.opacity = fill.opacity;
              }
              
              return fillInfo;
            });
          }
        } catch (e) {
          console.warn(`Failed to process fills for node: ${node.name}`);
        }
        
        // ストローク情報（安全に処理）
        try {
          if ('strokes' in node && node.strokes && Array.isArray(node.strokes)) {
            nodeMetadata.strokes = node.strokes.map(stroke => {
              const strokeInfo: any = {
                type: stroke.type,
                visible: stroke.visible,
                opacity: stroke.opacity
              };
              
              if (stroke.type === 'SOLID') {
                strokeInfo.color = stroke.color;
              }
              
              if ('weight' in stroke) {
                strokeInfo.weight = stroke.weight;
              }
              if ('align' in stroke) {
                strokeInfo.align = stroke.align;
              }
              if ('dashPattern' in stroke) {
                strokeInfo.dashPattern = stroke.dashPattern;
              }
              
              return strokeInfo;
            });
          }
        } catch (e) {
          console.warn(`Failed to process strokes for node: ${node.name}`);
        }
        
        // エフェクト情報（安全に処理）
        try {
          if ('effects' in node && node.effects && Array.isArray(node.effects)) {
            nodeMetadata.effects = node.effects.map(effect => ({
              type: effect.type,
              visible: effect.visible,
              radius: effect.radius,
              color: effect.color,
              offset: effect.offset,
              spread: effect.spread,
              blendMode: effect.blendMode
            }));
          }
        } catch (e) {
          console.warn(`Failed to process effects for node: ${node.name}`);
        }

        // グループ化されたノードの情報を追加
        if (node.parent && node.parent.type === 'GROUP') {
          nodeMetadata.isInGroup = true;
          nodeMetadata.groupId = node.parent.id;
          nodeMetadata.groupName = node.parent.name;
          nodeMetadata.groupIndex = node.parent.children?.indexOf(node) || 0;
        }
        
        // フレーム内のノードの情報を追加
        if (node.parent && node.parent.type === 'FRAME') {
          nodeMetadata.isInFrame = true;
          nodeMetadata.frameId = node.parent.id;
          nodeMetadata.frameName = node.parent.name;
          nodeMetadata.frameIndex = node.parent.children?.indexOf(node) || 0;
        }
        
        // コンポーネント内のノードの情報を追加
        if (node.parent && node.parent.type === 'COMPONENT') {
          nodeMetadata.isInComponent = true;
          nodeMetadata.componentId = node.parent.id;
          nodeMetadata.componentName = node.parent.name;
          nodeMetadata.componentIndex = node.parent.children?.indexOf(node) || 0;
        }
        
        // グループノードの場合、グループ構造の情報を追加
        if (node.type === 'GROUP') {
          const groupNode = node as GroupNode;
          nodeMetadata.groupStructure = {
            id: groupNode.id,
            name: groupNode.name,
            children: groupNode.children?.map((child, index) => ({
              id: child.id,
              name: child.name,
              type: child.type,
              index: index,
              x: child.x - groupNode.x, // グループ内での相対位置
              y: child.y - groupNode.y,
              width: child.width,
              height: child.height,
              visible: child.visible,
              locked: child.locked,
              rotation: 'rotation' in child ? child.rotation : null,
              opacity: 'opacity' in child ? child.opacity : null,
              fills: 'fills' in child && child.fills ? child.fills : null,
              strokes: 'strokes' in child && child.strokes ? child.strokes : null,
              effects: 'effects' in child && child.effects ? child.effects : null,
              cornerRadius: child.type === 'RECTANGLE' ? (child as RectangleNode).cornerRadius : null,
              strokeWeight: 'strokeWeight' in child ? child.strokeWeight : null,
              strokeAlign: 'strokeAlign' in child ? child.strokeAlign : null,
              strokeCap: 'strokeCap' in child ? child.strokeCap : null,
              strokeJoin: 'strokeJoin' in child ? child.strokeJoin : null,
              dashPattern: 'dashPattern' in child ? child.dashPattern : null,
              // テキストノードの場合はテキスト情報も保存
              textContent: child.type === 'TEXT' ? (child as TextNode).characters : null,
              fontName: child.type === 'TEXT' ? (child as TextNode).fontName : null,
              fontSize: child.type === 'TEXT' ? (child as TextNode).fontSize : null,
              lineHeight: child.type === 'TEXT' ? (child as TextNode).lineHeight : null,
              letterSpacing: child.type === 'TEXT' ? (child as TextNode).letterSpacing : null,
              textAlignHorizontal: child.type === 'TEXT' ? (child as TextNode).textAlignHorizontal : null,
              textAlignVertical: child.type === 'TEXT' ? (child as TextNode).textAlignVertical : null,
              textAutoResize: child.type === 'TEXT' ? (child as TextNode).textAutoResize : null,
              textCase: child.type === 'TEXT' ? (child as TextNode).textCase : null,
              textDecoration: child.type === 'TEXT' ? (child as TextNode).textDecoration : null,
              paragraphIndent: child.type === 'TEXT' ? (child as TextNode).paragraphIndent : null,
              paragraphSpacing: child.type === 'TEXT' ? (child as TextNode).paragraphSpacing : null,
              textFills: child.type === 'TEXT' && 'fills' in child && child.fills ? child.fills : null,
              textStrokes: child.type === 'TEXT' && 'strokes' in child && child.strokes ? child.strokes : null,
              textEffects: child.type === 'TEXT' && 'effects' in child && child.effects ? child.effects : null,
              // クリッピングマスク情報
              clipsContent: 'clipsContent' in child ? child.clipsContent : null
            })) || []
          };
        }
        
        // フレームノードの場合、フレーム構造の情報を追加
        if (node.type === 'FRAME') {
          const frameNode = node as FrameNode;
          nodeMetadata.frameStructure = {
            id: frameNode.id,
            name: frameNode.name,
            children: frameNode.children?.map((child, index) => ({
              id: child.id,
              name: child.name,
              type: child.type,
              index: index,
              x: child.x - frameNode.x, // フレーム内での相対位置
              y: child.y - frameNode.y,
              width: child.width,
              height: child.height,
              visible: child.visible,
              locked: child.locked,
              rotation: 'rotation' in child ? child.rotation : null,
              opacity: 'opacity' in child ? child.opacity : null,
              fills: 'fills' in child && child.fills ? child.fills : null,
              strokes: 'strokes' in child && child.strokes ? child.strokes : null,
              effects: 'effects' in child && child.effects ? child.effects : null,
              cornerRadius: child.type === 'RECTANGLE' ? (child as RectangleNode).cornerRadius : null,
              strokeWeight: 'strokeWeight' in child ? child.strokeWeight : null,
              strokeAlign: 'strokeAlign' in child ? child.strokeAlign : null,
              strokeCap: 'strokeCap' in child ? child.strokeCap : null,
              strokeJoin: 'strokeJoin' in child ? child.strokeJoin : null,
              dashPattern: 'dashPattern' in child ? child.dashPattern : null,
              // テキストノードの場合はテキスト情報も保存
              textContent: child.type === 'TEXT' ? (child as TextNode).characters : null,
              fontName: child.type === 'TEXT' ? (child as TextNode).fontName : null,
              fontSize: child.type === 'TEXT' ? (child as TextNode).fontSize : null,
              lineHeight: child.type === 'TEXT' ? (child as TextNode).lineHeight : null,
              letterSpacing: child.type === 'TEXT' ? (child as TextNode).letterSpacing : null,
              textAlignHorizontal: child.type === 'TEXT' ? (child as TextNode).textAlignHorizontal : null,
              textAlignVertical: child.type === 'TEXT' ? (child as TextNode).textAlignVertical : null,
              textAutoResize: child.type === 'TEXT' ? (child as TextNode).textAutoResize : null,
              textCase: child.type === 'TEXT' ? (child as TextNode).textCase : null,
              textDecoration: child.type === 'TEXT' ? (child as TextNode).textDecoration : null,
              paragraphIndent: child.type === 'TEXT' ? (child as TextNode).paragraphIndent : null,
              paragraphSpacing: child.type === 'TEXT' ? (child as TextNode).paragraphSpacing : null,
              textFills: child.type === 'TEXT' && 'fills' in child && child.fills ? child.fills : null,
              textStrokes: child.type === 'TEXT' && 'strokes' in child && child.strokes ? child.strokes : null,
              textEffects: child.type === 'TEXT' && 'effects' in child && child.effects ? child.effects : null,
              // クリッピングマスク情報
              clipsContent: 'clipsContent' in child ? child.clipsContent : null
            })) || []
          };
        }
        
        // コンポーネントノードの場合、コンポーネント構造の情報を追加
        if (node.type === 'COMPONENT') {
          const componentNode = node as ComponentNode;
          nodeMetadata.componentStructure = {
            id: componentNode.id,
            name: componentNode.name,
            children: componentNode.children?.map((child, index) => ({
              id: child.id,
              name: child.name,
              type: child.type,
              index: index,
              x: child.x - componentNode.x, // コンポーネント内での相対位置
              y: child.y - componentNode.y
            })) || []
          };
        }
        
        // テキストノードの場合、フォント情報を追加
        if (node.type === 'TEXT') {
          const textNode = node as TextNode;
          nodeMetadata.textContent = textNode.characters;
          nodeMetadata.fontName = textNode.fontName;
          nodeMetadata.fontSize = textNode.fontSize;
          nodeMetadata.lineHeight = textNode.lineHeight;
          nodeMetadata.letterSpacing = textNode.letterSpacing;
          nodeMetadata.textAlignHorizontal = textNode.textAlignHorizontal;
          nodeMetadata.textAlignVertical = textNode.textAlignVertical;
          nodeMetadata.textAutoResize = textNode.textAutoResize;
          nodeMetadata.textCase = textNode.textCase;
          nodeMetadata.textDecoration = textNode.textDecoration;
          nodeMetadata.paragraphIndent = textNode.paragraphIndent;
          nodeMetadata.paragraphSpacing = textNode.paragraphSpacing;
          
          // フォントスタイルの詳細情報
          if (textNode.fontName && typeof textNode.fontName === 'object') {
            nodeMetadata.fontFamily = textNode.fontName.family;
            nodeMetadata.fontStyle = textNode.fontName.style;
          }
          
          // 塗りつぶし情報（テキストの色）
          if ('fills' in textNode && textNode.fills && Array.isArray(textNode.fills)) {
            nodeMetadata.textFills = textNode.fills.map(fill => ({
              type: fill.type,
              visible: fill.visible,
              opacity: fill.opacity,
              color: fill.type === 'SOLID' ? fill.color : null
            }));
          }
          
          // ストローク情報
          if ('strokes' in textNode && textNode.strokes && Array.isArray(textNode.strokes)) {
            nodeMetadata.textStrokes = textNode.strokes.map(stroke => ({
              type: stroke.type,
              visible: stroke.visible,
              opacity: stroke.opacity,
              color: stroke.type === 'SOLID' ? stroke.color : null,
              weight: stroke.weight
            }));
          }
          
          // エフェクト情報
          if ('effects' in textNode && textNode.effects && Array.isArray(textNode.effects)) {
            nodeMetadata.textEffects = textNode.effects.map(effect => ({
              type: effect.type,
              visible: effect.visible,
              radius: effect.radius,
              color: effect.color,
              offset: effect.offset,
              spread: effect.spread
            }));
          }
        }
        
        // ノードタイプに応じてフォルダとパスを決定
        let folderType: string | null = 'img';
        let fileExtension: string | null = 'png';
        let bytes: Uint8Array | null = null;
        
        // フレームの場合、画像を含むかどうかをチェック
        if (node.type === 'FRAME') {
          const hasImage = hasImageInFrame(node);
          const imageNodes = getImageNodesInFrame(node);
          
          nodeMetadata.hasImage = hasImage;
          nodeMetadata.imageNodeCount = imageNodes.length;
          nodeMetadata.imageNodes = imageNodes.map(imgNode => ({
            id: imgNode.id,
            name: imgNode.name,
            type: imgNode.type,
            // 画像ファイルのパスを追加（実際のノード名を使用）
            imagePath: `img/${imgNode.name || 'unnamed'}.png`,
            hasImageFile: true,
            imageFileName: `${imgNode.name || 'unnamed'}.png`
          }));
          
          // フレームは写真を出力しない
          bytes = null;
          folderType = null;
          fileExtension = null;
        } else if (node.type === 'GROUP') {
          // グループの場合、画像を含むかどうかをチェック
          const hasImage = hasImageInGroup(node);
          const imageNodes = getImageNodesInGroup(node);
          
          nodeMetadata.hasImage = hasImage;
          nodeMetadata.imageNodeCount = imageNodes.length;
          nodeMetadata.imageNodes = imageNodes.map(imgNode => ({
            id: imgNode.id,
            name: imgNode.name,
            type: imgNode.type,
            // 画像ファイルのパスを追加（実際のノード名を使用）
            imagePath: `img/${imgNode.name || 'unnamed'}.png`,
            hasImageFile: true,
            imageFileName: `${imgNode.name || 'unnamed'}.png`
          }));
          
          // グループは写真を出力しない
          bytes = null;
          folderType = null;
          fileExtension = null;
                } else {
          // シンボルやコンポーネントインスタンスの処理
          const nodeType = node.type as string;
          if (nodeType === 'INSTANCE' || nodeType === 'COMPONENT') {
            // シンボルやコンポーネントは直接エクスポートできないため、スキップ
            console.log(`Skipping symbol/component: ${node.name} (${nodeType})`);
            folderType = null;
            fileExtension = null;
            bytes = null;
            nodeMetadata.isSymbol = true;
            nodeMetadata.symbolType = nodeType;
            
            // シンボルの基本情報のみ保存
            if (nodeType === 'INSTANCE') {
              const instanceNode = node as any;
              nodeMetadata.mainComponent = instanceNode.mainComponent ? {
                id: instanceNode.mainComponent.id,
                name: instanceNode.mainComponent.name
              } : null;
            }
          } else {
          // 画像フィルを持つノードを画像として識別
          if ('fills' in node && node.fills && Array.isArray(node.fills)) {
            const imageFills = node.fills.filter(fill => fill.type === 'IMAGE' && fill.visible !== false);
            if (imageFills.length > 0) {
              folderType = 'img';
              fileExtension = 'png';
              nodeMetadata.hasImageFill = true;
              nodeMetadata.imageFillCount = imageFills.length;
              // 画像データを抽出（シンボルでない場合のみ）
              try {
                if ('exportAsync' in node) {
                  bytes = await node.exportAsync(exportSettings);
                }
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.warn(`Failed to export node ${node.name}: ${errorMessage}`);
                bytes = null;
              }
              // 画像フィルの情報をメタデータに追加
              nodeMetadata.imageFills = imageFills.map(fill => ({
                type: fill.type,
                visible: fill.visible,
                opacity: fill.opacity
              }));
            }
          }
          
          // 画像ハッシュを持つノードを画像として識別
          if ('imageHash' in node && node.imageHash) {
            folderType = 'img';
            fileExtension = 'png';
            nodeMetadata.imageHash = node.imageHash;
            // 画像データを抽出（シンボルでない場合のみ）
            try {
              if ('exportAsync' in node) {
                bytes = await node.exportAsync(exportSettings);
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.warn(`Failed to export node ${node.name}: ${errorMessage}`);
              bytes = null;
            }
          }
        }
        }

        nodeMetadata.folderType = folderType;
        nodeMetadata.fileExtension = fileExtension;
        
        // 画像ファイルがある場合のみ画像パスを設定
        if (folderType && fileExtension) {
          nodeMetadata.imagePath = `${folderType}/${node.name || 'unnamed'}.${fileExtension}`;
        }
        
        // 画像ファイルの情報を追加
        if (bytes) {
          nodeMetadata.hasImageFile = true;
          nodeMetadata.imageFileName = `${node.name || 'unnamed'}.${fileExtension}`;
          nodeMetadata.imageFileSize = bytes.length;
        } else {
          nodeMetadata.hasImageFile = false;
        }

        // 親ノードの情報も含める（インポート時の配置に必要）
        if (node.parent && 'name' in node.parent) {
          nodeMetadata.parentName = node.parent.name;
        }

        // ノードタイプに応じた追加情報
        if (node.type === 'FRAME' || node.type === 'GROUP') {
          nodeMetadata.children = node.children?.map(child => ({
            id: child.id,
            name: child.name,
            type: child.type
          }));
        }

        return {
          name: node.name || 'unnamed',
          metadata: nodeMetadata,
          bytes: bytes
        };
      } catch (error: any) {
        console.error(`Failed to export node: ${node.name}`, error);
        return null; // エラーが発生した場合はnullを返す
      }
    })
  );

  const validResults = results.filter(result => result !== null);
  if (validResults.length === 0) {
    throw new Error('エクスポート可能なノードがありません');
  }

  // フレームやグループ内の画像ノードを個別に処理
  const additionalImageNodes = [];
  
  for (const result of validResults) {
    if (result.metadata.imageNodes && Array.isArray(result.metadata.imageNodes)) {
      for (const imageNodeInfo of result.metadata.imageNodes) {
        // 実際の画像ノードを取得
        const imageNode = figma.getNodeById(imageNodeInfo.id);
        if (imageNode && 'exportAsync' in imageNode && 'x' in imageNode) {
          // シンボルやコンポーネントインスタンスの場合はスキップ
          const imageNodeType = imageNode.type as string;
          if (imageNodeType === 'INSTANCE' || imageNodeType === 'COMPONENT') {
            console.log(`Skipping symbol/component in image processing: ${imageNode.name} (${imageNodeType})`);
            continue;
          }
          
          try {
            const imageBytes = await imageNode.exportAsync(exportSettings);
            const actualNodeName = imageNode.name || 'unnamed';
            additionalImageNodes.push({
              name: actualNodeName,
              metadata: {
                id: imageNode.id,
                name: actualNodeName,
                type: imageNode.type,
                x: imageNode.x,
                y: imageNode.y,
                width: imageNode.width,
                height: imageNode.height,
                visible: imageNode.visible,
                locked: imageNode.locked,
                folderType: 'img',
                fileExtension: 'png',
                imagePath: `img/${actualNodeName}.png`,
                hasImageFile: true,
                imageFileName: `${actualNodeName}.png`,
                imageFileSize: imageBytes.length
              },
              bytes: imageBytes
            });
          } catch (error) {
            console.error(`Failed to export image node: ${imageNodeInfo.name}`, error);
            // エラーが発生した場合は、メタデータのみ保存
            const actualNodeName = imageNode.name || 'unnamed';
            additionalImageNodes.push({
              name: actualNodeName,
              metadata: {
                id: imageNode.id,
                name: actualNodeName,
                type: imageNode.type,
                x: imageNode.x,
                y: imageNode.y,
                width: imageNode.width,
                height: imageNode.height,
                visible: imageNode.visible,
                locked: imageNode.locked,
                folderType: null,
                fileExtension: null,
                hasImageFile: false,
                exportError: error instanceof Error ? error.message : String(error)
              },
              bytes: null
            });
          }
        }
      }
    }
  }

  // エクスポートデータにメタデータを追加
  const exportData = {
    metadata: metadata,
    nodes: [...validResults, ...additionalImageNodes]
  };

  figma.ui.postMessage({ 
    type: 'export-data', 
    data: exportData
  });
}

// インポート機能
async function importFromZip(importData: any) {
  try {
    const { metadata, nodes } = importData;
    const imageFiles = importData.imageFiles || [];
    
    // データの存在チェック
    if (!nodes || !Array.isArray(nodes)) {
      throw new Error('インポートデータが無効です。nodesが配列ではありません。');
    }
    
    if (nodes.length === 0) {
      throw new Error('インポートするノードがありません。');
    }
    
    console.log(`Importing ${nodes.length} nodes`);
    
    // インポート開始を通知
    figma.ui.postMessage({ 
      type: 'import-progress', 
      message: 'インポートを開始しています...',
      progress: 0
    });

    // 画像ファイルを処理
    await processImageFiles(imageFiles);

    // IDマッピングを作成（元のID -> 新しいノード）
    const idMapping = new Map<string, SceneNode>();

    // フレームノードを作成
    for (const nodeData of nodes) {
      const nodeMetadata = nodeData.metadata;
      let createdNode: SceneNode | null = null;
      
      console.log(`Processing node: ${nodeMetadata.name} (${nodeMetadata.type})`);
      
      if (nodeMetadata.type === 'FRAME') {
        createdNode = await createFrameFromMetadata(nodeMetadata);
      } else if (nodeMetadata.type === 'GROUP') {
        createdNode = await createGroupFromMetadata(nodeMetadata);
      } else if (nodeMetadata.type === 'TEXT') {
        createdNode = await createTextFromMetadata(nodeMetadata);
      } else if (nodeMetadata.type === 'RECTANGLE' || nodeMetadata.type === 'ELLIPSE' || nodeMetadata.type === 'POLYGON' || nodeMetadata.type === 'STAR' || nodeMetadata.type === 'VECTOR') {
        createdNode = await createShapeFromMetadata(nodeMetadata);
      } else if (nodeMetadata.type === 'LINE' || nodeMetadata.type === 'ARC' || nodeMetadata.type === 'BOOLEAN_OPERATION' || nodeMetadata.type === 'SLICE' || nodeMetadata.type === 'INSTANCE' || nodeMetadata.type === 'COMPONENT') {
        createdNode = await createShapeFromMetadata(nodeMetadata);
      }
      
      // 作成されたノードをIDマッピングに追加
      if (createdNode) {
        idMapping.set(nodeMetadata.id, createdNode);
        console.log(`Created node: ${createdNode.name} (${createdNode.type}) with ID: ${createdNode.id}`);
      } else {
        console.warn(`Failed to create node: ${nodeMetadata.name} (${nodeMetadata.type})`);
      }
    }

    // 子ノードの配置を処理
    await processChildNodes(nodes, idMapping);

    // インポート完了を通知
    figma.ui.postMessage({ 
      type: 'import-complete', 
      message: 'インポートが完了しました',
      importedCount: nodes.length
    });

  } catch (error: any) {
    console.error('Import error:', error);
    figma.ui.postMessage({ 
      type: 'error', 
      message: `インポートエラー: ${error.message || String(error)}` 
    });
  }
}

// 画像ファイルを処理する関数
async function processImageFiles(imageFiles: any[]) {
  try {
    console.log(`Processing ${imageFiles.length} image files`);
    
    // 画像ファイルをFigmaにアップロード
    for (const imageFile of imageFiles) {
      try {
        console.log(`Processing image file: ${imageFile.fileName}`);
        
        if (imageFile.data && imageFile.data.length > 0) {
          // Base64データをUint8Arrayに変換
          const imageData = new Uint8Array(imageFile.data);
          
          // 画像をFigmaにアップロード
          const imageHash = await figma.createImage(imageData);
          
          // 画像ハッシュを保存（後でノード作成時に使用）
          imageFile.imageHash = imageHash;
          
          console.log(`Successfully uploaded image: ${imageFile.fileName} with hash: ${imageHash}`);
        } else {
          console.warn(`No image data found for: ${imageFile.fileName}`);
        }
        
      } catch (error) {
        console.error(`Failed to process image file: ${imageFile.fileName}`, error);
      }
    }
    
  } catch (error) {
    console.error('Failed to process image files:', error);
  }
}

// フレームをメタデータから作成
async function createFrameFromMetadata(frameMetadata: any) {
  try {
    // フレームを作成
    const frame = figma.createFrame();
    
    // 基本プロパティを設定
    frame.name = frameMetadata.name || 'Imported Frame';
    frame.x = frameMetadata.x || 0;
    frame.y = frameMetadata.y || 0;
    frame.resize(frameMetadata.width || 100, frameMetadata.height || 100);
    
    // 可視性とロック状態
    if (frameMetadata.visible !== undefined) {
      frame.visible = frameMetadata.visible;
    }
    if (frameMetadata.locked !== undefined) {
      frame.locked = frameMetadata.locked;
    }
    
    // 回転とスケール
    if (frameMetadata.rotation !== null && frameMetadata.rotation !== undefined) {
      frame.rotation = frameMetadata.rotation;
    }
    
    // 制約情報
    if (frameMetadata.constraints) {
      frame.constraints = frameMetadata.constraints;
    }
    
    // レイアウト情報
    if (frameMetadata.layoutAlign !== null && frameMetadata.layoutAlign !== undefined) {
      frame.layoutAlign = frameMetadata.layoutAlign;
    }
    if (frameMetadata.layoutGrow !== null && frameMetadata.layoutGrow !== undefined) {
      frame.layoutGrow = frameMetadata.layoutGrow;
    }
    
    // レイアウトモード
    if (frameMetadata.layoutMode !== null && frameMetadata.layoutMode !== undefined) {
      frame.layoutMode = frameMetadata.layoutMode;
    }
    
    // パディング
    if (frameMetadata.paddingLeft !== null && frameMetadata.paddingLeft !== undefined) {
      frame.paddingLeft = frameMetadata.paddingLeft;
    }
    if (frameMetadata.paddingRight !== null && frameMetadata.paddingRight !== undefined) {
      frame.paddingRight = frameMetadata.paddingRight;
    }
    if (frameMetadata.paddingTop !== null && frameMetadata.paddingTop !== undefined) {
      frame.paddingTop = frameMetadata.paddingTop;
    }
    if (frameMetadata.paddingBottom !== null && frameMetadata.paddingBottom !== undefined) {
      frame.paddingBottom = frameMetadata.paddingBottom;
    }
    
    // アイテム間隔
    if (frameMetadata.itemSpacing !== null && frameMetadata.itemSpacing !== undefined) {
      frame.itemSpacing = frameMetadata.itemSpacing;
    }
    
    // 配置
    if (frameMetadata.primaryAxisAlignItems !== null && frameMetadata.primaryAxisAlignItems !== undefined) {
      frame.primaryAxisAlignItems = frameMetadata.primaryAxisAlignItems;
    }
    if (frameMetadata.counterAxisAlignItems !== null && frameMetadata.counterAxisAlignItems !== undefined) {
      frame.counterAxisAlignItems = frameMetadata.counterAxisAlignItems;
    }
    
    // 自動レイアウト
    if (frameMetadata.layoutSizingHorizontal !== null && frameMetadata.layoutSizingHorizontal !== undefined) {
      frame.layoutSizingHorizontal = frameMetadata.layoutSizingHorizontal;
    }
    if (frameMetadata.layoutSizingVertical !== null && frameMetadata.layoutSizingVertical !== undefined) {
      frame.layoutSizingVertical = frameMetadata.layoutSizingVertical;
    }
    
    // 塗りつぶし
    if (frameMetadata.fills && Array.isArray(frameMetadata.fills)) {
      // グラデーション関連のプロパティを除去してから設定
      const cleanFills = frameMetadata.fills.map((fill: any) => {
        const cleanFill = { ...fill };
        // グラデーション関連のプロパティを削除
        delete cleanFill.gradientStops;
        delete cleanFill.gradientTransform;
        
        // IMAGEタイプの場合は画像ハッシュを保持
        if (fill.type === 'IMAGE' && fill.imageHash) {
          return {
            type: 'IMAGE',
            visible: fill.visible !== false,
            opacity: fill.opacity || 1,
            imageHash: fill.imageHash,
            scaleMode: fill.scaleMode || 'FILL',
            imageTransform: fill.imageTransform || [[1, 0, 0], [0, 1, 0]]
          };
        }
        
        return cleanFill;
      });
      frame.fills = cleanFills;
    }
    
    // ストローク
    if (frameMetadata.strokes && Array.isArray(frameMetadata.strokes)) {
      // ストローク関連のプロパティを適切に処理
      const cleanStrokes = frameMetadata.strokes.map((stroke: any) => {
        const cleanStroke = { ...stroke };
        
        // 認識されないプロパティを削除（Figma APIで対応していないもの）
        delete cleanStroke.dashPattern; // 破線パターンは後で個別に設定
        
        return cleanStroke;
      });
      frame.strokes = cleanStrokes;
      
      // 破線パターンを個別に設定（対応している場合）
      if (frameMetadata.strokes && frameMetadata.strokes.length > 0) {
        const firstStroke = frameMetadata.strokes[0];
        if (firstStroke.dashPattern && Array.isArray(firstStroke.dashPattern)) {
          try {
            (frame as any).dashPattern = firstStroke.dashPattern;
            console.log(`Set dash pattern:`, firstStroke.dashPattern);
          } catch (error) {
            console.warn('Failed to set dash pattern:', error);
          }
        }
      }
    }
    
    // エフェクト
    if (frameMetadata.effects && Array.isArray(frameMetadata.effects)) {
      frame.effects = frameMetadata.effects;
    }
    
    // ブレンドモード
    if (frameMetadata.blendMode !== null && frameMetadata.blendMode !== undefined) {
      frame.blendMode = frameMetadata.blendMode;
    }
    
    // 透明度
    if (frameMetadata.opacity !== null && frameMetadata.opacity !== undefined) {
      frame.opacity = frameMetadata.opacity;
    }
    
    // クリッピングマスク
    if (frameMetadata.clipsContent !== null && frameMetadata.clipsContent !== undefined) {
      frame.clipsContent = frameMetadata.clipsContent;
      console.log(`Set clipsContent for frame: ${frame.name} = ${frameMetadata.clipsContent}`);
    }
    
    // クリッピングマスクの詳細情報を適用
    if (frameMetadata.clippingMask && frameMetadata.clippingMask.enabled) {
      console.log(`Frame "${frame.name}" has clipping mask enabled`);
      // クリッピングマスクの詳細情報を保存（後で子ノード作成時に使用）
      frameMetadata.clippingMaskInfo = frameMetadata.clippingMask;
    }
    
    // フレーム構造の情報を保存（後で子ノードを作成する際に使用）
    if (frameMetadata.frameStructure && frameMetadata.frameStructure.children) {
      // フレームの子ノード情報を保存（後で処理）
      console.log(`Frame "${frame.name}" created with ${frameMetadata.frameStructure.children.length} children`);
    }
    
    // 現在のページに追加
    figma.currentPage.appendChild(frame);
    
    // 作成したフレームを選択
    figma.currentPage.selection = [frame];
    
    return frame;
    
  } catch (error: any) {
    console.error(`Failed to create frame: ${frameMetadata.name}`, error);
    throw new Error(`フレームの作成に失敗しました: ${frameMetadata.name} - ${error.message}`);
  }
}

// グループをメタデータから作成
async function createGroupFromMetadata(groupMetadata: any) {
  try {
    // 一時的な矩形を作成してグループ化
    const tempRect = figma.createRectangle();
    tempRect.name = 'temp';
    tempRect.resize(1, 1);
    tempRect.x = groupMetadata.x || 0;
    tempRect.y = groupMetadata.y || 0;
    
    // グループを作成（一時的なノードを含む）
    const group = figma.group([tempRect], figma.currentPage);
    
    // 基本プロパティを設定
    group.name = groupMetadata.name || 'Imported Group';
    group.x = groupMetadata.x || 0;
    group.y = groupMetadata.y || 0;
    group.resize(groupMetadata.width || 100, groupMetadata.height || 100);
    
    // 可視性とロック状態
    if (groupMetadata.visible !== undefined) {
      group.visible = groupMetadata.visible;
    }
    if (groupMetadata.locked !== undefined) {
      group.locked = groupMetadata.locked;
    }
    
    // 回転
    if (groupMetadata.rotation !== null && groupMetadata.rotation !== undefined) {
      group.rotation = groupMetadata.rotation;
    }
    
    // レイアウト情報
    if (groupMetadata.layoutAlign !== null && groupMetadata.layoutAlign !== undefined) {
      group.layoutAlign = groupMetadata.layoutAlign;
    }
    if (groupMetadata.layoutGrow !== null && groupMetadata.layoutGrow !== undefined) {
      group.layoutGrow = groupMetadata.layoutGrow;
    }
    
    // エフェクト
    if (groupMetadata.effects && Array.isArray(groupMetadata.effects)) {
      group.effects = groupMetadata.effects;
    }
    
    // ブレンドモード
    if (groupMetadata.blendMode !== null && groupMetadata.blendMode !== undefined) {
      group.blendMode = groupMetadata.blendMode;
    }
    
    // 透明度
    if (groupMetadata.opacity !== null && groupMetadata.opacity !== undefined) {
      group.opacity = groupMetadata.opacity;
    }
    
    // グループ構造の情報を保存（後で子ノードを作成する際に使用）
    if (groupMetadata.groupStructure && groupMetadata.groupStructure.children) {
      // グループの子ノード情報を保存（後で処理）
      console.log(`Group "${group.name}" created with ${groupMetadata.groupStructure.children.length} children`);
    }
    
    // 一時的なノードを削除（子ノードが追加される前に）
    if (group.children.length > 0 && group.children[0].name === 'temp') {
      group.children[0].remove();
      console.log('Removed temporary node from group');
    }
    
    // 現在のページに追加
    figma.currentPage.appendChild(group);
    
    // 作成したグループを選択
    figma.currentPage.selection = [group];
    
    return group;
    
  } catch (error: any) {
    console.error(`Failed to create group: ${groupMetadata.name}`, error);
    throw new Error(`グループの作成に失敗しました: ${groupMetadata.name} - ${error.message}`);
  }
}

// テキストノードをメタデータから作成
async function createTextFromMetadata(textMetadata: any) {
  try {
    console.log(`Creating text node: ${textMetadata.name}`);
    console.log(`Text content: ${textMetadata.textContent}`);
    
    // テキストノードを作成
    const text = figma.createText();
    
    // 基本プロパティを設定
    text.name = textMetadata.name || 'Imported Text';
    text.x = textMetadata.x || 0;
    text.y = textMetadata.y || 0;
    text.resize(textMetadata.width || 100, textMetadata.height || 100);
    
    // 可視性とロック状態
    if (textMetadata.visible !== undefined) {
      text.visible = textMetadata.visible;
    }
    if (textMetadata.locked !== undefined) {
      text.locked = textMetadata.locked;
    }
    
    // 回転
    if (textMetadata.rotation !== null && textMetadata.rotation !== undefined) {
      text.rotation = textMetadata.rotation;
    }
    
    // 制約情報
    if (textMetadata.constraints) {
      text.constraints = textMetadata.constraints;
    }
    
    // レイアウト情報
    if (textMetadata.layoutAlign !== null && textMetadata.layoutAlign !== undefined) {
      text.layoutAlign = textMetadata.layoutAlign;
    }
    if (textMetadata.layoutGrow !== null && textMetadata.layoutGrow !== undefined) {
      text.layoutGrow = textMetadata.layoutGrow;
    }
    
    // フォント情報（テキスト内容を設定する前に必要）
    if (textMetadata.fontName && typeof textMetadata.fontName === 'object') {
      try {
        await figma.loadFontAsync(textMetadata.fontName);
        text.fontName = textMetadata.fontName;
        console.log(`Loaded and set font: ${textMetadata.fontName.family} ${textMetadata.fontName.style}`);
      } catch (error) {
        console.warn(`Failed to load font: ${textMetadata.fontName.family} ${textMetadata.fontName.style}`, error);
        // フォント読み込みに失敗した場合はデフォルトフォントを使用
        try {
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });
          text.fontName = { family: "Inter", style: "Regular" };
        } catch (fallbackError) {
          console.error('Failed to load fallback font:', fallbackError);
        }
      }
    }
    
    // テキスト内容（フォント読み込み後に実行）
    if (textMetadata.textContent) {
      try {
        text.characters = textMetadata.textContent;
        console.log(`Set text content: "${textMetadata.textContent}"`);
      } catch (error) {
        console.warn(`Failed to set text content: "${textMetadata.textContent}"`, error);
      }
    }
    
    // フォントサイズ
    if (textMetadata.fontSize !== null && textMetadata.fontSize !== undefined) {
      text.fontSize = textMetadata.fontSize;
      console.log(`Set font size: ${textMetadata.fontSize}`);
    }
    
    // 行の高さ
    if (textMetadata.lineHeight !== null && textMetadata.lineHeight !== undefined) {
      text.lineHeight = textMetadata.lineHeight;
    }
    
    // 文字間隔
    if (textMetadata.letterSpacing !== null && textMetadata.letterSpacing !== undefined) {
      text.letterSpacing = textMetadata.letterSpacing;
    }
    
    // テキスト配置
    if (textMetadata.textAlignHorizontal !== null && textMetadata.textAlignHorizontal !== undefined) {
      text.textAlignHorizontal = textMetadata.textAlignHorizontal;
    }
    if (textMetadata.textAlignVertical !== null && textMetadata.textAlignVertical !== undefined) {
      text.textAlignVertical = textMetadata.textAlignVertical;
    }
    
    // テキスト自動リサイズ
    if (textMetadata.textAutoResize !== null && textMetadata.textAutoResize !== undefined) {
      text.textAutoResize = textMetadata.textAutoResize;
    }
    
    // テキストケース
    if (textMetadata.textCase !== null && textMetadata.textCase !== undefined) {
      text.textCase = textMetadata.textCase;
    }
    
    // テキスト装飾
    if (textMetadata.textDecoration !== null && textMetadata.textDecoration !== undefined) {
      text.textDecoration = textMetadata.textDecoration;
    }
    
    // 段落インデント
    if (textMetadata.paragraphIndent !== null && textMetadata.paragraphIndent !== undefined) {
      text.paragraphIndent = textMetadata.paragraphIndent;
    }
    
    // 段落間隔
    if (textMetadata.paragraphSpacing !== null && textMetadata.paragraphSpacing !== undefined) {
      text.paragraphSpacing = textMetadata.paragraphSpacing;
    }
    
    // 塗りつぶし（テキストの色）
    if (textMetadata.textFills && Array.isArray(textMetadata.textFills)) {
      // グラデーション関連のプロパティを除去してから設定
      const cleanTextFills = textMetadata.textFills.map((fill: any) => {
        const cleanFill = { ...fill };
        // グラデーション関連のプロパティを削除
        delete cleanFill.gradientStops;
        delete cleanFill.gradientTransform;
        
        // IMAGEタイプの場合は画像ハッシュを保持
        if (fill.type === 'IMAGE' && fill.imageHash) {
          return {
            type: 'IMAGE',
            visible: fill.visible !== false,
            opacity: fill.opacity || 1,
            imageHash: fill.imageHash,
            scaleMode: fill.scaleMode || 'FILL',
            imageTransform: fill.imageTransform || [[1, 0, 0], [0, 1, 0]]
          };
        }
        
        return cleanFill;
      });
      text.fills = cleanTextFills;
      console.log(`Set text fills:`, cleanTextFills);
    }
    
    // ストローク
    if (textMetadata.textStrokes && Array.isArray(textMetadata.textStrokes)) {
      // ストローク関連のプロパティを適切に処理
      const cleanStrokes = textMetadata.textStrokes.map((stroke: any) => {
        const cleanStroke = { ...stroke };
        
        // 認識されないプロパティを削除（Figma APIで対応していないもの）
        delete cleanStroke.dashPattern; // 破線パターンは後で個別に設定
        
        return cleanStroke;
      });
      text.strokes = cleanStrokes;
      
      // 破線パターンを個別に設定（対応している場合）
      if (textMetadata.textStrokes && textMetadata.textStrokes.length > 0) {
        const firstStroke = textMetadata.textStrokes[0];
        if (firstStroke.dashPattern && Array.isArray(firstStroke.dashPattern)) {
          try {
            (text as any).dashPattern = firstStroke.dashPattern;
            console.log(`Set text dash pattern:`, firstStroke.dashPattern);
          } catch (error) {
            console.warn('Failed to set text dash pattern:', error);
          }
        }
      }
    }
    
    // エフェクト
    if (textMetadata.textEffects && Array.isArray(textMetadata.textEffects)) {
      text.effects = textMetadata.textEffects;
    }
    
    // ブレンドモード
    if (textMetadata.blendMode !== null && textMetadata.blendMode !== undefined) {
      text.blendMode = textMetadata.blendMode;
    }
    
    // 透明度
    if (textMetadata.opacity !== null && textMetadata.opacity !== undefined) {
      text.opacity = textMetadata.opacity;
    }
    
    // クリッピングマスク
    if (textMetadata.clipsContent !== null && textMetadata.clipsContent !== undefined) {
      if ('clipsContent' in text) {
        text.clipsContent = textMetadata.clipsContent;
        console.log(`Set clipsContent for text: ${text.name} = ${textMetadata.clipsContent}`);
      }
    }
    
    // 現在のページに追加
    figma.currentPage.appendChild(text);
    
    // 作成したテキストを選択
    figma.currentPage.selection = [text];
    
    console.log(`Text node created successfully: ${text.name}`);
    return text;
    
  } catch (error: any) {
    console.error(`Failed to create text: ${textMetadata.name}`, error);
    throw new Error(`テキストの作成に失敗しました: ${textMetadata.name} - ${error.message}`);
  }
}

// 図形ノードをメタデータから作成
async function createShapeFromMetadata(shapeMetadata: any) {
  try {
    console.log(`Creating shape node: ${shapeMetadata.name} (${shapeMetadata.type})`);
    
    let shape: SceneNode;
    
    // ノードタイプに応じて図形を作成
    switch (shapeMetadata.type) {
      case 'RECTANGLE':
        shape = figma.createRectangle();
        console.log('Created rectangle');
        break;
      case 'ELLIPSE':
        shape = figma.createEllipse();
        console.log('Created ellipse');
        break;
      case 'POLYGON':
        shape = figma.createPolygon();
        console.log('Created polygon');
        break;
      case 'STAR':
        shape = figma.createStar();
        console.log('Created star');
        break;
      case 'VECTOR':
        shape = figma.createVector();
        console.log('Created vector');
        break;
      case 'LINE':
        shape = figma.createLine();
        console.log('Created line');
        break;
      case 'ARC':
        // ARCは直接作成できないため、楕円で代替
        shape = figma.createEllipse();
        console.log('Created ellipse as ARC replacement');
        break;
      case 'BOOLEAN_OPERATION':
        // ブール演算は複雑なため、矩形で代替
        shape = figma.createRectangle();
        console.log('Created rectangle as BOOLEAN_OPERATION replacement');
        break;
      case 'SLICE':
        // スライスは矩形で代替
        shape = figma.createRectangle();
        console.log('Created rectangle as SLICE replacement');
        break;
      case 'INSTANCE':
        // インスタンスは矩形で代替
        shape = figma.createRectangle();
        console.log('Created rectangle as INSTANCE replacement');
        break;
      case 'COMPONENT':
        // コンポーネントは矩形で代替
        shape = figma.createRectangle();
        console.log('Created rectangle as COMPONENT replacement');
        break;
      default:
        console.warn(`Unsupported shape type: ${shapeMetadata.type}, creating rectangle as fallback`);
        shape = figma.createRectangle();
        break;
    }
    
    // 基本プロパティを設定
    shape.name = shapeMetadata.name || 'Imported Shape';
    shape.x = shapeMetadata.x || 0;
    shape.y = shapeMetadata.y || 0;
    shape.resize(shapeMetadata.width || 100, shapeMetadata.height || 100);
    
    console.log(`Shape properties set: ${shape.name} at (${shape.x}, ${shape.y}) with size (${shape.width}, ${shape.height})`);
    
    // 可視性とロック状態
    if (shapeMetadata.visible !== undefined) {
      shape.visible = shapeMetadata.visible;
    }
    if (shapeMetadata.locked !== undefined) {
      shape.locked = shapeMetadata.locked;
    }
    
    // 回転
    if (shapeMetadata.rotation !== null && shapeMetadata.rotation !== undefined) {
      shape.rotation = shapeMetadata.rotation;
    }
    
    // 制約情報
    if (shapeMetadata.constraints) {
      shape.constraints = shapeMetadata.constraints;
    }
    
    // レイアウト情報
    if (shapeMetadata.layoutAlign !== null && shapeMetadata.layoutAlign !== undefined) {
      shape.layoutAlign = shapeMetadata.layoutAlign;
    }
    if (shapeMetadata.layoutGrow !== null && shapeMetadata.layoutGrow !== undefined) {
      shape.layoutGrow = shapeMetadata.layoutGrow;
    }
    
    // 角丸（矩形の場合）
    if (shapeMetadata.type === 'RECTANGLE' && shapeMetadata.cornerRadius !== null && shapeMetadata.cornerRadius !== undefined) {
      (shape as RectangleNode).cornerRadius = shapeMetadata.cornerRadius;
      console.log(`Set corner radius: ${shapeMetadata.cornerRadius}`);
    }
    
    // 線の情報（LINEノード用）
    if (shapeMetadata.type === 'LINE') {
      const lineNode = shape as LineNode;
      if (shapeMetadata.strokeWeight !== null && shapeMetadata.strokeWeight !== undefined) {
        lineNode.strokeWeight = shapeMetadata.strokeWeight;
      }
      if (shapeMetadata.strokeAlign !== null && shapeMetadata.strokeAlign !== undefined) {
        lineNode.strokeAlign = shapeMetadata.strokeAlign;
      }
      if (shapeMetadata.strokeCap !== null && shapeMetadata.strokeCap !== undefined) {
        lineNode.strokeCap = shapeMetadata.strokeCap;
      }
      if (shapeMetadata.strokeJoin !== null && shapeMetadata.strokeJoin !== undefined) {
        lineNode.strokeJoin = shapeMetadata.strokeJoin;
      }
      if (shapeMetadata.dashPattern !== null && shapeMetadata.dashPattern !== undefined) {
        lineNode.dashPattern = shapeMetadata.dashPattern;
      }
    }
    
    // ストロークの詳細設定を適用（すべての図形タイプ）
    if (shapeMetadata.strokes && Array.isArray(shapeMetadata.strokes) && shapeMetadata.strokes.length > 0) {
      const firstStroke = shapeMetadata.strokes[0];
      
      // ストロークの太さを設定
      if (firstStroke.weight !== null && firstStroke.weight !== undefined) {
        try {
          (shape as any).strokeWeight = firstStroke.weight;
          console.log(`Set stroke weight: ${firstStroke.weight}`);
        } catch (error) {
          console.warn('Failed to set stroke weight:', error);
        }
      }
      
      // ストロークの配置を設定
      if (firstStroke.align !== null && firstStroke.align !== undefined) {
        try {
          (shape as any).strokeAlign = firstStroke.align;
          console.log(`Set stroke align: ${firstStroke.align}`);
        } catch (error) {
          console.warn('Failed to set stroke align:', error);
        }
      }
    }
    
    // 多角形の情報（POLYGONノード用）
    if (shapeMetadata.type === 'POLYGON' && shapeMetadata.pointCount !== null && shapeMetadata.pointCount !== undefined) {
      (shape as PolygonNode).pointCount = shapeMetadata.pointCount;
    }
    
    // 星の情報（STARノード用）
    if (shapeMetadata.type === 'STAR' && shapeMetadata.innerRadius !== null && shapeMetadata.innerRadius !== undefined) {
      (shape as StarNode).innerRadius = shapeMetadata.innerRadius;
    }
    
    // 塗りつぶし
    if (shapeMetadata.fills && Array.isArray(shapeMetadata.fills)) {
      // グラデーション関連のプロパティを除去してから設定
      const cleanFills = shapeMetadata.fills.map((fill: any) => {
        const cleanFill = { ...fill };
        // グラデーション関連のプロパティを削除
        delete cleanFill.gradientStops;
        delete cleanFill.gradientTransform;
        
        // IMAGEタイプの場合は画像ハッシュを保持
        if (fill.type === 'IMAGE' && fill.imageHash) {
          return {
            type: 'IMAGE',
            visible: fill.visible !== false,
            opacity: fill.opacity || 1,
            imageHash: fill.imageHash,
            scaleMode: fill.scaleMode || 'FILL',
            imageTransform: fill.imageTransform || [[1, 0, 0], [0, 1, 0]]
          };
        }
        
        return cleanFill;
      });
      shape.fills = cleanFills;
      console.log(`Set shape fills:`, cleanFills);
    }
    
    // ストローク
    if (shapeMetadata.strokes && Array.isArray(shapeMetadata.strokes)) {
      // ストローク関連のプロパティを適切に処理
      const cleanStrokes = shapeMetadata.strokes.map((stroke: any) => {
        const cleanStroke = { ...stroke };
        
        // 認識されないプロパティを削除（Figma APIで対応していないもの）
        delete cleanStroke.dashPattern; // 破線パターンは後で個別に設定
        
        return cleanStroke;
      });
      shape.strokes = cleanStrokes;
      
      // 破線パターンを個別に設定（対応している場合）
      if (shapeMetadata.strokes && shapeMetadata.strokes.length > 0) {
        const firstStroke = shapeMetadata.strokes[0];
        if (firstStroke.dashPattern && Array.isArray(firstStroke.dashPattern)) {
          try {
            (shape as any).dashPattern = firstStroke.dashPattern;
            console.log(`Set shape dash pattern:`, firstStroke.dashPattern);
          } catch (error) {
            console.warn('Failed to set shape dash pattern:', error);
          }
        }
      }
    }
    
    // エフェクト
    if (shapeMetadata.effects && Array.isArray(shapeMetadata.effects)) {
      shape.effects = shapeMetadata.effects;
    }
    
    // ブレンドモード
    if (shapeMetadata.blendMode !== null && shapeMetadata.blendMode !== undefined) {
      shape.blendMode = shapeMetadata.blendMode;
    }
    
    // 透明度
    if (shapeMetadata.opacity !== null && shapeMetadata.opacity !== undefined) {
      shape.opacity = shapeMetadata.opacity;
    }
    
    // クリッピングマスク
    if (shapeMetadata.clipsContent !== null && shapeMetadata.clipsContent !== undefined) {
      if ('clipsContent' in shape) {
        shape.clipsContent = shapeMetadata.clipsContent;
        console.log(`Set clipsContent for shape: ${shape.name} = ${shapeMetadata.clipsContent}`);
      }
    }
    
    // 現在のページに追加
    figma.currentPage.appendChild(shape);
    
    // 作成した図形を選択
    figma.currentPage.selection = [shape];
    
    console.log(`Shape node created successfully: ${shape.name} (${shape.type})`);
    return shape;
    
  } catch (error: any) {
    console.error(`Failed to create shape: ${shapeMetadata.name}`, error);
    throw new Error(`図形の作成に失敗しました: ${shapeMetadata.name} - ${error.message}`);
  }
}

// 子ノードの配置を処理
async function processChildNodes(nodes: any[], idMapping: Map<string, SceneNode>) {
  try {
    // 各ノードの子ノードを処理
    for (const nodeData of nodes) {
      const nodeMetadata = nodeData.metadata;
      
      // フレームの子ノードを処理
      if (nodeMetadata.type === 'FRAME' && nodeMetadata.frameStructure && nodeMetadata.frameStructure.children) {
        await processFrameChildren(nodeMetadata.frameStructure, idMapping);
      }
      
      // グループの子ノードを処理
      if (nodeMetadata.type === 'GROUP' && nodeMetadata.groupStructure && nodeMetadata.groupStructure.children) {
        await processGroupChildren(nodeMetadata.groupStructure, idMapping);
      }
    }
    
  } catch (error: any) {
    console.error('Failed to process child nodes:', error);
    throw new Error(`子ノードの配置に失敗しました: ${error.message}`);
  }
}

// フレームの子ノードを処理
async function processFrameChildren(frameStructure: any, idMapping: Map<string, SceneNode>) {
  try {
    // フレームノードを取得
    const frame = idMapping.get(frameStructure.id);
    if (!frame || frame.type !== 'FRAME') {
      console.warn(`Frame not found in ID mapping: ${frameStructure.id}`);
      return;
    }
    
    console.log(`Processing ${frameStructure.children.length} children for frame: ${frame.name}`);
    
    // 子ノードを処理
    for (const childInfo of frameStructure.children) {
      console.log(`Creating child node: ${childInfo.name} at (${childInfo.x}, ${childInfo.y})`);
      
      // 子ノードを作成
      const childNode = await createChildNode(childInfo);
      if (childNode) {
        // フレームに追加
        frame.appendChild(childNode);
        
        // 相対位置を設定（フレーム内での位置）
        const relativeX = childInfo.x || 0;
        const relativeY = childInfo.y || 0;
        
        // フレームの位置を考慮して絶対座標を計算
        childNode.x = frame.x + relativeX;
        childNode.y = frame.y + relativeY;
        
        console.log(`Child node positioned at (${childNode.x}, ${childNode.y})`);
        
        // 作成されたノードマップに追加
        idMapping.set(childNode.id, childNode);
      }
    }
    
  } catch (error: any) {
    console.error(`Failed to process frame children: ${frameStructure.id}`, error);
  }
}

// グループの子ノードを処理
async function processGroupChildren(groupStructure: any, idMapping: Map<string, SceneNode>) {
  try {
    // グループノードを取得
    const group = idMapping.get(groupStructure.id);
    if (!group || group.type !== 'GROUP') {
      console.warn(`Group not found in ID mapping: ${groupStructure.id}`);
      return;
    }
    
    console.log(`Processing ${groupStructure.children.length} children for group: ${group.name}`);
    
    // 子ノードを処理
    for (const childInfo of groupStructure.children) {
      console.log(`Creating child node: ${childInfo.name} at (${childInfo.x}, ${childInfo.y})`);
      
      // 子ノードを作成
      const childNode = await createChildNode(childInfo);
      if (childNode) {
        // グループに追加
        group.appendChild(childNode);
        
        // 相対位置を設定（グループ内での位置）
        const relativeX = childInfo.x || 0;
        const relativeY = childInfo.y || 0;
        
        // グループの位置を考慮して絶対座標を計算
        childNode.x = group.x + relativeX;
        childNode.y = group.y + relativeY;
        
        console.log(`Child node positioned at (${childNode.x}, ${childNode.y})`);
        
        // 作成されたノードマップに追加
        idMapping.set(childNode.id, childNode);
      }
    }
    
  } catch (error: any) {
    console.error(`Failed to process group children: ${groupStructure.id}`, error);
  }
}

// 子ノードを作成
async function createChildNode(childInfo: any): Promise<SceneNode | null> {
  try {
    let childNode: SceneNode;
    
    // ノードタイプに応じて作成
    switch (childInfo.type) {
      case 'TEXT':
        childNode = figma.createText();
        break;
      case 'RECTANGLE':
        childNode = figma.createRectangle();
        break;
      case 'ELLIPSE':
        childNode = figma.createEllipse();
        break;
      case 'POLYGON':
        childNode = figma.createPolygon();
        break;
      case 'STAR':
        childNode = figma.createStar();
        break;
      case 'VECTOR':
        childNode = figma.createVector();
        break;
      case 'LINE':
        childNode = figma.createLine();
        break;
      case 'ARC':
        childNode = figma.createEllipse();
        break;
      case 'BOOLEAN_OPERATION':
        childNode = figma.createRectangle();
        break;
      case 'SLICE':
        childNode = figma.createRectangle();
        break;
      case 'INSTANCE':
        childNode = figma.createRectangle();
        break;
      case 'COMPONENT':
        childNode = figma.createRectangle();
        break;
      default:
        console.warn(`Unsupported child node type: ${childInfo.type}, creating rectangle as fallback`);
        childNode = figma.createRectangle();
        break;
    }
    
    // 基本プロパティを設定
    childNode.name = childInfo.name || 'Child Node';
    childNode.resize(childInfo.width || 50, childInfo.height || 50);
    
    // テキストノードの場合は特別な処理
    if (childInfo.type === 'TEXT') {
      const textNode = childNode as TextNode;
      
      // フォント情報を設定（テキスト内容を設定する前に必要）
      if (childInfo.fontName && typeof childInfo.fontName === 'object') {
        try {
          await figma.loadFontAsync(childInfo.fontName);
          textNode.fontName = childInfo.fontName;
          console.log(`Loaded and set font for child: ${childInfo.fontName.family} ${childInfo.fontName.style}`);
        } catch (error) {
          console.warn(`Failed to load font for child: ${childInfo.fontName.family} ${childInfo.fontName.style}`, error);
          // フォント読み込みに失敗した場合はデフォルトフォントを使用
          try {
            await figma.loadFontAsync({ family: "Inter", style: "Regular" });
            textNode.fontName = { family: "Inter", style: "Regular" };
          } catch (fallbackError) {
            console.error('Failed to load fallback font:', fallbackError);
          }
        }
      }
      
      // フォントサイズを設定
      if (childInfo.fontSize !== null && childInfo.fontSize !== undefined) {
        textNode.fontSize = childInfo.fontSize;
        console.log(`Set font size for child: ${childInfo.fontSize}`);
      }
      
      // テキスト内容を設定（フォント読み込み後に実行）
      if (childInfo.textContent) {
        try {
          textNode.characters = childInfo.textContent;
          console.log(`Set text content for child: "${childInfo.textContent}"`);
        } catch (error) {
          console.warn(`Failed to set text content for child: "${childInfo.textContent}"`, error);
        }
      }
      
      // フォント情報を設定
      if (childInfo.fontName && typeof childInfo.fontName === 'object') {
        textNode.fontName = childInfo.fontName;
        console.log(`Set font for child: ${childInfo.fontName.family} ${childInfo.fontName.style}`);
      }
      
      // フォントサイズを設定
      if (childInfo.fontSize !== null && childInfo.fontSize !== undefined) {
        textNode.fontSize = childInfo.fontSize;
        console.log(`Set font size for child: ${childInfo.fontSize}`);
      }
      
      // 行の高さを設定
      if (childInfo.lineHeight !== null && childInfo.lineHeight !== undefined) {
        textNode.lineHeight = childInfo.lineHeight;
      }
      
      // 文字間隔を設定
      if (childInfo.letterSpacing !== null && childInfo.letterSpacing !== undefined) {
        textNode.letterSpacing = childInfo.letterSpacing;
      }
      
      // テキスト配置を設定
      if (childInfo.textAlignHorizontal !== null && childInfo.textAlignHorizontal !== undefined) {
        textNode.textAlignHorizontal = childInfo.textAlignHorizontal;
      }
      if (childInfo.textAlignVertical !== null && childInfo.textAlignVertical !== undefined) {
        textNode.textAlignVertical = childInfo.textAlignVertical;
      }
      
      // テキスト自動リサイズを設定
      if (childInfo.textAutoResize !== null && childInfo.textAutoResize !== undefined) {
        textNode.textAutoResize = childInfo.textAutoResize;
      }
      
      // テキストケースを設定
      if (childInfo.textCase !== null && childInfo.textCase !== undefined) {
        textNode.textCase = childInfo.textCase;
      }
      
      // テキスト装飾を設定
      if (childInfo.textDecoration !== null && childInfo.textDecoration !== undefined) {
        textNode.textDecoration = childInfo.textDecoration;
      }
      
      // 段落インデントを設定
      if (childInfo.paragraphIndent !== null && childInfo.paragraphIndent !== undefined) {
        textNode.paragraphIndent = childInfo.paragraphIndent;
      }
      
      // 段落間隔を設定
      if (childInfo.paragraphSpacing !== null && childInfo.paragraphSpacing !== undefined) {
        textNode.paragraphSpacing = childInfo.paragraphSpacing;
      }
      
      // テキストの塗りつぶし（色）を設定
      if (childInfo.textFills && Array.isArray(childInfo.textFills)) {
        try {
          const cleanTextFills = childInfo.textFills.map((fill: any) => {
            const cleanFill = { ...fill };
            delete cleanFill.gradientStops;
            delete cleanFill.gradientTransform;
            
            if (fill.type === 'IMAGE' && fill.imageHash) {
              return {
                type: 'IMAGE',
                visible: fill.visible !== false,
                opacity: fill.opacity || 1,
                imageHash: fill.imageHash,
                scaleMode: fill.scaleMode || 'FILL',
                imageTransform: fill.imageTransform || [[1, 0, 0], [0, 1, 0]]
              };
            }
            
            return cleanFill;
          });
          textNode.fills = cleanTextFills;
          console.log(`Applied text fills to child:`, cleanTextFills);
        } catch (error) {
          console.warn(`Failed to apply text fills to child: ${childNode.name}`, error);
        }
      }
      
      // テキストのストロークを設定
      if (childInfo.textStrokes && Array.isArray(childInfo.textStrokes)) {
        try {
          const cleanStrokes = childInfo.textStrokes.map((stroke: any) => {
            const cleanStroke = { ...stroke };
            delete cleanStroke.dashPattern;
            return cleanStroke;
          });
          textNode.strokes = cleanStrokes;
          console.log(`Applied text strokes to child:`, cleanStrokes);
        } catch (error) {
          console.warn(`Failed to apply text strokes to child: ${childNode.name}`, error);
        }
      }
      
      // テキストのエフェクトを設定
      if (childInfo.textEffects && Array.isArray(childInfo.textEffects)) {
        try {
          textNode.effects = childInfo.textEffects;
          console.log(`Applied text effects to child:`, childInfo.textEffects);
        } catch (error) {
          console.warn(`Failed to apply text effects to child: ${childNode.name}`, error);
        }
      }
    }
    
    // 可視性とロック状態
    if (childInfo.visible !== undefined) {
      childNode.visible = childInfo.visible;
    }
    if (childInfo.locked !== undefined) {
      childNode.locked = childInfo.locked;
    }
    
    // 回転
    if (childInfo.rotation !== null && childInfo.rotation !== undefined) {
      childNode.rotation = childInfo.rotation;
    }
    
    // 透明度
    if (childInfo.opacity !== null && childInfo.opacity !== undefined) {
      childNode.opacity = childInfo.opacity;
    }
    
    // クリッピングマスク
    if (childInfo.clipsContent !== null && childInfo.clipsContent !== undefined) {
      if ('clipsContent' in childNode) {
        childNode.clipsContent = childInfo.clipsContent;
        console.log(`Set clipsContent for child node: ${childNode.name} = ${childInfo.clipsContent}`);
      }
    }
    
    // 塗りつぶし情報を適用
    if (childInfo.fills && Array.isArray(childInfo.fills)) {
      try {
        // グラデーション関連のプロパティを除去してから設定
        const cleanFills = childInfo.fills.map((fill: any) => {
          const cleanFill = { ...fill };
          // グラデーション関連のプロパティを削除
          delete cleanFill.gradientStops;
          delete cleanFill.gradientTransform;
          
          // IMAGEタイプの場合は画像ハッシュを保持
          if (fill.type === 'IMAGE' && fill.imageHash) {
            return {
              type: 'IMAGE',
              visible: fill.visible !== false,
              opacity: fill.opacity || 1,
              imageHash: fill.imageHash,
              scaleMode: fill.scaleMode || 'FILL',
              imageTransform: fill.imageTransform || [[1, 0, 0], [0, 1, 0]]
            };
          }
          
          return cleanFill;
        });
        childNode.fills = cleanFills;
        console.log(`Applied fills to child node: ${childNode.name}`, cleanFills);
      } catch (error) {
        console.warn(`Failed to apply fills to child node: ${childNode.name}`, error);
      }
    }
    
    // ストローク情報を適用
    if (childInfo.strokes && Array.isArray(childInfo.strokes)) {
      try {
        const cleanStrokes = childInfo.strokes.map((stroke: any) => {
          const cleanStroke = { ...stroke };
          delete cleanStroke.dashPattern;
          return cleanStroke;
        });
        childNode.strokes = cleanStrokes;
        console.log(`Applied strokes to child node: ${childNode.name}`, cleanStrokes);
      } catch (error) {
        console.warn(`Failed to apply strokes to child node: ${childNode.name}`, error);
      }
    }
    
    // エフェクト情報を適用
    if (childInfo.effects && Array.isArray(childInfo.effects)) {
      try {
        childNode.effects = childInfo.effects;
        console.log(`Applied effects to child node: ${childNode.name}`, childInfo.effects);
      } catch (error) {
        console.warn(`Failed to apply effects to child node: ${childNode.name}`, error);
      }
    }
    
    // 角丸（矩形の場合）
    if (childInfo.type === 'RECTANGLE' && childInfo.cornerRadius !== null && childInfo.cornerRadius !== undefined) {
      try {
        (childNode as RectangleNode).cornerRadius = childInfo.cornerRadius;
        console.log(`Applied corner radius to child node: ${childNode.name}`, childInfo.cornerRadius);
      } catch (error) {
        console.warn(`Failed to apply corner radius to child node: ${childNode.name}`, error);
      }
    }
    
    // 線の情報（LINEノード用）
    if (childInfo.type === 'LINE') {
      try {
        const lineNode = childNode as LineNode;
        if (childInfo.strokeWeight !== null && childInfo.strokeWeight !== undefined) {
          lineNode.strokeWeight = childInfo.strokeWeight;
        }
        if (childInfo.strokeAlign !== null && childInfo.strokeAlign !== undefined) {
          lineNode.strokeAlign = childInfo.strokeAlign;
        }
        if (childInfo.strokeCap !== null && childInfo.strokeCap !== undefined) {
          lineNode.strokeCap = childInfo.strokeCap;
        }
        if (childInfo.strokeJoin !== null && childInfo.strokeJoin !== undefined) {
          lineNode.strokeJoin = childInfo.strokeJoin;
        }
        if (childInfo.dashPattern !== null && childInfo.dashPattern !== undefined) {
          lineNode.dashPattern = childInfo.dashPattern;
        }
        console.log(`Applied line properties to child node: ${childNode.name}`);
      } catch (error) {
        console.warn(`Failed to apply line properties to child node: ${childNode.name}`, error);
      }
    }
    
    return childNode;
    
  } catch (error: any) {
    console.error(`Failed to create child node: ${childInfo.name}`, error);
    return null;
  }
} 
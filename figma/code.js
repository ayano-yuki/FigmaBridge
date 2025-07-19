"use strict";
/// <reference types="@figma/plugin-typings" />
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
figma.showUI(__html__, { width: 640, height: 560 });
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        switch (msg.type) {
            case 'export-zip':
                yield exportToZip(msg.exportType);
                break;
            default:
                throw new Error('不明なメッセージタイプです');
        }
    }
    catch (error) {
        figma.ui.postMessage({ type: 'error', message: error.message || String(error) });
    }
});
// フレーム内に画像があるかどうかをチェックする関数
function hasImageInFrame(frame) {
    const checkNode = (node) => {
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
function getImageNodesInFrame(frame) {
    const imageNodes = [];
    const collectImageNodes = (node) => {
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
function hasImageInGroup(group) {
    const checkNode = (node) => {
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
function getImageNodesInGroup(group) {
    const imageNodes = [];
    const collectImageNodes = (node) => {
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
function exportToZip(exportType) {
    return __awaiter(this, void 0, void 0, function* () {
        let nodes = [];
        let metadata = {};
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
                const allNodes = [];
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
        const exportSettings = {
            format: 'PNG',
            constraint: { type: 'SCALE', value: 2 }
        };
        const results = yield Promise.all(nodes.map((node) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            const nodeMetadata = {
                id: node.id,
                name: node.name,
                type: node.type,
                x: node.x,
                y: node.y,
                width: node.width,
                height: node.height,
                visible: node.visible,
                locked: node.locked,
                // 回転とスケール情報
                rotation: 'rotation' in node ? node.rotation : null,
                scaleX: 'scaleX' in node ? node.scaleX : null,
                scaleY: 'scaleY' in node ? node.scaleY : null,
                // 制約情報
                constraints: 'constraints' in node ? node.constraints : null,
                // レイアウト情報
                layoutAlign: 'layoutAlign' in node ? node.layoutAlign : null,
                layoutGrow: 'layoutGrow' in node ? node.layoutGrow : null,
                // 角丸情報
                cornerRadius: 'cornerRadius' in node ? node.cornerRadius : null,
                // 塗りつぶし情報
                fills: 'fills' in node && node.fills && Array.isArray(node.fills) ? node.fills.map(fill => ({
                    type: fill.type,
                    visible: fill.visible,
                    opacity: fill.opacity,
                    color: fill.type === 'SOLID' ? fill.color : null,
                    gradientStops: fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL' ? fill.gradientStops : null,
                    gradientTransform: fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL' ? fill.gradientTransform : null
                })) : [],
                // ストローク情報
                strokes: 'strokes' in node && node.strokes && Array.isArray(node.strokes) ? node.strokes.map(stroke => ({
                    type: stroke.type,
                    visible: stroke.visible,
                    opacity: stroke.opacity,
                    color: stroke.type === 'SOLID' ? stroke.color : null,
                    weight: 'weight' in stroke ? stroke.weight : null,
                    align: 'align' in stroke ? stroke.align : null,
                    dashPattern: 'dashPattern' in stroke ? stroke.dashPattern : null
                })) : [],
                // エフェクト情報
                effects: 'effects' in node && node.effects && Array.isArray(node.effects) ? node.effects.map(effect => ({
                    type: effect.type,
                    visible: effect.visible,
                    radius: effect.radius,
                    color: effect.color,
                    offset: effect.offset,
                    spread: effect.spread,
                    blendMode: effect.blendMode
                })) : [],
                // ブレンドモード
                blendMode: 'blendMode' in node ? node.blendMode : null,
                // 透明度
                opacity: 'opacity' in node ? node.opacity : null,
                // 絶対変換
                absoluteTransform: node.absoluteTransform,
                // 相対変換
                relativeTransform: node.relativeTransform,
                // クリッピングマスク
                clipsContent: 'clipsContent' in node ? node.clipsContent : null,
                // レイアウトモード
                layoutMode: 'layoutMode' in node ? node.layoutMode : null,
                // パディング
                paddingLeft: 'paddingLeft' in node ? node.paddingLeft : null,
                paddingRight: 'paddingRight' in node ? node.paddingRight : null,
                paddingTop: 'paddingTop' in node ? node.paddingTop : null,
                paddingBottom: 'paddingBottom' in node ? node.paddingBottom : null,
                // アイテム間隔
                itemSpacing: 'itemSpacing' in node ? node.itemSpacing : null,
                // 配置
                primaryAxisAlignItems: 'primaryAxisAlignItems' in node ? node.primaryAxisAlignItems : null,
                counterAxisAlignItems: 'counterAxisAlignItems' in node ? node.counterAxisAlignItems : null,
                // 自動レイアウト
                layoutSizingHorizontal: 'layoutSizingHorizontal' in node ? node.layoutSizingHorizontal : null,
                layoutSizingVertical: 'layoutSizingVertical' in node ? node.layoutSizingVertical : null,
                // 制約
                layoutAlignHorizontal: 'layoutAlignHorizontal' in node ? node.layoutAlignHorizontal : null,
                layoutAlignVertical: 'layoutAlignVertical' in node ? node.layoutAlignVertical : null,
                // サイズ調整
                layoutGrowHorizontal: 'layoutGrowHorizontal' in node ? node.layoutGrowHorizontal : null,
                layoutGrowVertical: 'layoutGrowVertical' in node ? node.layoutGrowVertical : null
            };
            // グループ化されたノードの情報を追加
            if (node.parent && node.parent.type === 'GROUP') {
                nodeMetadata.isInGroup = true;
                nodeMetadata.groupId = node.parent.id;
                nodeMetadata.groupName = node.parent.name;
                nodeMetadata.groupIndex = ((_a = node.parent.children) === null || _a === void 0 ? void 0 : _a.indexOf(node)) || 0;
            }
            // フレーム内のノードの情報を追加
            if (node.parent && node.parent.type === 'FRAME') {
                nodeMetadata.isInFrame = true;
                nodeMetadata.frameId = node.parent.id;
                nodeMetadata.frameName = node.parent.name;
                nodeMetadata.frameIndex = ((_b = node.parent.children) === null || _b === void 0 ? void 0 : _b.indexOf(node)) || 0;
            }
            // コンポーネント内のノードの情報を追加
            if (node.parent && node.parent.type === 'COMPONENT') {
                nodeMetadata.isInComponent = true;
                nodeMetadata.componentId = node.parent.id;
                nodeMetadata.componentName = node.parent.name;
                nodeMetadata.componentIndex = ((_c = node.parent.children) === null || _c === void 0 ? void 0 : _c.indexOf(node)) || 0;
            }
            // グループノードの場合、グループ構造の情報を追加
            if (node.type === 'GROUP') {
                const groupNode = node;
                nodeMetadata.groupStructure = {
                    id: groupNode.id,
                    name: groupNode.name,
                    children: ((_d = groupNode.children) === null || _d === void 0 ? void 0 : _d.map((child, index) => ({
                        id: child.id,
                        name: child.name,
                        type: child.type,
                        index: index,
                        x: child.x - groupNode.x, // グループ内での相対位置
                        y: child.y - groupNode.y
                    }))) || []
                };
            }
            // フレームノードの場合、フレーム構造の情報を追加
            if (node.type === 'FRAME') {
                const frameNode = node;
                nodeMetadata.frameStructure = {
                    id: frameNode.id,
                    name: frameNode.name,
                    children: ((_e = frameNode.children) === null || _e === void 0 ? void 0 : _e.map((child, index) => ({
                        id: child.id,
                        name: child.name,
                        type: child.type,
                        index: index,
                        x: child.x - frameNode.x, // フレーム内での相対位置
                        y: child.y - frameNode.y
                    }))) || []
                };
            }
            // コンポーネントノードの場合、コンポーネント構造の情報を追加
            if (node.type === 'COMPONENT') {
                const componentNode = node;
                nodeMetadata.componentStructure = {
                    id: componentNode.id,
                    name: componentNode.name,
                    children: ((_f = componentNode.children) === null || _f === void 0 ? void 0 : _f.map((child, index) => ({
                        id: child.id,
                        name: child.name,
                        type: child.type,
                        index: index,
                        x: child.x - componentNode.x, // コンポーネント内での相対位置
                        y: child.y - componentNode.y
                    }))) || []
                };
            }
            // テキストノードの場合、フォント情報を追加
            if (node.type === 'TEXT') {
                const textNode = node;
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
            let folderType = 'img';
            let fileExtension = 'png';
            let bytes = null;
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
            }
            else if (node.type === 'GROUP') {
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
            }
            else {
                // 画像フィルを持つノードを画像として識別
                if ('fills' in node && node.fills && Array.isArray(node.fills)) {
                    const imageFills = node.fills.filter(fill => fill.type === 'IMAGE' && fill.visible !== false);
                    if (imageFills.length > 0) {
                        folderType = 'img';
                        fileExtension = 'png';
                        nodeMetadata.hasImageFill = true;
                        nodeMetadata.imageFillCount = imageFills.length;
                        // 画像データを抽出
                        if ('exportAsync' in node) {
                            bytes = yield node.exportAsync(exportSettings);
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
                    // 画像データを抽出
                    if ('exportAsync' in node) {
                        bytes = yield node.exportAsync(exportSettings);
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
            }
            else {
                nodeMetadata.hasImageFile = false;
            }
            // 親ノードの情報も含める（インポート時の配置に必要）
            if (node.parent && 'name' in node.parent) {
                nodeMetadata.parentName = node.parent.name;
            }
            // ノードタイプに応じた追加情報
            if (node.type === 'FRAME' || node.type === 'GROUP') {
                nodeMetadata.children = (_g = node.children) === null || _g === void 0 ? void 0 : _g.map(child => ({
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
        })));
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
                        try {
                            const imageBytes = yield imageNode.exportAsync(exportSettings);
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
                        }
                        catch (error) {
                            console.error(`Failed to export image node: ${imageNodeInfo.name}`, error);
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
    });
}

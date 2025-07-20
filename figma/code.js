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
// エクスポート機能のクラス
class DesignExporter {
    constructor() {
        this.imageCounter = 0;
    }
    // ノードをデザインデータに変換
    serializeNode(node) {
        const designNode = {
            id: node.id,
            name: node.name,
            type: node.type,
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
            properties: this.getNodeProperties(node)
        };
        // 子ノードがある場合は再帰的に処理
        if ('children' in node && node.children) {
            designNode.children = node.children.map(child => this.serializeNode(child));
        }
        return designNode;
    }
    // ノードのプロパティを取得
    getNodeProperties(node) {
        const properties = {};
        // テキストノードの処理
        if (node.type === 'TEXT') {
            const textNode = node;
            properties.characters = textNode.characters;
            // 混合スタイルのチェックと処理
            const hasMixedStyles = textNode.fontName === figma.mixed ||
                textNode.fontSize === figma.mixed ||
                textNode.fills === figma.mixed ||
                textNode.letterSpacing === figma.mixed ||
                textNode.lineHeight === figma.mixed;
            // より安全な混合スタイル検出
            let hasMixedStylesSafe = false;
            try {
                const segments = textNode.getStyledTextSegments(['fontName']);
                hasMixedStylesSafe = segments.length > 1;
                console.log(`混合スタイル検出: ${node.name}, セグメント数: ${segments.length}, 混合: ${hasMixedStylesSafe}`);
            }
            catch (error) {
                hasMixedStylesSafe = hasMixedStyles;
                console.warn(`混合スタイル検出でエラー: ${node.name}`, error);
            }
            if (hasMixedStylesSafe) {
                // 混合スタイルの場合はセグメント情報を保存
                console.log(`混合スタイルを処理中: ${node.name}`);
                try {
                    const segments = textNode.getStyledTextSegments([
                        'fontName',
                        'fontSize',
                        'fills',
                        'letterSpacing',
                        'lineHeight'
                    ]);
                    console.log(`セグメント数: ${segments.length}`, segments);
                    // セグメント情報をシリアライズ可能な形式に変換
                    properties.styledSegments = segments.map((segment, index) => {
                        console.log(`セグメント ${index}:`, segment);
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
                    console.log(`混合スタイルの処理が完了しました: ${node.name}`);
                }
                catch (error) {
                    console.error(`混合スタイルの処理中にエラーが発生しました: ${node.name}`, error);
                    console.error('エラーの詳細:', error.message, error.stack);
                    // エラーが発生した場合は単一スタイルとして処理
                    try {
                        if (typeof textNode.fontSize === 'number')
                            properties.fontSize = textNode.fontSize;
                        if (textNode.fontName && typeof textNode.fontName === 'object')
                            properties.fontName = textNode.fontName;
                        if (textNode.fills && Array.isArray(textNode.fills))
                            properties.fills = textNode.fills;
                        if (textNode.strokes && Array.isArray(textNode.strokes))
                            properties.strokes = textNode.strokes;
                        if (typeof textNode.strokeWeight === 'number')
                            properties.strokeWeight = textNode.strokeWeight;
                        if (typeof textNode.textAlignHorizontal === 'string')
                            properties.textAlignHorizontal = textNode.textAlignHorizontal;
                        if (typeof textNode.textAlignVertical === 'string')
                            properties.textAlignVertical = textNode.textAlignVertical;
                        if (typeof textNode.lineHeight === 'number' || typeof textNode.lineHeight === 'object')
                            properties.lineHeight = textNode.lineHeight;
                        if (typeof textNode.letterSpacing === 'number' || typeof textNode.letterSpacing === 'object')
                            properties.letterSpacing = textNode.letterSpacing;
                    }
                    catch (fallbackError) {
                        console.warn(`フォールバック処理中にエラーが発生しました: ${node.name}`, fallbackError);
                    }
                }
            }
            else {
                // 単一スタイルの場合は通常通り保存
                try {
                    if (typeof textNode.fontSize === 'number')
                        properties.fontSize = textNode.fontSize;
                    if (textNode.fontName && typeof textNode.fontName === 'object')
                        properties.fontName = textNode.fontName;
                    if (textNode.fills && Array.isArray(textNode.fills))
                        properties.fills = textNode.fills;
                    if (textNode.strokes && Array.isArray(textNode.strokes))
                        properties.strokes = textNode.strokes;
                    if (typeof textNode.strokeWeight === 'number')
                        properties.strokeWeight = textNode.strokeWeight;
                    if (typeof textNode.textAlignHorizontal === 'string')
                        properties.textAlignHorizontal = textNode.textAlignHorizontal;
                    if (typeof textNode.textAlignVertical === 'string')
                        properties.textAlignVertical = textNode.textAlignVertical;
                    if (typeof textNode.lineHeight === 'number' || typeof textNode.lineHeight === 'object')
                        properties.lineHeight = textNode.lineHeight;
                    if (typeof textNode.letterSpacing === 'number' || typeof textNode.letterSpacing === 'object')
                        properties.letterSpacing = textNode.letterSpacing;
                }
                catch (error) {
                    console.warn(`単一スタイルのプロパティ設定中にエラーが発生しました: ${node.name}`, error);
                }
            }
        }
        // 図形ノードの処理
        if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE' ||
            node.type === 'POLYGON' || node.type === 'STAR' ||
            node.type === 'VECTOR' || node.type === 'LINE') {
            properties.fills = node.fills;
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
    processImageNode(node) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const images = {};
                let designNode = this.serializeNode(node);
                // 現在のノードの画像を処理
                yield this.processNodeImages(node, designNode, images);
                // 子ノードの画像を再帰的に処理
                if ('children' in node && node.children) {
                    for (const child of node.children) {
                        try {
                            const childImages = yield this.processImageNode(child);
                            Object.assign(images, childImages.images);
                        }
                        catch (error) {
                            console.error(`子ノード処理中にエラーが発生しました: ${child.name}`, error);
                        }
                    }
                }
                return { node: designNode, images };
            }
            catch (error) {
                console.error(`processImageNodeでエラーが発生しました: ${node.name}`, error);
                // エラーが発生した場合でも基本的なノード情報は返す
                const designNode = this.serializeNode(node);
                return { node: designNode, images: {} };
            }
        });
    }
    // 個別ノードの画像を処理
    processNodeImages(node, designNode, images) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 塗り（fills）の画像を処理
                if ('fills' in node && node.fills && Array.isArray(node.fills)) {
                    const fills = node.fills;
                    for (const fill of fills) {
                        if (fill.type === 'IMAGE' && fill.imageHash) {
                            try {
                                const image = figma.getImageByHash(fill.imageHash);
                                if (image) {
                                    const imageBytes = yield image.getBytesAsync();
                                    const imageName = `img/image_${this.imageCounter}.png`;
                                    const base64Data = this.arrayBufferToBase64(imageBytes);
                                    images[imageName] = base64Data;
                                    designNode.imageData = imageName;
                                    this.imageCounter++;
                                    console.log(`画像を処理しました: ${imageName} (ノード: ${node.name}, サイズ: ${imageBytes.byteLength} bytes)`);
                                }
                            }
                            catch (error) {
                                console.error(`画像の処理中にエラーが発生しました (ノード: ${node.name}):`, error);
                            }
                        }
                    }
                }
                // 線（strokes）の画像を処理
                if ('strokes' in node && node.strokes && Array.isArray(node.strokes)) {
                    const strokes = node.strokes;
                    for (const stroke of strokes) {
                        if (stroke.type === 'IMAGE' && stroke.imageHash) {
                            try {
                                const image = figma.getImageByHash(stroke.imageHash);
                                if (image) {
                                    const imageBytes = yield image.getBytesAsync();
                                    const imageName = `img/image_${this.imageCounter}.png`;
                                    const base64Data = this.arrayBufferToBase64(imageBytes);
                                    images[imageName] = base64Data;
                                    designNode.imageData = imageName;
                                    this.imageCounter++;
                                    console.log(`画像を処理しました: ${imageName} (ノード: ${node.name}, サイズ: ${imageBytes.byteLength} bytes)`);
                                }
                            }
                            catch (error) {
                                console.error(`画像の処理中にエラーが発生しました (ノード: ${node.name}):`, error);
                            }
                        }
                    }
                }
                // 効果（effects）の画像を処理
                if ('effects' in node && node.effects && Array.isArray(node.effects)) {
                    for (const effect of node.effects) {
                        if (effect.type === 'DROP_SHADOW' && effect.color) {
                            // ドロップシャドウの画像処理（必要に応じて）
                        }
                    }
                }
                // 背景（backgrounds）の画像を処理（フレーム用）
                if ('backgrounds' in node && node.backgrounds && Array.isArray(node.backgrounds)) {
                    const backgrounds = node.backgrounds;
                    for (const background of backgrounds) {
                        if (background.type === 'IMAGE' && background.imageHash) {
                            try {
                                const image = figma.getImageByHash(background.imageHash);
                                if (image) {
                                    const imageBytes = yield image.getBytesAsync();
                                    const imageName = `img/image_${this.imageCounter}.png`;
                                    const base64Data = this.arrayBufferToBase64(imageBytes);
                                    images[imageName] = base64Data;
                                    designNode.imageData = imageName;
                                    this.imageCounter++;
                                    console.log(`背景画像を処理しました: ${imageName} (ノード: ${node.name}, サイズ: ${imageBytes.byteLength} bytes)`);
                                }
                            }
                            catch (error) {
                                console.error(`背景画像の処理中にエラーが発生しました (ノード: ${node.name}):`, error);
                            }
                        }
                    }
                }
            }
            catch (error) {
                console.error(`processNodeImagesでエラーが発生しました: ${node.name}`, error);
            }
        });
    }
    // ArrayBufferをBase64に変換
    arrayBufferToBase64(buffer) {
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
    exportDesign(target) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('エクスポート開始:', target);
                let nodes = [];
                if (target === 'selected') {
                    nodes = figma.currentPage.selection;
                    if (nodes.length === 0) {
                        throw new Error('エクスポート対象のノードが選択されていません');
                    }
                }
                else {
                    nodes = figma.currentPage.children;
                }
                console.log(`処理対象ノード数: ${nodes.length}`);
                const designNodes = [];
                const allImages = {};
                let processedImageCount = 0;
                for (let i = 0; i < nodes.length; i++) {
                    const node = nodes[i];
                    try {
                        console.log(`ノード処理中 (${i + 1}/${nodes.length}): ${node.name} (${node.type})`);
                        const { node: designNode, images } = yield this.processImageNode(node);
                        designNodes.push(designNode);
                        // 画像データを収集
                        const imageCount = Object.keys(images).length;
                        if (imageCount > 0) {
                            Object.assign(allImages, images);
                            processedImageCount += imageCount;
                            console.log(`ノード "${node.name}" から ${imageCount} 個の画像を処理しました`);
                        }
                    }
                    catch (error) {
                        console.error(`ノード処理中にエラーが発生しました: ${node.name}`, error);
                        // エラーが発生しても処理を継続
                    }
                }
                console.log(`合計 ${processedImageCount} 個の画像を処理しました`);
                console.log('画像ファイル一覧:', Object.keys(allImages));
                const result = {
                    version: '1.0.0',
                    nodes: designNodes,
                    images: allImages
                };
                console.log('エクスポート完了');
                return result;
            }
            catch (error) {
                console.error('エクスポート処理中にエラーが発生しました:', error);
                throw error;
            }
        });
    }
}
// インポート機能のクラス
class DesignImporter {
    // デザインデータからノードを再作成
    createNodeFromData(nodeData, imageMap) {
        return __awaiter(this, void 0, void 0, function* () {
            let node;
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
            node.x = nodeData.x;
            node.y = nodeData.y;
            node.resize(nodeData.width, nodeData.height);
            // ノード固有のプロパティを設定
            yield this.applyNodeProperties(node, nodeData, imageMap);
            // 子ノードを再帰的に作成
            if (nodeData.children && nodeData.children.length > 0) {
                const childNodes = [];
                for (const childData of nodeData.children) {
                    const childNode = yield this.createNodeFromData(childData, imageMap);
                    childNodes.push(childNode);
                }
                if (nodeData.type === 'GROUP') {
                    // グループの場合は、子ノードを作成後にグループを作成
                    const group = figma.group(childNodes, figma.currentPage);
                    group.name = nodeData.name;
                    group.x = nodeData.x;
                    group.y = nodeData.y;
                    group.resize(nodeData.width, nodeData.height);
                    return group;
                }
                else if (node.type === 'FRAME') {
                    // フレームの場合は子ノードを追加
                    const frame = node;
                    for (const childNode of childNodes) {
                        frame.appendChild(childNode);
                    }
                }
            }
            return node;
        });
    }
    // 混合スタイルのテキストセグメントを適用
    applyStyledTextSegments(textNode, styledSegments) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`セグメント適用開始: ${styledSegments.length} セグメント`);
            for (let i = 0; i < styledSegments.length; i++) {
                const segment = styledSegments[i];
                const start = segment.start;
                const end = segment.end;
                console.log(`セグメント ${i} を処理中: "${segment.characters}" (${start}-${end})`);
                try {
                    // フォントを読み込む
                    if (segment.fontName) {
                        try {
                            yield figma.loadFontAsync(segment.fontName);
                            textNode.setRangeFontName(start, end, segment.fontName);
                            console.log(`フォントを適用: ${segment.fontName.family} ${segment.fontName.style}`);
                        }
                        catch (error) {
                            console.warn(`フォントの読み込みに失敗しました: ${segment.fontName}`, error);
                            // デフォルトフォントでフォールバック
                            try {
                                yield figma.loadFontAsync({ family: "Inter", style: "Regular" });
                                textNode.setRangeFontName(start, end, { family: "Inter", style: "Regular" });
                            }
                            catch (fallbackError) {
                                console.error(`デフォルトフォントの読み込みにも失敗しました:`, fallbackError);
                            }
                        }
                    }
                    // その他のスタイルを適用
                    if (segment.fontSize) {
                        textNode.setRangeFontSize(start, end, segment.fontSize);
                        console.log(`フォントサイズを適用: ${segment.fontSize}`);
                    }
                    if (segment.fills) {
                        textNode.setRangeFills(start, end, segment.fills);
                        console.log(`塗り色を適用`);
                    }
                    if (segment.letterSpacing) {
                        textNode.setRangeLetterSpacing(start, end, segment.letterSpacing);
                        console.log(`文字間隔を適用: ${segment.letterSpacing}`);
                    }
                    if (segment.lineHeight) {
                        textNode.setRangeLineHeight(start, end, segment.lineHeight);
                        console.log(`行間を適用: ${segment.lineHeight}`);
                    }
                    console.log(`セグメント ${i} の処理が完了しました`);
                }
                catch (error) {
                    console.error(`セグメント ${i} の処理中にエラーが発生しました:`, error);
                }
            }
            console.log(`すべてのセグメントの処理が完了しました`);
        });
    }
    // ノードのプロパティを適用
    applyNodeProperties(node, nodeData, imageMap) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!nodeData.properties)
                return;
            const props = nodeData.properties;
            // テキストノードの処理
            if (node.type === 'TEXT') {
                const textNode = node;
                // フォントを先に読み込む（確実に完了するまで待機）
                let fontLoaded = false;
                if (props.fontName && props.fontName !== figma.mixed) {
                    try {
                        yield figma.loadFontAsync(props.fontName);
                        textNode.fontName = props.fontName;
                        fontLoaded = true;
                        console.log(`フォントを読み込みました: ${props.fontName.family} ${props.fontName.style}`);
                    }
                    catch (error) {
                        console.warn(`フォントの読み込みに失敗しました: ${props.fontName}`, error);
                        // フォント読み込みに失敗した場合はデフォルトフォントを使用
                        try {
                            yield figma.loadFontAsync({ family: "Inter", style: "Regular" });
                            textNode.fontName = { family: "Inter", style: "Regular" };
                            fontLoaded = true;
                            console.log(`デフォルトフォントを読み込みました: Inter Regular`);
                        }
                        catch (fallbackError) {
                            console.error(`デフォルトフォントの読み込みにも失敗しました:`, fallbackError);
                        }
                    }
                }
                else {
                    // フォント名がない場合はデフォルトフォントを使用
                    try {
                        yield figma.loadFontAsync({ family: "Inter", style: "Regular" });
                        textNode.fontName = { family: "Inter", style: "Regular" };
                        fontLoaded = true;
                        console.log(`デフォルトフォントを読み込みました: Inter Regular`);
                    }
                    catch (error) {
                        console.error(`デフォルトフォントの読み込みに失敗しました:`, error);
                    }
                }
                // フォントが読み込まれた後にテキストを設定
                if (fontLoaded && props.characters) {
                    try {
                        textNode.characters = props.characters;
                        console.log(`テキストを設定しました: ${props.characters}`);
                    }
                    catch (error) {
                        console.error(`テキストの設定中にエラーが発生しました: ${props.characters}`, error);
                    }
                }
                // 混合スタイルの処理
                if (props.styledSegments && Array.isArray(props.styledSegments)) {
                    console.log(`混合スタイルを復元中: ${props.styledSegments.length} セグメント`);
                    yield this.applyStyledTextSegments(textNode, props.styledSegments);
                }
                else {
                    // 単一スタイルの処理（フォント読み込み後に実行）
                    if (fontLoaded) {
                        if (props.fontSize && props.fontSize !== figma.mixed) {
                            try {
                                textNode.fontSize = props.fontSize;
                            }
                            catch (error) {
                                console.error(`フォントサイズの設定中にエラーが発生しました:`, error);
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
                if (props.fills)
                    node.fills = props.fills;
                if (props.strokes)
                    node.strokes = props.strokes;
                if (props.strokeWeight)
                    node.strokeWeight = props.strokeWeight;
                if (props.cornerRadius && 'cornerRadius' in node) {
                    node.cornerRadius = props.cornerRadius;
                }
            }
            // フレームの処理
            if (node.type === 'FRAME') {
                const frame = node;
                if (props.backgrounds)
                    frame.backgrounds = props.backgrounds;
                if (props.layoutMode)
                    frame.layoutMode = props.layoutMode;
                if (props.paddingLeft)
                    frame.paddingLeft = props.paddingLeft;
                if (props.paddingRight)
                    frame.paddingRight = props.paddingRight;
                if (props.paddingTop)
                    frame.paddingTop = props.paddingTop;
                if (props.paddingBottom)
                    frame.paddingBottom = props.paddingBottom;
                if (props.itemSpacing)
                    frame.itemSpacing = props.itemSpacing;
            }
            // 画像の処理
            if (nodeData.imageData && imageMap[nodeData.imageData]) {
                try {
                    const imageBytes = this.base64ToUint8Array(imageMap[nodeData.imageData]);
                    const image = figma.createImage(imageBytes);
                    if (node.type === 'RECTANGLE') {
                        const rect = node;
                        rect.fills = [{
                                type: 'IMAGE',
                                imageHash: image.hash,
                                scaleMode: 'FILL'
                            }];
                    }
                }
                catch (error) {
                    console.error('画像の適用中にエラーが発生しました:', error);
                }
            }
        });
    }
    // Base64をUint8Arrayに変換
    base64ToUint8Array(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }
    // インポート実行
    importDesign(designData, imageMap) {
        return __awaiter(this, void 0, void 0, function* () {
            const createdNodes = [];
            for (const nodeData of designData.nodes) {
                try {
                    const node = yield this.createNodeFromData(nodeData, imageMap);
                    createdNodes.push(node);
                }
                catch (error) {
                    console.error(`ノードの作成中にエラーが発生しました: ${nodeData.name}`, error);
                }
            }
            // 作成されたノードを選択状態にする
            if (createdNodes.length > 0) {
                figma.currentPage.selection = createdNodes;
                figma.viewport.scrollAndZoomIntoView(createdNodes);
            }
        });
    }
}
// メイン処理
const exporter = new DesignExporter();
const importer = new DesignImporter();
figma.showUI(__html__, { width: 400, height: 300 });
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('メッセージ受信:', msg.type);
        switch (msg.type) {
            case 'export':
                console.log('エクスポート開始:', msg.target);
                const designData = yield exporter.exportDesign(msg.target);
                // 画像処理の結果を報告
                const imageCount = Object.keys(designData.images).length;
                console.log('エクスポート成功, 画像数:', imageCount);
                figma.ui.postMessage({
                    type: 'export-success',
                    data: designData,
                    imageCount: imageCount
                });
                break;
            case 'import':
                console.log('インポート開始');
                yield importer.importDesign(msg.designData, msg.imageMap);
                console.log('インポート成功');
                figma.ui.postMessage({ type: 'import-success' });
                break;
            default:
                throw new Error(`未対応のメッセージタイプ: ${msg.type}`);
        }
    }
    catch (error) {
        console.error('メッセージ処理中にエラーが発生しました:', error);
        console.error('エラーの詳細:', error.message, error.stack);
        const errorMessage = error.message || String(error);
        figma.ui.postMessage({
            type: msg.type === 'export' ? 'export-error' : 'import-error',
            message: errorMessage
        });
    }
});

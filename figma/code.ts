/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, { width: 320, height: 120 });

figma.ui.onmessage = () => {
  try {
    const ellipse = figma.createEllipse();
    ellipse.x = 0;
    ellipse.y = 0;
    ellipse.resize(100, 100);
    figma.currentPage.appendChild(ellipse);
    figma.currentPage.selection = [ellipse];
    figma.viewport.scrollAndZoomIntoView([ellipse]);
    figma.ui.postMessage({ type: 'status', message: '(0, 0) に直径100の円を作成しました' });
  } catch (error: any) {
    figma.ui.postMessage({ type: 'error', message: error.message || String(error) });
    figma.ui.postMessage({ type: 'status', message: '' });
  }
}; 
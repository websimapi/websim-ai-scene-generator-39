import { addAssetToScene } from './state.js';
import { redrawCanvas, getLogicalCoordsFromEvent } from './editor.js';
import { selectLibraryAsset } from './ui.js';

let touchDragGhost = null;

function setupDesktopDrag(assetLibrary) {
    assetLibrary.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('library-asset')) {
            const assetData = {
                url: e.target.dataset.assetUrl,
                type: e.target.dataset.assetType,
                prompt: e.target.dataset.assetPrompt
            };
            e.dataTransfer.setData('application/json', JSON.stringify(assetData));
            selectLibraryAsset(e.target);
        }
    });
}

function setupMobileDrag(assetLibrary) {
    let isDraggingFromLibrary = false;
    let dragData = null;

    assetLibrary.addEventListener('touchstart', (e) => {
        if (e.target.classList.contains('library-asset')) {
            e.preventDefault();
            isDraggingFromLibrary = true;
            
            const targetImg = e.target;
            dragData = {
                url: targetImg.dataset.assetUrl,
                type: targetImg.dataset.assetType,
                prompt: targetImg.dataset.assetPrompt,
            };
            
            touchDragGhost = document.createElement('img');
            touchDragGhost.src = targetImg.src;
            touchDragGhost.style.position = 'fixed';
            touchDragGhost.style.width = '60px';
            touchDragGhost.style.height = '60px';
            touchDragGhost.style.pointerEvents = 'none';
            touchDragGhost.style.opacity = '0.7';
            touchDragGhost.style.zIndex = '2000';
            
            const touch = e.touches[0];
            touchDragGhost.style.left = `${touch.clientX - 30}px`;
            touchDragGhost.style.top = `${touch.clientY - 30}px`;
            
            document.body.appendChild(touchDragGhost);
        }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (isDraggingFromLibrary && touchDragGhost) {
            const touch = e.touches[0];
            touchDragGhost.style.left = `${touch.clientX - 30}px`;
            touchDragGhost.style.top = `${touch.clientY - 30}px`;
        }
    });
    
    window.addEventListener('touchend', (e) => {
        if (isDraggingFromLibrary && touchDragGhost) {
            isDraggingFromLibrary = false;

            const touch = e.changedTouches[0];
            const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
            
            if (dropTarget && dropTarget.id === 'editor-canvas') {
                const pos = getLogicalCoordsFromEvent(e);

                const LOGICAL_WIDTH = 1920;
                const assetSize = LOGICAL_WIDTH / 15;
                
                 const newAsset = {
                    ...dragData,
                    id: `asset_${Date.now()}`,
                    x: pos.x - (assetSize / 2),
                    y: pos.y - (assetSize / 2),
                    width: assetSize,
                    height: assetSize,
                    name: `${dragData.type} - ${(dragData.prompt || 'Untitled').substring(0, 15)}...`
                };
                addAssetToScene(newAsset);
                redrawCanvas();
            }

            document.body.removeChild(touchDragGhost);
            touchDragGhost = null;
            dragData = null;
        }
    });
}

export function initializeDragDrop() {
    const assetLibrary = document.getElementById('asset-library');
    setupDesktopDrag(assetLibrary);
    setupMobileDrag(assetLibrary);
}
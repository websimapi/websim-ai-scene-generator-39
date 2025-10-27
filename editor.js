import { sceneState, addAssetToScene, updateAsset, removeAsset, markAsDirty } from './state.js';
import { lastGeneratedAsset, selectLibraryAsset } from './ui.js';
import { updatePropertiesPanel } from './propertiesPanel.js';

let canvas, ctx;
let backgroundImages = [];
const assetImages = {};

const LOGICAL_WIDTH = 1920;
const LOGICAL_HEIGHT = 1080;

let scale = 1;
let offsetX = 0;
let offsetY = 0;

export const assetTypeColors = {
    'Object': '#E0E0E0',    // Light Grey
    'Portal': '#DA70D6',    // Orchid
    'NPC': '#98FB98',       // Pale Green
    'Item': '#87CEEB',      // Sky Blue
    'Character': '#FFA07A', // Light Salmon
    'Background': '#D2B48C'   // Tan
};

let activeTool = 'move'; // 'move', 'add', 'delete'
let selectedAssetId = null;
let isDragging = false;
let dragStartX, dragStartY;

export function getLogicalCoordsFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const isTouchEvent = e.touches || e.changedTouches;
    const touchOrMouseEvent = isTouchEvent ? (e.touches[0] || e.changedTouches[0]) : e;

    // This gives the click position relative to the canvas element
    const canvasX = touchOrMouseEvent.clientX - rect.left;
    const canvasY = touchOrMouseEvent.clientY - rect.top;

    // This converts the canvas-relative coord to a logical scene coord
    return {
        x: (canvasX - offsetX) / scale,
        y: (canvasY - offsetY) / scale,
    };
}

function getMousePos(e) {
    return getScaledPos(e, false);
}

function getTouchPos(e) {
    return getScaledPos(e, true);
}

function onMouseDown(e) {
    if (activeTool !== 'move') return;

    const pos = getLogicalCoordsFromEvent(e);
    const clickedAsset = getAssetAtPos(pos);

    if (clickedAsset) {
        selectAsset(clickedAsset);
        isDragging = true;
        dragStartX = pos.x - clickedAsset.x;
        dragStartY = pos.y - clickedAsset.y;
    } else {
        selectAsset(null);
    }
}

function onTouchStart(e) {
    if (e.touches.length === 1) {
        e.preventDefault();
        const pos = getLogicalCoordsFromEvent(e);
        const clickedAsset = getAssetAtPos(pos);

        if (clickedAsset && activeTool === 'move') {
            selectAsset(clickedAsset);
            isDragging = true;
            dragStartX = pos.x - clickedAsset.x;
            dragStartY = pos.y - clickedAsset.y;
        } else {
            selectAsset(null);
            // This allows tap-to-place on mobile
            if (activeTool === 'add') {
                 onClick(e); // Pass touch event to click handler
            }
        }
    }
}

export function clearAssetImages() {
    // Clear all keys from the assetImages object
    for (const key in assetImages) {
        delete assetImages[key];
    }
    backgroundImages = []; // Also clear background images to force a reload
}

export function initializeCanvas(canvasElement) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
    
    // The resizeCanvas function is now called by the ResizeObserver
    // resizeCanvas(); // Initial call is implicitly handled by the observer firing on observe()
    
    if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(entries => {
            // We are only observing one element. The callback is debounced.
            window.requestAnimationFrame(() => {
                if (!Array.isArray(entries) || !entries.length) {
                    return;
                }
                resizeCanvas();
            });
        });
        resizeObserver.observe(canvas);
    } else {
        // Fallback for older browsers
        resizeCanvas(); // Manual initial call for fallback
        window.addEventListener('resize', resizeCanvas);
    }

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mousemove', onMouseDown);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('dragover', onDragOver);
    canvas.addEventListener('drop', onDrop);
    
    // Touch events
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('touchcancel', onTouchEnd);
    
    document.getElementById('tool-move').addEventListener('click', () => setTool('move'));
    document.getElementById('tool-add').addEventListener('click', () => setTool('add'));
    document.getElementById('tool-delete').addEventListener('click', () => {
        if (selectedAssetId) {
            removeAsset(selectedAssetId);
            delete assetImages[selectedAssetId];
            selectAsset(null);
            redrawCanvas();
        }
    });
}

export function setTool(tool) {
    activeTool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tool-${tool}`).classList.add('active');
    
    switch(tool) {
        case 'move':
            canvas.style.cursor = 'default';
            break;
        case 'add':
            canvas.style.cursor = 'crosshair';
            break;
        case 'delete':
            canvas.style.cursor = 'not-allowed';
            break;
    }
}

function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    redrawCanvas();
}

export function redrawCanvas() {
    if (!ctx) return;
    
    // Clear the entire canvas (including letterbox areas)
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate scale and offset for letterboxing
    const scaleX = canvas.width / LOGICAL_WIDTH;
    const scaleY = canvas.height / LOGICAL_HEIGHT;
    scale = Math.min(scaleX, scaleY);

    const renderWidth = LOGICAL_WIDTH * scale;
    const renderHeight = LOGICAL_HEIGHT * scale;
    
    offsetX = (canvas.width - renderWidth) / 2;
    offsetY = (canvas.height - renderHeight) / 2;
    
    // Save context, translate and scale to draw the scene
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Draw background layers
    if (sceneState.backgrounds.length > 0 && backgroundImages.length !== sceneState.backgrounds.length) {
        backgroundImages = [];
        sceneState.backgrounds.forEach(bgUrl => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = bgUrl;
            img.onload = () => redrawCanvas();
            img.onerror = () => {
                console.error(`Failed to load background image: ${bgUrl}`);
            };
            backgroundImages.push(img);
        });
    }

    if (backgroundImages.length > 0) {
        backgroundImages.forEach(bgImg => {
            if (bgImg.complete && bgImg.naturalWidth !== 0) {
                ctx.drawImage(bgImg, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
            }
        });
    }

    // Draw assets
    sceneState.assets.forEach(asset => {
        if (!assetImages[asset.id]) {
            assetImages[asset.id] = new Image();
            assetImages[asset.id].crossOrigin = 'anonymous';
            assetImages[asset.id].src = asset.url;
            assetImages[asset.id].onload = () => redrawCanvas();
            assetImages[asset.id].onerror = () => {
                console.error(`Failed to load asset image for asset ${asset.id}: ${asset.url}`);
            };
        }
        const img = assetImages[asset.id];
        if (img && img.complete && img.naturalWidth !== 0) {
            ctx.drawImage(img, asset.x, asset.y, asset.width, asset.height);

            // Draw selection box if selected, using the asset type's color
            if (asset.id === selectedAssetId) {
                const color = assetTypeColors[asset.type] || '#007bff'; // Fallback to blue
                ctx.strokeStyle = color;
                ctx.lineWidth = 3; // Thicker for emphasis
                ctx.strokeRect(asset.x, asset.y, asset.width, asset.height);
            }
        }
    });

    // Restore context to remove transformations
    ctx.restore();
}

export function getAssetAtPos(pos) {
    // Iterate backwards to select top-most asset
    for (let i = sceneState.assets.length - 1; i >= 0; i--) {
        const asset = sceneState.assets[i];
        if (pos.x >= asset.x && pos.x <= asset.x + asset.width &&
            pos.y >= asset.y && pos.y <= asset.y + asset.height) {
            return asset;
        }
    }
    return null;
}

function selectAsset(asset) {
    selectedAssetId = asset ? asset.id : null;
    updatePropertiesPanel(selectedAssetId);
    redrawCanvas();
}

function onMouseMove(e) {
    if (isDragging && selectedAssetId && activeTool === 'move') {
        const pos = getLogicalCoordsFromEvent(e);
        updateAsset(selectedAssetId, {
            x: pos.x - dragStartX,
            y: pos.y - dragStartY,
        });
        updatePropertiesPanel(selectedAssetId); // Update coords in panel
        redrawCanvas();
    }
}

function onTouchMove(e) {
    if (e.touches.length === 1) {
        e.preventDefault();
        if (isDragging && selectedAssetId && activeTool === 'move') {
            const pos = getLogicalCoordsFromEvent(e);
            updateAsset(selectedAssetId, {
                x: pos.x - dragStartX,
                y: pos.y - dragStartY,
            });
            updatePropertiesPanel(selectedAssetId);
            redrawCanvas();
        }
    }
}

function onMouseUp(e) {
    if (isDragging) {
        markAsDirty();
    }
    isDragging = false;
}

function onTouchEnd(e) {
    if (isDragging) {
        markAsDirty();
    }
    isDragging = false;
}

function onDragOver(e) {
    e.preventDefault(); // Allow dropping
}

function onDrop(e) {
    e.preventDefault();
    const assetDataString = e.dataTransfer.getData('application/json');
    if (!assetDataString) return;

    try {
        const assetData = JSON.parse(assetDataString);

        if (assetData.type === 'Background') {
            if (sceneState.backgrounds.length < 3) {
                sceneState.backgrounds.push(assetData.url);
                markAsDirty();
                redrawCanvas();

                const libraryItem = document.querySelector(`.library-asset[data-asset-url="${assetData.url}"]`);
                if (libraryItem) {
                    selectLibraryAsset(libraryItem);
                }
            } else {
                alert('Maximum of 3 background layers reached.');
            }
            return;
        }
        
        const pos = getLogicalCoordsFromEvent(e);
        
        const assetSize = LOGICAL_WIDTH / 15; // Make asset size relative

        const newAsset = {
            ...assetData,
            id: `asset_${Date.now()}`,
            x: pos.x - (assetSize / 2), // center on cursor
            y: pos.y - (assetSize / 2),
            width: assetSize,
            height: assetSize,
            name: `${assetData.type} - ${(assetData.prompt || 'Untitled').substring(0, 15)}...`
        };
        addAssetToScene(newAsset);
        selectAsset(newAsset);
        redrawCanvas();
    } catch (error) {
        console.error("Failed to handle drop event:", error);
    }
}

function onClick(e) {
    // For touch, the position needs to be derived from the touch event if it exists
    const pos = getLogicalCoordsFromEvent(e);

    // Click-to-select is now handled by onMouseDown, so we can avoid re-selecting here
    // which might interfere with drag initiation. We only handle adding assets here.
    if (activeTool === 'add') {
        const selectedLibraryAsset = document.querySelector('.library-asset.selected');
        if (!selectedLibraryAsset) {
            alert('Please generate an asset first or select one from the library.');
            return;
        }

        const assetData = {
            url: selectedLibraryAsset.dataset.assetUrl,
            type: selectedLibraryAsset.dataset.assetType,
            prompt: selectedLibraryAsset.dataset.assetPrompt,
        };

        if (assetData.type === 'Background') {
             alert("Backgrounds can't be placed as objects. Select it in the library to set it as the scene background.");
            return;
        }

        const assetSize = LOGICAL_WIDTH / 15; // Make asset size relative

        const newAsset = {
            ...assetData,
            id: `asset_${Date.now()}`,
            x: pos.x - (assetSize / 2), // center it
            y: pos.y - (assetSize / 2),
            width: assetSize,
            height: assetSize,
            name: `${assetData.type} - ${assetData.prompt.substring(0, 15)}...`
        };
        addAssetToScene(newAsset);
        selectAsset(newAsset);
        redrawCanvas();
    }
}

export function getSelectedAsset() {
    return sceneState.assets.find(a => a.id === selectedAssetId);
}
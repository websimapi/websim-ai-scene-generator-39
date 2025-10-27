import { sceneState, updateAsset, removeAsset, getAssetById, addAssetToScene, markAsDirty } from './state.js';
import { updatePropertiesPanel } from './propertiesPanel.js';
import { lastGeneratedAsset } from './ui.js';

let canvas, ctx;
const LOGICAL_WIDTH = 1920;
const LOGICAL_HEIGHT = 1080;

let assetImages = {};
let backgroundImages = {};

let currentTool = 'move';
let selectedAssetId = null;

let isDragging = false;
let isResizing = false;
let resizeHandle = null;
let dragOffsetX = 0, dragOffsetY = 0;

export const assetTypeColors = {
    Object: '#4CAF50', // Green
    Portal: '#9C27B0', // Purple
    NPC: '#2196F3',    // Blue
    Item: '#FFC107',   // Amber
    Character: '#F44336', // Red
    Background: '#795548' // Brown
};

// --- Initialization and Drawing ---

export function initializeCanvas(canvasElement) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mousemove', onMouseDown);
    canvas.addEventListener('mousemove', onClick);
    canvas.addEventListener('mousemove', onDragOver);
    canvas.addEventListener('mousemove', onDrop);
    canvas.addEventListener('mousemove', onTouchStart, { passive: false });
    canvas.addEventListener('mousemove', onTouchMove, { passive: false });
    canvas.addEventListener('mousemove', onTouchEnd);
}

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    redrawCanvas();
}

export function redrawCanvas() {
    if (!ctx) return;
    const scale = canvas.getBoundingClientRect().width / LOGICAL_WIDTH;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw background layers
    sceneState.backgrounds.forEach(bgUrl => {
        if (!bgUrl) return; // Skip null or empty URLs
        const img = backgroundImages[bgUrl];
        if (img && img.complete && img.naturalHeight !== 0) {
            ctx.drawImage(img, 0, 0, canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height);
        } else if (!img) {
            preloadImage(bgUrl, 'background');
        }
    });

    // Draw assets
    sceneState.assets.forEach(asset => {
        const img = assetImages[asset.url];
        if (img && img.complete && img.naturalHeight !== 0) {
            ctx.drawImage(img, asset.x * scale, asset.y * scale, asset.width * scale, asset.height * scale);
        } else if (!img) {
            preloadImage(asset.url, 'asset');
        }
    });
    
    // Draw selection handles if an asset is selected
    if (selectedAssetId) {
        const asset = getAssetById(selectedAssetId);
        if (asset) {
            drawSelectionHandles(asset);
        }
    }
}

function drawSelectionHandles(asset) {
    const scale = canvas.getBoundingClientRect().width / LOGICAL_WIDTH;
    const x = asset.x * scale;
    const y = asset.y * scale;
    const width = asset.width * scale;
    const height = asset.height * scale;

    const handleSize = 8;
    const color = assetTypeColors[asset.type] || '#FFFFFF';
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = color;
    // Corners
    ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(x + width - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(x - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(x + width - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize);
    // Midpoints
    ctx.fillRect(x + width / 2 - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(x + width / 2 - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(x - handleSize / 2, y + height / 2 - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(x + width - handleSize / 2, y + height / 2 - handleSize / 2, handleSize, handleSize);
}


// --- Image Loading ---

function preloadImage(url, type) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
        if (type === 'asset') assetImages[url] = img;
        else if (type === 'background') backgroundImages[url] = img;
        redrawCanvas();
    };
    img.onerror = () => {
        console.error(`Failed to load image: ${url}`);
    };
}

export function clearAssetImages() {
    assetImages = {};
    backgroundImages = {};
}


// --- Coordinate and Hit Detection ---

export function getLogicalCoordsFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const scale = LOGICAL_WIDTH / rect.width;
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    return {
        x: (clientX - rect.left) * scale,
        y: (clientY - rect.top) * scale
    };
}

function getAssetAtPos(pos) {
    // Iterate backwards to select the top-most asset
    for (let i = sceneState.assets.length - 1; i >= 0; i--) {
        const asset = sceneState.assets[i];
        if (pos.x >= asset.x && pos.x <= asset.x + asset.width &&
            pos.y >= asset.y && pos.y <= asset.y + asset.height) {
            return asset;
        }
    }
    return null;
}

function getResizeHandle(pos, asset) {
    const handleSize = 20; // Larger hit area for handles
    const corners = {
        tl: { x: asset.x, y: asset.y },
        tr: { x: asset.x + asset.width, y: asset.y },
        bl: { x: asset.x, y: asset.y + asset.height },
        br: { x: asset.x + asset.width, y: asset.y + asset.height },
    };
    for (const [key, corner] of Object.entries(corners)) {
        if (Math.abs(pos.x - corner.x) < handleSize && Math.abs(pos.y - corner.y) < handleSize) {
            return key;
        }
    }
    return null;
}

// --- Tool and Selection Management ---

export function setTool(toolName) {
    currentTool = toolName;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    const toolButton = document.getElementById(`tool-${toolName}`);
    if (toolButton) {
        toolButton.classList.add('active');
    }
}

export function getSelectedAsset() {
    return getAssetById(selectedAssetId);
}

function selectAsset(assetId) {
    if (selectedAssetId === assetId) return;
    selectedAssetId = assetId;
    updatePropertiesPanel(assetId);
    redrawCanvas();
}

function deselectAll() {
    if (!selectedAssetId) return;
    selectedAssetId = null;
    updatePropertiesPanel(null);
    redrawCanvas();
}


// --- Event Handlers ---

function onMouseDown(e) {
    const pos = getLogicalCoordsFromEvent(e);
    const assetAtPos = getAssetAtPos(pos);

    if (currentTool === 'move') {
        if (selectedAssetId) {
            const selectedAsset = getAssetById(selectedAssetId);
            resizeHandle = getResizeHandle(pos, selectedAsset);
            if (resizeHandle) {
                isResizing = true;
                isDragging = false;
                canvas.style.cursor = 'crosshair'; // Indicate resizing
                return;
            }
        }

        if (assetAtPos) {
            selectAsset(assetAtPos.id);
            isDragging = true;
            dragOffsetX = pos.x - assetAtPos.x;
            dragOffsetY = pos.y - assetAtPos.y;
            canvas.style.cursor = 'grabbing';
        } else {
            deselectAll();
        }
    }
}

function onMouseMove(e) {
    const pos = getLogicalCoordsFromEvent(e);
    const selectedAsset = getAssetById(selectedAssetId);
    
    // Update cursor style on hover
    if (selectedAsset && !isDragging && !isResizing) {
        const handle = getResizeHandle(pos, selectedAsset);
        if (handle) {
            canvas.style.cursor = 'crosshair';
        } else if (getAssetAtPos(pos)) {
            canvas.style.cursor = 'grab';
        } else {
            canvas.style.cursor = 'default';
        }
    }
    
    if (isDragging && selectedAsset) {
        updateAsset(selectedAssetId, {
            x: pos.x - dragOffsetX,
            y: pos.y - dragOffsetY
        });
        redrawCanvas();
    } else if (isResizing && selectedAsset) {
        const oldX = selectedAsset.x;
        const oldY = selectedAsset.y;
        const oldW = selectedAsset.width;
        const oldH = selectedAsset.height;
        let newX = oldX, newY = oldY, newW = oldW, newH = oldH;

        if (resizeHandle.includes('l')) {
            newW = oldX + oldW - pos.x;
            newX = pos.x;
        }
        if (resizeHandle.includes('r')) {
            newW = pos.x - oldX;
        }
        if (resizeHandle.includes('t')) {
            newH = oldY + oldH - pos.y;
            newY = pos.y;
        }
        if (resizeHandle.includes('b')) {
            newH = pos.y - oldY;
        }
        
        // Prevent negative size
        if (newW > 10 && newH > 10) {
            updateAsset(selectedAssetId, { x: newX, y: newY, width: newW, height: newH });
            redrawCanvas();
        }
    }
}

function onMouseUp(e) {
    if (isDragging || isResizing) {
        markAsDirty();
    }
    isDragging = false;
    isResizing = false;
    resizeHandle = null;
    canvas.style.cursor = 'default';
}

function onClick(e) {
    if (isDragging || isResizing) return;
    
    if (currentTool === 'add' && lastGeneratedAsset) {
        const pos = getLogicalCoordsFromEvent(e);
        const assetSize = LOGICAL_WIDTH / 15;
        const newAsset = {
            ...lastGeneratedAsset,
            id: `asset_${Date.now()}`,
            x: pos.x - assetSize / 2,
            y: pos.y - assetSize / 2,
            width: assetSize,
            height: assetSize,
            name: `${lastGeneratedAsset.type} - ${(lastGeneratedAsset.prompt || 'Untitled').substring(0, 15)}...`
        };
        addAssetToScene(newAsset);
        selectAsset(newAsset.id);
        setTool('move'); // Switch back to move tool after adding
        redrawCanvas();
    } else if (currentTool === 'delete') {
        const pos = getLogicalCoordsFromEvent(e);
        const asset = getAssetAtPos(pos);
        if (asset) {
            if (confirm(`Are you sure you want to delete "${asset.name}"?`)) {
                removeAsset(asset.id);
                if (selectedAssetId === asset.id) {
                    deselectAll();
                }
                redrawCanvas();
            }
        }
        setTool('move'); // Switch back after delete attempt
    }
}

// --- Drag and Drop Handlers for Library Assets ---

function onDragOver(e) {
    e.preventDefault();
}

function onDrop(e) {
    e.preventDefault();
    const assetDataString = e.dataTransfer.getData('application/json');
    if (assetDataString) {
        try {
            const assetData = JSON.parse(assetDataString);
            
            if (assetData.type === 'Background') {
                if (sceneState.backgrounds.length < 3 && !sceneState.backgrounds.includes(assetData.url)) {
                    sceneState.backgrounds.push(assetData.url);
                    markAsDirty();
                    redrawCanvas();
                } else if (sceneState.backgrounds.length >= 3) {
                     alert('Maximum of 3 background layers reached.');
                }
                return; // Stop after handling background
            }
            
            const pos = getLogicalCoordsFromEvent(e);
            const assetSize = LOGICAL_WIDTH / 15;

            const newAsset = {
                ...assetData,
                id: `asset_${Date.now()}`,
                x: pos.x - assetSize / 2,
                y: pos.y - assetSize / 2,
                width: assetSize,
                height: assetSize,
                name: `${assetData.type} - ${(assetData.prompt || 'Untitled').substring(0, 15)}...`
            };
            addAssetToScene(newAsset);
            selectAsset(newAsset.id);
            redrawCanvas();

        } catch (error) {
            console.error("Failed to parse dropped asset data:", error);
        }
    }
}


// --- Touch Event Handlers ---
let lastTap = 0;
let touchTimeout;
let touchMoved = false;

function onTouchStart(e) {
    e.preventDefault();
    touchMoved = false;

    // Double tap to add asset
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    clearTimeout(touchTimeout);
    if (tapLength < 500 && tapLength > 0) {
        // Double tap
        onClick(e); 
    } else {
        // Single tap or start of drag
        onMouseDown(e.changedTouches[0]);
    }
    lastTap = currentTime;
}

function onTouchMove(e) {
    e.preventDefault();
    touchMoved = true;
    onMouseMove(e.changedTouches[0]);
}

function onTouchEnd(e) {
    e.preventDefault();
    
    // If it wasn't a drag/resize, treat as a click for selection
    if (!touchMoved && !isDragging && !isResizing) {
        const pos = getLogicalCoordsFromEvent(e);
        const asset = getAssetAtPos(pos);
        if (asset) {
            selectAsset(asset.id);
        } else {
            deselectAll();
        }
    }
    
    onMouseUp(e.changedTouches[0]);
    touchMoved = false;
}


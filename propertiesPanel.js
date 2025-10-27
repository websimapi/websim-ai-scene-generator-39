import { getAssetById, updateAsset, sceneState, markAsDirty } from './state.js';
import { redrawCanvas } from './editor.js';

const propertiesPanel = document.getElementById('properties-panel-content');

function renderBackgroundLayers(selectedAsset) {
    const layersContainer = document.getElementById('background-layers');
    if (!layersContainer) return;

    layersContainer.innerHTML = ''; // Clear existing layers

    for (let i = 0; i < 3; i++) {
        const layerDiv = document.createElement('div');
        layerDiv.className = 'background-layer-slot';
        
        if (sceneState.backgrounds[i]) {
            layerDiv.innerHTML = `
                <img src="${sceneState.backgrounds[i]}" class="layer-thumbnail">
                <span>Layer ${i + 1}</span>
                <button class="remove-layer-btn" data-index="${i}">X</button>
            `;
        } else {
            layerDiv.innerHTML = `<span>Layer ${i + 1} (Empty)</span>`;
        }
        layersContainer.appendChild(layerDiv);
    }

    document.querySelectorAll('.remove-layer-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index, 10);
            sceneState.backgrounds.splice(index, 1);
            markAsDirty();
            redrawCanvas();
            renderBackgroundLayers(selectedAsset); // Re-render layers
        });
    });
}

export function updatePropertiesPanel(assetId) {
    const isLibraryAsset = !getAssetById(assetId);
    let asset;
    
    if (isLibraryAsset) {
        // This is a temporary object for display from a library selection
        const selectedLibraryAsset = document.querySelector('.library-asset.selected');
        if (!selectedLibraryAsset) {
             propertiesPanel.innerHTML = '<p>Select an asset to see its properties.</p>';
             return;
        }
         asset = {
            id: selectedLibraryAsset.dataset.assetId,
            url: selectedLibraryAsset.dataset.assetUrl,
            type: selectedLibraryAsset.dataset.assetType,
            prompt: selectedLibraryAsset.dataset.assetPrompt,
            name: `${selectedLibraryAsset.dataset.assetType} - ${selectedLibraryAsset.dataset.assetPrompt.substring(0, 15)}...`
        };
    } else {
        asset = getAssetById(assetId);
    }
    
    if (!assetId && !asset) {
        propertiesPanel.innerHTML = '<p>Select an asset to see its properties.</p>';
        return;
    }

    if (!asset) {
        propertiesPanel.innerHTML = '<p>Asset not found.</p>';
        return;
    }

    let commonFields = `
        <div class="control-group">
            <label>Name</label>
            <input type="text" id="prop-name" value="${asset.name}" ${isLibraryAsset ? 'disabled' : ''}>
            <label>Type</label>
            <input type="text" id="prop-type" value="${asset.type}" disabled>
            <label>Prompt</label>
            <textarea id="prop-prompt" rows="3" disabled>${asset.prompt}</textarea>
    `;

    if (asset.type === 'Background') {
        propertiesPanel.innerHTML = `
            ${commonFields}
            </div>
            <div class="control-group">
                <h3>Background Layers</h3>
                <div id="background-layers">
                    <!-- Layers will be rendered here by JS -->
                </div>
                <button id="add-background-layer-btn">Add as Background Layer</button>
            </div>
        `;
        renderBackgroundLayers(asset);
        
        const addLayerBtn = document.getElementById('add-background-layer-btn');
        addLayerBtn.addEventListener('click', () => {
            if (sceneState.backgrounds.length < 3) {
                sceneState.backgrounds.push(asset.url);
                markAsDirty();
                redrawCanvas();
                renderBackgroundLayers(asset);
            } else {
                alert('Maximum of 3 background layers reached.');
            }
        });

    } else {
         propertiesPanel.innerHTML = `
            ${commonFields}
                <label>X</label>
                <input type="number" id="prop-x" value="${Math.round(asset.x || 0)}">
                <label>Y</label>
                <input type="number" id="prop-y" value="${Math.round(asset.y || 0)}">
                <label>Width</label>
                <input type="number" id="prop-width" value="${Math.round(asset.width || 0)}">
                <label>Height</label>
                <input type="number" id="prop-height" value="${Math.round(asset.height || 0)}">
            </div>
        `;

        if (!isLibraryAsset) {
            document.getElementById('prop-x').addEventListener('change', (e) => {
                updateAsset(assetId, { x: parseInt(e.target.value, 10) });
                redrawCanvas();
            });
            document.getElementById('prop-y').addEventListener('change', (e) => {
                updateAsset(assetId, { y: parseInt(e.target.value, 10) });
                redrawCanvas();
            });
            document.getElementById('prop-width').addEventListener('change', (e) => {
                updateAsset(assetId, { width: parseInt(e.target.value, 10) });
                redrawCanvas();
            });
            document.getElementById('prop-height').addEventListener('change', (e) => {
                updateAsset(assetId, { height: parseInt(e.target.value, 10) });
                redrawCanvas();
            });
            document.getElementById('prop-name').addEventListener('change', (e) => updateAsset(assetId, { name: e.target.value }));
        }
    }
}
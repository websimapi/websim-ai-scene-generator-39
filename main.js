import { sceneState, addAssetToScene, markAsDirty, isStateDirty } from './state.js';
import { initializeCanvas, redrawCanvas, clearAssetImages, setTool } from './editor.js';
import { generateImage } from './api.js';
import { 
    showLoader, hideLoader, selectLibraryAsset,
    initializeUI, addAssetToLibrary, 
    updateSaveButtonState, updateLastGeneratedAsset,
    checkToolbarState
} from './ui.js';
import { handleImportJson, handleExportJson } from './fileHandlers.js';
import { saveStateToLocalStorage, loadStateFromLocalStorage } from './stateManager.js';
import { initializeDragDrop } from './dragDrop.js';

// DOM Elements
const generateSceneBtn = document.getElementById('generate-scene-btn');
const generateAssetBtn = document.getElementById('generate-asset-btn');
const importJsonBtn = document.getElementById('import-json-btn');
const exportJsonBtn = document.getElementById('export-json-btn');
const saveBtn = document.getElementById('save-btn');
const assetLibrary = document.getElementById('asset-library');
const scenePrompt = document.getElementById('scene-prompt');

const OTHER_ASSET_TYPES = ['Object', 'Portal', 'NPC', 'Item', 'Character'];

function getRandomAssetTypes(count) {
    const shuffled = OTHER_ASSET_TYPES.slice().sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

async function handleGenerateScene() {
    showLoader();
    const prompt = scenePrompt.value || scenePrompt.placeholder;
    try {
        // 1. Generate and set background
        const bgResult = await generateImage(prompt, false, "16:9");
        sceneState.backgrounds = [bgResult.url];

        // 2. Add background to asset library
        const backgroundAssetData = {
            id: `asset_${Date.now()}_bg`,
            type: 'Background',
            prompt: prompt,
            url: bgResult.url,
            name: `BG - ${prompt.substring(0, 15)}...`
        };
        addAssetToLibrary(backgroundAssetData);

        markAsDirty();
        redrawCanvas();

        // 3. Generate 3 random assets
        const randomTypes = getRandomAssetTypes(3);
        const assetPromises = randomTypes.map(async (type) => {
            const assetPrompt = `${type} from a scene described as: ${prompt}`;
            try {
                const result = await generateImage(assetPrompt, true, "1:1");
                const assetData = {
                    id: `asset_${Date.now()}_${type}`,
                    type: type,
                    prompt: assetPrompt,
                    url: result.url,
                    name: `${type} - ${prompt.substring(0, 15)}...`
                };
                addAssetToLibrary(assetData);
            } catch (assetError) {
                console.error(`Failed to generate asset of type ${type}:`, assetError);
                // Don't throw, allow other assets to generate
            }
        });
        
        await Promise.all(assetPromises);

    } catch (error) {
        console.error('Failed to generate scene:', error);
        alert('Could not generate scene background.');
    } finally {
        hideLoader();
        checkToolbarState(); // Check after scene generation
    }
}

async function handleGenerateAsset() {
    showLoader();
    const prompt = document.getElementById('asset-prompt').value;
    if (!prompt) {
        alert('Please enter a prompt for the asset.');
        hideLoader();
        return;
    }
    try {
        const toggleBtn = document.getElementById('asset-transparent-toggle');
        const assetType = document.querySelector('.asset-type-btn.active').dataset.type;
        const isTransparent = toggleBtn.classList.contains('toggled-on');
        const aspectRatio = assetType === 'Background' ? '16:9' : '1:1';
        
        const result = await generateImage(prompt, isTransparent, aspectRatio);
        
        const assetData = {
            id: `asset_${Date.now()}`,
            type: assetType,
            prompt: prompt,
            url: result.url,
            name: `${assetType} - ${prompt.substring(0, 15)}...`
        };
        
        updateLastGeneratedAsset(assetData);
        
        const libraryImg = addAssetToLibrary(assetData);
        selectLibraryAsset(libraryImg);

        markAsDirty();
    } catch (error) {
        console.error('Failed to generate asset:', error);
        alert('Could not generate asset.');
    } finally {
        hideLoader();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Load initial state
    const loadedLibraryAssets = loadStateFromLocalStorage();
    loadedLibraryAssets.forEach(assetData => addAssetToLibrary(assetData));
    
    // 2. Initialize modules
    initializeCanvas(document.getElementById('editor-canvas'));
    initializeDragDrop();
    initializeUI();

    // 3. Initial draw and UI setup
    redrawCanvas();
    checkToolbarState(); // Initial check on page load
    // animatePlaceholder(); // This is now handled inside initializeUI -> setupPromptAnimations

    // 4. Register event listeners
    generateSceneBtn.addEventListener('click', handleGenerateScene);
    generateAssetBtn.addEventListener('click', handleGenerateAsset);
    importJsonBtn.addEventListener('click', handleImportJson);
    exportJsonBtn.addEventListener('click', handleExportJson);
    saveBtn.addEventListener('click', () => {
        saveStateToLocalStorage();
        updateSaveButtonState(false);
        alert('Scene Saved!');
    });

    assetLibrary.addEventListener('click', (e) => {
        if (e.target.classList.contains('library-asset')) {
            selectLibraryAsset(e.target);
        }
    });

    // 5. Setup periodic tasks
    setInterval(() => {
        if (isStateDirty()) {
            saveStateToLocalStorage();
            updateSaveButtonState(false);
        }
    }, 10000); // Autosave every 10 seconds

    setInterval(() => {
        updateSaveButtonState(isStateDirty());
    }, 1000);

    window.addEventListener('beforeunload', (e) => {
        if (isStateDirty()) {
            e.preventDefault();
            e.returnValue = '';
            return 'You have unsaved changes. Are you sure you want to leave?';
        }
    });
});
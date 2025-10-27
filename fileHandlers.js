import { sceneState, markAsDirty } from './state.js';
import { clearAssetImages, redrawCanvas } from './editor.js';
import { updatePropertiesPanel } from './propertiesPanel.js';
import { addAssetToLibrary, checkToolbarState } from './ui.js';

export function handleImportJson() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = readerEvent => {
            try {
                const importedData = JSON.parse(readerEvent.target.result);
                
                if (importedData && Array.isArray(importedData.assets)) {
                    // --- Start of my changes ---

                    // Clear current asset library UI
                    const assetLibrary = document.getElementById('asset-library');
                    assetLibrary.innerHTML = '';

                    // Use a Set to track URLs and avoid adding duplicate assets to the library
                    const addedUrls = new Set();
                    
                    const addUniqueAssetToLibrary = (asset) => {
                        if (asset.url && !addedUrls.has(asset.url)) {
                            addAssetToLibrary(asset);
                            addedUrls.add(asset.url);
                        }
                    };
                    
                    // Add background assets to library
                    if (importedData.backgrounds && Array.isArray(importedData.backgrounds)) {
                        importedData.backgrounds.forEach((bgUrl, index) => {
                            addUniqueAssetToLibrary({
                                id: `imported_bg_${index}_${Date.now()}`,
                                url: bgUrl,
                                type: 'Background',
                                prompt: 'Imported background',
                                name: 'Imported background'
                            });
                        });
                    }

                    // Add canvas assets to library
                    importedData.assets.forEach(addUniqueAssetToLibrary);

                    // --- End of my changes ---

                    if (importedData.background && !Array.isArray(importedData.backgrounds)) {
                        importedData.backgrounds = [importedData.background];
                    }
                    sceneState.backgrounds = importedData.backgrounds || [];
                    sceneState.assets = importedData.assets || [];
                    
                    clearAssetImages();
                    markAsDirty();
                    redrawCanvas();
                    updatePropertiesPanel(null);
                    checkToolbarState(); // Check toolbar state after import
                    console.log("Scene imported successfully.");
                } else {
                    alert('Invalid or corrupted scene file.');
                }
            } catch (error) {
                console.error("Failed to parse JSON file:", error);
                alert('Failed to read or parse the scene file. Please ensure it is a valid JSON.');
            }
        };
        reader.onerror = error => {
            console.error("File reading error:", error);
            alert("Error reading file.");
        };
        reader.readAsText(file);
    };
    input.click();
}

export function handleExportJson() {
    const dataStr = JSON.stringify(sceneState, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'scene.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}
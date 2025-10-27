import { sceneState, clearDirtyFlag } from './state.js';

const ASSET_LIBRARY_KEY = 'assetLibrary';
const SCENE_STATE_KEY = 'sceneState';

export function saveStateToLocalStorage() {
    try {
        console.log("Saving state to localStorage...");
        localStorage.setItem(SCENE_STATE_KEY, JSON.stringify(sceneState));

        const libraryAssets = [];
        document.querySelectorAll('.library-asset').forEach(img => {
            libraryAssets.push({
                url: img.dataset.assetUrl,
                type: img.dataset.assetType,
                prompt: img.dataset.assetPrompt,
            });
        });
        localStorage.setItem(ASSET_LIBRARY_KEY, JSON.stringify(libraryAssets));

        clearDirtyFlag();
        console.log("State saved.");
    } catch (e) {
        console.error("Failed to save state to localStorage", e);
    }
}

export function loadStateFromLocalStorage() {
    let loadedLibrary = [];
    try {
        const savedState = localStorage.getItem(SCENE_STATE_KEY);
        if (savedState) {
            console.log("Loading scene state from localStorage...");
            const parsedState = JSON.parse(savedState);
            if (parsedState && typeof parsedState === 'object') {
                // Migration for background -> backgrounds
                if (parsedState.background && !Array.isArray(parsedState.backgrounds)) {
                    parsedState.backgrounds = [parsedState.background];
                    delete parsedState.background;
                }
                Object.assign(sceneState, parsedState);
            }
        }

        const savedLibrary = localStorage.getItem(ASSET_LIBRARY_KEY);
        if (savedLibrary) {
            console.log("Loading asset library from localStorage...");
            const parsedLibrary = JSON.parse(savedLibrary);
            if(Array.isArray(parsedLibrary)) {
                loadedLibrary = parsedLibrary;
            }
        }
    } catch (e) {
        console.error("Failed to load state from localStorage", e);
    }
    return loadedLibrary;
}
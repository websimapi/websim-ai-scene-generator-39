import { getAssetById, updateAsset, sceneState, markAsDirty } from './state.js';
import { redrawCanvas, setTool, assetTypeColors } from './editor.js';
import { updatePropertiesPanel } from './propertiesPanel.js';
import { setupPromptAnimations } from './promptAnimator.js';
import { initializePanelManager } from './panelManager.js';

export let lastGeneratedAsset = null;

const loadingOverlay = document.getElementById('loading-overlay');
const saveBtn = document.getElementById('save-btn');
const assetLibrary = document.getElementById('asset-library');

export function checkToolbarState() {
    const toolbar = document.getElementById('toolbar');
    const appContainer = document.getElementById('app-container');
    const floatingToolsContainer = document.getElementById('floating-tools-container');
    const toolsDropdown = document.querySelector('.dropdown'); // More robust selector

    if (!toolbar || !toolsDropdown || !floatingToolsContainer) return;

    // Condition to hide toolbar: if there's a background or any assets.
    const shouldHideToolbar = sceneState.backgrounds.length > 0 || sceneState.assets.length > 0;

    if (shouldHideToolbar) {
        toolbar.classList.add('hidden');
        appContainer.classList.add('full-height');
        
        // Move dropdown to floating container if it's not already there
        if (toolsDropdown.parentElement !== floatingToolsContainer) {
            floatingToolsContainer.appendChild(toolsDropdown);
        }
        floatingToolsContainer.style.display = 'block';
    } else {
        // This case would be for resetting the scene, for example
        toolbar.classList.remove('hidden');
        appContainer.classList.remove('full-height');

        const toolbarDropdownContainer = document.getElementById('toolbar');
        if (toolsDropdown.parentElement !== toolbarDropdownContainer) {
             toolbarDropdownContainer.appendChild(toolsDropdown);
        }
       
        floatingToolsContainer.style.display = 'none';
    }
}

export function showLoader() {
    loadingOverlay.style.display = 'flex';
}

export function hideLoader() {
    loadingOverlay.style.display = 'none';
}

export function updateLastGeneratedAsset(asset) {
    lastGeneratedAsset = asset;
}

export function selectLibraryAsset(element) {
    document.querySelectorAll('.library-asset').forEach(el => {
        el.classList.remove('selected');
        // Restore original border color
        const color = assetTypeColors[el.dataset.assetType];
        if (color) {
            el.style.borderColor = color;
        } else {
            el.style.borderColor = 'transparent';
        }
    });

    if (element) {
        element.classList.add('selected');
        // Make selected border color brighter
        const color = assetTypeColors[element.dataset.assetType];
        if (color) {
            // A simple way to brighten: use a high-contrast color or white/light-grey
             element.style.borderColor = '#FFFFFF';
        } else {
            element.style.borderColor = '#007bff'; // Fallback for background or others
        }

        updateLastGeneratedAsset({
            id: `asset_${Date.now()}`, // This is a template, ID will be unique on drop
            url: element.dataset.assetUrl,
            type: element.dataset.assetType,
            prompt: element.dataset.assetPrompt
        });
        updatePropertiesPanel(element.dataset.assetId); // This was missing
        // On mobile, selecting an asset should prime the "add" tool for tap-to-place
        if ('ontouchstart' in window) {
            setTool('add');
        }
    } else {
        updateLastGeneratedAsset(null);
        updatePropertiesPanel(null); // Also clear panel when deselecting
        // This is a good place to trigger a check for mobile panel content,
        // although the logic is now primarily in panelManager
    }
}

export function addAssetToLibrary(asset) {
    const img = document.createElement('img');
    img.src = asset.url;
    img.title = asset.prompt;
    img.classList.add('library-asset');
    img.draggable = true;
    img.dataset.assetId = asset.id; // May not be needed, but good practice
    img.dataset.assetUrl = asset.url;
    img.dataset.assetType = asset.type;
    img.dataset.assetPrompt = asset.prompt;

    const color = assetTypeColors[asset.type];
    if (color) {
        img.style.borderColor = color;
    }

    assetLibrary.appendChild(img);
    return img;
}

function filterAssetLibrary(type) {
    const libraryAssets = assetLibrary.querySelectorAll('.library-asset');
    libraryAssets.forEach(asset => {
        if (type === null || asset.dataset.assetType === type) {
            asset.style.display = ''; // Reset to default display
        } else {
            asset.style.display = 'none';
        }
    });
}

export function updateSaveButtonState(isDirty) {
    if (isDirty) {
        saveBtn.classList.add('dirty');
    } else {
        saveBtn.classList.remove('dirty');
    }
}

export function initializeUI() {
    const toolsDropdownBtn = document.getElementById('tools-dropdown-btn');
    const toolsDropdownContent = document.getElementById('tools-dropdown-content');
    const transparentToggleBtn = document.getElementById('asset-transparent-toggle');
    const assetTypeSelector = document.getElementById('asset-type-selector');
    const assetPromptInput = document.getElementById('asset-prompt');
    const generateAssetBtn = document.getElementById('generate-asset-btn');
    const generateAssetIcon = document.getElementById('generate-asset-icon');
    const mobileTransparencyLabel = document.getElementById('mobile-transparency-label');
    let transparencyLabelTimeout;

    initializePanelManager();
    setupPromptAnimations();

    // Set asset type button colors
    assetTypeSelector.querySelectorAll('.asset-type-btn').forEach(btn => {
        const type = btn.dataset.type;
        const color = assetTypeColors[type];
        if (color) {
            btn.style.borderColor = color;
        }
    });

    // Asset Type Button Logic
    assetTypeSelector.addEventListener('click', (e) => {
        const button = e.target.closest('.asset-type-btn');
        if (!button) return;

        assetTypeSelector.querySelectorAll('.asset-type-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Always show the transparency toggle
        transparentToggleBtn.style.display = 'block';

        const assetTypeLabel = document.getElementById('mobile-asset-type-label');
        if (assetTypeLabel) {
            assetTypeLabel.textContent = button.dataset.type;
        }

        // Update generate button icon
        const iconSrc = button.querySelector('img').src;
        if (generateAssetIcon) {
            generateAssetIcon.src = iconSrc;
        }

        // Update input/button border colors
        const assetType = button.dataset.type;
        const color = assetTypeColors[assetType] || 'var(--border-color)';
        assetPromptInput.style.borderColor = color;
        filterAssetLibrary(assetType);
    });

    transparentToggleBtn.addEventListener('click', () => {
        const isToggledOn = transparentToggleBtn.classList.toggle('toggled-on');
        const icon = transparentToggleBtn.querySelector('img');
        
        if (transparencyLabelTimeout) {
            clearTimeout(transparencyLabelTimeout);
        }

        if (isToggledOn) {
            icon.src = './eye_slash_icon.png';
            icon.alt = 'Transparency On';
            if (mobileTransparencyLabel) {
                mobileTransparencyLabel.textContent = 'Transparent Background';
            }
        } else {
            icon.src = './eye_icon.png';
            icon.alt = 'Transparency Off';
            if (mobileTransparencyLabel) {
                mobileTransparencyLabel.textContent = 'Solid Background';
            }
        }
        
        if (mobileTransparencyLabel) {
            mobileTransparencyLabel.style.opacity = '1';
            transparencyLabelTimeout = setTimeout(() => {
                mobileTransparencyLabel.style.opacity = '0';
            }, 2000); // Hide after 2 seconds
        }
    });
    // Set initial state based on class
    transparentToggleBtn.classList.add('toggled-on');

    // Set initial asset type label on mobile and border colors
    const initialActiveTypeBtn = assetTypeSelector.querySelector('.asset-type-btn.active');
    if (initialActiveTypeBtn) {
        const assetTypeLabel = document.getElementById('mobile-asset-type-label');
        if (assetTypeLabel) {
            assetTypeLabel.textContent = initialActiveTypeBtn.dataset.type;
        }

        // Set initial generate button icon
        const iconSrc = initialActiveTypeBtn.querySelector('img').src;
        if (generateAssetIcon) {
            generateAssetIcon.src = iconSrc;
        }

        const assetType = initialActiveTypeBtn.dataset.type;
        const color = assetTypeColors[assetType] || 'var(--border-color)';
        assetPromptInput.style.borderColor = color;
        filterAssetLibrary(assetType);
    }

    // Dropdown toggle for mobile and consistency
    toolsDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent window click listener from closing it immediately
        toolsDropdownContent.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    window.addEventListener('click', (e) => {
        if (!toolsDropdownBtn.contains(e.target)) {
            if (toolsDropdownContent.classList.contains('show')) {
                toolsDropdownContent.classList.remove('show');
            }
        }
    });

    // Hide dropdown after a tool is selected
    toolsDropdownContent.addEventListener('click', () => {
        toolsDropdownContent.classList.remove('show');
    });
}
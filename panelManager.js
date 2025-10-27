import { startAssetPlaceholderAnimation, stopAssetPlaceholderAnimation } from './promptAnimator.js';
import { getSelectedAsset } from './editor.js';

export function initializePanelManager() {
    const appContainer = document.getElementById('app-container');
    const leftPanel = document.getElementById('left-panel');
    const rightPanel = document.getElementById('right-panel');
    const mobilePanel = document.getElementById('mobile-panel');
    const mobilePanelContent = document.getElementById('mobile-panel-content');
    const mobileLeftPanelContentContainer = document.getElementById('mobile-left-panel-content');
    const mobileRightPanelContentContainer = document.getElementById('mobile-right-panel-content');

    if (window.innerWidth <= 768) {
        // Move specific content on mobile to avoid moving unwanted elements like resize handles
        const leftPanelNodes = leftPanel.querySelectorAll('.control-group, #asset-library');
        const rightPanelNodes = rightPanel.querySelectorAll('#properties-panel-content');
        
        leftPanelNodes.forEach(child => mobileLeftPanelContentContainer.appendChild(child));
        rightPanelNodes.forEach(child => mobileRightPanelContentContainer.appendChild(child));
    }

    const updateMobilePanelContent = () => {
        if (!mobilePanel || window.innerWidth > 768) return;

        const selectedAsset = getSelectedAsset();
        
        if (selectedAsset) {
            // Show properties panel content
            mobileLeftPanelContentContainer.style.display = 'none';
            mobileRightPanelContentContainer.style.display = 'block';
        } else {
            // Show asset library content
            mobileLeftPanelContentContainer.style.display = 'block';
            mobileRightPanelContentContainer.style.display = 'none';
        }
    };

    // --- Mobile Panel Logic ---
    let isResizing = false;
    let isDragging = false; // To distinguish from tap
    let startY = 0;
    let lastY = 0; // This variable seems unused, can be removed if not needed.
    let startTime = 0; // To calculate velocity
    const toolbarHeight = 60; // From CSS
    let initialPanelHeight = 0; // Store initial height on drag start

    const startInteraction = (e) => {
        e.preventDefault();
        startY = e.touches[0].clientY;
        startTime = Date.now();
        isResizing = true;
        isDragging = false;

        // Immediately switch to direct height manipulation
        mobilePanel.style.transition = 'none';

        // Get current height. If it was hidden (no inline style.height), it's the handle's height.
        if (mobilePanel.style.height && mobilePanel.style.height.endsWith('px')) {
            initialPanelHeight = parseFloat(mobilePanel.style.height);
        } else {
            initialPanelHeight = 30; // Corresponds to handle height in CSS
        }
        
        // This was causing the "pop". We set the height directly now.
        mobilePanel.style.height = `${initialPanelHeight}px`;
        mobilePanel.style.transform = 'translateY(0)'; // Bring panel into view without transition
        appContainer.classList.add('panel-visible'); // This should resize the canvas
        const newAppContainerHeight = window.innerHeight - toolbarHeight - initialPanelHeight;
        appContainer.style.height = `${newAppContainerHeight}px`;

        document.body.style.userSelect = 'none';
    };

    const doInteraction = (e) => {
        if (!isResizing) return;

        const currentY = e.touches[0].clientY;
        const deltaFromStart = startY - currentY; // Upward movement is positive

        // Any movement is considered a drag
        if (Math.abs(currentY - startY) > 5) {
            isDragging = true;
        }

        if (isDragging) {
            let newPanelHeight = initialPanelHeight + deltaFromStart;
        
            const minHeight = 30; // Min height is the handle height
            const maxHeight = window.innerHeight - toolbarHeight - 100; // Leave 100px for canvas

            newPanelHeight = Math.max(minHeight, Math.min(newPanelHeight, maxHeight));
            
            const newAppContainerHeight = window.innerHeight - toolbarHeight - newPanelHeight;

            mobilePanel.style.height = `${newPanelHeight}px`;
            appContainer.style.height = `${newAppContainerHeight}px`;
        }
    };

    const stopInteraction = (e) => {
        if (!isResizing) return;
        isResizing = false;
        
        // Restore transitions for any animations
        mobilePanel.style.transition = 'transform 0.3s ease-in-out, height 0.3s ease-in-out';
        appContainer.style.transition = 'height 0.3s ease-in-out';

        if (isDragging) { // This was a drag
            const currentPanelHeight = mobilePanel.offsetHeight;
            
            // If user drags it to be very small, hide it.
            if (currentPanelHeight < window.innerHeight * 0.20) {
                mobilePanel.classList.remove('visible');
                appContainer.classList.remove('panel-visible');
                
                // Clear inline styles so CSS classes can take over for hiding animation
                appContainer.style.height = '';
                mobilePanel.style.height = '';
                mobilePanel.style.transform = '';

                if ('ontouchstart' in window) {
                    stopAssetPlaceholderAnimation();
                }
            } else {
                 mobilePanel.classList.add('visible'); // Panel is open
            }
            // else: Leave the panel at its new height. The inline styles remain.
        }
        // No 'else' block, so taps do nothing.
        
        document.body.style.userSelect = '';
        setTimeout(() => {
            appContainer.style.transition = 'height 0.3s ease-in-out'; // Restore after potential changes
        }, 50);
        // This timeout was to prevent transition from firing on the last drag frame.
        // A better approach is to set the transition style *after* the drag logic is complete.
        // It's already placed correctly above.
    };
    
    if (mobilePanel) {
        const handle = mobilePanel.querySelector('.mobile-resize-handle');
        handle.addEventListener('touchstart', startInteraction, { passive: false });
        window.addEventListener('touchmove', doInteraction, { passive: false });
        window.addEventListener('touchend', stopInteraction);
        window.addEventListener('touchcancel', stopInteraction);

        // Initial setup
        updateMobilePanelContent();
        // Listen for selection changes to update panel content
        const canvas = document.getElementById('editor-canvas');
        canvas.addEventListener('mousemove', () => setTimeout(updateMobilePanelContent, 0));
        canvas.addEventListener('mousemove', () => setTimeout(updateMobilePanelContent, 0));
        document.getElementById('asset-library').addEventListener('click', () => setTimeout(updateMobilePanelContent, 0));
    }
}
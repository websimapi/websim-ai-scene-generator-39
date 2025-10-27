const scenePrompt = document.getElementById('scene-prompt');
const assetPrompt = document.getElementById('asset-prompt');

let isFastForwardingScene = false;
let isFastForwardingAsset = false;

/**
 * Stops the placeholder animation, fills the input with the current suggestion,
 * and focuses the element.
 * @param {HTMLInputElement|HTMLTextAreaElement} element - The input or textarea element.
 */
function finalizeSuggestion(element) {
    // Value is already set by the animation, just need to change style
    element.classList.remove('placeholder-style');
    element.placeholder = ''; // Clear placeholder to show the value
    
    // Add animation class and remove it after it completes
    element.classList.add('colorize-animation');
    element.addEventListener('animationend', () => {
        element.classList.remove('colorize-animation');
    }, { once: true });

    element.focus();
    // Move cursor to the end
    const fullText = element.value;
    element.setSelectionRange(fullText.length, fullText.length);
}

// --- Scene Prompt Animation ---
const placeholderPrompts = [
    "A vibrant, magical forest clearing at dusk, fantasy art",
    "Cyberpunk city street at night, neon lights, rain",
    "Underwater coral reef teeming with bioluminescent creatures",
    "Steampunk airship soaring through clouds above a mountain range",
    "Alien desert landscape with two suns setting",
    "Cozy medieval tavern with a crackling fireplace",
    "Post-apocalyptic city ruins overgrown with nature",
    "Futuristic space station orbiting a gas giant",
    "Japanese zen garden with cherry blossoms and a koi pond",
    "Haunted Victorian mansion on a stormy night"
];

let promptIndex = 0;
let charIndex = 0;
let isDeleting = false;
let sceneAnimationTimeoutId;
let isSceneAnimationRunning = false;

function animatePlaceholder() {
    if (!isSceneAnimationRunning) return;

    const currentPrompt = placeholderPrompts[promptIndex];
    let targetText;

    if (isDeleting) {
        targetText = currentPrompt.substring(0, charIndex--);
    } else {
        targetText = currentPrompt.substring(0, charIndex++);
    }

    scenePrompt.value = targetText;
    scenePrompt.placeholder = ''; // Clear placeholder while animating value
    scenePrompt.scrollLeft = scenePrompt.scrollWidth - scenePrompt.clientWidth;

    if (!isDeleting && charIndex === currentPrompt.length + 1) {
        if (isFastForwardingScene) {
            stopScenePlaceholderAnimation();
            finalizeSuggestion(scenePrompt);
            isFastForwardingScene = false;
            return;
        }
        isDeleting = true;
        sceneAnimationTimeoutId = setTimeout(animatePlaceholder, 2000); // Pause before deleting
        return;
    }

    if (isDeleting && charIndex === -1) {
        if (isFastForwardingScene) {
            // This case should not be hit if logic is correct, but as a fallback:
            isFastForwardingScene = false;
            isDeleting = false;
            charIndex = 0;
        } else {
            isDeleting = false;
            promptIndex = (promptIndex + 1) % placeholderPrompts.length;
            charIndex = 0;
        }
        sceneAnimationTimeoutId = setTimeout(animatePlaceholder, isFastForwardingScene ? 0 : 500); // Pause before typing next
        return;
    }

    const typingSpeed = isDeleting ? 50 : 100;
    sceneAnimationTimeoutId = setTimeout(animatePlaceholder, isFastForwardingScene ? 0 : typingSpeed);
}

export function startScenePlaceholderAnimation() {
    if (isSceneAnimationRunning || scenePrompt.value.length > 0) return;
    isSceneAnimationRunning = true;
    scenePrompt.classList.add('placeholder-style');
    animatePlaceholder();
}

export function stopScenePlaceholderAnimation() {
    if (!isSceneAnimationRunning) return;
    isSceneAnimationRunning = false;
    clearTimeout(sceneAnimationTimeoutId);
    scenePrompt.classList.remove('placeholder-style');
    if (!isFastForwardingScene) {
        scenePrompt.value = '';
        scenePrompt.placeholder = "A vibrant, magical forest...";
    }
    promptIndex = 0;
    charIndex = 0;
    isDeleting = false;
}


// --- Asset Prompt Animation ---
const assetPlaceholderPrompts = [
    "A glowing crystal",
    "A rusty sword",
    "A small wooden chest",
    "A magical potion bottle",
    "An ancient, moss-covered stone statue",
    "A friendly robot companion",
    "A futuristic hovercraft",
    "A pile of gold coins",
    "A mysterious, locked book",
    "A talking animal sidekick"
];
let assetPromptIndex = 0;
let assetCharIndex = 0;
let isAssetDeleting = false;
let assetAnimationTimeoutId;
let isAssetAnimationRunning = false;

function animateAssetPlaceholder() {
    if (!isAssetAnimationRunning) return;

    const currentPrompt = assetPlaceholderPrompts[assetPromptIndex];
    let targetText;

    if (isAssetDeleting) {
        targetText = currentPrompt.substring(0, assetCharIndex--);
    } else {
        targetText = currentPrompt.substring(0, assetCharIndex++);
    }

    assetPrompt.value = targetText;
    assetPrompt.placeholder = ''; // Clear placeholder while animating value
    assetPrompt.scrollLeft = assetPrompt.scrollWidth - assetPrompt.clientWidth;

    if (!isAssetDeleting && assetCharIndex === currentPrompt.length + 1) {
        if (isFastForwardingAsset) {
            stopAssetPlaceholderAnimation();
            finalizeSuggestion(assetPrompt);
            isFastForwardingAsset = false;
            return;
        }
        isAssetDeleting = true;
        assetAnimationTimeoutId = setTimeout(animateAssetPlaceholder, 2000); // Pause before deleting
        return;
    }

    if (isAssetDeleting && assetCharIndex === -1) {
         if (isFastForwardingAsset) {
            isFastForwardingAsset = false;
            isAssetDeleting = false;
            assetCharIndex = 0;
        } else {
            isAssetDeleting = false;
            assetPromptIndex = (assetPromptIndex + 1) % assetPlaceholderPrompts.length;
            assetCharIndex = 0;
        }
        assetAnimationTimeoutId = setTimeout(animateAssetPlaceholder, isFastForwardingAsset ? 0 : 500); // Pause before typing next
        return;
    }

    const typingSpeed = isAssetDeleting ? 50 : 100;
    assetAnimationTimeoutId = setTimeout(animateAssetPlaceholder, isFastForwardingAsset ? 0 : typingSpeed);
}

export function startAssetPlaceholderAnimation() {
    if (isAssetAnimationRunning || assetPrompt.value.length > 0) return;
    isAssetAnimationRunning = true;
    assetPrompt.classList.add('placeholder-style');
    animateAssetPlaceholder();
}

export function stopAssetPlaceholderAnimation() {
    if (!isAssetAnimationRunning) return;
    isAssetAnimationRunning = false;
    clearTimeout(assetAnimationTimeoutId);
    assetPrompt.classList.remove('placeholder-style');
    if (!isFastForwardingAsset) {
        assetPrompt.value = '';
        assetPrompt.placeholder = "Type here to generate asset";
    }
    assetPromptIndex = 0;
    assetCharIndex = 0;
    isAssetDeleting = false;
}

export function setupPromptAnimations() {
     // --- Scene Animation Listeners ---
    startScenePlaceholderAnimation(); // Start scene animation by default
    
    scenePrompt.addEventListener('input', () => {
        isFastForwardingScene = false;
        stopScenePlaceholderAnimation();
    });
    scenePrompt.addEventListener('dblclick', () => {
        if (isSceneAnimationRunning && !isFastForwardingScene) {
            isFastForwardingScene = true;
            clearTimeout(sceneAnimationTimeoutId);
            if(isDeleting) {
                isDeleting = false;
            }
            animatePlaceholder();
        }
    });

    // --- Asset Animation Listeners ---
    assetPrompt.addEventListener('input', () => {
        isFastForwardingAsset = false;
        stopAssetPlaceholderAnimation();
    });
    assetPrompt.addEventListener('dblclick', () => {
        if (isAssetAnimationRunning && !isFastForwardingAsset) {
            isFastForwardingAsset = true;
            clearTimeout(assetAnimationTimeoutId);
            if(isAssetDeleting) {
                isAssetDeleting = false;
            }
            animateAssetPlaceholder();
        }
    });

    // Handle asset placeholder animation on desktop hover
    if (!('ontouchstart' in window)) {
        assetPrompt.addEventListener('mouseenter', startAssetPlaceholderAnimation);
        assetPrompt.addEventListener('mouseleave', stopAssetPlaceholderAnimation);
    }
}
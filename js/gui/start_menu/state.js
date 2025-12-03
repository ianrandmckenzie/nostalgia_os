// Track unavailable apps based on API probes
export let unavailableApps = new Set();

// Global drag state
export let dragState = {
  isDragging: false,
  draggedElement: null,
  draggedFromGroup: null, // Track which group an item was dragged from
  placeholder: null,
  startY: 0,
  startX: 0,
  draggedItemData: null // Store the item data being dragged
};

// Track initialization state to prevent duplicate initialization
export let isStartMenuInitialized = false;

export function setStartMenuInitialized(value) {
  isStartMenuInitialized = value;
}

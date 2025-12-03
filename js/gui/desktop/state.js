export let keyboardDragState = {
  isActive: false,
  selectedIcon: null,
  cutIcon: null,
  moveStep: 20, // pixels to move per arrow key press
  gridStep: 96 + 16 // icon width + padding for grid snapping
};

/** Message from Devvit to the web view. */
export type DevvitMessage =
  | { type: 'initialData'; data: { gameScores: Record<string, { score: number; name: string; icon: string }> } }
  | { type: 'updateGameScore'; data: { game: string; score: number } };

/** Message from the web view to Devvit. */
export type WebViewMessage =
  | { type: 'webViewReady' }
  | { type: 'setGameScore'; data: { game: string; score: number } };

/**
 * Web view MessageEvent listener data type. The Devvit API wraps all messages
 * from Blocks to the web view.
 */
export type DevvitSystemMessage = {
  data: { message: DevvitMessage };
  /** Reserved type for messages sent via `context.ui.webView.postMessage`. */
  type?: 'devvit-message' | string;
};

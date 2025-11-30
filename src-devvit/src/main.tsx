import { Devvit, useState, useWebView } from '@devvit/public-api';

import type { DevvitMessage, WebViewMessage } from './message.js';

Devvit.configure({
  redditAPI: true,
  redis: true,
});

type GameScore = {
  score: number;
  name: string;
  icon: string;
};

type GlobalScore = {
  score: number;
  username: string;
  name: string;
  icon: string;
};

// Add a custom post type to Devvit
Devvit.addCustomPostType({
  name: 'Nostalgia OS',
  height: 'tall',
  render: (context) => {
    // Load game scores from redis
    const [gameData, setGameData] = useState(async (): Promise<{
      personalScores: Record<string, GameScore>;
      globalScores: Record<string, GlobalScore>;
    }> => {
      const personalScores: Record<string, GameScore> = {};
      const globalScores: Record<string, GlobalScore> = {};

      // Get asset URLs for game icons
      const pongIcon = await context.assets.getURL('pong.webp');
      const snakeIcon = await context.assets.getURL('snake.webp');
      const bombbroomerIcon = await context.assets.getURL('bombbroomer.webp');
      const solitaireIcon = await context.assets.getURL('solitaire.webp');

      const games = [
        { key: 'pong', name: 'Pong', icon: pongIcon },
        { key: 'snake', name: 'Snake', icon: snakeIcon },
        { key: 'bombbroomer', name: 'Bombbroomer', icon: bombbroomerIcon },
        { key: 'solitaire', name: 'Solitaire', icon: solitaireIcon }
      ];

      for (const game of games) {
        // Load personal score for this post
        const personalScore = await context.redis.get(`score_${game.key}_${context.postId}`);
        personalScores[game.key] = {
          score: Number(personalScore ?? 0),
          name: game.name,
          icon: game.icon
        };

        // Load global high score
        const globalScoreData = await context.redis.get(`global_score_${game.key}`);
        if (globalScoreData) {
          const [score, username] = globalScoreData.split(':');
          globalScores[game.key] = {
            score: Number(score),
            username,
            name: game.name,
            icon: game.icon
          };
        } else {
          globalScores[game.key] = {
            score: 0,
            username: '',
            name: game.name,
            icon: game.icon
          };
        }
      }

      return { personalScores, globalScores };
    });

    const webView = useWebView<WebViewMessage, DevvitMessage>({
      // URL of your web view content
      url: 'index.html',

      // Handle messages sent from the web view
      async onMessage(message, webView) {
        switch (message.type) {
          case 'webViewReady':
            webView.postMessage({
              type: 'initialData',
              data: {
                gameScores: (gameData as any).personalScores,
              },
            });
            break;
          case 'setGameScore':
            const { game, score } = message.data;
            const currentData = gameData as { personalScores: Record<string, GameScore>; globalScores: Record<string, GlobalScore> };
            const currentPersonalScore = currentData.personalScores?.[game]?.score || 0;
            const currentGlobalScore = currentData.globalScores?.[game]?.score || 0;

            // For time-based games (bombbroomer), lower is better
            // For score-based games, higher is better
            const isPersonalBetter = game === 'bombbroomer'
              ? (score < currentPersonalScore || currentPersonalScore === 0)
              : score > currentPersonalScore;

            const isGlobalBetter = game === 'bombbroomer'
              ? (score < currentGlobalScore || currentGlobalScore === 0)
              : score > currentGlobalScore;

            if (isPersonalBetter) {
              await context.redis.set(
                `score_${game}_${context.postId}`,
                score.toString()
              );
            }

            if (isGlobalBetter) {
              // Get current user info
              const user = await context.reddit.getCurrentUser();
              const username = user?.username || 'Anonymous';

              await context.redis.set(
                `global_score_${game}`,
                `${score}:${username}`
              );
            }

            if (isPersonalBetter || isGlobalBetter) {
              const newPersonalScores = {
                ...currentData.personalScores,
                [game]: {
                  ...(currentData.personalScores?.[game] || { name: '', icon: '' }),
                  score: isPersonalBetter ? score : currentPersonalScore
                }
              };

              const newGlobalScores = {
                ...currentData.globalScores,
                [game]: {
                  ...(currentData.globalScores?.[game] || { name: '', icon: '', username: '' }),
                  score: isGlobalBetter ? score : currentGlobalScore,
                  username: isGlobalBetter ? (await context.reddit.getCurrentUser())?.username || 'Anonymous' : currentData.globalScores?.[game]?.username || ''
                }
              };

              setGameData({ personalScores: newPersonalScores, globalScores: newGlobalScores });

              webView.postMessage({
                type: 'updateGameScore',
                data: {
                  game,
                  score,
                },
              });
            }
            break;
          default:
            throw new Error(`Unknown message type: ${message satisfies never}`);
        }
      },
      onUnmount() {
        context.ui.showToast('Web view closed!');
      },
    });

    // Render the custom post type
    const currentGameData = gameData as { personalScores: Record<string, GameScore>; globalScores: Record<string, GlobalScore> } || { personalScores: {}, globalScores: {} };
    const personalScores = currentGameData.personalScores;
    const globalScores = currentGameData.globalScores;

    return (
      <vstack grow padding="small">
        <vstack grow alignment="middle center">
          <text size="xlarge" weight="bold">
            Nostalgia OS
          </text>
          <text size="small" color="secondary">
            Game Records
          </text>
          <spacer />
          <hstack gap="large" alignment="start top">
            {/* Personal Scores Column */}
            <vstack alignment="start middle" gap="small" grow>
              <text size="medium" weight="bold">My Highest Scores</text>
              <vstack gap="small">
                {Object.entries(personalScores).map(([gameKey, gameData]) => (
                  <hstack key={gameKey} alignment="start middle" gap="small">
                    <image url={gameData.icon} imageWidth={24} imageHeight={24} />
                    <text size="small">{gameData.name}:</text>
                    <text size="small" weight="bold">
                      {gameKey === 'bombbroomer'
                        ? (gameData.score ? `${gameData.score}s` : '---')
                        : gameData.score || 0
                      }
                    </text>
                  </hstack>
                ))}
              </vstack>
            </vstack>

            {/* Global Scores Column */}
            <vstack alignment="start middle" gap="small" grow>
              <text size="medium" weight="bold">Highest Scores Across Reddit</text>
              <vstack gap="small">
                {Object.entries(globalScores).map(([gameKey, gameData]) => (
                  <hstack key={gameKey} alignment="start middle" gap="small">
                    <image url={gameData.icon} imageWidth={24} imageHeight={24} />
                    <vstack gap="none" alignment="start">
                      <text size="small">{gameData.name}:</text>
                      <text size="small" weight="bold">
                        {gameKey === 'bombbroomer'
                          ? (gameData.score ? `${gameData.score}s` : '---')
                          : gameData.score || 0
                        }
                      </text>
                      {gameData.username && (
                        <text size="xsmall" color="secondary">
                          by {gameData.username}
                        </text>
                      )}
                    </vstack>
                  </hstack>
                ))}
              </vstack>
            </vstack>
          </hstack>
          <spacer />
          <button onPress={() => webView.mount()}>Launch Nostalgia OS</button>
        </vstack>
      </vstack>
    );
  },
});

export default Devvit;

# Getting started with nostalgia-os-app

Your project has been created using a Devvit template.

## Next up

Next up is uploading and developing your app using playtest.

In the project directory, you can run:

### `devvit upload`

Upload the app to the App Directory. Uploaded apps are only visible to you (the app owner) and can only be installed to a small test subreddit with less than 200 subscribers.

### `devvit playtest <subreddit-name>`

Installs your app to your test subreddit and starts a playtest session where a new version is installed whenever you save changes to your app code, and logs are continuously streamed.

## Learn more

You can learn more in the [documentation](https://developers.reddit.com/docs/).

## For AI Agents

When updating the webview content:

1. Edit files in the root project's `js/`, `index.html`, etc.

2. Run `npm run build` from root.

3. Run `./build-and-copy.sh` from this directory.

4. Then `devvit upload` to deploy.

The app integrates high scores from games (Pong, Snake) via postMessage to Devvit's Redis.

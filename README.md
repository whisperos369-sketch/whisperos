<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1QkXik5kyyUrpAVJru181_KUg4EPosZ-q

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Project Overview

WhisperOS is an experimental, AI-powered music studio built with web components and Google's Generative AI APIs. The project bundles a collection of modules that help users compose, remix, and polish songs directly in the browser.

### Module Descriptions

- `music-module.ts` – orchestrates playback and general music management.
- `song-creation-module.ts` & `song-creation-engine-module.ts` – generate new songs and melodies.
- `vocal-studio-module.ts` – record, transform, and refine vocal tracks.
- `remix-lab-module.ts` & `remix-lora-mode.ts` – experiment with style transfer and remix ideas.
- `cover-art-module.ts` & `visuals-lab-module.ts` – design cover art and other visuals.

## Contribution Guidelines

1. Fork the repository and create a feature branch.
2. Install dependencies and run `npm run build` to ensure the project compiles.
3. Commit your changes with clear messages and open a pull request describing your work.

## Testing / Known Limitations

- Run `npm test` to execute the unit tests for core utilities.
- Use `npm run build` and manual testing in the browser for end-to-end verification.
- Requires a valid `GEMINI_API_KEY` and internet connectivity for AI features.
- Generated content may vary in quality and the app is not yet production ready.

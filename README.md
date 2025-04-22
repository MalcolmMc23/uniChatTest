# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ["./tsconfig.node.json", "./tsconfig.app.json"],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    "react-x": reactX,
    "react-dom": reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs["recommended-typescript"].rules,
    ...reactDom.configs.recommended.rules,
  },
});
```

# Agora Video Chat Application

A simple React application that enables two people to have a video chat using the Agora RTC SDK.

## Prerequisites

- Node.js and pnpm installed
- An Agora developer account and App ID

## Setup

1. Clone this repository

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Get an Agora App ID:

   - Sign up for an account at [Agora.io](https://www.agora.io/)
   - Create a new project in the Agora Console
   - Copy the App ID

4. Configure your Agora App ID:

   - Open `src/components/VideoCall.tsx`
   - Replace the empty string in `const appId = "";` with your Agora App ID

5. Configure TURN servers (for reliable connectivity):

   - Open `src/components/VideoCall.tsx`
   - Locate the `turnServerConfig` object
   - Replace the placeholder values with your actual TURN server settings:

   ```js
   const turnServerConfig = {
     turnServerURL: "YOUR_TURN_SERVER_URL:3478", // URL of your TURN server
     username: "YOUR_TURN_USERNAME", // TURN server username
     password: "YOUR_TURN_PASSWORD", // TURN server password
     udpport: 3478, // UDP port
     tcpport: 3478, // TCP port
     forceturn: true, // Force TURN usage
   };
   ```

   - You can use a free TURN service like [Coturn](https://github.com/coturn/coturn) or a commercial service

6. Start the development server:
   ```bash
   pnpm dev
   ```

## Usage

1. Open the application in your browser
2. Enter a channel name (both users must enter the same channel name)
3. Click "Join" to enter the video call
4. Click "Leave Call" to exit the channel

## Network Connectivity

This application is configured to use TURN servers for reliable connectivity even when users are behind restrictive firewalls or NATs. Using TURN ensures that:

- Users can connect from most network environments
- Peer-to-peer connections are established whenever possible
- When direct connections aren't possible, media is relayed through the TURN server
- Approximately 20% of WebRTC calls require TURN servers to function properly

## Security Note

For production applications, you should implement token-based authentication:

- Generate tokens on your server
- Update the application to use tokens
- See [Agora's documentation on token-based authentication](https://docs.agora.io/en/video-calling/develop/authentication-workflow) for more details

## License

[MIT](LICENSE)

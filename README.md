
# Simple Daily mobile app


## Setup
```bash
npm i
npm i -g expo-cli

npm start
# Open the app by getting the Expo app on your phone and scanning the QR code.

# or

npm run ios

# or
npm run android
```

## Release
```bash
expo build:ios --release-channel production
expo build:android --release-channel production

expo publish --release-channel production
```

Or,

```bash
expo build:ios --release-channel development
expo build:android --release-channel development

expo publish --release-channel development
```

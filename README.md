# Ryder Proxy Prototype

The Ryder proxy is a drop-in replacement for the now deprecated Blockstack Browser. It is still functional and can be used with dapps that still use the Browser scheme. The package can serve as a reference.

The proxy functions in a similar fashion to the Trezor Bridge in that it provides a web interface and API endpoint. It communicates with the Ryder device using `RyderSerial`. The client communicates with the proxy over a local WebSocket.

## Install and run

1. `npm install`
2. Copy `sample.env` to `.env` and edit accordingly.
3. `npm run dev` to start a development server.

To build, `npm run build` to build the client, then `npm start` to run the proxy.

## Contributing

1. Create a branch with the naming convention `first-name/feature-name`.
2. Open a pull request and request a review of a fellow Pioneer.
3. Squash and merge is preferred.

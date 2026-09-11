# Daili public resources

This repository contains the public resources needed by the
Daili Android app:

- the [Daili product website](https://corbincald.github.io/daili/app/);
- the privacy policy and third-party model notices published with GitHub Pages;
- the on-device receipt OCR and speech-recognition model files published as
  GitHub Release assets.

The application source code and development history are maintained privately.
Release tags and asset filenames are kept stable because installed app versions
download them using their exact public URLs.

Model provenance and license terms are documented in
[`docs/model-notices.html`](docs/model-notices.html).

The product site is a static export under `docs/app/`. Publish only the production
website build; campaign review pages and planning files stay private. The existing
privacy page remains at `docs/index.html`.

Publish `docs/index.html`, `docs/model-notices.html`, and `docs/licenses/`
together when the app's privacy behavior or model components change. Keep them
in sync with the source copies maintained alongside the app, and describe older
supported versions when their behavior differs.

# Compact local speech: source and licence

ChallanSakshi prefers an installed device voice that the browser identifies as local. When the selected English, Hindi or Telugu voice is absent, this optional compact speech engine runs on the device in a separate Web Worker. Its formant voice sounds robotic. No text or audio is sent to a speech service.

The runtime files in this directory are unmodified eSpeak NG JavaScript browser distribution **1.49.1**, provided by eSpeak's browser-port maintainer:

- [Distribution source repository, pinned commit c023eaca5609b4523613f674d0ee67bd761502f1](https://github.com/pettarin/espeakng.js-cdn/tree/c023eaca5609b4523613f674d0ee67bd761502f1).
- [Unmodified worker JavaScript](./espeakng.worker.js), 776,339 bytes.
- [Unmodified voice and phoneme data](./espeakng.worker.data), 2,553,388 bytes.
- [GNU General Public License, version 3](./LICENSE). The upstream port identifies its licence as GPL version 3 or, at your option, a later version.

The combined speech runtime is 3,329,727 bytes before transfer compression. Source archives are offered separately for inspection and rebuilding; the companion does not download them to speak.

## Corresponding source

The original preferred-form C/C++ source, dictionaries, phoneme definitions, JavaScript source, Emscripten glue, and build scripts are available here without charge:

- [Full source for the upstream browser-port update, commit 88a588e635ddc1f74aaf847132f6d79bee189b86](./espeak-ng-source-88a588e.tar.gz). This is the maintainer's February 1, 2017 update to browser distribution 1.49.1, immediately preceding the pinned distribution publication. [Browse this source revision](https://github.com/espeak-ng/espeak-ng/tree/88a588e635ddc1f74aaf847132f6d79bee189b86).
- [Full source for the eSpeak NG 1.49.1 release](./espeak-ng-1.49.1-source.tar.gz). The signed upstream 1.49.1 tag refers to commit `999ac6743337e484bf0a1631b0885d3a8bb9114d`. [Browse the release source](https://github.com/espeak-ng/espeak-ng/tree/999ac6743337e484bf0a1631b0885d3a8bb9114d).

The source archives include their upstream copyright and licence notices. The exact historical Emscripten compiler build was not recorded in the distribution repository, so a bit-for-bit rebuild has not been verified. ChallanSakshi does not modify the distributed engine or its voice data.

## Build instructions

Use the instructions in `emscripten/README.md` and `emscripten/Makefile` inside the browser-port source archive. The build needs a compatible historical Emscripten SDK, a C/C++ toolchain, Autoconf, Automake and Libtool. From the extracted source directory, the upstream build sequence is:

```sh
./autogen.sh
./configure --prefix=/usr --without-async --without-mbrola --without-sonic
make
cd src/ucd-tools
./autogen.sh
make clean
emconfigure ./configure
emmake make
cd ../..
emconfigure ./configure --prefix=/usr --without-async --without-mbrola --without-sonic
emmake make src/libespeak-ng.la
cd emscripten
emmake make
```

The output is placed in `emscripten/js/`. Our app uses the worker protocol directly and plays its 44.1 kHz mono PCM through Web Audio. It never loads the upstream demo player. The app's adapter handles language selection, short utterances, interruption, playback and cleanup.

## Integrity

SHA-256 of the shipped unmodified runtime files:

```text
27dbae622e8dbd2b4f5def07208db1c557554148b83a99bacba37419031e2e2e  espeakng.worker.js
a1a5de916d3f3d28babe3a0948d6eab84e793ae69e333974a918a69ddec32a67  espeakng.worker.data
8ceb4b9ee5adedde47b31e975c1d90c73ad27b6b165a1dcd80c7c545eb65b903  LICENSE
```

Hindi and Telugu pronunciation still need review by fluent speakers. A successful audio-generation check does not establish pronunciation quality or performance on every phone.

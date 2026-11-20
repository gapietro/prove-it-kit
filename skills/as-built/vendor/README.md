# Vendored library

`mermaid.min.js` is mermaid 12.3.0, the browser bundle (`dist/mermaid.min.js`)
from the npm package, unchanged. Licence: MIT, in `LICENSE-mermaid`.

`build-page.mjs` writes this file into every `AS-BUILT.html`, so the page draws
its diagrams with no network. Nothing else in the kit uses it.

To update it: download the new version's `dist/mermaid.min.js` from the npm
package, replace the file, change the version on the first line above, and run
`npm test`. The tests check the version here against the file, and draw every
diagram in the fixtures with it.

sha256 of `mermaid.min.js`:
336df803d87a38b70a01e736e666c8f7601d2ce42f5e47c8fafe5d721074b9a3

# bare-hyper-protocol-daemon
HTTP Daemon for interacting with hyperdrive. Built for bare as an alternative to hypercore-fetch

## Features

- Resolve hostnames using DNSLink (e.g. `/hyper/agregore.mauve.moe`)
- List directories
- Resolve `index.*` within directories unless you append `?noResolve`
- Resolve urls like `/name` to `name.html` or `name.md` if present
- Recognize more mime types like `text/gemini` and `text/x-org`

## TODO

- Validate hostname strictly and error on invalid keys
- Range headers
- Accept header to serve HTML folder listing
- HEAD requests
- Content-Length
- ETag with drive version
- Link header with canonical URL
- Create drives from a key
- PUT (raw file / form data)
- DELETE to delete files in a drive
- Extension messages
- Tests with hypercore-fetch
- Gzip support (uncompress .gz if requesting for it)
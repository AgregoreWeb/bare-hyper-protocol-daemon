import http from 'bare-http1'
import { pipeline } from 'bare-stream'
import * as SDK from 'hyper-sdk'
import { Mime } from 'mime/lite'

import standardTypes from 'mime/types/standard.js'
import otherTypes from 'mime/types/other.js'

const mime = new Mime(standardTypes, otherTypes)
// Support gemini files
mime.define({
  'text/gemini': ['gmi', 'gemini'],
  'text/org': ['org']
}, true)

const INDEX_FILES = [
  'index.html',
  'index.md',
  'index.gmi',
  'index.gemini',
  'index.org',
  'README.md',
  'README.org'
]

const SEP = '/'
export const PORT = 3748 // DRIV on phone dial pad

export async function create ({ port = PORT, ...sdkOptions } = {}) {
  let sdk = null
  let loading = null

  async function getSDK () {
    if (sdk) return sdk
    if (loading) return loading

    loading = SDK.create({
      storage: './storage',
      ...sdkOptions
    })

    sdk = await loading
    loading = null
    return sdk
  }

  const server = http.createServer(async (req, res) => {
    const sdk = await getSDK()

    const { method, url } = req
    res.statusCode = 200
    if (!url.startsWith('/hyper/')) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'text/plain')
      res.end('Not Found')
      return
    }
    if (method !== 'GET') {
      res.statusCode = 405
      res.setHeader('Content-Type', 'text/plain')
      res.end('Method Not Allowed')
      return
    }

    try {
      const [hostname, ...pathSegments] = url.split(SEP).slice(2)
      let filePath = pathSegments.join(SEP) || SEP

      const fullURL = new URL(filePath, `hyper://${hostname}`)
      // TODO: Parse search params
      const noResolve = fullURL.search.includes('noResolve')
      filePath = fullURL.pathname

      const key = await sdk.resolveDNSToKey(hostname)

      const drive = await sdk.getDrive(key)

      if (filePath.endsWith(SEP)) {
        // TODO: Read index.*
        // TODO: Account for HTML Accept
        const entries = []
        for await (const path of drive.readdir(filePath)) {
          const fullPath = filePath + SEP + path
          const stat = await drive.entry(fullPath)
          if (stat === null) {
            entries.push(path + '/')
          } else {
            entries.push(path)
          }
        }

        let hadIndex = false

        if (!noResolve) {
          for (const indexFile of INDEX_FILES) {
            if (entries.includes(indexFile)) {
              hadIndex = true
              filePath = filePath + indexFile
              break
            }
          }
        }
        if (!hadIndex) {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(entries))
          return
        }
      }

      let entry = null
      for (const entryPath of makeToTry(filePath)) {
        entry = await drive.entry(entryPath)
        filePath = entryPath
        if (entry) break
      }

      if (!entry) {
        res.statusCode = 404
        res.setHeader('Content-Type', 'text/plain')
        res.end('Not Found')
        return
      }
      res.statusCode = 200

      const contentType = mime.getType(filePath)
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Length', `${entry.value.blob.byteLength}`)

      const rs = drive.createReadStream(filePath)
      pipeline([rs, res])
    } catch (e) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'text/plain')
      // TODO: Hide stack trace in console
      res.end(e.stack)
    }
  })

  const boundPort = await new Promise((resolve, reject) => {
    server.listen(port, (e) => {
      if (e) return reject(e)
      const { port } = server.address()
      resolve(port)
    })
  })

  async function close () {
    server.close()
    if (loading) sdk = await loading
    if (sdk) {
      await sdk.close()
    }
  }

  return { close, server, sdk, port: boundPort }
}

function makeToTry (pathname) {
  return [
    pathname,
    pathname + '.html',
    pathname + '.md',
    pathname + '.gmi',
    pathname + '.gemini',
    pathname + '.org'
  ]
}

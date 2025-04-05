import Signal from 'bare-signals'
import { create } from './index.js'

const { close, port } = await create()

console.log(`Listening on http://localhost:${port}`)

const sigint = new Signal('SIGINT')

sigint.on('signal', async () => {
  console.log('Closing')
  await close()
  console.log('Bye!')
}).start()

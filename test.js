import { test } from 'brittle'
import { create } from './index.js'

test('create and close', async (t) => {
  t.plan(2)
  const { close } = await create()

  t.pass('Created')
  await close()

  t.pass('Closed')
})

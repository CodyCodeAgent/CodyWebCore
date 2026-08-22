import readline from 'node:readline'

const reader = readline.createInterface({ input: process.stdin })
let initialized = 0
let waitingCallId = null

function write(payload) { process.stdout.write(`${JSON.stringify(payload)}\n`) }

reader.on('line', (line) => {
  const message = JSON.parse(line)
  if (message.method === 'initialize') {
    initialized += 1
    write({ jsonrpc: '2.0', id: message.id, result: { serverInfo: { name: 'fixture', version: '1' } } })
    return
  }
  if (message.method === 'stats') { write({ jsonrpc: '2.0', id: message.id, result: { initialized } }); return }
  if (message.method === 'malformed') {
    process.stdout.write('not json\n')
    write({ jsonrpc: '2.0', method: 'item/agentMessage/delta', params: { delta: 'ok' } })
    write({ jsonrpc: '2.0', id: message.id, result: { ok: true } })
    return
  }
  if (message.method === 'ask') {
    waitingCallId = message.id
    write({ jsonrpc: '2.0', id: 900, method: 'item/commandExecution/requestApproval', params: { threadId: 'thread-1', reason: 'fixture' } })
    return
  }
  if (message.id === 900 && waitingCallId !== null) {
    write({ jsonrpc: '2.0', id: waitingCallId, result: { approved: true, reply: message.result ?? null } })
    waitingCallId = null
    return
  }
  if (message.method === 'exit') { process.exit(1) }
})

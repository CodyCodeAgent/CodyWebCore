import { describe, expect, it, vi } from 'vitest';
import { methods } from '@agentclientprotocol/sdk';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AcpSessionHost, createAntigravityAcpHostOptions, createGeminiAcpHostOptions, DEFAULT_ANTIGRAVITY_ACP_COMMAND, DEFAULT_GEMINI_ACP_COMMAND, splitAcpCommand, } from './index.js';
describe('ACP runtime primitives', () => {
    it('parses a configured command without a shell', () => {
        expect(splitAcpCommand('agent --serve "stdio transport"')).toEqual({ command: 'agent', args: ['--serve', 'stdio transport'] });
        expect(() => splitAcpCommand('   ')).toThrow('ACP 启动命令不能为空');
    });
    it('builds default and overridden Antigravity / Gemini ACP host options', () => {
        expect(DEFAULT_ANTIGRAVITY_ACP_COMMAND).toBe('agy acp');
        expect(DEFAULT_GEMINI_ACP_COMMAND).toBe('agy acp');
        expect(createAntigravityAcpHostOptions()).toMatchObject({
            command: 'agy acp',
            clientName: 'cody-web-core',
        });
        expect(createGeminiAcpHostOptions({ command: 'agy acp --model gemini-3.1-pro', clientName: 'codywork', authMethodId: 'gemini-api-key' })).toEqual({
            command: 'agy acp --model gemini-3.1-pro',
            clientName: 'codywork',
            authMethodId: 'gemini-api-key',
        });
    });
    it('sends cancellation as the ACP notification defined by the protocol', async () => {
        const notify = vi.fn().mockResolvedValue(undefined);
        const host = new AcpSessionHost({ command: 'fixture acp serve' });
        const session = {
            bindingId: 'binding', sessionId: 'native-session', closed: false,
            connection: { agent: { notify } },
        };
        host.sessions.set(session.bindingId, session);
        await host.cancel(session);
        expect(notify).toHaveBeenCalledWith(methods.agent.session.cancel, { sessionId: 'native-session' });
    });
    it('retains a command list published before the session/new response', async () => {
        const directory = mkdtempSync(join(tmpdir(), 'core-acp-commands-'));
        const script = join(directory, 'agent.cjs');
        writeFileSync(script, `
      const send = msg => console.log(JSON.stringify({ jsonrpc: '2.0', ...msg }))
      require('node:readline').createInterface({ input: process.stdin }).on('line', line => {
        const { id, method } = JSON.parse(line)
        if (method === 'initialize') send({ id, result: { protocolVersion: 1, agentCapabilities: {} } })
        if (method === 'session/new') {
          send({ method: 'session/update', params: { sessionId: 'native',
            update: { sessionUpdate: 'available_commands_update', availableCommands: [{ name: 'review', description: 'Review' }] }
          } })
          send({ id, result: { sessionId: 'native' } })
        }
      })
    `);
        const host = new AcpSessionHost({ command: `"${process.execPath}" "${script}"` });
        try {
            const session = await host.open({ bindingId: 'binding', cwd: directory });
            expect(await host.listAvailableCommands(session)).toEqual([{ name: 'review', description: 'Review' }]);
        }
        finally {
            await host.closeAll();
            rmSync(directory, { recursive: true, force: true });
        }
    });
});
//# sourceMappingURL=index.test.js.map
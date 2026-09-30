import { describe, expect, it, vi } from 'vitest';
import { methods } from '@agentclientprotocol/sdk';
import { AcpSessionHost, splitAcpCommand } from './index.js';
describe('ACP runtime primitives', () => {
    it('parses a configured command without a shell', () => {
        expect(splitAcpCommand('agent --serve "stdio transport"')).toEqual({ command: 'agent', args: ['--serve', 'stdio transport'] });
        expect(() => splitAcpCommand('   ')).toThrow('ACP 启动命令不能为空');
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
});
//# sourceMappingURL=index.test.js.map
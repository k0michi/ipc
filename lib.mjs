import process from 'node:process';
import crypto from 'node:crypto';
import readline from 'node:readline';

export class IPCHost {
  constructor() {
    this.listeners = {};
    this.handlers = {};

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    this.lineReader = rl;
    this._registerReceiver();
  }

  on(channel, listener) {
    if (!channel in this.listeners) {
      this.listeners[channel] = [];
    }

    this.listeners.push(listener);
  }

  handle(channel, listener) {
    this.handlers[channel] = listener;
  }

  _registerReceiver() {
    this.lineReader.on('line', async line => {
      let parsed;

      try {
        parsed = JSON.parse(line);
      } catch (e) {
        // ignore
        return;
      }

      // Validate parsed here

      if (parsed.type === 'send') {
        if (parsed.channel in this.listeners) {
          for (const l of this.listeners[parsed.channel]) {
            l(...parsed.args);
          }
        }
      } else if (parsed.type === 'invoke') {
        if (parsed.channel in this.handlers) {
          const returnValue = await this.handlers[parsed.channel](...parsed.args);

          const messageString = JSON.stringify({
            type: 'handle',
            id: parsed.id,
            channel: parsed.channel,
            return: returnValue
          }) + '\n';

          process.stdout.write(messageString);
        }
      }
    });
  }
}

export class IPCChild {
  constructor(childProcess) {
    this.childProcess = childProcess;
    this.listeners = {};

    const rl = readline.createInterface({
      input: this.childProcess.stdout,
      output: this.childProcess.stdin,
      terminal: false
    });

    this.lineReader = rl;
    this._registerReceiver();
  }

  send(channel, ...args) {
    // Check args can be passed here

    const messageString = JSON.stringify({
      type: 'send',
      id: this._newMessageID(),
      channel,
      args
    }) + '\n';

    this.childProcess.stdin.write(messageString);
  }

  async invoke(channel, ...args) {
    // Check args can be passed here

    const id = this._newMessageID();

    const messageString = JSON.stringify({
      type: 'invoke',
      id,
      channel,
      args
    }) + '\n';

    const receivedPromise = this._waitForMessage(id);
    this.childProcess.stdin.write(messageString, 'utf-8');
    const received = await receivedPromise;

    // Validate received here

    return received.return;
  }

  on(channel, listener) {
    if (!channel in this.listeners) {
      this.listeners[channel] = [];
    }

    this.listeners.push(listener);
  }

  _registerReceiver() {
    this.lineReader.on('line', line => {
      let parsed;

      try {
        parsed = JSON.parse(line);
      } catch (e) {
        // ignore
        return;
      }

      // Validate parsed here

      if (typeof parsed.channel == 'string') {
        if (parsed.channel in this.listeners) {
          for (const l of this.listeners[parsed.channel]) {
            l(...parsed.args);
          }
        }
      }
    });
  }

  _newMessageID() {
    return crypto.randomUUID();
  }

  _waitForMessage(id) {
    return new Promise((resolve, reject) => {
      const handler = line => {
        let parsed;

        try {
          parsed = JSON.parse(line);
        } catch (e) {
          // ignore
          return;
        }

        // Validate

        if (parsed.id === id) {
          this.lineReader.removeListener('line', handler);
          resolve(parsed);
        }
      };

      this.lineReader.on('line', handler);
    });
  }
}

export const ipcHost = new IPCHost();
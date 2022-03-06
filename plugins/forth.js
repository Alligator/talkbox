class Context {
  constructor() {
    this.words = {
      '+': () => this.push(this.pop() + this.pop()),
      '-': () => {
        const b = this.pop();
        const a = this.pop();
        this.push(a - b);
      },
      '*': () => this.push(this.pop() * this.pop()),
      '/': () => {
        const b = this.pop();
        const a = this.pop();
        this.push(a / b);
      },

      // comp
      '>': () => {
        const b = this.pop();
        const a = this.pop();
        this.push(a > b);
      },
      '<': () => {
        const b = this.pop();
        const a = this.pop();
        this.push(a < b);
      },
      '=':  () => this.push(this.pop() === this.pop()),
      '!=': () => this.push(this.pop() !== this.pop()),

      // output
      '.': () => this.write(this.pop()),
      'cr': () => this.write('\n'),
      'space': () => this.write(' '),

      // stack
      'dup': () => {
        this.push(this.stack[this.stack.length - 1]);
      },
      '2dup': () => {
        this.push(this.stack[this.stack.length - 2]);
        this.push(this.stack[this.stack.length - 2]);
      },
      'swap': () => {
        const a = this.stack.pop();
        const b = this.stack.pop();
        this.push(a);
        this.push(b);
      },

      // buffer
      ';': this.defineWord.bind(this),
      '(': () => {
        this.bufferStopWord = ')';
        this.bufferStopCallback = this.readString.bind(this);
      },
      '{': () => {
        this.bufferStopWord = '}';
        this.bufferStopCallback = this.readBlock.bind(this);
      },

      // flow control
      'times': () => {
        const count = this.pop();
        const block = this.pop();
        for (let i = 0; i < count; i++) {
          this.vars['i'] = i;
          this.exec(block);
        }
      },
      'iftrue': () => {
        const block = this.pop();
        if (this.pop()) {
          this.exec(block);
        }
      },
      'repeat': () => {
        const condition = this.pop();
        const limit = this.pop();
        const block = this.pop();
        let count = 0;
        do {
          this.exec(block);
          this.exec(condition);
          if (count++ > 1000) {
            throw new Error(`max loop limit hit`);
          }
        } while (this.pop() !== limit);
      },

      // debug words
      'words': () => {
        const str = Object.keys(this.words);
        this.write(str.join(' '));
      },
      '.s': () => {
        this.write(JSON.stringify(this.stack));
      },
    }

    this.sigils = {
      '>': this.setVar.bind(this),
      '$': this.getVar.bind(this),
      ':': (name) => {
        this.bufferStopWord = ';';
        this.bufferStopCallback = this.defineWord.bind(this, name);
      },
    };

    this.stack = [];
    this.stdout = [];
    this.vars = {};

    this.buffer = [];
    this.bufferStopWord = null;
    this.bufferStopCallback = null;
  }

  push(val) {
    this.stack.push(val);
  }

  pop() {
    if (this.stack.length === 0) {
      throw new Error('stack empty!');
    }
    return this.stack.pop();
  }

  write(str) {
    this.stdout.push(str);
  }
  getStdout() {
    return this.stdout.join('');
  }

  setVar(word) {
    this.vars[word] = this.pop();
  }
  getVar(word) {
    if (typeof this.vars[word] !== 'undefined') {
      this.push(this.vars[word]);
    } else {
      throw new Error(`unknown variable ${word}`);
    }
  }

  defineWord(name) {
    const buf = this.buffer;
    this.words[name] = () => this.exec(buf);
    log(`defined word ${name} ${JSON.stringify(buf)}`);
  }

  readString() {
    const str = this.buffer.join(' ');
    this.push(str);
  }

  readBlock() {
    this.push(this.buffer);
  }

  dbg() {
    const stack = JSON.stringify(this.stack);
    return `stack: ${stack}`;
  }

  execWord(word) {
    log(`running ${word}`);
    if (this.bufferStopWord) {
      if (word === this.bufferStopWord) {
        this.bufferStopCallback();
        this.bufferStopWord = null;
        this.buffer = [];
      } else {
        this.buffer.push(word);
      }
      return;
    }

    if (this.words[word]) {
      this.words[word]();
      return;
    }

    if (this.sigils[word[0]]) {
      const rest = word.slice(1);
      this.sigils[word[0]](rest);
      return;
    }

    const num = parseFloat(word);
    if (isNaN(num)) {
      throw new Error(`unknown word ${word}`);
    }
    this.push(num);
  }

  exec(words) {
    for (const word of words) {
      this.execWord(word);
      log(`  ${this.dbg()}`);
    }
  }
}

function exec(src) {
  const ctx = new Context();
  const words = src.split(/ |\n+/);
  try {
    ctx.exec(words);
    return ctx.getStdout();
  } catch(e) {
    return e.toString();
  }
}

function forth(text) {
  return exec(text);
}

commands = { forth };

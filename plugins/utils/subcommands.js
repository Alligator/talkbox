class SubCommander {
  constructor() {
    this.cmds = {};
  }

  add(name, args, fn) {
    this.cmds[name] = { args, fn };
  }

  async run(args) {
    const cmdName = args[0];

    if (cmdName in this.cmds) {
      const cmd = this.cmds[cmdName];
      const parsedArgs = [];

      if (cmd.args) {
        for (let i = 0; i < cmd.args.length; i++) {
          const argSpec = cmd.args[i];

          if (i + 1 >= args.length) {
            throw {
              userError: true,
              message: `expected ${argSpec.slice(1)} argument to ${cmdName}`,
            };
          }

          if (argSpec.startsWith('f')) {
            parsedArgs.push(parseFloat(args[i + 1]));
          } else if (argSpec.startsWith('i')) {
            parsedArgs.push(parseInt(args[i + 1], 10));
          }
        }
      }

      const result = await cmd.fn(...parsedArgs);
      return { ok: true, result };
    }
    return { ok: false };
  }

  help() {
    return Object.keys(this.cmds)
      .map((cmd) => {
        const args = (this.cmds[cmd].args || []).map((arg) => {
          const type = arg[0];
          const name = arg.slice(1);
          switch (type) {
            case 'f': return `${name}:float`;
            case 'i': return `${name}:int`;
            default: return name;
          }
        });
        return `${cmd} ${args.join(' ')}`;
      })
      .join('\n')
  }
}

module.exports = SubCommander;

const { spawn } = require('child_process');
const { Readable } = require('stream');
const SubCommander = require('../plugins/utils/subcommands');
const fs = require('fs/promises');

const subCmder = new SubCommander();
subCmder.add('reverb', [], () => ['pad', '0', '2', 'reverb', '100']);
subCmder.add('reverse', [], () => ['reverse']);
subCmder.add('speed', ['fspeed'], (speed) => ['speed', speed]);
subCmder.add('stretch', [], () => ['tempo', '-s', '0.125']);
subCmder.add('tremolo', [], () => ['tremolo', '12', '70']);
subCmder.add('phaser', [], () => ['phaser', '0.8', '0.8', '0.3', '0.4', '1.5']);
subCmder.add('compress', [], () => ['contrast']);
subCmder.add('chorus', [], () => ['chorus', '0.7', '0.9', '55', '0.4', '0.25', '2', '-t']);
subCmder.add('wiggle', [], () => ['bend', '0,360,0.25', '0,-360,0.25', '0,360,0.25', '0,-360,0.25']);
subCmder.add('highpass', ['ffreq'], (freq) => ['highpass', freq.toFixed(2)]);
subCmder.add('lowpass', ['ffreq'], (freq) => ['lowpass', freq.toFixed(2)]);
subCmder.add('chorus', [], () => ['chorus', '0.7', '0.9', '55', '0.4', '0.25', '2', '-t']);
subCmder.add('mix', [], () => []);

async function sox(buffer, args) {
  const command = '/usr/bin/sox';
  return new Promise((resolve, reject) => {
    let buf = Buffer.alloc(0);
    let dead = false;
    let stderr = '';

    const proc = spawn(command, args);

    const timeout = setTimeout(() => {
      if (!dead) {
        proc.kill();
        log('sox killed');
        reject(new Error('5s timeout exceeded, sox killed'));
      }
    }, 5000);

    proc.stdout.on('data', (data) => {
      buf = Buffer.concat([buf, data]);
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('exit', (code) => {
      dead = true;
      if (code !== 0) {
        log(stderr);
        reject(stderr);
      }
      resolve(buf);
    });

    proc.on('error', (error) => {
      reject(error);
    });

    if (buffer && proc.stdin.writable) {
      const stream = Readable.from(buffer);
      stream.pipe(proc.stdin);
    }
  });
}

function mix() {
  return {
    type: 'compose',
    fn: async (a, b) => {
      const afile = `/tmp/talkbox-snd-mix-a.${a.ext}`;
      const bfile = `/tmp/talkbox-snd-mix-b.${b.ext}`;
      await fs.writeFile(afile, a.data);
      await fs.writeFile(bfile, b.data);
      const soxArgs = ['-m', afile, bfile, '-t', 'mp3', '-'];
      return {
        data: await sox(null, soxArgs),
        ext: 'mp3',
      };
    },
  };
}

async function audio(text, message, currentOutput) {
  if (text === 'mix') {
    return mix();
  }

  if (currentOutput.data) {
    const args = text.split(/ +/g);
    const { ok, result } = await subCmder.run(args);
    if (!ok) {
      return subCmder.help();
    }

    const ext = currentOutput.data.ext;

    let mp3TrimArgs = [];
    if (ext === 'mp3') {
      mp3TrimArgs = ['trim', '1105s'];
    }

    const soxArgs = ['-t', ext, '-', '-t', 'mp3', '-', ...mp3TrimArgs, ...result];
    return {
      data: await sox(currentOutput.data.data, soxArgs),
      name: currentOutput.data.name,
      ext: 'mp3',
    };
  }
  return 'i need audio mate';
}

audio._help = subCmder.help();

commands = { audio, snd: audio };

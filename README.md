# talkbox
This is a javascript discord bot, designed to be simple and easy to extend.

## running it
Create a config.json file that looks like this:

```json
{
  "token": "API TOKEN HERE",
  "leader": ","
}
```

The token is your bot token, the leader is the character users have to put before commands, e.g. `,echo`.

Then run

    npm install
    npm run start

## talking to it
Run a command by saying `,commandname` in a channel the bot is in. Anything after the command name is passed as an argument to the command.

You can also pipe commands into one another, for example:

    ,echo hello | uppercase

Will result in

    YOU SAID HELLO

## plugins
A plugin is a .js file in the plugins directory. talkbox monitors this directory and loads anything that's changed. You can add or update plugins at runtime.

Here's a simple plugin:

```js
function echo(text) {
  return 'you said ' + text;
}

commands = { echo };
```

You register commands by setting the global `commands` object. The key is the name of the command and the value is the function to call.

The function is passed the text that followed the command, and anything returned from the function is sent to the channel the message came from.

Here's a slightly more complex plugin:

```js
function echoLater(text, message) {
  setTimeout(() => {
    message.channel.send('you said ' + text);
  }, 6000);
  return 'echoing later...';
}

commands = { echoLater };
```

The second argument to the plugin is a [discord.js message object](https://discord.js.org/#/docs/main/stable/class/Message). From this you can get to the channel the message came from, the author, or the discord client itself. It's useful if you want to send multiple messages like above.

### interval commands
You can also create interval commands, which are run by talkbox on a timer. These get passed the discord client object.

```js
function heartbeat(client) {
  const owner = client.users.get('1234');
  owner.send('i\'m still alive!!');
}

// interval is in ms, so this is every hour
heartbeat._interval = 60 * 60 * 1000;
```

talbox will register any function with a `_interval` property as an interval command.

### db
You can use the `db` global in a plugin to persist data. Here's a plugin that saves some data:

```js
function remember(text, message) {
  const name = message.author.username;

  if (text && text.length > 0) {
    db.write(name, text);
    return 'ok, remembered';
  }

  if (db.has(name)) {
    return `i remember: ${db.read(name)}`;
  }

  return 'nothing for me to remember!';
}

commands = { remember };
```

The keys are prefixed with the plugin name, so you (probably) don't have to worry about collisions. talkbox saves this to `persist.json` in it's directory, so the data persists across restarts.

### API calls
Commands can easily make API calls and the bot supports command functions being async. Here is an example plugin that fetches some data:

```js
const axios = require('axios');

async function novara() {
  const response = await axios.get('https://novaramedia.com/api/articles/');
  const article = response.data.posts[0];
  return `${article.title} - ${article.permalink}`;
}

commands = { novara };
```

### config
A plugin can read the config by just requiring the config.json file, like so:

```js
const config = require('../config.json');
```

The config file is a good place to store API keys, paths, and anything that you don't want to hard-code into a plugin.
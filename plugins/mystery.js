function randomCapString(str) {
  let newStr = '';

  for (let i = 0; i < str.length; i++) {
    newStr += (Math.random() > 0.5) ? str[i].toLowerCase() : str[i].toUpperCase();
  }

  return newStr;
}

function mystery(text, message) {
  message.channel.send(text).then((sentMessage) => {
    const interval = setInterval(() => {
      sentMessage.edit(randomCapString(text));
    }, 2000);

    setTimeout(() => clearInterval(interval), 20000);
  });
}

commands = { mystery };

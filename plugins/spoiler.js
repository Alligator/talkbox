const config = require('../config.json');

async function getLastMessage(message) {
  const prevMessages = await message.channel.messages.fetch({ limit: 30, before: message.id })
  const reversedMessages = prevMessages.sort((a, b) => b.createdTimestamp - a.createdTimestamp);

  for (const [id, msg] of reversedMessages) {
    if (
      msg.attachments.size
      && msg.attachments.some(a => a.width)
      && message.client.user.id === msg.author.id
    ) {
      return msg;
    }
  }
}

async function spoiler(text, message) {
  const lastMsg = await getLastMessage(message);

  const spoilerAttachments = lastMsg.attachments.map((a) => {
    const atch = new Discord.MessageAttachment(a.url);
    atch.url = a.url;
    atch.name = `SPOILER_${a.name}`;
    return atch;
  });

  // remove attachments
  await lastMsg.edit({ content: 'h/o', attachments: [] });

  // re-add as spoilers
  await lastMsg.edit({ content: '.', files: spoilerAttachments });
}

commands = { spoiler };

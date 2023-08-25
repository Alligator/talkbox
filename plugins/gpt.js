const axios = require('axios');
const config = require('../config.json');

async function getCredits() {
  const resp = await axios.get('https://api.textsynth.com/v1/credits', {
    headers: {
      'Authorization': `Bearer ${config.textsynth_api_key}`,
    },
  });

  const credits = resp.data.credits;
  return `textsynth credits left: $${(credits / 1e9).toFixed(3)}`;
}

async function gpt(text, message, currentOutput) {
  if (!text) {
    return await getCredits();
  }

  try {
    const prompt = currentOutput.rawArgs || text;
    const resp = await axios.post('https://api.textsynth.com/v1/engines/gptj_6B/completions', {
      prompt,
      top_k: 64,
    }, {
      headers: {
        'Authorization': `Bearer ${config.textsynth_api_key}`,
      },
    });

    const result = resp.data.text;
    return `${prompt}${result}`;
  } catch (e) {
    if (e?.response?.status === 429) {
      return 'uh-oh rate limited. try again in 30 mins';
    }
    throw e;
  }
}

async function gptcode(text, message, currentOutput) {
  if (!text) {
    return await getCredits();
  }

  try {
    const prompt = currentOutput.rawArgs;
    const resp = await axios.post('https://api.textsynth.com/v1/engines/codegen_6B_mono/completions', {
      prompt,
    }, {
      headers: {
        'Authorization': `Bearer ${config.textsynth_api_key}`,
      },
    });

    const result = resp.data.text;
    return '```' + prompt + result + '```';
  } catch (e) {
    if (e?.response?.status === 429) {
      return 'uh-oh rate limited. try again in 30 mins';
    }
    throw e;
  }
}

async function stableDiffusion(text, message, currentOutput) {
  if (!text) {
    return await getCredits();
  }

  try {
    const prompt = currentOutput.rawArgs || text;
    const resp = await axios.post(
    'https://api.textsynth.com/v1/engines/stable_diffusion/text_to_image',
      {
        prompt,
        seed: message.id >> 4,
        guidance_scale: 15,
        timesteps: 50,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.textsynth_api_key}`,
        },
      },
    );

    const result = Buffer.from(resp.data.images[0].data, 'base64');
    return {
      data: result,
      ext: 'jpg',
    };
  } catch (e) {
    if (e?.response?.status === 429) {
      return 'uh-oh rate limited. try again in 30 mins';
    }
    throw e;
  }
}

commands = { gpt, gptcode, stablediffusion: stableDiffusion };

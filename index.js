process.on('unhandledRejection', (reason, promise) => {
    console.error('--- Unhandled Rejection at:', promise, 'reason:', reason, '---');
    });

process.on('uncaughtException', (err, origin) => {
    console.error('--- Uncaught Exception at:', origin, 'error:', err, '---');
    });


require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const { Client, GatewayIntentBits, Collection, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const schedule = require('node-schedule');
const { DISCORD_TOKEN: token, MONGODB_SRV: database } = process.env;


console.log("Loading Database Models...");
const modelsPath = path.join(__dirname, 'models');
fs.readdirSync(modelsPath).forEach(file => {
    if (file.endsWith('.js')) {
        require(path.join(modelsPath, file));
        console.log(`Loaded model: ${file}`);
    }
});

const Poll = mongoose.model('Poll');


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
  ],
});


console.log("Loading Events...");
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  client[event.once ? "once" : "on"](event.name, (...args) => event.execute(...args, client));
  console.log(`Loaded event: ${event.name} from ${file}`);
}


console.log("Loading Commands...");
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
    console.log(`Loaded command: ${command.data.name} from ${file}`);
  } else {
    console.log(
      `Warning: Command at ${filePath} is missing 'data' or 'execute' property.`
    );
  }
}


console.log("Attempting to connect to MongoDB...");
mongoose
  .connect(database, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
      
        schedule.scheduleJob('*/5 * * * *', async () => { 
        console.log('Running old poll cleanup job...');
        const now = new Date();
        const expiredPolls = await Poll.find({ endTime: { $lte: now } });
        
        for (const poll of expiredPolls) {
            try {
                const channel = await client.channels.fetch(poll.channelId);
                if (channel) {
                    const message = await channel.messages.fetch(poll.messageId);
                    if (message) {
                        const finalEmbed = new EmbedBuilder(message.embeds[0].toJSON())
                            .setDescription('This poll has ended.')
                            .setColor('Red');

                        const winningOption = poll.options.reduce((prev, current) => (prev.votes > current.votes) ? prev : current, { votes: -1 });
                        
                        
                        const finalActionRow = new ActionRowBuilder().addComponents(
                            ...poll.options.map((option, index) =>
                                new ButtonBuilder()
                                    .setCustomId(`poll_vote_${index}`)
                                    .setLabel(`${option.votes} votes | ${option.text}`)
                                    .setStyle(option.text === winningOption.text ? ButtonStyle.Success : ButtonStyle.Secondary)
                                    .setDisabled(true) 
                            )
                        );
                        
                        await message.edit({ embeds: [finalEmbed], components: [finalActionRow] });
                    }
                }
                await Poll.deleteOne({ _id: poll._id }); // Remove from DB
            } catch (error) {
                console.error(`Failed to handle expired poll ${poll.messageId}:`, error);
            }
        }
    });
  })
  .catch((err) => {
    console.error("MongoDB error:", err);
    
  });


console.log("Logging into Discord...");
client.login(token)
  .then(() => {
    console.log("Discord bot logged in!");
  })
  .catch((err) => {
    console.error("Discord login error:", err);
    process.exit(1);
  });


client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isModalSubmit() && interaction.customId === 'createPollModal') {
    const question = interaction.fields.getTextInputValue('pollQuestion');
    const optionsText = interaction.fields.getTextInputValue('pollOptions');
    const durationValue = parseInt(interaction.fields.getTextInputValue('durationValue'));
    const durationUnit = interaction.fields.getTextInputValue('durationUnit').toLowerCase();

    if (isNaN(durationValue) || durationValue <= 0) {
      return interaction.reply({ content: 'The duration value must be a positive number.', ephemeral: true });
    }

    const options = optionsText.split('\n').map(opt => opt.trim()).filter(opt => opt.length > 0);
    if (options.length < 2) {
      return interaction.reply({ content: 'A poll must have at least two options.', ephemeral: true });
    }

    let endTime;
    const now = new Date();
    switch (durationUnit) {
      case 'seconds': endTime = new Date(now.getTime() + durationValue * 1000); break;
      case 'minutes': endTime = new Date(now.getTime() + durationValue * 60 * 1000); break;
      case 'hours': endTime = new Date(now.getTime() + durationValue * 60 * 60 * 1000); break;
      case 'days': endTime = new Date(now.getTime() + durationValue * 24 * 60 * 60 * 1000); break;
      case 'months': endTime = new Date(now.getTime() + durationValue * 30 * 24 * 60 * 60 * 1000); break;
      default: return interaction.reply({ content: 'Invalid duration unit. Use seconds, minutes, hours, days, or months.', ephemeral: true });
    }

    
    const actionRow = new ActionRowBuilder().addComponents(
        ...options.map((option, index) =>
            new ButtonBuilder()
                .setCustomId(`poll_vote_${index}`)
                .setLabel(`${option}`)
                .setStyle(ButtonStyle.Primary)
        )
    );

    const embed = new EmbedBuilder()
      .setTitle(question)
      .setDescription(`Poll ends <t:${Math.floor(endTime.getTime() / 1000)}:R>`)
      .setColor('Blurple')
      .setFooter({ text: 'Click a button to vote.' });

    const pollMessage = await interaction.reply({
      embeds: [embed],
      components: [actionRow],
      fetchReply: true,
    });
    
    await Poll.create({
      messageId: pollMessage.id,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      question: question,
      endTime: endTime,
      options: options.map(option => ({ text: option, votes: 0 })),
      voters: [],
    });

  } else if (interaction.isButton() && interaction.customId.startsWith('poll_vote_')) {
    const pollData = await Poll.findOne({ messageId: interaction.message.id });
    if (!pollData) {
      return interaction.reply({ content: 'This poll has expired or was removed.', ephemeral: true });
    }
    
    if (new Date() > pollData.endTime) {
      return interaction.reply({ content: 'This poll has already ended.', ephemeral: true });
    }

    const newOptionIndex = parseInt(interaction.customId.split('_')[2]);
    const userId = interaction.user.id;

    const existingVote = pollData.voters.find(voter => voter.userId === userId);

    if (existingVote) {
      const prevOptionIndex = existingVote.optionIndex;
      if (prevOptionIndex !== newOptionIndex) {
        pollData.options[prevOptionIndex].votes--;
        pollData.options[newOptionIndex].votes++;
        existingVote.optionIndex = newOptionIndex;
      }
    } else {
      pollData.options[newOptionIndex].votes++;
      pollData.voters.push({ userId, optionIndex: newOptionIndex });
    }
    
    
    const updatedActionRow = new ActionRowBuilder().addComponents(
        ...pollData.options.map((option, index) =>
            new ButtonBuilder()
                .setCustomId(`poll_vote_${index}`)
                .setLabel(`${option.votes} votes | ${option.text}`)
                .setStyle(ButtonStyle.Primary)
        )
    );

    
    const newEmbed = new EmbedBuilder(interaction.message.embeds[0].toJSON());
    newEmbed.setDescription(`Poll ends <t:${Math.floor(pollData.endTime.getTime() / 1000)}:R>`);

    await interaction.update({ embeds: [newEmbed], components: [updatedActionRow] });
    await pollData.save();
  }
});
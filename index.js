require("dotenv").config();

const Discord = require("discord.js")
const { EmbedBuilder } = require("discord.js")
const { DisTube } = require("distube")

const client = new Discord.Client({
    intents: [
        "Guilds",
        "GuildMessages",
        "GuildVoiceStates",
        "MessageContent"
    ]
})

const config = {
	prefix: '!',
	token: process.env.TOKEN
};

const distube = new DisTube(client, {
	leaveOnEmpty: true,
	emptyCooldown: 60,
	leaveOnFinish: false,
	leaveOnStop: false
})

client.on("ready", client => {
    console.log("Bot is online")
})

client.on("messageCreate", message => {
	if (message.author.bot || !message.inGuild()) return;
	if (!message.content.startsWith(config.prefix)) return;

	const args = message.content
		.slice(config.prefix.length)
		.trim()
		.split(/ +/g);

	const command = args.shift().toLocaleLowerCase();

	if (command === 'play' || command === 'p') {
		const voiceChannel = message.member?.voice?.channel;
		if (voiceChannel) {
			var query = args.join(' ')

			if (query.includes("https://www.youtube.com/watch?v=") && query.includes("list=")) {
				var tmpQuery = query.split("list=")[1]
				var list = tmpQuery.split("&")[0]

				query = "https://youtube.com/playlist?list=" + list
			}

			console.log(query)
			
			if (query) {
				distube.play(voiceChannel, query, {
					message,
					textChannel: message.channel,
					member: message.member,
				});
			}
			else {
				message.channel.send(
					'Please enter a song.',
				);
			}
		} else {
			message.channel.send(
				'You must join a voice channel first.',
			);
		}
	}

	if (['repeat', 'loop'].includes(command)) {
		const queue = distube.getQueue(message);
		if (!queue) {
			message.channel.send('❌ Nothing playing right now!');
		} else {
			const mode = distube.setRepeatMode(message);
			message.channel.send(
				`Set repeat mode to \`${
					mode
						? mode === 2
							? 'All Queue'
							: 'This Song'
						: 'Off'
				}\``,
			);
		}
	}

	if (command === 'clear') {
		const queue = distube.getQueue(message);
		if (!queue) {
			message.channel.send('❌ Nothing playing right now!');
		} else { 
			distube.stop(message);
			message.channel.send('✅ Queue cleared!');
		}
	}

	if (command === 'leave') {
		distube.voices.get(message)?.leave();
	}

	if (command === 'resume') {
		const queue = distube.getQueue(message);
		if (!queue) {
			message.channel.send('❌ Nothing playing right now!');
		} else { 
			distube.resume(message);
		}
	} 

	if (command === 'pause') {
		const queue = distube.getQueue(message);
		if (!queue) {
			message.channel.send('❌ Nothing playing right now!');
		} else {  
			distube.pause(message);
		}
	} 

	if (command === 'skip') {
		const queue = distube.getQueue(message);
		if (!queue) {
			message.channel.send('❌ Nothing playing right now!');
		} else {  
			message.channel.send('✅ Song skipped.');
			distube.skip(message);
		}
	}
	if (command === 'queue' || command === 'q') {
		const queue = distube.getQueue(message);
		if (!queue) {
			message.channel.send('❌ Nothing playing right now!');
		} else {
			const embed = new EmbedBuilder()
			.setTitle('Queue')
			.setDescription(`Current queue:\n${queue.songs
				.map(
					(song, id) =>
						`**${id ? id : 'Playing'}**. ${
							song.name
						} - \`${song.formattedDuration}\``,
				)
				.slice(0, 10)
				.join('\n')}`)

			message.channel.send({embeds: [embed]})
		}
	}

	if (command === "autoplay" || command === "ap") {
		const queue = distube.getQueue(message);
		if (!queue) {
			message.channel.send('❌ Nothing playing right now!');
		} else {   
			const mode = distube.toggleAutoplay(message);
			message.channel.send("Set autoplay mode to `" + (mode ? "On" : "Off") + "`");
		}
	}

	if (command == "shuffle") {
		const queue = distube.getQueue(message);
		if (!queue) {
			message.channel.send('❌ Nothing playing right now!');
		} else { 
			distube.shuffle(message);
			message.channel.send('🔀 The queue has been shuffled.');
		}
	}  
})

// DisTube event listeners, more in the documentation page
distube
    .on('playSong', (queue, song) => {
        const embed = new EmbedBuilder()
            .setTitle('Now playing')
            .setDescription(`**[${song.name}](${song.url})**\n\`[${song.formattedDuration}]\`\n\n Requested by ${song.user}`)
            .setThumbnail(song.thumbnail)

        queue.textChannel?.send({embeds: [embed]})
	})
	.on('addSong', (queue, song) => {
        const embed = new EmbedBuilder()
            .setTitle('Queued')
            .setDescription(`**[${song.name}](${song.url})** has been added to the queue.\n\n In position #${queue.songs.length}`)
            .setThumbnail(song.thumbnail)

        queue.textChannel?.send({embeds: [embed]})
    })
	.on('addList', (queue, playlist) => {
        const embed = new EmbedBuilder()
            .setTitle('Queued')
            .setDescription(`Added \`${playlist.name}\` playlist (${playlist.songs.length} songs) to the queue.`)

        queue.textChannel?.send({embeds: [embed]})
    })
	.on('error', (textChannel, e) => {
		console.error(e);

		if (textChannel)
			textChannel.send(`An error encountered: ${e.message.slice(0, 2000)}`)
	})
	.on('empty', queue =>
		queue.textChannel?.send(
			'The voice channel is empty! Leaving the voice channel...',
		),
	)
	// DisTubeOptions.searchSongs > 1
	.on('searchResult', (message, result) => {
		let i = 0;
		message.channel.send(
			`**Choose an option from below**\n${result
				.map(
					song =>
						`**${++i}**. ${song.name} - \`${
							song.formattedDuration
						}\``,
				)
				.join(
					'\n',
				)}\n*Enter anything else or wait 30 seconds to cancel*`,
		);
	})
	.on('searchCancel', message =>
		message.channel.send('Searching canceled'),
	)
	.on('searchInvalidAnswer', message =>
		message.channel.send('Invalid number of result.'),
	)
	.on('searchNoResult', message =>
		message.channel.send('No result found!'),
	)
	.on('searchDone', () => {});

process.on('unhandledRejection', error => {
	console.log(error);
});

client.login(config.token);
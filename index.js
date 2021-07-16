require('dotenv').config()
// process.env.DISCORD_TOKEN
const Discord = require("discord.js");
const axios = require('axios');
var fs = require('fs')

//// https://discord.com/api/oauth2/authorize?client_id=865052731793342474&permissions=2550589552&scope=bot


const client = new Discord.Client();


function get_active_streamers() {

   var streamer_list = fs.readFileSync('streamers.json').toString().split("\n");
   streamer_list.pop();

   console.log('[polling twitch] current list ' + streamer_list.toString() );

    return axios({
        method: 'get',
        url: 'https://api.twitch.tv/helix/streams',
        headers: {
            'Authorization': 'Bearer ' + process.env.TWITCH_BEARER,
            'Client-Id': process.env.TWITCH_CLIENT
        },
        params : {
            'user_login': streamer_list
        }
    })


}


function announce_streamer_list( msg ) {
    get_active_streamers().then(resp => {

        var streamers_watchlist = fs.readFileSync('streamers_watchlist.json').toString().split("\n");

        console.log('[announcing live streamers to subscribers: ]' + streamers_watchlist.toString());
        let _active_streamers = [];

        let _remove_watchers = [];


        if (resp.data.data.length > 0) {
                resp.data.data.forEach( streaminfo => {
                    if (!_active_streamers.includes(streaminfo.user_login)) {
                        _active_streamers.push( streaminfo.user_login);
                    }
                })


            console.log('[live streamers]: ' + _active_streamers.toString());

            streamers_watchlist.forEach( watched => {
                let s = watched.split(":");
                let user_id = s[0]; let streamer_username = s[1];



                if (_active_streamers.includes( streamer_username )) {
                    msg.channel.send(`<@${user_id}> "${streamer_username}" is live and streaming! https://twitch.tv/${streamer_username}`);

                    console.log(`[Announced] ${user_id} about ${streamer_username} being live and removed from the list`);
                    _remove_watchers.push(user_id + ":" + streamer_username);
                }
            });

            let copied_streamers_watchlist = streamers_watchlist;
            _remove_watchers.forEach( removal => {
                copied_streamers_watchlist.splice(streamers_watchlist.indexOf(removal), 1);
            });




            fs.writeFileSync('streamers_watchlist.json', copied_streamers_watchlist.join('\n'), (e) => { console.log(e); });

        };

    })
}

client.on('ready', () => {
    const prefix = '!sr'
    try {

        client.on('message', (msg) => {
            //if our message doesnt start with our defined prefix, dont go any further into function
            if (!msg.content.startsWith(prefix)) {
                return
            }

            //slices off prefix from our message, then trims extra whitespace, then returns our array of words from the message
            const args = msg.content.slice(prefix.length).trim().split(' ')

            //splits off the first word from the array, which will be our command
            const command = args.shift().toLowerCase()

            setInterval(announce_streamer_list, 600000, msg);

            if (command == "help" || command == "h") {
                msg.reply("\n!sr help: To show this command\n!sr add <twitch_user> will add the user to a global watchlist when we query twitch for live users.\n!sr remove <twitch_user> removes the user.\n!sr list will list streamers in global watch list.\n!sr subscribe/sub <twitch_user> will add your username to a watch list and when the bot sees the user online it will @ you.\n!sr unsubscribe/unsub will remove the user from the list.\n!sr sublist will show your current watchlist\nNote that sub will @ then remove you from the subscribers list so remember to re-susbscribe to a user if you missed it.");
                return;
            }


            if (command == "subscribe" || command == "sub") {
                let author = msg.author;
                var streamer_list = fs.readFileSync('streamers_watchlist.json').toString().split("\n");

                if (streamer_list.includes ( author.id + ":" + args[0]) ) {
                    msg.reply("You're already subscribed to this streamer");
                }
                else {
                    streamer_list.push(author.id + ":" + args[0]);
                    fs.appendFileSync('streamers_watchlist.json', author.id + ":" + args[0]  + "\n", (e) => {

                    });

                    msg.reply("You'll be notified when " + args[0] + " is live!");
                }

                return;
            }


            if (command == "unsubscribe" || command == "unsub") {
                var streamer_list = fs.readFileSync('streamers_watchlist.json').toString().split("\n");
                var cleaned = streamer_list.filter(item => item != msg.author.id + ":" + args[0]);
                fs.writeFileSync('streamers_watchlist.json', cleaned.join('\n'), (e) => { console.log(e); });

                msg.reply("You'll no longer be notified when " + args[0] + " is live");

                return;
            }

            if (command == "sublist") {
                let author = msg.author;
                var streamer_list = fs.readFileSync('streamers_watchlist.json').toString().split("\n");
                var subbed = [];

                streamer_list.forEach(subbs => {
                    let s = subbs.split(":");
                    let user_id = s[0]; let streamer_username = s[1];

                    if (user_id == author.id) {
                        subbed.push(streamer_username);
                    }
                });
                if (subbed.length > 0) {

                    msg.reply('Your current subbed list is: ' + subbed.join(',').toString());
                } else {
                    msg.reply("You're not subscribed to any streamers currently.");
                }
            }


            if (command == "add") {
                var streamer_list = fs.readFileSync('streamers.json').toString().split("\n");
                if (streamer_list.includes( args[0] ) ) {
                    msg.reply("Streamer " + args[0] + " is already added to the list");
                }
                else {

                    streamer_list.push( args[0] );
                    fs.appendFileSync('streamers.json', args[0] + "\n", (e) => {

                    });

                    msg.reply("Added streamer " + args[0] + " to the global watch list");
                }
                return;
            }




            if (command == "remove") {
                var streamer_list = fs.readFileSync('streamers.json').toString().split("\n");
                var cleaned = streamer_list.filter(item => item != args[0]);

                fs.writeFileSync('streamers.json', cleaned.join('\n') , (e) => { console.log(e); });

                msg.reply("Removed streamer " + args[0] + " from the global watch list");

                return;
            }

            if (command == "list") {

                var streamer_list = fs.readFileSync('streamers.json').toString().split("\n");
                let reply_string = "Current streamers in the list are: " + streamer_list.join(", ");
                msg.reply( reply_string.substring(0, reply_string.length - 2) + ".");

                return;
            }


            if (command == "refresh") {


                let stream_watch_role = msg.guild.roles.cache.find(role => role.name === "StreamWatch");
                let membersWithRole = msg.guild.roles.cache.get(stream_watch_role.id).members;

                announce_streamer_list(msg);

                return;

            }



        });



    } catch(e ) {
        console.log(e);

    }

});

client.login( process.env.DISCORD_TOKEN);

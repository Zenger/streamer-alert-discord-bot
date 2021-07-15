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

   
    return axios({
        method: 'get',
        url: 'https://api.twitch.tv/helix/streams',
        headers: {
            'Authorization': 'Bearer hxvdi363nen4o1mx1tcarnsrlmw9vw',
            'Client-Id': 'f75iah6xxw7ijmqwhzm9wzmxep1ryb'
        },
        params : {
            'user_login': streamer_list
        }
    })

}


client.on('ready', () => {
    const prefix = '!sr'
    try {

        client.on('message', async (msg) => {
            //if our message doesnt start with our defined prefix, dont go any further into function
            if (!msg.content.startsWith(prefix)) {
                return
            }

            //slices off prefix from our message, then trims extra whitespace, then returns our array of words from the message
            const args = msg.content.slice(prefix.length).trim().split(' ')

            //splits off the first word from the array, which will be our command
            const command = args.shift().toLowerCase()


            if (command == "help" || "h") {
                msg.reply("\n!sr help: To show this command\n!sr add <twitch_user> will add the user to a global watchlist when we query twitch for live users.\n!sr remove <twitch_user> removes the user.\n!sr subscribe/sub <twitch_user> will add your username to a watch list and when the bot sees the user online it will @ you.\n!sr unsubscribe/unsub will remove the user from the list.\nNote that sub will @ then remove you from the subscribers list so remember to re-susbscribe to a user if you missed it.");
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

                    msg.reply("Added streamer " + args[0] + " to the list");
                }
            }


            if (command == "unsubscribe" || command == "unsub") {
                var streamer_list = fs.readFileSync('streamers_watchlist.json').toString().split("\n");
                var cleaned = streamer_list.filter(item => item != msg.author.id + ":" + args[0]);
                fs.writeFileSync('streamers_watchlist.json', cleaned.join('\n'), (e) => { console.log(e); });
               
                msg.reply("Removed streamer " + args[0] + " from the list");
            }

            if (command === "add") {
                var streamer_list = fs.readFileSync('streamers.json').toString().split("\n");
                if (streamer_list.includes( args[0] ) ) {
                    msg.reply("Streamer " + args[0] + " is already added to the list");
                }
                else {
                    
                    streamer_list.push( args[0] );
                    fs.appendFileSync('streamers.json', args[0] + "\n", (e) => {
                        
                    });

                    msg.reply("Added streamer " + args[0] + " to the list");
                }
            }


            if (command == "remove") {
                var streamer_list = fs.readFileSync('streamers.json').toString().split("\n");
                var cleaned = streamer_list.filter(item => item != args[0]);

                fs.writeFileSync('streamers.json', cleaned.join('\n') , (e) => { console.log(e); });

                msg.reply("Removed streamer " + args[0] + " from the list");
            }

            if (command == "list") {

                var streamer_list = fs.readFileSync('streamers.json').toString().split("\n");
                let reply_string = "Current streamers in the list are: " + streamer_list.join(", ");
                msg.reply( reply_string.substring(0, reply_string.length - 2) + ".");
            }


            if (command == "refresh") {
                
               
                let stream_watch_role = msg.guild.roles.cache.find(role => role.name === "StreamWatch");
                let membersWithRole = msg.guild.roles.cache.get(stream_watch_role.id).members;

                get_active_streamers().then(resp => {
                    var streamer_list = fs.readFileSync('streamers_watchlist.json').toString().split("\n");
                    streamer_list.forEach( sub => {
                        let s = sub.split(":");
                        let user_id = s[0]; let streamer_username = s[1];
                        
                        if (resp.data.data.length > 0) {
                            resp.data.data.forEach( streamer => {
                                if (streamer.user_login == streamer_username) {
                                    msg.channel.send(`<@${user_id}> "${streamer.user_login}" is live and streaming!`);

                                    var streamer_list = fs.readFileSync('streamers_watchlist.json').toString().split("\n");
                                    var cleaned = streamer_list.filter(item => item != msg.author.id + ":" + streamer_username);
                                    fs.writeFileSync('streamers_watchlist.json', cleaned.join('\n'), (e) => { console.log(e); });
                                    

                                }
                            });
                        }
                    }); 
                })

            }

        });

        setInterval( () => {
            get_active_streamers().then(resp => {
                var streamer_list = fs.readFileSync('streamers_watchlist.json').toString().split("\n");
                streamer_list.forEach(sub => {
                    let s = sub.split(":");
                    let user_id = s[0]; let streamer_username = s[1];

                    if (resp.data.data.length > 0) {
                        resp.data.data.forEach(streamer => {
                            if (streamer.user_login == streamer_username) {
                                msg.channel.send(`<@${user_id}> "${streamer.user_login}" is live and streaming!`);

                                var streamer_list = fs.readFileSync('streamers_watchlist.json').toString().split("\n");
                                var cleaned = streamer_list.filter(item => item != msg.author.id + ":" + streamer_username);
                                fs.writeFileSync('streamers_watchlist.json', cleaned.join('\n'), (e) => { console.log(e); });


                            }
                        });
                    }
                });
            })

        }  , 600000 );

    } catch(e ) {
        msg.reply(e.message);

    }

});

client.login( process.env.DISCORD_TOKEN);
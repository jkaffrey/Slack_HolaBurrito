
const mongodb = require('mongodb');   
const { App } = require('@slack/bolt');
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const BOT_TOKEN = process.env.BOT_TOKEN;

let slack = {}

const PORT = process.env.PORT || 8080;
const MAX_BURRITOS_PER_DAY = process.env.MAX_BURRITOS_PER_DAY;
const MONGODB_URI=process.env.MONGODB_URI;
const MONGODB_USER=process.env.MONGODB_USER;
const MONGODB_PASS=process.env.MONGODB_PASS;

let uri = encodeURI('mongodb+srv://' + MONGODB_USER + ':' + MONGODB_PASS + '@' + MONGODB_URI);

mongodb.MongoClient.connect(uri, function(err, client) {

    var that = this;

    if (err) {
        console.log('Failed to connect to mongodb');
    }

    // setting defaults for all Slack API calls
    slack.app = new App({
        signingSecret: SLACK_SIGNING_SECRET,
        token: BOT_TOKEN
    });

    let db = client.db('heroku_8k5h3x81')

    let burritosGiven = db.collection('burritosGiven');
    let burritosReceived = db.collection('burritosReceived');
    let burritoCannonGiven = db.collection('burritoCannon');
    let burritoMultiplier = db.collection('burritoMultiplier');

    let burritoCannonBaseVal = 10;
    let burritoCannonCoolDownDays = 2;
    let burritoCannonResetCost = 50;
    let burritosForAllCost = 15;

    slack.sendMessage = function(channel, message) {
        (async () => {
            try {
              // Use the `chat.postMessage` method to send a message from this app
              await slack.app.client.chat.postMessage({
                channel: channel,
                text: message,
                token: BOT_TOKEN
              });
            } catch (error) {
              console.log(error);
            }
        })();
    }

    this.getBurritoMultiplier = function() {

        return new Promise(function (resolve, reject) {

            var query = burritoMultiplier.find({}).toArray(function (err, docs) {

                if (err) {
                    reject(err);
                }

                resolve((docs === undefined || docs.length == 0 || docs[0] == null) ? 1 : docs[0].multiplierValue);
            })
        });
    }

    Date.prototype.addHours= function(h){
        this.setHours(this.getHours() + h);
        return this;
    }

    this.setBurritoMultiplier = function(userId) {

        // Decrease users burritos
        burritosReceived.findOneAndUpdate({ slackUser : userId }, { $inc : { count : (-1 * burritosForAllCost) } }, { upsert : true });
        // TODO JDK make the multipler dynamic
        burritoMultiplier.findOneAndUpdate({ slackUser : userId }, { $set : { multiplierValue : 5, expireDate: new Date().addHours(12) }}, { upsert : true });
    }

    this.getBurritoTotal = function(user) {

        return new Promise(function (resolve, reject) {

            var query = burritosReceived.findOne({ slackUser : user }, function (err, res) {

                if (err) {
                    reject(err);
                }

                var result = res ? res.count : 0;
                resolve(result);
            });
        });
    }

    this.resetBurritoCannon = function(userId) {

        that.canBurritoCannon(userId).then(function(expireDate) {

            var canBurritoCannon = expireDate ? false : true;

            if (canBurritoCannon) {
                slack.sendMessage(userId, 'You have a burrito cannon to give, you cannot buy a burrito cannon until you\'ve used your current one.')
                return;
            }

            that.getBurritoTotal(userId).then(function(totalCount) {

                 if ((totalCount - burritoCannonResetCost) >= 0) {

                    burritoCannonGiven.deleteOne({ slackUser : userId }); // Remove the burrito cannon record
                    // Remove 50 burritos from user
                    burritosReceived.findOneAndUpdate({ slackUser : userId }, { $inc : { count : (-1 * burritoCannonResetCost) }, $set : { lastUpdateDate : new Date() }}, { upsert : true });
                    
                    slack.sendMessage(userId, 'Your burrito cannon has been reset! That cost you 50 burritos, use it wisely.');
                } else {
                    slack.sendMessage(userId, 'You don\'t have enough burritos to pay to reset your burrito cannon.');
                }
            });
        });
    }

    function burritoCannon(gaveABurrito, receivedABurrito) {

        that.burriotsRecieved(gaveABurrito).then(function(userBurritos) {

            let totalBurritos = (userBurritos && userBurritos > 0) ? userBurritos : 0;
            let burritoCannonVal = Math.round(burritoCannonBaseVal + (totalBurritos * .15));

            const today = new Date();
            const cooldownDate = new Date(today);
            cooldownDate.setDate(cooldownDate.getDate() + burritoCannonCoolDownDays);

            burritoCannonGiven.findOneAndUpdate({ slackUser : receivedABurrito }, { $set : { expireDate : cooldownDate } }, { upsert : true });
            burritosReceived.findOneAndUpdate({ slackUser : receivedABurrito }, { $inc : { count : burritoCannonVal }, $set : { lastUpdateDate : new Date() }}, { upsert : true });
        });
    }

    function burritoGiven(gaveABurrito, recievedABurrito, numberGiven) {

        that.getBurritoMultiplier().then(function(multiplier) {

            burritosReceived.findOneAndUpdate({ slackUser : recievedABurrito }, { $inc : { count : (numberGiven * multiplier) }, $set : { lastUpdateDate : new Date() }}, { upsert : true });
            burritosGiven.findOneAndUpdate({ slackUser : gaveABurrito }, { $inc : { count : numberGiven }, $set : { lastUpdateDate : new Date() }}, { upsert : true });
        })
    };

    this.canBurritoCannon = function(user) {

        return new Promise(function (resolve, reject) {

            var query = burritoCannonGiven.findOne({ slackUser : user }, function (err, res) {

                if (err) {
                    reject(err);
                }

                var result = res ? res.expireDate : null;
                resolve(result);
            });
        });
    }

    this.burritosRemainingPerDay = function(user) {

        return new Promise(function (resolve, reject) {

            var query = burritosGiven.findOne({ slackUser : user }, function (err, res) {

                if (err) {
                    reject(err);
                }

                var result = MAX_BURRITOS_PER_DAY - (res ? res.count : 0);
                resolve(result);
            });
        });
    }

    this.accountAge = function(user) {

        return new Promise(function(resolve, reject) {

            var query = burritosReceived.findOne({ slackUser : user }, function(err, res) {

                if (err) {
                    reject(err);
                }

                var id = res ? res._id : -1;
                if (id && id !== -1) {
                    var timestamp = id.toString().substring(0,8);
                    var dateCreated = new Date( parseInt( timestamp, 16 ) * 1000 );
                    var dateDifference =  new Date().getTime() - dateCreated.getTime();
                    var Difference_In_Days = dateDifference / (1000 * 3600 * 24);
                    resolve(Math.round(Difference_In_Days));
                } else {
                    resolve(0);
                }
            });
        });
    }

    this.burriotsRecieved = function(user) {

        return new Promise(function (resolve, reject) {

            var query = burritosReceived.findOne({ slackUser : user }, function (err, res) {

                if (err) {
                    reject(err);
                }

                var result = res ? res.count : 0;
                resolve(result);
            });
        });
    }

    this.getBurritoBoard = function() {

        return new Promise(function (resolve, reject) {

            var query = burritosReceived.find().sort({ count : -1 }).toArray(function(err, results) {
                if (err) {
                    reject(err);
                }

                resolve(results);
            });
        });
    }

    function burritosInMention(str) {

        var burritoCount = 0;
        var arr = str.split(" ");
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === ':burrito:') {
                burritoCount++;
            }
        }

        return burritoCount;
    }

    function getAllUsersInStr(str) {

        var outputUsers = [];
        var arr = str.split(" ");
        for (var i = 0; i < arr.length; i++) {

            var userGivenBurrito = arr[i].match(/<@(.*)>/);
            if (userGivenBurrito && userGivenBurrito[1]) {

                outputUsers.push(userGivenBurrito[1]);
            }
        }

        return outputUsers;
    }
    
    slack.app.event('reaction_added', ({event, client}) => {
        (async () => {

            var user_who_reacted = event.user;
            var reaction = event.reaction;
            var recieved_reaction = event.item_user;

            if (reaction === 'bulbie' && user_who_reacted && recieved_reaction) {

                var usersMentioned = [ recieved_reaction ];
                var giverName = user_who_reacted;
                for (var i = 0; i < usersMentioned.length; i++) {

                    var userMentioned = usersMentioned[i];
                    if (event.user === userMentioned) {
                        break;
                    }
                    slack.sendMessage(userMentioned, 'You got a bulbie from <@' + giverName + '>, sadly it\'s not worth any burritos but it sure would make Ty happy.');
                    slack.sendMessage(giverName, 'You sent :bulbie: to <@' + userMentioned + '>');
                }
            }

            if (reaction === 'ba-dum-tsss' && user_who_reacted && recieved_reaction) {

                var usersMentioned = [ recieved_reaction ];
                var giverName = user_who_reacted;
                for (var i = 0; i < usersMentioned.length; i++) {

                    var userMentioned = usersMentioned[i];
                    if (event.user === userMentioned) {
                        break;
                    }
                    slack.sendMessage(userMentioned, 'You got a :ba-dum-tsss: from <@' + giverName + '>. I don\'t know what you said, but they thought it was funny.');
                    slack.sendMessage(giverName, 'You sent a :ba-dum-tsss: to <@' + userMentioned + '>');
                }
            }

            if (reaction === 'tanks' && user_who_reacted && recieved_reaction) {

                var usersMentioned = [ recieved_reaction ];
                var giverName = user_who_reacted;
                for (var i = 0; i < usersMentioned.length; i++) {

                    var userMentioned = usersMentioned[i];
                    if (event.user === userMentioned) {
                        break;
                    }
                    slack.sendMessage(userMentioned, '<@' + giverName + '> says \'tanks for all you do. :ba-dum-tsss:');
                    slack.sendMessage(giverName, 'You sent some :tanks: to <@' + userMentioned + '>');
                }
            }

            if (reaction === 'burrito' && user_who_reacted && recieved_reaction) {

                that.burritosRemainingPerDay(user_who_reacted).then(function(remainingCount) {

                    var usersGivenBurritos = [ recieved_reaction ];
                    var burritosGiven = 1;
                    var burritosToDistribute = (usersGivenBurritos.length - 1) * (burritosGiven.length - 1);
                    var giveFailed = false;

                    if (burritosToDistribute > remainingCount) {
                        slack.sendMessage(user_who_reacted, 'You don\'t have enough burritos to give to everyone.');
                        return;
                    }

                    for (var i = 0; i < usersGivenBurritos.length; i++) {

                        var userGivenBurrito = usersGivenBurritos[i];

                        if (!userGivenBurrito) {
                            giveFailed = true;
                            break;
                        }

                        if (user_who_reacted === userGivenBurrito) {
                            slack.sendMessage(user_who_reacted, 'You cannot give yourself a burrito.');
                            giveFailed = true;
                            break;
                        }

                        if (remainingCount <= 0) {
                            slack.sendMessage(user_who_reacted, 'You are out of burritos to give today.');
                            giveFailed = true;
                            break;
                        }

                        if (!giveFailed) {
                            burritoGiven(user_who_reacted, recieved_reaction, burritosGiven);
                        }
                    }

                    if (usersGivenBurritos === undefined || usersGivenBurritos.length == 0 || giveFailed) {
                        return;
                    }

                    var pluralize = burritosGiven === 1 ? ' burrito' : ' burritos';
                    slack.sendMessage(user_who_reacted, 'Hola, you gave ' + burritosGiven + pluralize + ' to <@' + userGivenBurrito + '>. You have ' + remainingCount + ' burritos left to give today.');

                    that.burriotsRecieved(userGivenBurrito).then(function(count) {

                        that.getBurritoMultiplier().then(function(multiplier) {

                            count = count * multiplier;

                            var pluralize = count === 1 ? ' burrito' : ' burritos';
                            slack.sendMessage('@' + userGivenBurrito, 'Hola, you recieved a burrito from <@' + user_who_reacted + '>. Overall you have ' + count + pluralize + '.');
                        });
                    });
                });
            }
        })();
    });

    slack.app.event('message', ({event, client}) => {
        (async () => {
            var emoteType;
            if (event.text && event.text.indexOf(':burrito:') > 0 && event.text.indexOf(':cannon:') > 0) {
                emoteType = 'burritoCannon';
            } else if (event.text && event.text.indexOf(':burrito:') >= 0 && event.text.indexOf(':bulbie:') >= 0) {
                emoteType = 'burritosForAll';
            } else if (event.text && event.text.indexOf(':burrito:') > 0) {
                emoteType = 'burrito';
            } else if (event.text && event.text.indexOf(':bulbie:') > 0) {
                emoteType = 'bulbie';
            } else if (event.text && event.text.indexOf(':ba-dum-tsss:') > 0) {
                emoteType = 'ba-dum-tsss';
            } else if (event.text && event.text.indexOf(':tanks:') > 0) {
                emoteType = 'tanks';
            }

            if (event.text && emoteType === 'bulbie') {

                var usersMentioned = getAllUsersInStr(event.text);
                var giverName  = event.user;
                for (var i = 0; i < usersMentioned.length; i++) {

                    var userMentioned = usersMentioned[i];
                    if (event.user === userMentioned) {
                        break;
                    }
                    slack.sendMessage(userMentioned, 'You got a bulbie from <@' + giverName + '>, sadly it\'s not worth any burritos but it sure would make Ty happy.');
                    slack.sendMessage(giverName, 'You sent :bulbie: to <@' + userMentioned + '>');
                }
            }

            if (event.text && emoteType === 'ba-dum-tsss') {

                var usersMentioned = getAllUsersInStr(event.text);
                var giverName  = event.user;
                for (var i = 0; i < usersMentioned.length; i++) {

                    var userMentioned = usersMentioned[i];
                    if (event.user === userMentioned) {
                        break;
                    }

                    slack.sendMessage(userMentioned, 'You got a :ba-dum-tsss: from <@' + giverName + '>. I don\'t know what you said, but they thought it was funny.');
                    slack.sendMessage(giverName, 'You sent a :ba-dum-tsss: to <@' + userMentioned + '>');
                }
            }

            if (event.text && emoteType === 'tanks') {

                var usersMentioned = getAllUsersInStr(event.text);
                var giverName = event.user;
                for (var i = 0; i < usersMentioned.length; i++) {

                    var userMentioned = usersMentioned[i];
                    if (event.user === userMentioned) {
                        break;
                    }

                    slack.sendMessage(userMentioned, '<@' + giverName + '> says \'tanks for all you do. :ba-dum-tsss:');
                    slack.sendMessage(giverName, 'You sent some :tanks: to <@' + userMentioned + '>');
                }
            }

            if (event.text && emoteType === 'burritosForAll' && event.subtype !== 'bot_message') {

                that.getBurritoMultiplier().then(function(multiplier) {

                    if (multiplier !== 1) {
                        slack.sendMessage(event.user, 'You\'re being too zealous, there is already a burrito multipler in play. Please wait for it to expire.');
                        multiplierFailed = true;
                    } else {

                        that.getBurritoTotal(event.user).then(function(totalBurritos) {

                            if ((totalBurritos - burritosForAllCost) >= 0) {

                                that.setBurritoMultiplier(event.user);

                                slack.sendMessage(event.channel, '<@' + event.user + '> has given burritos to all! Enjoy x5 burrito multipler for the next 12 hours.');
                                slack.sendMessage(event.user, 'You\'ve given burritos to all, you lost 15 burritos but probably gained some friends.');
                            } else {
                                slack.sendMessage(event.user, 'I admire your support for your colleagues but you are a few burritos short to share your burritos with everyone.');
                            }
                        });
                    }
                })
            }

            if (event.text && emoteType === 'burritoCannon' && event.subtype !== 'bot_message') {

                that.canBurritoCannon(event.user).then(function(expireDate) {

                    var canBurritoCannon = expireDate ? false : true;
                    var usersGivenBurritos = getAllUsersInStr(event.text);
                    var userGivenBurrito = usersGivenBurritos[0];
                    var giveFailed = false;

                    if (!canBurritoCannon) {

                        var timeReminaing = Math.round(Math.abs(expireDate - new Date()) / 36e5);

                        slack.sendMessage(event.user, 'You have already used your burrito cannon, please wait '  + timeReminaing + ' hours for it to cool down.');

                        giveFailed = true;
                    } else if (usersGivenBurritos.length > 1 || !userGivenBurrito) {
                        slack.sendMessage(event.user, 'You can only burrito cannon one person every ' + burritoCannonCoolDownDays + '. Please limit your \'@\' to one  person.');
                        giveFailed = true;
                    } else if (event.user === userGivenBurrito) {
                        slack.sendMessage(event.user, 'You cannot give yourself a burrito cannon.');
                        giveFailed = true;
                    }

                    if  (!giveFailed) {

                        var message = event.text;
                        var strippedMessage = message.substr(message.lastIndexOf(':') + 1, message.length);

                        burritoCannon(event.user, userGivenBurrito);

                        if (strippedMessage) {
                            slack.sendMessage(event.channel, '<@' + userGivenBurrito + '> has been burrito cannoned by <@' + event.user + '> :burrito: :burrito: :cannon: \r\n' +
                            ':celebrate: They say: \"' + strippedMessage + '\" :fiesta-parrot:');
                        }
                        slack.sendMessage(event.user, 'Hola, you gave a burrito cannon to <@' + userGivenBurrito + '>.');

                        that.burriotsRecieved(event.user).then(function(burritosReceived) {

                            let totalBurritos = burritosReceived > 0 ? burritosReceived : 0;
                            let burritoCannonVal = Math.round(burritoCannonBaseVal + (totalBurritos * .15));
                            slack.sendMessage('@' + userGivenBurrito, 'Holy guacamole, you recieved a burrito cannon from <@' + event.user + '>. ' +
                            'You just gained ' + burritoCannonVal + ' burritos!');
                        });
                    }
                });
            }

            if (event.text && emoteType === 'burrito') {

                that.burritosRemainingPerDay(event.user).then(function(remainingCount) {

                    var usersGivenBurritos = getAllUsersInStr(event.text);
                    var burritosGiven = burritosInMention(event.text);
                    var burritosToDistribute = (usersGivenBurritos.length - 1) * (burritosGiven.length - 1);
                    var giveFailed = false;

                    if (burritosToDistribute > remainingCount) {
                        slack.sendMessage(event.user, 'You don\'t have enough burritos to give to everyone.');
                        return;
                    }

                    for (var i = 0; i < usersGivenBurritos.length; i++) {

                        var userGivenBurrito = usersGivenBurritos[i];

                        if (!userGivenBurrito) {
                            giveFailed = true;
                            break;
                        }

                        if (event.user === userGivenBurrito) {
                            slack.sendMessage(event.user, 'You cannot give yourself a burrito.');
                            giveFailed = true;
                            break;
                        }

                        if (remainingCount <= 0) {
                            slack.sendMessage(event.user, 'You are out of burritos to give today.');
                            giveFailed = true;
                            break;
                        }

                        if (!giveFailed) {
                            burritoGiven(event.user, userGivenBurrito, burritosGiven);
                        }
                    }

                    if (usersGivenBurritos === undefined || usersGivenBurritos.length == 0 || giveFailed) {
                        return;
                    }

                    var pluralize = burritosGiven === 1 ? ' burrito' : ' burritos';
                    slack.sendMessage(event.user, 'Hola, you gave ' + burritosGiven + pluralize + ' to <@' + userGivenBurrito + '>. You have ' + remainingCount + ' burritos left to give today.');

                    that.burriotsRecieved(userGivenBurrito).then(function(count) {

                        that.getBurritoMultiplier().then(function(multiplier) {

                            count = count * multiplier;
                            var pluralize = count === 1 ? ' burrito' : ' burritos';
                            slack.sendMessage('@' + userGivenBurrito, 'Hola, you recieved a burrito from <@' + event.user + '>. Overall you have ' + count + pluralize + '.');
                        });
                    });
                });
            }
        })();
    });

    slack.app.command('/burritostats', async ({command, ack, say}) => {
        await ack();
        const requester = command.user_id;
        Promise.all([
            that.burritosRemainingPerDay(requester), 
            that.burriotsRecieved(requester), 
            that.accountAge(requester)
        ])
        .then(function(res) {

            var burritosLeft = res[0];
            var totalBurritosRecieved = res[1];
            var accountAgeInDays = res[2];
            var pluralize = totalBurritosRecieved === 1 ? ' burrito' : ' burritos';
            var days = accountAgeInDays === 1 ? 'day' : 'days';
            slack.sendMessage(requester, 'You have ' + burritosLeft + ' burritos left to give today. You have recieved ' + totalBurritosRecieved + ' ' + pluralize + ' over the course of ' + accountAgeInDays +  ' ' + days + '. ( Slack UserID:' + requester + ' )');
            res.resolve();
        });
    });

    slack.app.command('/burritoboard', async ({command, ack, say}) => {
        await ack();
        that.getBurritoBoard().then(function(res) {

            var entriesLength = (command.text === 'all') ? res.length : 5;
            var boardText = (command.text === 'all') ? ' Burrito Leaderboard For Everyone ' : ' Top 5 Burrito Earners ';


            var output = ':burrito: ' + boardText + ' :burrito:\r\n';
            for (var i = 0; i < entriesLength ; i++) {
                var pluralize = res[i].count === 1 ? ' burrito' : ' burritos';
                output += (i+1) + ') <@' + res[i].slackUser  + '> with ' + res[i].count + pluralize + '\r\n';
            }

            slack.sendMessage(command.user_id, output);
        });
    });
    
    slack.app.command('/burritocannonbuy', async ({command, ack, say}) => {
        await ack();
        that.resetBurritoCannon(command.user_id);
    });

    (async () => {
        // Start the app
        slack.client = (await slack.app.start(PORT));
        console.log('Slack app is running!');
    })();
});

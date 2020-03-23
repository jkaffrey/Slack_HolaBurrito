require('dotenv').config();
const ts = require('tinyspeck'),
    mongodb = require('mongodb'),
    fs = require('fs'),
    PORT = process.env.PORT || 8080,
    BOT_TOKEN = process.env.BOT_TOKEN,
    TOKEN = process.env.TOKEN,
    REQUEST_URL =  process.env.REQUEST_URL,
    MAX_BURRITOS_PER_DAY = process.env.MAX_BURRITOS_PER_DAY,
    MONGODB_URI=process.env.MONGODB_URI,
    MONGODB_USER=process.env.MONGODB_USER,
    MONGODB_PASS=process.env.MONGODB_PASS;

const burritoName = "burritos:";
// setting defaults for all Slack API calls
let slack = ts.instance({ token: BOT_TOKEN });
//let uri = 'mongodb://user:pass@host:port/dbname';
let uri = 'mongodb://' + MONGODB_USER + ':' + MONGODB_PASS + '@' + MONGODB_URI;

mongodb.MongoClient.connect(uri, function(err, client) {

    if (err) throw err;

    let db = client.db('heroku_8k5h3x81')

    let burritosGiven = db.collection('burritosGiven');
    let burritosReceived = db.collection('burritosReceived');

    function burritoGiven(gaveABurrito, recievedABurrito, numberGiven) {

        for (var i = 0; i < numberGiven; i++) {

            burritosReceived.update({ slackUser : recievedABurrito }, $inc : { count : NumberLong(1) });
            burritosGiven.update({ slackUser : gaveABurrito }, $inc : { count : NumberLong(1) });
        }
    };

    function burritosRemainingPerDay(user) {

        var givenBurritos = burritosGiven.findOne({ slackUser : user }, function(error, res) {
            if (error) {
                return 0;
            }

            return res.count;
        });

        return MAX_BURRITOS_PER_DAY - givenBurritos;
    }

    function burriotsRecieved(user) {

        var recievedBurritos = burritosReceived.findOne({ slackUser : user }, function(err, res) {
            if (err) {
                return 0;
            }

            return result.count;
        });

        return recievedBurritos;
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

    slack.on('message', payload => {

        if (payload.event.text && payload.event.text.indexOf(':burrito:') > 0) {

            var usersGivenBurritos = getAllUsersInStr(payload.event.text);
            var burritosGiven = burritosInMention(payload.event.text);
            var burritosToDistribute = (usersGivenBurritos.length - 1) * (burritosGiven.length - 1);
            var giveFailed = false;

            if (burritosToDistribute > burritosRemainingPerDay(payload.event.user)) {

                slack.send({
                    token: BOT_TOKEN,
                    text: 'You don\'t have enough burritos to give to everyone.',
                    channel: payload.event.user,
                    as_user: false,
                    username: 'Hola Burrito'
                }).then(res => {
                }).catch(console.error);
                return;
            }

            for (var i = 0; i < usersGivenBurritos.length; i++) {

                var userGivenBurrito = usersGivenBurritos[i];

                if (!userGivenBurrito) {
                    giveFailed = true;
                    break;
                }

                if (payload.event.user === userGivenBurrito) {
                    slack.send({
                        token: BOT_TOKEN,
                        text: 'You cannot give yourself a burrito.',
                        channel: payload.event.user,
                        as_user: false,
                        username: 'Hola Burrito'
                    }).then(res => {
                    }).catch(console.error);
                    giveFailed = true;
                    break;
                }

                if (burritosRemainingPerDay(payload.event.user) <= 0) {
                    slack.send({
                        token: BOT_TOKEN,
                        text: 'You are out of burritos to give today.',
                        channel: payload.event.user,
                        as_user: false,
                        username: 'Hola Burrito'
                    }).then(res => {
                    }).catch(console.error);
                    giveFailed = true;
                    break;
                }

                if (!giveFailed) {
                    burritoGiven(payload.event.user, userGivenBurrito, burritosGiven);
                }
            }

            if (usersGivenBurritos === undefined || usersGivenBurritos.length == 0 || giveFailed) {
                return;
            }

            slack.send({
                token: BOT_TOKEN,
                text: 'Hola, you gave ' + burritosGiven + ' burrito(s) to <@' + userGivenBurrito + '>. You have ' + burritosRemainingPerDay(payload.event.user) + ' burritos left to give today.',
                channel: payload.event.user,
                as_user: false,
                username: 'Hola Burrito'
            }).then(res => {
            }).catch(console.error);

            slack.send({
                token: BOT_TOKEN,
                text: 'Hola, you recieved a burrito from <@' + payload.event.user + '>. Overall you have ' + burriotsRecieved(userGivenBurrito) + ' burritos.',
                channel: '@' + userGivenBurrito,
                as_user: false,
                username: 'Hola Burrito'
            }).then(res => {
            }).catch(console.error);
        }
    });

    slack.on('/burritostats', payload => {

        var requester = payload.user_id;
        var burritosLeft = burritosRemainingPerDay(requester);
        var totalBurritosRecieved = burriotsRecieved(requester);

        slack.send({
            token: BOT_TOKEN,
            text: 'You have ' + burritosLeft + ' burritos left to give today. You have recieved ' + totalBurritosRecieved + ' burrito(s).',
            channel: requester,
            as_user: false,
            username: 'Hola Burrito'
        }).then(res => {
        }).catch(console.error);
    });


    // incoming http requests
    slack.listen(PORT);
});
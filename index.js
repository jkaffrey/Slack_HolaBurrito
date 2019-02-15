require('dotenv').config();
const ts = require('tinyspeck'),
    fs = require('fs'),
    PORT = process.env.PORT || 8080,
    BOT_TOKEN = process.env.BOT_TOKEN,
    TOKEN = process.env.TOKEN,
    REQUEST_URL =  process.env.REQUEST_URL,
    MAX_BURRITOS_PER_DAY = process.env.MAX_BURRITOS_PER_DAY;

const burritoName = "burritos:";
// setting defaults for all Slack API calls
let slack = ts.instance({ token: BOT_TOKEN });
let subPath = "/burritos/";

function burritoGiven(fromUser, toUser, numberGiven) {

    // Reset the number of burritos you can give.
    isFileOlderThan6Hrs(fromUser);

    for (var i = 0; i < numberGiven; i++) {

        var recievedFileName = subPath + toUser + '_recieved.txt';
        var givenFileName = subPath + fromUser + '_given.txt';

        var hasFileRecieved = fs.existsSync(recievedFileName);
        if (!hasFileRecieved) {
            fs.writeFileSync(recievedFileName, '');
        }

        var hasFileGiven = fs.existsSync(givenFileName);
        if (!hasFileGiven) {
            fs.writeFileSync(givenFileName, '');
        }

        var contentRecieved = fs.readFileSync(recievedFileName, 'utf8');
        fs.writeFileSync(recievedFileName, contentRecieved + ',' + fromUser);

        var contentGiven = fs.readFileSync(givenFileName, 'utf8');
        fs.writeFileSync(givenFileName, contentGiven + ',' + toUser);
    }
};

function burritosRemainingPerDay(user) {

    var givenFileName = subPath + user + '_given.txt';

    var hasFileGiven = fs.existsSync(givenFileName);
    if (!hasFileGiven) {
        fs.writeFileSync(givenFileName, '');
        return MAX_BURRITOS_PER_DAY;
    }

    var givenBurritos = fs.readFileSync(givenFileName, 'utf8');
    givenBurritos = (givenBurritos.split(",").length - 1);

    return MAX_BURRITOS_PER_DAY - givenBurritos;
}

function burriotsRecieved(user) {

    var recievedFileName = subPath + user + '_recieved.txt';
    var hasFileRecieved = fs.existsSync(recievedFileName);
    if (!hasFileRecieved) {
        fs.writeFileSync(recievedFileName, '');
        return 0;
    }

    var recievedBurritos = fs.readFileSync(recievedFileName, 'utf8');
    recievedBurritos = (recievedBurritos.split(",").length - 1);

    return recievedBurritos;
}

function burritosInMention(str) {

    var burritoCount = 0;
    var arr = str.split(" ");
    for(var i = 0 ; i < arr.length; i++){
        if(arr[i] === ':burrito:'){
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

function isFileOlderThan6Hrs(user) {

    var givenFileName = subPath + user + '_given.txt';
    var hasFileGiven = fs.existsSync(givenFileName);
    if (!hasFileGiven) {
        return;
    }

    var stat = fs.statSync(givenFileName);
    var endTime, now;

    now = new Date().getTime();
    endTime = new Date(stat.ctime).getTime() + (8 * 60 * 60 * 1000); // 8 hours
    if (now > endTime) {
        fs.unlinkSync(givenFileName);
    }
}

slack.on('message', payload => {

    if (payload.event.text && payload.event.text.indexOf(':burrito:') > 0) {

    console.log(payload);

    var usersGivenBurritos = getAllUsersInStr(payload.event.text);
    var burritosGiven = burritosInMention(payload.event.text);
    var burritosToDistribute = (usersGivenBurritos.length - 1) * (burritosGiven.length - 1);
    var giveFailed = false;

    if (burritosToDistribute > burritosRemainingPerDay(payload.event.user)) {

        slack.send({ token: BOT_TOKEN, text: 'You don\'t have enough burritos to give to everyone.', channel: payload.event.user, as_user: false, username: 'Hola Burrito' }).then(res => {}).catch(console.error);
        return;
    }

    for (var i = 0; i < usersGivenBurritos.length; i++) {

        var userGivenBurrito = usersGivenBurritos[i];

        if (!userGivenBurrito) {
            giveFailed = true;
            break;
        }

        if (payload.event.user === userGivenBurrito) {
            slack.send({ token: BOT_TOKEN, text: 'You cannot give yourself a burrito.', channel: payload.event.user, as_user: false, username: 'Hola Burrito' }).then(res => {}).catch(console.error);
            giveFailed = true;
            break;
        }

        if (burritosRemainingPerDay(payload.event.user) <= 0) {
            slack.send({ token: BOT_TOKEN, text: 'You are out of burritos to give today.', channel: payload.event.user, as_user: false, username: 'Hola Burrito' }).then(res => {}).catch(console.error);
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

    slack.send({ token: BOT_TOKEN, text: 'Hola, you gave ' + burritosGiven + ' burrito(s) to <@' + userGivenBurrito + '>. You have ' + burritosRemainingPerDay(payload.event.user) + ' burritos left to give today.', channel: payload.event.user, as_user: false, username: 'Hola Burrito' }).then(res => {}).catch(console.error);

    slack.send({ token: BOT_TOKEN, text: 'Hola, you recieved a burrito from <@' + payload.event.user + '>. Overall you have ' + burriotsRecieved(userGivenBurrito) + ' burritos.', channel: '@' + userGivenBurrito, as_user: false, username: 'Hola Burrito' }).then(res => {}).catch(console.error);
}
});

slack.on('/burritostats', payload => {

    var requester = payload.user_id;
var burritosLeft = burritosRemainingPerDay(requester);
var totalBurritosRecieved = burriotsRecieved(requester);

slack.send({ token: BOT_TOKEN, text: 'You have ' + burritosLeft + ' burritos left to give today. You have recieved ' + totalBurritosRecieved + ' burrito(s).', channel: requester, as_user: false, username: 'Hola Burrito' }).then(res => {}).catch(console.error);
});


// incoming http requests
slack.listen(PORT);
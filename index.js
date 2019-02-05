require('dotenv').config();
const ts = require('tinyspeck'),
	  fs = require('fs');
      PORT = process.env.PORT || 8080,
	  BOT_TOKEN = process.env.BOT_TOKEN,
	  TOKEN = process.env.TOKEN,
	  REQUEST_URL =  process.env.REQUEST_URL,
	  MAX_BURRITOS_PER_DAY = process.env.MAX_BURRITOS_PER_DAY,
      users = {};
	  
// setting defaults for all Slack API calls
let slack = ts.instance({ token: BOT_TOKEN });

// fs.writeFile('burritosPerDay.txt', '');
// fs.writeFile('burritosRecieved.txt', '');

function burritoGiven(fromUser, toUser) {
	
	console.log(fromUser + "  " + toUser);
	var recievedFileName = toUser + '_recieved.txt';
	var givenFileName = fromUser + '_given.txt';
	
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
};

slack.on('message', payload => {
  
  if (payload.event.text && payload.event.text.indexOf(':burrito:') > 0) {
	  
	  var userGivenBurrito = payload.event.text.match(/<(.*)>/);
	  console.log(userGivenBurrito[1]);
	  console.log(payload.event.user);
	  
	  slack.send({ token: BOT_TOKEN, text: 'Hola, you gave a burrito to ' + userGivenBurrito[0], channel: payload.event.user, as_user: false, username: 'Hola Burrito' }).then(res => {
		  console.log( 'Successfully answered the command' );
	  }).catch(console.error);
	  
	  slack.send({ token: BOT_TOKEN, text: 'Hola, you recieved a burrito from <@' + payload.event.user + '>', channel: userGivenBurrito[1], as_user: false, username: 'Hola Burrito' }).then(res => {
		  burritoGiven(payload.event.user, userGivenBurrito[1].replace('@', ''));
		  console.log( 'Successfully answered the command' );
	  }).catch(console.error);
  }
});

slack.on('/burritostats', payload => {
	console.log('Something goes here: ' + payload);
});


// incoming http requests
slack.listen(PORT);
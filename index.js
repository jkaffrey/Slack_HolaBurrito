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

function burritosRemainingPerDay(user) {
	
	var givenFileName = user + '_given.txt';
	
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
	
	var recievedFileName = user + '_recieved.txt';
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
		
		var userGivenBurrito = arr[i].match(/<(.*)>/);
		console.log(userGivenBurrito);
		if (userGivenBurrito && userGivenBurrito[1]) {
			
			outputUsers.push(userGivenBurrito[1]);
		}
	}
	
	return outputUsers;
}

slack.on('message', payload => {
  
  if (payload.event.text && payload.event.text.indexOf(':burrito:') > 0) {
	  
	  var userGivenBurrito = payload.event.text.match(/<(.*)>/);
	  // console.log(userGivenBurrito[1]);
	  // console.log(payload.event.user);
	  console.log(getAllUsersInStr(payload.event.text));
	  
	  if (payload.event.user === userGivenBurrito[1].replace('@', '')) {
		  slack.send({ token: BOT_TOKEN, text: 'You cannot give yourself a burrito.', channel: payload.event.user, as_user: false, username: 'Hola Burrito' }).then(res => {
		  //console.log( 'Successfully answered the command' );
		  }).catch(console.error);
		  return;
	  }
	  
	  if (burritosRemainingPerDay(payload.event.user) <= 0) {
		  slack.send({ token: BOT_TOKEN, text: 'You are out of burritos to give today.', channel: payload.event.user, as_user: false, username: 'Hola Burrito' }).then(res => {
		  //console.log( 'Successfully answered the command' );
		  }).catch(console.error);
		  return;
	  }
	  
	  burritoGiven(payload.event.user, userGivenBurrito[1].replace('@', ''));
	  
	  slack.send({ token: BOT_TOKEN, text: 'Hola, you gave a burrito to ' + userGivenBurrito[0] + '. You have ' + burritosRemainingPerDay(payload.event.user) + ' burritos left to give today.', channel: payload.event.user, as_user: false, username: 'Hola Burrito' }).then(res => {
		  //console.log( 'Successfully answered the command' );
	  }).catch(console.error);
	  
	  slack.send({ token: BOT_TOKEN, text: 'Hola, you recieved a burrito from <@' + payload.event.user + '>. Overall you have ' + burriotsRecieved(userGivenBurrito[1]) + ' burritos.', channel: userGivenBurrito[1], as_user: false, username: 'Hola Burrito' }).then(res => {
		 // console.log( 'Successfully answered the command' );
	  }).catch(console.error);
  }
});

slack.on('/burritostats', payload => {
	
	var requester = payload.user_id;
	var burritosLeft = burritosRemainingPerDay(requester);
	var totalBurritosRecieved = burriotsRecieved(requester);
	
	slack.send({ token: BOT_TOKEN, text: 'You have ' + burritosLeft + ' burritos left to give today. You have recieved ' + totalBurritosRecieved, channel: requester, as_user: false, username: 'Hola Burrito' }).then(res => {
		  //console.log( 'Successfully answered the command' );
	  }).catch(console.error);
});


// incoming http requests
slack.listen(PORT);
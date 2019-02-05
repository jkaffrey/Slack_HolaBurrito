require('dotenv').config();
const ts = require('tinyspeck'),
      PORT = process.env.PORT || 8080,
	  BOT_TOKEN = process.env.BOT_TOKEN,
	  TOKEN = process.env.TOKEN,
	  REQUEST_URL =  process.env.REQUEST_URL,
      users = {};

// setting defaults for all Slack API calls
let slack = ts.instance({ token: TOKEN });

// event handler
//'reaction_added', 'message', 'message.channels'
slack.on('reaction_added', 'message', payload => {
  //let {type, user, item} = payload.event;
  //let message = 'Hello';
  
  console.log("Testing against");
  console.log(payload.event.type);
  console.log(payload);
  
  if (payload.event.reaction === 'burrito') {
	  
	  console.log('inside');
	  
	  var message = {
		  channel: payload.event.item.channel,
		  token: TOKEN,
		  text: 'You gave <@' + payload.event.user + '> a burrito'
	  }
	  
	  slack.send(REQUEST_URL, { text: 'Hello you gave a burrito to ' }).then(res => {
		  console.log( 'Successfully answered the command' );
	  }).catch(console.error);
  } else if (payload.event.text && payload.event.text.indexOf(':burrito:') > 0) {
	  
	  var userGivenBurrito = payload.event.text.match(/<(.*)>/);
	  console.log(userGivenBurrito[1]);
	  console.log(payload.event.user);
	  
	  slack.send({ token: BOT_TOKEN, text: 'Hola, you gave a burrito to ' + userGivenBurrito[0], channel: payload.event.user, as_user: false, username: 'Hola Burrito' }).then(res => {
		  console.log( 'Successfully answered the command' );
	  }).catch(console.error);
	  
	  slack.send({ token: BOT_TOKEN, text: 'Hola, you recieved a burrito from <@' + payload.event.user + '>', channel: userGivenBurrito[1], as_user: false, username: 'Hola Burrito' }).then(res => {
		  console.log( 'Successfully answered the command' );
	  }).catch(console.error);
  }
});

slack.on('/burritostats', payload => {
	console.log('Something goes here');
});


// incoming http requests
slack.listen(PORT);
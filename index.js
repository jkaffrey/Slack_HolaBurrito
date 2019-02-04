require('dotenv').config();
const ts = require('tinyspeck'),
      PORT = process.env.PORT || 8080,
	  TOKEN = process.env.TOKEN,
      users = {};

	  console.log(TOKEN);

// setting defaults for all Slack API calls
let slack = ts.instance({ token: TOKEN });

// event handler
slack.on('reaction_added', 'message.groups', 'message.channels', payload => {
  //let {type, user, item} = payload.event;
  //let message = 'Hello';
  
  console.log("Testing against");
  console.log(payload.event.reaction);
  
  if (payload.event.reaction === 'burrito') {
	  
	  console.log('inside');
	  
	  var message = {
		  channel: payload.event.item.channel,
		  token: TOKEN,
		  text: 'You gave <@' + payload.event.user + '> a burrito'
	  }
	  
	  slack.send('https://hooks.slack.com/services/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', { channel : payload.event.user, text: 'Hello you gave a burrito' }).then(res => {
		  console.log( 'Successfully answered the command' );
	  }).catch(console.error);
  }
  
  // save the message and update the timestamp
  // slack.send(message).then(res => {
    //let {ts, channel} = res.data;
    //users[user] = Object.assign({}, message, { ts: ts, channel: channel });
  // });
});


// incoming http requests
slack.listen(PORT);
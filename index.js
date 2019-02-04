require('dotenv').config();
const ts = require('tinyspeck'),
      PORT = process.env.PORT || 8080,
	  TOKEN = process.env.TOKEN,
      users = {};

	  console.log(TOKEN);

// setting defaults for all Slack API calls
let slack = ts.instance({ token: TOKEN });

// event handler
slack.on('star_added', payload => {
  let {type, user, item} = payload.event;
  let message = 'Hello';
  
  console.log(payload);
  
  // save the message and update the timestamp
  slack.send(message).then(res => {
    let {ts, channel} = res.data;
    users[user] = Object.assign({}, message, { ts: ts, channel: channel });
  });
});


// incoming http requests
slack.listen(PORT);
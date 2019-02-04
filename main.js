const ts = require('tinyspeck'),
      {PORT, TOKEN} = process.env,
      users = {};


// setting defaults for all Slack API calls
let slack = ts.instance({ token: TOKEN });

// event handler
slack.on('star_added', 'pin_added', 'reaction_added', payload => {
  let {type, user, item} = payload.event;
  let message = 'Hello';
  
  // save the message and update the timestamp
  slack.send(message).then(res => {
    let {ts, channel} = res.data;
    users[user] = Object.assign({}, message, { ts: ts, channel: channel });
  });
});


// incoming http requests
slack.listen();
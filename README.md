Hola Burrito

Setup Slack Custom App

Gather the following

Setup Heroku

* BOT_TOKEN=xxx
* SLACK_SIGNING_SECRET=xxx
* MONGODB_USER=holaBurrito
* MONGODB_PASS=xxx
* MONGODB_URI=YOURMONGOPREFIX.kxxky.mongodb.net/THEDEBNAME?retryWrites=true&w=majority
* MAX_BURRITOS_PER_DAY=7

Add them to your Heroku Config Vars



Setup Slack

Get Heroku URL: https://holaburrito.herokuapp.com/
In Slack Goto > System and Administration > Manage Apps
Click *Build* in top right corner
Click *Create New App*

Bot User OAuth Access Token - Get from OAuth & Permissions Page - Install App to see this
Slack Signing Secret - Get from Basic Information Page

Basic Information -> Name your bot

Event Subscriptions -> Enable Events
* Request URL - https://holaburrito.herokuapp.com/slack/events

Event Subscriptions -> Subscribe to bot events
* app_mention
* emoji_changed
* message.channels
* message.groups
* message.im
* message.mpim
* reaction_added
* reaction_removed

Event Subscriptions -> Subscribe to events on behalf of users
* None

OAuth & Permissions -> Scopes
* app_mentions:read
* channels:history
* chat:write
* chat:write:public
* commands
* emoji:read
* groups:history
* im:history
* mpim:history
* reactions:read
* users:read

OAuth & Permissions -> User Token Scopes
* channels:history
* chat:write
* im:history

Slash Commands
* /burritoboard -> https://holaburrito.herokuapp.com/slack/events
* /burritocannonbuy -> https://holaburrito.herokuapp.com/slack/events
* /burritostats -> https://holaburrito.herokuapp.com/slack/events

You will need to have the heroku server running in order to setup the *Event Subscriptions* section.

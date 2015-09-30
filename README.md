# dale
Dale Slack Bot

# Setup
* `npm install`
* add the `SLACKBOT_TOKEN` environment variable on your system (log into Heroku, access nameless-mountain-4460, access settings, and view Config Variables)

# Contributing
1. `heroku login` user: chicago.prestige.world.wide@gmail.com password: ask
2. `heroku git:clone -a nameless-mountain-4460`
3. Set up git remote to PWW github dale repo
4. Make modifications
5. Create a PR to PWW github dale repo
6. Merge PR
7. `git checkout master`
8. `git pull <pww-github-dale-repo> master`
9. `git push heroku master`

# Dale scripts
* Create new `.js` script under `dale/`
* Pass your `.js` script into a local variable in `dale/main.js` using `require('./<your-script>.js')`
* If your script requires access to the SlackBot instance, pass the `slack` instance into your script's local variable in `dale/main.js`

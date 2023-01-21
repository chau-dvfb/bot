require("events").EventEmitter.defaultMaxListeners = 0;
require('dotenv').config();
const moment = require("moment");
moment.locale('vi');
const facebook = require('./facebook');
const {env: {COOKIE, USER_AGENT}} = process;

const addLog = (msg) => {
  console.log(moment().format('YYYY/MM/DD HH:mm:ss') + ': ' + msg);
};

const reaction = {
  cookie: COOKIE,
  userAgent: USER_AGENT,
  user_id: '',
  dtsg: '',
  reaction_type: ['like', 'love', 'care'],
  reaction_group: true,
  reaction_page: true,
  min_delay: 60 * 4,
  max_delay: 60 * 6,
  stories: []
};

const doReaction = async (reaction, queueIndex) => {
  addLog(`Script running (${queueIndex})...`);
  try {
    if (!reaction.dtsg) {
      addLog('Getting user info...');
      let userInfo = await facebook.getUserInfo(reaction);
      if (userInfo) {
        let {dtsg, user_id} = userInfo;
        reaction.dtsg = dtsg;
        reaction.user_id = user_id;
      } else {
        // Cannot get user info
        addLog(`Reaction stopped due to cannot get info from cookie!`);
        return false;
      }
    }

    if (reaction.stories.length === 0) {
      addLog('Fetching new stories...');
      reaction.stories = await facebook.getStories(reaction);
    }

    if (reaction.stories.length > 0) {
      let {post_id, owner_type, owner_id} = reaction.stories[0];
      let reactionResult = await facebook.reaction(post_id, reaction);
      if (reactionResult) {
        let {reaction_type, response_log} = reactionResult;
        // Reformat result

        let output;
        if (response_log.indexOf('for (;;)') === 0) {
          // response_log = response_log.substr(9, response_log.length);
          // let match = response_log.match(/code":"(.*)"}],"ajax_response_token/);
          // if (match) response_log = response_log.replace(match[1], '');
          output = 'Done';
        } else {
          output = 'Error';
        }
        console.log(`${output}: [owner: ${owner_type} - ${owner_id} - ${reaction_type}][https://fb.com/${post_id}]!`);
      } else {
        addLog(`Reaction failed!`);
      }
      reaction.stories.shift();
    } else {
      console.log('Stories is empty!');
    }

    queueIndex++;
    let queueDelay = Math.round(Math.random() * (reaction.max_delay - reaction.min_delay) + reaction.min_delay);
    let nextMin = Math.floor(queueDelay / 60);
    let nextSecond = queueDelay % 60;
    addLog(`Current stories count: ${reaction.stories.length}, Next queue in ${nextMin} min ${nextSecond} sec...`);
    setTimeout(() => doReaction(reaction, queueIndex), queueDelay * 1000);
  } catch (e) {
    console.error(e);
  }
};

addLog(`Queue started!`);
doReaction(reaction, 1).then(() => { });



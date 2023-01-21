const request = require('request');

const getUserInfo = (config) => {
  return new Promise((resolve) => {
    let options = {
      method: 'GET',
      url: 'https://m.facebook.com/',
      headers: {
        'cookie': config.cookie,
        'user-agent': config.userAgent
      },
      json: true
    };
    request(options,  (error, response, body) => {
      if (error) {
        console.error(error);
        return resolve(false);
      } else {
        let dtsgMatch = body.match(/<input type="hidden" name="fb_dtsg" value="([a-zA-Z0-9-:_]+)" autocomplete="off" \/>/);
        let idMatch = body.match(/<input type="hidden" name="target" value="([0-9]+)" \/>/);
        if (dtsgMatch && idMatch) {
          return resolve({dtsg: dtsgMatch[1], user_id: idMatch[1]});
        } else {
          if (body.match(/MCheckpointLoggedInBlockingController/)) {
            console.log(`${config.user_id} is blocked!`);
          } else {
            console.log(body);
          }
          return resolve(false);
        }
      }
    });

  })
};

const getStories = (config) => {
  return new Promise((resolve, reject) => {
    let options = {
      method: 'POST',
      url: 'https://m.facebook.com/stories.php',
      headers: {
        'cookie': config.cookie,
        'user-agent': config.userAgent
      },
      formData: {
        fb_dtsg: config.dtsg,
        __ajax__: '',
      },
      json: true
    };
    request(options,  (error, response, body) => {
      if (error) {
        console.error(error);
        return reject(error);
      } else {
        try {
          let allHtml = '';
          let result = [];
          // Create a temp array to contain pushed post_id to filter duplicate
          let pushedIds = [];
          // Get links from payload 0 only
          try {
            body = body.replace('for (;;);', '');
            let bodyJson = JSON.parse(body);

            allHtml = '';
            bodyJson['payload'].actions.forEach(row => {
              allHtml += row['html'];
            });
          } catch (e) {
            allHtml = body;
          }

          let allLinks = allHtml.match(/<a href="(\/a\/like\.php\?[a-zA-Z0-9=&;%-_]+)">(Like|Thích)<\/a>/g);
          if (allLinks) {
            allLinks.forEach(link => {
              let idMatch = link.match(/ft_ent_identifier=([0-9]+)/);
              let ownerMatch = link.match(/content_owner_id_new\.([0-9]+)/);
              let pageMatch = link.match(/page_id\.([0-9]+)/);
              let groupMatch = link.match(/group_id\.([0-9]+)/);

              if (idMatch && !pushedIds.includes(idMatch[1])) {
                if (ownerMatch) {
                  pushedIds.push(idMatch[1]);
                  result.push({
                    post_id: idMatch[1],
                    owner_id: ownerMatch[1],
                    owner_type: 'user'
                  });
                } else if (config.reaction_group && pageMatch) {
                  pushedIds.push(idMatch[1]);
                  result.push({
                    post_id: idMatch[1],
                    owner_id: pageMatch[1],
                    owner_type: 'group'
                  });
                } else if (config.reaction_page && groupMatch) {
                  pushedIds.push(idMatch[1]);
                  result.push({
                    post_id: idMatch[1],
                    owner_id: groupMatch[1],
                    owner_type: 'page'
                  });
                }
              }
            })
          }
          return resolve(result);
        } catch (e) {
          console.error(e);
          return reject('Error parsing json!');
        }
      }
    });

  })
};

const reaction = (post_id, config) => {
  return new Promise((resolve) => {
    let listReactionTypes = {
      like: 1,
      love: 2,
      wow: 3,
      haha: 4,
      sad: 7,
      angry: 8,
      care: 16
    };

    let reactionType = '', selectedReaction = config.reaction_type;

    // string: single reaction
    if (typeof config.reaction_type === 'string') {
      reactionType = listReactionTypes[config.reaction_type.toLowerCase()];
    } else if (config.reaction_type === 'random') {
      // random: random in all reaction
      let keys = Object.keys(listReactionTypes);
      selectedReaction = keys[ keys.length * Math.random() << 0];
      reactionType = listReactionTypes[selectedReaction];
    } else {
      // array, pick random one reaction in that array
      selectedReaction = config.reaction_type[Math.floor(Math.random() * config.reaction_type.length)];
      reactionType = listReactionTypes[selectedReaction];
    }

    if (!reactionType) {
      console.error('Cannot get reaction type!');
      return resolve(false);
    }

    let options = {
      method: 'POST',
      url: 'https://m.facebook.com/ufi/reaction/',
      headers: {
        'cookie': config.cookie,
        'user-agent': config.userAgent,
        referer: 'https://m.facebook.com/'
      },
      qs: {
        ft_ent_identifier: post_id,
        story_render_location: 'feed_mobile',
        feedback_source: '1',
        is_sponsored: 0,
        __tn__: '>*W-R',
        ext: Math.floor((0 + new Date()) / 1000),
        hash: 'AeQsZwejIernXY02',
        av: config.user_id,
        client_id: '1592883686189:2818774366',
        session_id: '12139037-1000-4250-906f-a4582d678fa1',
      },
      formData: {
        reaction_type: reactionType,
        ft_ent_identifier: post_id,
        m_sess: '',
        fb_dtsg: config.dtsg,
        __dyn: '1KQEGiFoO13DzUjxC2GfGh0BBBgS5UqxKcyoaU98nw_K363u2W3q327HzE24xm6Uhx61Mxm1qwqEhwaG3G0Joeoe852q3q5U2nweS787S78fEeE7ifw5KzHzo5jwp84a1Pwk888C0NE6C2Wq2a4U2IzUuxy0wU6i0DU985G0zE',
        __csr: '',
        __req: '5',
        __a: 'AYlzIOslfavaBIpxNuQzRNlFTn0sOIUv3qGqoSTdC1IY7oRv-yDPmCrft-3vHvfPLSToh6AVo8kBs5AwxklybsiaFL2XUjBizxDh_pfpavuA7w',
        __user: config.user_id,
        // jazoest: 21992
      }
    };

    request(options,  (error, response, body) => {
      if (error) {
        console.error(error);
        return resolve(false);
      } else {
        if (body.match(/static_templates/)) {
          return resolve({reaction_type: selectedReaction, response_log: body});
        } else {
          console.log(body);
          return resolve(false);
        }
      }
    });
  })
};

module.exports = {
  getUserInfo,
  getStories,
  reaction
};
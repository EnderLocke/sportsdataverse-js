import axios from 'axios';
import cheerio from 'cheerio';
import puppeteer from 'puppeteer';

/**
 * Operations for College Football.
 *
 * @namespace cfb
 */

async function autoScroll(page, targetRowCount = 250) {
    await page.evaluate(async (targetRowCount) => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            let attempts = 0;
            const maxAttempts = 20;

            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;

                // Use the specific selector for rows in the table
                const rows = document.querySelectorAll('table tbody tr');
                
                if (rows.length >= targetRowCount || attempts >= maxAttempts) {
                    clearInterval(timer);
                    resolve();
                } else if (totalHeight >= document.body.scrollHeight) {
                    // Increment attempts if we hit the current bottom without loading new content
                    attempts += 1;
                }
            }, 500); // Adjust this delay as needed
        });
    }, targetRowCount);
}

async function fetchRankingsData({
    baseUrl, 
    axiosConfig, 
    service
}) {
    let content;

    if (service.toLowerCase() === 'rivals') {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(baseUrl, { waitUntil: 'networkidle2' });

        // Scroll until all rows are loaded based on the selector
        await autoScroll(page);

        content = await page.content(); // Get the fully rendered page content
        await browser.close();
    } else {
        const res = await axios.get(baseUrl, axiosConfig);
        content = res.data;
    }

    return content;
}

export default {
    /**
     * Gets the College Football game play-by-play data for a specified game.
     * @memberOf cfb
     * @async
     * @function
     * @param {number} id - Game id.
     * @returns json
     * @example
     * const result = await sdv.cfb.getPlayByPlay(401256194);
     */
    getPlayByPlay: async function (id) {
        const baseUrl = 'http://cdn.espn.com/core/college-football/playbyplay';
        const params = {
            gameId: id,
            xhr: 1,
            render: 'false',
            userab: 18
        };

        const res = await axios.get(baseUrl, {
            params
        });

        return {
            teams: res.data.gamepackageJSON.header.competitions[0].competitors,
            id: res.data.gameId,
            drives: res.data.gamepackageJSON.drives,
            competitions: res.data.gamepackageJSON.header.competitions,
            season: res.data.gamepackageJSON.header.season,
            week: res.data.gamepackageJSON.header.week,
            boxScore: res.data.gamepackageJSON.boxscore,
            scoringPlays: res.data.gamepackageJSON.scoringPlays,
            standings: res.data.gamepackageJSON.standings
        };
    },
    /**
     * Gets the College Football game box score data for a specified game.
     * @memberOf cfb
     * @async
     * @function
     * @param {number} id - Game id.
     * @returns json
     * @example
     * const result = await sdv.cfb.getBoxScore(401256194);
     */
    getBoxScore: async function (id) {
        const baseUrl = 'http://cdn.espn.com/core/college-football/boxscore';
        const params = {
            gameId: id,
            xhr: 1,
            render: false,
            device: 'desktop',
            userab: 18
        };

        const res = await axios.get(baseUrl, {
            params
        });

        const game = res.data.gamepackageJSON.boxscore;
        game.id = res.data.gameId;

        return game;
    },
    /**
     * Gets the College Football game summary data for a specified game.
     * @memberOf cfb
     * @async
     * @function
     * @param {number} id - Game id.
     * @returns json
     * @example
     * const result = await sdv.cfb.getSummary(401256194);
     */
    getSummary: async function (id) {
        const baseUrl = 'http://site.api.espn.com/apis/site/v2/sports/football/college-football/summary';
        const params = {
            event: id
        };

        const res = await axios.get(baseUrl, {
            params
        });

        return {
            id: parseInt(res.data.header.id),
            boxScore: res.data.boxscore,
            gameInfo: res.data.gameInfo,
            drives: res.data.drives,
            leaders: res.data.leaders,
            header: res.data.header,
            teams: res.data.header.competitions[0].competitors,
            scoringPlays: res.data.scoringPlays,
            winProbability: res.data.winprobability,
            leaders: res.data.leaders,
            competitions: res.data.header.competitions,
            season: res.data.header.season,
            week: res.data.header.week,
            standings: res.data.standings
        };
    },
    /**
     * Gets the College Football PickCenter data for a specified game.
     * @memberOf cfb
     * @async
     * @function
     * @param {number} id - Game id.
     * @returns json
     * @example
     * const result = await sdv.cfb.getPicks(401256194);
     */
    getPicks: async function (id) {
        const baseUrl = 'http://site.api.espn.com/apis/site/v2/sports/football/college-football/summary';
        const params = {
            event: id
        };

        const res = await axios.get(baseUrl, {
            params
        });

        return {
            id: parseInt(res.data.header.id),
            gameInfo: res.data.gameInfo,
            leaders: res.data.leaders,
            header: res.data.header,
            teams: res.data.header.competitions[0].competitors,
            competitions: res.data.header.competitions,
            winProbability: res.data.winprobability,
            pickcenter: res.data.winprobability,
            againstTheSpread: res.data.againstTheSpread,
            odds: res.data.odds,
            season: res.data.header.season,
            week: res.data.header.week,
            standings: res.data.standings
        };
    },
    
    /**
     * Gets the College Football Player recruiting data for a specified year, page, position, state, recruiting service and institution type if available.
     * Please note that espn data does not currently have stars data being returned as it is not available wthin
     * their api
     * @memberOf cfb
     * @async
     * @function
     * @param {*} year - Year (YYYY)
     * @param {number} page - Page (50 per page) does not work with rivals
     * @param {"HighSchool"|"JuniorCollege"|"PrepSchool"} group - Institution Type, 247 only
     * @param {"247Composite"|"247"|"Rivals"|"ESPN"|"On3"|"On3Composite"} service - Ranking Service Type (On3Composite may be bugged)
     * @param {string} state - State of recruit only used with 247
     * @returns json
     * @example
     * const result = await sdv.cfb.getPlayerRankings({year: 2016, service: "247"});
     */
    getPlayerRankings: async function ({
        year,
        page = 1,
        group = "HighSchool",
        position = null,
        state = null,
        service = "247Composite"
    }) {
        let params;
        let baseUrl;
        const axiosConfig = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36'
            }
        };
    
        if (service === '247Composite') {
            baseUrl = `http://247sports.com/Season/${year}-Football/CompositeRecruitRankings`;
            params = {
                InstitutionGroup: group,
                Page: page,
                Position: position,
                State: state
            };
        } else if (service === '247') {
            baseUrl = `http://247sports.com/Season/${year}-Football/recruitrankings`;
            params = {
                InstitutionGroup: group,
                Page: page,
                Position: position,
                State: state
            };
        }  else if (service === 'Rivals') {
            baseUrl = `https://n.rivals.com/prospect_rankings/rivals250/${year}`;
        } else if (service === 'On3') {
            baseUrl = `https://www.on3.com/db/rankings/player/football/${year}/`;
        } else if ( service == 'On3Composite') {
            baseUrl = `https://www.on3.com/db/rankings/industry-player/football/${year}/`
        } else if (service === 'ESPN') {
            baseUrl = `https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/recruiting/${year}/athletes?page=${page}`;
            params = {
                lang: 'en',
                region: 'us'
            };
        } else {
            throw new Error("Invalid rankings type");
        }
        
        if (params && Object.keys(params).length > 0) {
            axiosConfig.params = params;
        }
    
        const htmlResponse = await fetchRankingsData({
            baseUrl: baseUrl,
            axiosConfig: axiosConfig,
            service: service
        });
        if (service.toLowerCase() !== 'espn') {
            let $ = cheerio.load(htmlResponse);
        }
        let players = [];
    
        if (service.toLowerCase() === '247' || service.toLowerCase() === '247composite') {
            // Couldn't grab the rank correctly with JQuery so it's manually calculated
            let rank = 1 + 50 * (page - 1);
    
            $('ul.rankings-page__list > li.rankings-page__list-item:not(.rankings-page__list-item--header)').each(function (index) {
                let html = $(this);
    
                let metrics = html.find('.metrics').text().split('/');
                let player = {
                    ranking: rank, //parseInt(html.find('.rank-column .primary').text().trim().split(' ')[0], 10),
                    name: html.find('.rankings-page__name-link').text().trim(),
                    highSchool: html.find('span.meta').text().trim(),
                    position: html.find('.position').text().trim(),
                    height: metrics[0].trim(),
                    weight: metrics[1] && !isNaN(parseInt(metrics[1].trim(), 10)) 
                    ? parseInt(metrics[1].trim(), 10) 
                    : 0,
                    stars: html.find('.rankings-page__star-and-score > .yellow').length,
                    rating: parseFloat(html.find('.score').text().trim().trim()),
                    college: html.find('.img-link > img').attr('title') || 'uncommitted'
                };
    
                players.push(player);
                rank++;
            });
    
        } else if (service.toLowerCase() === 'rivals') {
            $('div.scrollable-table-container table > tbody > tr').each(function (index) {
                let html = $(this);
                const parts =  html.find('span.pos').text().trim().split('\n\n');
                const position = parts[0];
                const weight = parts[parts.length - 1];
    
                let player = {
                    ranking: html.find('span.ordinality').text().trim(),
                    name: html.find('div.first-name').text().trim() + ' ' + html.find('div.last-name').text().trim() ,
                    highSchool: html.find('div.break-text').text().trim().replace('\n\n', ' '),
                    position: position,
                    height: html.find('span.height').text().trim(),
                    weight: weight,
                    stars: html.find('rv-stars i.star-on').length,
                    rating: html.find('.score').text().trim().trim(),
                    college: html.find('div.school-name').text().trim().split('\n')[0]
                }; 
                
                players.push(player);
            });
    
        } else if ( service.toLowerCase() === 'on3' || service.toLowerCase() === 'on3composite') {
            $('section.PlayerRankings_playerRankings__7DK27 > div.PlayerRankingItem_playerRankingItem__P26jQ').each(function (index) {
                let html = $(this);
                let college;
    
                // Check if the element with the committed logo class exists
                if (html.find('img.PlayerRankingItem_committedLogo__w1QtO').length > 0) {
                    // Set title from the committed logo's title attribute
                    college = html.find('img.PlayerRankingItem_committedLogo__w1QtO').attr('title');
                } else if (html.find('div.PlayerRankingItem_prediction__LXknz').length > 0) {
                    // Set title as 'uncommitted' if the prediction class exists
                    college = 'uncommitted';
                } else {
                    // Default value if neither element is found
                    college = 'unknown';
                }
    
                let highSchool = html.find('a.PlayerRankingItem_highSchool__yTm5m').text().trim();
                let homeTown = html.find('span.PlayerRankingItem_homeTownName__C2R9c').text().trim();
    
                let player = {
                    ranking: html.find('p.PlayerRankingItem_overallRank__ttJJC').text().trim(),
                    name: html.find('div.PlayerRankingItem_name__Xrs6_').text().trim(),
                    highSchool: highSchool + ' ' + homeTown,
                    position: html.find('span.PlayerRankingItem_position__xH0rl').text().trim(),
                    height: html.find('span.PlayerRankingItem_height__zEWyC').text(),
                    weight: 0,
                    stars: html.find('span.StarRating_star__GR_Ff').find('span.MuiRating-iconFilled').length,
                    college: college,
                    rating: html.find('span.StarRating_overallRating__wz9dE').text().trim(),
                    nilValue: html.find('p.PlayerRankingItem_nilValuation__hzo42').text().trim()
                }; 
    
                players.push(player);
    
            });
    
        } else if (service.toLowerCase() === 'espn') {
            let allItems = htmlResponse.items;
            // calculating rank because it is not always available through history, 
            // will grab it if availbe if not will use calc
            let rank = 1 + 25 * (page - 1);
        
            for (const record of allItems) {
                const position = record.athlete.position.abbreviation;
                const type0Attribute = attributes.find(attr => attr.type === 0);
                const finalRank = type0Attribute ? type0Attribute.value : rank;

                let player = {
                    id: record.athlete.id,
                    alt_id: record.athlete.alternateId,
                    ranking: finalRank,
                    name: record.athlete.fullName,
                    highSchool: record.athlete.hometown.city + ', ' + record.athlete.hometown.stateAbbreviation ,
                    position: position,
                    height: record.athlete.height,
                    weight: record.athlete.weight,
                    stars: 0,
                    college: '',
                    rating: record.grade
                }; 
                
                players.push(player);
                rank++;
            }    
        }
    
        return players;
    },
    /**
     * Gets the College Football School recruiting data for a specified year and page if available.
     * @memberOf cfb
     * @async
     * @function
     * @param {*} year - Year (YYYY)
     * @param {number} page - Page (50 per page)
     * @returns json
     * @example
     * const result = await sdv.cfb.getSchoolRankings({year: 2016});
     */
    getSchoolRankings: async function (year, page = 1) {
        const baseUrl = `http://247sports.com/Season/${year}-Football/CompositeTeamRankings`;

        const res = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36'
            },
            params: {
                Page: page
            }
        });

        let $ = cheerio.load(res.data);
        let schools = [];

        $('.rankings-page__list-item').each(function (index) {
            let html = $(this);

            let school = {
                rank: html.find('.rank-column .primary').text().trim(),
                school: html.find('.rankings-page__name-link').text().trim(),
                totalCommits: html.find('.total a').text().trim(),
                fiveStars: $(html.find('ul.star-commits-list > li > div')[0]).text().replace('5: ', '').trim(),
                fourStars: $(html.find('ul.star-commits-list > li > div')[1]).text().replace('4: ', '').trim(),
                threeStars: $(html.find('ul.star-commits-list > li > div')[2]).text().replace('3: ', '').trim(),
                averageRating: html.find('.avg').text().trim(),
                points: html.find('.number').text().trim()
            };

            schools.push(school);
        });

        return schools;
    },
    /**
     * Gets the College Football School commitment data for a specified school and year.
     * @memberOf cfb
     * @async
     * @function
     * @param {*} year - Year (YYYY)
     * @param {string} school - School
     * @returns json
     * @example
     * const result = await sdv.cfb.getSchoolCommits({school: 'Florida State', year: 2021});
     */
    getSchoolCommits: async function (school, year) {
        const baseUrl = `http://${school}.247sports.com/Season/${year}-Football/Commits`;

        const res = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36'
            }
        });

        let $ = cheerio.load(res.data);

        let players = [];

        $('.ri-page__list-item').each(function (index) {
            let html = $(this);

            let metrics = html.find('.metrics').text().split('/');

            let player = {
                name: html.find('.ri-page__name-link').text().trim(),
                highSchool: html.find('span.meta').text().trim(),
                position: $(html.find('.position')).text().trim(),
                height: metrics[0],
                weight: metrics[1],
                stars: html.find('.ri-page__star-and-score .yellow').length,
                rating: html.find('span.score').clone().children().remove().end().text().trim(),
                nationalRank: html.find('.natrank').first().text().trim(),
                stateRank: html.find('.sttrank').first().text().trim(),
                positionRank: html.find('.posrank').first().text().trim()
            };

            players.push(player);
        });

        // Some empty player objects were being created.  This removes them
        const result = players.filter(
            player => player.name !== '' && player.rating !== ''
        );

        return result;
    },
    /**
     * Gets the CFB rankings data for a specified year and week if available.
     * @memberOf cfb
     * @async
     * @function
     * @param {*} year - Year (YYYY)
     * @param {*} week - Week
     * @returns json
     * @example
     * const result = await sdv.cfb.getRankings(year = 2020, week = 4)
     */
    getRankings: async function ({ year, week }) {
        const baseUrl = 'http://cdn.espn.com/core/college-football/rankings';
        const params = {};

        if (year) {
            params.year = year;
        }

        if (week) {
            params.week = week;
        }

        const res = await axios.get(baseUrl, {
            params
        });
        return res.data;
    },
    /**
     * Gets the College Football schedule data for a specified date if available.
     * @memberOf cfb
     * @async
     * @function
     * @param {*} year - Year (YYYY)
     * @param {*} month - Month (MM)
     * @param {*} day - Day (DD)
     * @param {number} group - Group is 80 for FBS, 81 for FCS
     * @param {number} seasontype - Pre-Season: 1, Regular Season: 2, Postseason: 3, Off-season: 4
     * @returns json
     * @example
     * const result = await sdv.cfb.getSchedule(year = 2019, month = 11, day = 16, group=80)
     */
    getSchedule: async function ({ year, month, day, groups = 80, seasontype = 2 }) {
        const baseUrl = `http://cdn.espn.com/core/college-football/schedule`;
        const params = {
            groups: groups,
            seasontype: seasontype,
            xhr: 1,
            render: false,
            device: 'desktop',
            userab: 18
        };
        if (year && month && day) {
            params.dates = `${year}${parseInt(month) <= 9 ? "0" + parseInt(month) : parseInt(month)}${parseInt(day) <= 9 ? "0" + parseInt(day) : parseInt(day)}`;
        }

        const res = await axios.get(baseUrl, {
            params
        });
        return res.data.content.schedule;
    },
    /**
     * Gets the College Football scoreboard data for a specified date if available.
     * @memberOf cfb
     * @async
     * @function
     * @param {*} year - Year (YYYY)
     * @param {*} month - Month (MM)
     * @param {*} day - Day (DD)
     * @param {number} group - Group is 80 for FBS, 81 for FCS
     * @param {number} seasontype - Pre-Season: 1, Regular Season: 2, Postseason: 3, Off-season: 4
     * @param {number} limit - Limit on the number of results @default 300
     * @returns json
     * @example
     * const result = await sdv.cfb.getScoreboard(
     * year = 2019, month = 11, day = 16, group=80
     * )
     */
    getScoreboard: async function ({ year, month, day, groups = 80, seasontype = 2, limit = 300 }) {

        const baseUrl = `http://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard`;
        const params = {
            groups: groups,
            seasontype,
            limit
        };
        if (year && month && day) {
            params.dates = `${year}${parseInt(month) <= 9 ? "0" + parseInt(month) : parseInt(month)}${parseInt(day) <= 9 ? "0" + parseInt(day) : parseInt(day)}`;
        }

        const res = await axios.get(baseUrl, {
            params
        });

        return res.data;
    },
    /**
     * Gets the list of all College Football conferences and their identification info for ESPN.
     * @memberOf cfb
     * @async
     * @function
     * @param {number} year - Season
     * @param {number} group - Group is 80 for FBS, 81 for FCS
     * @returns json
     * @example
     * const yr = 2021;
     * const result = await sdv.cfb.getConferences(year = yr, group = 80);
     */
    getConferences: async function ({ year = new Date().getFullYear(), group = 80 }) {
        const baseUrl = 'http://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard/conferences';

        const params = {
            season: year,
            group: group
        };
        const res = await axios.get(baseUrl, {
            params
        });
        return res.data;
    },
    /**
     * Gets the team standings for College Football.
     * @memberOf cfb
     * @async
     * @function
     * @param {number} year - Season
     * @param {number} group - Group is 80 for FBS, 81 for FCS
     * @returns json
     * @example
     * const yr = 2020;
     * const result = await sdv.cfb.getStandings(year = yr);
     */
    getStandings: async function ({ year = new Date().getFullYear(), group = 80 }) {
        const baseUrl = `https://site.web.api.espn.com/apis/v2/sports/football/college-football/standings`;
        const params = {
            region: 'us',
            lang: 'en',
            contentorigin: 'espn',
            season: year,
            group: group,
            type: 0,
            level: 1,
            sort: 'winpercent:desc,leaguewinpercent:desc,vsconf_winpercent:desc,' +
                'vsconf_gamesbehind:asc,vsconf_playoffseed:asc,wins:desc,' +
                'losses:desc,playoffseed:asc,alpha:asc'
        };
        const res = await axios.get(baseUrl, {
            params
        });
        return res.data;
    },
    /**
     * Gets the list of all College Football teams their identification info for ESPN.
     * @memberOf cfb
     * @async
     * @function
     * @param {number} group - Group is 80 for FBS, 81 for FCS
     * @returns json
     * @example
     * const result = await sdv.cfb.getTeamList(group=80);
     */
    getTeamList: async function ({ group = 80 }) {
        const baseUrl = 'http://site.api.espn.com/apis/site/v2/sports/football/college-football/teams';
        const params = {
            group,
            limit: 1000
        };

        const res = await axios.get(baseUrl, {
            params
        });

        return res.data;
    },
    /**
     * Gets the team info for a specific College Football team.
     * @memberOf cfb
     * @async
     * @function
     * @param {number} id - Team Id
     * @returns json
     * @example
     * const teamId = 52;
     * const result = await sdv.cfb.getTeamInfo(teamId);
     */
    getTeamInfo: async function (id) {
        const baseUrl = `http://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/${id}`;

        const res = await axios.get(baseUrl);
        return res.data;
    },
    /**
     * Gets the team roster information for a specific College Football team.
     * @memberOf cfb
     * @async
     * @function
     * @param {number} id - Team Id
     * @example
     * const teamId = 52;
     * const result = await sdv.cfb.getTeamPlayers(teamId);
     */
    getTeamPlayers: async function (id) {
        const baseUrl = `http://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/${id}`;
        const params = {
            enable: "roster"
        };

        const res = await axios.get(baseUrl, {
            params
        });

        return res.data;
    }
}



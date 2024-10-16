import axios from 'axios';
import core from '@actions/core';
import exec from '@actions/exec';
import fs, { promises as fsPromises } from 'fs';

const API_BASE_URL = 'https://server-7hzpew6hia-el.a.run.app';

function getStatType(statType) {
    switch (statType) {
        case '0':
            return 'languages';
        case '1':
            return 'categories';
        case '2':
            return 'editors';
        case '3':
            return 'os';
        default:
            return 'projects';
    }
}

async function deleteUnusedImgFiles(imgFolderPath, currentMapConfig) {
    const allImgFiles = await fsPromises.readdir(imgFolderPath);

    for (let imgFile of allImgFiles) {
        if (!currentMapConfig.has(imgFile)) {
            await fsPromises.unlink(`${imgFolderPath}/${imgFile}`);
        }
    }
}

async function performGitCommit(workspace) {
    const commitEmail = core.getInput('COMMIT_EMAIL');
    const githubToken = core.getInput('GH_TOKEN');
    const githubActor = core.getInput('GH_ACTOR');

    await exec.exec('git', ['config', '--global', 'user.name', githubActor]);
    await exec.exec('git', ['config', '--global', 'user.email', commitEmail]);
    await exec.exec('git', ['add', '.']);
    await exec.exec('git', [
        'commit',
        '-m',
        'Updated WakaTime metrics on README.md'
    ]);

    const repoPathArr = workspace.split('/');
    await exec.exec('git', [
        'push',
        `https://${
            process.env.GITHUB_ACTOR
        }:${githubToken}@github.com/${githubActor}/${
            repoPathArr[repoPathArr.length - 1]
        }.git`
    ]);
}

try {
    const wakaToken = core.getInput('WAKA_AUTH_TOKEN');
    const workspace = core.getInput('GH_WORKSPACE');
    const wakaUsername = core.getInput('WAKA_USERNAME');
    const mdFilePath = `${workspace}/README.md`;
    const imgFolderPath = `${workspace}/img`;

    if (!fs.existsSync(imgFolderPath)) {
        fs.mkdirSync(imgFolderPath, { recursive: true });
    }

    let mdContent = await fsPromises.readFile(mdFilePath, 'utf8');

    // Stats Controller
    const statConfigRegex = /<!-- WAKAWAKA_CONFIG__STATS_([A-Z_]+) -->/g;
    const statsConfigs = mdContent.match(statConfigRegex);

    for (let config of statsConfigs) {
        const regex = /<!-- WAKAWAKA_CONFIG__STATS_([A-Z_]+) -->/;

        const queryParams = config.match(regex);

        if (queryParams) {
            const statType = queryParams[1];
            console.log('LOG STAT TYPE:', statType);
            let endpoint;
            if (statType === 'BEST_DAY') {
                endpoint = 'best_day';
            } else {
                endpoint = 'daily_avg';
            }
            const apiUrl =
                `${API_BASE_URL}/stats/` +
                endpoint +
                `?username=aayushgoyalmps&token=waka_tok_rFmnvzThanjva4D6PjBG44VWooXEw8Wll4UEqPU6gZkyfrQsv4wk2Bs0Gk3qvO16ipDEcMNOLXzcqb2N&refresh_token=waka_ref_VOvP3fnTEVWriOn3jWMymkySNwalCInSmiHhffqRe35qtKjL75vrxgz5J1n97bymQWKHKqApY39b1nV9&uid=13fde520-c1e3-4c7c-b538-6905d8c3ea6a&token_type=bearer&expires_at=2025-10-05T12%3A42%3A31Z&expires_in=31536000&scope=read_heartbeats%2Cread_private_leaderboards%2Cread_goals`;
            console.log('LOG API URL:', apiUrl);
            try {
                const apiResponse = await axios.get(apiUrl);

                if (apiResponse.status !== 200) {
                    console.error(
                        'ERROR:',
                        'Some issue happened.',
                        apiResponse.data.message
                    );
                } else {
                    const shieldImg = apiResponse.data.data;
                    console.log('LOG IMG SHIELD:', shieldImg);
                    if (statType === 'BEST_DAY') {
                        mdContent.replace(
                            '<!-- WAKAWAKA_CONFIG__STATS_BEST_DAY -->',
                            '<!-- WAKAWAKA_CONFIG__STATS_BEST_DAY -->' +
                                '\n' +
                                shieldImg +
                                '\n'
                        );
                    } else {
                        mdContent.replace(
                            '<!-- WAKAWAKA_CONFIG__STATS_DAILY_AVG -->',
                            '<!-- WAKAWAKA_CONFIG__STATS_DAILY_AVG -->' +
                                '\n' +
                                shieldImg +
                                '\n'
                        );
                    }
                }
            } catch (error) {
                console.error('ERROR:', error.toString());
            }
        }
    }

    // Charts Controller
    const configRegex = /<!-- WAKAWAKA_CONFIG__ST=\d&CT=\d&DT=\d&R=\d -->/g;
    const configs = mdContent.match(configRegex);

    const currentMapConfig = new Map();

    for (let config of configs) {
        const regex =
            /<!-- WAKAWAKA_CONFIG__ST=(\d)&CT=(\d)&DT=(\d)&R=(\d) -->/;

        // Match the string against the regex and extract the captured groups
        const queryParams = config.match(regex);

        if (queryParams) {
            // Extracted digit values are in the matches array starting from index 1
            const statType = getStatType(queryParams[1]);
            const chartType = queryParams[2];
            const dataType = queryParams[3];
            const range = queryParams[4];

            const imgName = `img_${statType}_${chartType}_${dataType}_${range}.svg`;
            currentMapConfig.set(imgName, true);

            const apiResponse = await axios.get(
                `${API_BASE_URL}/charts/${statType}?username=${wakaUsername}&range=${range}&chart_type=${chartType}&data_type=${dataType}&token=${wakaToken}`
            );
            const chartSVG = apiResponse.data;

            const imgFilePath = `${imgFolderPath}/${imgName}`;
            await fsPromises.writeFile(imgFilePath, chartSVG);

            const configIndex = mdContent.indexOf(config);
            const imgTagIndex = configIndex + config.length;
            const imgStr = mdContent
                .substring(imgTagIndex, imgTagIndex + 5)
                .trim();

            if (imgStr === '<img') {
                const lineBreakIndex = mdContent
                    .substring(imgTagIndex + 1)
                    .indexOf('\n');
                const existingImgTag = mdContent.substring(
                    imgTagIndex,
                    imgTagIndex + lineBreakIndex + 1
                );

                mdContent = mdContent.replace(
                    existingImgTag,
                    '\n' + `<img src="./img/${imgName}" alt="WakaTime chart" />`
                );
            } else {
                mdContent = mdContent.replace(
                    config,
                    config +
                        '\n' +
                        `<img src="./img/${imgName}" alt="WakaTime chart" />`
                );
            }
        } else {
            console.error(`No query params provided in ${config}`);
        }
    }

    await fsPromises.writeFile(mdFilePath, mdContent);

    await deleteUnusedImgFiles(imgFolderPath, currentMapConfig);
    await performGitCommit(workspace);
} catch (error) {
    core.setFailed(error.message);
}

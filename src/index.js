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

try {
    const commitEmail = core.getInput('COMMIT_EMAIL');
    const githubToken = core.getInput('GH_TOKEN');
    const githubActor = core.getInput('GH_ACTOR');
    const wakaToken = core.getInput('WAKA_AUTH_TOKEN');
    const workspace = core.getInput('GH_WORKSPACE');
    const mdFilePath = `${workspace}/README.md`;
    const imgFolderPath = `${workspace}/img`;

    // Create `img` folder, if not exists already.
    if (!fs.existsSync(imgFolderPath)) {
        fs.mkdirSync(imgFolderPath, { recursive: true });
    }

    let mdContent = await fsPromises.readFile(mdFilePath, 'utf8');

    // const imgRegex = /<img src="([^"]*)" alt="WakaTime chart">/g;
    // const imgRegex = /<img\s+src="([^"]*)"\s+alt="([^"]*)"\s*\/?>/;
    const imgRegex =
        /<img\s+src="\.\/img\/img_languages_\d+_\d+_\d+\.svg"\s+alt="WakaTime chart"\s*\/?>/;
    // const regex2 =
    //     /<img src="\.\/img\/img_languages_\d_\d_\d\.svg" alt="WakaTime chart" \/>/;

    const imgTagMatches = mdContent.match(imgRegex);

    const configRegex = /<!-- WAKAWAKA_CONFIG__ST=\d&CT=\d&DT=\d&R=\d -->/g;
    const configs = mdContent.match(configRegex);

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

            const apiResponse = await axios.get(
                `${API_BASE_URL}/charts/${statType}?range=${range}&chart_type=${chartType}&data_type=${dataType}&token=${wakaToken}`
            );
            const chartSVG = apiResponse.data;

            const imgFilePath = `${imgFolderPath}/img_${statType}_${chartType}_${dataType}_${range}.svg`;
            await fsPromises.writeFile(imgFilePath, chartSVG);

            // console.log('LOG:', imgTagMatches);
            if (imgTagMatches) {
                // find img tag just after this config. find replace content
                const configIndex = mdContent.indexOf(config);
                const imgTagIndex = configIndex + config.length;
                const existingImgTag = mdContent.substring(
                    imgTagIndex,
                    imgTagIndex + imgTagMatches[0].length + 1
                );
                console.log('LOG:', existingImgTag);
                mdContent = mdContent.replace(
                    existingImgTag,
                    `<img src="./img/img_${statType}_${chartType}_${dataType}_${range}.svg" alt="WakaTime chart" />`
                );
            } else {
                mdContent = mdContent.replace(
                    config,
                    config +
                        '\n' +
                        `<img src="./img/img_${statType}_${chartType}_${dataType}_${range}.svg" alt="WakaTime chart" />`
                );
            }
        } else {
            console.log(`No query params provided in ${config}`);
        }
    }

    await fsPromises.writeFile(mdFilePath, mdContent);

    // Git Commit
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
} catch (error) {
    core.setFailed(error.message);
}

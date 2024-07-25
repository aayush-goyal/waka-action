import axios from 'axios';
import core from '@actions/core';
import { promises as fsPromises } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const API_BASE_URL = 'https://server-7hzpew6hia-el.a.run.app';
// const svgData = axios.get(`${API_BASE_URL}/`);

function getStatType(statType) {
    switch (statType) {
        case 0:
            return 'languages';
        case 1:
            return 'categories';
        case 2:
            return 'editors';
        case 3:
            return 'os';
        default:
            return 'projects';
    }
}

try {
    const githubToken = core.getInput('GH_TOKEN');
    const wakaToken = core.getInput('WAKA_AUTH_TOKEN');
    const workspace = core.getInput('GH_WORKSPACE');
    const mdFilePath = `${workspace}/README.md`;

    const mdContent = await fsPromises.readFile(mdFilePath, 'utf8');
    const configRegex = /<!-- WAKAWAKA_CONFIG__ST=\d&CT=\d&DT=\d&R=\d -->/g;
    const configs = mdContent.match(configRegex);

    for (let config of configs) {
        const regex =
            /<!-- WAKAWAKA_CONFIG__ST=(\d)&CT=(\d)&DT=(\d)&R=(\d) -->/;

        // Match the string against the regex and extract the captured groups
        const queryParams = config.match(regex);
        console.log('PARAMS: ', queryParams);

        if (queryParams) {
            // Extracted digit values are in the matches array starting from index 1
            const statType = getStatType(matches[1]);
            const chartType = matches[2];
            const dataType = matches[3];
            const range = matches[4];

            const chartSVG = await axios.get(
                `https://server-7hzpew6hia-el.a.run.app/charts/${statType}?range=${range}&chart_type=${chartType}&data_type=${dataType}&token=${wakaToken}`
            );

            console.log(
                `ST: ${statType}, CT: ${chartType}, DT: ${dataType}, R: ${range}`
            );

            console.log();

            console.log('SVG', chartSVG);
        } else {
            console.log(`No query params provided in ${config}`);
        }
    }
} catch (error) {
    core.setFailed(error.message);
}

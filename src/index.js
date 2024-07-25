import axios from 'axios';
import core from '@actions/core';
import { promises as fsPromises } from 'fs';

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
    const githubToken = core.getInput('GH_TOKEN');
    const wakaToken = core.getInput('WAKA_AUTH_TOKEN');
    const workspace = core.getInput('GH_WORKSPACE');
    const mdFilePath = `${workspace}/README.md`;

    const mdContent = await fsPromises.readFile(mdFilePath, 'utf8');
    const configRegex = /<!-- WAKAWAKA_CONFIG__ST=\d&CT=\d&DT=\d&R=\d -->/g;
    const configs = mdContent.match(configRegex);
    const map = new Map();

    for (let config of configs) {
        const regex =
            /<!-- WAKAWAKA_CONFIG__ST=(\d)&CT=(\d)&DT=(\d)&R=(\d) -->/;

        // Match the string against the regex and extract the captured groups
        const queryParams = config.match(regex);
        console.log('PARAMS: ', queryParams);

        if (queryParams) {
            // Extracted digit values are in the matches array starting from index 1
            console.log('statType:', queryParams[1]);
            const statType = getStatType(queryParams[1]);
            const chartType = queryParams[2];
            const dataType = queryParams[3];
            const range = queryParams[4];

            console.log(
                config,
                `ST: ${statType}, CT: ${chartType}, DT: ${dataType}, R: ${range}`
            );

            const apiResponse = await axios.get(
                `${API_BASE_URL}/charts/${statType}?range=${range}&chart_type=${chartType}&data_type=${dataType}&token=${wakaToken}`
            );
            const chartSVG = apiResponse.data;
            const newMdContent = mdContent.replace(config, chartSVG);
            await fsPromises.writeFile(mdFilePath, newMdContent);

            console.log('CHART:', mdContent);
        } else {
            console.log(`No query params provided in ${config}`);
        }
    }
} catch (error) {
    core.setFailed(error.message);
}

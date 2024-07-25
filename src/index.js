import core from '@actions/core';

const API_BASE_URL = 'https://server-7hzpew6hia-el.a.run.app';
// const svgData = axios.get(`${API_BASE_URL}/`);

try {
    const githubToken = core.getInput('GH_TOKEN');
    console.log('aayush');
} catch (error) {
    core.setFailed(error.message);
}

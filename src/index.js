import core from '@actions/core';
import { promises as fsPromises } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const API_BASE_URL = 'https://server-7hzpew6hia-el.a.run.app';
// const svgData = axios.get(`${API_BASE_URL}/`);

try {
    const githubToken = core.getInput('GH_TOKEN');
    const workspace = core.getInput('GH_WORKSPACE');
    const mdFilePath = `${workspace}/README.md`;
    const content2 = await fsPromises.readFile(mdFilePath, 'utf8');

    console.log('CONTENT:', content2);

    const currentWorkingDirectory = dirname(fileURLToPath(import.meta.url));
    // const mdFilePath = join(currentWorkingDirectory, '../utils/langs.json');

    // Get the GitHub token from the environment
    const token = core.getInput('repo-token');
    const octokit = github.getOctokit(token);

    // Get the repo information from the context
    const { owner, repo } = github.context.repo;

    // Define the path to the MD file you want to access
    const filePath = 'path/to/your/file.md';

    // Fetch the file content
    const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath
    });

    // The content is base64 encoded, so decode it
    const content = Buffer.from(response.data.content, 'base64').toString(
        'utf8'
    );

    console.log(content);

    console.log('aayush');
} catch (error) {
    core.setFailed(error.message);
}

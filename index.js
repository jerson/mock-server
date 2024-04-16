const express = require('express');
const fs = require('fs');
const cors = require('cors')
const path = require('path');
const chalk = require('chalk');

const app = express();
app.use(express.json());
app.use(cors())

const handlerExists = (filePath) => {
    return fs.existsSync(filePath) && fs.lstatSync(filePath).isFile();
};

app.use((req, res, next) => {
    console.log(chalk.gray(`---------------------------------------------`));
    console.log(chalk.green(`Received ${req.method} request at ${req.path}`));
    console.log(chalk.cyan('Query Parameters:'), req.query);
    console.log(chalk.cyan('Request Body:'), req.body);
    console.log(chalk.cyan('Request Headers:'));
    Object.keys(req.headers).forEach(header => {
        console.log(chalk.cyan(`  ${header}: ${req.headers[header]}`));
    });
    next();
});

app.use((req, res, next) => {
    let routePath = req.path;

    // Adjust routePath for index file if necessary
    if (routePath.endsWith('/')) {
        routePath += 'index';
    }

    const filePath = path.join(__dirname, 'mock', req.get('host') || 'localhost', `${routePath}.js`);

    if (handlerExists(filePath)) {
        const handler = require(filePath);
        handler(req, res, next);
    } else {
        console.error(chalk.red(`Handler file not found for route: ${routePath}`));

        // Check if write mode is enabled
        const writeMode = process.env.WRITE_MODE === 'true';
        if (writeMode) {
            const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
            const queryParameters = req.query;
            const requestHeaders = req.headers;
            const requestBody = req.body;

            const directoryPath = path.dirname(filePath);
            if (!fs.existsSync(directoryPath)) {
                fs.mkdirSync(directoryPath, { recursive: true });
                fs.chmodSync(directoryPath, 0o777);
            }

            const templateContent = `module.exports = (req, res, next) => {\n` +
                `    // Implement your logic here\n` +
                `    const fullUrl = "${fullUrl}";\n` +
                `    const queryParameters = ${JSON.stringify(queryParameters)};\n` +
                `    const requestHeaders = ${JSON.stringify(requestHeaders)};\n` +
                `    const requestBody = ${JSON.stringify(requestBody)};\n` +
                `    console.log('Full URL:', fullUrl);\n` +
                `    res.json({ ok: true });\n` +
                `};\n`;
            fs.writeFileSync(filePath, templateContent);
            fs.chmodSync(filePath, 0o777);
            console.log(chalk.yellow(`Debug mode enabled: Created a handler file at ${filePath}`));
            console.log(chalk.yellow(`Template content:\n${templateContent}`));
        } else {
            console.error(chalk.yellow(`Suggestion: Enable debug mode to automatically create a handler file.`));
        }

        res.status(404).send('Handler file not found');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(chalk.blue(`Server is running on port ${PORT}`));
});

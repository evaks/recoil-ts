// Filename - index.js

// Importing the http module
const http = require("http")
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const distDir = path.join(__dirname, '../dist');
// change if needed
const port = 7070;

http.createServer(async (req, res) => {
    // Map URL to file path
    let filePath = req.url.startsWith("/scripts/") ? path.join(distDir, req.url.substring(8)):path.join(srcDir, req.url);

    // Guess MIME type (very basic)
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js':   'application/javascript',
        '.css':  'text/css',
        '.json': 'application/json',
        '.png':  'image/png',
        '.jpg':  'image/jpeg',
        '.gif':  'image/gif',
        '.svg':  'image/svg+xml',
        '.ico':  'image/x-icon'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    try {
        console.log("file",filePath);
        let stat = await fs.promises.stat(filePath);
        if (stat.isDirectory()) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write('<!DOCTYPE html><html><body><ul>');
            for (let file of await fs.promises.readdir(filePath)) {
                let s = await fs.promises.stat(path.join(filePath, file));
                if (stat.isDirectory()) {
                    res.write(`<li><a href="${encodeURI(file)}/">${file}</a></li>`);
                }
                else {
                    res.write(`<li><a href="${encodeURI(file)}">${file}</a></li>`);
                }
            }
            res.end('</ul></ul></body></html>');
        } else {
            fs.readFile(filePath, (err, content) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        res.writeHead(404, {'Content-Type': 'text/plain'});
                        res.end('404 Not Found');
                    } else {
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end(`Server Error: ${err.code}`);
                    }
                } else {
                    res.writeHead(200, {'Content-Type': contentType});
                    res.end(content);
                }
            });
        }
    } catch (err) {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('404 Not Found');
    }
}).listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});



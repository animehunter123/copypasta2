import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import fs from 'fs';
import path from 'path';
import { Items } from '/imports/api/collections';

// File serving endpoint
WebApp.connectHandlers.use('/files', (req, res, next) => {
  const fileName = req.url.slice(1); // Remove leading slash
  if (!fileName) {
    res.writeHead(404);
    res.end();
    return;
  }

  const filePath = path.join(process.env.COPYPASTA_DATA_DIR, 'files', fileName);
  
  try {
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end();
      return;
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'application/octet-stream',
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'application/octet-stream',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('Error serving file:', error);
    res.writeHead(500);
    res.end();
  }
});

// Publish all items
Meteor.publish('items', function() {
  console.log('Publishing items...');
  return Items.find({});
});

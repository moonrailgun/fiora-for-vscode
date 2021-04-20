import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

const fetchedIcons: Record<string, boolean> = {};

/**
 * Fetch Icon and save
 * Because VSCode not allowed get icon by url directly
 */
export function fetchIcon(url: string, filename: string, callback: () => void) {
  if (url.startsWith('//')) {
    url = 'https:' + url;
  }

  if (!fetchedIcons[url]) {
    const file = fs.createWriteStream(filename);

    https.get(url, function (response) {
      response.pipe(file);
      file.on('finish', function () {
        fetchedIcons[url] = true;
        file.close();
        callback();
      });
    });
  } else {
    callback();
  }
}

export function urlExt(url: string) {
  var filePath = url;
  var queryIndex = filePath.indexOf('?');
  if (queryIndex > -1) {
    filePath = filePath.substr(0, queryIndex);
  }
  return path.extname(filePath);
}

const puppeteer = require("puppeteer");
const fs = require("fs");
const request = require("request");

function download(uri, localPath) {
  request(uri).pipe(fs.createWriteStream(localPath));
}

try {
  if (process.argv[2] === "-wp") {
    (async () => {
      if (process.argv[3] && process.argv[4]) {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setJavaScriptEnabled(false);
        await page.goto(process.argv[3]);

        const hrefs = await page.$$eval(
          'a[href^="displayimage.php"]',
          elements => elements.map(a => a.href)
        );

        for (const href of hrefs) {
          const url = new URL(href);
          const searchParams = new URLSearchParams(url.search);
          searchParams.delete("album");
          searchParams.append("fullsize", "1");
          url.search = searchParams.toString();
          delete url.hash;
          await page.goto(url.toString());
          const img = await page.$eval("img#fullsize_image", element => {
            if (element) return { src: element.src, alt: element.alt };
          });

          download(img.src, process.argv[3] + "\\" + img.alt);
        }

        await browser.close();
      } else {
        console.log("node index.js -wp url download-directory");
      }
    })();
  } else if (process.argv[2] === "-getty") {
    (async () => {
      if (process.argv[3] && process.argv[4]) {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setJavaScriptEnabled(false);
        await page.goto(process.argv[3]);

        const hrefs = await page.$$eval(
          'a[href^="/detail/news-photo"]',
          elements => elements.map(a => a.href)
        );

        for (const href of hrefs) {
          await page.goto(href);
          const src = await page.$eval(
            "img.asset-card__image",
            element => element.src
          );
          request.get(src).on("response", res => {
            const filename = res.headers["content-disposition"].match(
              /(filename=|filename\*='')(.*)$/
            )[2];
            const ws = fs.createWriteStream(process.argv[4] + "\\" + filename);
            res.pipe(ws);
          });
        }

        await browser.close();
      } else {
        console.log("node index.js -getty url download-directory");
      }
    })();
  } else {
    console.log("node index.js -getty|-wp url download-directory");
  }
} catch (err) {
  console.log(err);
}

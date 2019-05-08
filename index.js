const puppeteer = require("puppeteer");
const fs = require("fs");
const request = require("request");

function download(uri, localPath) {
  request(uri).pipe(fs.createWriteStream(localPath));
}

(async () => {
  try {
    if (process.argv[2]) {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setJavaScriptEnabled(false);
      await page.goto(process.argv[2]);

      const hrefs = await page.$$eval('a[href^="displayimage.php"]', elements =>
        elements.map(a => a.href)
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
      console.log("node index.js url download-directory");
    }
  } catch (err) {
    console.log(err);
  }
})();

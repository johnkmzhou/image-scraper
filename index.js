const puppeteer = require("puppeteer");
const fs = require("fs");
const request = require("request");

(async () => {
  if (process.argv[3] && process.argv[4]) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", request => {
      if (request.resourceType() === "image") request.abort();
      else request.continue();
    });
    await page.goto(process.argv[3]);

    if (process.argv[2] === "-wp") {
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
        wpDownload(img);
      }
    } else if (process.argv[2] === "-getty") {
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
        gettyDownload(src);
      }
    }

    await browser.close();
  } else {
    console.log("node index.js -wp|-getty url download-directory");
  }
})().catch(err => {
  console.error(err);
});

function wpDownload(img) {
  request(img.src)
    .on("error", function(err) {
      console.log(img.src, err);
      wpDownload(img);
    })
    .pipe(fs.createWriteStream(process.argv[4] + "\\" + img.alt));
}

function gettyDownload(src) {
  request
    .get(src)
    .on("response", res => {
      const filename = res.headers["content-disposition"].match(
        /(filename=|filename\*='')(.*)$/
      )[2];
      const ws = fs.createWriteStream(process.argv[4] + "\\" + filename);
      res.pipe(ws);
    })
    .on("error", function(err) {
      console.log(src, err);
      gettyDownload(src);
    });
}

const puppeteer = require('puppeteer');
const fs = require('fs');
var fichier =""

const linkMichelin = "https://restaurant.michelin.fr/magazine/les-restaurants-etoiles-du-guide-michelin-2018";
//Utilisation d'un scrapper car l'API michelin est très limité en termes de recherches.
(async function main() {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/67.0.3372.0 Safari/537.36');
        await page.setViewport({ width: 1440, height: 752 });
        await page.goto(linkMichelin);

        
        const sections = await page.$$('p ');
        console.log(sections.length);
        for (const section of sections) {
            if(await section.$('strong')!==null)
            {//Récupere tout les nom présent en gras , meme si ce n'est pas un restaurant , ceci importe peu.

                const name = await section.$eval('strong', span => span.innerText);
                fichier = fichier + name + "\n";
            }
            
        }
        console.log(fichier);
        fs.appendFile("starredRestaurants.txt", fichier, function (err) {
            if (err) throw err;
            console.log('Saved!');
          });
    }
    catch(e){
        console.log(e);
    }


})();


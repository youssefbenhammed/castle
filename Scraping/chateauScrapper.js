const puppeteer = require('puppeteer');
const request = require('request');
const cheerio = require('cheerio');
var fs = require('fs');
var fichierJson = "";
var starredRestaurants
(async function main() {
  try {

    var hotels = [];
    //OUVERTURE FICHIER RESTAURANTS ETOILES
    fs.readFile('starredRestaurants.txt', 'utf8', function (err, contents) {
      starredRestaurants = starredRestaurants + contents;
    });

    //OUVERTURE NAVIGATEUR POUR SCRAPING
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/67.0.3372.0 Safari/537.36');
    await page.setViewport({ width: 1440, height: 752 })
    await page.goto('https://www.relaischateaux.com/us/destinations/europe/france')

    //ATTENTE DE L'AFFICHAGE DES HOTELS
    await page.waitForSelector('.hotelQuickView');
    const sections = await page.$$('.hotelQuickView');

    for (const section of sections) {//POUR CHAQUES HOTELS
      //Informations Hotel:
      const link_ = await section.$$eval('.mainTitle3 > a  ', as => as.map(a => a.href));//Lien vers la page
      const name = await section.$eval('h3 > a > span', span => span.innerText);//Nom
      const restaurant = await section.$eval('span', span => span.innerText);//Type de restaurant (hotel ou hotel restaurant)
      const restaurants = new Array();
      var restaurantPrice = -1;
      var starredRestaurant = false;
      var weekEndPrices = [];
      if (await section.$('div > div:nth-child(2) > div.priceTag > div > span.price > span.price') !== null) {
        restaurantPrice = await section.$eval('div > div:nth-child(2) > div.priceTag > div > span.price > span.price', span => span.innerText);
      }
      //Récuperation informations realtive au restaurant de l'hotel si celui ci est un hotel restaurant
      if (restaurant === "Hotel + Restaurant") {
        const page_hotel = await browser.newPage();
        await page_hotel.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/67.0.3372.0 Safari/537.36');
        await page_hotel.goto(link_[0]);
        await page_hotel.waitForSelector('.jsSecondNav > .jsSecondNavMain > li:nth-child(2) > a > span');
        await page_hotel.click('.jsSecondNav > .jsSecondNavMain > li:nth-child(2) > a > span');
        //Cas ou il y a plusieurs restaurants
        if (await page_hotel.$('.hotel > .jsSecondNav > .jsSecondNavSub > li:nth-child(2) > a') !== null) {
          console.log('-- Plusieurs restaurants --');
          var i = 1;
          while (await page_hotel.$('body > div.jsSecondNav.will-stick > ul.jsSecondNavSub.active > li:nth-child(' + i + ') > a') !== null) {
            var restaurantName = await page_hotel.$eval('body > div.jsSecondNav.will-stick > ul.jsSecondNavSub.active > li:nth-child(' + i + ') > a', span => span.innerText);
            restaurants.push(restaurantName);
            if (starredRestaurants.toString().indexOf(restaurantName) >= 0) {
              starredRestaurant = starredRestaurant || true;
            }
            i++;
          }



        }
        //Cas ou il y a un seul restaurant
        else {
          console.log('-- Unique restaurants --');
          await page_hotel.waitForSelector('.tabRestaurant.hotelContent.ajaxContent.active');
          const hsections = await page_hotel.$$('.tabRestaurant.hotelContent.ajaxContent.active');
          for (const hsection of hsections) {
            var restaurantName = await hsection.$eval('div > div > div > div > h3', span => span.innerText);
            restaurants.push(restaurantName);
            if (starredRestaurants.toString().indexOf(restaurantName) >= 0) {
              starredRestaurant = true;
            }
          }
        }

        //Si le restaurant est etoilé on procède a la récuperation du prix par week-end
        if (starredRestaurant === true && restaurantPrice!==-1) {
          //On part sur l'onglet de description de l'hotel
          await page_hotel.setViewport({ width: 1440, height: 752 })
          await page_hotel.waitForSelector('.jsSecondNav > .jsSecondNavMain > li:nth-child(1) > a > span')
          await page_hotel.click('.jsSecondNav > .jsSecondNavMain > li:nth-child(1) > a > span')
          //On clique sur la chambre la moin chère
          //ATTENTION : PEUT ETRE QU'IL Y EN A QUI EXISTENT PAS !! Rajouter une condition si necessaire.
          await page_hotel.waitForSelector('.propertyRoom:nth-child(1) > .content > .propertyRoomCTA > .showRates > .priceTag > .btn')
          await page_hotel.click('.propertyRoom:nth-child(1) > .content > .propertyRoomCTA > .showRates > .priceTag > .btn')
          await page_hotel.waitFor(6000);
          for (var semaine = 1; semaine < 6; semaine++) {
            var weekEndJ1;
            var weekEndJ2;
            var dateWeekEnd;
            var joursDisponnibles = 0
            if (await page_hotel.$('div > div.ui-datepicker-group.ui-datepicker-group-first > table > tbody > tr:nth-child(' + semaine + ') > td:nth-child(6) > a.js-cell-loaded') !== null) {
              weekEndJ1 = await page_hotel.$eval('div > div.ui-datepicker-group.ui-datepicker-group-first > table > tbody > tr:nth-child(' + semaine + ') > td:nth-child(6) > a.js-cell-loaded', a => a.getAttribute("data-price"));
              dateWeekEnd = await page_hotel.$eval('div > div.ui-datepicker-group.ui-datepicker-group-first > table > tbody > tr:nth-child(' + semaine + ') > td:nth-child(6) > a.js-cell-loaded', a => a.getAttribute("data-day") + '-');
              dateWeekEnd += await page_hotel.$eval('div > div.ui-datepicker-group.ui-datepicker-group-first > table > tbody > tr:nth-child(' + semaine + ') > td.ui-datepicker-week-end', a => parseInt(a.getAttribute("data-month")) + 1 + '-' + a.getAttribute("data-year"));
              joursDisponnibles++;
            }
            if (await page_hotel.$('div > div.ui-datepicker-group.ui-datepicker-group-first > table > tbody > tr:nth-child(' + semaine + ') > td:nth-child(7) > a.js-cell-loaded') !== null) {

              weekEndJ2 = await page_hotel.$eval('div > div.ui-datepicker-group.ui-datepicker-group-first > table > tbody > tr:nth-child(' + semaine + ') > td:nth-child(7) > a.js-cell-loaded', a => a.getAttribute("data-price"));
              joursDisponnibles++;
            }
            if (joursDisponnibles === 2) {
              var total = parseInt(weekEndJ1) + parseInt(weekEndJ2);
              var weekEndPrice = { date: dateWeekEnd, price: total };
              weekEndPrices.push(weekEndPrice);
              //Ajouter week end dans Json.
            }
          }

          //AJOUT A LA LISTE D'HOTELS
          var hotel = { nom: name, type: restaurant, restaurants: restaurants, dates: weekEndPrices, link: link_[0] };
          hotels.push(hotel);
          console.log(hotel);
          //convertir en json la liste hotels
          fs.writeFile("resteuax_hotel.json", JSON.stringify(hotels), function (err) {
            if (err) {
              return console.log(err);
            }

            console.log("The file was saved!");
          });
        }

        //On ferme la page de l'hotel
        page_hotel.close();
      }
    }

    //Meme code appliqué pour chaques page de la liste des hotels.
    var page_ = [2, 4, 5, 6, 7, 7, 8];
    for (var compteur = 0; compteur < 7; compteur++) {
      await page.click('#destinationResults > #destPagination > .pagination > li:nth-child(' + page_[compteur] + ') > a')

      await page.waitForSelector('.hotelQuickView');
      await page.waitFor(5000);
      const sections = await page.$$('.hotelQuickView');
      console.log(sections.length);

      for (const section of sections) {
        //POUR CHAQUES HOTELS
        //Informations Hotel:
        const link_ = await section.$$eval('.mainTitle3 > a  ', as => as.map(a => a.href));//Lien vers la page
        const name = await section.$eval('h3 > a > span', span => span.innerText);//Nom
        const restaurant = await section.$eval('span', span => span.innerText);//Type de restaurant (hotel ou hotel restaurant)
        const restaurants = new Array();
        var restaurantPrice = -1;
        var starredRestaurant = false;
        var weekEndPrices = [];
        if (await section.$('div > div:nth-child(2) > div.priceTag > div > span.price > span.price') !== null) {
          restaurantPrice = await section.$eval('div > div:nth-child(2) > div.priceTag > div > span.price > span.price', span => span.innerText);
        }
        //Récuperation informations realtive au restaurant de l'hotel si celui ci est un hotel restaurant
        if (restaurant === "Hotel + Restaurant") {
          const page_hotel = await browser.newPage();
          await page_hotel.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/67.0.3372.0 Safari/537.36');
          await page_hotel.goto(link_[0]);
          await page_hotel.waitForSelector('.jsSecondNav > .jsSecondNavMain > li:nth-child(2) > a > span');
          await page_hotel.click('.jsSecondNav > .jsSecondNavMain > li:nth-child(2) > a > span');
          //Cas ou il y a plusieurs restaurants
          if (await page_hotel.$('.hotel > .jsSecondNav > .jsSecondNavSub > li:nth-child(2) > a') !== null) {
            console.log('-- Plusieurs restaurants --');
            var i = 1;
            while (await page_hotel.$('body > div.jsSecondNav.will-stick > ul.jsSecondNavSub.active > li:nth-child(' + i + ') > a') !== null) {
              var restaurantName = await page_hotel.$eval('body > div.jsSecondNav.will-stick > ul.jsSecondNavSub.active > li:nth-child(' + i + ') > a', span => span.innerText);
              restaurants.push(restaurantName);
              if (starredRestaurants.toString().indexOf(restaurantName) >= 0) {
                starredRestaurant = starredRestaurant || true;
              }
              i++;
            }



          }
          //Cas ou il y a un seul restaurant
          else {
            console.log('-- Unique restaurants --');
            await page_hotel.waitForSelector('.tabRestaurant.hotelContent.ajaxContent.active');
            const hsections = await page_hotel.$$('.tabRestaurant.hotelContent.ajaxContent.active');
            for (const hsection of hsections) {
              var restaurantName = await hsection.$eval('div > div > div > div > h3', span => span.innerText);
              restaurants.push(restaurantName);
              if (starredRestaurants.toString().indexOf(restaurantName) >= 0) {
                starredRestaurant = true;
              }
            }
          }

          //Si le restaurant est etoilé on procède a la récuperation du prix par week-end
          if (starredRestaurant === true && restaurantPrice!==-1) {
            //On part sur l'onglet de description de l'hotel
            await page_hotel.setViewport({ width: 1440, height: 752 })
            await page_hotel.waitForSelector('.jsSecondNav > .jsSecondNavMain > li:nth-child(1) > a > span')
            await page_hotel.click('.jsSecondNav > .jsSecondNavMain > li:nth-child(1) > a > span')
            //On clique sur la chambre la moin chère
            //ATTENTION : PEUT ETRE QU'IL Y EN A QUI EXISTENT PAS !! Rajouter une condition si necessaire.
            await page_hotel.waitForSelector('.propertyRoom:nth-child(1) > .content > .propertyRoomCTA > .showRates > .priceTag > .btn')
            await page_hotel.click('.propertyRoom:nth-child(1) > .content > .propertyRoomCTA > .showRates > .priceTag > .btn')
            await page_hotel.waitFor(6000);
            for (var semaine = 1; semaine < 6; semaine++) {
              var weekEndJ1;
              var weekEndJ2;
              var dateWeekEnd;
              var joursDisponnibles = 0
              if (await page_hotel.$('div > div.ui-datepicker-group.ui-datepicker-group-first > table > tbody > tr:nth-child(' + semaine + ') > td:nth-child(6) > a.js-cell-loaded') !== null) {
                weekEndJ1 = await page_hotel.$eval('div > div.ui-datepicker-group.ui-datepicker-group-first > table > tbody > tr:nth-child(' + semaine + ') > td:nth-child(6) > a.js-cell-loaded', a => a.getAttribute("data-price"));
                dateWeekEnd = await page_hotel.$eval('div > div.ui-datepicker-group.ui-datepicker-group-first > table > tbody > tr:nth-child(' + semaine + ') > td:nth-child(6) > a.js-cell-loaded', a => a.getAttribute("data-day") + '-');
                dateWeekEnd += await page_hotel.$eval('div > div.ui-datepicker-group.ui-datepicker-group-first > table > tbody > tr:nth-child(' + semaine + ') > td.ui-datepicker-week-end', a => parseInt(a.getAttribute("data-month")) + 1 + '-' + a.getAttribute("data-year"));
                joursDisponnibles++;
              }
              if (await page_hotel.$('div > div.ui-datepicker-group.ui-datepicker-group-first > table > tbody > tr:nth-child(' + semaine + ') > td:nth-child(7) > a.js-cell-loaded') !== null) {

                weekEndJ2 = await page_hotel.$eval('div > div.ui-datepicker-group.ui-datepicker-group-first > table > tbody > tr:nth-child(' + semaine + ') > td:nth-child(7) > a.js-cell-loaded', a => a.getAttribute("data-price"));
                joursDisponnibles++;
              }
              if (joursDisponnibles === 2) {
                var total = parseInt(weekEndJ1) + parseInt(weekEndJ2);
                var weekEndPrice = { date: dateWeekEnd, price: total };
                weekEndPrices.push(weekEndPrice);
                //Ajouter week end dans Json.
              }
            }

            //AJOUT A LA LISTE D'HOTELS
            var hotel = { nom: name, type: restaurant, restaurants: restaurants, dates: weekEndPrices, link: link_[0] };
            hotels.push(hotel);
            console.log(hotel);
            //convertir en json la liste hotels
            fs.writeFile("resteuax_hotel.json", JSON.stringify(hotels), function (err) {
              if (err) {
                return console.log(err);
              }

              console.log("The file was saved!");
            });
          }

          //On ferme la page de l'hotel
          page_hotel.close();
        }
      }
    }
    //ECRIRE LE FICHIER JSON DANS LE .json
    fs.writeFile("resteuax_hotel.json", hotels);

  }
  catch (e) { console.log(e); }
})();

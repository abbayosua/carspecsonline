const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/carspecs', async (req, res) => {
    try {
        const carPath = req.query.path;
        if (!carPath) {
            return res.status(400).send('Car path is required');
        }
        const carUrl = `https://www.auto-data.net/en/${carPath}`;
        const response = await axios.get(carUrl);
        const $ = cheerio.load(response.data);
        
        // Extract the car specifications table and hero image
        const specificationHtml = $('#outer > table').html();
        const carTitle = $('h2.car').first().text();
        const heroImage = $('#outer > div.float336.left.top > img').attr('src');
        const fullHeroImage = heroImage ? (heroImage.startsWith('http') ? heroImage : `https://www.auto-data.net${heroImage}`) : null;

        res.render('carspecs', { specificationHtml, carTitle, heroImage: fullHeroImage });
    } catch (error) {
        console.error('Error fetching car specs:', error);
        res.status(500).send('Error fetching car specifications');
    }
});

app.get('/search', async (req, res) => {
    try {
        const carModel = req.query.q;
        const page = parseInt(req.query.page) || 1;
        if (!carModel) {
            return res.render('index', { error: 'Please enter a car model' });
        }

        const searchUrl = `https://www.auto-data.net/en/results?search=${encodeURIComponent(carModel)}&page=${page}`;
        console.log('Searching URL:', searchUrl);

        const response = await axios.get(searchUrl);
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        const $ = cheerio.load(response.data);
        console.log('HTML loaded successfully');

        const cars = [];
        const carElements = $('#outer > div:nth-child(6) > a');
        console.log('Number of car results found:', carElements.length);
        
        carElements.each((i, element) => {
            const carLink = $(element).attr('href');
            const carImage = $(element).find('img').attr('src');
            const carBrand = $(element).find('span.title').text().trim();
            const carContent = $(element).find('span.content').text().trim();
            const carAdditional = $(element).find('span.additional').text().trim();
            
            console.log('Found car:', { carBrand, carImage, carLink, carContent, carAdditional });
            
            if (carImage && carBrand) {
                cars.push({
                    image: carImage.startsWith('http') ? carImage : `https://www.auto-data.net${carImage}`,
                    brand: carBrand,
                    content: carContent,
                    additional: carAdditional,
                    link: carLink
                });
            }
        });

        // Extract pagination information
        const pagination = $('#outer > div.pagination');
        const paginationLinks = pagination.find('a.pagination');
        const lastPageLink = paginationLinks.filter((i, el) => !$(el).text().includes('>')).last();
        const lastPage = lastPageLink.length ? parseInt(lastPageLink.text()) : page;
        const nextPageLink = pagination.find('a.pagination').filter((i, el) => $(el).text() === '>');
        const hasNextPage = page < lastPage;
        const hasPrevPage = page > 1;

        console.log('Total cars found:', cars.length);
        console.log('Pagination:', { hasNextPage, hasPrevPage, currentPage: page });

        res.render('results', { 
            cars, 
            searchQuery: carModel,
            currentPage: page,
            hasNextPage,
            hasPrevPage,
            lastPage
        });
    } catch (error) {
        console.error('Error details:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        }
        res.render('index', { error: 'An error occurred while searching for cars' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
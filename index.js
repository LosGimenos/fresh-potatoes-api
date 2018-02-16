const sqlite = require('sqlite'),
      Sequelize = require('sequelize'),
      request = require('request'),
      express = require('express'),
      app = express();

const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;


// Sequelize ORM setup
let sequelize = new Sequelize(null, null, null, {
  host: 'localhost',
  dialect: 'sqlite',
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },
  define: {
    timestamps: false
  },
  storage: DB_PATH
});

sequelize
  .authenticate()
  .then(function(err) {
    console.log('Connection has been established successfully.');
  }, function (err) {
    console.log('Unable to connect to the database:', err);
  });

// Sequelize Models
const Films = sequelize.define('films', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    title: Sequelize.STRING,
    release_date: Sequelize.DATE,
    tagline: Sequelize.STRING,
    revenue: Sequelize.INTEGER,
    budget: Sequelize.INTEGER,
    runtime: Sequelize.INTEGER,
    original_language: Sequelize.STRING,
    status: Sequelize.STRING
  },
  {
    underscored: true
  }
);

const Artists = sequelize.define('artists', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    name: Sequelize.STRING,
    birthday: Sequelize.STRING,
    deathday: Sequelize.STRING,
    gender: Sequelize.INTEGER,
    place_of_birth: Sequelize.STRING
  },
  {
    underscored: true
  }
);

const Genres = sequelize.define('genres', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true
  },
  name: Sequelize.STRING
});

const ArtistFilms = sequelize.define('artist_films', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true
  },
  credit_type: Sequelize.STRING,
  role: Sequelize.STRING,
  description: Sequelize.STRING
  },
  {
    underscored: true
  }
);

// Map Sequelize Models relationships
Films.belongsTo(Genres);
ArtistFilms.belongsTo(Artists);
ArtistFilms.belongsTo(Films);

// Sequelize sync
sequelize.sync().then(() => {
  // START SERVER
  Promise.resolve()
    .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
    .catch((err) => { if (NODE_ENV === 'development') console.error(err.stack); });
});

// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);

// ROUTE HANDLER
function getFilmRecommendations(req, res) {
  let responseObject = {
    recommendations: []
  };
  let errorObject = {
    message: null
  };
  let filmId = req.params.id;
  let queryKeys = Object.keys(req.query);
  let hasLimit = false;
  let hasOffset = false;
  let limit = 10;
  let offset = 0;
  const defaultRecommendationSize = 3;
  let cutoff = defaultRecommendationSize;

  if (queryKeys.indexOf('limit') >= 0) {
    hasLimit = true;
  }

  if (queryKeys.indexOf('offset') >= 0) {
    hasOffset = true;
  }

  if (hasLimit) {
    if (req.query.limit == '') {
      limit = 10;
    } else {
      limit = parseInt(req.query.limit);
    }

    cutoff = limit;
  }

  if (hasOffset) {
    if (req.query.offset == '') {
      offset = 1;
    } else {
      offset = parseInt(req.query.offset);
    }
  }

  Films
    .findById(filmId)
    .then(film => {
      return film.dataValues;
    })
    .then(filmResponse => {
      const filmGenreId = parseInt(filmResponse.genre_id);
      const filmDate = new Date(filmResponse.release_date);
      const year = filmDate.getFullYear();
      const month = filmDate.getMonth();
      const day = filmDate.getDate();
      const maxDate = new Date(year + 15, month, day);
      const minDate = new Date(year - 15, month, day);
      let genreName = null;

      Genres.findById(filmGenreId)
        .then(genre => {
          genreName = genre.name;
        });

      Films.findAll({
        attributes: ['id', 'title', 'release_date', 'genre_id'],
        where: {
          id: {
            $ne: filmId
          },
          genre_id: filmGenreId,
          release_date: {
            $between: [minDate, maxDate]
          }
        }
      })
        .then(films => {
          const apiBaseUrl =
            'http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1';
          const filmsQuery = '?films=';
          const filmIds = [];

          films.forEach(filmData => {
            filmIds.push(filmData.id);
          });

          const filmApiQueryUrl = apiBaseUrl + filmsQuery + filmIds;

          return new Promise((resolve, reject) => {
            request(filmApiQueryUrl, (error, response, body) => {
              resolve({
                'reviewData': JSON.parse(response.body),
                'filmData': films
              });
            })
          });
        })
        .then(filmAndReviews => {
          const { reviewData, filmData } = filmAndReviews;
          const reviewStats = {}
          const amendedFilmStats = [];

          reviewData.forEach(reviews => {
            let totalReviewScore = null;
            let averageReviewRating = null;
            const totalReviews = reviews['reviews'].length;
            reviewInfo = {
              'id': reviews.film_id,
              'reviews': totalReviews
            }

            reviews['reviews'].forEach(review => {
              totalReviewScore += review.rating;
            });

            averageReviewRating = parseFloat(totalReviewScore / totalReviews).toFixed(1);
            reviewInfo['averageRating'] = averageReviewRating;

            reviewStats[reviews.film_id] = reviewInfo;
          });
          filmData.forEach((film, index) => {
            const cleanFilm = film.dataValues;
            const avRating = reviewStats[cleanFilm.id]['averageRating'];

            if (avRating >= 4.0 && amendedFilmStats.length < cutoff) {
              cleanFilm['releaseDate'] = cleanFilm['release_date'];
              delete cleanFilm['genre_id'];
              delete cleanFilm['release_date'];
              cleanFilm['genre'] = genreName;
              cleanFilm['averageRating'] = avRating;
              cleanFilm['reviews'] = reviewStats[cleanFilm.id]['reviews'];
              amendedFilmStats.push(cleanFilm);
            }
          });

          if (offset > 0) {
            amendedFilmStats.splice(0, offset);
          }

          const finalResponse = {
            'recommendations': amendedFilmStats,
            'meta': {
              'limit': limit,
              'offset': offset
            }
          }
          return finalResponse;
        })
        .then(recommendations => {
          res.status(200).json(recommendations);
        })
    })
    .catch(err => {
      console.log(err, req)
      errorObject['message'] = err;
      res.status(422).json(errorObject);
    })
}

module.exports = app;

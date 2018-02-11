const sqlite = require('sqlite'),
      Sequelize = require('sequelize'),
      request = require('request'),
      express = require('express'),
      app = express();

const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;

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

const Films = sequelize.define('films', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true
  },
  title: Sequelize.STRING,
  release_date: Sequelize.STRING,
  tagline: Sequelize.STRING,
  revenue: Sequelize.INTEGER,
  budget: Sequelize.INTEGER,
  runtime: Sequelize.INTEGER,
  original_language: Sequelize.STRING,
  status: Sequelize.STRING
});

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



sequelize.sync().then(() => {
  Promise.resolve()
    .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
    .catch((err) => { if (NODE_ENV === 'development') console.error(err.stack); });

  app.get('/films/:id/recommendations', getFilmRecommendations);
});

// START SERVER


// ROUTES

// ROUTE HANDLER
function getFilmRecommendations(req, res) {
  console.log('made it here')
  let filmId = req.params.id;
  Genres.findById(filmId).then(genre => {
    console.log(genre, 'this is genre');
    res.status(200).send(genre);
  });
}

module.exports = app;

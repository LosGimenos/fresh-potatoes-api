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
    release_date: Sequelize.STRING,
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

  // ROUTES
  app.get('/films/:id/recommendations', getFilmRecommendations);
});

// ROUTE HANDLER
function getFilmRecommendations(req, res) {
  res.type('json');
  res.header('Content-Type', 'application/json');

  let responseObject = {
    recommendations: []
  };

  let errorObject = {
    message: null
  };

  let filmId = req.params.id;

  Films
    .findById(filmId)
    .then(film => {
      return film.dataValues;
    })
    .then(filmResponse => {
      responseObject['recommendations'].push(filmResponse);
      res.status(200).json(responseObject);
    })
    .catch(err => {
      res.status(422).json(errorObject);
    })
}

module.exports = app;

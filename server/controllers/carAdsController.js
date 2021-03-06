var mongoose = require('mongoose'),
  Brand = mongoose.model('Brand'),
  Model = mongoose.model('Model'),
  encryption = require('../utilities/encryption'),
  fileManager = require('../utilities/fileManager'),
  CarAd = mongoose.model('CarAd');

module.exports = {
  getStaticBrands: function(req, res, next) {
    Brand.find({}).exec(function(err, collection) {
      if(err) {
        console.log('cannot find brands: ' + err);
      } else {
        res.send(collection);
        res.end();
      }
    })
  },
  getModelsForBrand: function(req, res, next) {
    console.log('get /cars/brands/:brandId: ' + req.params.brandId);
    Model.find({ brand: req.params.brandId }, function(err, collection) {
      if(err) {
        res.send({ success: false });
      } else {
        res.send(collection);
      }

      res.end();
    })
  },
  createCarAd: function(req, res, next) {
    console.log('IN CREATE CAR AD');
    var carAd = {
      pictures: [],
      author: req.user._id
    };

    req.pipe(req.busboy);
    req.busboy.on('file', function (fieldname, file, filename) {
      if(!!filename) {
        var fileExtension = filename.split('.').pop();
        var fileNameHashed = encryption.generateHashedPassword(encryption.generateSalt(), filename) + '.' + fileExtension;
        fileManager.saveFile(file, '/', fileNameHashed);
        carAd.pictures.push(fileNameHashed);
      } else {
        file.resume();
      }
    });

    req.busboy.on('finish', function(){
      CarAd.create(carAd, function(err, dbCarAd) {
        if(err) {
          console.log('Error creating carAd: ' + err);
        } else {
          console.log('Successfuly added caradd: ' + dbCarAd._id);
        }
      });
    });

    req.busboy.on('field', function(fieldName, val) {
      carAd[fieldName] = val;
    });

    //res.redirect('/');
    res.end();
  },
  getNewestAds: function(req, res, next) {
    var getLastN = parseInt(req.params.lastN);
    CarAd.find({})
      .populate('author')
      .populate('brand')
      .populate('model')
      .sort({dateCreated: -1})
      .limit(getLastN)
      .exec(function(err, collection) {
        if(err) {
          res.status(500);
          console.log('Error getting first N carads: ' + err);
        } else {
          res.send(collection);
        }

        res.end();
      });
  },
  getAllModels: function(req, res, next) {
    Model.find({})
      .exec(function(err, collection) {
        if(err) {
          res.status(500);
          console.log('Error loading models: ' + err);
        } else {
          res.send(collection);
        }

        res.end();
      })
  },
  searchByOptions: function(req, res, next) {
    var query = getCarAdsByOptions(req.body.options);
    query
      .populate('model')
      .populate('brand')
      .populate('author');

    query.exec(function(err, cars) {
      if(err) {
        res.status(500);
        console.log('Error querying carads: ' + err);
      } else {
        //console.log(cars);
        res.send({cars: cars});
      }
      res.end();
    });
  },
  search: function(req, res, next) {
    console.log('REQ BODY:');
    console.dir(req.body);
    res.end();
  },
  deleteCar: function(req, res, next) {
    CarAd.findOne({ _id: req.params.id }).exec(function(err, car) {
      if(err) {
        res.send({ success: false, error: err.toString() });
      } else {
        for(var i = 0; i < car.pictures.length; i+=1) {
          fileManager.deleteFile(car.pictures[i]);
        }
      }

      CarAd.remove({ _id: req.params.id }, function(err, success) {
        if(err) {
          res.send({ success: false, error: err.toString() });
        } else {
          res.send({ success: true });
          console.log('deleted car: ' + success);
        }

        res.end();
      })
    });
  }
};

function getCarAdsByOptions(options) {
  var query = CarAd.find({});
  if(!!options.selectedBrand) {
    query.where({ brand: options.selectedBrand });
  }
  if(!!options.selectedModel) {
    query.where({ model: options.selectedModel });
  }
  if(!!options.fuelType) {
    query.where({ fuelType: options.fuelType });
  }
  if(!!options.gearBox) {
    query.where({ gearBox: options.gearBox });
  }
  if(!!options.priceFrom) {
    query.where('price').gte(parseInt(options.priceFrom));
  }
  if(!!options.priceTo) {
    query.where('price').lte(parseInt(options.priceTo));
  }
  if(!!options.yearFrom) {
    query.where('year').gte(parseInt(options.yearFrom));
  }
  if(!!options.yearTo) {
    query.where('year').lte(parseInt(options.yearTo));
  }

  return query;
}
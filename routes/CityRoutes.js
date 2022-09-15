const cityController = require('../contoller/CityController'); 

const cityRouter = {
    '/cities-by-tag' : {
        'GET': cityController.getActiveCitiesByTag,
    },
    '/distance' : {
        'GET': cityController.getDistance,
    },
    '/area' : {
        'GET': cityController.getArea,
    },
    '/area-result/2152f96f-50c7-4d76-9e18-f7033bd14428' :  {
        'GET': cityController.citiesInsideArea,
    },
    '/all-cities' : {
        'GET': cityController.getAllCities,
    },

    'notFound' : cityController.notFound
}

module.exports = cityRouter;

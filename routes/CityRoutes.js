const cityController = require('../contoller/CityController'); 

//cityRouter.get('/cities-by-tag?:tag?:isActive', getActiveCitiesByTag);
const cityRouter = {
    '/cities-by-tag' : {
        'GET': cityController.getActiveCitiesByTag,
    },
    '/distance' : {
        'GET': cityController.getDistance,
    },
    '/area' : {
        'GET': cityController.getCitiesWithInRadius,
    },
    '/all-cities' : {
        'GET': cityController.getAllCities,
    },

    'notFound' : cityController.notFound
}

module.exports = cityRouter;
const cities = require('../addresses.json');
const fs = require("fs");
const EventEmitter = require('events');

const {chain}  = require('stream-chain');
const {parser} = require('stream-json');
const {pick}   = require('stream-json/filters/Pick');
const {ignore} = require('stream-json/filters/Ignore');
const {streamArray} = require('stream-json/streamers/StreamArray');

const cityController = {};
let areaCalculationQueue = [];
const calcuatedDistanceArray = [];
const eventHandler = new EventEmitter();

/**
 * Filter the cities according to status and tag.
 * @param { tag: String, isActive: Boolean } data 
 * @param { Object } callback 
 */
cityController.getActiveCitiesByTag = async(data, callback) => {
    try {
        const tag = data.params.tag;
        const isActive = data.params.isActive;

        const citiesByTag = await cities.filter(city => city.tags.includes(tag) && city.isActive == Boolean(isActive));
        callback(200, {"cities":citiesByTag}); 
    } catch (error) {
        console.log(error.message);
    }
};

/**
 * Calculate distance between two cities accoring to Longitude & Latitude.
 * @param {from:String, to:String} data 
 * @param {Object} callback 
 */
cityController.getDistance = async(data, callback) => {
    try {
        const from = await cities.find(city => city.guid == data.params.from);
        const to = await cities.find(city => city.guid == data.params.to);

        const radianFromLongitude = from.longitude * Math.PI / 180;
        const radianFromLatitude = from.latitude * Math.PI / 180;

        const radianToLongitude = to.longitude * Math.PI / 180;
        const radianToLatitude = to.latitude * Math.PI / 180;

        // Haversine formula
        let defLongititude = radianToLongitude - radianFromLongitude;
        let defLatitude = radianToLatitude - radianFromLatitude;
        
        let a = Math.pow(Math.sin(defLatitude / 2), 2) 
                + Math.cos(radianFromLatitude) * Math.cos(radianToLatitude)
                * Math.pow(Math.sin(defLongititude / 2),2);
        
        let c = 2 * Math.asin(Math.sqrt(a));

        let radius = 6371;

        const distance = Math.ceil((c * radius)*100)/100;
        const unit = radius == 6371 ? "km" : "m";
        callback(200, {"from": from, "to": to, "unit": unit, "distance":distance }); 
    } catch (error) {
        console.log(error.message);
    }
};

/**
 * Event to calculate cities with in the radius.
 */
eventHandler.on('getCitiesWithInRadiusBackground', () => {
    areaCalculationQueue.forEach(async(data) => {
        const server = data.server;
        let citiesInDistance = [];
        const from = await (cities.find(city => city.guid == data.params.from));
        const otherCities = await (cities.filter((city) => city.guid !== data.params.from));
        const maxRadius = data.params.distance;

        const radianFromLongitude = from.longitude * Math.PI / 180;
        const radianFromLatitude = from.latitude * Math.PI / 180;

        for(var num=0; num < otherCities.length; num++) {
            const to = otherCities[num];
            const radianToLongitude = to.longitude * Math.PI / 180;
            const radianToLatitude = to.latitude * Math.PI / 180;

            // Haversine formula
            let defLongititude = radianToLongitude - radianFromLongitude;
            let defLatitude = radianToLatitude - radianFromLatitude;
            
            let a = Math.pow(Math.sin(defLatitude / 2), 2) 
                    + Math.cos(radianFromLatitude) * Math.cos(radianToLatitude)
                    * Math.pow(Math.sin(defLongititude / 2),2);
                    let c = 2 * Math.asin(Math.sqrt(a));
            const distance = Math.ceil((c * 6371)*100)/100;

            if (distance < maxRadius) {
                citiesInDistance.push({"guid":to.guid, "address":to.address});
            }
        }
        calcuatedDistanceArray.push(data.identificationForQueue, citiesInDistance);
    });
});

/**
 * Start finding cities with the given radius.
 * @param {*} data 
 * @param {*} callback 
 */
cityController.getArea = async(data, callback) => {
    try {
        const server = data.server;
        const identificationForQueue = 1;
        Object.assign(data, {"identificationForQueue":identificationForQueue});
        areaCalculationQueue[identificationForQueue] = data, {"identificationForQueue":identificationForQueue};
        setTimeout(() => {
            eventHandler.emit('getCitiesWithInRadiusBackground', identificationForQueue);
        });
        callback(202, {resultsUrl: server+'/area-result/2152f96f-50c7-4d76-9e18-f7033bd14428','identification':identificationForQueue});
    } catch (error) {
        console.log(error.message)
    }
}

/**
 * Return cities with the given radius.
 * @param { identification : number } data 
 * @param {*} callback 
 * @returns 
 */
cityController.citiesInsideArea = async(data, callback) => {
    try {
        const identification = data.params.identification === undefined ? 1 : data.params.identification;
        if(identification in calcuatedDistanceArray) {
            return callback(200, { "cities": calcuatedDistanceArray[identification] });
        }
        return callback(202, {data: 'Request still processing'}); 
    } catch (error) {
        console.log(error.message);
    }   
}

/**
 * Streaming all the cities.
 * @param {*} req 
 * @param {*} callback 
 */
cityController.getAllCities = async(req, callback) => {
    try {
        let file = [];
        const pipeline = chain([
            fs.createReadStream('addresses.json'),
            parser(),
            streamArray()
        ]);
        pipeline.on('data', (data) => {
            file.push(data.value);
        });
        pipeline.on('end', (data) => {
            callback(200, file);
        });
    } catch (error) {
        console.log(error.message);
    }
}

/**
 * Failed to find the related function.
 * @param {*} data 
 * @param {*} callback 
 */
cityController.notFound = (data, callback) => {
    callback(404, {data: 'Requested path not found'})
}

module.exports = cityController;

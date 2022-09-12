const cities = require('../addresses.json');
const fs = require("fs");

const cityController = {};

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


cityController.getCitiesWithInRadius = async(data, callback) => {
    try {
        const server = data.server;
        let citiesInDistance = [];
        const from = await cities.find(city => city.guid == data.params.from);
        const otherCities = await cities.filter((city) => city.guid !== data.params.from);
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

            let radius = 6371;
            
            const distance = Math.ceil((c * radius)*100)/100;
            
            const unit = radius == 6371 ? "km" : "m";

            if (distance < maxRadius) {
                //console.log("to.guid:",to.guid,"distance:", distance,", max:",maxRadius);
                //citiesInDistance.push(`${server}/area-result/${to.guid}`);
                callback(202, {"resultsUrl": `${server}/area-result/${to.guid}`});
            }
        }
        //callback(202, {data: citiesInDistance}); 
    } catch (error) {
        console.log(error.message);
    }
}

cityController.getAllCities = async(req, callback) => {
    try {
        let file = [];
        var readStream = fs.createReadStream('./addresses.json', 'utf8');
        readStream
        .on('data', (chunk) => {
            file.push(chunk);
        })
        .on('error', (err_msg) => {
            console.log(err_msg);
            res.end(err_msg);
        })
        .on('end', () => {
            callback(200, file)
        })
    } catch (error) {
        console.log(error.message);
    }
}


cityController.notFound = (data, callback) => {
    callback(404, {data: 'Requested path not found'})
}

module.exports = cityController;

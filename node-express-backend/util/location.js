const axios = require('axios')
const HttpError = require('../models/http-error')

const API_KEY = process.env.GOOGLE_GEO_KEY

exports.getCoordsForAddress = async (address) => {
    const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`)
    const data = response.data
    if(!data || data.status === 'ZERO_RESULTS'){
        throw new HttpError('Could not find location for the address given', 404)
    }
    const coordinates = data.results[0].geometry.location
    return coordinates
}
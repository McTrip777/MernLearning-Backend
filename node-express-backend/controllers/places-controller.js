const fs = require('fs')
const { v4: uuid } = require('uuid')

const { validationResult } = require('express-validator')
const mongoose = require('mongoose')
const HttpError = require('../models/http-error')
const { getCoordsForAddress } = require('../util/location')

const Place = require('../models/place')
const User = require('../models/user')

exports.getPlaceById = async (req, res, next) => {
    const placeId = req.params.pid;
    let place
    try {
        place = await Place.findById(placeId);
    } catch (err) {
        const error = new HttpError('Something went wrong finding place.', 500)
        return next(error)
    }

    if (!place) {
        const error = new HttpError("Could not find a place with the given id", 404)
        return next(error)
    }
    res.json({ place: place.toObject({ getters: true }) })
}

exports.getPlacesByUserId = async (req, res, next) => {
    const userId = req.params.uid;
    let userPlaceList
    try {
        userPlaceList = await Place.find({ creator: userId })
    } catch (err) {
        const error = new HttpError('Problem finding the users places.', 500)
        return next(error)
    }

    // if (!userPlaceList || userPlaceList.length === 0) {
    //     return next(new HttpError("Could not find a places with the given user id", 404))
    // }
    res.json({ userPlaceList: userPlaceList.map(place => place.toObject({ getters: true })) })
}

exports.createPlace = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return next(new HttpError('Invalid inputs, please check your data', 422))
    }
    const { title, description, address } = req.body

    let location
    try {
        location = await getCoordsForAddress(address)
    } catch (error) {
        return next(error)
    }

    const createdPlace = new Place({
        title,
        description,
        address,
        location,
        image: req.file.path,
        creator: req.userData.userId
    });

    let user;
    try {
        user = await User.findById(req.userData.userId)
    } catch (err) {
        const error = new HttpError('Creating place failed, user id not found', 500)
        return next(error)
    }

    if (!user) {
        const error = new HttpError('Creating place failed, user not found', 500)
        return next(error)
    }

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createdPlace.save({ session: sess })

        user.places.push(createdPlace);
        await user.save({ session: sess })
        await sess.commitTransaction()
    } catch (err) {
        const error = new HttpError('Creating place failed, please try again.', 500)
        return next(error)
    }

    res.status(201).json({ place: createdPlace })
}

exports.updatePlace = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return next(HttpError('Invalid inputs, please check your data', 422))
    }

    const { title, description } = req.body
    const placeId = req.params.pid

    let place
    try {
        place = await Place.findById(placeId);
    } catch (err) {
        const error = new HttpError('Something went wrong finding place to update.', 500)
        return next(error)
    }

    if(place.creator.toString() !== req.userData.userId){
        const error = new HttpError('You are not authorized to edit this place', 401)
        return next(error)
    }

    place.title = title
    place.description = description

    try {
        await place.save()
    } catch (err) {
        const error = new HttpError('Something went wrong updating the place.', 500)
        return next(error)
    }

    res.status(200).json({ place: place.toObject({ getters: true }) })
}

exports.deletePlace = async (req, res, next) => {
    const placeId = req.params.pid
    let place
    try {
        place = await Place.findById(placeId).populate('creator')
    } catch (err) {
        const error = new HttpError('Something went wrong finding place to delete.', 500)
        return next(error)
    }

    if (!place) {
        const error = new HttpError('Could not find place for this id.', 404)
        return next(error)
    }

    if(place.creator.id !== req.userData.userId){
        const error = new HttpError('You are not authorized to delete this place', 401)
        return next(error)
    }

    const imagePath = place.image

    try {
        const sess = await mongoose.startSession()
        sess.startTransaction()
        await place.remove({ session: sess })
        place.creator.places.pull(place)
        await place.creator.save({ session: sess })
        await sess.commitTransaction();
    } catch (err) {
        const error = new HttpError('Something went wrong deleting the place.', 500)
        return next(error)
    }

    fs.unlink(imagePath, err => {
        // console.log(err)
    })

    res.status(200).json({ message: "Deleted!" })
}
const express = require('express');
const { check } = require('express-validator')
const placesContollers = require('../controllers/places-controller')
const fileUpload = require('../middleware/file-upload')
const auth = require('../middleware/check-auth')

const router = express.Router();

router.get('/:pid', placesContollers.getPlaceById)

router.get('/user/:uid', placesContollers.getPlacesByUserId)

router.use(auth)

router.post('/', fileUpload.single('image'), [
    check('title').not().isEmpty(),
    check('description').isLength({ min: 5 }),
    check('address').not().isEmpty()],
    placesContollers.createPlace)

router.patch('/:pid', [
    check('title').not().isEmpty(),
    check('description').isLength({ min: 5 })],
    placesContollers.updatePlace)

router.delete('/:pid', placesContollers.deletePlace)

module.exports = router;
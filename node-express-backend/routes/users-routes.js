const express = require('express');
const { check } = require('express-validator')

const usersContollers = require('../controllers/users-controller')
const fileUpload = require('../middleware/file-upload')

const router = express.Router();

router.get('/', usersContollers.getUsers)
router.get('/:uid', usersContollers.getUserById)

router.post('/signup',
    fileUpload.single('image'),
    [
    check('name').not().isEmpty(),
    check('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
    check('password').isLength({ min: 6 })
    ],
    usersContollers.signupUser)

router.post('/login', usersContollers.loginUser)

module.exports = router;